import { usePagedItems } from '../../os/hooks/usePagedItems.js';
import LibraryPagination from '../../os/shell/LibraryPagination.jsx';
import React, { useState, useDeferredValue, useEffect, useMemo, useRef } from 'react';
import { useAuth } from '../../hooks/useAuth.jsx';
import {
  subscribeToMedia,
  saveMediaItem,
  saveBatchMediaItems,
  deleteMediaItem,
  parseMediaFile,
  formatBytes,
  MEDIA_CATEGORIES,
  syncUnsyncedMediaToCloud,
} from '../../services/mediaService';
import { scanDroppedItems } from '../../services/musicService';
import { MediaCard } from './MediaCard';
import { AddMediaModal } from './AddMediaModal';
import { MediaViewerModal } from './MediaViewerModal';
import styles from './MediaVault.module.css';

export const MediaVault = ({ masterPassword, onUnlockVault }) => {
  const { user, access } = useAuth();
  const uid = user?.uid;
  const businessId = access?.businessId;

  const [mediaItems, setMediaItems] = useState([]);
  const [selectedTypeFilter, setSelectedTypeFilter] = useState('all'); // 'all' | 'image' | 'video' | 'favorite' | 'encrypted'
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  const deferredSearch = useDeferredValue(searchQuery);
  const [sortBy, setSortBy] = useState('newest'); // 'newest' | 'oldest' | 'title' | 'size'
  const [gridDensity, setGridDensity] = useState('standard'); // 'standard' | 'compact'

  // Drag and drop overlay state
  const [isWindowDragging, setIsWindowDragging] = useState(false);
  const dropSurfaceRef = useRef(null);
  const dragCounterRef = useRef(0);

  // Modals state
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [viewerItem, setViewerItem] = useState(null);
  const [toastMessage, setToastMessage] = useState(null);
  const [isSyncing, setIsSyncing] = useState(false);

  // Unsynced count (items stored locally but not yet on Firebase Storage or Cloud Firestore)
  const unsyncedCount = useMemo(() => {
    return mediaItems.filter((m) => !m.isCloudSynced).length;
  }, [mediaItems]);

  const handleManualSync = async () => {
    if (isSyncing) return;
    setIsSyncing(true);
    showToast('⏳ Սկսվում է մեդիա ֆայլերի ամպային սինքրոնացումը Firebase Cloud-ի հետ...', 'info');
    try {
      await syncUnsyncedMediaToCloud(uid, businessId);
      showToast('✅ Բոլոր նկարներն ու վիդեոները հաջողությամբ սինքրոնացվեցին Cloud-ում!', 'success');
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

  // Subscribe to media items
  useEffect(() => {
    const unsub = subscribeToMedia(
      uid,
      businessId,
      (fetched) => {
        setMediaItems(fetched);
      },
      (err) => {
        console.warn('Real-time media subscription notice:', err);
      }
    );

    return () => {
      if (typeof unsub === 'function') unsub();
    };
  }, [uid, businessId]);

  // Global Drag & Drop listener for dropping multiple photos/videos directly onto the screen
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

      // Scan dropped items recursively (supports dropping entire folders of photos/videos)
      const droppedEntries = await scanDroppedItems(e.dataTransfer);
      const mediaFiles = droppedEntries
        .map((entry) => entry.file)
        .filter(
          (f) =>
            f &&
            (f.type.startsWith('image/') ||
              f.type.startsWith('video/') ||
              /\.(png|jpg|jpeg|webp|gif|svg|mp4|webm|mov|ogg)$/i.test(f.name))
        );

      if (mediaFiles.length === 0) {
        showToast('Խնդրում ենք drop անել նկարներ կամ վիդեոներ', 'error');
        return;
      }

      showToast(`☁️ Վերբեռնվում է ${mediaFiles.length} ֆայլ Firebase Storage...`, 'info');

      const batchToSave = [];
      for (const file of mediaFiles) {
        try {
          const parsed = await parseMediaFile(file);
          const itemRecord = {
            id: `media-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
            title: parsed.title,
            description: '',
            type: parsed.type,
            url: parsed.blobUrl || '',
            thumbnailUrl: parsed.blobUrl || '',
            category: 'Assets',
            tags: [],
            isFavorite: false,
            isEncrypted: false,
            fileSize: parsed.fileSize,
            dimensions: parsed.dimensions,
            duration: parsed.duration,
            createdAt: new Date().toISOString(),
          };
          batchToSave.push({ item: itemRecord, file, blobData: parsed.dataUrl });
        } catch (err) {
          console.warn('Failed to parse dropped media:', err);
        }
      }

      if (batchToSave.length > 0) {
        const savedBatch = await saveBatchMediaItems(batchToSave, uid, businessId);
        setMediaItems((prev) => [...savedBatch, ...prev]);
        showToast(`✨ ${savedBatch.length} նկար/վիդեո պահպանվեց Firebase Storage-ում!`, 'success');
      }
    };

    const surface = dropSurfaceRef.current;
    if (!surface) return;
    surface.addEventListener('dragenter', handleDragEnter);
    surface.addEventListener('dragleave', handleDragLeave);
    surface.addEventListener('dragover', handleDragOver);
    surface.addEventListener('drop', handleDrop);

    return () => {
      surface.removeEventListener('dragenter', handleDragEnter);
      surface.removeEventListener('dragleave', handleDragLeave);
      surface.removeEventListener('dragover', handleDragOver);
      surface.removeEventListener('drop', handleDrop);
    };
  }, [uid, businessId]);

  // Handle Save Batch
  const handleSaveMediaBatch = async (batch) => {
    showToast(`Saving ${batch.length} items…`, 'info');
    const saved = await saveBatchMediaItems(batch, uid, businessId);
    setMediaItems((prev) => [...saved, ...prev.filter((m) => !saved.some((s) => s.id === m.id))]);
    showToast(`${saved.length} items saved.${saved.some(item => item._encryptedLocalPayload) ? ' Encrypted files are stored on this device only.' : ''}`, 'success');
  };

  // Handle Delete Item
  const handleDeleteMedia = async (mediaId) => {
    await deleteMediaItem(mediaId, uid);
    setMediaItems((prev) => prev.filter((m) => m.id !== mediaId));
    if (viewerItem?.id === mediaId) {
      setViewerItem(null);
    }
    showToast('🗑️ Մեդիան ջնջված է', 'info');
  };

  // Handle Favorite Toggle
  const handleToggleFavorite = async (mediaId, isFav) => {
    const target = mediaItems.find((m) => m.id === mediaId);
    if (!target) return;

    const updated = { ...target, isFavorite: isFav };
    setMediaItems((prev) => prev.map((m) => (m.id === mediaId ? updated : m)));
    await saveMediaItem({ item: updated, uid, businessId });
    if (viewerItem?.id === mediaId) {
      setViewerItem(updated);
    }
  };

  // Filtered and Sorted media items
  const processedMedia = useMemo(() => {
    let result = [...mediaItems];

    // Filter by type
    if (selectedTypeFilter === 'image') {
      result = result.filter((m) => m.type === 'image');
    } else if (selectedTypeFilter === 'video') {
      result = result.filter((m) => m.type === 'video');
    } else if (selectedTypeFilter === 'favorite') {
      result = result.filter((m) => m.isFavorite);
    } else if (selectedTypeFilter === 'encrypted') {
      result = result.filter((m) => m.isEncrypted);
    }

    // Filter by category
    if (selectedCategory !== 'All') {
      result = result.filter((m) => m.category === selectedCategory);
    }

    // Search query
    if (deferredSearch.trim()) {
      const q = deferredSearch.toLowerCase();
      result = result.filter((m) => {
        const titleMatch = (m.title || '').toLowerCase().includes(q);
        const descMatch = (m.description || '').toLowerCase().includes(q);
        const tagMatch = (m.tags || []).some((t) => t.toLowerCase().includes(q));
        return titleMatch || descMatch || tagMatch;
      });
    }

    // Sort
    if (sortBy === 'newest') {
      result.sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
    } else if (sortBy === 'oldest') {
      result.sort((a, b) => new Date(a.createdAt || 0) - new Date(b.createdAt || 0));
    } else if (sortBy === 'title') {
      result.sort((a, b) => (a.title || '').localeCompare(b.title || ''));
    } else if (sortBy === 'size') {
      result.sort((a, b) => (b.fileSize || 0) - (a.fileSize || 0));
    }

    return result;
  }, [mediaItems, selectedTypeFilter, selectedCategory, deferredSearch, sortBy]);

  const pagination = usePagedItems(processedMedia);

  // Statistics
  const stats = useMemo(() => {
    const total = mediaItems.length;
    const images = mediaItems.filter((m) => m.type === 'image').length;
    const videos = mediaItems.filter((m) => m.type === 'video').length;
    const favorites = mediaItems.filter((m) => m.isFavorite).length;
    const encrypted = mediaItems.filter((m) => m.isEncrypted).length;
    const totalBytes = mediaItems.reduce((acc, m) => acc + (m.fileSize || 0), 0);

    return { total, images, videos, favorites, encrypted, totalBytes };
  }, [mediaItems]);

  // Navigation inside Viewer Modal
  const handlePrevItem = () => {
    if (!viewerItem) return;
    const currentIndex = processedMedia.findIndex((m) => m.id === viewerItem.id);
    if (currentIndex > 0) {
      setViewerItem(processedMedia[currentIndex - 1]);
    } else {
      setViewerItem(processedMedia[processedMedia.length - 1]);
    }
  };

  const handleNextItem = () => {
    if (!viewerItem) return;
    const currentIndex = processedMedia.findIndex((m) => m.id === viewerItem.id);
    if (currentIndex < processedMedia.length - 1) {
      setViewerItem(processedMedia[currentIndex + 1]);
    } else {
      setViewerItem(processedMedia[0]);
    }
  };

  return (
    <div ref={dropSurfaceRef} className={styles.container}>
      <LibraryPagination pagination={pagination} />
      {/* Toast Alert */}
      {toastMessage && (
        <div className={`${styles.toast} ${styles[`toast_${toastMessage.type}`]}`}>
          <span>{toastMessage.text}</span>
        </div>
      )}

      {/* Global Drag and Drop Overlay for Photos and Videos */}
      {isWindowDragging && (
        <div className={styles.dragDropOverlay}>
          <div className={styles.dragDropCard}>
            <div className={styles.dragPulseIcon}>🎬</div>
            <h2 className={styles.dragTitle}>Drop Photos & Videos Here</h2>
            <p className={styles.dragSubtitle}>
              Բաց թողեք նկարները և վիդեոները՝ անմիջապես պահոցում ավելացնելու համար
            </p>
          </div>
        </div>
      )}

      {/* Hero Stats Banner */}
      <div className={styles.statsBanner}>
        <div className={styles.bannerLeft}>
          <div className={styles.bannerIconBox}>
            <span>🎬</span>
          </div>
          <div>
            <h2 className={styles.bannerTitle}>Media Vault & Studio</h2>
            <p className={styles.bannerSubtitle}>
              Բարձր որակի լուսանկարներ, 4K վիդեոներ, YouTube և Zero-Knowledge գաղտնագրում
            </p>
          </div>
        </div>

        <div className={styles.statsRow}>
          <div className={styles.statBox}>
            <span className={styles.statNumber}>{stats.total}</span>
            <span className={styles.statLabel}>Ընդհանուր</span>
          </div>

          <div className={styles.statBox}>
            <span className={styles.statNumber}>🖼️ {stats.images}</span>
            <span className={styles.statLabel}>Նկարներ</span>
          </div>

          <div className={styles.statBox}>
            <span className={styles.statNumber}>🎥 {stats.videos}</span>
            <span className={styles.statLabel}>Վիդեոներ</span>
          </div>

          <div className={styles.statBox}>
            <span className={styles.statNumber}>⭐ {stats.favorites}</span>
            <span className={styles.statLabel}>Սիրված</span>
          </div>

          {stats.totalBytes > 0 && (
            <div className={styles.statBox}>
              <span className={styles.statNumber}>{formatBytes(stats.totalBytes)}</span>
              <span className={styles.statLabel}>Ծավալ</span>
            </div>
          )}
        </div>
      </div>

      {/* Control Bar (Filters, Search, Add Media) */}
      <div className={styles.controlBar}>
        {/* Left: Type Filters (All, Photos, Videos, Favorites, Secret) */}
        <div className={styles.filterPillsGroup}>
          <button
            type="button"
            className={`${styles.pillBtn} ${selectedTypeFilter === 'all' ? styles.pillBtnActive : ''}`}
            onClick={() => setSelectedTypeFilter('all')}
          >
            📁 Բոլորը ({stats.total})
          </button>

          <button
            type="button"
            className={`${styles.pillBtn} ${selectedTypeFilter === 'image' ? styles.pillBtnActive : ''}`}
            onClick={() => setSelectedTypeFilter('image')}
          >
            🖼️ Նկարներ ({stats.images})
          </button>

          <button
            type="button"
            className={`${styles.pillBtn} ${selectedTypeFilter === 'video' ? styles.pillBtnActive : ''}`}
            onClick={() => setSelectedTypeFilter('video')}
          >
            🎥 Վիդեոներ ({stats.videos})
          </button>

          <button
            type="button"
            className={`${styles.pillBtn} ${selectedTypeFilter === 'favorite' ? styles.pillBtnActive : ''}`}
            onClick={() => setSelectedTypeFilter('favorite')}
          >
            ⭐ Սիրված ({stats.favorites})
          </button>

          <button
            type="button"
            className={`${styles.pillBtn} ${selectedTypeFilter === 'encrypted' ? styles.pillBtnActive : ''}`}
            onClick={() => setSelectedTypeFilter('encrypted')}
          >
            🔒 Գաղտնի ({stats.encrypted})
          </button>
        </div>

        {/* Right: Search, Category, Add Button */}
        <div className={styles.controlRight}>
          {/* Search Box */}
          <div className={styles.searchBox}>
            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" width="16" height="16" className={styles.searchIcon}>
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              type="text"
              placeholder="Փնտրել մեդիա, թեգեր..."
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

          {/* Category Dropdown */}
          <select
            className={styles.selectFilter}
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
          >
            {MEDIA_CATEGORIES.map((cat) => (
              <option key={cat.id} value={cat.id}>
                {cat.icon} {cat.id}
              </option>
            ))}
          </select>

          {/* Sort Dropdown */}
          <select
            className={styles.selectFilter}
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
          >
            <option value="newest">🕒 Նորագույն</option>
            <option value="oldest">⌛ Հնագույն</option>
            <option value="title">🔤 Անուն (A-Z)</option>
            <option value="size">📦 Ֆայլի Չափ</option>
          </select>

          {/* Grid Density Toggle */}
          <div className={styles.densityGroup}>
            <button
              type="button"
              className={`${styles.densityBtn} ${gridDensity === 'standard' ? styles.densityBtnActive : ''}`}
              onClick={() => setGridDensity('standard')}
              title="Standard Grid (3 Columns)"
            >
              ◫
            </button>
            <button
              type="button"
              className={`${styles.densityBtn} ${gridDensity === 'compact' ? styles.densityBtnActive : ''}`}
              onClick={() => setGridDensity('compact')}
              title="Compact Grid (4-5 Columns)"
            >
              ☷
            </button>
          </div>

          {/* Add Media Primary Button */}
          {unsyncedCount > 0 && (
            <button
              type="button"
              className={styles.syncBtn}
              onClick={handleManualSync}
              disabled={isSyncing}
              title="Սինքրոնացնել այս համակարգչի նկարներն ու վիդեոները Firebase Storage & Cloud-ի հետ, որպեսզի հեռախոսում ևս երևան"
            >
              <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" width="16" height="16">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
              </svg>
              <span>{isSyncing ? 'Սինքրոնացվում է...' : `☁️ Սինքրոնացնել (${unsyncedCount})`}</span>
            </button>
          )}

          <button
            type="button"
            className={styles.addMediaBtn}
            onClick={() => setIsAddModalOpen(true)}
          >
            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" width="18" height="18">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 4v16m8-8H4" />
            </svg>
            <span>+ Ավելացնել Մեդիա</span>
          </button>
        </div>
      </div>

      {/* Main Media Grid Area */}
      {processedMedia.length === 0 ? (
        <div className={styles.emptyContainer}>
          <div className={styles.emptyIcon}>🎬</div>
          <h3 className={styles.emptyTitle}>Մեդիա ֆայլեր չեն գտնվել</h3>
          <p className={styles.emptySubtitle}>
            {searchQuery
              ? 'Փորձեք փոխել որոնման բառը կամ ֆիլտրը'
              : 'Սեղմեք «+ Ավելացնել Մեդիա» կոճակը՝ ձեր առաջին լուսանկարը կամ վիդեոն ավելացնելու համար'}
          </p>
          <button
            type="button"
            className={styles.emptyActionBtn}
            onClick={() => {
              if (searchQuery || selectedTypeFilter !== 'all' || selectedCategory !== 'All') {
                setSearchQuery('');
                setSelectedTypeFilter('all');
                setSelectedCategory('All');
              } else {
                setIsAddModalOpen(true);
              }
            }}
          >
            {searchQuery || selectedTypeFilter !== 'all' || selectedCategory !== 'All'
              ? 'Մաքրել ֆիլտրերը'
              : '+ Ավելացնել Մեդիա'}
          </button>
        </div>
      ) : (
        <div
          className={`${styles.mediaGrid} ${
            gridDensity === 'compact' ? styles.mediaGridCompact : ''
          }`}
        >
          {pagination.items.map((item) => (
            <MediaCard
              key={item.id}
              item={item}
              onClick={() => setViewerItem(item)}
              onToggleFavorite={handleToggleFavorite}
              onDelete={handleDeleteMedia}
              masterPassword={masterPassword}
            />
          ))}
        </div>
      )}

      {/* Add Media Modal */}
      <AddMediaModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onSaveBatch={handleSaveMediaBatch}
        masterPassword={masterPassword}
      />

      {/* Media Viewer / Lightbox Player Modal */}
      <MediaViewerModal
        item={viewerItem}
        items={processedMedia}
        isOpen={Boolean(viewerItem)}
        onClose={() => setViewerItem(null)}
        onSelectPrev={handlePrevItem}
        onSelectNext={handleNextItem}
        onToggleFavorite={handleToggleFavorite}
        onDelete={handleDeleteMedia}
        masterPassword={masterPassword}
        onUnlockVault={onUnlockVault}
      />
    </div>
  );
};

export default MediaVault;
