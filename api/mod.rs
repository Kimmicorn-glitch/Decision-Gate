mod admin;
mod cosmos_state;
mod engine;
mod models;
mod monitor;
mod observability;
mod state;

pub use admin::*;
pub use cosmos_state::CosmosStateStore;
pub use engine::{DecisionEngine, FoundryModelRouter};
pub use models::*;
pub use monitor::MonitorRegistry;
pub use observability::{
    capture_patch_decision, capture_patch_request, capture_patch_tool_call, capture_pipeline_error,
    capture_runtime_pressure, init_observability,
};
pub use state::{InMemoryStateStore, StateStore};

#[derive(Clone)]
pub struct AppState {
    pub engine: std::sync::Arc<DecisionEngine>,
    pub admin: std::sync::Arc<AdminService>,
    pub monitor: std::sync::Arc<MonitorRegistry>,
}
