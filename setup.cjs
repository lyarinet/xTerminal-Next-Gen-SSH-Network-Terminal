#!/usr/bin/env node
/**
 * xTerminal - Universal Multi-Platform Environment Setup & Diagnostics
 * Works on: Windows, Linux (Debian/Ubuntu/Fedora/Arch), macOS
 */

const fs = require('fs');
const path = require('path');
const { execSync, spawn } = require('child_process');
const readline = require('readline');
const os = require('os');

const ROOT_DIR = path.resolve(__dirname);

// ANSI Colors
const colors = {
  reset: '\x1b[0m',
  bold: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  white: '\x1b[37m',
  gray: '\x1b[90m',
};

function banner() {
  console.log(`\n${colors.cyan}=====================================================================${colors.reset}`);
  console.log(`${colors.green}${colors.bold}    __   _______                   _             _                   ${colors.reset}`);
  console.log(`${colors.green}${colors.bold}    \\ \\ / /_   _|__ _ __ _ __ ___ (_)_ __   __ _| |                  ${colors.reset}`);
  console.log(`${colors.green}${colors.bold}     \\ V /  | |/ _ \\ '__| '_ \` _ \\| | '_ \\ / _\` | |                  ${colors.reset}`);
  console.log(`${colors.green}${colors.bold}      | |   | |  __/ |  | | | | | | | | | | (_| | |                  ${colors.reset}`);
  console.log(`${colors.green}${colors.bold}      |_|   |_|\\___|_|  |_| |_| |_|_|_| |_|\\__,_|_| PRO              ${colors.reset}`);
  console.log(`${colors.cyan}=====================================================================${colors.reset}`);
  console.log(`${colors.gray}   Universal Automated Fresh PC Setup (Windows, Linux, macOS)${colors.reset}`);
  console.log(`${colors.yellow}   OS Detected: ${os.type()} (${os.platform()} ${os.arch()}) | Node: ${process.version}${colors.reset}`);
  console.log(`${colors.cyan}=====================================================================\n${colors.reset}`);
}

function runCommand(cmd, options = {}) {
  try {
    return {
      success: true,
      output: execSync(cmd, { cwd: ROOT_DIR, encoding: 'utf8', stdio: 'pipe', ...options }).trim(),
    };
  } catch (err) {
    return {
      success: false,
      error: err.message,
      output: err.stdout ? err.stdout.toString() : '',
    };
  }
}

function askQuestion(query) {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });
  return new Promise((resolve) =>
    rl.question(query, (ans) => {
      rl.close();
      resolve(ans.trim());
    })
  );
}

async function checkPrerequisites() {
  console.log(`${colors.bold}[1/4] Checking System Toolchain Prerequisites...${colors.reset}`);
  let allGood = true;

  // 1. Node.js check
  const nodeVer = process.version;
  const majorNode = parseInt(nodeVer.replace('v', '').split('.')[0], 10);
  if (majorNode >= 18) {
    console.log(`  ${colors.green}✔${colors.reset} Node.js Runtime: ${colors.bold}${nodeVer}${colors.reset} (LTS Ready)`);
  } else {
    console.log(`  ${colors.red}✖${colors.reset} Node.js Runtime: ${colors.bold}${nodeVer}${colors.reset} (Requires v18+, Recommended v20 or v22 LTS)`);
    allGood = false;
  }

  // 2. npm check
  const npmCheck = runCommand('npm --version');
  if (npmCheck.success) {
    console.log(`  ${colors.green}✔${colors.reset} npm Package Manager: ${colors.bold}v${npmCheck.output}${colors.reset}`);
  } else {
    console.log(`  ${colors.red}✖${colors.reset} npm: Not found in PATH`);
    allGood = false;
  }

  // 3. Git check
  const gitCheck = runCommand('git --version');
  if (gitCheck.success) {
    console.log(`  ${colors.green}✔${colors.reset} Git Version Control: ${colors.bold}${gitCheck.output}${colors.reset}`);
  } else {
    console.log(`  ${colors.yellow}⚠${colors.reset} Git: Not found in PATH (Recommended for updating repository)`);
  }

  // 4. Python check (for native build tools)
  const pyCheck = runCommand('python3 --version') || runCommand('python --version');
  if (pyCheck.success) {
    console.log(`  ${colors.green}✔${colors.reset} Python: ${colors.bold}${pyCheck.output}${colors.reset}`);
  } else {
    console.log(`  ${colors.gray}ℹ${colors.reset} Python: Not found (Only required if compiling native node-gyp C++ addons)`);
  }

  // 5. C/C++ Build Tools check
  if (os.platform() === 'win32') {
    const clCheck = runCommand('where cl.exe');
    if (clCheck.success) {
      console.log(`  ${colors.green}✔${colors.reset} Visual Studio C++ Compiler: Detected`);
    } else {
      console.log(`  ${colors.gray}ℹ${colors.reset} MSVC C++ Build Tools: Optional (Pure-JS fallbacks active for prebuilt binaries)`);
    }
  } else if (os.platform() === 'linux') {
    const gccCheck = runCommand('gcc --version');
    if (gccCheck.success) {
      console.log(`  ${colors.green}✔${colors.reset} GCC Compiler: Detected`);
    } else {
      console.log(`  ${colors.yellow}⚠${colors.reset} GCC Compiler: Not installed (Run: sudo apt install build-essential)`);
    }
  } else if (os.platform() === 'darwin') {
    const xcodeCheck = runCommand('xcode-select -p');
    if (xcodeCheck.success) {
      console.log(`  ${colors.green}✔${colors.reset} Xcode Command Line Tools: Detected`);
    } else {
      console.log(`  ${colors.yellow}⚠${colors.reset} Xcode Tools: Not installed (Run: xcode-select --install)`);
    }
  }

  console.log('');
  return allGood;
}

function setupEnvironmentFile() {
  console.log(`${colors.bold}[2/4] Initializing Environment Configuration (.env)...${colors.reset}`);
  const envPath = path.join(ROOT_DIR, '.env');
  const envExamplePath = path.join(ROOT_DIR, '.env.example');

  if (fs.existsSync(envPath)) {
    console.log(`  ${colors.green}✔${colors.reset} Existing .env configuration file found.`);
  } else if (fs.existsSync(envExamplePath)) {
    try {
      fs.copyFileSync(envExamplePath, envPath);
      console.log(`  ${colors.green}✔${colors.reset} Created default ${colors.bold}.env${colors.reset} from .env.example template.`);
    } catch (e) {
      console.log(`  ${colors.red}✖${colors.reset} Could not create .env: ${e.message}`);
    }
  } else {
    // Generate minimal .env
    try {
      fs.writeFileSync(envPath, '# xTerminal Configuration\nPORT=3000\nHTTPS_PORT=3443\nNODE_ENV=development\n');
      console.log(`  ${colors.green}✔${colors.reset} Generated minimal .env file.`);
    } catch (e) {
      console.log(`  ${colors.yellow}⚠${colors.reset} Notice: ${e.message}`);
    }
  }
  console.log('');
}

async function installDependencies() {
  console.log(`${colors.bold}[3/4] Checking and Installing Node Dependencies...${colors.reset}`);
  const nodeModulesPath = path.join(ROOT_DIR, 'node_modules');
  const hasModules = fs.existsSync(nodeModulesPath);

  if (hasModules) {
    console.log(`  ${colors.green}✔${colors.reset} 'node_modules' directory already present.`);
    const ans = await askQuestion(`  ${colors.yellow}? Reinstall or update dependencies? (y/N): ${colors.reset}`);
    if (ans.toLowerCase() !== 'y') {
      console.log(`  ${colors.gray}Skipping npm install.${colors.reset}\n`);
      return true;
    }
  }

  console.log(`  ${colors.cyan}Running: npm install... (Please wait)${colors.reset}`);
  try {
    execSync('npm install', { cwd: ROOT_DIR, stdio: 'inherit' });
    console.log(`  ${colors.green}✔ All dependencies installed successfully!${colors.reset}\n`);
    return true;
  } catch (err) {
    console.log(`\n  ${colors.red}✖ Standard install encountered issues. Attempting with --legacy-peer-deps...${colors.reset}`);
    try {
      execSync('npm install --legacy-peer-deps', { cwd: ROOT_DIR, stdio: 'inherit' });
      console.log(`  ${colors.green}✔ Dependencies installed via --legacy-peer-deps!${colors.reset}\n`);
      return true;
    } catch (err2) {
      console.log(`  ${colors.red}✖ Dependency installation failed: ${err2.message}${colors.reset}\n`);
      return false;
    }
  }
}

async function verifyBuild() {
  console.log(`${colors.bold}[4/4] Verifying Project Compilation & Build Engine...${colors.reset}`);
  console.log(`  ${colors.cyan}Running: npm run build...${colors.reset}`);
  try {
    execSync('npm run build', { cwd: ROOT_DIR, stdio: 'inherit' });
    console.log(`  ${colors.green}✔ Production frontend and server bundles compiled with 0 errors!${colors.reset}\n`);
    return true;
  } catch (e) {
    console.log(`  ${colors.red}✖ Build test failed. Check the error log above.${colors.reset}\n`);
    return false;
  }
}

async function interactiveMenu() {
  console.log(`${colors.cyan}=====================================================================${colors.reset}`);
  console.log(`${colors.green}${colors.bold} [SUCCESS] xTerminal Environment Setup is Complete!${colors.reset}`);
  console.log(`${colors.cyan}=====================================================================${colors.reset}`);
  console.log(`${colors.white}What would you like to do next?${colors.reset}`);
  console.log(`  ${colors.bold}1)${colors.reset} Start Development Server (${colors.cyan}npm run dev${colors.reset})`);
  console.log(`  ${colors.bold}2)${colors.reset} Start Production Server (${colors.cyan}npm start${colors.reset})`);
  console.log(`  ${colors.bold}3)${colors.reset} Build Desktop Executable / Installer (${colors.cyan}Windows/Linux/Mac${colors.reset})`);
  console.log(`  ${colors.bold}4)${colors.reset} Exit\n`);

  const choice = await askQuestion(`${colors.yellow}Select an option [1-4] (Default: 1): ${colors.reset}`);

  if (choice === '2') {
    console.log(`\n${colors.green}Starting production server on http://localhost:3000...${colors.reset}`);
    spawn('npm', ['start'], { cwd: ROOT_DIR, stdio: 'inherit', shell: true });
  } else if (choice === '3') {
    if (os.platform() === 'win32') {
      console.log(`\n${colors.green}Launching Windows Multi-Platform Build Engine...${colors.reset}`);
      spawn('powershell', ['-ExecutionPolicy', 'Bypass', '-File', './build.ps1'], {
        cwd: ROOT_DIR,
        stdio: 'inherit',
        shell: true,
      });
    } else {
      console.log(`\n${colors.green}Packaging desktop binary via electron-builder...${colors.reset}`);
      spawn('npm', ['run', os.platform() === 'darwin' ? 'build:electron:mac' : 'build:electron:linux'], {
        cwd: ROOT_DIR,
        stdio: 'inherit',
        shell: true,
      });
    }
  } else if (choice === '4') {
    console.log(`\n${colors.gray}Setup finished. You can run 'npm run dev' or 'npm start' anytime.${colors.reset}\n`);
    process.exit(0);
  } else {
    console.log(`\n${colors.green}Launching xTerminal Development Server...${colors.reset}`);
    spawn('npm', ['run', 'dev'], { cwd: ROOT_DIR, stdio: 'inherit', shell: true });
  }
}

async function main() {
  banner();
  const prereqsOk = await checkPrerequisites();
  setupEnvironmentFile();
  const depsOk = await installDependencies();

  if (depsOk) {
    const buildOk = await verifyBuild();
    if (buildOk) {
      await interactiveMenu();
    }
  }
}

main().catch((err) => {
  console.error(`${colors.red}Fatal setup error:${colors.reset}`, err);
  process.exit(1);
});
