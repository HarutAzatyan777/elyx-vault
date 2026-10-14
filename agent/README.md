# Elyx Local Agent & Remote Terminal Guide

The **Elyx Local Agent** is a lightweight, secure Node.js daemon that runs on your local machine (Windows 10/11) to provide authorized remote terminal access and device status monitoring to Elyx Vault.

---

## 1. Prerequisites

- **Node.js**: v18.0.0 or higher
- **Windows PowerShell**: Default on Windows 10/11
- **Tailscale**: (Optional for remote access across networks) Installed and logged into your Tailnet.

---

## 2. Installation & Setup

1. Open PowerShell and navigate to the agent directory:
   ```powershell
   cd D:\VAHAG\elyx-vault\elyx-vault\agent
   ```

2. Install dependencies:
   ```powershell
   npm install
   ```

3. Create your local configuration:
   ```powershell
   Copy-Item config.json.example config.json
   Copy-Item .env.example .env
   ```

4. Edit `config.json` to whitelist your project directories:
   ```json
   {
     "deviceName": "Home PC - Windows",
     "port": 9090,
     "allowedDirectories": [
       "D:\\VAHAG\\elyx-vault\\elyx-vault",
       "D:\\VAHAG\\malongo"
     ],
     "maxConcurrentSessions": 3
   }
   ```

---

## 3. Starting the Agent

### Option A: Interactive Command Line
```powershell
npm start
```

### Option B: Background Service / PM2
```powershell
npm install -g pm2
pm2 start src/index.js --name "elyx-agent"
pm2 save
```

---

## 4. Tailscale Integration (Private Remote Access)

To access your terminal remotely outside your local network without public IP exposure:

1. Install Tailscale on your Windows PC: `https://tailscale.com/download`
2. Authenticate Tailscale:
   ```powershell
   tailscale up
   ```
3. Get your private Tailscale IP or MagicDNS hostname:
   ```powershell
   tailscale ip -4
   ```
4. Enable Tailscale Serve for HTTPS/WSS (optional, for secure browser transport):
   ```powershell
   tailscale serve wss://localhost:9090
   ```
5. Register this device in Elyx Vault under **My Devices** using your Tailscale IP or MagicDNS.

---

## 5. Security Controls Summary

- **No Public API**: Agent is bound to localhost or private Tailscale network interface.
- **Short-Lived JWT Authorization**: Every WebSocket connection requires a short-lived session token signed by Elyx Vault identity.
- **Path Whitelisting**: Terminal initial working directory must exist inside `allowedDirectories`.
- **Zero Input Logging**: Terminal input and commands are NEVER logged or stored in Firestore.
- **Least Privilege**: Runs as standard Windows user (never Administrator or SYSTEM).

## Task 09 security configuration

The agent now fails closed. Before connecting:

1. Copy `config.json.example` to `config.json`. Set `authorizedUserIds` to the specific Firebase Auth UIDs allowed to operate this machine. Find your UID in Elyx System Settings → Account. An account must also have an active `owner` or `manager` access record.
2. Set exact `allowedOrigins` for your Elyx deployment. The default empty list denies browser requests. Do not use wildcard origins.
3. Set `FIREBASE_PROJECT_ID` and configure Application Default Credentials for the same Firebase project. Keep the Admin SDK service account on the agent machine; never put it in browser code or a Vite environment variable. Give it only the server privileges it needs to verify Auth and read access/device records.
4. Register the machine in Elyx using the physical Agent Device ID printed on startup, rather than just the Firestore document ID. Older device registrations must be configured with their actual device ID before terminal access works.
5. Keep the default loopback bind (`127.0.0.1`). Remote access requires an HTTPS/WSS reverse proxy or secure Tailscale endpoint; non-loopback plaintext endpoints are rejected by the frontend.

Each connection verifies a Firebase ID token with revocation checking, an active permitted role, an explicitly paired UID, and matching approved device ownership. The signed terminal session expires after five minutes and closes at expiry. Reconnect to verify access again. Session tokens travel in a WebSocket subprotocol header, not in a URL query. Without an operator signing secret, an unpredictable per-process secret invalidates existing sessions on agent restart. This does not rotate vault encryption keys.

Allowed directories constrain initial working directories only. A terminal grants the rights of the agent process and is **not** an operating system sandbox. Run the agent under an appropriately restricted OS account. A revoked user can retain an already connected session until its five-minute expiry if their client does not disconnect; initial connection verification is not continuous server-side revocation polling.
