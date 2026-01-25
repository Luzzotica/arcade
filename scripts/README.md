# Asset Generation Scripts

This folder contains scripts for generating game assets using AI services.

## Prerequisites

1. Install dependencies:
   ```bash
   npm install
   ```

2. Set environment variables:
   - `ELEVENLABS_API_KEY` - Your ElevenLabs API key
   - `MESHY_API_KEY` - Your Meshy AI API key

## Scripts

### Generate Soundtrack

Generates music soundtracks using ElevenLabs Music API.

**Prompt-based Usage:**
```bash
npm run generate:soundtrack -- --prompt <prompt> --output-folder <folder> --output-name <name> [options]
```

**Composition Plan-based Usage:**
```bash
npm run generate:soundtrack -- --plan <plan.json> --output-folder <folder> --output-name <name> [options]
```

**Options:**
- `--prompt <text>` - Text description of the soundtrack (max 4100 chars)
- `--plan <file.json>` - Path to JSON file with composition plan
- `--output-folder <path>` - Folder to save the soundtrack (required)
- `--output-name <name>` - Filename for the soundtrack (required)
- `--length <ms>` - Duration in milliseconds (3000-600000, prompt only)
- `--instrumental` - Force instrumental output, no vocals (prompt only)
- `--respect-durations` - Strictly respect section durations (plan only, default)
- `--no-respect-durations` - Allow model to adjust section durations (plan only)
- `--model <id>` - Model ID (default: music_v1)
- `--c2pa` - Sign with C2PA (mp3 only)

**Examples:**
```bash
# Simple prompt-based generation
npm run generate:soundtrack -- --prompt "epic battle music" --output-folder ./music --output-name battle.mp3

# Instrumental only (no vocals)
npm run generate:soundtrack -- --prompt "ambient synth pads" --output-folder ./music --output-name ambient.mp3 --instrumental

# With specific length (60 seconds)
npm run generate:soundtrack -- --prompt "short jingle" --output-folder ./music --output-name jingle.mp3 --length 60000

# Using composition plan
npm run generate:soundtrack -- --plan ./my-plan.json --output-folder ./music --output-name song.mp3
```

**Composition Plan JSON format:**
```json
{
  "positive_global_styles": ["electronic", "ambient", "cinematic"],
  "negative_global_styles": ["vocals", "heavy metal"],
  "sections": [
    {
      "name": "intro",
      "style": "soft ambient pads, building tension",
      "duration_ms": 15000,
      "transition_style": "smooth"
    },
    {
      "name": "main",
      "style": "energetic electronic beats",
      "duration_ms": 45000,
      "transition_style": "crossfade"
    },
    {
      "name": "outro",
      "style": "fading ambient",
      "duration_ms": 10000,
      "transition_style": "smooth"
    }
  ]
}
```

**Section properties:**
- `name` (required) - Name of the section
- `style` (optional) - Style/mood description for this section
- `lyrics` (optional) - Lyrics for this section
- `duration_ms` (optional) - Duration in milliseconds
- `transition_style` (optional) - "smooth", "crossfade", or "hard_cut"
- `reference_audio_url` (optional) - URL to reference audio

### Generate Sound Effect

Generates sound effects using ElevenLabs Sound Effects API.

**Usage:**
```bash
npm run generate:sfx -- <text> <outputFolder> <outputName> [loop] [durationSeconds] [promptInfluence] [modelId]
```

**Example:**
```bash
npm run generate:sfx -- "explosion sound" ./assets/sfx explosion.mp3
npm run generate:sfx -- "explosion sound" ./assets/sfx explosion.mp3 true 3.0 0.5
```

**Arguments:**
- `text` - Text description of the sound effect (required)
- `outputFolder` - Folder to save the sound effect (required)
- `outputName` - Filename (e.g., "explosion.mp3") (required)
- `loop` - Whether to create a looping sound effect (optional, boolean, default: false)
- `durationSeconds` - Duration in seconds 0.5-30 (optional, number, default: None/auto)
- `promptInfluence` - How closely to follow prompt 0-1 (optional, number, default: 0.3)
- `modelId` - Model ID to use (optional, string, default: eleven_text_to_sound_v2)

### Generate Mesh

Generates 3D meshes using Meshy AI API.

**Usage:**
```bash
npm run generate:mesh -- <prompt> <outputFolder> <outputName> [mode] [aiModel] [topology] [targetPolycount] [shouldRemesh] [taskId]
```

**Example (Preview):**
```bash
npm run generate:mesh -- "futuristic spaceship" ./assets/meshes spaceship preview latest quad 10000 false
```

**Example (Refine - requires task ID from preview):**
```bash
npm run generate:mesh -- "futuristic spaceship" ./assets/meshes spaceship refine latest quad 10000 false <task-id>
```

**Arguments:**
- `prompt` - Text description of the 3D mesh (max 600 chars)
- `outputFolder` - Folder to save the mesh
- `outputName` - Base name for the mesh files (e.g., "spaceship")
- `mode` - "preview" or "refine" (optional, default: preview)
- `aiModel` - Model: meshy-5, meshy-6, or latest (optional, default: latest)
- `topology` - quad or triangle (optional, default: quad)
- `targetPolycount` - Target polygon count 100-300000 (optional, default: 10000)
- `shouldRemesh` - Enable remesh phase (optional, default: false)
- `taskId` - Task ID from preview for refine mode (required for refine)

**Note:** The mesh generation script uses an async workflow. It will poll the Meshy API until the generation is complete. The output will be saved in a folder named after `outputName`, containing GLB, OBJ, USDZ files, and a preview image.
