#!/usr/bin/env node

import 'dotenv/config';
import * as path from 'path';
import * as fs from 'fs';
import { UploadPost } from 'upload-post';
import axios from 'axios';
import FormData from 'form-data';
import { createReadStream } from 'fs';

const UPLOAD_POST_API_KEY = process.env.UPLOAD_POST_API_KEY;
const DEFAULT_USER = 'sterling-long';

// Supported platforms (as per upload-post API)
const SUPPORTED_PLATFORMS = ['youtube', 'x', 'twitter', 'linkedin', 'tiktok', 'instagram', 'facebook', 'threads', 'pinterest'] as const;
type Platform = typeof SUPPORTED_PLATFORMS[number];

// Map user-friendly platform names to API platform names
// Note: The API actually accepts 'x' directly, not 'twitter'
const PLATFORM_MAP: Record<string, string> = {
  'x': 'x', // API accepts 'x' directly
  'twitter': 'x', // Map 'twitter' to 'x' for API
};

interface UploadOptions {
  filePath: string;
  title: string;
  user?: string;
  platforms: Platform[];
}

async function uploadPost(options: UploadOptions): Promise<void> {
  if (!UPLOAD_POST_API_KEY) {
    throw new Error('UPLOAD_POST_API_KEY environment variable is not set');
  }

  const { filePath, title, user = DEFAULT_USER, platforms } = options;

  // Validate file exists
  if (!fs.existsSync(filePath)) {
    throw new Error(`File not found: ${filePath}`);
  }

  // Resolve absolute path
  const absolutePath = path.isAbsolute(filePath) ? filePath : path.resolve(process.cwd(), filePath);
  
  // Check file size (use async upload for files > 50MB)
  const fileStats = fs.statSync(absolutePath);
  const fileSizeMB = fileStats.size / (1024 * 1024);
  const useAsyncUpload = fileSizeMB > 50;
  
  console.log(`Uploading post to: ${platforms.join(', ')}`);
  console.log(`File: ${absolutePath} (${fileSizeMB.toFixed(2)} MB)`);
  console.log(`Title: ${title}`);
  console.log(`User: ${user}`);
  if (useAsyncUpload) {
    console.log('Using async upload (large file detected)...');
  }

  try {
    // Map platform names to API format (x -> twitter)
    const apiPlatforms = platforms.map(p => PLATFORM_MAP[p.toLowerCase()] || p.toLowerCase());

    // For large files, use direct API call with async_upload
    if (useAsyncUpload) {
      const form = new FormData();
      form.append('video', createReadStream(absolutePath));
      form.append('title', title);
      form.append('user', user);
      apiPlatforms.forEach(platform => {
        form.append('platform[]', platform);
      });
      form.append('async_upload', 'true');

      const response = await axios.post('https://api.upload-post.com/api/upload', form, {
        headers: {
          ...form.getHeaders(),
          'Authorization': `Apikey ${UPLOAD_POST_API_KEY}`
        },
        maxContentLength: Infinity,
        maxBodyLength: Infinity,
        timeout: 300000, // 5 minute timeout for large file upload initiation
      });

      if (response.status === 202) {
        const requestId = response.data.request_id || response.data.job_id;
        console.log('✓ Upload initiated successfully!');
        console.log(`Request ID: ${requestId}`);
        console.log('The upload is processing in the background.');
        console.log('You can check the status using the Upload Status API endpoint.');
        console.log('Result:', JSON.stringify(response.data, null, 2));
        return;
      }

      const result = response.data;
      console.log('✓ Upload successful!');
      console.log('Result:', JSON.stringify(result, null, 2));
    } else {
      // Use library for smaller files
      const uploader = new UploadPost(UPLOAD_POST_API_KEY);
      const result = await uploader.upload(absolutePath, {
        title,
        user,
        platforms: apiPlatforms,
      });

      console.log('✓ Upload successful!');
      console.log('Result:', JSON.stringify(result, null, 2));
    }
  } catch (error: any) {
    console.error('Error uploading post:', error);
    if (error instanceof Error) {
      console.error('Error message:', error.message);
    }
    // Try to extract more details from axios errors
    if (error.response) {
      console.error('Response status:', error.response.status);
      console.error('Response data:', JSON.stringify(error.response.data, null, 2));
    }
    process.exit(1);
  }
}

// Parse command line arguments
const args = process.argv.slice(2);

function printUsage() {
  console.error('Usage:');
  console.error('  upload-post.ts --file <path> --title <title> --platforms <platforms> [options]');
  console.error('');
  console.error('Required arguments:');
  console.error('  --file <path>              Path to video/image file to upload');
  console.error('  --title <text>             Title/description for the post');
  console.error('                            OR --title-file <path> to read title from file');
  console.error('  --platforms <list>         Comma-separated list of platforms (e.g., "youtube,x,linkedin")');
  console.error('');
  console.error('Optional arguments:');
  console.error('  --user <username>          User profile (default: sterling-long)');
  console.error('');
  console.error('Supported platforms:');
  console.error('  youtube, x (or twitter), linkedin, tiktok, instagram, facebook, threads, pinterest');
  console.error('');
  console.error('Examples:');
  console.error('  # Upload to YouTube, X, and LinkedIn');
  console.error('  upload-post.ts --file ./video.mp4 --title "My Awesome Video" --platforms youtube,x,linkedin');
  console.error('');
  console.error('  # Upload to single platform with custom user');
  console.error('  upload-post.ts --file ./image.jpg --title "Check this out!" --platforms x --user my-other-profile');
  console.error('');
}

// Check for help flag first
if (args.includes('--help') || args.includes('-h')) {
  printUsage();
  process.exit(0);
}

if (args.length < 6) {
  printUsage();
  process.exit(1);
}

// Parse named arguments
let filePath: string | undefined;
let title: string | undefined;
let titleFile: string | undefined;
let platformsStr: string | undefined;
let user: string | undefined;

for (let i = 0; i < args.length; i++) {
  const arg = args[i];
  switch (arg) {
    case '--file':
      filePath = args[++i];
      break;
    case '--title':
      title = args[++i];
      break;
    case '--title-file':
      titleFile = args[++i];
      break;
    case '--platforms':
      platformsStr = args[++i];
      break;
    case '--user':
      user = args[++i];
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
if (!filePath) {
  console.error('Error: --file is required');
  printUsage();
  process.exit(1);
}

// Handle title from file if provided
if (titleFile) {
  if (!fs.existsSync(titleFile)) {
    console.error(`Error: Title file not found: ${titleFile}`);
    process.exit(1);
  }
  title = fs.readFileSync(titleFile, 'utf-8').trim();
}

if (!title) {
  console.error('Error: --title or --title-file is required');
  printUsage();
  process.exit(1);
}

if (!platformsStr) {
  console.error('Error: --platforms is required');
  printUsage();
  process.exit(1);
}

// Parse and validate platforms
const platforms = platformsStr
  .split(',')
  .map(p => p.trim().toLowerCase())
  .filter(p => p.length > 0) as Platform[];

if (platforms.length === 0) {
  console.error('Error: At least one platform must be specified');
  printUsage();
  process.exit(1);
}

// Validate platform names
const invalidPlatforms = platforms.filter(p => !SUPPORTED_PLATFORMS.includes(p));
if (invalidPlatforms.length > 0) {
  console.error(`Error: Invalid platform(s): ${invalidPlatforms.join(', ')}`);
  console.error(`Supported platforms: ${SUPPORTED_PLATFORMS.join(', ')}`);
  printUsage();
  process.exit(1);
}

uploadPost({
  filePath,
  title,
  user,
  platforms,
}).catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
