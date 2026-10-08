import express from 'express';
import http from 'http';
import { WebSocketServer } from 'ws';
import cors from 'cors';
import fs from 'fs';
import path from 'path';
import { logger } from './utils/logger.js';
import { deviceIdentity } from './devices/deviceIdentity.js';
import { rateLimiter } from './security/rateLimiter.js';
import { verifySessionToken, generateSessionToken } from './auth/tokenVerifier.js';
import { ptyManager } from './terminal/ptyManager.js';

export function createAgentServer(config = {}) {
  const app = express();
  app.use(express.json());
  app.use(cors({ origin: '*' }));

  const port = config.port || process.env.PORT || 9090;
  const allowedDirectories = config.allowedDirectories || [
    process.cwd(),
    'D:\\VAHAG\\elyx-vault\\elyx-vault',
    'D:\\VAHAG\\malongo',
  ];
  const maxConcurrentSessions = config.maxConcurrentSessions || 3;

  // In-memory enrollment challenges
  const activeChallenges = new Map();

  /* -------------------------------------------------------------------------- */
  /* HTTP ENDPOINTS                                                            */
  /* -------------------------------------------------------------------------- */

  // 1. Health check & agent metadata
  app.get('/health', (req, res) => {
    const identity = deviceIdentity.getIdentity();
    res.json({
      status: 'online',
      version: '1.0.0',
      deviceId: identity.deviceId,
      deviceName: identity.name,
      platform: identity.platform,
      arch: identity.arch,
      activeSessions: ptyManager.getActiveSessionsCount(),
      allowedDirectoriesCount: allowedDirectories.length,
      timestamp: new Date().toISOString(),
    });
  });

  // 2. Allowed directories whitelist for frontend selection
  app.get('/api/directories', (req, res) => {
    res.json({
      directories: allowedDirectories.map((dirPath) => {
        const exists = fs.existsSync(dirPath);
        return {
          id: dirPath,
          path: dirPath,
          name: path.basename(dirPath) || dirPath,
          exists,
        };
      }),
    });
  });

  // 3. Initiate Enrollment Challenge
  app.post('/api/enroll/challenge', (req, res) => {
    const challenge = `chal_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    activeChallenges.set(challenge, {
      createdAt: Date.now(),
      expiresAt: Date.now() + 5 * 60 * 1000, // 5 minutes
    });

    logger.securityAudit('ENROLLMENT_CHALLENGE_CREATED', { challenge });
    res.json({
      status: 'success',
      challenge,
      device: deviceIdentity.getIdentity(),
    });
  });

  // 4. Request Short-Lived Session Auth Token
  app.post('/api/auth/token', (req, res) => {
    const { uid, deviceId, userEmail } = req.body;
    const currentDevice = deviceIdentity.getIdentity();

    if (deviceId && deviceId !== currentDevice.deviceId) {
      return res.status(403).json({ error: 'Device ID mismatch' });
    }

    const token = generateSessionToken({
      uid: uid || 'anonymous_user',
      deviceId: currentDevice.deviceId,
      userEmail: userEmail || '',
    });

    logger.securityAudit('SESSION_TOKEN_ISSUED', { uid, deviceId: currentDevice.deviceId });
    res.json({
      status: 'success',
      token,
      expiresIn: '4h',
      deviceId: currentDevice.deviceId,
    });
  });

  /* -------------------------------------------------------------------------- */
  /* WEBSOCKET SERVER                                                           */
  /* -------------------------------------------------------------------------- */

  const server = http.createServer(app);
  const wss = new WebSocketServer({ noServer: true });

  // Handle HTTP upgrade to WebSocket
  server.on('upgrade', (request, socket, head) => {
    const ip = request.socket.remoteAddress || 'unknown';
    const origin = request.headers.origin || '';

    if (rateLimiter.isRateLimited(ip)) {
      socket.write('HTTP/1.1 429 Too Many Requests\r\n\r\n');
      socket.destroy();
      return;
    }

    if (!rateLimiter.validateOrigin(origin, config.allowedOrigins)) {
      socket.write('HTTP/1.1 403 Forbidden\r\n\r\n');
      socket.destroy();
      return;
    }

    if (ptyManager.getActiveSessionsCount() >= maxConcurrentSessions) {
      logger.warn('Max concurrent sessions reached. Rejecting connection', { ip });
      socket.write('HTTP/1.1 503 Service Unavailable\r\n\r\n');
      socket.destroy();
      return;
    }

    wss.handleUpgrade(request, socket, head, (ws) => {
      wss.emit('connection', ws, request);
    });
  });

  wss.on('connection', (ws, request) => {
    const urlParams = new URLSearchParams(request.url.replace(/^[^?]*\?/, ''));
    const token = urlParams.get('token');
    const requestedCwd = urlParams.get('cwd') || allowedDirectories[0] || process.cwd();
    const cols = parseInt(urlParams.get('cols') || '80', 10);
    const rows = parseInt(urlParams.get('rows') || '24', 10);

    // Verify authentication token
    const authResult = verifySessionToken(token);
    if (!authResult.valid) {
      logger.warn('WebSocket connection rejected: invalid token', { error: authResult.error });
      ws.send(JSON.stringify({ type: 'error', message: authResult.error }));
      ws.close(4001, 'Unauthorized');
      return;
    }

    const sessionId = `sess_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    logger.info('WebSocket client connected', { sessionId, uid: authResult.payload.uid });

    let sessionObj;
    try {
      sessionObj = ptyManager.createSession({
        sessionId,
        cwd: requestedCwd,
        cols,
        rows,
        ws,
        allowedDirectories,
      });

      ws.send(JSON.stringify({
        type: 'connected',
        sessionId,
        deviceId: deviceIdentity.getIdentity().deviceId,
        cwd: requestedCwd,
      }));
    } catch (err) {
      ws.send(JSON.stringify({ type: 'error', message: err.message }));
      ws.close(1011, 'Internal Error');
      return;
    }

    // Process incoming WebSocket messages from client
    ws.on('message', (messageRaw) => {
      try {
        const msg = JSON.parse(messageRaw.toString());

        switch (msg.type) {
          case 'input':
            if (typeof msg.data === 'string') {
              ptyManager.writeInput(sessionId, msg.data);
            }
            break;
          case 'resize':
            if (typeof msg.cols === 'number' && typeof msg.rows === 'number') {
              ptyManager.resize(sessionId, msg.cols, msg.rows);
            }
            break;
          case 'ping':
            ws.send(JSON.stringify({ type: 'pong', timestamp: Date.now() }));
            break;
          default:
            logger.warn('Unknown message type received', { type: msg.type });
            break;
        }
      } catch (err) {
        logger.error('Failed to parse WebSocket message', err);
      }
    });

    ws.on('close', (code, reason) => {
      logger.info('WebSocket client disconnected', { sessionId, code, reason: reason.toString() });
      ptyManager.closeSession(sessionId, 'WebSocket closed');
    });

    ws.on('error', (err) => {
      logger.error('WebSocket error', err, { sessionId });
      ptyManager.closeSession(sessionId, 'WebSocket error');
    });
  });

  return { app, server, port };
}
