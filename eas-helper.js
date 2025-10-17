#!/usr/bin/env node

/**
 * EAS Build Helper with proper Node.js configuration
 */

const { spawn } = require('child_process');

// Set NODE_OPTIONS for TypeScript support
process.env.NODE_OPTIONS = '--experimental-specifier-resolution=node';

// Get command from arguments
const args = process.argv.slice(2);
const command = args.join(' ');

console.log(`Running: ${command}`);
console.log(`NODE_OPTIONS: ${process.env.NODE_OPTIONS}`);

// Spawn the command with proper environment
const child = spawn(command, [], {
  stdio: 'inherit',
  shell: true,
  env: process.env
});

child.on('close', (code) => {
  process.exit(code);
});

child.on('error', (error) => {
  console.error('Error:', error);
  process.exit(1);
});