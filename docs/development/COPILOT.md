# GitHub Copilot Integration Guide

**AI Assistant**: GitHub Copilot (Claude Haiku 4.5)

This file describes how to use GitHub Copilot to develop the Photo Open Call Analyzer.

## Copilot's Role in the Project

Copilot acts as a **lead developer** who implements, tests, debugs, and documents the project according to specifications defined by the multi-role agents in CLAUDE.md.

## Workflow

### 1. Implementation Requests
When you ask Copilot to:
- **Implement a feature** → Reads CLAUDE.md, understands architecture, writes conforming code
- **Analyze the project** → Examines all files, produces accurate analysis
- **Debug** → Uses get_errors, grep_search, read_file to diagnose
- **Test** → Creates test suite, validates, reports results

### 2. Reference Conventions

When communicating with Copilot, you can:

```bash
# Reference markdown files for context
"Based on docs/development/CLAUDE.md..."
"According to docs/development/ROADMAP.md..."
"See docs/guides/QUICKSTART.md for..."

# Reference specific agents
"Art Critic should..."
"Dev needs to implement..."
"QA should test..."

# Reference specific milestones
"For Milestone 2..."
"MVP (M1) requires..."
```

### 3. Common Commands

```bash
# Analyze status
"What is the current project status?"
"Where are we according to the markdown files?"

# Implement
"Implement [feature] for Milestone 2"
"Create the module for [component]"

# Test
"Write tests for [module]"
"Validate the implementation of [feature]"

# Document
"Update the documentation for [aspect]"
"Create a guide for [functionality]"

# Debug
"Why doesn't [command] work?"
"Find the bug in [file]"
```

## Current Stack (Ollama)

Copilot implements for:
- **Backend**: Node.js 20+
- **Vision**: Ollama + LLaVA 7B (local)
- **CLI**: commander.js
- **Testing**: Jest
- **UI**: Terminal (chalk, ora)
- **Reports**: Markdown, JSON, CSV

## Expected Code Structure

Copilot writes code following:

```javascript
// Pattern: ESM modules
import { function } from '../utils/module.js';
export async function analyzePhoto(photo, config) {
  // 1. Input validation
  // 2. Logging
  // 3. Processing
  // 4. Error handling
  // 5. Structured return
}

// Test: Jest with async support
describe('Feature', () => {
  test('case', async () => {
    expect(...).toBe(...);
  });
});
```

## Copilot-Agent Collaboration Conventions

| Agent | Asks Copilot | Copilot Does |
|-------|--------------|---------------|
| **Art Critic** | Evaluate photo by criterion X | Implement score-aggregator |
| **Project Owner** | "When will M2 finish?" | Check ROADMAP, report |
| **Dev** | "Implement feature X" | Create module, test, document |
| **Designer** | "Mockup for UI?" | Not their role (frontend later) |
| **QA** | "Test coverage?" | Create test suite, report results |

## Files to Always Consider

When Copilot executes tasks, it should check:

```
✓ docs/development/CLAUDE.md      → General context, agents
✓ docs/development/ROADMAP.md     → Milestone target, timeline
✓ docs/development/BACKLOG.md     → Priority, task assignment
✓ docs/guides/QUICKSTART.md       → Setup, usage
✓ package.json                    → Current dependencies
✓ src/                            → Code architecture
✓ tests/                          → Test coverage
```

## When to Use Copilot

**PERFECT FOR**:
- ✅ Code implementation
- ✅ Automated tests
- ✅ Debugging issues
- ✅ Refactoring
- ✅ Code documentation
- ✅ Optimizations
- ✅ Code review suggestions

**NOT FOR**:
- ❌ Strategic decisions (ask Project Owner)
- ❌ Aesthetic design (ask Designer)
- ❌ Photo evaluation (ask Art Critic)
- ❌ Business requirements (ask Project Owner)

## Important Guidelines

1. **Always read the markdown files** before implementing
2. **Follow conventions** in existing code (kebab-case files, camelCase functions)
3. **Write tests** together with code
4. **Update docs** after implementation
5. **Ask for clarification** if requirements are ambiguous
6. **Preserve git history** with clear commit messages

## Effective Request Examples

### ❌ Vague
"Add a feature"

### ✅ Specific
"Based on docs/development/ROADMAP.md Milestone 2, implement the config file system for `open-call.json` with schema validation, include tests, update docs/guides/QUICKSTART.md"

---

### ❌ Vague
"Fix the bug"

### ✅ Specific
"The command `npm run analyze` fails with 'ENOENT'. Debug using get_errors and grep_search, identify root cause, propose fix with tests."

---

### ❌ Vague
"Test the code"

### ✅ Specific
"Write unit tests for `src/analysis/photo-analyzer.js` with error path coverage, mock Ollama client, include 5+ test cases."

## Expected Status Reports

When completing tasks, Copilot should always:

```
✅ TASK COMPLETED

What: [Brief description]
Files: [Modified/created files]
Tests: [N tests, all passing]
Docs: [Documentation updates]
Notes: [Important considerations]
Next: [Suggested next step]
```

## Git Workflow & Branch Protection

**CRITICAL RULE**: Direct commits to `main` branch are NOT permitted.

**All changes must follow the feature branch workflow:**

### Step-by-Step Workflow

#### 1. Create Feature Branch
```bash
git checkout main
git pull origin main
git checkout -b feature/m2-config-templates
```

**Branch naming**:
- `feature/m2-config-templates` (new features)
- `fix/timeout-handling` (bug fixes)
- `docs/test-design` (documentation)
- `bmad/prd-architecture` (BMAD implementation)

#### 2. Make Changes & Test
```bash
# Edit files, implement feature
npm test              # Ensure all tests pass
```

#### 3. Commit with Proper Message
```bash
git commit -m "feat(config): add open-call.json templates

Creates 3 example templates for photo competitions.
Includes validation and documentation.

Relates-to: docs/development/ROADMAP.md Milestone 2"
```

**Format**:
```
type(scope): brief description

Optional longer explanation.
Relates-to: docs/development/ROADMAP.md Milestone X
Fixes: #123 (if applicable)
```

#### 4. Push & Create Pull Request
```bash
git push origin feature/m2-config-templates

# Create PR using body-file method (REQUIRED - avoids line break issues)
# 1. Create PR description file
cat > .pr-body.txt << 'EOF'
## Summary
Brief description of changes

## Implementation
- Key changes made
- Files affected

## Testing
- Test results
- Coverage metrics

## Related
- Links to docs/development/ROADMAP.md or issues
EOF

# 2. Create PR with body-file
gh pr create --base main --head feature/m2-config-templates \
  --title "feat(config): add open-call.json templates" \
  --body-file .pr-body.txt

# 3. Clean up
rm .pr-body.txt
```

**IMPORTANT**: Always use `--body-file` instead of `--body` to avoid shell quoting and line break issues with complex PR descriptions.

#### 5. Merge with Admin Bypass
```bash
# Solo development: use --admin to bypass approval requirement
gh pr merge <PR_NUMBER> --merge --admin
```
- Do NOT merge locally to main
- Delete branch after merge (automatic with `--delete-branch` or via GitHub)
- Update BACKLOG.md status

> **Note**: Since GitHub does not allow a PR author to approve their own PR, we use `--admin` to bypass the approval requirement while keeping the PR-based workflow for traceability.

### GitHub Integration

When working with Git:
- Read [BACKLOG.md](BACKLOG.md) for task assignment
- Create branch: `feature/m2-config-validation`
- Commit message: `feat(scope): description` with [ROADMAP.md](ROADMAP.md) reference
- Pull request required for all changes (no direct main commits)
- All tests must pass (\u226580% coverage) before merge
- See above for detailed step-by-step workflow

## Language Guidelines

**IMPORTANT**: All documentation and code comments MUST be in English only.

- ✅ **DO**: Write all documentation in English
- ✅ **DO**: Write all inline code comments in English
- ✅ **DO**: Use English for commit messages
- ✅ **DO**: Use English for issue descriptions and PR titles
- ❌ **DON'T**: Use Italian or any other language in documentation
- ❌ **DON'T**: Use Italian in code comments
- ❌ **DON'T**: Use Italian in variable/function names
- ❌ **DON'T**: Use Italian in git commit messages

This is a code collaboration document written in English, and all future work must follow this standard.

---

**This file is the "operating manual" for collaborating with Copilot on this project.**

Update it if processes, tools, or conventions change.

Last Updated: 2026-01-28
Status: Active ✅
