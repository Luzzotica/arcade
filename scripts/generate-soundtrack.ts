#!/usr/bin/env node

import 'dotenv/config';
import * as fs from 'fs';
import * as path from 'path';
import { Readable } from 'stream';
import { ElevenLabsClient } from '@elevenlabs/elevenlabs-js';

const ELEVENLABS_API_KEY = process.env.ELEVENLABS_API_KEY;

// Composition plan section type
interface CompositionSection {
  name: string;
  lyrics?: string;
  style?: string;
  duration_ms?: number;
  transition_style?: 'smooth' | 'crossfade' | 'hard_cut';
  reference_audio_url?: string;
}

// Composition plan type
interface CompositionPlan {
  positive_global_styles: string[];
  negative_global_styles: string[];
  sections: CompositionSection[];
}

interface GenerateSoundtrackOptions {
  outputFolder: string;
  outputName: string;
  // Either prompt OR compositionPlan (not both)
  prompt?: string;
  compositionPlan?: CompositionPlan;
  // Options for prompt-based generation
  musicLengthMs?: number;
  forceInstrumental?: boolean;
  // Options for composition plan
  respectSectionsDurations?: boolean;
  // General options
  modelId?: string;
  storeForInpainting?: boolean;
  signWithC2pa?: boolean;
}

async function generateSoundtrack(options: GenerateSoundtrackOptions): Promise<void> {
  if (!ELEVENLABS_API_KEY) {
    throw new Error('ELEVENLABS_API_KEY environment variable is not set');
  }

  const {
    outputFolder,
    outputName,
    prompt,
    compositionPlan,
    musicLengthMs,
    forceInstrumental,
    respectSectionsDurations,
    modelId,
    storeForInpainting,
    signWithC2pa,
  } = options;

  // Validate: must have either prompt or compositionPlan, not both
  if (prompt && compositionPlan) {
    throw new Error('Cannot use both prompt and compositionPlan. Choose one.');
  }
  if (!prompt && !compositionPlan) {
    throw new Error('Must provide either prompt or compositionPlan.');
  }

  // Validate prompt length
  if (prompt && prompt.length > 4100) {
    throw new Error('Prompt must be 4100 characters or less.');
  }

  // Validate music length
  if (musicLengthMs !== undefined && (musicLengthMs < 3000 || musicLengthMs > 600000)) {
    throw new Error('musicLengthMs must be between 3000 and 600000.');
  }

  // Ensure output folder exists
  if (!fs.existsSync(outputFolder)) {
    fs.mkdirSync(outputFolder, { recursive: true });
  }

  if (prompt) {
    console.log(`Generating soundtrack from prompt: "${prompt.substring(0, 100)}${prompt.length > 100 ? '...' : ''}"`);
  } else {
    console.log(`Generating soundtrack from composition plan with ${compositionPlan!.sections.length} sections`);
  }
  console.log(`Output: ${path.join(outputFolder, outputName)}`);
  if (forceInstrumental) {
    console.log('Forcing instrumental (no vocals)');
  }

  try {
    const client = new ElevenLabsClient({
      environment: 'https://api.elevenlabs.io',
      apiKey: ELEVENLABS_API_KEY,
    });

    // Build request params
    const requestParams: Record<string, any> = {};

    if (prompt) {
      requestParams.prompt = prompt;
      if (musicLengthMs !== undefined) {
        requestParams.musicLengthMs = musicLengthMs;
      }
      if (forceInstrumental !== undefined) {
        requestParams.forceInstrumental = forceInstrumental;
      }
    } else if (compositionPlan) {
      requestParams.compositionPlan = {
        positiveGlobalStyles: compositionPlan.positive_global_styles,
        negativeGlobalStyles: compositionPlan.negative_global_styles,
        sections: compositionPlan.sections.map(s => ({
          name: s.name,
          lyrics: s.lyrics,
          style: s.style,
          durationMs: s.duration_ms,
          transitionStyle: s.transition_style,
          referenceAudioUrl: s.reference_audio_url,
        })),
      };
      if (respectSectionsDurations !== undefined) {
        requestParams.respectSectionsDurations = respectSectionsDurations;
      }
    }

    if (modelId !== undefined) {
      requestParams.modelId = modelId;
    }
    if (storeForInpainting !== undefined) {
      requestParams.storeForInpainting = storeForInpainting;
    }
    if (signWithC2pa !== undefined) {
      requestParams.signWithC2pa = signWithC2pa;
    }

    const audioStream = await client.music.compose(requestParams);

    // Convert stream to buffer
    const chunks: Buffer[] = [];
    const nodeStream = Readable.fromWeb(audioStream as any);
    for await (const chunk of nodeStream) {
      chunks.push(Buffer.from(chunk));
    }
    const audioBuffer = Buffer.concat(chunks);
    
    const outputPath = path.join(outputFolder, outputName);
    fs.writeFileSync(outputPath, audioBuffer);

    console.log(`✓ Soundtrack generated successfully: ${outputPath}`);
  } catch (error) {
    console.error('Error generating soundtrack:', error);
    process.exit(1);
  }
}

// Parse command line arguments
const args = process.argv.slice(2);

function printUsage() {
  console.error('Usage:');
  console.error('  Prompt-based:');
  console.error('    generate-soundtrack.ts --prompt <prompt> --output-folder <folder> --output-name <name> [options]');
  console.error('');
  console.error('  Composition plan-based:');
  console.error('    generate-soundtrack.ts --plan <plan.json> --output-folder <folder> --output-name <name> [options]');
  console.error('');
  console.error('Options:');
  console.error('  --prompt <text>           Text description of the soundtrack (max 4100 chars)');
  console.error('  --plan <file.json>        Path to JSON file with composition plan');
  console.error('  --output-folder <path>    Folder to save the soundtrack');
  console.error('  --output-name <name>      Filename for the soundtrack (e.g., "theme.mp3")');
  console.error('  --length <ms>             Duration in milliseconds (3000-600000, prompt only)');
  console.error('  --instrumental            Force instrumental output, no vocals (prompt only)');
  console.error('  --respect-durations       Strictly respect section durations (plan only, default: true)');
  console.error('  --no-respect-durations    Allow model to adjust section durations (plan only)');
  console.error('  --model <id>              Model ID (default: music_v1)');
  console.error('  --c2pa                    Sign with C2PA (mp3 only)');
  console.error('');
  console.error('Examples:');
  console.error('  # Simple prompt-based generation');
  console.error('  generate-soundtrack.ts --prompt "epic battle music" --output-folder ./music --output-name battle.mp3');
  console.error('');
  console.error('  # Instrumental only');
  console.error('  generate-soundtrack.ts --prompt "ambient synth" --output-folder ./music --output-name ambient.mp3 --instrumental');
  console.error('');
  console.error('  # With specific length');
  console.error('  generate-soundtrack.ts --prompt "short jingle" --output-folder ./music --output-name jingle.mp3 --length 10000');
  console.error('');
  console.error('  # Using composition plan');
  console.error('  generate-soundtrack.ts --plan ./my-plan.json --output-folder ./music --output-name song.mp3');
  console.error('');
  console.error('Composition Plan JSON format:');
  console.error('  {');
  console.error('    "positive_global_styles": ["electronic", "ambient"],');
  console.error('    "negative_global_styles": ["vocals", "drums"],');
  console.error('    "sections": [');
  console.error('      {');
  console.error('        "name": "intro",');
  console.error('        "style": "soft ambient pads",');
  console.error('        "duration_ms": 15000,');
  console.error('        "transition_style": "smooth"');
  console.error('      }');
  console.error('    ]');
  console.error('  }');
}

// Check for help flag first
if (args.includes('--help') || args.includes('-h')) {
  printUsage();
  process.exit(0);
}

if (args.length < 4) {
  printUsage();
  process.exit(1);
}

// Parse named arguments
let prompt: string | undefined;
let planFile: string | undefined;
let outputFolder: string | undefined;
let outputName: string | undefined;
let musicLengthMs: number | undefined;
let forceInstrumental: boolean | undefined;
let respectSectionsDurations: boolean | undefined;
let modelId: string | undefined;
let signWithC2pa: boolean | undefined;

for (let i = 0; i < args.length; i++) {
  const arg = args[i];
  switch (arg) {
    case '--prompt':
      prompt = args[++i];
      break;
    case '--plan':
      planFile = args[++i];
      break;
    case '--output-folder':
      outputFolder = args[++i];
      break;
    case '--output-name':
      outputName = args[++i];
      break;
    case '--length':
      musicLengthMs = parseInt(args[++i], 10);
      break;
    case '--instrumental':
      forceInstrumental = true;
      break;
    case '--respect-durations':
      respectSectionsDurations = true;
      break;
    case '--no-respect-durations':
      respectSectionsDurations = false;
      break;
    case '--model':
      modelId = args[++i];
      break;
    case '--c2pa':
      signWithC2pa = true;
      break;
    case '--help':
    case '-h':
      printUsage();
      process.exit(0);
    default:
      if (arg.startsWith('-')) {
        console.error(`Unknown option: ${arg}`);
        printUsage();
        process.exit(1);
      }
  }
}

// Validate required arguments
if (!outputFolder || !outputName) {
  console.error('Error: --output-folder and --output-name are required');
  printUsage();
  process.exit(1);
}

if (!prompt && !planFile) {
  console.error('Error: Either --prompt or --plan is required');
  printUsage();
  process.exit(1);
}

// Load composition plan if specified
let compositionPlan: CompositionPlan | undefined;
if (planFile) {
  try {
    const planContent = fs.readFileSync(planFile, 'utf-8');
    compositionPlan = JSON.parse(planContent);
  } catch (error) {
    console.error(`Error reading composition plan file: ${planFile}`);
    console.error(error);
    process.exit(1);
  }
}

generateSoundtrack({
  prompt,
  compositionPlan,
  outputFolder,
  outputName,
  musicLengthMs,
  forceInstrumental,
  respectSectionsDurations,
  modelId,
  signWithC2pa,
}).catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
