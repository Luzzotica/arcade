#!/usr/bin/env node

import 'dotenv/config';
import * as fs from 'fs';
import * as path from 'path';

const MESHY_API_KEY = process.env.MESHY_API_KEY;
const MESHY_API_BASE_URL = 'https://api.meshy.ai';

interface GenerateMeshOptions {
  prompt: string;
  outputFolder: string;
  outputName: string;
  mode?: 'preview' | 'refine';
  aiModel?: 'meshy-5' | 'meshy-6' | 'latest';
  topology?: 'quad' | 'triangle';
  targetPolycount?: number;
  shouldRemesh?: boolean;
  taskId?: string; // For refine mode, provide the task ID from preview
}

interface MeshyTaskResponse {
  result: {
    task_id: string;
  };
}

interface MeshyTaskStatus {
  status: 'PENDING' | 'PROCESSING' | 'SUCCEEDED' | 'FAILED';
  progress: number;
  result?: {
    model_urls?: {
      glb?: string;
      obj?: string;
      usdz?: string;
    };
    image_urls?: {
      preview?: string;
    };
  };
  error?: string;
}

async function pollTaskStatus(taskId: string): Promise<MeshyTaskStatus> {
  const maxAttempts = 120; // 10 minutes max (5 second intervals)
  let attempts = 0;

  while (attempts < maxAttempts) {
    const response = await fetch(`${MESHY_API_BASE_URL}/openapi/v2/text-to-3d/${taskId}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${MESHY_API_KEY}`,
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Failed to check task status: ${response.status} ${response.statusText}\n${errorText}`);
    }

    const status: MeshyTaskStatus = await response.json();

    if (status.status === 'SUCCEEDED') {
      return status;
    }

    if (status.status === 'FAILED') {
      throw new Error(`Task failed: ${status.error || 'Unknown error'}`);
    }

    // Show progress
    console.log(`  Progress: ${status.progress}% (Status: ${status.status})`);

    // Wait before next poll
    await new Promise(resolve => setTimeout(resolve, 5000));
    attempts++;
  }

  throw new Error('Task polling timeout - task took too long to complete');
}

async function downloadFile(url: string, outputPath: string): Promise<void> {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to download file: ${response.status} ${response.statusText}`);
  }
  const buffer = await response.arrayBuffer();
  fs.writeFileSync(outputPath, Buffer.from(buffer));
}

async function generateMesh(options: GenerateMeshOptions): Promise<void> {
  if (!MESHY_API_KEY) {
    throw new Error('MESHY_API_KEY environment variable is not set');
  }

  const {
    prompt,
    outputFolder,
    outputName,
    mode = 'preview',
    aiModel = 'latest',
    topology = 'quad',
    targetPolycount = 10000,
    shouldRemesh = false,
    taskId,
  } = options;

  // Ensure output folder exists
  if (!fs.existsSync(outputFolder)) {
    fs.mkdirSync(outputFolder, { recursive: true });
  }

  console.log(`Generating 3D mesh: "${prompt}"`);
  console.log(`Mode: ${mode}`);
  console.log(`Output: ${path.join(outputFolder, outputName)}`);

  // If refine mode, use the provided task ID
  let currentTaskId = taskId;

  // If preview mode or no task ID, create a new task
  if (mode === 'preview' || !currentTaskId) {
    const requestBody: Record<string, any> = {
      mode: 'preview',
      prompt,
      ai_model: aiModel,
      topology,
      target_polycount: targetPolycount,
      should_remesh: shouldRemesh,
    };

    try {
      const response = await fetch(`${MESHY_API_BASE_URL}/openapi/v2/text-to-3d`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${MESHY_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`API request failed: ${response.status} ${response.statusText}\n${errorText}`);
      }

      const taskResponse: MeshyTaskResponse = await response.json();
      currentTaskId = taskResponse.result.task_id;
      console.log(`Task created: ${currentTaskId}`);
    } catch (error) {
      console.error('Error creating mesh generation task:', error);
      process.exit(1);
    }
  }

  // Poll for completion
  console.log('Polling for task completion...');
  let taskStatus: MeshyTaskStatus;
  try {
    taskStatus = await pollTaskStatus(currentTaskId);
  } catch (error) {
    console.error('Error polling task status:', error);
    process.exit(1);
  }

  // Download the generated files
  if (taskStatus.result?.model_urls) {
    const modelUrls = taskStatus.result.model_urls;
    const baseName = path.parse(outputName).name;
    const outputDir = path.join(outputFolder, baseName);

    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    // Download GLB if available
    if (modelUrls.glb) {
      const glbPath = path.join(outputDir, `${baseName}.glb`);
      console.log(`Downloading GLB: ${glbPath}`);
      await downloadFile(modelUrls.glb, glbPath);
    }

    // Download OBJ if available
    if (modelUrls.obj) {
      const objPath = path.join(outputDir, `${baseName}.obj`);
      console.log(`Downloading OBJ: ${objPath}`);
      await downloadFile(modelUrls.obj, objPath);
    }

    // Download USDZ if available
    if (modelUrls.usdz) {
      const usdzPath = path.join(outputDir, `${baseName}.usdz`);
      console.log(`Downloading USDZ: ${usdzPath}`);
      await downloadFile(modelUrls.usdz, usdzPath);
    }

    // Download preview image if available
    if (taskStatus.result.image_urls?.preview) {
      const previewPath = path.join(outputDir, `${baseName}_preview.png`);
      console.log(`Downloading preview: ${previewPath}`);
      await downloadFile(taskStatus.result.image_urls.preview, previewPath);
    }

    console.log(`✓ Mesh generated successfully in: ${outputDir}`);
  } else {
    console.error('No model URLs found in task result');
    process.exit(1);
  }
}

// Parse command line arguments
const args = process.argv.slice(2);

if (args.length < 3) {
  console.error('Usage: generate-mesh.ts <prompt> <outputFolder> <outputName> [mode] [aiModel] [topology] [targetPolycount] [shouldRemesh] [taskId]');
  console.error('');
  console.error('Example:');
  console.error('  generate-mesh.ts "futuristic spaceship" ./assets/meshes spaceship preview latest quad 10000 false');
  console.error('  generate-mesh.ts "futuristic spaceship" ./assets/meshes spaceship refine latest quad 10000 false <task-id>');
  console.error('');
  console.error('Arguments:');
  console.error('  prompt          - Text description of the 3D mesh (max 600 chars)');
  console.error('  outputFolder   - Folder to save the mesh');
  console.error('  outputName      - Base name for the mesh files (e.g., "spaceship")');
  console.error('  mode            - "preview" or "refine" (optional, default: preview)');
  console.error('  aiModel         - Model: meshy-5, meshy-6, or latest (optional, default: latest)');
  console.error('  topology        - quad or triangle (optional, default: quad)');
  console.error('  targetPolycount - Target polygon count 100-300000 (optional, default: 10000)');
  console.error('  shouldRemesh    - Enable remesh phase (optional, default: false)');
  console.error('  taskId          - Task ID from preview for refine mode (required for refine)');
  process.exit(1);
}

const [prompt, outputFolder, outputName, mode, aiModel, topology, targetPolycount, shouldRemesh, taskId] = args;

generateMesh({
  prompt,
  outputFolder,
  outputName,
  mode: (mode as 'preview' | 'refine') || undefined,
  aiModel: (aiModel as 'meshy-5' | 'meshy-6' | 'latest') || undefined,
  topology: (topology as 'quad' | 'triangle') || undefined,
  targetPolycount: targetPolycount ? parseInt(targetPolycount, 10) : undefined,
  shouldRemesh: shouldRemesh === 'true',
  taskId: taskId || undefined,
}).catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
