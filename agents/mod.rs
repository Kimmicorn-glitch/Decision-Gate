mod critic;
mod execution;
mod governance;
mod planner;

use async_trait::async_trait;
use thiserror::Error;
use uuid::Uuid;

use crate::api::{
    CriticOutput, ExecutionOutput, GovernanceOutput, PlannerOutput, ProposedActionRequest,
};

pub use critic::CriticAgent;
pub use execution::ExecutionAgent;
pub use governance::GovernanceAgent;
pub use planner::PlannerAgent;

#[derive(Debug, Clone)]
pub struct AgentContext {
    pub trace_id: String,
    pub audit_id: Uuid,
    pub model: String,
}

#[derive(Debug, Error)]
pub enum AgentError {
    #[error("validation error: {0}")]
    Validation(String),
    #[error("policy engine error: {0}")]
    Policy(String),
    #[error("config error: {0}")]
    Config(String),
    #[error("external dependency error: {0}")]
    External(String),
}

#[async_trait]
pub trait Planner: Send + Sync {
    async fn plan(
        &self,
        request: &ProposedActionRequest,
        context: &AgentContext,
    ) -> Result<PlannerOutput, AgentError>;
}

#[async_trait]
pub trait Executor: Send + Sync {
    async fn evaluate_execution(
        &self,
        request: &ProposedActionRequest,
        plan: &PlannerOutput,
        context: &AgentContext,
    ) -> Result<ExecutionOutput, AgentError>;
}

#[async_trait]
pub trait Governor: Send + Sync {
    async fn evaluate_governance(
        &self,
        request: &ProposedActionRequest,
        plan: &PlannerOutput,
        execution: &ExecutionOutput,
        context: &AgentContext,
    ) -> Result<GovernanceOutput, AgentError>;
}

#[async_trait]
pub trait Critic: Send + Sync {
    async fn critique(
        &self,
        request: &ProposedActionRequest,
        plan: &PlannerOutput,
        execution: &ExecutionOutput,
        governance: &GovernanceOutput,
        context: &AgentContext,
    ) -> Result<CriticOutput, AgentError>;
}
