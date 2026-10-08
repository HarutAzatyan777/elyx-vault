import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import os from 'os';
import { logger } from '../utils/logger.js';

class DeviceIdentityManager {
  constructor() {
    this.dataPath = path.resolve(process.cwd(), 'data', 'device-identity.json');
    this.identity = null;
    this.loadOrGenerate();
  }

  loadOrGenerate() {
    try {
      const dataDir = path.dirname(this.dataPath);
      if (!fs.existsSync(dataDir)) {
        fs.mkdirSync(dataDir, { recursive: true });
      }

      if (fs.existsSync(this.dataPath)) {
        const raw = fs.readFileSync(this.dataPath, 'utf8');
        this.identity = JSON.parse(raw);
        logger.info('Loaded device identity', { deviceId: this.identity.deviceId, name: this.identity.name });
        return;
      }

      // Generate new device identity
      const deviceId = `dev_${crypto.randomBytes(12).toString('hex')}`;
      const { publicKey, privateKey } = crypto.generateKeyPairSync('rsa', {
        modulusLength: 2048,
        publicKeyEncoding: { type: 'spki', format: 'pem' },
        privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
      });

      this.identity = {
        deviceId,
        name: `${os.hostname()} (${os.type()})`,
        platform: os.platform(),
        arch: os.arch(),
        hostname: os.hostname(),
        publicKey,
        privateKey,
        createdAt: new Date().toISOString(),
      };

      fs.writeFileSync(this.dataPath, JSON.stringify(this.identity, null, 2), 'utf8');
      logger.info('Generated new device identity', { deviceId: this.identity.deviceId });
    } catch (err) {
      logger.error('Failed to load or generate device identity', err);
      // Memory fallback if disk write fails
      const deviceId = `dev_temp_${crypto.randomBytes(8).toString('hex')}`;
      this.identity = { deviceId, name: os.hostname(), platform: os.platform() };
    }
  }

  getIdentity() {
    return {
      deviceId: this.identity.deviceId,
      name: this.identity.name,
      platform: this.identity.platform,
      arch: this.identity.arch,
      hostname: this.identity.hostname,
      publicKey: this.identity.publicKey,
    };
  }

  getPrivateKey() {
    return this.identity.privateKey;
  }
}

export const deviceIdentity = new DeviceIdentityManager();
