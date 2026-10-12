import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useAuth } from '../../hooks/useAuth.jsx';
import { useMusic } from '../../context/MusicContext';
import {
  subscribeToMusic,
  saveTrackItem,
  saveBatchTrackItems,
  deleteTrackItem,
  parseAudioFile,
  formatAudioDuration,
  formatBytes,
  MUSIC_GENRES,
  downloadMediaFile,
  subscribeToMusicFolders,
  saveMusicFolder,
  deleteMusicFolder,
  scanDroppedItems,
  syncUnsyncedMusicToCloud,
  syncUnsyncedMusicFoldersToCloud,
} from '../../services/musicService';
import { AddTrackModal } from './AddTrackModal';
import { CreateFolderModal } from './CreateFolderModal';
import { YouTubeToMp3Modal } from './YouTubeToMp3Modal';
import styles from './MusicVault.module.css';

export const MusicVault = ({ masterPassword, onUnlockVault }) => {
  const { user, access } = useAuth();
  const uid = user?.uid;
  const businessId = access?.businessId;

  const {
    currentTrack,
    isPlaying,
    playTrack,
    togglePlayPause,
    stopPlayback,
  } = useMusic();

  const [tracks, setTracks] = useState([]);
  const [folders, setFolders] = useState([]);
  const [selectedFolderId, setSelectedFolderId] = useState(() => {
    try {
      return sessionStorage.getItem('elyx_music_folder') || null;
    } catch {
      return null;
    }
  });
  const [selectedGenre, setSelectedGenre] = useState(() => {
    try {
      return sessionStorage.getItem('elyx_music_genre') || 'All';
    } catch {
      return 'All';
    }
  });
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState('newest'); // 'newest' | 'title' | 'artist' | 'duration'

  // Persist selected folder & genre in session so refreshing stays in current folder
  useEffect(() => {
    try {
      if (selectedFolderId) {
        sessionStorage.setItem('elyx_music_folder', selectedFolderId);
      } else {
        sessionStorage.removeItem('elyx_music_folder');
      }
    } catch {}
  }, [selectedFolderId]);

  useEffect(() => {
    try {
      sessionStorage.setItem('elyx_music_genre', selectedGenre);
    } catch {}
  }, [selectedGenre]);

  // Drag and drop overlay state
  const [isWindowDragging, setIsWindowDragging] = useState(false);
  const dragCounterRef = useRef(0);

  // Modals & Toast
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isFolderModalOpen, setIsFolderModalOpen] = useState(false);
  const [isYouTubeModalOpen, setIsYouTubeModalOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState(null);
  const [isSyncing, setIsSyncing] = useState(false);
  const folderUploadInputRef = useRef(null);

  // Unsynced count (tracks stored locally but not yet on Firebase Storage or Cloud Firestore)
  const unsyncedCount = useMemo(() => {
    return tracks.filter((t) => !t.isCloudSynced).length;
  }, [tracks]);

  const handleManualSync = async () => {
    if (isSyncing) return;
    setIsSyncing(true);
    showToast('⏳ Սկսվում է ամպային սինքրոնացումը Firebase Cloud-ի հետ...', 'info');
    try {
      await syncUnsyncedMusicToCloud(uid, businessId);
      await syncUnsyncedMusicFoldersToCloud(uid, businessId);
      showToast('✅ Բոլոր երգերն ու ֆոլդերները հաջողությամբ սինքրոնացվեցին Cloud-ում!', 'success');
    } catch (e) {
      showToast('Սինքրոնացման սխալ: Ստուգեք ինտերնետը կամ Firebase կանոնները', 'error');
    } finally {
      setIsSyncing(false);
    }
  };

  const showToast = (text, type = 'info') => {
    setToastMessage({ text, type });
    setTimeout(() => {
      setToastMessage(null);
    }, 3500);
  };

  // Real-time subscription to tracks
  useEffect(() => {
    const unsub = subscribeToMusic(
      uid,
      businessId,
      (fetched) => {
        setTracks(fetched);
      },
      (err) => {
        console.warn('Real-time music subscription notice:', err);
      }
    );

    return () => {
      if (typeof unsub === 'function') unsub();
    };
  }, [uid, businessId]);

  // Real-time subscription to folders
  useEffect(() => {
    const unsub = subscribeToMusicFolders(
      uid,
      businessId,
      (fetched) => {
        setFolders(fetched);
      },
      (err) => {
        console.warn('Real-time music folders notice:', err);
      }
    );

    return () => {
      if (typeof unsub === 'function') unsub();
    };
  }, [uid, businessId]);

  // Global Drag & Drop listener (supports both individual songs & entire folders)
  useEffect(() => {
    const handleDragEnter = (e) => {
      e.preventDefault();
      dragCounterRef.current += 1;
      if (e.dataTransfer?.types?.includes('Files')) {
        setIsWindowDragging(true);
      }
    };

    const handleDragLeave = (e) => {
      e.preventDefault();
      dragCounterRef.current -= 1;
      if (dragCounterRef.current <= 0) {
        setIsWindowDragging(false);
        dragCounterRef.current = 0;
      }
    };

    const handleDragOver = (e) => {
      e.preventDefault();
    };

    const handleDrop = async (e) => {
      e.preventDefault();
      setIsWindowDragging(false);
      dragCounterRef.current = 0;

      // Extract all dropped files and folders recursively
      const droppedItems = await scanDroppedItems(e.dataTransfer);
      const audioEntries = droppedItems.filter(
        (item) =>
          item.file &&
          (item.file.type.startsWith('audio/') ||
            /\.(mp3|wav|flac|m4a|ogg|aac)$/i.test(item.file.name))
      );

      if (audioEntries.length === 0) {
        showToast('Խնդրում ենք drop անել աուդիո ֆայլեր կամ երգերով ֆոլդերներ (MP3, WAV, FLAC, M4A)', 'error');
        return;
      }

      showToast(`☁️ Վերբեռնվում է ${audioEntries.length} երգ Firebase Storage...`, 'info');

      // Auto-create folders if any folders were dropped
      const folderMap = new Map();
      for (const item of audioEntries) {
        if (item.folderName) {
          const lowerName = item.folderName.toLowerCase();
          let fObj = folders.find((f) => f.name.toLowerCase() === lowerName) || folderMap.get(lowerName);
          if (!fObj) {
            const newF = {
              id: `folder-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
              name: item.folderName,
              icon: '📁',
              color: '#06b6d4',
              createdAt: new Date().toISOString(),
            };
            await saveMusicFolder({ folder: newF, uid, businessId });
            fObj = newF;
            folderMap.set(lowerName, newF);
          }
        }
      }

      if (folderMap.size > 0) {
        setFolders((prev) => [
          ...Array.from(folderMap.values()),
          ...prev.filter((f) => !folderMap.has(f.name.toLowerCase())),
        ]);
      }

      const defaultCovers = [
        'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?auto=format&fit=crop&w=400&q=80',
        'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?auto=format&fit=crop&w=400&q=80',
        'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?auto=format&fit=crop&w=400&q=80',
      ];

      const batchToSave = [];
      for (let i = 0; i < audioEntries.length; i++) {
        const { file, folderName } = audioEntries[i];
        try {
          const parsed = await parseAudioFile(file);
          const targetFolder = folderName
            ? (folderMap.get(folderName.toLowerCase()) || folders.find((f) => f.name.toLowerCase() === folderName.toLowerCase()))
            : (selectedFolderId ? folders.find((f) => f.id === selectedFolderId) : null);

          const newTrack = {
            id: `track-${Date.now()}-${i}-${Math.random().toString(36).substr(2, 4)}`,
            title: parsed.title,
            artist: parsed.artist || 'My Audio',
            album: targetFolder ? targetFolder.name : 'Elyx Vault Drop',
            genre: 'Personal',
            folderId: targetFolder ? targetFolder.id : null,
            folder: targetFolder ? targetFolder.name : null,
            duration: parsed.duration,
            fileSize: parsed.fileSize,
            url: parsed.blobUrl || '',
            coverUrl: defaultCovers[(i + Math.floor(Math.random() * 3)) % defaultCovers.length],
            isFavorite: false,
            isEncrypted: false,
            createdAt: new Date().toISOString(),
          };

          batchToSave.push({ track: newTrack, file, audioBlob: parsed.dataUrl });
        } catch (err) {
          console.warn('Failed to parse dropped audio:', err);
        }
      }

      if (batchToSave.length > 0) {
        const saved = await saveBatchTrackItems(batchToSave, uid, businessId);
        setTracks((prev) => [...saved, ...prev.filter((t) => !saved.some((s) => s.id === t.id))]);
        const createdNames = Array.from(folderMap.values()).map((f) => `«${f.name}»`).join(', ');
        if (createdNames) {
          showToast(`✨ Ստեղծվեց ${createdNames} ֆոլդերը և ${saved.length} երգ պահպանվեց Firebase Storage-ում!`, 'success');
        } else {
          showToast(`✨ ${saved.length} երգ պահպանվեց Firebase Storage-ում!`, 'success');
        }
      }
    };

    window.addEventListener('dragenter', handleDragEnter);
    window.addEventListener('dragleave', handleDragLeave);
    window.addEventListener('dragover', handleDragOver);
    window.addEventListener('drop', handleDrop);

    return () => {
      window.removeEventListener('dragenter', handleDragEnter);
      window.removeEventListener('dragleave', handleDragLeave);
      window.removeEventListener('dragover', handleDragOver);
      window.removeEventListener('drop', handleDrop);
    };
  }, [uid, businessId, folders, selectedFolderId]);

  // Upload an entire folder chosen via file explorer dialog
  const handleFolderUploadChange = async (e) => {
    const rawFiles = Array.from(e.target.files || []);
    if (rawFiles.length === 0) return;

    const audioFiles = rawFiles.filter(
      (f) =>
        f.type.startsWith('audio/') ||
        /\.(mp3|wav|flac|m4a|ogg|aac)$/i.test(f.name)
    );

    if (audioFiles.length === 0) {
      showToast('Ընտրված ֆոլդերում աուդիո ֆայլեր չեն գտնվել:', 'error');
      return;
    }

    // Extract folder name from webkitRelativePath
    let detectedFolderName = 'Uploaded Folder';
    if (audioFiles[0].webkitRelativePath) {
      const parts = audioFiles[0].webkitRelativePath.split('/');
      if (parts.length > 1) detectedFolderName = parts[0];
    }

    // Create or find folder
    let targetFolder = folders.find((f) => f.name.toLowerCase() === detectedFolderName.toLowerCase());
    if (!targetFolder) {
      targetFolder = {
        id: `folder-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
        name: detectedFolderName,
        icon: '📁',
        color: '#06b6d4',
        createdAt: new Date().toISOString(),
      };
      await saveMusicFolder({ folder: targetFolder, uid, businessId });
      setFolders((prev) => [targetFolder, ...prev]);
    }

    showToast(`☁️ Վերբեռնվում է «${detectedFolderName}» ֆոլդերը (${audioFiles.length} երգ) Firebase Storage...`, 'info');

    const defaultCovers = [
      'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?auto=format&fit=crop&w=400&q=80',
      'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?auto=format&fit=crop&w=400&q=80',
      'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?auto=format&fit=crop&w=400&q=80',
    ];

    const batchToSave = [];
    for (let i = 0; i < audioFiles.length; i++) {
      const file = audioFiles[i];
      try {
        const parsed = await parseAudioFile(file);
        const newTrack = {
          id: `track-${Date.now()}-${i}-${Math.random().toString(36).substr(2, 4)}`,
          title: parsed.title,
          artist: parsed.artist || 'My Audio',
          album: targetFolder.name,
          genre: 'Personal',
          folderId: targetFolder.id,
          folder: targetFolder.name,
          duration: parsed.duration,
          fileSize: parsed.fileSize,
          url: parsed.blobUrl || '',
          coverUrl: defaultCovers[(i + Math.floor(Math.random() * 3)) % defaultCovers.length],
          isFavorite: false,
          isEncrypted: false,
          createdAt: new Date().toISOString(),
        };
        batchToSave.push({ track: newTrack, file, audioBlob: parsed.dataUrl });
      } catch (err) {
        console.warn('Failed to parse uploaded audio file:', err);
      }
    }

    if (batchToSave.length > 0) {
      const saved = await saveBatchTrackItems(batchToSave, uid, businessId);
      setTracks((prev) => [...saved, ...prev.filter((t) => !saved.some((s) => s.id === t.id))]);
      setSelectedFolderId(targetFolder.id);
      showToast(`✨ «${targetFolder.name}» ֆոլդերում ավելացվեց ${saved.length} երգ Firebase Storage-ում!`, 'success');
    }

    if (folderUploadInputRef.current) {
      folderUploadInputRef.current.value = '';
    }
  };

  // Handle Save from AddTrackModal (Batch)
  const handleSaveBatchTracks = async (batch) => {
    showToast(`☁️ Վերբեռնվում է ${batch.length} երգ Firebase Storage...`, 'info');
    const saved = await saveBatchTrackItems(batch, uid, businessId);
    setTracks((prev) => [...saved, ...prev.filter((t) => !saved.some((s) => s.id === t.id))]);
    showToast(
      saved.length > 1
        ? `✨ ${saved.length} երգ հաջողությամբ պահպանվեց Firebase Storage-ում!`
        : '✨ Երգը հաջողությամբ պահպանվեց Firebase Storage-ում!',
      'success'
    );
  };

  // Handle Create Folder
  const handleCreateFolder = async (newFolder) => {
    const saved = await saveMusicFolder({ folder: newFolder, uid, businessId });
    setFolders((prev) => [saved, ...prev.filter((f) => f.id !== saved.id)]);
    setSelectedFolderId(saved.id);
    showToast(`✨ «${saved.name}» ֆոլդերը հաջողությամբ ստեղծվեց!`, 'success');
  };

  // Handle Delete Folder
  const handleDeleteFolder = async (folderId, folderName) => {
    if (!window.confirm(`Վստա՞հ եք, որ ցանկանում եք ջնջել «${folderName}» ֆոլդերը:`)) return;
    await deleteMusicFolder(folderId, uid);
    setFolders((prev) => prev.filter((f) => f.id !== folderId));
    if (selectedFolderId === folderId) {
      setSelectedFolderId(null);
    }
    showToast(`🗑️ «${folderName}» ֆոլդերը ջնջված է`, 'info');
  };

  // Handle Move Track to Folder
  const handleMoveTrackToFolder = async (trackId, targetFolderId) => {
    const target = tracks.find((t) => t.id === trackId);
    if (!target) return;
    const targetFolder = folders.find((f) => f.id === targetFolderId);
    const updated = {
      ...target,
      folderId: targetFolder ? targetFolder.id : null,
      folder: targetFolder ? targetFolder.name : null,
    };
    setTracks((prev) => prev.map((t) => (t.id === trackId ? updated : t)));
    await saveTrackItem({ track: updated, uid, businessId });
    showToast(
      targetFolder
        ? `📁 «${target.title}» երգը տեղափոխվեց «${targetFolder.name}» ֆոլդեր`
        : `📁 «${target.title}» երգը հանվեց ֆոլդերից`,
      'success'
    );
  };

  // Handle Delete
  const handleDeleteTrack = async (trackId, trackTitle) => {
    if (!window.confirm(`Վստա՞հ եք, որ ցանկանում եք ջնջել «${trackTitle}» երգը:`)) return;
    await deleteTrackItem(trackId, uid);
    setTracks((prev) => prev.filter((t) => t.id !== trackId));
    showToast('🗑️ Երգը ջնջված է', 'info');
  };

  // Handle Favorite toggle
  const handleToggleFavorite = async (trackId, isFav) => {
    const target = tracks.find((t) => t.id === trackId);
    if (!target) return;
    const updated = { ...target, isFavorite: isFav };
    setTracks((prev) => prev.map((t) => (t.id === trackId ? updated : t)));
    await saveTrackItem({ track: updated, uid, businessId });
  };

  // Filtered and sorted tracks
  const processedTracks = useMemo(() => {
    let result = [...tracks];

    // Folder filter
    if (selectedFolderId) {
      const activeFolder = folders.find((f) => f.id === selectedFolderId);
      result = result.filter(
        (t) =>
          t.folderId === selectedFolderId ||
          (activeFolder && (t.folder || '').toLowerCase() === activeFolder.name.toLowerCase())
      );
    }

    // Genre filter
    if (selectedGenre === 'Favorites') {
      result = result.filter((t) => t.isFavorite);
    } else if (selectedGenre !== 'All') {
      result = result.filter((t) => t.genre === selectedGenre);
    }

    // Search query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (t) =>
          (t.title || '').toLowerCase().includes(q) ||
          (t.artist || '').toLowerCase().includes(q) ||
          (t.album || '').toLowerCase().includes(q) ||
          (t.folder || '').toLowerCase().includes(q) ||
          (t.genre || '').toLowerCase().includes(q)
      );
    }

    // Sort
    if (sortBy === 'newest') {
      result.sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
    } else if (sortBy === 'title') {
      result.sort((a, b) => (a.title || '').localeCompare(b.title || ''));
    } else if (sortBy === 'artist') {
      result.sort((a, b) => (a.artist || '').localeCompare(b.artist || ''));
    } else if (sortBy === 'duration') {
      result.sort((a, b) => (b.duration || 0) - (a.duration || 0));
    }

    return result;
  }, [tracks, selectedFolderId, folders, selectedGenre, searchQuery, sortBy]);

  // Total stats
  const totalStats = useMemo(() => {
    const totalCount = tracks.length;
    const favoritesCount = tracks.filter((t) => t.isFavorite).length;
    const totalDurationSec = tracks.reduce((acc, t) => acc + (t.duration || 0), 0);
    const totalBytes = tracks.reduce((acc, t) => acc + (t.fileSize || 0), 0);

    return { totalCount, favoritesCount, totalDurationSec, totalBytes };
  }, [tracks]);

  const activeFolder = useMemo(() => {
    return folders.find((f) => f.id === selectedFolderId);
  }, [folders, selectedFolderId]);

  const handlePlayFolder = () => {
    if (processedTracks.length === 0) return;
    playTrack(processedTracks[0], processedTracks, masterPassword);
  };

  return (
    <div className={styles.container}>
      {/* Toast Notification */}
      {toastMessage && (
        <div
          className={`${styles.toast} ${
            toastMessage.type === 'success'
              ? styles.toast_success
              : toastMessage.type === 'error'
              ? styles.toast_error
              : styles.toast_info
          }`}
        >
          {toastMessage.text}
        </div>
      )}

      {/* Screen-wide Drag & Drop Overlay */}
      {isWindowDragging && (
        <div className={styles.dragDropOverlay}>
          <div className={styles.dragDropCard}>
            <div className={styles.dragDropIcon}>🎵</div>
            <h2 className={styles.dragDropTitle}>Գցեք երգերը կամ ֆոլդերները այստեղ</h2>
            <p className={styles.dragDropSubtitle}>
              Ֆոլդերներով երգերը ավտոմատ կդասավորվեն և կստեղծվեն համապատասխան պանակները
            </p>
          </div>
        </div>
      )}

      {/* Hero Banner with Now Playing & Vinyl Spin */}
      <div className={styles.heroBanner}>
        <div className={styles.bannerLeft}>
          <div className={`${styles.vinylBox} ${isPlaying ? styles.vinylSpinning : ''}`}>
            {currentTrack?.coverUrl ? (
              <img src={currentTrack.coverUrl} alt="Album Art" className={styles.bannerCover} />
            ) : (
              <span className={styles.defaultMusicIcon}>🎧</span>
            )}
            {isPlaying && <div className={styles.pulsingRing} />}
          </div>

          <div className={styles.bannerInfo}>
            <div className={styles.nowPlayingBadge}>
              <span className={styles.pulseDot} />
              <span>{isPlaying ? 'NOW PLAYING' : 'MUSIC VAULT'}</span>
            </div>

            <h2 className={styles.bannerTitle}>
              {currentTrack ? currentTrack.title : 'Elyx Music Studio'}
            </h2>

            <p className={styles.bannerSubtitle}>
              {currentTrack
                ? `${currentTrack.artist} • ${currentTrack.album || 'Music Vault'}`
                : 'Background audio, ֆոլդերներով Drag & Drop, playlists & MediaSession API'}
            </p>

            {currentTrack && (
              <div className={styles.heroActionRow}>
                <button
                  type="button"
                  className={styles.heroPlayBtn}
                  onClick={togglePlayPause}
                >
                  {isPlaying ? '⏸ Pause' : '▶ Play Track'}
                </button>
                <button
                  type="button"
                  className={styles.heroStopBtn}
                  onClick={stopPlayback}
                  title="Անջատել երգը (Turn Off / Stop)"
                >
                  <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" width="13" height="13">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                  <span>Անջատել</span>
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Stats on right */}
        <div className={styles.statsRow}>
          <div className={styles.statBox}>
            <span className={styles.statValue}>{totalStats.totalCount}</span>
            <span className={styles.statLabel}>Երգեր</span>
          </div>

          <div className={styles.statBox}>
            <span className={styles.statValue}>📁 {folders.length}</span>
            <span className={styles.statLabel}>Ֆոլդերներ</span>
          </div>

          <div className={styles.statBox}>
            <span className={styles.statValue}>⭐ {totalStats.favoritesCount}</span>
            <span className={styles.statLabel}>Սիրված</span>
          </div>

          <div className={styles.statBox}>
            <span className={styles.statValue}>
              {formatAudioDuration(totalStats.totalDurationSec)}
            </span>
            <span className={styles.statLabel}>Տևողություն</span>
          </div>

          {totalStats.totalBytes > 0 && (
            <div className={styles.statBox}>
              <span className={styles.statValue}>
                {formatBytes(totalStats.totalBytes)}
              </span>
              <span className={styles.statLabel}>Ծավալ</span>
            </div>
          )}
        </div>
      </div>

      {/* Music Folders / Collections Section */}
      <div className={styles.foldersSection}>
        <div className={styles.foldersSectionHeader}>
          <div className={styles.foldersTitleBox}>
            <span className={styles.foldersIcon}>📁</span>
            <div>
              <h3 className={styles.foldersTitle}>Երաժշտական Ֆոլդերներ (Folders / Playlists)</h3>
              <p className={styles.foldersSubtitle}>
                Ստեղծեք պանակներ կամ ուղղակի գցեք (drop արեք) ֆոլդերներ ձեր համակարգչից
              </p>
            </div>
          </div>

          <div className={styles.foldersActionButtons}>
            <button
              type="button"
              className={styles.uploadFolderBtn}
              onClick={() => folderUploadInputRef.current?.click()}
              title="Վերբեռնել ամբողջական ֆոլդեր համակարգչից"
            >
              <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" width="16" height="16">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
              </svg>
              <span>📂 Վերբեռնել Folder</span>
            </button>

            <button
              type="button"
              className={styles.createFolderBtn}
              onClick={() => setIsFolderModalOpen(true)}
              title="Ստեղծել նոր դատարկ ֆոլդեր"
            >
              <span>+ Նոր Folder</span>
            </button>
          </div>
        </div>

        {/* Hidden folder file picker */}
        <input
          type="file"
          ref={folderUploadInputRef}
          webkitdirectory=""
          directory=""
          multiple
          style={{ display: 'none' }}
          onChange={handleFolderUploadChange}
        />

        {/* Folder Cards List */}
        <div className={styles.folderCardsList}>
          {/* All Tracks Card */}
          <div
            className={`${styles.folderCard} ${!selectedFolderId ? styles.folderCardActive : ''}`}
            onClick={() => setSelectedFolderId(null)}
          >
            <div
              className={styles.folderCardIconBox}
              style={{ backgroundColor: 'rgba(99, 102, 241, 0.15)', borderColor: '#6366f1' }}
            >
              <span>🎵</span>
            </div>
            <div className={styles.folderCardDetails}>
              <span className={styles.folderCardName}>Բոլոր Երգերը</span>
              <span className={styles.folderCardCount}>{tracks.length} երգ</span>
            </div>
          </div>

          {folders.map((folder) => {
            const count = tracks.filter(
              (t) =>
                t.folderId === folder.id ||
                (t.folder && t.folder.toLowerCase() === folder.name.toLowerCase())
            ).length;

            return (
              <div
                key={folder.id}
                className={`${styles.folderCard} ${selectedFolderId === folder.id ? styles.folderCardActive : ''}`}
                onClick={() => setSelectedFolderId(selectedFolderId === folder.id ? null : folder.id)}
              >
                <div
                  className={styles.folderCardIconBox}
                  style={{
                    backgroundColor: `${folder.color || '#06b6d4'}22`,
                    borderColor: folder.color || '#06b6d4',
                  }}
                >
                  <span>{folder.icon || '📁'}</span>
                </div>
                <div className={styles.folderCardDetails}>
                  <span className={styles.folderCardName}>{folder.name}</span>
                  <span className={styles.folderCardCount}>{count} երգ</span>
                </div>

                <button
                  type="button"
                  className={styles.folderDeleteBtn}
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDeleteFolder(folder.id, folder.name);
                  }}
                  title="Ջնջել ֆոլդերը"
                >
                  ×
                </button>
              </div>
            );
          })}
        </div>
      </div>

      {/* Active Folder Banner / Filter Indicator */}
      {activeFolder && (
        <div
          className={styles.activeFolderBanner}
          style={{ borderLeftColor: activeFolder.color || '#06b6d4' }}
        >
          <div className={styles.activeFolderInfo}>
            <span className={styles.activeFolderIcon}>{activeFolder.icon || '📁'}</span>
            <div>
              <div className={styles.activeFolderTitleRow}>
                <h4 className={styles.activeFolderTitle}>{activeFolder.name}</h4>
                <span className={styles.activeFolderBadge}>
                  {processedTracks.length} երգ
                </span>
              </div>
              <p className={styles.activeFolderSubtitle}>
                Ցուցադրվում են միայն այս ֆոլդերի մեջ գտնվող երգերը
              </p>
            </div>
          </div>

          <div className={styles.activeFolderActions}>
            {processedTracks.length > 0 && (
              <button
                type="button"
                className={styles.playFolderBtn}
                onClick={handlePlayFolder}
                title="Նվագարկել այս ֆոլդերի բոլոր երգերը"
              >
                ▶ Նվագարկել Ֆոլդերը
              </button>
            )}

            <button
              type="button"
              className={styles.clearFolderFilterBtn}
              onClick={() => setSelectedFolderId(null)}
              title="Մաքրել ֆոլդերի ֆիլտրը"
            >
              ✕ Բոլոր Երգերը
            </button>
          </div>
        </div>
      )}

      {/* Control Bar (Filters, Search, Add Button) */}
      <div className={styles.controlBar}>
        {/* Genre / Playlist Pills */}
        <div className={styles.genrePills}>
          {MUSIC_GENRES.map((g) => (
            <button
              key={g.id}
              type="button"
              className={`${styles.genrePill} ${
                selectedGenre === g.id ? styles.genrePillActive : ''
              }`}
              onClick={() => setSelectedGenre(g.id)}
            >
              <span>{g.icon}</span>
              <span>{g.label}</span>
            </button>
          ))}
        </div>

        {/* Right tools: Search, Sort, Add Button */}
        <div className={styles.controlRight}>
          <div className={styles.searchBox}>
            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" width="16" height="16" className={styles.searchIcon}>
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              type="text"
              placeholder="Փնտրել երգեր, կատարողներ, ֆոլդերներ..."
              className={styles.searchInput}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            {searchQuery && (
              <button
                type="button"
                className={styles.clearSearchBtn}
                onClick={() => setSearchQuery('')}
              >
                ×
              </button>
            )}
          </div>

          <select
            className={styles.sortSelect}
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
          >
            <option value="newest">🕒 Նորագույն</option>
            <option value="title">🔤 Անվանում (A-Z)</option>
            <option value="artist">👤 Կատարող</option>
            <option value="duration">⏱️ Տևողություն</option>
          </select>

          {unsyncedCount > 0 && (
            <button
              type="button"
              className={styles.syncBtn}
              onClick={handleManualSync}
              disabled={isSyncing}
              title="Սինքրոնացնել այս համակարգչի երգերը Firebase Storage & Cloud-ի հետ, որպեսզի հեռախոսում ևս լսվեն"
            >
              <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" width="16" height="16">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
              </svg>
              <span>{isSyncing ? 'Սինքրոնացվում է...' : `☁️ Սինքրոնացնել (${unsyncedCount})`}</span>
            </button>
          )}

          <button
            type="button"
            className={styles.youtubeBtn}
            onClick={() => setIsYouTubeModalOpen(true)}
            title="Ներբեռնել MP3 երգ YouTube-ի հղումով"
          >
            <svg fill="currentColor" viewBox="0 0 24 24" width="16" height="16">
              <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
            </svg>
            <span>📥 YouTube-ից MP3</span>
          </button>

          <button
            type="button"
            className={styles.addTrackBtn}
            onClick={() => setIsAddModalOpen(true)}
          >
            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" width="18" height="18">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 4v16m8-8H4" />
            </svg>
            <span>+ Ավելացնել Երգ</span>
          </button>
        </div>
      </div>

      {/* Tracks Table / List */}
      <div className={styles.trackListContainer}>
        {processedTracks.length === 0 ? (
          <div className={styles.emptyContainer}>
            <div className={styles.emptyIcon}>🎶</div>
            <h3 className={styles.emptyTitle}>Երգեր չեն գտնվել</h3>
            <p className={styles.emptySubtitle}>
              {searchQuery
                ? 'Փորձեք փոխել որոնման բառը կամ ֆիլտրը'
                : 'Ուղղակի քաշեք և գցեք (Drag & Drop) երգեր կամ ֆոլդերներ ձեր համակարգչից'}
            </p>
            <div style={{ display: 'flex', gap: '0.65rem', justifyContent: 'center', flexWrap: 'wrap' }}>
              <button
                type="button"
                className={styles.emptyAddBtn}
                onClick={() => setIsAddModalOpen(true)}
              >
                + Ավելացնել Երգ
              </button>
              <button
                type="button"
                className={styles.youtubeBtn}
                onClick={() => setIsYouTubeModalOpen(true)}
              >
                📥 YouTube-ից MP3
              </button>
            </div>
          </div>
        ) : (
          <div className={styles.tableWrapper}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th style={{ width: 44 }}>#</th>
                  <th>Երգի Անվանում</th>
                  <th>Կատարող</th>
                  <th>Ալբոմ</th>
                  <th>Ֆոլդեր</th>
                  <th>Ժանր</th>
                  <th>Տևողություն</th>
                  <th>Չափ</th>
                  <th style={{ width: 130, textAlign: 'right' }}>Գործողություններ</th>
                </tr>
              </thead>
              <tbody>
                {processedTracks.map((track, index) => {
                  const isCurrent = currentTrack?.id === track.id;
                  const isCurrentPlaying = isCurrent && isPlaying;

                  return (
                    <tr
                      key={track.id}
                      className={`${styles.row} ${isCurrent ? styles.rowCurrent : ''}`}
                      onDoubleClick={() => playTrack(track, processedTracks, masterPassword)}
                    >
                      {/* Column 1: Index / Play Button */}
                      <td className={styles.indexCol}>
                        <button
                          type="button"
                          className={styles.rowPlayBtn}
                          onClick={() => {
                            if (isCurrent) {
                              togglePlayPause();
                            } else {
                              playTrack(track, processedTracks, masterPassword);
                            }
                          }}
                          title={isCurrentPlaying ? 'Pause' : 'Play'}
                        >
                          {isCurrentPlaying ? (
                            <span className={styles.miniEq}>
                              <span />
                              <span />
                              <span />
                            </span>
                          ) : (
                            <span className={styles.rowPlayIcon}>▶</span>
                          )}
                          <span className={styles.rowNumber}>{index + 1}</span>
                        </button>
                      </td>

                      {/* Column 2: Title & Cover */}
                      <td>
                        <div className={styles.trackTitleCell}>
                          <img
                            src={
                              track.coverUrl ||
                              'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?auto=format&fit=crop&w=120&q=80'
                            }
                            alt={track.title}
                            className={styles.trackCoverMini}
                          />
                          <div className={styles.titleTextCol}>
                            <span className={`${styles.trackTitleName} ${isCurrent ? styles.titleActive : ''}`}>
                              {track.title}
                            </span>
                            <div className={styles.metaBadgesRow}>
                              {track.isEncrypted && (
                                <span className={styles.lockBadge}>🔒 AES</span>
                              )}
                              {(track.isCloudSynced || track.storagePath || (typeof track.url === 'string' && track.url.includes('firebasestorage.googleapis.com'))) && (
                                <span className={styles.cloudBadge} title="Պահպանված է Firebase Storage-ում">☁️ Cloud</span>
                              )}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Column 3: Artist */}
                      <td className={styles.mutedText}>{track.artist || 'Elyx Artist'}</td>

                      {/* Column 4: Album */}
                      <td className={styles.mutedText}>{track.album || 'Elyx Vault'}</td>

                      {/* Column 5: Folder */}
                      <td className={styles.colFolder}>
                        {track.folder ? (
                          <span
                            className={styles.folderBadge}
                            onClick={() => {
                              const found = folders.find(
                                (f) => f.id === track.folderId || f.name.toLowerCase() === track.folder.toLowerCase()
                              );
                              if (found) setSelectedFolderId(found.id);
                            }}
                            title="Ֆիլտրել ըստ այս ֆոլդերի"
                          >
                            📁 {track.folder}
                          </span>
                        ) : (
                          <span className={styles.noFolderText}>—</span>
                        )}
                      </td>

                      {/* Column 6: Genre */}
                      <td>
                        <span className={styles.genreBadge}>
                          {track.genre || 'General'}
                        </span>
                      </td>

                      {/* Column 7: Duration */}
                      <td className={styles.timeCol}>
                        {formatAudioDuration(track.duration)}
                      </td>

                      {/* Column 8: Size */}
                      <td className={styles.mutedText}>
                        {track.fileSize ? formatBytes(track.fileSize) : '—'}
                      </td>

                      {/* Column 9: Actions */}
                      <td className={styles.actionsCol}>
                        {/* Move to Folder Select */}
                        <select
                          className={styles.moveFolderSelect}
                          value={track.folderId || ''}
                          onChange={(e) => handleMoveTrackToFolder(track.id, e.target.value)}
                          title="Տեղափոխել ֆոլդեր"
                        >
                          <option value="">📁 Առանց ֆոլդերի</option>
                          {folders.map((f) => (
                            <option key={f.id} value={f.id}>
                              {f.icon || '📁'} {f.name}
                            </option>
                          ))}
                        </select>

                        {/* Favorite */}
                        <button
                          type="button"
                          className={`${styles.actionBtn} ${track.isFavorite ? styles.actionFav : ''}`}
                          onClick={() => handleToggleFavorite(track.id, !track.isFavorite)}
                          title={track.isFavorite ? 'Remove Favorite' : 'Mark Favorite'}
                        >
                          ★
                        </button>

                        {/* Download */}
                        <button
                          type="button"
                          className={styles.actionBtn}
                          onClick={() => downloadMediaFile({ ...track, type: 'audio' })}
                          title="Download audio"
                        >
                          <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" width="14" height="14">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                          </svg>
                        </button>

                        {/* Delete */}
                        <button
                          type="button"
                          className={`${styles.actionBtn} ${styles.actionDelete}`}
                          onClick={() => handleDeleteTrack(track.id, track.title)}
                          title="Delete track"
                        >
                          <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" width="14" height="14">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add Track Modal */}
      <AddTrackModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onSaveBatch={handleSaveBatchTracks}
        masterPassword={masterPassword}
        folders={folders}
        initialFolderId={selectedFolderId || ''}
      />

      {/* Create Folder Modal */}
      <CreateFolderModal
        isOpen={isFolderModalOpen}
        onClose={() => setIsFolderModalOpen(false)}
        onCreateFolder={handleCreateFolder}
      />

      {/* YouTube to MP3 Downloader Modal */}
      <YouTubeToMp3Modal
        isOpen={isYouTubeModalOpen}
        onClose={() => setIsYouTubeModalOpen(false)}
        folders={folders}
        initialFolderId={selectedFolderId || ''}
        uid={uid}
        businessId={businessId}
        onTrackCreated={(savedTrack) => {
          setTracks((prev) => [savedTrack, ...prev.filter((t) => t.id !== savedTrack.id)]);
          showToast(`✨ «${savedTrack.title}» երգը հաջողությամբ ավելացվեց YouTube-ից!`, 'success');
        }}
      />
    </div>
  );
};

export default MusicVault;
