# Documentation Index - Photo Open Call Analyzer

**Audience**: All users (photographers, developers, project managers)  
**Purpose**: Central navigation guide for all project documentation  
**Last Updated**: January 2026

---

## Quick Navigation by Role

### 📸 For Photographers (End Users)
Looking to analyze your photo submissions against competition criteria?

1. **[START_HERE.md](START_HERE.md)** - Project overview and quick start (read first!)
2. **[QUICKSTART.md](QUICKSTART.md)** - Step-by-step setup and first analysis
3. **[CONFIG.md](CONFIG.md)** - Configuration reference and templates
4. **[README.md](README.md)** - Full project description

**Typical Journey**: START_HERE → QUICKSTART → Create open-call.json (using CONFIG.md) → Run analysis

---

### 💻 For Developers (Contributing Code)
Want to contribute features, fix bugs, or extend the system?

**Essential Reading** (in order):
1. **[QUICKSTART.md](QUICKSTART.md)** - Setup development environment
2. **[COPILOT.md](COPILOT.md)** - Git workflow and branch protection rules
3. **[_bmad-output/PRD.md](_bmad-output/PRD.md)** - Product requirements and feature specs
4. **[_bmad-output/architecture.md](_bmad-output/architecture.md)** - Technical architecture and ADRs
5. **[_bmad-output/test-design.md](_bmad-output/test-design.md)** - Testing strategy and coverage requirements

**Reference**:
- [BACKLOG.md](BACKLOG.md) - Current task assignments and priorities
- [.claude/README.md](.claude/README.md) - Multi-agent development system

**Code Navigation**:
- Core analysis: [src/analysis/](src/analysis/)
- Batch processing: [src/processing/](src/processing/)
- Reporting: [src/output/](src/output/)
- CLI interface: [src/cli/](src/cli/)
- Utilities: [src/utils/](src/utils/)

**Typical Journey**: QUICKSTART → COPILOT.md (git setup) → PRD → architecture → Pick a feature → Create feature branch → Code → Tests → PR

---

### 🎨 For Designers (UI/UX)
Creating visual interfaces and user experience improvements?

1. **[START_HERE.md](START_HERE.md)** - Understand the problem being solved
2. **[_bmad-output/PRD.md](_bmad-output/PRD.md)** - User needs and feature requirements (Milestone 3 section)
3. **[IMPLEMENTATION_SUMMARY.md](IMPLEMENTATION_SUMMARY.md)** - Current system capabilities
4. **[COPILOT.md](COPILOT.md)** - Git workflow for contributing UI code

**Focus Areas**:
- Milestone 3: Web UI & Visualization (see PRD)
- Report visualization improvements
- User interface for configuration

**Typical Journey**: START_HERE → PRD → Create design mockups → Create branch → Implement → PR

---

### ✅ For QA / Testing
Ensuring quality, writing tests, and validating features?

1. **[_bmad-output/test-design.md](_bmad-output/test-design.md)** - Complete testing strategy
2. **[COPILOT.md](COPILOT.md)** - Git workflow and PR process
3. **[_bmad-output/PRD.md](_bmad-output/PRD.md)** - Feature requirements to validate
4. **[BACKLOG.md](BACKLOG.md)** - Current testing tasks

**Test Locations**:
- Unit tests: [tests/](tests/)
- Integration tests: Check `.test.js` files
- Manual test data: [data/open-calls/](data/open-calls/)

**Typical Journey**: test-design.md → PRD → COPILOT.md (create branch) → Write/run tests → PR

---

### 👨‍💼 For Project Managers / Stakeholders
Need status updates, roadmap, and priority information?

1. **[ROADMAP.md](ROADMAP.md)** - Milestone timeline and deliverables
2. **[BACKLOG.md](BACKLOG.md)** - Current priorities and task assignments
3. **[_bmad-output/PRD.md](_bmad-output/PRD.md)** - Feature scope and acceptance criteria
4. **[IMPLEMENTATION_SUMMARY.md](IMPLEMENTATION_SUMMARY.md)** - MVP completion status

**Key Metrics**:
- Milestone 1: ✅ Complete
- Milestone 2: 🟡 In Progress (FR-2.1 done, FR-2.2/2.3/2.4 pending)
- Milestone 3: ⚪ Planned
- Milestone 4: ⚪ Planned

**Typical Journey**: ROADMAP → BACKLOG → PRD (for details) → Follow-up with Dev team

---

## Documentation by Category

### 🚀 Getting Started
- [START_HERE.md](START_HERE.md) - First read for new users
- [QUICKSTART.md](QUICKSTART.md) - Installation and first run
- [README.md](README.md) - Full project description
- [CONFIG.md](CONFIG.md) - Configuration reference

### 🏗️ Architecture & Design
- [_bmad-output/architecture.md](_bmad-output/architecture.md) - Technical architecture with 7 ADRs
- [_bmad-output/PRD.md](_bmad-output/PRD.md) - Product requirements document
- [_bmad-output/test-design.md](_bmad-output/test-design.md) - Risk-based testing strategy

### 📋 Planning & Progress
- [ROADMAP.md](ROADMAP.md) - Milestone timeline (M1-M4)
- [BACKLOG.md](BACKLOG.md) - Task assignments and priorities
- [IMPLEMENTATION_SUMMARY.md](IMPLEMENTATION_SUMMARY.md) - MVP status summary

### ⚙️ Development Workflow
- [COPILOT.md](COPILOT.md) - Git workflow, branch protection, PR process
- [CLAUDE.md](CLAUDE.md) - Multi-agent development system overview
- [BMAD-USAGE-GUIDE.md](BMAD-USAGE-GUIDE.md) - How to use BMAD for project development
- [.claude/README.md](.claude/README.md) - Agent system index and availability

### 📊 Implementation Details
- [GOVERNANCE-IMPLEMENTATION.md](GOVERNANCE-IMPLEMENTATION.md) - Branch protection and governance setup
- [BMAD-IMPLEMENTATION.md](BMAD-IMPLEMENTATION.md) - BMAD integration implementation summary

---

## Documentation Dependency Map

```
START_HERE (entry point)
    ├── QUICKSTART (setup)
    │   ├── COPILOT.md (git workflow) ← Essential for developers
    │   └── CONFIG.md (user config)
    │
    ├── _bmad-output/PRD.md (what to build)
    │   ├── _bmad-output/architecture.md (how to build it)
    │   │   └── _bmad-output/test-design.md (how to verify it)
    │   │
    │   └── BACKLOG.md (task breakdown)
    │
    ├── ROADMAP.md (timeline)
    └── IMPLEMENTATION_SUMMARY.md (current status)

CLAUDE.md (agents) → .claude/README.md (agent index)
                   → BMAD-USAGE-GUIDE.md (methodology)
```

---

## File Descriptions

| File | Purpose | Read Time | Audience |
|------|---------|-----------|----------|
| [START_HERE.md](START_HERE.md) | Entry point with project overview | 10 min | Everyone |
| [README.md](README.md) | Comprehensive project description | 20 min | Everyone |
| [QUICKSTART.md](QUICKSTART.md) | Setup and first analysis guide | 15 min | Developers, Photographers |
| [CONFIG.md](CONFIG.md) | Configuration templates and reference | 20 min | Users, Developers |
| [ROADMAP.md](ROADMAP.md) | Milestone timeline and deliverables | 10 min | PMs, Stakeholders |
| [BACKLOG.md](BACKLOG.md) | Task list and assignments | 10 min | Developers, PMs |
| [COPILOT.md](COPILOT.md) | Git workflow and contribution guide | 25 min | Developers |
| [CLAUDE.md](CLAUDE.md) | Multi-agent system overview | 15 min | All (for context) |
| [_bmad-output/PRD.md](_bmad-output/PRD.md) | Product requirements (M1-M4) | 45 min | Developers, Designers, PMs |
| [_bmad-output/architecture.md](_bmad-output/architecture.md) | Technical design and decisions | 35 min | Developers, Architects |
| [_bmad-output/test-design.md](_bmad-output/test-design.md) | Testing strategy and test cases | 40 min | QA, Developers |
| [BMAD-USAGE-GUIDE.md](BMAD-USAGE-GUIDE.md) | How to use BMAD methodology | 30 min | All (methodology reference) |
| [BMAD-IMPLEMENTATION.md](BMAD-IMPLEMENTATION.md) | BMAD implementation summary | 15 min | PMs, Architects |
| [GOVERNANCE-IMPLEMENTATION.md](GOVERNANCE-IMPLEMENTATION.md) | Branch protection and governance | 10 min | Team leads |
| [IMPLEMENTATION_SUMMARY.md](IMPLEMENTATION_SUMMARY.md) | MVP completion status | 15 min | Everyone (status check) |
| [.claude/README.md](.claude/README.md) | Agent system index | 10 min | All (when using agents) |

---

## Key Concepts

### BMAD METHOD
This project uses **BMAD (Build-Measure-Analyze-Decide)** for structured development. See [BMAD-USAGE-GUIDE.md](BMAD-USAGE-GUIDE.md) for details.

**4-Phase Development Cycle**:
1. **PRD** - Product requirements
2. **Architecture** - Technical design with ADRs
3. **Test Design** - Risk-based testing strategy
4. **Implementation** - Code + tests + documentation

### Git Workflow
**Branch Protection**: Direct commits to `main` are NOT permitted.
- All work: `feature/[milestone]-[name]` branches
- All changes: Pull request review required
- Merge: GitHub UI only

See [COPILOT.md](COPILOT.md) for complete workflow.

### Milestone Structure

| Milestone | Status | Focus |
|-----------|--------|-------|
| M1: MVP | ✅ Complete | Ollama integration, batch processing, reporting |
| M2: Configuration & Robustness | 🟡 In Progress | Templates, edge cases, state persistence |
| M3: Web UI | ⚪ Planned | Dashboard, visualization, comparison tools |
| M4: Optimization | ⚪ Planned | Caching, performance, alternative models |

---

## Searching for Information

**Looking for...**
- Setup instructions? → [QUICKSTART.md](QUICKSTART.md)
- Feature requirements? → [_bmad-output/PRD.md](_bmad-output/PRD.md)
- Git workflow? → [COPILOT.md](COPILOT.md)
- Testing strategy? → [_bmad-output/test-design.md](_bmad-output/test-design.md)
- Architecture decisions? → [_bmad-output/architecture.md](_bmad-output/architecture.md)
- Task assignments? → [BACKLOG.md](BACKLOG.md)
- Timeline? → [ROADMAP.md](ROADMAP.md)
- Configuration options? → [CONFIG.md](CONFIG.md)
- Current status? → [IMPLEMENTATION_SUMMARY.md](IMPLEMENTATION_SUMMARY.md)
- Agent availability? → [.claude/README.md](.claude/README.md)

---

## Documentation Standards

All documentation follows these standards:

- **Language**: English only
- **Format**: Markdown
- **Headers**: Each file has Audience/Purpose/Prerequisites
- **Links**: Relative paths using markdown syntax
- **Structure**: Hierarchical with clear navigation

See [COPILOT.md](COPILOT.md#language-guidelines) for language policy details.

---

## Contributing to Documentation

To add or update documentation:

1. Follow [COPILOT.md](COPILOT.md) git workflow
2. Use English for all content
3. Add file to appropriate section in this index
4. Include Audience/Purpose/Prerequisites headers
5. Create PR for review

---

## Version Information

**Current Version**: Phase 5 (Documentation Consolidation)  
**Last Updated**: January 2026  
**Maintained By**: Development Team

For multi-agent collaboration details, see [.claude/README.md](.claude/README.md).
