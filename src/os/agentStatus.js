const connections = new Map();
export function reportAgentConnection(id, connected) {
  if (connected) connections.set(id, true); else connections.delete(id);
  if (typeof window !== 'undefined') window.dispatchEvent(new Event('elyx:agent-status'));
}
export function getAgentStatus() { return connections.size ? 'Connected terminal' : 'No active terminal connection'; }
