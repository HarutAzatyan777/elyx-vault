import { reportAgentConnection } from '../os/agentStatus.js';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Terminal } from '@xterm/xterm';
import { FitAddon } from '@xterm/addon-fit';
import { WebLinksAddon } from '@xterm/addon-web-links';
import { useAuth } from './useAuth.jsx';
import { logSecurityEvent } from '../services/deviceService.js';

export function useRemoteTerminal(device, workingDirectory) {
  const { user, access } = useAuth();
  const uid = user?.uid;

  const [connected, setConnected] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [error, setError] = useState(null);
  const [sessionStartTime, setSessionStartTime] = useState(null);
  const [sessionDurationSec, setSessionDurationSec] = useState(0);

  const resizeCleanupRef = useRef(() => {});
  const attemptRef = useRef(0);
  const abortRef = useRef(null);
  const xtermInstanceRef = useRef(null);
  const fitAddonRef = useRef(null);
  const wsRef = useRef(null);

  const statusId = useRef(Symbol('terminal'));
  useEffect(() => {
    reportAgentConnection(statusId.current, connected);
    return () => reportAgentConnection(statusId.current, false);
  }, [connected]);
  // Session Duration Ticker
  useEffect(() => {
    if (!connected || !sessionStartTime) {
      setSessionDurationSec(0);
      return;
    }

    const timer = setInterval(() => {
      setSessionDurationSec(Math.floor((Date.now() - sessionStartTime) / 1000));
    }, 1000);

    return () => clearInterval(timer);
  }, [connected, sessionStartTime]);

  // Connect to Local Agent WSS
  const connect = useCallback(async () => {
    if (
      !device ||
      !user ||
      access?.status !== 'active' ||
      !['owner', 'manager'].includes(access.role)
    ) {
      setError('Terminal access denied.');
      return;
    }
    if (!device.deviceId) {
      setError(
        'This device needs its Agent Device ID configured before connecting.',
      );
      return;
    }

    const attempt = ++attemptRef.current;
    abortRef.current?.abort();
    abortRef.current = new AbortController();
    setConnecting(true);
    setError(null);

    const port = device.agentPort || 9090;
    const ip = device.tailscaleIp || '127.0.0.1';
    const cwdParam = encodeURIComponent(workingDirectory || '');

    // Determine connection protocol (wss:// for HTTPS domain, ws:// for IP/localhost)
    let wsUrl = `ws://${ip}:${port}?cwd=${cwdParam}&cols=80&rows=24`;

    if (device.tailscaleDomain) {
      wsUrl = `wss://${device.tailscaleDomain}:${port}?cwd=${cwdParam}&cols=80&rows=24`;
    }

    const agentUrl = new URL(wsUrl);
    if (
      agentUrl.protocol === 'ws:' &&
      !['localhost', '127.0.0.1', '[::1]'].includes(agentUrl.hostname)
    ) {
      setConnecting(false);
      setError('Remote agents require a TLS endpoint (wss/https).');
      return;
    }
    // Authentication failure never falls back to a development token.
    let token;
    try {
      const endpoint = new URL(wsUrl);
      endpoint.protocol = endpoint.protocol === 'wss:' ? 'https:' : 'http:';
      endpoint.pathname = '/api/auth/token';
      endpoint.search = '';
      const idToken = await user.getIdToken();
      const response = await fetch(endpoint, {
        method: 'POST',
        signal: abortRef.current.signal,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${idToken}`,
        },
        body: JSON.stringify({ deviceRecordId: device.id }),
      });
      if (!response.ok)
        throw new Error(
          'Agent authorization failed. Verify enrollment and Firebase configuration.',
        );
      const body = await response.json();
      if (!body.token)
        throw new Error('Agent did not return an authorized session token.');
      token = body.token;
    } catch {
      setConnecting(false);
      setError(
        'Agent authorization failed. Verify enrollment, connection, and Firebase configuration.',
      );
      return;
    }
    if (attempt !== attemptRef.current) return;

    try {
      if (wsRef.current) {
        wsRef.current.close();
      }

      const ws = new WebSocket(wsUrl, ['elyx-terminal', token]);
      wsRef.current = ws;

      ws.onopen = () => {
        if (attempt !== attemptRef.current) ws.close();
      };

      ws.onmessage = (event) => {
        if (attempt !== attemptRef.current) return;
        try {
          const msg = JSON.parse(event.data);
          if (msg.type === 'connected') {
            setConnected(true);
            setConnecting(false);
            setSessionStartTime(Date.now());
            logSecurityEvent(
              uid,
              'TERMINAL_CONNECTED',
              'Authorized terminal connected',
              { deviceId: device.id },
            );
          } else if (msg.type === 'output' && xtermInstanceRef.current) {
            xtermInstanceRef.current.write(msg.data);
          } else if (msg.type === 'exit') {
            if (xtermInstanceRef.current) {
              xtermInstanceRef.current.write(
                '\r\n\x1b[33m⚡ Terminal process exited.\x1b[0m\r\n',
              );
            }
            setConnected(false);
          } else if (msg.type === 'error') {
            setError(msg.message);
            if (xtermInstanceRef.current) {
              xtermInstanceRef.current.write(
                '\r\n\x1b[31m❌ Agent Error: ' + msg.message + '\x1b[0m\r\n',
              );
            }
          }
        } catch {
          // Direct text output fallback
          if (xtermInstanceRef.current) {
            xtermInstanceRef.current.write(event.data);
          }
        }
      };

      ws.onerror = () => {
        setConnecting(false);
        setError(
          `Failed to connect to agent at ${ip}:${port}. Ensure Elyx Local Agent is running.`,
        );
        if (xtermInstanceRef.current) {
          xtermInstanceRef.current.write(
            '\r\n\x1b[31m❌ Connection Error: Ensure Elyx Agent is running on ' +
              ip +
              ':' +
              port +
              '\x1b[0m\r\n',
          );
        }
      };

      ws.onclose = () => {
        setConnected(false);
        setConnecting(false);
        logSecurityEvent(
          uid,
          'TERMINAL_DISCONNECTED',
          `Disconnected terminal session on "${device.name}"`,
          {
            deviceId: device.id,
          },
        );
      };
    } catch (err) {
      setConnecting(false);
      setError(err.message || 'Failed to initialize WebSocket');
    }
  }, [device, workingDirectory, uid, user, access?.status, access?.role]);

  const disconnect = useCallback(() => {
    ++attemptRef.current;
    abortRef.current?.abort();
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
    setConnected(false);
  }, []);

  const sendInput = useCallback((data) => {
    if (wsRef.current && wsRef.current.readyState === 1) {
      wsRef.current.send(JSON.stringify({ type: 'input', data }));
    }
  }, []);

  const sendCtrlC = useCallback(() => {
    sendInput('\x03'); // ASCII Ctrl+C
  }, [sendInput]);

  const clearTerminal = useCallback(() => {
    if (xtermInstanceRef.current) {
      xtermInstanceRef.current.clear();
    }
  }, []);

  const resizeTerminal = useCallback((cols, rows) => {
    if (wsRef.current && wsRef.current.readyState === 1) {
      wsRef.current.send(JSON.stringify({ type: 'resize', cols, rows }));
    }
  }, []);

  // Initialize xterm.js UI instance
  const attachTerminal = useCallback(
    (containerElement) => {
      if (!containerElement || xtermInstanceRef.current) return;

      const term = new Terminal({
        cursorBlink: true,
        cursorStyle: 'block',
        fontFamily: 'JetBrains Mono, Menlo, Monaco, Consolas, monospace',
        fontSize: 14,
        theme: {
          background: '#0d0d15',
          foreground: '#e2e8f0',
          cursor: '#8b5cf6',
          selectionBackground: '#8b5cf64d',
          black: '#1e293b',
          red: '#ef4444',
          green: '#10b981',
          yellow: '#f59e0b',
          blue: '#3b82f6',
          magenta: '#a855f7',
          cyan: '#06b6d4',
          white: '#f8fafc',
        },
      });

      const fitAddon = new FitAddon();
      const webLinksAddon = new WebLinksAddon();

      term.loadAddon(fitAddon);
      term.loadAddon(webLinksAddon);

      term.open(containerElement);
      fitAddon.fit();

      xtermInstanceRef.current = term;
      fitAddonRef.current = fitAddon;

      term.onData((data) => {
        sendInput(data);
      });

      term.onResize(({ cols, rows }) => {
        resizeTerminal(cols, rows);
      });

      term.writeln(
        '\x1b[35m=== Elyx Vault Remote PowerShell Terminal ===\x1b[0m',
      );
      term.writeln(
        'Select an enrolled device and click Connect to start interactive session.\r\n',
      );

      // Handle container window resize
      const handleWindowResize = () => {
        if (fitAddonRef.current && xtermInstanceRef.current) {
          try {
            fitAddonRef.current.fit();
          } catch {
            // Container hidden
          }
        }
      };

      window.addEventListener('resize', handleWindowResize);
      resizeCleanupRef.current = () =>
        window.removeEventListener('resize', handleWindowResize);
    },
    [sendInput, resizeTerminal],
  );

  useEffect(() => {
    return () => {
      disconnect();
      resizeCleanupRef.current();
      xtermInstanceRef.current?.dispose();
      xtermInstanceRef.current = null;
      fitAddonRef.current = null;
    };
  }, [disconnect]);
  useEffect(() => {
    if (
      access?.status !== 'active' ||
      !['owner', 'manager'].includes(access?.role)
    )
      disconnect();
  }, [access?.status, access?.role, disconnect]);

  return {
    connected,
    connecting,
    error,
    sessionDurationSec,
    connect,
    disconnect,
    sendInput,
    sendCtrlC,
    clearTerminal,
    attachTerminal,
  };
}
