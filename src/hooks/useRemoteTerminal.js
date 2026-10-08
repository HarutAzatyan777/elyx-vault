import { useCallback, useEffect, useRef, useState } from 'react';
import { Terminal } from '@xterm/xterm';
import { FitAddon } from '@xterm/addon-fit';
import { WebLinksAddon } from '@xterm/addon-web-links';
import { useAuth } from './useAuth.jsx';
import { logSecurityEvent } from '../services/deviceService.js';

export function useRemoteTerminal(device, workingDirectory) {
  const { user } = useAuth();
  const uid = user?.uid;

  const [connected, setConnected] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [error, setError] = useState(null);
  const [sessionStartTime, setSessionStartTime] = useState(null);
  const [sessionDurationSec, setSessionDurationSec] = useState(0);

  const terminalRef = useRef(null);
  const xtermInstanceRef = useRef(null);
  const fitAddonRef = useRef(null);
  const wsRef = useRef(null);

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
    if (!device) return;

    setConnecting(true);
    setError(null);

    const port = device.agentPort || 9090;
    const ip = device.tailscaleIp || '127.0.0.1';
    const cwdParam = encodeURIComponent(workingDirectory || '');

    // Determine connection protocol (wss:// for HTTPS domain, ws:// for IP/localhost)
    const isHttps = window.location.protocol === 'https:';
    let wsUrl = `ws://${ip}:${port}?cwd=${cwdParam}&cols=80&rows=24`;

    if (device.tailscaleDomain) {
      wsUrl = `${isHttps ? 'wss' : 'ws'}://${device.tailscaleDomain}:${port}?cwd=${cwdParam}&cols=80&rows=24`;
    }

    // Request short-lived session token from agent HTTP auth endpoint first if available
    let token = 'dev_token_sample';
    try {
      const httpUrl = `http://${ip}:${port}/api/auth/token`;
      const res = await fetch(httpUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          uid,
          deviceId: device.deviceId || device.id,
          userEmail: user?.email || '',
        }),
      }).catch(() => null);

      if (res && res.ok) {
        const body = await res.json();
        if (body.token) token = body.token;
      }
    } catch {
      // Fallback if HTTP endpoint blocked by CORS or preflight
    }

    wsUrl += `&token=${encodeURIComponent(token)}`;

    try {
      if (wsRef.current) {
        wsRef.current.close();
      }

      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        setConnected(true);
        setConnecting(false);
        setSessionStartTime(Date.now());

        if (xtermInstanceRef.current) {
          xtermInstanceRef.current.write('\r\n\x1b[32m✔ Connected to Elyx Local Agent (' + (device.name || 'Device') + ')\x1b[0m\r\n\r\n');
        }

        logSecurityEvent(uid, 'TERMINAL_CONNECTED', `Connected to remote terminal on "${device.name}"`, {
          deviceId: device.id,
          cwd: workingDirectory,
        });
      };

      ws.onmessage = (event) => {
        try {
          const msg = JSON.parse(event.data);
          if (msg.type === 'output' && xtermInstanceRef.current) {
            xtermInstanceRef.current.write(msg.data);
          } else if (msg.type === 'exit') {
            if (xtermInstanceRef.current) {
              xtermInstanceRef.current.write('\r\n\x1b[33m⚡ Terminal process exited.\x1b[0m\r\n');
            }
            setConnected(false);
          } else if (msg.type === 'error') {
            setError(msg.message);
            if (xtermInstanceRef.current) {
              xtermInstanceRef.current.write('\r\n\x1b[31m❌ Agent Error: ' + msg.message + '\x1b[0m\r\n');
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
        setError(`Failed to connect to agent at ${ip}:${port}. Ensure Elyx Local Agent is running.`);
        if (xtermInstanceRef.current) {
          xtermInstanceRef.current.write('\r\n\x1b[31m❌ Connection Error: Ensure Elyx Agent is running on ' + ip + ':' + port + '\x1b[0m\r\n');
        }
      };

      ws.onclose = () => {
        setConnected(false);
        setConnecting(false);
        logSecurityEvent(uid, 'TERMINAL_DISCONNECTED', `Disconnected terminal session on "${device.name}"`, {
          deviceId: device.id,
        });
      };
    } catch (err) {
      setConnecting(false);
      setError(err.message || 'Failed to initialize WebSocket');
    }
  }, [device, workingDirectory, uid, user?.email]);

  const disconnect = useCallback(() => {
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
  const attachTerminal = useCallback((containerElement) => {
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

    term.writeln('\x1b[35m=== Elyx Vault Remote PowerShell Terminal ===\x1b[0m');
    term.writeln('Select an enrolled device and click Connect to start interactive session.\r\n');

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
  }, [sendInput, resizeTerminal]);

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
