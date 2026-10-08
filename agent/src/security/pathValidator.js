import path from 'path';
import fs from 'fs';
import { logger } from '../utils/logger.js';

/**
 * Validates and canonicalizes working directories against configured allowed project paths.
 */
export function validateDirectoryPath(requestedPath, allowedDirectories = []) {
  if (!requestedPath || typeof requestedPath !== 'string') {
    return { valid: false, error: 'Path must be a non-empty string' };
  }

  try {
    // Resolve absolute normalized path
    const normalizedTarget = path.normalize(path.resolve(requestedPath));

    // Check if target directory exists on disk
    if (!fs.existsSync(normalizedTarget)) {
      return { valid: false, error: `Directory does not exist: ${normalizedTarget}` };
    }

    const stat = fs.statSync(normalizedTarget);
    if (!stat.isDirectory()) {
      return { valid: false, error: `Path is not a directory: ${normalizedTarget}` };
    }

    // Default fallback if no allowed list configured: default to process cwd or root drive
    if (!allowedDirectories || allowedDirectories.length === 0) {
      return { valid: true, resolvedPath: normalizedTarget };
    }

    // Check if requested path is inside or equals any allowed directory
    const isAllowed = allowedDirectories.some((allowedDir) => {
      const normalizedAllowed = path.normalize(path.resolve(allowedDir));
      const relative = path.relative(normalizedAllowed, normalizedTarget);
      return relative === '' || (!relative.startsWith('..') && !path.isAbsolute(relative));
    });

    if (!isAllowed) {
      logger.warn('Unauthorized directory access attempt blocked', { requestedPath, normalizedTarget });
      return { valid: false, error: `Directory is not in authorized list: ${normalizedTarget}` };
    }

    return { valid: true, resolvedPath: normalizedTarget };
  } catch (err) {
    logger.error('Path validation exception', err, { requestedPath });
    return { valid: false, error: 'Failed to validate directory path' };
  }
}
