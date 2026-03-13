export const safetyTracker = [
  {
    category: "Prompt Injection",
    status: "Tracked",
    learning:
      "We track instruction override attempts, secret extraction prompts, and cross-tool prompt injection markers as hard policy violations.",
    guardrail:
      "Critical rules block requests that try to override instructions, reveal prompts, disable policy, or exfiltrate sensitive data."
  },
  {
    category: "Stealth / Backdoors",
    status: "Tracked",
    learning:
      "We treat requests to hide malicious changes, add backdoors, bypass authentication, or evade detection as disallowed intent.",
    guardrail:
      "Critical rules block stealthy, persistence-seeking, or trace-hiding requests before approval."
  },
  {
    category: "Destructive Actions",
    status: "Tracked",
    learning:
      "We watch for deletion, production wipe, backup destruction, and self-propagating behaviors that could damage systems quickly.",
    guardrail:
      "Risk scoring and policy blocks raise or hard-stop destructive language such as database wipes and authentication disablement."
  },
  {
    category: "Runaway Autonomy",
    status: "Tracked",
    learning:
      "We monitor excessive agency and repeated-loop behavior because agent systems fail when they can chain too many actions without review.",
    guardrail:
      "Loop-style prompts and high-risk autonomy signals are revised or blocked, and actions remain auditable."
  }
] as const;

export const incidentResearch = [
  {
    title: "OpenAI Operator system card",
    date: "January 23, 2025",
    takeaway:
      "Prompt injection remained a primary browser-agent risk, and OpenAI described upgrading monitor recall quickly during deployment.",
    sourceLabel: "OpenAI",
    sourceUrl: "https://openai.com/index/operator-system-card/"
  },
  {
    title: "OpenAI Atlas hardening work",
    date: "December 22, 2025",
    takeaway:
      "OpenAI described using automated red teaming and reinforcement learning to discover prompt-injection exploits before attackers can weaponize them.",
    sourceLabel: "OpenAI",
    sourceUrl: "https://openai.com/index/why-openai-atlas-is-hard-to-game/"
  },
  {
    title: "Anthropic prompt injection mitigations",
    date: "Reviewed March 13, 2026",
    takeaway:
      "Anthropic documents defense-in-depth guidance for tool-use systems: confirmation steps, least privilege, and treating external content as untrusted input.",
    sourceLabel: "Anthropic Docs",
    sourceUrl: "https://docs.anthropic.com/en/docs/test-and-evaluate/strengthen-guardrails/mitigate-jailbreaks"
  },
  {
    title: "OWASP GenAI Top 10",
    date: "Reviewed March 13, 2026",
    takeaway:
      "OWASP highlights prompt injection, insecure output handling, excessive agency, and denial-of-service patterns as recurring failure classes for LLM software.",
    sourceLabel: "OWASP",
    sourceUrl: "https://genai.owasp.org/llm-top-10/"
  }
] as const;

export const learningLoop = [
  "Collect failures from audit logs, red-team prompts, external incident research, and operator reports.",
  "Tag the failure class, add or tighten policy rules, and expand regression tests for the exact prompt family.",
  "Roll out guardrail updates deliberately rather than letting the system rewrite its own controls in production.",
  "Review high-risk decisions and update the public safety tracker so users can see what the system is watching."
] as const;
