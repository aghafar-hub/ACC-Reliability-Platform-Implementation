// scripts/build-direct.js
// Sequential workspace builds without Turbo (Windows-safe; no cmd /c required).

const { execSync } = require('child_process');

const steps = [
  'shared-types:build',
  'cache:build',
  'kernel:build',
  'services:build',
  'storage:build',
  'sdk:build',
  'gateway:build',
  'backend:build',
  'oil-lubrication:build',
  'app:build',
];

for (const step of steps) {
  console.log(`\n[build:direct] npm run ${step}`);
  execSync(`npm run ${step}`, { stdio: 'inherit' });
}
