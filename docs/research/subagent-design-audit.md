# Research & Audit: Subagent Design Guide vs. Official Antigravity Architecture

**Date**: 2026-09-20  
**Target Document**: [`docs/guides/subagent-design-guide.md`](file:///Users/rayhanislamshuvro/Developer/projects/chrome-extensions/docs/guides/subagent-design-guide.md)  
**Primary Source**: [Google Antigravity Portal & LLMs Index (`https://antigravity.google/llms.txt`)](https://antigravity.google/llms.txt), official docs (`/docs/home`, `/docs/subagents`, `/docs/cli`, `/docs/sandbox`, `/docs/sdk`), and `writing-for-agents` principles.

---

## 1. Executive Summary

This document performs a dual-angle audit of [`docs/guides/subagent-design-guide.md`](file:///Users/rayhanislamshuvro/Developer/projects/chrome-extensions/docs/guides/subagent-design-guide.md):
1. **Antigravity Architectural Alignment**: Validated against primary web sources from `https://antigravity.google/`.
2. **Prompt & Document Engineering Mechanics**: Audited against the `writing-for-agents` standard ([`SKILL.md`](file:///Users/rayhanislamshuvro/Developer/projects/chrome-extensions/.agents/skills/writing-for-agents/SKILL.md) and [`SKILL-MECHANICS.md`](file:///Users/rayhanislamshuvro/Developer/projects/chrome-extensions/.agents/skills/writing-for-agents/SKILL-MECHANICS.md)).

While the guide captures several accurate operational failure modes (tool deadlocks, filesystem wandering, and the single-file directory standard), it contains critical discrepancies with official Antigravity configuration fields and violates core information hierarchy and anti-negation prompt principles.

---

## 2. Primary Web Findings (`https://antigravity.google/`)

| Topic / Feature | Official Antigravity Architecture | Representation in Current Guide | Audit Status |
|---|---|---|---|
| **Location & Discovery** | Stored as `<name>.md` directly in `{workspace}/.agents/agents/` or `~/.gemini/config/agents/` | Stored in `.agents/agents/{name}.md` | ✅ **Verified** |
| **Execution Symmetry** | Agents can declare both `mainAgent: true` and `subagent: true`, allowing seamless standalone or delegated usage | Captured in Dual-mode archetypes | ✅ **Verified** |
| **Subagent Management** | Managed via `/agents` CLI panel, UI manager, and shortcuts (`Alt+J`); supports cancel/kill signals | Mentions background execution, but omits `/agents` panel and kill hooks | ⚠️ **Incomplete** |
| **Tool Delegation Gateway** | Tools are strictly gated via the explicit `tools` allowlist; subagent tools must be registered in the parent agent; unmapped tool names can hang the runner | Emphasizes `disallowedTools` over explicit `tools` allowlist | ⚠️ **Discrepancy** |
| **Frontmatter: `inheritCustomizations`** | Officially supported key: `inheritCustomizations: boolean` to inherit skills, rules, and subagents | Missing completely from the frontmatter spec | ❌ **Missing Core Field** |
| **Command Execution Policies** | Supported policies: `sandbox` (isolated container via nsjail/sandbox-exec), `auto`, `eager`, `off` | Correctly lists all 4 execution policies | ✅ **Verified** |
| **Terminal Sandbox** | Native OS isolation (`nsjail`, `sandbox-exec`, `AppContainer`) isolates the shell process | Confuses prompt-level "Workspace Jail" with OS-level sandbox | ⚠️ **Conceptual Overlap** |

---

## 3. Detailed Audit of `subagent-design-guide.md`

### Discrepancy 1: Missing `inheritCustomizations` in Frontmatter Specification
* **Reference**: [Antigravity Docs: Custom Agents & Changelog](https://antigravity.google)
* **The Gap**: In `subagent-design-guide.md` Section 3, the frontmatter specification lists:
  ```yaml
  name, description, tools, disallowedTools, mainAgent, subagent, model, commandExecutionPolicy
  ```
* **Correction**: Antigravity custom agents support `inheritCustomizations: true | false`. When set to `false`, custom agents start with a clean context, ignoring global/workspace rules and skills unless explicitly mapped. When `true`, they inherit existing workspace rules. This is essential for controlling subagent context load.

### Discrepancy 2: Over-Reliance on `disallowedTools` ("Deny Wins")
* **Reference**: [Antigravity Tool Registry & Validation Guidelines](https://antigravity.google)
* **The Gap**: Section 3 frames `disallowedTools` as the primary defense ("The 'Deny Wins' Principle").
* **Finding**: In Antigravity's runtime gateway, subagent capability is controlled primarily by the **`tools` allowlist**. A subagent only has access to tools explicitly declared in its `tools` array that also exist in the parent agent's registered tools. Unmapped or misspelled tool names in `tools` can cause subagent initialization to hang. The guide should prioritize explicit allowlisting over denylist patching.

### Discrepancy 3: Advocacy for Copy-Paste Boilerplate (Violates Single Source of Truth)
* **Reference**: [`SKILL.md:78-79`](file:///Users/rayhanislamshuvro/Developer/projects/chrome-extensions/.agents/skills/writing-for-agents/SKILL.md#L78-L79)
* **The Flaw**: Section 4 instructs:
  > *"Universal Guardrail Boilerplate: Copy and paste this section into every custom agent definition..."*
* **Impact**: Duplication costs context load on every agent turn and creates a distributed maintenance problem. If a path constraint changes, every agent file must be updated.
* **Fix**: Instead of copy-pasting, centralize shared confinement rules in `.agents/rules/` (which are automatically loaded if `inheritCustomizations: true`), or reference a single shared document.

### Discrepancy 4: The Negation Anti-Pattern (Steering by Prohibition)
* **Reference**: [`SKILL.md:74-75`](file:///Users/rayhanislamshuvro/Developer/projects/chrome-extensions/.agents/skills/writing-for-agents/SKILL.md#L74-L75)
* **The Flaw**: The guardrails in Lessons 1 & 2 and Section 4 are framed almost entirely as negative prohibitions:
  - *"You are strictly forbidden from viewing, searching..."*
  - *"Do not attempt speculative workarounds..."*
  - *"never prompt the user interactively..."*
* **Risk**: Steering by prohibition drags the forbidden behavior (`~/.config`, `~/.gemini/`, `../`) directly into the attention window, making it more salient to the model planner.
* **Fix**: Rephrase with affirmative operational boundaries:
  - *"Confine all filesystem reads, searches, and executions to `./`."*
  - *"When an assigned task requires tools not in your allowlist, immediately halt and emit a blocker via `send_message`."*

### Discrepancy 5: Missing Checkable Completion Criteria & Demand
* **Reference**: [`SKILL.md:47-52`](file:///Users/rayhanislamshuvro/Developer/projects/chrome-extensions/.agents/skills/writing-for-agents/SKILL.md#L47-L52)
* **The Flaw**: In Section 5 (Agent Role Archetypes), the guide outlines primary responsibilities as vague phrases ("spec drafting", "runtime proof", "translating specs") rather than specifying terminal completion bounds.
* **Fix**: Provide clear completion criteria examples for each archetype (e.g., for Checker: *"Every AC in the spec must be explicitly tagged PASS or FAIL with matching test execution evidence"*).

---

## 4. Remediation Checklist for `subagent-design-guide.md`

1. **Update YAML Frontmatter Reference**:
   - Add `inheritCustomizations: boolean (default: true)`.
   - Clarify that `tools` is an explicit allowlist and the primary capability constraint.
   - Note that misspelled tool names in `tools` can cause execution hangs.
2. **Replace Copy-Paste Boilerplate with Shared Rule Architecture**:
   - Recommend creating `.agents/rules/workspace-boundaries.md` rather than copy-pasting 30 lines of boilerplate into every `.md` file.
3. **Rewrite Guardrails to Eliminate Negations**:
   - Transform prohibited behaviors into positive target directives.
4. **Document the Subagent Lifecycle Management Surface**:
   - Document the `/agents` interactive manager, status inspection, and `CancelSubagent` / `send_message` IPC patterns.
5. **Incorporate Completion Criteria & Demand**:
   - Add a dedicated section explaining how completion bounds prevent subagents from terminating prematurely.

---

## 5. Primary Source Citations

- [Google Antigravity LLMs Index (`https://antigravity.google/llms.txt`)](https://antigravity.google/llms.txt)
- [Antigravity Documentation Home (`https://antigravity.google/docs/home/`)](https://antigravity.google/docs/home/)
- [Antigravity Custom Subagents (`https://antigravity.google/docs/subagents/`)](https://antigravity.google/docs/subagents/)
- [Antigravity SDK Subagent Orchestration (`https://antigravity.google/docs/sdk/subagents/`)](https://antigravity.google/docs/sdk/subagents/)
- [Antigravity Sandbox Execution Architecture (`https://antigravity.google/docs/sandbox/`)](https://antigravity.google/docs/sandbox/)
