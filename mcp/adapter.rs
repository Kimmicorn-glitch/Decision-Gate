use std::time::Duration;

use async_trait::async_trait;
use reqwest::Client;
use serde::Serialize;

use crate::{agents::AgentError, api::DecisionResponse};

#[async_trait]
pub trait McpAdapter: Send + Sync {
    async fn call_function_tool(
        &self,
        trace_id: &str,
        function_name: &str,
        payload: serde_json::Value,
    ) -> Result<serde_json::Value, AgentError>;

    async fn log_decision(
        &self,
        trace_id: &str,
        response: &DecisionResponse,
        latency: Duration,
    ) -> Result<(), AgentError>;

    async fn register_tool_usage(
        &self,
        trace_id: &str,
        tool_name: &str,
        status: &str,
    ) -> Result<(), AgentError>;
}

#[derive(Clone)]
pub struct AzureMcpAdapter {
    base_url: String,
    logging_path: String,
    client: Client,
}

impl AzureMcpAdapter {
    pub fn new(base_url: String, logging_path: String) -> Self {
        Self {
            base_url,
            logging_path,
            client: Client::new(),
        }
    }
}

#[derive(Serialize)]
struct DecisionLogPayload<'a> {
    trace_id: &'a str,
    decision: &'a str,
    confidence_score: f32,
    audit_id: String,
    latency_ms: u128,
    policy_violations: usize,
}

#[derive(Serialize)]
struct ToolUsagePayload<'a> {
    trace_id: &'a str,
    tool_name: &'a str,
    status: &'a str,
}

#[async_trait]
impl McpAdapter for AzureMcpAdapter {
    async fn call_function_tool(
        &self,
        trace_id: &str,
        function_name: &str,
        payload: serde_json::Value,
    ) -> Result<serde_json::Value, AgentError> {
        let url = format!("{}/api/{}", self.base_url, function_name);
        let response = self
            .client
            .post(url)
            .header("x-trace-id", trace_id)
            .json(&payload)
            .send()
            .await
            .map_err(|e| AgentError::External(e.to_string()))?;

        response
            .json::<serde_json::Value>()
            .await
            .map_err(|e| AgentError::External(e.to_string()))
    }

    async fn log_decision(
        &self,
        trace_id: &str,
        response: &DecisionResponse,
        latency: Duration,
    ) -> Result<(), AgentError> {
        let decision = match response.decision {
            crate::api::Decision::Approve => "APPROVE",
            crate::api::Decision::Revise => "REVISE",
            crate::api::Decision::Block => "BLOCK",
        };

        let payload = DecisionLogPayload {
            trace_id,
            decision,
            confidence_score: response.confidence_score,
            audit_id: response.audit_id.to_string(),
            latency_ms: latency.as_millis(),
            policy_violations: response.policy_violations.len(),
        };

        let url = format!("{}{}", self.base_url, self.logging_path);
        self.client
            .post(url)
            .json(&payload)
            .send()
            .await
            .map_err(|e| AgentError::External(e.to_string()))?;

        Ok(())
    }

    async fn register_tool_usage(
        &self,
        trace_id: &str,
        tool_name: &str,
        status: &str,
    ) -> Result<(), AgentError> {
        let payload = ToolUsagePayload {
            trace_id,
            tool_name,
            status,
        };
        let url = format!("{}/api/mcp/register-tool-usage", self.base_url);
        self.client
            .post(url)
            .json(&payload)
            .send()
            .await
            .map_err(|e| AgentError::External(e.to_string()))?;
        Ok(())
    }
}
