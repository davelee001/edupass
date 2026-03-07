// Test script to verify Vite can start
const { spawn } = require('child_process');
const path = require('path');

console.log('Current directory:', process.cwd());
console.log('Starting Vite...\n');

const vite = spawn('npx', ['vite'], {
  cwd: path.join(__dirname),
  shell: true,
  stdio: 'inherit'
});

vite.on('error', (error) => {
  console.error('Failed to start Vite:', error);
  process.exit(1);
});

vite.on('exit', (code) => {
  console.log(`Vite exited with code ${code}`);
  if (code !== 0) {
    process.exit(code);
  }
});

// Keep the process running
process.on('SIGINT', () => {
  console.log('\nShutting down...');
  vite.kill();
  process.exit();
});
