import pty from 'node-pty';
import os from 'os';
import path from 'path';
import { logger } from '../utils/logger.js';
import { validateDirectoryPath } from '../security/pathValidator.js';

class PtySessionManager {
  constructor() {
    this.sessions = new Map(); // sessionId -> { ptyProcess, ws, lastActivity, timeoutTimer }
  }

  createSession({ sessionId, cwd, cols = 80, rows = 24, ws, allowedDirectories = [], idleTimeoutMs = 900000 }) {
    if (this.sessions.has(sessionId)) {
      this.closeSession(sessionId, 'Replacing existing session');
    }

    // Validate directory path
    const pathResult = validateDirectoryPath(cwd || process.cwd(), allowedDirectories);
    const initialCwd = pathResult.valid ? pathResult.resolvedPath : process.cwd();

    // Determine shell executable (prefer powershell.exe on Windows)
    const isWindows = os.platform() === 'win32';
    const shell = isWindows
      ? process.env.SHELL_PATH || 'powershell.exe'
      : process.env.SHELL_PATH || 'bash';

    const args = isWindows ? ['-NoLogo'] : [];

    logger.info('Spawning PTY session', { sessionId, shell, cwd: initialCwd, cols, rows });

    let ptyProcess;
    try {
      ptyProcess = pty.spawn(shell, args, {
        name: 'xterm-256color',
        cols: cols || 80,
        rows: rows || 24,
        cwd: initialCwd,
        env: {
          ...process.env,
          TERM: 'xterm-256color',
          COLORTERM: 'truecolor',
        },
      });
    } catch (err) {
      logger.error('Failed to spawn PTY process', err, { sessionId, shell });
      throw new Error(`Failed to spawn terminal shell process (${shell}): ${err.message}`);
    }

    const sessionObj = {
      sessionId,
      ptyProcess,
      ws,
      lastActivity: Date.now(),
      idleTimeoutMs,
      timeoutTimer: null,
    };

    // Forward PTY output data to WebSocket client
    ptyProcess.onData((data) => {
      sessionObj.lastActivity = Date.now();
      this.resetIdleTimer(sessionId);

      if (ws && ws.readyState === 1 /* OPEN */) {
        try {
          ws.send(JSON.stringify({ type: 'output', data }));
        } catch (err) {
          logger.error('Failed to send terminal data to WebSocket client', err, { sessionId });
        }
      }
    });

    // Handle PTY process exit
    ptyProcess.onExit(({ exitCode, signal }) => {
      logger.info('PTY process exited', { sessionId, exitCode, signal });
      if (ws && ws.readyState === 1) {
        ws.send(JSON.stringify({ type: 'exit', exitCode, signal }));
        ws.close(1000, 'Terminal process exited');
      }
      this.sessions.delete(sessionId);
    });

    this.sessions.set(sessionId, sessionObj);
    this.resetIdleTimer(sessionId);
    logger.securityAudit('PTY_SESSION_CREATED', { sessionId, cwd: initialCwd });

    return sessionObj;
  }

  writeInput(sessionId, inputData) {
    const session = this.sessions.get(sessionId);
    if (!session || !session.ptyProcess) return;

    session.lastActivity = Date.now();
    this.resetIdleTimer(sessionId);
    session.ptyProcess.write(inputData);
  }

  resize(sessionId, cols, rows) {
    const session = this.sessions.get(sessionId);
    if (!session || !session.ptyProcess) return;

    if (typeof cols === 'number' && typeof rows === 'number' && cols > 0 && rows > 0) {
      try {
        session.ptyProcess.resize(cols, rows);
        logger.info('PTY resized', { sessionId, cols, rows });
      } catch (err) {
        logger.error('Failed to resize PTY', err, { sessionId });
      }
    }
  }

  resetIdleTimer(sessionId) {
    const session = this.sessions.get(sessionId);
    if (!session) return;

    if (session.timeoutTimer) {
      clearTimeout(session.timeoutTimer);
    }

    session.timeoutTimer = setTimeout(() => {
      logger.warn('Session idle timeout expired', { sessionId });
      this.closeSession(sessionId, 'Idle timeout expired');
    }, session.idleTimeoutMs);
  }

  closeSession(sessionId, reason = 'Client disconnected') {
    const session = this.sessions.get(sessionId);
    if (!session) return;

    logger.info('Closing PTY session', { sessionId, reason });

    if (session.timeoutTimer) {
      clearTimeout(session.timeoutTimer);
    }

    try {
      if (session.ptyProcess) {
        session.ptyProcess.kill();
      }
    } catch (err) {
      logger.error('Error killing PTY process', err, { sessionId });
    }

    this.sessions.delete(sessionId);
    logger.securityAudit('PTY_SESSION_CLOSED', { sessionId, reason });
  }

  getActiveSessionsCount() {
    return this.sessions.size;
  }
}

export const ptyManager = new PtySessionManager();
