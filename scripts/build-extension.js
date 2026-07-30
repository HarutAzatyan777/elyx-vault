import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const ROOT_DIR = path.resolve(__dirname, '..');
const SOURCE_DIR = path.join(ROOT_DIR, 'extension');
const PUBLIC_DIR = path.join(ROOT_DIR, 'public');
const OUTPUT_ZIP = path.join(PUBLIC_DIR, 'extension.zip');

console.log('==================================================');
console.log('      Elyx Extension Automated Packager           ');
console.log('==================================================');

if (!fs.existsSync(SOURCE_DIR)) {
  console.error(`[ERROR] Extension directory not found at: ${SOURCE_DIR}`);
  process.exit(1);
}

if (!fs.existsSync(PUBLIC_DIR)) {
  fs.mkdirSync(PUBLIC_DIR, { recursive: true });
}

// Remove old zip archive if present
if (fs.existsSync(OUTPUT_ZIP)) {
  fs.unlinkSync(OUTPUT_ZIP);
}

try {
  console.log(`[Packaging] Zipping extension folder into public/extension.zip (nested inside extension/)...`);

  if (process.platform === 'win32') {
    // Passing SOURCE_DIR (without \*) embeds the extension/ root directory inside the zip
    const psCommand = `powershell -Command "Compress-Archive -Path '${SOURCE_DIR}' -DestinationPath '${OUTPUT_ZIP}' -Force"`;
    execSync(psCommand, { stdio: 'inherit' });
  } else {
    // Passing extension relative to ROOT_DIR embeds the extension/ root directory inside the zip
    const zipCommand = `zip -r "${OUTPUT_ZIP}" extension`;
    execSync(zipCommand, { cwd: ROOT_DIR, stdio: 'inherit' });
  }

  if (fs.existsSync(OUTPUT_ZIP)) {
    const stats = fs.statSync(OUTPUT_ZIP);
    console.log(`\n[SUCCESS] extension.zip created successfully! (${(stats.size / 1024).toFixed(2)} KB)`);
    console.log(`Output Path: ${OUTPUT_ZIP}\n`);
  } else {
    throw new Error('Output zip file was not generated.');
  }
} catch (err) {
  console.error('[ERROR] Failed to package extension:', err.message);
  process.exit(1);
}
