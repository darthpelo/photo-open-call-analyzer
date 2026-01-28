# Configuration Guide

Photo Open Call Analyzer uses a JSON configuration file to define competition details for photo analysis. This guide explains how to create and validate your configuration.

## Quick Start

1. Create a project directory:
   ```bash
   mkdir -p data/open-calls/my-competition/photos
   ```

2. Create `data/open-calls/my-competition/open-call.json`:
   ```json
   {
     "title": "My Photography Competition",
     "theme": "Photography theme or subject focus",
     "jury": ["Photographer 1", "Photographer 2"],
     "pastWinners": "Description of what past winners had in common..."
   }
   ```

3. Validate your configuration:
   ```bash
   npm run analyze validate data/open-calls/my-competition/ --config
   ```

## Configuration Schema

Your `open-call.json` must follow this structure:

### Required Fields

| Field | Type | Description | Example |
|-------|------|-------------|---------|
| `title` | String | Competition name | `"Sony World Photography Awards 2025"` |
| `theme` | String | Photography theme or subject | `"Landscape and nature photography"` |
| `jury` | Array[String] | List of jury members (min 1) | `["Annie Leibovitz", "Paolo Roversi"]` |
| `pastWinners` | String | Description of past winning photos | `"Winners featured strong compositions with excellent lighting"` |

### Optional Fields

| Field | Type | Description |
|-------|------|-------------|
| `context` | String | Additional context for evaluation (e.g., mission, focus areas) |
| `customCriteria` | Array[Object] | Custom evaluation criteria (see below) |

### Custom Criteria (Optional)

You can define custom evaluation criteria:

```json
{
  "customCriteria": [
    {
      "name": "Criterion Name",
      "description": "What this criterion measures",
      "weight": 25
    }
  ]
}
```

**Fields:**
- `name`: Criterion title (2-50 characters)
- `description`: How this criterion is evaluated (optional, 5-500 characters)
- `weight`: Relative importance (1-100, will be auto-normalized)

## Validation Rules

### Field Length Requirements

- **title**: 3-200 characters minimum
- **theme**: 5-1000 characters minimum
- **jury**: At least 1 member, maximum 50
- **pastWinners**: 10-2000 characters minimum
- **customCriteria**: Maximum 10 criteria

### Type Validation

- `title`: String
- `theme`: String
- `jury`: Array of Strings (not a single string)
- `pastWinners`: String
- `customCriteria`: Array of Objects

### Common Errors & Fixes

#### Error: "Missing required field: 'title'"
**Solution**: Add a `title` field with at least 3 characters.

#### Error: "Field 'jury' must be of type 'array'"
**Solution**: Use an array: `"jury": ["Member 1", "Member 2"]` not `"jury": "Single Member"`

#### Error: "Field 'jury' must have at least 1 items"
**Solution**: Add at least one jury member: `"jury": ["Photographer Name"]`

#### Error: "Field 'pastWinners' is too short"
**Solution**: Provide at least 10 characters describing past winners' characteristics.

## Example Templates

Photo Open Call Analyzer includes 3 example templates:

### 1. Portrait Competition
```
data/open-calls/portrait-competition/open-call.json
```
Focus on human portraiture, emotion, and character studies.

### 2. Landscape & Wildlife
```
data/open-calls/landscape-wildlife/open-call.json
```
Focus on nature, landscapes, and wildlife photography.

### 3. Conceptual & Fine Art
```
data/open-calls/conceptual-fine-art/open-call.json
```
Focus on conceptual ideas, experimental techniques, and artistic vision.

## Step-by-Step Guide

### 1. Choose a Template

Copy one of the example templates as a starting point:

```bash
cp data/open-calls/portrait-competition/open-call.json \
   data/open-calls/my-competition/open-call.json
```

### 2. Edit Your Configuration

Open `data/open-calls/my-competition/open-call.json` and customize:

```json
{
  "title": "National Portrait Prize 2025",
  "theme": "Contemporary portraiture exploring identity and emotion",
  "jury": [
    "Renowned Portrait Photographer",
    "Gallery Director",
    "Photography Critic"
  ],
  "pastWinners": "Previous winners featured compelling character studies with masterful lighting and genuine emotional connection. Subjects ranged from children to elderly, with strong focus on eyes and facial expression. Both environmental and studio portraits have won.",
  "context": "This competition seeks to celebrate portraiture that reveals human dignity and complexity."
}
```

### 3. Validate Your Configuration

```bash
npm run analyze validate data/open-calls/my-competition/ --config
```

**Success output:**
```
✅ Configuration is valid!
Title: National Portrait Prize 2025
Theme: Contemporary portraiture exploring identity and emotion
Jury members: 3
```

**Error output:**
```
❌ Configuration Validation Errors:

  1. Field "jury" must have at least 1 items
     💡 Add at least 1 jury member

  📋 See documentation for template and examples
```

### 4. Create Photos Directory

```bash
mkdir -p data/open-calls/my-competition/photos
```

Add your photos (JPG, PNG, GIF, WebP) to this directory.

### 5. Run Analysis

```bash
npm run analyze analyze data/open-calls/my-competition/
```

## Best Practices

### Theme Description
- **Be specific**: "Portrait photography exploring emotion" (better) vs. "Portraits" (vague)
- **Include style hints**: Mention lighting, composition, or technical aspects valued in past winners
- **Minimum 20 characters**: Helps AI generate more relevant criteria

### Jury Information
- **Use real names or titles**: "Annie Leibovitz" or "Gallery Director, Modern Art Museum"
- **Mention specialties**: "Landscape photographer known for dramatic light" provides better context
- **At least 2-3 members**: Helps AI understand varied perspectives

### Past Winners Description
- **Describe 2-3 winner patterns**: What do winners have in common?
  - Example: "Strong composition, excellent use of light, emotional depth, technical mastery"
- **Include both technical and artistic elements**:
  - Technical: "Sharp focus, perfect exposure, rich colors"
  - Artistic: "Strong narrative, unique perspective, emotional connection"
- **Mention any special characteristics**:
  - "Many winners used unconventional framing"
  - "Diverse subject matter, but all showed technical excellence"

### Custom Criteria
- **Keep weights proportional**: If importance varies widely, use 10-90 range
- **Use clear names**: "Emotional Impact" (clear) vs. "Impact/Emotion" (confusing)
- **Match jury expectations**: If jury includes landscape specialists, include "Environmental Excellence" criterion

## Troubleshooting

### "Configuration file not found"

**Check:**
1. File exists at `data/open-calls/my-competition/open-call.json`
2. File is valid JSON (use an online JSON validator if unsure)
3. You're running from project root: `npm run analyze validate data/open-calls/my-competition/ --config`

### "Invalid JSON in open-call.json"

**Common issues:**
- Missing quotes: `title: "Name"` → `"title": "Name"`
- Trailing comma: `"jury": ["A", "B",]` → `"jury": ["A", "B"]`
- Single quotes: `'title': 'Name'` → `"title": "Name"`

**Solution**: Validate JSON online (e.g., jsonlint.com), then fix errors.

### "Configuration validation failed"

**Check the error message** for specific field issues. Common fixes:
- All required fields present: `title`, `theme`, `jury`, `pastWinners`
- Field values are correct type (jury is array, not string)
- String fields meet minimum length requirements
- `jury` array has at least 1 member

## See Also

- [README.md](../README.md) - Project overview
- [QUICKSTART.md](../QUICKSTART.md) - Getting started guide
- [_bmad-output/PRD.md](../_bmad-output/PRD.md#fr-21-configuration-template-system) - Feature requirements

## Schema Reference

For developers: The JSON schema is defined in `src/config/open-call.schema.json` and validated using [AJV](https://ajv.js.org/) JSON Schema validator.

Validation is performed by `src/config/validator.js::validateOpenCall()` which returns detailed error messages with suggestions for fixes.

---

**Need help?** Create an issue on GitHub or check existing templates for examples.
