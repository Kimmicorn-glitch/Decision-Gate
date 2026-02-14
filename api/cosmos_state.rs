use async_trait::async_trait;
use reqwest::Client;
use uuid::Uuid;

use crate::api::{DecisionAuditRecord, StateStore};

pub struct CosmosStateStore {
    endpoint: String,
    database: String,
    container: String,
    key: String,
    client: Client,
}

impl CosmosStateStore {
    pub fn new(endpoint: String, database: String, container: String, key: String) -> Self {
        Self {
            endpoint,
            database,
            container,
            key,
            client: Client::new(),
        }
    }

    fn item_url(&self, id: Uuid) -> String {
        format!(
            "{}/dbs/{}/colls/{}/docs/{}",
            self.endpoint, self.database, self.container, id
        )
    }

    fn docs_url(&self) -> String {
        format!(
            "{}/dbs/{}/colls/{}/docs",
            self.endpoint, self.database, self.container
        )
    }
}

#[async_trait]
impl StateStore for CosmosStateStore {
    async fn save_audit(&self, audit: DecisionAuditRecord) {
        let _ = self
            .client
            .post(self.docs_url())
            .header("x-ms-documentdb-is-upsert", "true")
            .header("x-ms-version", "2018-12-31")
            .header("Authorization", &self.key)
            .json(&audit)
            .send()
            .await;
    }

    async fn get_audit(&self, audit_id: Uuid) -> Option<DecisionAuditRecord> {
        let response = self
            .client
            .get(self.item_url(audit_id))
            .header("x-ms-version", "2018-12-31")
            .header("Authorization", &self.key)
            .send()
            .await
            .ok()?;

        response.json::<DecisionAuditRecord>().await.ok()
    }

    async fn list_audits(&self) -> Vec<DecisionAuditRecord> {
        Vec::new()
    }
}
