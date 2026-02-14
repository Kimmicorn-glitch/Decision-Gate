use std::fs;

use serde::Deserialize;
use thiserror::Error;

use crate::api::{ExecutionOutput, PlannerOutput, PolicyViolation, ProposedActionRequest};

#[derive(Debug, Error)]
pub enum PolicyEngineError {
    #[error("io error: {0}")]
    Io(String),
    #[error("parse error: {0}")]
    Parse(String),
}

#[derive(Debug, Clone, Deserialize)]
pub struct PolicyEngine {
    policies: Vec<PolicyRule>,
}

#[derive(Debug, Clone, Deserialize)]
struct PolicyRule {
    id: String,
    severity: String,
    field: String,
    condition: String,
    value: String,
    message: String,
}

impl PolicyEngine {
    pub fn from_yaml_file(path: &str) -> Result<Self, PolicyEngineError> {
        let raw = fs::read_to_string(path).map_err(|e| PolicyEngineError::Io(e.to_string()))?;
        serde_yaml::from_str(&raw).map_err(|e| PolicyEngineError::Parse(e.to_string()))
    }

    pub fn evaluate(
        &self,
        request: &ProposedActionRequest,
        plan: &PlannerOutput,
        execution: &ExecutionOutput,
    ) -> Result<Vec<PolicyViolation>, PolicyEngineError> {
        let mut violations = Vec::new();

        let text = request.description.to_ascii_lowercase();
        let risk = request
            .risk_level
            .clone()
            .unwrap_or_else(|| "unknown".to_string())
            .to_ascii_lowercase();

        for rule in &self.policies {
            let matched = match rule.field.as_str() {
                "description" => evaluate_condition(&text, &rule.condition, &rule.value),
                "risk_level" => evaluate_condition(&risk, &rule.condition, &rule.value),
                "execution.detected_risks" => execution
                    .detected_risks
                    .iter()
                    .any(|r| evaluate_condition(r, &rule.condition, &rule.value)),
                "plan.required_permissions" => plan.tasks.iter().any(|t| {
                    t.required_permissions
                        .iter()
                        .any(|p| evaluate_condition(p, &rule.condition, &rule.value))
                }),
                _ => false,
            };

            if matched {
                violations.push(PolicyViolation {
                    policy_id: rule.id.clone(),
                    severity: rule.severity.clone(),
                    message: rule.message.clone(),
                });
            }
        }

        Ok(violations)
    }
}

fn evaluate_condition(left: &str, condition: &str, right: &str) -> bool {
    let normalized_left = left.to_ascii_lowercase();
    let normalized_right = right.to_ascii_lowercase();

    match condition {
        "contains" => normalized_left.contains(&normalized_right),
        "equals" => normalized_left == normalized_right,
        "starts_with" => normalized_left.starts_with(&normalized_right),
        _ => false,
    }
}
