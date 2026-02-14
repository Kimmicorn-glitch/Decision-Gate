# Architecture Diagram Description

```text
[Client / Orchestrator]
        |
        v
POST /proposed-action
        |
        v
[Agent Decision Gate (Rust API)]
  | PlannerAgent      -> stage model: planner
  | ExecutionAgent    -> stage model: execution
  | GovernanceAgent   -> stage model: governance
  | CriticAgent       -> stage model: critic
        |
        +--> [Foundry Model Router]
        |         |
        |         v
        |   [Premier Models]
        |
        +--> [Azure MCP Adapter]
                  |
                  +--> [Azure Functions Tool Layer]
                  |
                  +--> [MCP Logging Endpoint]
        |
        +--> [State Store]
               +--> Azure Cosmos DB or Azure Storage
        |
        +--> [OpenTelemetry Traces + Metrics]
               +--> Azure Monitor / Application Insights
```

## Enforcement Boundary

The Decision Gate is the mandatory checkpoint between intent and execution:

- Input: Proposed AI action.
- Output: `APPROVE | REVISE | BLOCK` with audit metadata.
- Execution tools are only called through MCP adapter with trace IDs.

## Deterministic Decisioning

- Policy results are config-driven and reproducible.
- Final decision is an ordered merge of Governance + Critic outputs.
- Every request creates an `audit_id` and `trace_id`.
