import React, { useState, useEffect } from 'react';
import { collection, onSnapshot, query, where } from 'firebase/firestore';
import { db } from '../../config/firebase';
import { useAuth } from '../../hooks/useAuth.jsx';
import EnvManager from './EnvManager';
import CommandVault from './CommandVault';
import ServerCredentials from './ServerCredentials';
import styles from './MinecraftVault.module.css';

export const MinecraftVault = ({ masterPassword }) => {
  const { user, access } = useAuth();
  const [activeTab, setActiveTab] = useState('env'); // 'env' | 'commands' | 'credentials'
  const [vaultItems, setVaultItems] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!user || !access?.businessId) {
      setVaultItems([]);
      setIsLoading(false);
      return;
    }
    setIsLoading(true);

    const vaultQuery = query(
      collection(db, 'minecraft_vault'),
      where('businessId', '==', access.businessId)
    );

    const unsubscribe = onSnapshot(
      vaultQuery,
      (querySnapshot) => {
        const items = querySnapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));
        setVaultItems(items);
        setIsLoading(false);
      },
      (error) => {
        console.error('[Firestore Error] Failed to fetch minecraft vault items:', error);
        setIsLoading(false);
      }
    );

    return () => unsubscribe();
  }, [user, access?.businessId]);

  const fetchVaultItems = () => {};

  const envCount = vaultItems.filter((i) => i.type === 'env').length;
  const cmdCount = vaultItems.filter((i) => i.type === 'command').length;
  const credCount = vaultItems.filter((i) => i.type === 'credential').length;

  return (
    <div className={styles.wrapper}>
      {/* Minecraft Hero / Sub-navigation */}
      <div className={styles.vaultHeader}>
        <div className={styles.vaultHeaderLeft}>
          <div className={styles.mcLogoBox}>
            <span className={styles.mcLogoIcon}>⛏️</span>
          </div>
          <div>
            <h2 className={styles.mcTitle}>Minecraft Server Vault</h2>
            <p className={styles.mcSubtitle}>
              Manage RCON commands, encrypted <code>.env</code> files, and server credentials safely with zero-knowledge AES encryption.
            </p>
          </div>
        </div>

        {/* Sub Navigation Tabs */}
        <div className={styles.subTabs}>
          <button
            className={`${styles.subTab} ${activeTab === 'env' ? styles.subTabActive : ''}`}
            onClick={() => setActiveTab('env')}
          >
            📄 .env Manager ({envCount})
          </button>
          <button
            className={`${styles.subTab} ${activeTab === 'commands' ? styles.subTabActive : ''}`}
            onClick={() => setActiveTab('commands')}
          >
            ⚡ Commands & RCON ({cmdCount})
          </button>
          <button
            className={`${styles.subTab} ${activeTab === 'credentials' ? styles.subTabActive : ''}`}
            onClick={() => setActiveTab('credentials')}
          >
            🔑 Server Credentials ({credCount})
          </button>
        </div>
      </div>

      {isLoading ? (
        <div className={styles.loadingBox}>
          <div className={styles.spinner} />
          <p>Loading Minecraft Vault Items...</p>
        </div>
      ) : (
        <div className={styles.tabContent}>
          {activeTab === 'env' && (
            <EnvManager
              items={vaultItems}
              masterPassword={masterPassword}
              onRefresh={fetchVaultItems}
            />
          )}

          {activeTab === 'commands' && (
            <CommandVault
              items={vaultItems}
              masterPassword={masterPassword}
              onRefresh={fetchVaultItems}
            />
          )}

          {activeTab === 'credentials' && (
            <ServerCredentials
              items={vaultItems}
              masterPassword={masterPassword}
              onRefresh={fetchVaultItems}
            />
          )}
        </div>
      )}
    </div>
  );
};

export default MinecraftVault;
