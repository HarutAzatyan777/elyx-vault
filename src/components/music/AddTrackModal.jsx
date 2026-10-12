import React, { useState, useRef } from 'react';
import {
  MUSIC_GENRES,
  parseAudioFile,
  formatAudioDuration,
  formatBytes,
} from '../../services/musicService';
import { encryptData } from '../../utils/crypto';
import styles from './AddTrackModal.module.css';

export const AddTrackModal = ({
  isOpen,
  onClose,
  onSaveBatch,
  masterPassword,
  folders = [],
  initialFolderId = '',
}) => {
  const [activeTab, setActiveTab] = useState('upload'); // 'upload' | 'url'

  // Batch queue for songs
  const [trackQueue, setTrackQueue] = useState([]);
  const [genre, setGenre] = useState('Personal');
  const [album, setAlbum] = useState('Elyx Vault');
  const [selectedFolderId, setSelectedFolderId] = useState(initialFolderId || '');
  const [coverUrl, setCoverUrl] = useState('');
  const [isEncrypted, setIsEncrypted] = useState(false);
  const [isDragging, setIsDragging] = useState(false);

  // URL state
  const [audioUrl, setAudioUrl] = useState('');
  const [urlTitle, setUrlTitle] = useState('');
  const [urlArtist, setUrlArtist] = useState('');

  const [errorMsg, setErrorMsg] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [uploadProgress, setUploadProgress] = useState({ current: 0, total: 0 });
  const fileInputRef = useRef(null);
  const folderInputRef = useRef(null);

  if (!isOpen) return null;

  // Process chosen files into trackQueue
  const handleFilesProcess = async (filesList) => {
    if (!filesList || filesList.length === 0) return;
    setErrorMsg('');

    const files = Array.from(filesList);
    const newItems = [];

    for (const file of files) {
      try {
        const parsed = await parseAudioFile(file);
        newItems.push({
          id: `queue-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
          file,
          name: file.name,
          title: parsed.title,
          artist: parsed.artist || 'My Audio',
          duration: parsed.duration,
          fileSize: parsed.fileSize,
          blobUrl: parsed.blobUrl,
          dataUrl: parsed.dataUrl,
        });
      } catch (err) {
        console.warn('Track parse warning:', err);
      }
    }

    if (newItems.length === 0) {
      setErrorMsg('Խնդրում ենք ընտրել աուդիո ֆայլեր (MP3, WAV, FLAC, M4A, OGG, AAC):');
      return;
    }

    setTrackQueue((prev) => [...prev, ...newItems]);
  };

  const handleRemoveQueueItem = (id) => {
    setTrackQueue((prev) => prev.filter((item) => item.id !== id));
  };

  const handleUpdateItemField = (id, field, value) => {
    setTrackQueue((prev) =>
      prev.map((item) => (item.id === id ? { ...item, [field]: value } : item))
    );
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFilesProcess(e.dataTransfer.files);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg('');

    if (isEncrypted && !masterPassword) {
      setErrorMsg('Գաղտնագրման համար անհրաժեշտ է Master Password:');
      return;
    }

    const defaultCovers = [
      'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?auto=format&fit=crop&w=400&q=80',
      'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?auto=format&fit=crop&w=400&q=80',
      'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?auto=format&fit=crop&w=400&q=80',
      'https://images.unsplash.com/photo-1451187580459-43490279c0fa?auto=format&fit=crop&w=400&q=80',
    ];

    // 1. URL mode
    if (activeTab === 'url') {
      if (!audioUrl.trim()) {
        setErrorMsg('Խնդրում ենք մուտքագրել աուդիո ֆայլի (MP3) հղումը:');
        return;
      }

      setIsSubmitting(true);
      try {
        let finalUrl = audioUrl.trim();
        if (isEncrypted && masterPassword) {
          const enc = encryptData(finalUrl, masterPassword);
          if (enc) finalUrl = enc;
        }

        const fallbackCover = defaultCovers[Math.floor(Math.random() * defaultCovers.length)];
        const newTrack = {
          id: `track-${Date.now()}`,
          title: urlTitle.trim() || 'Online Audio',
          artist: urlArtist.trim() || 'Web Stream',
          album: album.trim() || 'Elyx Vault',
          genre,
          duration: 0,
          fileSize: 0,
          url: finalUrl,
          coverUrl: coverUrl.trim() || fallbackCover,
          isFavorite: false,
          isEncrypted,
          createdAt: new Date().toISOString(),
        };

        await onSaveBatch([{ track: newTrack, audioBlob: null }]);
        onClose();
      } catch (err) {
        console.error('URL track save error:', err);
        setErrorMsg('Չհաջողվեց պահպանել երգը:');
      } finally {
        setIsSubmitting(false);
      }
      return;
    }

    // 2. Batch Upload mode
    if (trackQueue.length === 0) {
      setErrorMsg('Խնդրում ենք ընտրել կամ drop անել գոնե մեկ երգ:');
      return;
    }

    setIsSubmitting(true);
    setUploadProgress({ current: 0, total: trackQueue.length });

    try {
      const batchToSave = [];

      for (let i = 0; i < trackQueue.length; i++) {
        const item = trackQueue[i];
        let savedUrl = item.blobUrl || '';

        if (isEncrypted && masterPassword) {
          const enc = encryptData(item.dataUrl, masterPassword);
          if (enc) savedUrl = enc;
        }

        const fallbackCover = defaultCovers[(i + Math.floor(Math.random() * 4)) % defaultCovers.length];
        const targetFolder = folders.find((f) => f.id === selectedFolderId);

        const trackRecord = {
          id: `track-${Date.now()}-${i}-${Math.random().toString(36).substr(2, 4)}`,
          title: item.title.trim() || item.name,
          artist: item.artist.trim() || 'My Audio',
          album: album.trim() || (targetFolder ? targetFolder.name : 'Elyx Vault'),
          genre,
          folderId: targetFolder ? targetFolder.id : null,
          folder: targetFolder ? targetFolder.name : (item.detectedFolder || null),
          duration: item.duration,
          fileSize: item.fileSize,
          url: savedUrl,
          coverUrl: coverUrl.trim() || fallbackCover,
          isFavorite: false,
          isEncrypted,
          createdAt: new Date().toISOString(),
        };

        batchToSave.push({ track: trackRecord, file: item.file, audioBlob: item.dataUrl });
        setUploadProgress({ current: i + 1, total: trackQueue.length });
      }

      await onSaveBatch(batchToSave);
      onClose();
    } catch (err) {
      console.error('Batch track save error:', err);
      setErrorMsg('Չհաջողվեց պահպանել երգերը:');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className={styles.backdrop} onClick={onClose}>
      <div className={styles.modalCard} onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className={styles.header}>
          <div className={styles.headerTitleRow}>
            <div className={styles.headerIcon}>🎵</div>
            <div>
              <h2 className={styles.titleText}>Ավելացնել Երգեր (Batch Audio Import)</h2>
              <p className={styles.subtitleText}>
                Ընտրեք կամ drop արեք միանգամից մի քանի երգեր (MP3, WAV, FLAC, M4A)
              </p>
            </div>
          </div>
          <button type="button" className={styles.closeBtn} onClick={onClose}>
            ×
          </button>
        </div>

        {/* Tab switch */}
        <div className={styles.tabSwitcher}>
          <button
            type="button"
            className={`${styles.tabBtn} ${activeTab === 'upload' ? styles.tabBtnActive : ''}`}
            onClick={() => setActiveTab('upload')}
          >
            📁 Drop / Վերբեռնել ({trackQueue.length})
          </button>
          <button
            type="button"
            className={`${styles.tabBtn} ${activeTab === 'url' ? styles.tabBtnActive : ''}`}
            onClick={() => setActiveTab('url')}
          >
            🌐 Աուդիո Հղումով (MP3 URL)
          </button>
        </div>

        <form onSubmit={handleSubmit} className={styles.form}>
          {errorMsg && <div className={styles.errorAlert}>{errorMsg}</div>}

          {/* Progress Bar */}
          {isSubmitting && uploadProgress.total > 1 && (
            <div className={styles.progressBanner}>
              <div className={styles.progressBar}>
                <div
                  className={styles.progressFill}
                  style={{
                    width: `${(uploadProgress.current / uploadProgress.total) * 100}%`,
                  }}
                />
              </div>
              <span className={styles.progressText}>
                Պահպանվում է {uploadProgress.current} / {uploadProgress.total} երգ...
              </span>
            </div>
          )}

          {/* Tab 1: Dropzone with Multiple selection */}
          {activeTab === 'upload' ? (
            <>
              <div
                className={`${styles.dropzone} ${isDragging ? styles.dropzoneActive : ''}`}
                onDragOver={(e) => {
                  e.preventDefault();
                  setIsDragging(true);
                }}
                onDragLeave={() => setIsDragging(false)}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  multiple
                  accept="audio/*,.mp3,.wav,.flac,.m4a,.ogg,.aac"
                  style={{ display: 'none' }}
                  onChange={(e) => handleFilesProcess(e.target.files)}
                />

                <div className={styles.dropPrompt}>
                  <div className={styles.uploadIcon}>🎶</div>
                  <p className={styles.dropTitle}>
                    Քաշեք և գցեք (Drag & Drop) մի քանի երգեր այստեղ
                  </p>
                  <p className={styles.dropSub}>
                    Կամ սեղմեք՝ ձեր համակարգչից միանգամից մի քանի ֆայլ ընտրելու համար
                  </p>
                </div>
              </div>

              {/* Folder Picker Action */}
              <div className={styles.folderPickerRow}>
                <button
                  type="button"
                  className={styles.folderPickerBtn}
                  onClick={() => folderInputRef.current?.click()}
                  title="Ընտրել ամբողջական ֆոլդեր ձեր համակարգչից"
                >
                  📁 Ընտրել Ամբողջական Folder
                </button>
                <input
                  ref={folderInputRef}
                  type="file"
                  webkitdirectory=""
                  directory=""
                  multiple
                  style={{ display: 'none' }}
                  onChange={(e) => handleFilesProcess(e.target.files)}
                />
              </div>

              {/* Selected Tracks Queue */}
              {trackQueue.length > 0 && (
                <div className={styles.queueContainer}>
                  <div className={styles.queueHeader}>
                    <span>Ընտրված Երգեր ({trackQueue.length})</span>
                    <button
                      type="button"
                      className={styles.clearQueueBtn}
                      onClick={() => setTrackQueue([])}
                    >
                      Մաքրել բոլորը
                    </button>
                  </div>

                  <div className={styles.queueList}>
                    {trackQueue.map((item) => (
                      <div key={item.id} className={styles.queueItem}>
                        <div className={styles.audioIconBadge}>🎧</div>

                        <div className={styles.queueInfoCol}>
                          <input
                            type="text"
                            className={styles.queueTitleInput}
                            value={item.title}
                            placeholder="Երգի անվանում"
                            onChange={(e) =>
                              handleUpdateItemField(item.id, 'title', e.target.value)
                            }
                          />
                          <div className={styles.queueMetaRow}>
                            <input
                              type="text"
                              className={styles.queueArtistInput}
                              value={item.artist}
                              placeholder="Կատարող"
                              onChange={(e) =>
                                handleUpdateItemField(item.id, 'artist', e.target.value)
                              }
                            />
                            <span>•</span>
                            <span>{formatAudioDuration(item.duration)}</span>
                            <span>•</span>
                            <span>{formatBytes(item.fileSize)}</span>
                          </div>
                        </div>

                        <button
                          type="button"
                          className={styles.removeItemBtn}
                          onClick={() => handleRemoveQueueItem(item.id)}
                          title="Հեռացնել"
                        >
                          ×
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          ) : (
            /* Tab 2: URL */
            <div className={styles.urlSection}>
              <div className={styles.inputGroup}>
                <label className={styles.label}>Աուդիո Ուղիղ Հղում (Direct MP3 URL)</label>
                <input
                  type="url"
                  className={styles.textInput}
                  placeholder="https://example.com/music/song.mp3"
                  value={audioUrl}
                  onChange={(e) => setAudioUrl(e.target.value)}
                />
              </div>

              <div className={styles.gridTwo}>
                <div className={styles.inputGroup}>
                  <label className={styles.label}>Երգի Անվանում</label>
                  <input
                    type="text"
                    className={styles.textInput}
                    placeholder="օր. Cyber Horizon"
                    value={urlTitle}
                    onChange={(e) => setUrlTitle(e.target.value)}
                  />
                </div>
                <div className={styles.inputGroup}>
                  <label className={styles.label}>Կատարող</label>
                  <input
                    type="text"
                    className={styles.textInput}
                    placeholder="օր. Dev Flow"
                    value={urlArtist}
                    onChange={(e) => setUrlArtist(e.target.value)}
                  />
                </div>
              </div>
            </div>
          )}

          {/* Bulk Details */}
          <div className={styles.gridTwo}>
            <div className={styles.inputGroup}>
              <label className={styles.label}>📁 Ֆոլդեր / Պանակ</label>
              <select
                className={styles.selectInput}
                value={selectedFolderId}
                onChange={(e) => setSelectedFolderId(e.target.value)}
              >
                <option value="">Առանց ֆոլդերի (Root)</option>
                {folders.map((f) => (
                  <option key={f.id} value={f.id}>
                    {f.icon || '📁'} {f.name}
                  </option>
                ))}
              </select>
            </div>

            <div className={styles.inputGroup}>
              <label className={styles.label}>Ժանր / Փլեյլիստ</label>
              <select
                className={styles.selectInput}
                value={genre}
                onChange={(e) => setGenre(e.target.value)}
              >
                {MUSIC_GENRES.filter((g) => g.id !== 'All' && g.id !== 'Favorites').map((g) => (
                  <option key={g.id} value={g.id}>
                    {g.icon} {g.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className={styles.inputGroup}>
            <label className={styles.label}>Շապիկի Հղում (Cover Art URL - Optional)</label>
            <input
              type="url"
              className={styles.textInput}
              placeholder="https://images.unsplash.com/... (Կամ կընտրվի ավտոմատ)"
              value={coverUrl}
              onChange={(e) => setCoverUrl(e.target.value)}
            />
          </div>

          {/* Zero Knowledge Encryption */}
          <div className={styles.encryptBox}>
            <label className={styles.checkLabel}>
              <input
                type="checkbox"
                checked={isEncrypted}
                onChange={(e) => setIsEncrypted(e.target.checked)}
              />
              <span className={styles.encryptText}>
                🔒 Գաղտնագրել Master Password-ով (Zero-Knowledge)
              </span>
            </label>
            <span className={styles.encryptSub}>
              Երգերի տվյալները կպահպանվեն AES կոդավորված տեսքով
            </span>
          </div>

          {/* Footer */}
          <div className={styles.footer}>
            <button type="button" className={styles.cancelBtn} onClick={onClose}>
              Չեղարկել
            </button>
            <button
              type="submit"
              className={styles.submitBtn}
              disabled={isSubmitting || (activeTab === 'upload' && trackQueue.length === 0)}
            >
              {isSubmitting
                ? 'Պահպանվում է...'
                : activeTab === 'upload' && trackQueue.length > 1
                ? `✓ Ավելացնել Բոլորը (${trackQueue.length} երգ)`
                : '✓ Ավելացնել Գրադարանում'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
