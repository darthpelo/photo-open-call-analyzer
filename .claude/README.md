# Agent System Index - Photo Open Call Analyzer

**Audience**: Development team, Copilot users  
**Purpose**: Central reference for available agents and their capabilities  
**Prerequisites**: Understanding of BMAD methodology (see [BMAD-USAGE-GUIDE.md](../BMAD-USAGE-GUIDE.md))

---

## Overview

This project uses a **5-agent system** for structured, role-based development. Each agent specializes in different aspects of the project and can be invoked independently or collaboratively.

**Agent Communication**: Agents share context via this index and documented workflows in [../CLAUDE.md](../CLAUDE.md).

---

## Available Agents

### 1. 🏗️ Architect (architecture-focused)
**File**: [architecture.md](architecture.md)  
**Role**: Design technical solutions, evaluate architectural decisions, manage tech debt  
**Expertise**: System design, ADRs, performance optimization, scalability

**When to Invoke**:
- Design new features or subsystems
- Evaluate architectural trade-offs
- Review/update ADRs (Architecture Decision Records)
- Assess technical debt
- Plan infrastructure changes

**Key Responsibilities**:
- Maintains [../_bmad-output/architecture.md](../_bmad-output/architecture.md)
- Proposes and documents ADRs
- Ensures consistency with 5-layer architecture
- Reviews PRs for architectural impact

**Example Usage**:
```
"@Architect: Review proposed caching architecture for FR-2.3. 
Compare localStorage vs. Redis vs. file-based approaches."
```

---

### 2. 👨‍💼 Project Owner (strategy, roadmap, priorities)
**File**: [project-owner.md](project-owner.md)  
**Role**: Manage roadmap, priorities, scope, stakeholder communication  
**Expertise**: Feature prioritization, milestone planning, risk management, stakeholder alignment

**When to Invoke**:
- Define priorities between competing features
- Scope new milestones
- Make go/no-go decisions
- Update roadmap with status
- Communicate progress to stakeholders
- Manage scope creep

**Key Responsibilities**:
- Maintains [../ROADMAP.md](../ROADMAP.md) and [../BACKLOG.md](../BACKLOG.md)
- Creates/updates [../_bmad-output/PRD.md](../_bmad-output/PRD.md)
- Monitors branch protection compliance
- Approves feature scope changes
- Manages milestone milestones

**Example Usage**:
```
"@Project Owner: Which should we prioritize next - FR-2.2 (resume analysis) 
or FR-2.3 (edge case robustness)? What are the dependencies?"
```

---

### 3. 🧪 QA Lead (testing, quality, validation)
**File**: [qa.md](qa.md)  
**Role**: Design tests, validate requirements, catch regressions, ensure quality gates  
**Expertise**: Test strategy, edge cases, risk analysis, coverage goals

**When to Invoke**:
- Design test strategy for new features
- Review test coverage
- Identify edge cases
- Validate PR quality before merge
- Update test-design documentation
- Establish quality metrics

**Key Responsibilities**:
- Maintains [../_bmad-output/test-design.md](../_bmad-output/test-design.md)
- Defines coverage goals (≥80% M2, ≥85% M3, ≥90% M4)
- Reviews PR test coverage
- Identifies gaps in testing
- Enforces quality gates

**Example Usage**:
```
"@QA: What test cases should we add for edge case handling in FR-2.3?
 Focus on corrupt photos, timeout handling, and parallel processing failures."
```

---

### 4. 🎨 Art Critic (UX/design, user-centric thinking)
**File**: [art-critic.md](art-critic.md)  
**Role**: Ensure user experience quality, validate requirements from user perspective  
**Expertise**: User experience, design consistency, usability, accessibility

**When to Invoke**:
- Review features for user experience
- Evaluate configuration/prompt quality
- Suggest UX improvements
- Design user-facing messages/reports
- Validate that features meet user needs
- Review report generation logic

**Key Responsibilities**:
- Validates features from photographer perspective
- Reviews prompt generation and analysis quality
- Ensures configuration is intuitive
- Provides feedback on user-facing copy
- Contributes to design specifications (Milestone 3)

**Example Usage**:
```
"@Art Critic: Review the configuration template examples. 
Are they realistic for photographers? Clear instructions?"
```

---

### 5. ⚙️ Dev (implementation, code quality, technical details)
**File**: [dev.md](dev.md)  
**Role**: Implement features, write tests, code reviews, technical problem-solving  
**Expertise**: Node.js, Ollama integration, testing frameworks, code quality

**When to Invoke**:
- Implement feature stories
- Debug technical issues
- Review/optimize code
- Refactor for maintainability
- Suggest implementation approaches
- Help with testing setup

**Key Responsibilities**:
- Implements features from PRD
- Writes tests (unit, integration)
- Maintains code quality (eslint, formatting)
- Reviews PRs for code quality
- Updates [../QUICKSTART.md](../QUICKSTART.md) with setup changes
- Manages dependencies

**Example Usage**:
```
"@Dev: Implement FR-2.1 (Configuration Template System). 
Use the PRD for acceptance criteria. Create feature/m2-config-templates branch."
```

---

## Workflow Examples

### Single-Agent Workflow: Implementing a Feature
```
1. @Dev: Review PRD for feature spec
2. @Dev: Create feature branch (feature/m2-xxx)
3. @Dev: Implement code + tests
4. @QA: Review test coverage and edge cases
5. @Dev: Address feedback, push PR
6. @Art Critic: Review UX aspects
7. Merge: `gh pr merge <number> --merge --admin`
```

### Multi-Agent Workflow: Designing New Architecture
```
1. @Project Owner: Define scope and requirements
2. @Architect: Design 2-3 approaches, pros/cons
3. @QA: Identify testing implications
4. @Dev: Estimate implementation effort
5. @Project Owner: Make final decision
6. @Architect: Document ADR
7. @Dev: Implement according to design
```

### Escalation Workflow: Feature Disagreement
```
1. @Dev: Proposes implementation approach
2. @Architect: Has concerns about design
3. @Project Owner: Arbitrates trade-offs
4. @Dev: Implements approved approach
5. @QA: Validates test coverage
```

---

## Agent Collaboration Patterns

### Parallel Work
Agents can work independently on different aspects:
- **Dev** implements code while **QA** writes tests
- **Architect** designs next feature while **Dev** implements current one
- **Art Critic** reviews UX while **Project Owner** manages timeline

### Sequential Dependencies
Some tasks require sequence:
1. **Project Owner** → defines scope (PRD)
2. **Architect** → designs solution
3. **QA** → designs tests
4. **Dev** → implements (code + tests)
5. Merge to main: `gh pr merge <number> --merge --admin`

### Decision-Making
- **Architecture**: Architect proposes, Project Owner approves
- **Scope**: Project Owner decides, others input technical constraints
- **Quality**: QA defines gates, Dev ensures they're met
- **User Experience**: Art Critic validates, Dev implements
- **Timeline**: Project Owner sets, others estimate effort

---

## Communication Protocols

### How to Invoke an Agent

**In conversation**:
```
"@AgentName: [detailed task description with context]"
```

**Via command** (if using gh CLI or automation):
```bash
gh issue comment [issue] --body "@AgentName: [task]"
```

### Expected Response Time
- Synchronous: Agents respond in real-time during conversation
- Asynchronous: Use GitHub issues/PRs with agent mentions
- Escalation: Use @Project Owner for cross-team decisions

### Context Sharing
Agents automatically have access to:
- This index file ([.claude/README.md](.claude/README.md))
- Main documentation ([../DOCUMENTATION.md](../DOCUMENTATION.md))
- PRD and architecture docs
- Project code and tests
- CLAUDE.md for background

---

## Priority & Availability

### Always Available
- During working hours: All agents active
- In PRs/issues: Mention agent by name (@Agent)
- In conversations: Address directly

### Current Priorities (M2 Phase)
1. **@Dev**: FR-2.1 (Configuration Templates) - DONE
2. **@QA**: Edge case testing for FR-2.1
3. **@Architect**: Design for FR-2.2 (Resume Analysis)
4. **@Project Owner**: Plan FR-2.3 scope
5. **@Art Critic**: Review config templates UX

### Vacation/Unavailable
Check agent files for current availability status.

---

## Key Workflows by Agent

### Architect Workflow
```
Review requirements
    ↓
Propose architecture options
    ↓
Document trade-offs
    ↓
Create/update ADR
    ↓
Get Project Owner approval
    ↓
Document for Dev
```

### Project Owner Workflow
```
Define requirements (PRD)
    ↓
Break into milestones
    ↓
Create backlog items (FR-x.x)
    ↓
Prioritize and assign
    ↓
Monitor progress
    ↓
Update roadmap
```

### QA Workflow
```
Read PRD and architecture
    ↓
Identify test scenarios
    ↓
Design test strategy
    ↓
Create acceptance criteria
    ↓
Review PR test coverage
    ↓
Approve/request changes
```

### Dev Workflow
```
Get story from Project Owner
    ↓
Review PRD + architecture
    ↓
Create feature branch
    ↓
Implement code + tests
    ↓
Push PR with test report
    ↓
Address code review feedback
    ↓
Merge: `gh pr merge <number> --merge --admin`
```

### Art Critic Workflow
```
Review user-facing features
    ↓
Evaluate UX clarity
    ↓
Check alignment with goals
    ↓
Provide feedback
    ↓
Iterate with team
```

---

## Integration with Git Workflow

All agents respect **branch protection rules**:
- ✅ Create feature branches: `feature/[milestone]-[name]`
- ✅ Create pull requests
- ✅ Merge with admin bypass: `gh pr merge <number> --merge --admin`
- ❌ Direct commits to main (not permitted)
- ❌ Merge without PR (not permitted)

> **Solo development note**: Since GitHub does not allow a PR author to approve their own PR, `--admin` bypasses the approval requirement while keeping the PR-based workflow.

See [../COPILOT.md](../COPILOT.md) for complete git workflow.

---

## Documentation Maintenance

Each agent file includes:
- **Role & Expertise**: What they focus on
- **Responsibilities**: What they own
- **When to Invoke**: When to call them
- **Key Documents**: What they maintain
- **Workflows**: How they work

Update agent files when:
- Role changes
- New responsibilities added
- Availability changes
- Process improvements

---

## Searching for an Agent

**Looking for help with...**

- **Technical architecture** → @Architect
- **Feature scope/priority** → @Project Owner
- **Test strategy/quality** → @QA
- **User experience/design** → @Art Critic
- **Code implementation/debugging** → @Dev
- **Cross-team decision** → @Project Owner (escalation)

---

## Multi-Agent Sessions

For complex work involving multiple agents:

1. **Preparation**: Ensure all agents have context
2. **Parallel Phase**: Agents work independently
3. **Sync Phase**: Share findings and decisions
4. **Implementation Phase**: Dev implements agreed approach
5. **Validation Phase**: QA/Art Critic review results

Example complex session:
```
Scenario: Design Milestone 3 (Web UI)

Phase 1 (Parallel):
  - @Project Owner: Define UI requirements and timeline
  - @Architect: Research UI framework options
  - @Art Critic: Create design wireframes
  - @QA: Plan UI testing strategy

Phase 2 (Sync):
  - Review findings
  - Make framework decision
  - Finalize scope

Phase 3 (Implementation):
  - @Dev: Implement based on agreed design
  - @QA: Write UI tests
  - @Art Critic: Validate UX matches designs

Phase 4 (Merge):
  - PR review
  - Address feedback
  - Merge: `gh pr merge <number> --merge --admin`
```

---

## Contact & Updates

**To request a new agent**: Create issue with @Project Owner  
**To report issues**: Create GitHub issue with relevant agent mention  
**To update this index**: Edit [.claude/README.md](.claude/README.md) via PR  

---

## Related Documentation

- [../CLAUDE.md](../CLAUDE.md) - Multi-agent system overview
- [../COPILOT.md](../COPILOT.md) - Git workflow and contribution guide
- [../BMAD-USAGE-GUIDE.md](../BMAD-USAGE-GUIDE.md) - BMAD methodology
- [../DOCUMENTATION.md](../DOCUMENTATION.md) - Full documentation index

**Version**: M2 Phase  
**Last Updated**: January 2026  
**Maintained By**: Development Team
