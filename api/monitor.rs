use std::{collections::HashMap, sync::Mutex};

use chrono::Utc;

use crate::api::{IntegrationRegistration, IntegrationRegistrationRequest, RuntimeMetrics};

#[derive(Default)]
pub struct MonitorRegistry {
    data: Mutex<HashMap<String, IntegrationRegistration>>,
    runtime: Mutex<Option<RuntimeMetrics>>,
}

impl MonitorRegistry {
    pub async fn register(
        &self,
        request: IntegrationRegistrationRequest,
    ) -> Option<IntegrationRegistration> {
        let key = request.integration.trim().to_ascii_lowercase();
        if key.is_empty() {
            return None;
        }

        let mut guard = self.data.lock().ok()?;
        let now = Utc::now();

        let created_at = guard
            .get(&key)
            .map(|existing| existing.created_at)
            .unwrap_or(now);

        let record = IntegrationRegistration {
            integration: request.integration.trim().to_string(),
            integration_type: request.integration_type.trim().to_ascii_lowercase(),
            autonomous: request.autonomous,
            environment: request.environment.trim().to_ascii_lowercase(),
            owner: request.owner.trim().to_string(),
            status: request.status.trim().to_ascii_lowercase(),
            created_at,
            updated_at: now,
        };

        guard.insert(key, record.clone());
        Some(record)
    }

    pub async fn list(&self) -> Vec<IntegrationRegistration> {
        let mut items = self
            .data
            .lock()
            .map(|m| m.values().cloned().collect::<Vec<_>>())
            .unwrap_or_default();
        items.sort_by(|a, b| b.updated_at.cmp(&a.updated_at));
        items
    }

    pub async fn update_runtime_metrics(&self, runtime: RuntimeMetrics) {
        if let Ok(mut guard) = self.runtime.lock() {
            *guard = Some(runtime);
        }
    }

    pub async fn runtime_metrics(&self) -> Option<RuntimeMetrics> {
        self.runtime.lock().ok().and_then(|r| r.clone())
    }
}
