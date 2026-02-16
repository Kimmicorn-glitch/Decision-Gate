mod admin;
mod cosmos_state;
mod engine;
mod models;
mod observability;
mod state;

pub use admin::*;
pub use cosmos_state::CosmosStateStore;
pub use engine::{DecisionEngine, FoundryModelRouter};
pub use models::*;
pub use observability::init_observability;
pub use state::{InMemoryStateStore, StateStore};

#[derive(Clone)]
pub struct AppState {
    pub engine: std::sync::Arc<DecisionEngine>,
    pub admin: std::sync::Arc<AdminService>,
}
