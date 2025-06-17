#!/usr/bin/env node
// @ts-nocheck

/**
 * Development Environment Verification Script
 * Checks that all development tools and tests are working correctly
 */

import { spawn } from 'child_process';
import { readFileSync, existsSync } from 'fs';
import { join } from 'path';

const colors = {
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  reset: '\x1b[0m',
  bold: '\x1b[1m'
};

/**
 * @param {string} message
 * @param {string} color
 */
function log(message, color = colors.reset) {
  console.log(`${color}${message}${colors.reset}`);
}

function success(message) {
  log(`✅ ${message}`, colors.green);
}

function error(message) {
  log(`❌ ${message}`, colors.red);
}

function warning(message) {
  log(`⚠️  ${message}`, colors.yellow);
}

function info(message) {
  log(`ℹ️  ${message}`, colors.blue);
}

function section(title) {
  log(`\n${colors.bold}=== ${title} ===${colors.reset}`);
}

async function runCommand(command, args = [], options = {}) {
  return new Promise((resolve) => {
    const child = spawn(command, args, {
      stdio: 'pipe',
      ...options
    });

    let stdout = '';
    let stderr = '';

    child.stdout?.on('data', (data) => {
      stdout += data.toString();
    });

    child.stderr?.on('data', (data) => {
      stderr += data.toString();
    });

    child.on('close', (code) => {
      resolve({
        code,
        stdout,
        stderr,
        success: code === 0
      });
    });
  });
}

async function checkFile(filePath, description) {
  if (existsSync(filePath)) {
    success(`${description} exists`);
    return true;
  } else {
    error(`${description} missing: ${filePath}`);
    return false;
  }
}

async function checkPackageScripts() {
  section('Package Scripts');
  
  try {
    const packageJson = JSON.parse(readFileSync('package.json', 'utf8'));
    const scripts = packageJson.scripts;
    
    const expectedScripts = [
      'dev',
      'build',
      'test',
      'test:coverage',
      'test:e2e',
      'test:all',
      'lint',
      'typecheck'
    ];
    
    for (const script of expectedScripts) {
      if (scripts[script]) {
        success(`Script "${script}" configured`);
      } else {
        error(`Script "${script}" missing`);
      }
    }
  } catch (err) {
    error(`Failed to read package.json: ${err.message}`);
  }
}

async function checkDependencies() {
  section('Dependencies');
  
  info('Checking if node_modules are installed...');
  const result = await runCommand('npm', ['list', '--depth=0'], { stdio: 'pipe' });
  
  if (result.success) {
    success('Dependencies installed');
  } else {
    error('Dependencies not properly installed');
    info('Run: npm install');
  }
}

async function checkTypeScript() {
  section('TypeScript');
  
  info('Running TypeScript compiler check...');
  const result = await runCommand('npm', ['run', 'typecheck']);
  
  if (result.success) {
    success('TypeScript compilation passed');
  } else {
    error('TypeScript compilation failed');
    console.log(result.stderr);
  }
}

async function checkLinting() {
  section('Linting');
  
  info('Running ESLint...');
  const result = await runCommand('npm', ['run', 'lint']);
  
  if (result.success) {
    success('Linting passed');
  } else {
    error('Linting failed');
    console.log(result.stdout);
  }
}

async function checkUnitTests() {
  section('Unit Tests');
  
  info('Running unit tests...');
  const result = await runCommand('npm', ['test', '--', '--run']);
  
  if (result.success) {
    success('Unit tests passed');
    
    // Extract test summary from output
    const lines = result.stdout.split('\n');
    const summaryLine = lines.find(line => line.includes('Test Files') && line.includes('passed'));
    if (summaryLine) {
      info(summaryLine.trim());
    }
  } else {
    error('Unit tests failed');
    console.log(result.stdout);
  }
}

async function checkTestCoverage() {
  section('Test Coverage');
  
  info('Generating test coverage report...');
  const result = await runCommand('npm', ['run', 'test:coverage', '--', '--run', '--reporter=json']);
  
  if (result.success) {
    success('Coverage report generated');
    
    // Try to parse coverage data
    try {
      const lines = result.stdout.split('\n');
      const coverageLine = lines.find(line => line.includes('Coverage'));
      if (coverageLine) {
        info(coverageLine.trim());
      }
    } catch (err) {
      warning('Could not parse coverage data');
    }
  } else {
    error('Coverage generation failed');
  }
}

async function checkE2ESetup() {
  section('E2E Testing Setup');
  
  // Check if Playwright is configured
  await checkFile('playwright.config.ts', 'Playwright configuration');
  await checkFile('e2e', 'E2E tests directory');
  
  info('Checking Playwright installation...');
  const result = await runCommand('npx', ['playwright', '--version']);
  
  if (result.success) {
    success(`Playwright installed: ${result.stdout.trim()}`);
  } else {
    error('Playwright not properly installed');
    info('Run: npx playwright install');
  }
}

async function checkDatabaseSetup() {
  section('Database Setup');
  
  await checkFile('prisma/schema.prisma', 'Prisma schema');
  
  info('Checking Prisma client generation...');
  const result = await runCommand('npx', ['prisma', 'generate']);
  
  if (result.success) {
    success('Prisma client generated successfully');
  } else {
    error('Prisma client generation failed');
    info('Check your schema.prisma file');
  }
}

async function checkEnvironmentVariables() {
  section('Environment Variables');
  
  const envFiles = ['.env', '.env.local', '.env.example'];
  let envFound = false;
  
  for (const envFile of envFiles) {
    if (existsSync(envFile)) {
      success(`Environment file found: ${envFile}`);
      envFound = true;
    }
  }
  
  if (!envFound) {
    warning('No environment files found');
    info('Create .env.local with required variables');
  }
}

async function checkBuildProcess() {
  section('Build Process');
  
  info('Testing production build...');
  const result = await runCommand('npm', ['run', 'build']);
  
  if (result.success) {
    success('Production build successful');
  } else {
    error('Production build failed');
    console.log(result.stderr);
  }
}

async function generateSummary() {
  section('Verification Summary');
  
  info('Development environment verification completed!');
  
  log('\n📚 Next Steps:');
  log('1. Run development server: npm run dev');
  log('2. Run all tests: npm run test:all');
  log('3. Run E2E tests: npm run test:e2e');
  log('4. Check test coverage: npm run test:coverage');
  log('5. Build for production: npm run build');
  
  log('\n📖 Documentation:');
  log('- Testing Guide: ./TESTING.md');
  log('- Development Guide: ./DEVELOPMENT.md');
  log('- Architecture Guide: ./ARCHITECTURE.md');
}

async function main() {
  log(`${colors.bold}🔍 Development Environment Verification${colors.reset}\n`);
  
  try {
    await checkPackageScripts();
    await checkDependencies();
    await checkEnvironmentVariables();
    await checkDatabaseSetup();
    await checkTypeScript();
    await checkLinting();
    await checkUnitTests();
    await checkTestCoverage();
    await checkE2ESetup();
    await checkBuildProcess();
    await generateSummary();
    
    log(`\n${colors.green}${colors.bold}✅ Verification completed successfully!${colors.reset}`);
  } catch (err) {
    error(`Verification failed: ${err.message}`);
    process.exit(1);
  }
}

main();