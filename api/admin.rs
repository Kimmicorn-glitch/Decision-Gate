use std::{
    collections::HashMap,
    fs,
    path::{Path, PathBuf},
    sync::Mutex,
};

use argon2::{
    password_hash::{rand_core::OsRng, PasswordHash, PasswordHasher, PasswordVerifier, SaltString},
    Argon2,
};
use chrono::{DateTime, Duration, Utc};
use serde::{Deserialize, Serialize};
use thiserror::Error;
use uuid::Uuid;

const ROLE_ADMIN: &str = "admin";
const ROLE_OPERATOR: &str = "operator";
const ROLE_VIEWER: &str = "viewer";

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DevOpsGatewaySettings {
    pub endpoint: String,
    pub pre_merge_policy_simulation: bool,
    pub pipeline_provider: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct EnterpriseGatewaySettings {
    pub tenant: String,
    pub audit_export_sink: String,
    pub responsible_ai_logs_enabled: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DataCenterGatewaySettings {
    pub regions: Vec<String>,
    pub ai_browser_providers: Vec<String>,
    pub background_enforcement: bool,
    pub block_high_risk: bool,
    pub block_cross_region: bool,
    pub monthly_cost_cap_usd: f32,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TenantSettings {
    pub tenant_id: String,
    pub devops: DevOpsGatewaySettings,
    pub enterprise: EnterpriseGatewaySettings,
    pub datacenter: DataCenterGatewaySettings,
    pub updated_at: DateTime<Utc>,
}

impl TenantSettings {
    fn default_for(tenant_id: &str) -> Self {
        Self {
            tenant_id: tenant_id.to_string(),
            devops: DevOpsGatewaySettings {
                endpoint: "https://devops.example.com/decision-gate".to_string(),
                pre_merge_policy_simulation: true,
                pipeline_provider: "github-actions".to_string(),
            },
            enterprise: EnterpriseGatewaySettings {
                tenant: format!("{tenant_id}-enterprise"),
                audit_export_sink: "azure-monitor".to_string(),
                responsible_ai_logs_enabled: true,
            },
            datacenter: DataCenterGatewaySettings {
                regions: vec!["eastus".to_string(), "eu-west".to_string()],
                ai_browser_providers: vec!["browser-use".to_string(), "openai-operator".to_string()],
                background_enforcement: true,
                block_high_risk: true,
                block_cross_region: true,
                monthly_cost_cap_usd: 5000.0,
            },
            updated_at: Utc::now(),
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct LoginRequest {
    pub username: String,
    pub password: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RegisterRequest {
    pub username: String,
    pub password: String,
    pub role: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct LoginResponse {
    pub token: String,
    pub expires_at: DateTime<Utc>,
    pub username: String,
    pub role: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct UpdateSettingsRequest {
    pub devops: DevOpsGatewaySettings,
    pub enterprise: EnterpriseGatewaySettings,
    pub datacenter: DataCenterGatewaySettings,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct UserRecord {
    pub username: String,
    pub password_hash: String,
    pub role: String,
    pub created_at: DateTime<Utc>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
struct SessionRecord {
    username: String,
    role: String,
    expires_at: DateTime<Utc>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
struct ResetTokenRecord {
    username: String,
    expires_at: DateTime<Utc>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ResetPasswordRequest {
    pub username: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ResetPasswordIssueResponse {
    pub reset_token: String,
    pub expires_at: DateTime<Utc>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ResetPasswordConfirmRequest {
    pub reset_token: String,
    pub new_password: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ChangePasswordRequest {
    pub current_password: String,
    pub new_password: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AuthContext {
    pub username: String,
    pub role: String,
    pub expires_at: DateTime<Utc>,
}

impl AuthContext {
    pub fn is_admin(&self) -> bool {
        self.role == ROLE_ADMIN
    }

    pub fn can_write_settings(&self) -> bool {
        self.role == ROLE_ADMIN || self.role == ROLE_OPERATOR
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TenantsResponse {
    pub tenants: Vec<String>,
}

#[derive(Debug, Error)]
pub enum AdminError {
    #[error("unauthorized")]
    Unauthorized,
    #[error("forbidden")]
    Forbidden,
    #[error("validation error: {0}")]
    Validation(String),
    #[error("internal state error")]
    State,
}

pub struct AdminService {
    users: Mutex<HashMap<String, UserRecord>>,
    sessions: Mutex<HashMap<String, SessionRecord>>,
    reset_tokens: Mutex<HashMap<String, ResetTokenRecord>>,
    tenant_settings: Mutex<HashMap<String, TenantSettings>>,
    users_path: PathBuf,
    tenants_path: PathBuf,
    encryption_key: [u8; 32],
}

impl Default for AdminService {
    fn default() -> Self {
        let users_path = PathBuf::from(
            std::env::var("ADMIN_USERS_FILE").unwrap_or_else(|_| "data/admin_users.json".to_string()),
        );
        let tenants_path = PathBuf::from(
            std::env::var("TENANT_SETTINGS_FILE")
                .unwrap_or_else(|_| "data/tenant_settings.sec.json".to_string()),
        );

        ensure_parent_dir(&users_path);
        ensure_parent_dir(&tenants_path);

        let users = load_users(&users_path).unwrap_or_else(default_users);
        let encryption_key = resolve_encryption_key();
        let tenant_settings =
            load_tenants_encrypted(&tenants_path, &encryption_key).unwrap_or_else(default_tenants);

        persist_users(&users_path, &users);
        persist_tenants_encrypted(&tenants_path, &tenant_settings, &encryption_key);

        Self {
            users: Mutex::new(users),
            sessions: Mutex::new(HashMap::new()),
            reset_tokens: Mutex::new(HashMap::new()),
            tenant_settings: Mutex::new(tenant_settings),
            users_path,
            tenants_path,
            encryption_key,
        }
    }
}

impl AdminService {
    pub fn register(
        &self,
        request: &RegisterRequest,
        actor: Option<&AuthContext>,
    ) -> Result<UserRecord, AdminError> {
        validate_username(&request.username)?;
        validate_password(&request.password)?;
        validate_role(&request.role)?;

        let mut users = self.users.lock().map_err(|_| AdminError::State)?;
        if users.contains_key(&request.username) {
            return Err(AdminError::Validation("username already exists".to_string()));
        }

        let is_bootstrap = users.is_empty();
        if !is_bootstrap {
            match actor {
                Some(auth) if auth.is_admin() => {}
                Some(_) => return Err(AdminError::Forbidden),
                None => return Err(AdminError::Unauthorized),
            }
        }

        if is_bootstrap && request.role != ROLE_ADMIN {
            return Err(AdminError::Validation(
                "bootstrap user must be admin role".to_string(),
            ));
        }

        let user = UserRecord {
            username: request.username.clone(),
            password_hash: hash_password(&request.password)?,
            role: request.role.clone(),
            created_at: Utc::now(),
        };

        users.insert(user.username.clone(), user.clone());
        persist_users(&self.users_path, &users);
        Ok(user)
    }

    pub fn login(&self, request: &LoginRequest) -> Result<LoginResponse, AdminError> {
        validate_username(&request.username)?;
        validate_password(&request.password)?;

        let users = self.users.lock().map_err(|_| AdminError::State)?;
        let Some(user) = users.get(&request.username) else {
            return Err(AdminError::Unauthorized);
        };

        let valid = verify_password(&user.password_hash, &request.password)?;
        if !valid {
            return Err(AdminError::Unauthorized);
        }

        let role = user.role.clone();
        drop(users);

        let token = Uuid::new_v4().to_string();
        let expires_at = Utc::now() + Duration::hours(8);

        let mut sessions = self.sessions.lock().map_err(|_| AdminError::State)?;
        cleanup_expired_sessions(&mut sessions);
        sessions.insert(
            token.clone(),
            SessionRecord {
                username: request.username.clone(),
                role: role.clone(),
                expires_at,
            },
        );

        Ok(LoginResponse {
            token,
            expires_at,
            username: request.username.clone(),
            role,
        })
    }

    pub fn authorize(&self, token: &str) -> Result<AuthContext, AdminError> {
        let mut sessions = self.sessions.lock().map_err(|_| AdminError::State)?;
        cleanup_expired_sessions(&mut sessions);

        match sessions.get(token) {
            Some(session) if session.expires_at > Utc::now() => Ok(AuthContext {
                username: session.username.clone(),
                role: session.role.clone(),
                expires_at: session.expires_at,
            }),
            _ => Err(AdminError::Unauthorized),
        }
    }

    pub fn list_tenants(&self) -> Result<TenantsResponse, AdminError> {
        let settings = self.tenant_settings.lock().map_err(|_| AdminError::State)?;
        let mut tenants: Vec<String> = settings.keys().cloned().collect();
        tenants.sort();
        Ok(TenantsResponse { tenants })
    }

    pub fn get_settings_for_tenant(&self, tenant_id: &str) -> Result<TenantSettings, AdminError> {
        let mut settings = self.tenant_settings.lock().map_err(|_| AdminError::State)?;
        let tenant = settings
            .entry(tenant_id.to_string())
            .or_insert_with(|| TenantSettings::default_for(tenant_id))
            .clone();
        persist_tenants_encrypted(&self.tenants_path, &settings, &self.encryption_key);
        Ok(tenant)
    }

    pub fn update_settings_for_tenant(
        &self,
        tenant_id: &str,
        request: UpdateSettingsRequest,
    ) -> Result<TenantSettings, AdminError> {
        validate_tenant_settings(&request)?;

        let mut settings = self.tenant_settings.lock().map_err(|_| AdminError::State)?;
        let updated = TenantSettings {
            tenant_id: tenant_id.to_string(),
            devops: request.devops,
            enterprise: request.enterprise,
            datacenter: request.datacenter,
            updated_at: Utc::now(),
        };
        settings.insert(tenant_id.to_string(), updated.clone());
        persist_tenants_encrypted(&self.tenants_path, &settings, &self.encryption_key);
        Ok(updated)
    }

    pub fn issue_password_reset(
        &self,
        username: &str,
    ) -> Result<ResetPasswordIssueResponse, AdminError> {
        validate_username(username)?;

        let users = self.users.lock().map_err(|_| AdminError::State)?;
        if !users.contains_key(username) {
            return Err(AdminError::Validation("unknown username".to_string()));
        }
        drop(users);

        let reset_token = Uuid::new_v4().to_string();
        let expires_at = Utc::now() + Duration::minutes(30);
        let mut tokens = self.reset_tokens.lock().map_err(|_| AdminError::State)?;
        cleanup_expired_resets(&mut tokens);
        tokens.insert(
            reset_token.clone(),
            ResetTokenRecord {
                username: username.to_string(),
                expires_at,
            },
        );

        Ok(ResetPasswordIssueResponse {
            reset_token,
            expires_at,
        })
    }

    pub fn confirm_password_reset(
        &self,
        request: &ResetPasswordConfirmRequest,
    ) -> Result<(), AdminError> {
        validate_password(&request.new_password)?;

        let mut tokens = self.reset_tokens.lock().map_err(|_| AdminError::State)?;
        cleanup_expired_resets(&mut tokens);

        let record = tokens
            .remove(&request.reset_token)
            .ok_or(AdminError::Unauthorized)?;
        if record.expires_at <= Utc::now() {
            return Err(AdminError::Unauthorized);
        }

        let mut users = self.users.lock().map_err(|_| AdminError::State)?;
        let user = users
            .get_mut(&record.username)
            .ok_or_else(|| AdminError::Validation("unknown username".to_string()))?;
        user.password_hash = hash_password(&request.new_password)?;
        persist_users(&self.users_path, &users);
        Ok(())
    }

    pub fn change_password(
        &self,
        auth: &AuthContext,
        request: &ChangePasswordRequest,
    ) -> Result<(), AdminError> {
        validate_password(&request.current_password)?;
        validate_password(&request.new_password)?;

        let mut users = self.users.lock().map_err(|_| AdminError::State)?;
        let user = users
            .get_mut(&auth.username)
            .ok_or(AdminError::Unauthorized)?;

        let valid = verify_password(&user.password_hash, &request.current_password)?;
        if !valid {
            return Err(AdminError::Unauthorized);
        }

        user.password_hash = hash_password(&request.new_password)?;
        persist_users(&self.users_path, &users);
        Ok(())
    }
}

fn validate_tenant_settings(request: &UpdateSettingsRequest) -> Result<(), AdminError> {
    if request.devops.endpoint.trim().is_empty() {
        return Err(AdminError::Validation("devops.endpoint must not be empty".to_string()));
    }
    if request.enterprise.tenant.trim().is_empty() {
        return Err(AdminError::Validation("enterprise.tenant must not be empty".to_string()));
    }
    if request.datacenter.regions.is_empty() {
        return Err(AdminError::Validation(
            "datacenter.regions must contain at least one region".to_string(),
        ));
    }
    if request.datacenter.monthly_cost_cap_usd <= 0.0 {
        return Err(AdminError::Validation(
            "datacenter.monthly_cost_cap_usd must be > 0".to_string(),
        ));
    }
    Ok(())
}

fn validate_role(role: &str) -> Result<(), AdminError> {
    let valid = role == ROLE_ADMIN || role == ROLE_OPERATOR || role == ROLE_VIEWER;
    if !valid {
        return Err(AdminError::Validation(
            "role must be one of: admin, operator, viewer".to_string(),
        ));
    }
    Ok(())
}

fn validate_username(username: &str) -> Result<(), AdminError> {
    let valid = username
        .chars()
        .all(|c| c.is_ascii_alphanumeric() || c == '_' || c == '-');
    if username.len() < 3 || username.len() > 32 || !valid {
        return Err(AdminError::Validation(
            "username must be 3-32 chars and use [a-zA-Z0-9_-]".to_string(),
        ));
    }
    Ok(())
}

fn validate_password(password: &str) -> Result<(), AdminError> {
    let has_upper = password.chars().any(|c| c.is_ascii_uppercase());
    let has_lower = password.chars().any(|c| c.is_ascii_lowercase());
    let has_digit = password.chars().any(|c| c.is_ascii_digit());
    let has_symbol = password
        .chars()
        .any(|c| !c.is_ascii_alphanumeric() && !c.is_ascii_whitespace());

    if password.len() < 12 || !has_upper || !has_lower || !has_digit || !has_symbol {
        return Err(AdminError::Validation(
            "password must be >=12 chars with upper/lower/digit/symbol".to_string(),
        ));
    }
    Ok(())
}

fn hash_password(password: &str) -> Result<String, AdminError> {
    let salt = SaltString::generate(&mut OsRng);
    Argon2::default()
        .hash_password(password.as_bytes(), &salt)
        .map(|hash| hash.to_string())
        .map_err(|_| AdminError::State)
}

fn verify_password(stored_hash: &str, password: &str) -> Result<bool, AdminError> {
    let parsed = PasswordHash::new(stored_hash).map_err(|_| AdminError::State)?;
    Ok(Argon2::default()
        .verify_password(password.as_bytes(), &parsed)
        .is_ok())
}

fn cleanup_expired_sessions(sessions: &mut HashMap<String, SessionRecord>) {
    let now = Utc::now();
    sessions.retain(|_, session| session.expires_at > now);
}

fn cleanup_expired_resets(tokens: &mut HashMap<String, ResetTokenRecord>) {
    let now = Utc::now();
    tokens.retain(|_, token| token.expires_at > now);
}

fn ensure_parent_dir(path: &Path) {
    if let Some(parent) = path.parent() {
        let _ = fs::create_dir_all(parent);
    }
}

fn default_users() -> HashMap<String, UserRecord> {
    let mut users = HashMap::new();
    let default_password =
        std::env::var("ADMIN_PASSWORD").unwrap_or_else(|_| "ChangeMe#2026!".to_string());
    if let Ok(hash) = hash_password(&default_password) {
        users.insert(
            "admin".to_string(),
            UserRecord {
                username: "admin".to_string(),
                password_hash: hash,
                role: ROLE_ADMIN.to_string(),
                created_at: Utc::now(),
            },
        );
    }
    users
}

fn default_tenants() -> HashMap<String, TenantSettings> {
    let mut map = HashMap::new();
    map.insert("default".to_string(), TenantSettings::default_for("default"));
    map
}

fn resolve_encryption_key() -> [u8; 32] {
    let raw = std::env::var("TENANT_SETTINGS_ENCRYPTION_KEY")
        .unwrap_or_else(|_| "dev-only-tenant-settings-encryption-key-32b!".to_string());
    let key_bytes = raw.as_bytes().to_vec();

    let mut key = [0u8; 32];
    for (idx, byte) in key_bytes.iter().enumerate() {
        key[idx % 32] ^= *byte;
    }
    key
}

#[derive(Debug, Serialize, Deserialize)]
struct EncryptedBlob {
    nonce_hex: String,
    ciphertext_hex: String,
}

fn load_users(path: &Path) -> Option<HashMap<String, UserRecord>> {
    let raw = fs::read_to_string(path).ok()?;
    serde_json::from_str(&raw).ok()
}

fn persist_users(path: &Path, users: &HashMap<String, UserRecord>) {
    if let Ok(raw) = serde_json::to_string_pretty(users) {
        let _ = fs::write(path, raw);
    }
}

fn load_tenants_encrypted(path: &Path, key: &[u8; 32]) -> Option<HashMap<String, TenantSettings>> {
    let raw = fs::read_to_string(path).ok()?;

    if raw.trim_start().starts_with('{') {
        let blob: EncryptedBlob = serde_json::from_str(&raw).ok()?;
        let nonce_raw = decode_hex(&blob.nonce_hex)?;
        let cipher_raw = decode_hex(&blob.ciphertext_hex)?;
        let plaintext = xor_stream_cipher(&cipher_raw, key, &nonce_raw);
        return serde_json::from_slice(&plaintext).ok();
    }

    serde_json::from_str(&raw).ok()
}

fn persist_tenants_encrypted(path: &Path, tenants: &HashMap<String, TenantSettings>, key: &[u8; 32]) {
    let Ok(plaintext) = serde_json::to_vec_pretty(tenants) else {
        return;
    };

    let nonce_raw = Uuid::new_v4().as_bytes().to_vec();
    let ciphertext = xor_stream_cipher(&plaintext, key, &nonce_raw);

    let blob = EncryptedBlob {
        nonce_hex: encode_hex(&nonce_raw),
        ciphertext_hex: encode_hex(&ciphertext),
    };

    if let Ok(raw) = serde_json::to_string_pretty(&blob) {
        let _ = fs::write(path, raw);
    }
}

fn xor_stream_cipher(payload: &[u8], key: &[u8; 32], nonce: &[u8]) -> Vec<u8> {
    if nonce.is_empty() {
        return payload.to_vec();
    }

    payload
        .iter()
        .enumerate()
        .map(|(idx, byte)| {
            let k = key[idx % key.len()];
            let n = nonce[idx % nonce.len()];
            byte ^ k ^ n
        })
        .collect()
}

fn encode_hex(bytes: &[u8]) -> String {
    bytes
        .iter()
        .map(|b| format!("{b:02x}"))
        .collect::<Vec<String>>()
        .join("")
}

fn decode_hex(raw: &str) -> Option<Vec<u8>> {
    if raw.len() % 2 != 0 {
        return None;
    }

    let mut out = Vec::with_capacity(raw.len() / 2);
    let chars: Vec<char> = raw.chars().collect();
    for idx in (0..chars.len()).step_by(2) {
        let hi = chars[idx].to_digit(16)?;
        let lo = chars[idx + 1].to_digit(16)?;
        out.push(((hi << 4) + lo) as u8);
    }
    Some(out)
}
