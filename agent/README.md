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
