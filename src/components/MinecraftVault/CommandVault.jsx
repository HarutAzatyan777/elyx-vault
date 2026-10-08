import React, { useState } from 'react';
import { collection, addDoc, deleteDoc, doc } from 'firebase/firestore';
import { db } from '../../config/firebase';
import { useAuth } from '../../hooks/useAuth.jsx';
import { encryptData, decryptData } from '../../utils/crypto';
import styles from './MinecraftVault.module.css';

/** Preset essential Minecraft server commands */
const PRESET_COMMANDS = [
  {
    id: 'op',
    category: 'Admin & OP',
    title: 'Op Player (Admin Grant)',
    cmd: '/op {player}',
    desc: 'Grants full administrator privileges to specified player.',
    params: [{ key: 'player', label: 'Player Username', default: 'Player1' }]
  },
  {
    id: 'deop',
    category: 'Admin & OP',
    title: 'Deop Player (Revoke Admin)',
    cmd: '/deop {player}',
    desc: 'Revokes administrator privileges from player.',
    params: [{ key: 'player', label: 'Player Username', default: 'Player1' }]
  },
  {
    id: 'tp',
    category: 'Teleportation',
    title: 'Teleport Player to Coordinates',
    cmd: '/tp {player} {x} {y} {z}',
    desc: 'Teleports target player to explicit world coordinates.',
    params: [
      { key: 'player', label: 'Player Username', default: 'Player1' },
      { key: 'x', label: 'X Coordinate', default: '100' },
      { key: 'y', label: 'Y Coordinate', default: '64' },
      { key: 'z', label: 'Z Coordinate', default: '-200' }
    ]
  },
  {
    id: 'gamemode',
    category: 'Admin & OP',
    title: 'Change Gamemode',
    cmd: '/gamemode {mode} {player}',
    desc: 'Set player gamemode (creative, survival, adventure, spectator).',
    params: [
      { key: 'mode', label: 'Gamemode', default: 'creative' },
      { key: 'player', label: 'Target Player', default: '@p' }
    ]
  },
  {
    id: 'ban',
    category: 'Server Control',
    title: 'Ban Player',
    cmd: '/ban {player} {reason}',
    desc: 'Bans player from joining the Minecraft server with custom reason.',
    params: [
      { key: 'player', label: 'Player Username', default: 'Griefer123' },
      { key: 'reason', label: 'Ban Reason', default: 'Griefing spawn area' }
    ]
  },
  {
    id: 'whitelist',
    category: 'Server Control',
    title: 'Add Player to Whitelist',
    cmd: '/whitelist add {player}',
    desc: 'Allows player to join when whitelist is enabled.',
    params: [{ key: 'player', label: 'Player Username', default: 'FriendName' }]
  },
  {
    id: 'luckperms',
    category: 'Permissions (LuckPerms)',
    title: 'Set LuckPerms Permission',
    cmd: '/lp user {player} permission set {permission} true',
    desc: 'Grants specific plugin/server permission to player using LuckPerms.',
    params: [
      { key: 'player', label: 'Player Username', default: 'Player1' },
      { key: 'permission', label: 'Permission Node', default: 'essentials.fly' }
    ]
  },
  {
    id: 'save-all',
    category: 'Server Maintenance',
    title: 'Save World to Disk',
    cmd: '/save-all confirm',
    desc: 'Forces the server to save all current world chunks to disk immediately.',
    params: []
  },
  {
    id: 'restart',
    category: 'Server Maintenance',
    title: 'Graceful Restart / Stop',
    cmd: '/stop',
    desc: 'Gracefully saves world data, disconnects all players, and halts server process.',
    params: []
  },
  {
    id: 'java-launch',
    category: 'Linux / Startup Command',
    title: 'PaperMC / Spigot Optimized Start Command',
    cmd: 'java -Xms4G -Xmx4G -XX:+UseG1GC -jar paper.jar nogui',
    desc: 'Standard high-performance Java startup flag script for Paper server.',
    params: []
  }
];

export const CommandVault = ({ items, masterPassword, onRefresh }) => {
  const { user, access } = useAuth();
  const [paramInputs, setParamInputs] = useState({});
  const [copiedId, setCopiedId] = useState(null);
  const [activeCategory, setActiveCategory] = useState('All');

  // New Custom Command Form state
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [customTitle, setCustomTitle] = useState('');
  const [customCmd, setCustomCmd] = useState('');
  const [customCategory, setCustomCategory] = useState('Custom Commands');
  const [customDesc, setCustomDesc] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState({ text: '', isError: false });

  const categories = ['All', 'Admin & OP', 'Server Control', 'Teleportation', 'Permissions (LuckPerms)', 'Server Maintenance', 'Linux / Startup Command', 'Custom Commands'];

  const handleParamChange = (cmdId, paramKey, value) => {
    setParamInputs((prev) => ({
      ...prev,
      [`${cmdId}_${paramKey}`]: value
    }));
  };

  const getResolvedCmd = (preset) => {
    let result = preset.cmd;
    if (preset.params) {
      for (const p of preset.params) {
        const val = paramInputs[`${preset.id}_${p.key}`] ?? p.default;
        result = result.replace(new RegExp(`\\{${p.key}\\}`, 'g'), val);
      }
    }
    return result;
  };

  const handleCopyCmd = async (preset) => {
    const finalCmd = getResolvedCmd(preset);
    try {
      await navigator.clipboard.writeText(finalCmd);
      setCopiedId(preset.id);
      setTimeout(() => setCopiedId(null), 2000);
    } catch (err) {
      alert('Failed to copy command');
    }
  };

  const handleSaveCustomCmd = async (e) => {
    e.preventDefault();
    if (!customTitle.trim() || !customCmd.trim()) {
      setMessage({ text: 'Command title and script are required.', isError: true });
      return;
    }

    if (!access?.businessId || !user?.uid) {
      setMessage({ text: 'User access missing. Please sign in again.', isError: true });
      return;
    }

    setSubmitting(true);
    setMessage({ text: '', isError: false });

    try {
      const payload = JSON.stringify({
        title: customTitle.trim(),
        cmd: customCmd.trim(),
        category: customCategory.trim() || 'Custom Commands',
        desc: customDesc.trim()
      });

      const encryptedCmd = encryptData(payload, masterPassword);

      await addDoc(collection(db, 'minecraft_vault'), {
        businessId: access.businessId,
        createdBy: user.uid,
        type: 'command',
        name: customTitle.trim(),
        encryptedCmd,
        createdAt: new Date().toISOString()
      });

      setCustomTitle('');
      setCustomCmd('');
      setCustomDesc('');
      setMessage({ text: '⚡ Custom command saved to Minecraft Vault!', isError: false });
      if (onRefresh) onRefresh();
    } catch (err) {
      console.warn('[Firestore Error] Save custom cmd failed:', err);
      setMessage({ text: 'Failed to save custom command. Check permissions.', isError: true });
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteCmd = async (id) => {
    if (!window.confirm('Delete this custom command?')) return;
    try {
      await deleteDoc(doc(db, 'minecraft_vault', id));
      if (onRefresh) onRefresh();
    } catch (e) {
      alert('Failed to delete command');
    }
  };

  // Process custom saved commands from Firestore
  const customItems = items
    .filter((it) => it.type === 'command')
    .map((it) => {
      const raw = decryptData(it.encryptedCmd, masterPassword);
      let parsed = { title: it.name, cmd: '', category: 'Custom Commands', desc: '' };
      if (raw) {
        try {
          parsed = JSON.parse(raw);
        } catch (e) {
          parsed.cmd = raw;
        }
      }
      return {
        id: it.id,
        isCustom: true,
        category: parsed.category || 'Custom Commands',
        title: parsed.title || it.name,
        cmd: parsed.cmd,
        desc: parsed.desc || 'Custom saved RCON/Console command'
      };
    });

  const allCommands = [...PRESET_COMMANDS, ...customItems];
  const filteredCommands = activeCategory === 'All' 
    ? allCommands 
    : allCommands.filter((c) => c.category === activeCategory);

  return (
    <div className={styles.cmdContainer}>
      {/* Category Filter Pills & Icon Toggle Button */}
      <div className={styles.topControlRow}>
        <div className={styles.filterBar}>
          {categories.map((cat) => (
            <button
              key={cat}
              className={`${styles.filterPill} ${activeCategory === cat ? styles.filterPillActive : ''}`}
              onClick={() => setActiveCategory(cat)}
            >
              {cat}
            </button>
          ))}
        </div>

        <button
          className={`${styles.addToggleBtn} ${isFormOpen ? styles.addToggleBtnActive : ''}`}
          onClick={() => setIsFormOpen((prev) => !prev)}
          title="Add Custom Minecraft / RCON Command"
        >
          <span className={styles.addToggleIcon}>{isFormOpen ? '✖' : '⚡'}</span>
          <span>{isFormOpen ? 'Close Form' : 'Add Custom Command'}</span>
        </button>
      </div>

      {/* Custom Command Add Form (Opens when Icon Button Clicked) */}
      {isFormOpen && (
        <div className={styles.cardBox}>
          <div className={styles.cardHeaderToggle} onClick={() => setIsFormOpen(false)}>
            <h3 className={styles.cardHeader} style={{ margin: 0 }}>
              <span className={styles.headerIcon}>⚡</span> Add Custom Minecraft / RCON Command
            </h3>
            <button type="button" className={styles.closeFormBtn} aria-label="Close form">
              ✕
            </button>
          </div>

          <form onSubmit={handleSaveCustomCmd} className={styles.formGrid} style={{ marginTop: '1.25rem' }}>
            <div className={styles.field}>
              <label className={styles.label}>Command Title *</label>
              <input
                type="text"
                className={styles.input}
                placeholder="e.g., Purge WorldEdit Clipboard"
                value={customTitle}
                onChange={(e) => setCustomTitle(e.target.value)}
                required
              />
            </div>

            <div className={styles.field}>
              <label className={styles.label}>Category</label>
              <input
                type="text"
                className={styles.input}
                placeholder="e.g., Plugins / Custom"
                value={customCategory}
                onChange={(e) => setCustomCategory(e.target.value)}
              />
            </div>

            <div className={styles.fieldFull}>
              <label className={styles.label}>Command / Script string *</label>
              <input
                type="text"
                className={styles.input}
                placeholder="e.g., /worldedit cancel or rcon-cli send stop"
                value={customCmd}
                onChange={(e) => setCustomCmd(e.target.value)}
                required
              />
            </div>

            <div className={styles.fieldFull}>
              <label className={styles.label}>Description / Notes (Optional)</label>
              <input
                type="text"
                className={styles.input}
                placeholder="What this command does..."
                value={customDesc}
                onChange={(e) => setCustomDesc(e.target.value)}
              />
            </div>

            <button type="submit" disabled={submitting} className={styles.primaryBtn}>
              {submitting ? 'Saving...' : '💾 Save Command to Vault'}
            </button>

            {message.text && (
              <p className={message.isError ? styles.messageError : styles.messageSuccess}>
                {message.text}
              </p>
            )}
          </form>
        </div>
      )}

      {/* Commands Grid */}
      <div className={styles.cmdGrid}>
        {filteredCommands.map((item) => {
          const resolvedCmd = getResolvedCmd(item);
          return (
            <div key={item.id} className={styles.cmdCard}>
              <div className={styles.cmdTop}>
                <div>
                  <span className={styles.badgeCategory}>{item.category}</span>
                  <h4 className={styles.cmdTitle}>{item.title}</h4>
                </div>
                {item.isCustom && (
                  <button
                    onClick={() => handleDeleteCmd(item.id)}
                    className={styles.deleteBtn}
                    title="Delete Custom Command"
                  >
                    🗑️
                  </button>
                )}
              </div>

              <p className={styles.cmdDesc}>{item.desc}</p>

              {/* Dynamic Parameter Inputs if present */}
              {item.params && item.params.length > 0 && (
                <div className={styles.paramGrid}>
                  {item.params.map((p) => (
                    <div key={p.key} className={styles.paramItem}>
                      <label className={styles.paramLabel}>{p.label}</label>
                      <input
                        type="text"
                        className={styles.paramInput}
                        value={paramInputs[`${item.id}_${p.key}`] ?? p.default}
                        onChange={(e) => handleParamChange(item.id, p.key, e.target.value)}
                      />
                    </div>
                  ))}
                </div>
              )}

              {/* Final resolved command box */}
              <div className={styles.codeBlockRow}>
                <code className={styles.codeOutput}>{resolvedCmd}</code>
                <button
                  onClick={() => handleCopyCmd(item)}
                  className={`${styles.copyCmdBtn} ${copiedId === item.id ? styles.copied : ''}`}
                >
                  {copiedId === item.id ? '✓ Copied!' : '📋 Copy'}
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default CommandVault;
