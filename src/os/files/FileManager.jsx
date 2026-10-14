import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useAuth } from '../../hooks/useAuth.jsx';
import { subscribeToMedia } from '../../services/mediaService.js';
import { subscribeToNotes } from '../../services/notepadService.js';
import { subscribeToMusic } from '../../services/musicService.js';
import {
  formatFileSize,
  normalizeDeviceItem,
  normalizeMediaItem,
  normalizeNoteItem,
  normalizeProjectItem,
  normalizeTrackItem,
  STORAGE_LOCATION_DEFS,
  STORAGE_LOCATIONS,
} from './storageAdapters.js';
import styles from './FileManager.module.css';

export function FileManager({
  projects = [],
  devices = [],
  masterPassword,
  onOpenApp,
}) {
  const { user, access } = useAuth();
  const uid = user?.uid;
  const businessId = access?.businessId;

  // Selected Storage Location
  const [selectedLocation, setSelectedLocation] = useState(STORAGE_LOCATIONS.MEDIA);
  const [selectedFolder, setSelectedFolder] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState('grid'); // 'grid' | 'list'
  const [selectedFile, setSelectedFile] = useState(null);

  // Live Backend Collections State
  const [mediaList, setMediaList] = useState([]);
  const [notesList, setNotesList] = useState([]);
  const [musicList, setMusicList] = useState([]);

  // Subscribe to Media Vault in real-time
  useEffect(() => {
    if (!uid || !masterPassword) { setMediaList([]); setNotesList([]); setMusicList([]); setSelectedFile(null); return; }
    const unsub = subscribeToMedia(uid, businessId, (items) => {
      setMediaList(items || []);
    });
    if (!masterPassword) return <p role="status">Unlock the vault to browse files. Previews are hidden while locked.</p>;

  return () => {
      if (typeof unsub === 'function') unsub();
    };
  }, [uid, businessId, masterPassword]);

  // Subscribe to Notes in real-time
  useEffect(() => {
    if (!uid || !masterPassword) { setMediaList([]); setNotesList([]); setMusicList([]); setSelectedFile(null); return; }
    const unsub = subscribeToNotes(uid, businessId, (notes) => {
      setNotesList(notes || []);
    });
    return () => {
      if (typeof unsub === 'function') unsub();
    };
  }, [uid, businessId, masterPassword]);

  // Subscribe to Music Vault in real-time
  useEffect(() => {
    if (!uid || !masterPassword) { setMediaList([]); setNotesList([]); setMusicList([]); setSelectedFile(null); return; }
    const unsub = subscribeToMusic(uid, businessId, (tracks) => {
      setMusicList(tracks || []);
    });
    return () => {
      if (typeof unsub === 'function') unsub();
    };
  }, [uid, businessId, masterPassword]);

  // Compute normalized files for current location
  const currentFiles = useMemo(() => {
    let rawItems = [];

    switch (selectedLocation) {
      case STORAGE_LOCATIONS.MEDIA:
        rawItems = mediaList.map(normalizeMediaItem);
        break;
      case STORAGE_LOCATIONS.NOTES:
        rawItems = notesList.map(normalizeNoteItem);
        break;
      case STORAGE_LOCATIONS.MUSIC:
        rawItems = musicList.map(normalizeTrackItem);
        break;
      case STORAGE_LOCATIONS.PROJECTS:
        rawItems = projects.map(normalizeProjectItem);
        break;
      case STORAGE_LOCATIONS.DEVICES:
        rawItems = devices.map(normalizeDeviceItem);
        break;
      default:
        rawItems = [];
    }

    // Filter by Folder / Category if applicable
    let filtered = rawItems;
    if (selectedFolder !== 'All') {
      filtered = filtered.filter((file) => file.folder === selectedFolder);
    }

    // Filter by Search Query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      filtered = filtered.filter(
        (file) =>
          file.name.toLowerCase().includes(q) ||
          file.type.toLowerCase().includes(q) ||
          file.folder?.toLowerCase().includes(q)
      );
    }

    return filtered;
  }, [
    selectedLocation,
    mediaList,
    notesList,
    musicList,
    projects,
    devices,
    selectedFolder,
    searchQuery,
  ]);

  // Available sub-folders for the current location
  const availableFolders = useMemo(() => {
    switch (selectedLocation) {
      case STORAGE_LOCATIONS.MEDIA: {
        const categories = Array.from(new Set(mediaList.map((m) => m.category || 'General')));
        return ['All', ...categories];
      }
      case STORAGE_LOCATIONS.MUSIC: {
        const genres = Array.from(new Set(musicList.map((m) => m.genre || 'General')));
        return ['All', ...genres];
      }
      case STORAGE_LOCATIONS.NOTES: {
        const tags = Array.from(new Set(notesList.flatMap((n) => n.tags || [])));
        return ['All', ...tags];
      }
      default:
        return ['All'];
    }
  }, [selectedLocation, mediaList, musicList, notesList]);

  // Handle location change
  const handleLocationChange = (locId) => {
    setSelectedLocation(locId);
    setSelectedFolder('All');
    setSelectedFile(null);
  };

  const activeLocationDef = STORAGE_LOCATION_DEFS.find((l) => l.id === selectedLocation);

  // Contextual action: Open in host application
  const handleOpenInApp = (file) => {
    if (!file || !onOpenApp) return;
    onOpenApp(file.appId);
  };

  return (
    <div className={styles.fileManagerRoot} role="region" aria-label="Elyx OS Files">
      {/* -------------------------------------------------------------------- */}
      {/* LEFT SIDEBAR: Storage Locations                                      */}
      {/* -------------------------------------------------------------------- */}
      <aside className={styles.locationsSidebar}>
        <div className={styles.sidebarHeader}>
          <span className={styles.sidebarTitle}>Storage Locations</span>
        </div>

        <nav className={styles.locationsNav} aria-label="Storage Locations">
          {STORAGE_LOCATION_DEFS.map((loc) => {
            const isSelected = loc.id === selectedLocation;

            // Get dynamic count
            let count = 0;
            if (loc.id === STORAGE_LOCATIONS.MEDIA) count = mediaList.length;
            else if (loc.id === STORAGE_LOCATIONS.NOTES) count = notesList.length;
            else if (loc.id === STORAGE_LOCATIONS.MUSIC) count = musicList.length;
            else if (loc.id === STORAGE_LOCATIONS.PROJECTS) count = projects.length;
            else if (loc.id === STORAGE_LOCATIONS.DEVICES) count = devices.length;

            return (
              <button
                key={loc.id}
                type="button"
                className={`${styles.locationBtn} ${isSelected ? styles.locationActive : ''}`}
                onClick={() => handleLocationChange(loc.id)}
              >
                <div className={styles.locationIcon}>{loc.icon}</div>
                <div className={styles.locationDetails}>
                  <span className={styles.locationName}>{loc.name}</span>
                  <span className={styles.locationSub}>{loc.shortName}</span>
                </div>
                <span className={styles.locationBadge}>{count}</span>
              </button>
            );
          })}
        </nav>

        {/* Zero-Knowledge Memory Guard Notice */}
        <div className={styles.sidebarFooter}>
          <div className={styles.zkNoticeCard}>
            <div className={styles.zkNoticeIcon}>🛡️</div>
            <div className={styles.zkNoticeText}>
              <span>Zero-Knowledge Storage</span>
              <p>Files are protected with client-side cryptography.</p>
            </div>
          </div>
        </div>
      </aside>

      {/* -------------------------------------------------------------------- */}
      {/* MAIN BROWSER AREA                                                    */}
      {/* -------------------------------------------------------------------- */}
      <main className={styles.mainBrowser}>
        {/* Top Control Toolbar */}
        <header className={styles.browserToolbar}>
          {/* Breadcrumb Navigation */}
          <div className={styles.breadcrumbs} aria-label="Breadcrumb">
            <span className={styles.breadcrumbRoot}>Elyx Files</span>
            <span className={styles.breadcrumbSep}>›</span>
            <span className={styles.breadcrumbActive}>{activeLocationDef?.name}</span>
            {selectedFolder !== 'All' && (
              <>
                <span className={styles.breadcrumbSep}>›</span>
                <span className={styles.breadcrumbFolder}>{selectedFolder}</span>
              </>
            )}
          </div>

          {/* Search Input & View Toggle */}
          <div className={styles.toolbarActions}>
            <div className={styles.searchWrapper}>
              <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" width="16" height="16">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input
                type="text"
                placeholder={`Search ${activeLocationDef?.shortName}…`}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className={styles.searchInput}
              />
              {searchQuery && (
                <button
                  type="button"
                  className={styles.clearBtn}
                  onClick={() => setSearchQuery('')}
                >
                  ×
                </button>
              )}
            </div>

            {/* View Mode Toggle (Grid vs List) */}
            <div className={styles.viewModeGroup}>
              <button
                type="button"
                className={`${styles.viewBtn} ${viewMode === 'grid' ? styles.viewBtnActive : ''}`}
                onClick={() => setViewMode('grid')}
                title="Grid View"
                aria-label="Grid View"
              >
                <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" width="16" height="16">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
                </svg>
              </button>
              <button
                type="button"
                className={`${styles.viewBtn} ${viewMode === 'list' ? styles.viewBtnActive : ''}`}
                onClick={() => setViewMode('list')}
                title="List View"
                aria-label="List View"
              >
                <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" width="16" height="16">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              </button>
            </div>
          </div>
        </header>

        {/* Sub-Folders / Category Chips (where supported) */}
        {availableFolders.length > 1 && (
          <div className={styles.foldersBar}>
            <span className={styles.foldersLabel}>Categories:</span>
            {availableFolders.map((folder) => (
              <button
                key={folder}
                type="button"
                className={`${styles.folderChip} ${selectedFolder === folder ? styles.folderActive : ''}`}
                onClick={() => setSelectedFolder(folder)}
              >
                {folder}
              </button>
            ))}
          </div>
        )}

        {/* File Content Stage */}
        <div className={styles.contentStage}>
          {/* GRID VIEW */}
          {viewMode === 'grid' && (
            <div className={styles.filesGrid}>
              {currentFiles.map((file) => {
                const isSelected = selectedFile?.id === file.id;

                return (
                  <div
                    key={file.id}
                    className={`${styles.fileCard} ${isSelected ? styles.fileSelected : ''}`}
                    onClick={() => setSelectedFile(file)}
                    onDoubleClick={() => handleOpenInApp(file)}
                  >
                    {/* Thumbnail / Icon preview */}
                    <div className={styles.fileThumbnail}>
                      {!file.isEncrypted && file.type === 'image' && file.thumbnailUrl ? (
                        <img src={file.thumbnailUrl} alt="" className={styles.thumbImg} />
                      ) : file.type === 'video' ? (
                        <div className={styles.thumbVideoBadge}>🎬 Video</div>
                      ) : file.type === 'audio' ? (
                        <div className={styles.thumbAudioBadge}>🎵 Audio</div>
                      ) : file.type === 'document' ? (
                        <div className={styles.thumbDocBadge}>📄 Markdown</div>
                      ) : (
                        <div className={styles.thumbGenericBadge}>🔐 Vault</div>
                      )}

                      {/* Lock status badge */}
                      {file.isEncrypted && (
                        <span className={styles.lockBadge} title="Client-Side Encrypted">
                          🔒
                        </span>
                      )}
                    </div>

                    {/* File Title & Info */}
                    <div className={styles.fileCardInfo}>
                      <span className={styles.fileCardName} title={file.name}>
                        {file.name}
                      </span>
                      <div className={styles.fileCardMeta}>
                        <span>{formatFileSize(file.sizeBytes)}</span>
                        <span>•</span>
                        <span>{file.folder}</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* LIST VIEW */}
          {viewMode === 'list' && (
            <div className={styles.filesTableContainer}>
              <table className={styles.filesTable}>
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Type</th>
                    <th>Category</th>
                    <th>Size</th>
                    <th>Security</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {currentFiles.map((file) => {
                    const isSelected = selectedFile?.id === file.id;

                    return (
                      <tr
                        key={file.id}
                        className={isSelected ? styles.rowSelected : ''}
                        onClick={() => setSelectedFile(file)}
                        onDoubleClick={() => handleOpenInApp(file)}
                      >
                        <td className={styles.nameCell}>
                          <span className={styles.tableIcon}>
                            {file.type === 'image'
                              ? '🖼️'
                              : file.type === 'video'
                              ? '🎥'
                              : file.type === 'audio'
                              ? '🎵'
                              : file.type === 'document'
                              ? '📄'
                              : '🔐'}
                          </span>
                          <span className={styles.tableNameText} title={file.name}>
                            {file.name}
                          </span>
                        </td>
                        <td>{file.mimeType}</td>
                        <td>{file.folder}</td>
                        <td>{formatFileSize(file.sizeBytes)}</td>
                        <td>
                          {file.isEncrypted ? (
                            <span className={styles.secEncrypted}>🔒 Encrypted</span>
                          ) : (
                            <span className={styles.secStandard}>Standard</span>
                          )}
                        </td>
                        <td>
                          <button
                            type="button"
                            className={styles.openBtn}
                            onClick={(e) => {
                              e.stopPropagation();
                              handleOpenInApp(file);
                            }}
                          >
                            Open
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {/* Empty State */}
          {currentFiles.length === 0 && (
            <div className={styles.emptyFilesState}>
              <div className={styles.emptyIcon}>📁</div>
              <h3>No items in {activeLocationDef?.name}</h3>
              <p>
                {searchQuery
                  ? `No files matched query "${searchQuery}".`
                  : `Launch ${activeLocationDef?.name} to add items to this location.`}
              </p>
              <button
                type="button"
                className={styles.openAppLaunchBtn}
                onClick={() => onOpenApp?.(activeLocationDef?.appId)}
              >
                Open {activeLocationDef?.name} Application
              </button>
            </div>
          )}
        </div>
      </main>

      {/* -------------------------------------------------------------------- */}
      {/* RIGHT INSPECTOR PANEL: File Details & Preview                        */}
      {/* -------------------------------------------------------------------- */}
      {selectedFile && (
        <aside className={styles.inspectorSidebar}>
          <div className={styles.inspectorHeader}>
            <span className={styles.inspectorTitle}>File Inspector</span>
            <button
              type="button"
              className={styles.inspectorCloseBtn}
              onClick={() => setSelectedFile(null)}
            >
              ×
            </button>
          </div>

          <div className={styles.inspectorBody}>
            {/* Live Preview */}
            <div className={styles.inspectorPreviewBox}>
              {!selectedFile.isEncrypted && selectedFile.type === 'image' && selectedFile.url ? (
                <img src={selectedFile.url} alt="" className={styles.previewImage} />
              ) : !selectedFile.isEncrypted && selectedFile.type === 'audio' && selectedFile.url ? (
                <audio controls src={selectedFile.url} className={styles.previewAudio} />
              ) : !selectedFile.isEncrypted && selectedFile.contentSnippet ? (
                <pre className={styles.previewSnippet}>{selectedFile.contentSnippet}</pre>
              ) : (
                <div className={styles.previewGeneric}>
                  <span>{activeLocationDef?.icon}</span>
                  <p>{selectedFile.name}</p>
                </div>
              )}
            </div>

            {/* Metadata Fields */}
            <div className={styles.metaSection}>
              <h4 className={styles.metaHeading}>File Details</h4>

              <div className={styles.metaRow}>
                <span>Location</span>
                <span className={styles.metaVal}>{activeLocationDef?.name}</span>
              </div>

              <div className={styles.metaRow}>
                <span>File Size</span>
                <span className={styles.metaVal}>{formatFileSize(selectedFile.sizeBytes)}</span>
              </div>

              <div className={styles.metaRow}>
                <span>MIME Type</span>
                <span className={styles.metaVal}>{selectedFile.mimeType}</span>
              </div>

              <div className={styles.metaRow}>
                <span>Folder / Tag</span>
                <span className={styles.metaVal}>{selectedFile.folder}</span>
              </div>

              <div className={styles.metaRow}>
                <span>Encryption</span>
                <span className={styles.metaVal}>
                  {selectedFile.isEncrypted ? 'AES-256 Zero-Knowledge' : 'Standard Cloud'}
                </span>
              </div>

              <div className={styles.metaRow}>
                <span>Storage Backend</span>
                <span className={styles.metaVal}>
                  {selectedFile.metadata?.storageBackend || 'Firestore Database'}
                </span>
              </div>
            </div>

            {/* Contextual Action Button */}
            <div className={styles.inspectorActions}>
              <button
                type="button"
                className={styles.primaryOpenBtn}
                onClick={() => handleOpenInApp(selectedFile)}
              >
                🚀 Open in {activeLocationDef?.name}
              </button>
            </div>
          </div>
        </aside>
      )}
    </div>
  );
}

export default FileManager;
