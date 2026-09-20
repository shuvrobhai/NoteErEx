# Custom Agent and Subagent Design Guide
*Architecture Standards, Security Boundaries, and Antigravity Best Practices*

---

## 1. Executive Overview

Custom agents and subagents are modular, task-specialized AI configurations designed to run either as primary foreground copilots or as delegated background workers. When designed correctly, they prevent context window bloat, enforce clear separation of concerns, and parallelize complex engineering workflows.

In Google Antigravity, subagents operate with independent context windows and scoped toolsets. However, unconstrained or misconfigured subagents encounter predictable failure modes: **context wandering**, **filesystem traversal**, **interactive UI deadlocks**, and **tool initialization hangs**.

This guide documents the architectural standards, failure mitigations, and canonical frontmatter specifications established across the official Google Antigravity platform and modern agent-engineering standards.

---

## 2. Core Lessons and Failure Mitigations

### Lesson 1: Missing Tooling Causes Wandering Loops
* **The Failure**: When a subagent is asked to accomplish an objective for which it lacks a necessary tool primitive (e.g., asking an agent without `search_web` to inspect online docs), the model planner attempts workarounds using available tools. It will speculatively inspect unrelated local directories (`~/.config`, `~/.gemini/`, or other projects) in search of offline notes or cached credentials.
* **The Mitigation**: Prompt with positive boundary directives and validate tool registration:
  - **Affirmative Prompt Rule**: *"Operate strictly with your declared toolset. If a task requires capabilities or tools outside your allowlist, immediately halt and report a blocker to the parent agent via `send_message`."*
  - **Tool Registration Pre-requisite**: Subagents can only execute tools that are also registered in the parent agent's tool catalog. Unmapped or misspelled tool names in the `tools` array can cause the subagent process to hang.

### Lesson 2: Filesystem Confinement vs. OS-Level Sandboxing
* **The Failure**: File access tools (`view_file`, `list_dir`, `grep_search`) have no native directory bounds unless constrained, allowing unintentional traversal into `../` or `~`.
* **The Mitigation**: Employ a two-layer security defense:
  1. **Prompt Confinement (Positive Target)**: Direct the agent affirmatively: *"Confine all filesystem reads, searches, and modifications strictly to the workspace root (`./`)."*
  2. **Native OS Sandboxing (`commandExecutionPolicy`)**: For shell execution, configure `commandExecutionPolicy: sandbox`. Antigravity isolates terminal commands within containerized sandboxes (`nsjail`, `sandbox-exec`, or `AppContainer`) to prevent escape regardless of prompt phrasing.

### Lesson 3: Interactive Tool Deadlock in Background Subagents
* **The Failure**: Modal prompting tools (such as `ask_question` or user option dialogs) require an attached interactive terminal. When an autonomous background subagent (`subagent: true`) calls an interactive modal, the thread deadlocks waiting for user input that can never be delivered.
* **The Mitigation**: Enforce strict separation between foreground and background toolsets:
  - **Foreground (`mainAgent: true`)**: Interactive modals (`ask_question`) are permitted.
  - **Background (`subagent: true`)**: Modal prompts are prohibited. Subagents must communicate questions, progress checkpoints, and blockers asynchronously back to the parent agent using `send_message`.

### Lesson 4: Single Source of Truth over Copy-Paste Boilerplate
* **The Failure**: Copying identical 30-line guardrail sections across multiple agent files burns redundant context tokens on every turn and creates configuration drift.
* **The Mitigation**: Maintain shared constraints in a single authoritative workspace rule file (such as `.agents/rules/workspace-boundaries.md`). Agents configured with `inheritCustomizations: true` automatically inherit workspace rules without redundant in-file boilerplate.

### Lesson 5: Canonical File Structure (Flat Files in `agents/`)
* **The Standard**: Antigravity discovers custom agents as single, self-contained Markdown files (`<name>.md`) placed directly in designated agent directories:
  - **Workspace Level**: `{workspace}/.agents/agents/<name>.md`
  - **Global Configuration**: `~/.gemini/config/agents/<name>.md`
* **Structure**:
  ```
  .agents/agents/
  ├── architect.md   (Single self-contained file: YAML frontmatter + prompt)
  ├── developer.md   (Single self-contained file: YAML frontmatter + prompt)
  └── checker.md     (Single self-contained file: YAML frontmatter + prompt)
  ```
  *(Note: Subdirectories such as `.agents/agents/{name}/agent.md` break agent discovery).*

### Lesson 6: Reviewer Independence (Model Tiering)
* **The Failure**: Running a verification subagent on the exact same model tier as the authoring agent leads to shared blind spots, where subtle edge cases or logic flaws are overlooked by both.
* **The Mitigation**: Configure `model: pro` on verification and code review agents to ensure independent scrutiny over changes produced by `model: inherit` or `flash`.

---

## 3. Canonical Frontmatter Specification

Every agent definition begins with YAML frontmatter specifying its identity, permissions, model tier, and inheritance rules:

```yaml
---
name: string                   # Unique agent identifier (e.g. checker)
description: string            # Context pointer used by planner to delegate tasks
tools: string[]                # Explicit allowlist of permitted tools
disallowedTools: string[]      # Optional denylist of explicitly blocked tools
mainAgent: boolean             # true = Selectable as primary foreground copilot
subagent: boolean              # true = Invocable as delegated background worker
model: inherit | flash | pro   # Model tier for execution
commandExecutionPolicy: sandbox# sandbox | auto | eager | off
inheritCustomizations: boolean # true = Inherit workspace rules, skills, subagents (default: true)
---
```

### Key Configuration Directives

| Property | Type | Description |
|---|---|---|
| `name` | string | Identifier used when invoking the agent programmatically or via CLI. |
| `description` | string | High-demand context pointer. Front-load leading action verbs and state distinct trigger branches without persona fluff. |
| `tools` | string[] | **Primary capability constraint**. The agent can only execute tools in this allowlist that are also present in the parent catalog. |
| `disallowedTools`| string[] | Optional denylist applied on top of granted tools for defense-in-depth. |
| `mainAgent` | boolean | Enables the agent as an interactive primary chat participant. |
| `subagent` | boolean | Allows the agent to be spawned by other agents via `invoke_subagent`. |
| `model` | string | Specifies model tier. Use `pro` for high-scrutiny reviews and `inherit` or `flash` for scoped build steps. |
| `commandExecutionPolicy` | string | Controls shell safety: `sandbox` (OS isolation), `auto` (safe commands auto-run), `eager`, or `off` (shell disabled). |
| `inheritCustomizations` | boolean | Set to `false` to run in a pristine sandbox without loading ambient workspace rules/skills. Defaults to `true`. |

---

## 4. Subagent Lifecycle and Runtime Management

Antigravity provides full execution symmetry and management hooks for autonomous subagents:

1. **Invocation**: Main agents spawn background workers dynamically using `invoke_subagent`, passing target task parameters, recording names, and isolated instructions.
2. **Monitoring**: Users and parent agents can inspect active subagents via:
   - The CLI `/agents` panel or the graphical subagent manager.
   - Keyboard shortcut `Alt+J` to cycle active subagent threads.
   - Real-time telemetry, logs, and reasoning streams.
3. **Inter-Process Communication (IPC)**: Subagents report status, milestones, and blockers to the parent thread using `send_message`.
4. **Cancellation**: Active subagents can be terminated immediately via `CancelSubagent` / `Kill Active Subagent` hooks without disrupting the parent session.

---

## 5. Agent Role Archetypes and Completion Criteria

To prevent premature termination, every agent role must pair its operational scope with checkable, terminal completion criteria:

| Archetype | Execution Model | Toolset Strategy | Checkable Completion Criterion |
|---|---|---|---|
| **Architect** | Foreground (`main: true, sub: false`) | Read/Write specs, Web research, Modals | All 7 spec sections (`## Summary` to `## Rationale`) drafted in `docs/specs/` with user confirmation. |
| **Developer** | Dual (`main: true, sub: true`) | Read/Write workspace code, Sandbox shell, IPC | Local build and type-check commands exit with status `0` and zero compiler warnings on new slice files. |
| **Checker** | Dual (`main: true, sub: true`) | Read-only inspection, Sandbox test execution, IPC | Every numbered `AC-n` in the spec marked **PASS** or **FAIL** with execution proof, and all modified diff files reviewed. |
| **Researcher** | Background (`main: false, sub: true`) | Web search, URL reader, Read-only workspace | Research summary compiled in a dedicated Markdown file citing primary source URLs for every factual claim. |

---

## 6. Pre-Flight Verification Checklist for New Agents

Before deploying a custom agent definition to `.agents/agents/`:

- [ ] **File Location**: Is the file saved directly as `.agents/agents/{name}.md`?
- [ ] **Context Pointer**: Does `description` front-load the leading action and omit persona fluff?
- [ ] **Tool Allowlist**: Are all entries in `tools` valid, spelled correctly, and present in the parent environment?
- [ ] **Execution Mode**: If `subagent: true`, are modal tools (`ask_question`) omitted and IPC tools (`send_message`) present?
- [ ] **Confinement Phrasing**: Are workspace boundaries stated as affirmative targets rather than negative prohibitions?
- [ ] **Sandbox Policy**: Is `commandExecutionPolicy: sandbox` configured for any agent with shell access?
- [ ] **Checkable Exit Gate**: Does the prompt define an explicit, observable completion criterion?

---

## 7. Primary Source Citations

- **Google Antigravity LLMs Index**: [https://antigravity.google/llms.txt](https://antigravity.google/llms.txt) — Global index of machine-readable endpoints and platform architecture.
- **Custom Subagents Specification**: [https://antigravity.google/docs/subagents/](https://antigravity.google/docs/subagents/) — Subagent delegation model, IPC channels, and lifecycle hooks.
- **Antigravity CLI Agent Command Reference**: [https://antigravity.google/docs/cli/commands/agents/](https://antigravity.google/docs/cli/commands/agents/) — Interactive `/agents` manager panel, keyboard bindings, and execution control.
- **Terminal Sandbox Architecture**: [https://antigravity.google/docs/sandbox/](https://antigravity.google/docs/sandbox/) — OS-level execution isolation via `nsjail`, `sandbox-exec`, and `AppContainer`.
- **Antigravity SDK Subagent Guide**: [https://antigravity.google/docs/sdk/subagents/](https://antigravity.google/docs/sdk/subagents/) — Programmatic subagent definitions, tool registration prerequisites, and execution symmetry.
- **Writing for Agents Specification**: [`SKILL.md`](file:///Users/rayhanislamshuvro/Developer/projects/chrome-extensions/.agents/skills/writing-for-agents/SKILL.md) & [`SKILL-MECHANICS.md`](file:///Users/rayhanislamshuvro/Developer/projects/chrome-extensions/.agents/skills/writing-for-agents/SKILL-MECHANICS.md) — Information hierarchy, anti-negation steering, context pointers, and single source of truth.
