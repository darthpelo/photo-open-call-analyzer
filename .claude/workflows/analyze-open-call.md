# Workflow: Analyze Open Call

This workflow guides the entire photo open call analysis process, from metadata collection to final ranking generation.

## Overview

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│  1. SETUP       │ --> │  2. ANALYSIS    │ --> │  3. RANKING     │
│  Project Owner  │     │  Art Critic     │     │  Art Critic     │
│  + Art Critic   │     │  + Dev          │     │  + Dev          │
└─────────────────┘     └─────────────────┘     └─────────────────┘
        │                       │                       │
        v                       v                       v
   project-brief.md      photo-scores.json      final-ranking.md
```

## Phase 1: Setup (Project Owner + Art Critic)

### Step 1.1: Initialize Project
**Owner**: Project Owner
**Command**: `[NP] New Project`

```
Input:
- Open call name
- URL (if available)
- Deadline
- Number of photos to analyze

Output:
- data/open-calls/{name}/project-brief.md
```

### Step 1.2: Collect Open Call Metadata
**Owner**: Art Critic
**Command**: `[AO] Analyze Open Call`

```
Input (to collect):
- Complete theme and description
- Who are the jurors
- Previous edition winners (if available)
- Organizer and prize type

Output:
- data/open-calls/{name}/open-call-analysis.md
```

### Step 1.3: Generate Analysis Prompt
**Owner**: Art Critic
**Command**: `[GP] Generate Prompt`

```
Input:
- Open call analysis (step 1.2)

Output:
- data/open-calls/{name}/photo-analysis-prompt.md
```

## Phase 2: Analysis (Dev + Art Critic)

### Step 2.1: Technical Setup
**Owner**: Dev
**Command**: `[API] Setup API`

```
Prerequisites:
- ANTHROPIC_API_KEY configured
- Dependencies installed (npm install)

Verification:
- Working API connection
- Vision model available
```

### Step 2.2: Upload Photos
**Owner**: Dev

```
Input:
- Photo folder path: data/open-calls/{name}/photos/

Validation:
- Supported formats (jpg, png, webp)
- Acceptable dimensions
- No corrupted files
```

### Step 2.3: Analyze Photos
**Owner**: Dev
**Command**: `[IM] Implement` (if not already implemented)

```
For each photo:
1. Load image
2. Send to Claude Vision with prompt from step 1.3
3. Parse JSON response
4. Save scores and feedback

Output:
- data/open-calls/{name}/scores/{filename}.json
```

### Step 2.4: QA Check
**Owner**: QA
**Command**: `[RT] Run Tests`

```
Verification:
- All photos processed
- Scores in valid range (1-10)
- No silent errors
- Feedback consistent with scores
```

## Phase 3: Ranking (Art Critic + Dev)

### Step 3.1: Aggregate Results
**Owner**: Dev

```
Input:
- All scores/*.json files

Output:
- data/open-calls/{name}/aggregated-scores.json
```

### Step 3.2: Generate Ranking
**Owner**: Art Critic
**Command**: `[CR] Create Ranking`

```
Input:
- aggregated-scores.json
- Number of photos to select for submission

Output:
- data/open-calls/{name}/final-ranking.md
```

### Step 3.3: Export Report
**Owner**: Dev

```
Available formats:
- Markdown (default)
- JSON
- CSV

Output (FR-3.12: timestamped results):
- data/open-calls/{name}/results/{timestamp}/report.{format}
- data/open-calls/{name}/results/latest -> {timestamp} (symlink)
```

## Final File Structure

```
data/open-calls/{call-name}/
├── project-brief.md           # Initial setup
├── open-call-analysis.md      # Art Critic analysis
├── photo-analysis-prompt.md   # Prompt for Claude Vision
├── photos/                    # Photos to analyze
│   ├── photo1.jpg
│   ├── photo2.jpg
│   └── ...
├── scores/                    # Individual scores
│   ├── photo1.json
│   ├── photo2.json
│   └── ...
├── aggregated-scores.json     # Aggregated scores
├── final-ranking.md           # Final ranking
└── results/                   # Timestamped results (FR-3.12)
    ├── 2026-02-08T14-30-45/   # Each analysis run
    │   ├── batch-results.json
    │   ├── photo-analysis.md
    │   ├── photo-analysis.json
    │   └── photo-analysis.csv
    └── latest -> 2026-02-08T14-30-45  # Symlink to most recent
```

## Complete Checklist

### Setup
- [ ] Project initialized (Project Owner)
- [ ] Open call metadata collected (Art Critic)
- [ ] Analysis prompt generated (Art Critic)
- [ ] API configured (Dev)
- [ ] Photos uploaded to correct folder

### Analysis
- [ ] All photos validated
- [ ] Analysis completed without errors
- [ ] Scores saved correctly
- [ ] QA check passed

### Ranking
- [ ] Results aggregated
- [ ] Ranking generated
- [ ] Report exported
- [ ] Final review completed

## Quick Commands

```bash
# Start new project
claude "Use project-owner to start a new project for open call X"

# Analyze open call
claude "Use art-critic to analyze this open call: [details]"

# Process photos
claude "Use dev to analyze photos in data/open-calls/X/photos/"

# Generate ranking
claude "Use art-critic to generate final ranking"
```

## Troubleshooting

### Error: API Timeout
- Increase timeout in config
- Reduce concurrency
- Retry failed photos individually

### Error: Inconsistent Scores
- Verify analysis prompt with Art Critic
- Check if criterion is ambiguous
- Regenerate prompt if necessary

### Error: Photo Not Processed
- Verify supported format
- Check file size
- Validate that image is not corrupted
