# BMAD Usage Guide - Integrated Workflow

After establishing branch protection rules, here's how to use BMAD METHOD for Photo Open Call Analyzer development while maintaining proper git governance.

## Quick Workflow Overview

```
BMAD Planning (PRD + Architecture)
    ↓
Feature Branch Creation (feature/m2-*)
    ↓
Code Implementation + Testing
    ↓
Pull Request + Code Review
    ↓
Merge to Main (via GitHub UI)
    ↓
Milestone Completion + Documentation
```

---

## 1. Using PRD.md for Milestone Planning

**When**: Start of each milestone (M2, M3, M4)  
**Who**: Project Owner + Development Team

### How to Use:

1. **Review Feature Tiers**:
   - Tier 1 (M2 Core): Must-have features for basic functionality
   - Tier 2 (M3 Extended): Advanced features building on M2
   - Tier 3 (M4 Polish): Performance, UX, documentation

2. **Create Feature Branches for Each Requirement**:
   ```bash
   # For PR-2.1 (Resume Analysis)
   git checkout -b feature/m2-resume-analysis
   
   # For PR-2.2 (Multi-Photo Batch)
   git checkout -b feature/m2-batch-processing
   ```

3. **Map Acceptance Criteria**:
   - Use PR description to cite acceptance criteria from PRD.md
   - Example: "Implements PR-2.1 with AC-1.1 (image format support), AC-1.2 (base64 encoding)"

4. **Track Completion**:
   - Update BACKLOG.md when PR is created
   - Mark as "complete" when merged to main

---

## 2. Using architecture.md for Design Decisions

**When**: Before coding, when evaluating technical approaches  
**Who**: Development Team + Tech Lead

### How to Use:

1. **Reference ADRs in Code Comments**:
   ```javascript
   // ADR-001: Use local Ollama (Privacy + Cost > Speed)
   // See _bmad-output/architecture.md#adr-001
   const apiClient = getApiClient(); // Uses http://localhost:11434
   ```

2. **Create Branches for Architectural Work**:
   ```bash
   # For ADR-002 implementation (parallel batch processing)
   git checkout -b feature/m2-parallel-batch-adr002
   ```

3. **Document Trade-offs in PR**:
   - Add link to relevant ADR in PR description
   - Explain how implementation follows architecture
   - Discuss any deviations with reasoning

4. **Validate Against 5-Layer Design**:
   ```
   Layer 5: CLI Entry (src/cli/analyze.js)
   Layer 4: Orchestration (src/processing/batch-processor.js)
   Layer 3: Analysis (src/analysis/photo-analyzer.js)
   Layer 2: LLM Integration (src/utils/api-client.js)
   Layer 1: Reporting (src/output/report-generator.js)
   ```
   - Ensure changes don't violate layer responsibilities
   - Reference layer in PR discussion

---

## 3. Using test-design.md for Quality Gates

**When**: Before declaring a milestone complete  
**Who**: QA + Development Team

### How to Use:

1. **Map Tests to Risk Levels**:
   ```
   P0 (Critical): Ollama connection, image parsing, score parsing
   P1 (High): Batch processing, error handling, report generation
   P2 (Medium): Edge cases, performance, documentation
   ```

2. **Run Tests Before Creating PR**:
   ```bash
   npm test                  # Must pass 100%
   npm run test:watch       # For continuous feedback during development
   ```

3. **Verify Coverage Gates**:
   - M2: ≥80% code coverage
   - M3: ≥85% code coverage
   - M4: ≥90% code coverage
   - Document coverage in PR description

4. **Add New Tests for New Features**:
   - Create feature branch: `feature/m2-new-test`
   - Write tests before implementation (TDD approach)
   - Verify coverage with `npm test`

5. **Risk-Based Release Decisions**:
   - All P0 tests passing → Safe for release
   - P0 + P1 passing → Release with caution
   - Below 80% coverage → Block release

---

## 4. Complete Feature Development Workflow

### Step 1: Plan the Feature

```bash
# Read PRD.md and identify feature (e.g., PR-2.1)
# Read architecture.md to understand technical approach
# Read test-design.md to identify required tests
```

### Step 2: Create Feature Branch

```bash
git checkout -b feature/m2-your-feature-name
# Branch naming: feature/[milestone]-[feature-short-name]
```

### Step 3: Develop & Test

```bash
# Implement code
# Write tests
# Run full suite
npm test

# Fix any failures
npm run format    # Format code
npm run lint      # Check code style
```

### Step 4: Commit with Proper Messages

```bash
# Good commit message (references PRD requirement):
git commit -m "feat(m2): implement resume analysis (PR-2.1)

- Add resume parsing capability
- Support PDF, DOCX, TXT formats
- Include confidence scoring

Implements PR-2.1 from _bmad-output/PRD.md
Tests added: tests/resume-analysis.test.js
Coverage: 87%"

# Bad commits to avoid:
# ❌ "fix"
# ❌ "update"
# ❌ "changes"
# ✅ "feat(m2): implement X (PR-2.1) - Add Y, Support Z"
```

### Step 5: Create Pull Request

```bash
git push origin feature/m2-your-feature-name
# Then create PR on GitHub with:
```

**PR Template**:
```markdown
## Description
Implements PR-2.1 (Resume Analysis) from _bmad-output/PRD.md

## Design Reference
Uses ADR-003 (Dynamic prompt generation) from _bmad-output/architecture.md

## Testing
- Added 5 new tests in tests/resume-analysis.test.js
- All existing tests passing: 10/10 ✅
- Code coverage: 87% (exceeds M2 requirement of 80%)
- Tests mapped to P1 risk level from test-design.md

## Acceptance Criteria
- [x] AC-1.1: Supports PDF, DOCX, TXT formats
- [x] AC-1.2: Returns structured analysis via LLaVA
- [x] AC-1.3: Includes confidence scoring (1-10 scale)

## Changes
- src/analysis/resume-analyzer.js (new file, 150 LOC)
- src/cli/analyze.js (added resume command)
- tests/resume-analysis.test.js (new file, 200 LOC)

## Breaking Changes
None - backward compatible

## Deployment Notes
- Requires LLaVA model with document vision support
- New environment variable: RESUME_CONFIDENCE_THRESHOLD (default: 0.7)
```

### Step 6: Code Review & Iteration

```bash
# Reviewer checks:
# 1. Does implementation match PR requirements?
# 2. Are tests sufficient (≥80% coverage)?
# 3. Does code follow 5-layer architecture?
# 4. Are ADRs respected?
# 5. Do commit messages reference BMAD documents?

# Developer updates based on feedback:
git add .
git commit -m "refactor: improve resume parsing per review comments

- Simplify PDF extraction logic
- Add error handling for corrupted files
- Update tests for edge cases"

git push origin feature/m2-your-feature-name
```

### Step 7: Merge (GitHub UI Only)

```
✅ All checks passing
✅ Code review approved
✅ Tests verified
→ Click "Merge Pull Request" on GitHub (NOT local merge)
→ Automatically closes feature branch
→ Updates BACKLOG.md status to "Complete"
```

---

## 5. BMAD Documents Integration Map

| Document | Purpose | When to Use | Branch Type |
|----------|---------|------------|------------|
| **PRD.md** | Define what to build | Planning phase, feature selection | `feature/m*-*` |
| **architecture.md** | Define how to build | Design phase, before coding | `feature/m*-*` |
| **test-design.md** | Define how to validate | Testing phase, QA gates | `feature/m*-*` |
| **BMAD-USAGE-GUIDE.md** | How to use BMAD | Daily development | Reference, no branch |
| **BMAD-IMPLEMENTATION.md** | What was implemented | Milestone reviews | Reference, no branch |

---

## 6. Branching Strategy by Feature Type

### Feature Implementation
```bash
feature/m2-resume-analysis          # New capability
feature/m3-config-validation        # Extended feature
feature/m4-performance-optimization # Polish work
```

### Bug Fixes
```bash
fix/timeout-handling                # Bug from issue #42
fix/image-format-detection          # Bug in photo parser
```

### Documentation
```bash
docs/api-reference                  # API documentation
docs/test-design                    # Testing guide
docs/deployment                     # Deployment instructions
```

### BMAD Methodology Work
```bash
bmad/prd-architecture               # Initial PRD creation
bmad/test-design                    # Test planning document
bmad/risk-assessment                # Risk analysis
```

---

## 7. Milestone Completion Checklist

**When all features for a milestone are merged:**

- [ ] All PRs merged to main
- [ ] All tests passing (npm test: 100%)
- [ ] Coverage ≥ milestone requirement (80% for M2, 85% for M3, 90% for M4)
- [ ] BACKLOG.md updated with completion status
- [ ] Release notes added to ROADMAP.md
- [ ] All ADRs documented in architecture.md
- [ ] Final test report in test-design.md
- [ ] Create milestone tag: `git tag m2-complete` (after merge, from main)

---

## 8. Common Workflows

### Starting a New Milestone (M2 Example)

```bash
# 1. Update main to latest
git checkout main
git pull origin main

# 2. Read PRD.md for M2 requirements
# 3. Identify first feature (PR-2.1)
# 4. Create feature branch
git checkout -b feature/m2-first-requirement

# 5. Implement, test, commit
# ... (development work)

# 6. Push and create PR
git push origin feature/m2-first-requirement
# Create PR on GitHub with template above

# 7. After approval, merge via GitHub UI
```

### Hotfix During Milestone

```bash
# 1. Create fix branch from main
git checkout main
git pull origin main
git checkout -b fix/critical-bug-description

# 2. Fix, test, commit
# ... (fix work)

# 3. Push and create PR
git push origin fix/critical-bug-description

# 4. After approval, merge via GitHub UI
# 5. Backport to feature branch if needed:
git checkout feature/m2-current-work
git merge fix/critical-bug-description
git push origin feature/m2-current-work
```

### Syncing Feature Branch with Main

```bash
# If main has new commits while you're working
git fetch origin main
git rebase origin/main
# or
git merge origin/main

# Resolve any conflicts, then:
git push origin feature/m2-your-feature-name --force-with-lease
```

---

## 9. Troubleshooting

### "I accidentally committed to main!"

```bash
# Don't push! Undo locally:
git reset --soft HEAD~1
# Creates feature branch and commit locally
git checkout -b feature/m2-recovery
git push origin feature/m2-recovery
# Create PR for recovery branch
```

### "My feature branch is out of sync with main"

```bash
# Update main first
git fetch origin main

# Rebase your work on latest main
git rebase origin/main

# Resolve conflicts and push
git push origin feature/m2-your-feature --force-with-lease
```

### "I need to change my commit message"

```bash
# Last commit only:
git commit --amend -m "new message"
git push origin feature/m2-your-feature --force-with-lease

# Multiple commits:
git rebase -i HEAD~3  # Interactive rebase for 3 commits
```

### "Tests fail locally but pass on GitHub"

```bash
# Ensure clean state:
rm -rf node_modules
npm install
npm test

# Check Node version:
node --version  # Must be 20+

# Check Ollama:
curl http://localhost:11434/api/tags  # Must return llava:7b
```

---

## 10. BMAD + Branch Protection = Scalable Development

**Why branch protection matters for BMAD:**

1. **Enforces Quality Gates**: PRD requirements, architecture compliance, test coverage all checked before merge
2. **Prevents Regressions**: Feature branches isolate work, tests verify no breakage
3. **Enables Parallel Development**: Multiple teams can work on M2/M3/M4 simultaneously
4. **Creates Audit Trail**: PRs document decisions (linked to PRD/ADRs/test-design)
5. **Supports BMAD Agents**: Agents can review PRs, verify architecture, ensure quality

**Result**: Photo Open Call Analyzer scales from single developer to collaborative team while maintaining BMAD governance.

---

## Quick Reference

| Action | Command | Branch | Link |
|--------|---------|--------|------|
| Start M2 feature | `git checkout -b feature/m2-name` | New | PRD.md |
| Design decision | Reference ADR in code | Current | architecture.md |
| Write test | Add to tests/ folder | Current | test-design.md |
| Push for review | `git push origin feature/m2-*` | Current | COPILOT.md |
| Merge feature | GitHub "Merge" button | Feature | BACKLOG.md |
| Complete milestone | `git tag m2-complete` | Main | ROADMAP.md |

---

**See also**: [COPILOT.md](../COPILOT.md#git-workflow--branch-protection) for detailed git workflow.
