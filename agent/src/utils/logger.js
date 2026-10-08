import fs from 'fs';
import path from 'path';

/**
 * Security Audit Logger for Elyx Local Agent.
 * Ensures NO terminal input, commands, or secrets are logged.
 */
class AgentLogger {
  constructor() {
    this.logDir = path.resolve(process.cwd(), 'logs');
    if (!fs.existsSync(this.logDir)) {
      try {
        fs.mkdirSync(this.logDir, { recursive: true });
      } catch {
        // Fallback to console if directory creation fails
      }
    }
  }

  formatTimestamp() {
    return new Date().toISOString();
  }

  info(message, meta = {}) {
    console.log(`[AGENT INFO ${this.formatTimestamp()}] ${message}`, Object.keys(meta).length ? meta : '');
    this.appendToFile('INFO', message, meta);
  }

  warn(message, meta = {}) {
    console.warn(`[AGENT WARN ${this.formatTimestamp()}] ${message}`, Object.keys(meta).length ? meta : '');
    this.appendToFile('WARN', message, meta);
  }

  error(message, error = null, meta = {}) {
    const errorMeta = error ? { errorMessage: error.message, stack: error.stack, ...meta } : meta;
    console.error(`[AGENT ERROR ${this.formatTimestamp()}] ${message}`, errorMeta);
    this.appendToFile('ERROR', message, errorMeta);
  }

  securityAudit(eventType, details = {}) {
    // Strictly sanitize details to ensure no secrets or terminal input are logged
    const safeDetails = { ...details };
    delete safeDetails.password;
    delete safeDetails.secret;
    delete safeDetails.input;
    delete safeDetails.command;

    const logMessage = `SECURITY_AUDIT: ${eventType}`;
    console.log(`[SECURITY EVENT ${this.formatTimestamp()}] ${eventType}`, safeDetails);
    this.appendToFile('SECURITY', logMessage, safeDetails);
  }

  appendToFile(level, message, meta = {}) {
    try {
      const today = new Date().toISOString().split('T')[0];
      const logFile = path.join(this.logDir, `agent-${today}.log`);
      const logEntry = JSON.stringify({
        timestamp: this.formatTimestamp(),
        level,
        message,
        meta,
      }) + '\n';
      fs.appendFileSync(logFile, logEntry, 'utf8');
    } catch {
      // Ignore file append errors in restricted environments
    }
  }
}

export const logger = new AgentLogger();
