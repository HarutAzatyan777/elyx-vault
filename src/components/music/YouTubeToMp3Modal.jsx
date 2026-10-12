import React, { useState, useEffect, useRef } from 'react';
import {
  extractYouTubeVideoId,
  fetchYouTubeVideoInfo,
  convertYouTubeToAudio,
  getFastDownloadLinks,
} from '../../services/youtubeAudioService';
import { saveTrackItem, MUSIC_GENRES } from '../../services/musicService';
import styles from './YouTubeToMp3Modal.module.css';

export const YouTubeToMp3Modal = ({
  isOpen,
  onClose,
  folders = [],
  initialFolderId = null,
  uid,
  businessId,
  onTrackCreated,
}) => {
  const [youtubeUrl, setYoutubeUrl] = useState('');
  const [isFetchingInfo, setIsFetchingInfo] = useState(false);
  const [videoInfo, setVideoInfo] = useState(null);

  // Form Fields
  const [title, setTitle] = useState('');
  const [artist, setArtist] = useState('');
  const [selectedFolderId, setSelectedFolderId] = useState(initialFolderId || '');
  const [genre, setGenre] = useState('Pop');

  // Conversion state
  const [isConverting, setIsConverting] = useState(false);
  const [statusMessage, setStatusMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [showFallbackHelper, setShowFallbackHelper] = useState(false);

  const fileInputRef = useRef(null);

  // Sync initialFolderId
  useEffect(() => {
    if (initialFolderId) {
      setSelectedFolderId(initialFolderId);
    }
  }, [initialFolderId]);

  // Clean state on modal open/close
  useEffect(() => {
    if (!isOpen) {
      setYoutubeUrl('');
      setVideoInfo(null);
      setTitle('');
      setArtist('');
      setIsConverting(false);
      setStatusMessage('');
      setErrorMessage('');
      setShowFallbackHelper(false);
    }
  }, [isOpen]);

  // Auto-fetch info when valid YouTube URL is typed or pasted
  useEffect(() => {
    const videoId = extractYouTubeVideoId(youtubeUrl);
    if (!videoId) {
      setVideoInfo(null);
      return;
    }

    let isMounted = true;
    setIsFetchingInfo(true);
    setErrorMessage('');
    setShowFallbackHelper(false);

    fetchYouTubeVideoInfo(youtubeUrl)
      .then((info) => {
        if (!isMounted) return;
        if (info) {
          setVideoInfo(info);
          setTitle(info.cleanTitle || info.title);
          setArtist(info.artist || 'YouTube Audio');
        }
      })
      .catch((err) => {
        if (isMounted) {
          console.warn('YouTube info notice:', err);
        }
      })
      .finally(() => {
        if (isMounted) setIsFetchingInfo(false);
      });

    return () => {
      isMounted = false;
    };
  }, [youtubeUrl]);

  if (!isOpen) return null;

  // Paste from clipboard helper
  const handlePasteClipboard = async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (text) {
        setYoutubeUrl(text.trim());
      }
    } catch {
      // Ignore clipboard permission denial
    }
  };

  // Process and save track to Firebase Cloud Storage & Firestore
  const handleSaveToVault = async (audioBlob, fileName = null) => {
    const targetFolder = folders.find((f) => f.id === selectedFolderId);
    const videoId = videoInfo?.id || extractYouTubeVideoId(youtubeUrl) || 'yt';
    const cleanFileName = fileName || `${artist} - ${title}.mp3`;

    const newTrack = {
      id: `yt-${Date.now()}-${videoId}`,
      title: title.trim() || videoInfo?.title || 'YouTube Track',
      artist: artist.trim() || 'YouTube Audio',
      album: targetFolder ? targetFolder.name : 'YouTube Music',
      genre,
      folderId: targetFolder ? targetFolder.id : null,
      folder: targetFolder ? targetFolder.name : null,
      duration: videoInfo?.duration || 0,
      fileSize: audioBlob?.size || 0,
      coverUrl:
        videoInfo?.coverUrl ||
        `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`,
      youtubeId: videoId,
      youtubeUrl: videoInfo?.originalUrl || youtubeUrl,
      isFavorite: false,
      isEncrypted: false,
      createdAt: new Date().toISOString(),
    };

    setStatusMessage('☁️ Վերբեռնում Firebase Cloud Storage…');

    const saved = await saveTrackItem({
      track: newTrack,
      file: audioBlob,
      audioBlob,
      uid,
      businessId,
    });

    // Also trigger direct local download for user convenience
    if (audioBlob) {
      try {
        const downloadUrl = URL.createObjectURL(audioBlob);
        const a = document.createElement('a');
        a.href = downloadUrl;
        a.download = cleanFileName;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        setTimeout(() => URL.revokeObjectURL(downloadUrl), 4000);
      } catch (dlErr) {
        console.warn('Local download notice:', dlErr);
      }
    }

    if (onTrackCreated) {
      onTrackCreated(saved);
    }

    onClose();
  };

  // Convert and Download action
  const handleDownload = async (e) => {
    if (e) e.preventDefault();
    const videoId = extractYouTubeVideoId(youtubeUrl);
    if (!videoId) {
      setErrorMessage('Խնդրում ենք մուտքագրել վավեր YouTube հղում:');
      return;
    }

    setIsConverting(true);
    setErrorMessage('');
    setShowFallbackHelper(false);
    setStatusMessage('🎵 Սկսվում է YouTube աուդիոյի քաղումը…');

    try {
      const converted = await convertYouTubeToAudio(youtubeUrl, (status) => {
        setStatusMessage(status);
      });

      if (converted?.blob) {
        setStatusMessage('✨ MP3-ն պատրաստ է: Պահպանում ենք Elyx Vault-ում…');
        await handleSaveToVault(converted.blob, converted.fileName);
      } else {
        // Fallback helper if automated scraper was rate-limited
        setIsConverting(false);
        setShowFallbackHelper(true);
        setStatusMessage('');
        setErrorMessage(
          'YouTube-ի պաշտպանությունը պահանջում է ուղիղ ներբեռնում: Սեղմեք ստորև նշված 1-Click կոճակը և գցեք ֆայլը այստեղ:'
        );
      }
    } catch (err) {
      console.warn('[YouTube Download Error]:', err);
      setIsConverting(false);
      setShowFallbackHelper(true);
      setErrorMessage(err.message || 'Չհաջողվեց ավտոմատ կոնվերտացնել:');
    }
  };

  // Manual fallback drop or select
  const handleFallbackFileSelect = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      setIsConverting(true);
      setStatusMessage('☁️ Վերբեռնում Firebase Storage…');
      handleSaveToVault(file, file.name);
    }
  };

  const videoId = videoInfo?.id || extractYouTubeVideoId(youtubeUrl);
  const fastLinks = videoId ? getFastDownloadLinks(videoId) : [];

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className={styles.header}>
          <div className={styles.headerLeft}>
            <div className={styles.ytIconBadge}>
              <svg fill="currentColor" viewBox="0 0 24 24" width="22" height="22">
                <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
              </svg>
            </div>
            <div>
              <h3 className={styles.title}>YouTube to MP3 Converter</h3>
              <p className={styles.subtitle}>Ներբեռնեք երգը YouTube-ից MP3 ֆորմատով և պահպանեք Cloud-ում</p>
            </div>
          </div>

          <button
            type="button"
            className={styles.closeBtn}
            onClick={onClose}
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        {/* Body */}
        <div className={styles.body}>
          {/* YouTube URL input */}
          <div className={styles.inputGroup}>
            <label className={styles.label}>
              <span>YouTube Հղում (Video URL կամ Shorts)</span>
            </label>
            <div className={styles.urlInputRow}>
              <input
                type="text"
                placeholder="https://www.youtube.com/watch?v=... կամ https://youtu.be/..."
                className={styles.input}
                value={youtubeUrl}
                onChange={(e) => setYoutubeUrl(e.target.value)}
                autoFocus
              />
              <button
                type="button"
                className={styles.pasteBtn}
                onClick={handlePasteClipboard}
                title="Փակցնել clipboard-ից"
              >
                📋 Փակցնել
              </button>
            </div>
          </div>

          {/* Loading preview state */}
          {isFetchingInfo && (
            <div className={styles.previewLoading}>
              <div className={styles.spinner} />
              <span>Ստուգվում են YouTube տվյալները…</span>
            </div>
          )}

          {/* Live Preview Card */}
          {videoInfo && !isFetchingInfo && (
            <div className={styles.previewCard}>
              <div className={styles.thumbWrapper}>
                <img
                  src={videoInfo.coverUrl}
                  alt={videoInfo.title}
                  className={styles.thumbImg}
                  onError={(e) => {
                    e.currentTarget.src = `https://img.youtube.com/vi/${videoInfo.id}/hqdefault.jpg`;
                  }}
                />
                <span className={styles.thumbBadge}>MP3</span>
              </div>

              <div className={styles.previewFields}>
                <div className={styles.previewFieldRow}>
                  <label className={styles.smallLabel}>Երգի Անվանում</label>
                  <input
                    type="text"
                    className={styles.smallInput}
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="Երգի անունը..."
                  />
                </div>

                <div className={styles.previewFieldRow}>
                  <label className={styles.smallLabel}>Կատարող / Artist</label>
                  <input
                    type="text"
                    className={styles.smallInput}
                    value={artist}
                    onChange={(e) => setArtist(e.target.value)}
                    placeholder="Կատարողի անունը..."
                  />
                </div>
              </div>
            </div>
          )}

          {/* Options: Target Folder & Genre */}
          <div className={styles.optionsRow}>
            <div className={styles.inputGroup}>
              <label className={styles.smallLabel}>📁 Պանակ (Folder)</label>
              <select
                className={styles.select}
                value={selectedFolderId}
                onChange={(e) => setSelectedFolderId(e.target.value)}
              >
                <option value="">📂 Գլխավոր (Առանց ֆոլդերի)</option>
                {folders.map((f) => (
                  <option key={f.id} value={f.id}>
                    {f.icon || '📁'} {f.name}
                  </option>
                ))}
              </select>
            </div>

            <div className={styles.inputGroup}>
              <label className={styles.smallLabel}>🎵 Ժանր (Genre)</label>
              <select
                className={styles.select}
                value={genre}
                onChange={(e) => setGenre(e.target.value)}
              >
                {MUSIC_GENRES.map((g) => (
                  <option key={g.id} value={g.id}>
                    {g.icon} {g.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Active Conversion Progress Banner */}
          {isConverting && (
            <div className={styles.progressBanner}>
              <div className={styles.progressStatusText}>
                <div className={styles.spinner} />
                <span>{statusMessage || 'Կատարվում է ներբեռնում…'}</span>
              </div>
              <div className={styles.progressBarTrack}>
                <div className={styles.progressBarFill} />
              </div>
            </div>
          )}

          {/* Error Message */}
          {errorMessage && !isConverting && (
            <div style={{ color: '#ef4444', fontSize: '0.8rem', fontWeight: 600 }}>
              ⚠️ {errorMessage}
            </div>
          )}

          {/* Smart Fallback Box with 1-Click Converter and Dropzone */}
          {showFallbackHelper && (
            <div className={styles.fallbackBox}>
              <h4 className={styles.fallbackTitle}>
                <span>⚡ 1-Click MP3 Կոնվերտացիա</span>
              </h4>
              <p className={styles.fallbackDesc}>
                Բացեք ստորև բերված կոճակներից մեկը, սեղմեք <strong>Download MP3</strong>, այնուհետև գցեք քաշած ֆայլը այստեղ՝ Firebase Storage-ում ավելացնելու համար.
              </p>

              <div className={styles.fastLinksRow}>
                {fastLinks.map((link) => (
                  <a
                    key={link.name}
                    href={link.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={styles.fastLinkBtn}
                  >
                    🚀 {link.name}
                  </a>
                ))}
              </div>

              <div
                className={styles.dropFileArea}
                onClick={() => fileInputRef.current?.click()}
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => {
                  e.preventDefault();
                  const file = e.dataTransfer.files?.[0];
                  if (file) {
                    setIsConverting(true);
                    setStatusMessage('☁️ Վերբեռնում Firebase Storage…');
                    handleSaveToVault(file, file.name);
                  }
                }}
              >
                📥 Կամ սեղմեք / գցեք ներբեռնված MP3 ֆայլը այստեղ
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept="audio/*,.mp3,.wav,.m4a"
                style={{ display: 'none' }}
                onChange={handleFallbackFileSelect}
              />
            </div>
          )}
        </div>

        {/* Footer */}
        <div className={styles.footer}>
          <button
            type="button"
            className={styles.cancelBtn}
            onClick={onClose}
            disabled={isConverting}
          >
            Չեղարկել
          </button>

          <button
            type="button"
            className={styles.submitBtn}
            onClick={handleDownload}
            disabled={!extractYouTubeVideoId(youtubeUrl) || isConverting || isFetchingInfo}
          >
            {isConverting ? (
              <>
                <div className={styles.spinner} style={{ width: 14, height: 14, borderTopColor: '#fff' }} />
                <span>Ներբեռնվում է…</span>
              </>
            ) : (
              <>
                <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" width="16" height="16">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
                <span>Քաշել MP3 և Ավելացնել</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
