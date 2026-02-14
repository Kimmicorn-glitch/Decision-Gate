# Agent Decision Gate

Enterprise AI control plane that enforces a decision checkpoint between a proposed AI action and execution in Azure.

## Run Guide

For a dedicated local runbook, see `RUNNING.md`.

## Project Structure

- `agents/`: Multi-agent implementations (`PlannerAgent`, `ExecutionAgent`, `GovernanceAgent`, `CriticAgent`) and agent traits.
- `mcp/`: MCP adapter interface and Azure MCP client.
- `governance/`: Config-driven policy evaluation engine.
- `api/`: API models, orchestration engine, state store abstraction, observability bootstrap.
- `infra/`: Azure deployment manifests and integration contracts.
- `config/`: Policy rules and Foundry model router mappings.
- `src/main.rs`: REST entrypoint (`POST /proposed-action`).

## API

`POST /proposed-action`

```json
{
  "action_type": "deploy",
  "description": "Deploy service X to production with elevated permissions.",
  "metadata": {
    "service": "service-x",
    "environment": "production"
  },
  "risk_level": "high"
}
```

`GET /audit`

Returns audit summaries for UI consumption:

```json
{
  "data": [
    {
      "audit_id": "uuid",
      "timestamp": "2026-02-14T18:00:00Z",
      "decision": "BLOCK",
      "action_type": "deploy",
      "confidence_score": 0.2
    }
  ]
}
```

Response schema:

```json
{
  "decision": "BLOCK",
  "reasoning": "BLOCK action 'deploy' evaluated with 2 risk findings and 3 policy violations",
  "policy_violations": [
    {
      "policy_id": "POL-PRIV-001",
      "severity": "critical",
      "message": "Elevated permissions in production require security approval workflow."
    }
  ],
  "confidence_score": 0.2,
  "audit_id": "uuid",
  "trace_id": "uuid"
}
```

## Agent Pipeline

1. `PlannerAgent`: Converts request into structured tasks.
2. `ExecutionAgent`: Simulates technical feasibility and risks.
3. `GovernanceAgent`: Applies external policy configuration.
4. `CriticAgent`: Challenges assumptions and recommends final risk posture.
5. Decision aggregation: deterministic merge to `APPROVE | REVISE | BLOCK`.

## Model Router (Foundry-Compatible)

`config/model-router.yaml` maps decision stages to models. The service uses this mapping at runtime and records selected models in audit records.

## Governance Policies

Policies are externalized in `config/policies.yaml`. No policy is hard-coded in the decision gate logic.

## MCP + Azure Functions Integration

- MCP adapter: `mcp/adapter.rs`
- Tool call contract: `infra/function-tools-contract.json`
- Decision logs include trace IDs and policy outcomes for auditable replay.

## Azure Deployment

See `infra/deployment.md` and `infra/containerapp.yaml`.

## Run Locally

```bash
cargo run
```

```bash
curl -sS -X POST http://localhost:8080/proposed-action \
  -H 'content-type: application/json' \
  -d '{
    "action_type":"deploy",
    "description":"Deploy service X to production with elevated permissions.",
    "metadata":{"service":"service-x","environment":"production"},
    "risk_level":"high"
  }' | jq
```
