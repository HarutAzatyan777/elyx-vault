import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import { logger } from './utils/logger.js';
import { deviceIdentity } from './devices/deviceIdentity.js';
import { createAgentServer } from './server.js';

dotenv.config();

// Read config.json if available
let config = {};
const configPath = path.resolve(process.cwd(), 'config.json');
if (fs.existsSync(configPath)) {
  try {
    const raw = fs.readFileSync(configPath, 'utf8');
    config = JSON.parse(raw);
    logger.info('Loaded config.json', { configPath });
  } catch (err) {
    logger.warn('Failed to parse config.json, using defaults', { error: err.message });
  }
}

const identity = deviceIdentity.getIdentity();

logger.info('Starting Elyx Local Agent...', {
  deviceId: identity.deviceId,
  deviceName: identity.name,
  platform: identity.platform,
});

const { server, port } = createAgentServer(config);

server.listen(port, () => {
  console.log(`
  =============================================================
  🚀 ELYX LOCAL AGENT IS RUNNING & ONLINE!
  =============================================================
  Device ID    : ${identity.deviceId}
  Device Name  : ${identity.name}
  Platform     : ${identity.platform} (${identity.arch})
  Port         : ${port}
  Health URL   : http://localhost:${port}/health
  Tailscale    : ${process.env.TAILSCALE_DOMAIN || 'Not configured'}
  =============================================================
  `);
});

// Handle graceful shutdown
const shutdown = (signal) => {
  logger.info(`Received ${signal}. Shutting down Elyx Local Agent...`);
  server.close(() => {
    logger.info('Server stopped safely.');
    process.exit(0);
  });
};

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));
