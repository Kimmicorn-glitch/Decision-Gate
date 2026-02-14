use std::{collections::HashMap, sync::Mutex};

use async_trait::async_trait;
use uuid::Uuid;

use crate::api::DecisionAuditRecord;

#[async_trait]
pub trait StateStore: Send + Sync {
    async fn save_audit(&self, audit: DecisionAuditRecord);
    async fn get_audit(&self, audit_id: Uuid) -> Option<DecisionAuditRecord>;
    async fn list_audits(&self) -> Vec<DecisionAuditRecord>;
}

#[derive(Default)]
pub struct InMemoryStateStore {
    data: Mutex<HashMap<Uuid, DecisionAuditRecord>>,
}

#[async_trait]
impl StateStore for InMemoryStateStore {
    async fn save_audit(&self, audit: DecisionAuditRecord) {
        if let Ok(mut guard) = self.data.lock() {
            guard.insert(audit.audit_id, audit);
        }
    }

    async fn get_audit(&self, audit_id: Uuid) -> Option<DecisionAuditRecord> {
        self.data
            .lock()
            .ok()
            .and_then(|m| m.get(&audit_id).cloned())
    }

    async fn list_audits(&self) -> Vec<DecisionAuditRecord> {
        self.data
            .lock()
            .map(|m| m.values().cloned().collect::<Vec<_>>())
            .unwrap_or_default()
    }
}
