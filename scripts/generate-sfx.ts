#!/usr/bin/env node

import 'dotenv/config';
import * as fs from 'fs';
import * as path from 'path';
import { Readable } from 'stream';
import { ElevenLabsClient } from '@elevenlabs/elevenlabs-js';
import { CreateSoundEffectRequest } from '@elevenlabs/elevenlabs-js/api';

const ELEVENLABS_API_KEY = process.env.ELEVENLABS_API_KEY;

interface GenerateSFXOptions {
  text: string;
  outputFolder: string;
  outputName: string;
  loop?: boolean;
  durationSeconds?: number;
  promptInfluence?: number;
  modelId?: string;
}

async function generateSFX(options: GenerateSFXOptions): Promise<void> {
  if (!ELEVENLABS_API_KEY) {
    throw new Error('ELEVENLABS_API_KEY environment variable is not set');
  }

  const { text, outputFolder, outputName, loop, durationSeconds, promptInfluence, modelId } = options;

  // Validate duration_seconds if provided
  if (durationSeconds !== undefined && (durationSeconds < 0.5 || durationSeconds > 30)) {
    throw new Error('durationSeconds must be between 0.5 and 30 seconds');
  }

  // Validate prompt_influence if provided
  if (promptInfluence !== undefined && (promptInfluence < 0 || promptInfluence > 1)) {
    throw new Error('promptInfluence must be between 0 and 1');
  }

  // Ensure output folder exists
  if (!fs.existsSync(outputFolder)) {
    fs.mkdirSync(outputFolder, { recursive: true });
  }

  console.log(`Generating sound effect: "${text}"`);
  console.log(`Output: ${path.join(outputFolder, outputName)}`);

  try {
    const client = new ElevenLabsClient({
      environment: 'https://api.elevenlabs.io',
      apiKey: ELEVENLABS_API_KEY,
    });

    const requestParams: CreateSoundEffectRequest = {
      text,
    };

    // Add optional parameters if provided
    if (loop !== undefined) {
      requestParams.loop = loop;
    }
    if (durationSeconds !== undefined) {
      requestParams.durationSeconds = durationSeconds;
    }
    if (promptInfluence !== undefined) {
      requestParams.promptInfluence = promptInfluence;
    }
    if (modelId !== undefined) {
      requestParams.modelId = modelId;
    }

    const audioStream = await client.textToSoundEffects.convert(requestParams);

    // Convert stream to buffer
    const chunks: Buffer[] = [];
    const nodeStream = Readable.fromWeb(audioStream as any);
    for await (const chunk of nodeStream) {
      chunks.push(Buffer.from(chunk));
    }
    const audioBuffer = Buffer.concat(chunks);
    
    const outputPath = path.join(outputFolder, outputName);
    fs.writeFileSync(outputPath, audioBuffer);

    console.log(`✓ Sound effect generated successfully: ${outputPath}`);
  } catch (error) {
    console.error('Error generating sound effect:', error);
    process.exit(1);
  }
}

// Parse command line arguments
const args = process.argv.slice(2);

if (args.length < 3) {
  console.error('Usage: generate-sfx.ts <text> <outputFolder> <outputName> [loop] [durationSeconds] [promptInfluence] [modelId]');
  console.error('');
  console.error('Example:');
  console.error('  generate-sfx.ts "explosion sound" ./assets/sfx explosion.mp3');
  console.error('  generate-sfx.ts "explosion sound" ./assets/sfx explosion.mp3 true 3.0 0.5');
  console.error('');
  console.error('Arguments:');
  console.error('  text            - Text description of the sound effect (required)');
  console.error('  outputFolder   - Folder to save the sound effect (required)');
  console.error('  outputName     - Filename for the sound effect (required, e.g., "explosion.mp3")');
  console.error('  loop            - Whether to create a looping sound effect (optional, boolean, default: false)');
  console.error('  durationSeconds - Duration in seconds 0.5-30 (optional, number, default: None/auto)');
  console.error('  promptInfluence - How closely to follow prompt 0-1 (optional, number, default: 0.3)');
  console.error('  modelId         - Model ID to use (optional, string, default: eleven_text_to_sound_v2)');
  process.exit(1);
}

const [text, outputFolder, outputName, loop, durationSeconds, promptInfluence, modelId] = args;

generateSFX({
  text,
  outputFolder,
  outputName,
  loop: loop !== undefined ? loop === 'true' : undefined,
  durationSeconds: durationSeconds !== undefined ? parseFloat(durationSeconds) : undefined,
  promptInfluence: promptInfluence !== undefined ? parseFloat(promptInfluence) : undefined,
  modelId: modelId || undefined,
}).catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
