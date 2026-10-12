import React, { useState, useRef } from 'react';
import {
  MEDIA_CATEGORIES,
  parseYouTubeVideoId,
  parseMediaFile,
  formatBytes,
  formatDuration,
} from '../../services/mediaService';
import { encryptData } from '../../utils/crypto';
import styles from './AddMediaModal.module.css';

export const AddMediaModal = ({
  isOpen,
  onClose,
  onSaveBatch,
  masterPassword,
}) => {
  const [activeTab, setActiveTab] = useState('upload'); // 'upload' | 'url'

  // Batch queue for selected files
  const [fileQueue, setFileQueue] = useState([]);
  const [category, setCategory] = useState('Assets');
  const [tags, setTags] = useState([]);
  const [tagInput, setTagInput] = useState('');
  const [isEncrypted, setIsEncrypted] = useState(false);
  const [isDragging, setIsDragging] = useState(false);

  // URL state
  const [mediaUrl, setMediaUrl] = useState('');
  const [urlTitle, setUrlTitle] = useState('');
  const [urlType, setUrlType] = useState('image'); // 'image' | 'video'

  const [errorMsg, setErrorMsg] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [uploadProgress, setUploadProgress] = useState({ current: 0, total: 0 });
  const fileInputRef = useRef(null);

  if (!isOpen) return null;

  const handleTagKeyDown = (e) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      const clean = tagInput.trim().replace(/^#/, '');
      if (clean && !tags.includes(clean)) {
        setTags([...tags, clean]);
        setTagInput('');
      }
    }
  };

  const handleRemoveTag = (t) => {
    setTags(tags.filter((item) => item !== t));
  };

  // Add multiple files to queue
  const handleFilesSelect = async (filesList) => {
    if (!filesList || filesList.length === 0) return;
    setErrorMsg('');

    const files = Array.from(filesList);
    const newItems = [];

    for (const file of files) {
      try {
        const parsed = await parseMediaFile(file);
        newItems.push({
          id: `batch-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
          file,
          name: file.name,
          title: parsed.title,
          type: parsed.type,
          fileSize: parsed.fileSize,
          dimensions: parsed.dimensions,
          duration: parsed.duration,
          blobUrl: parsed.blobUrl,
          dataUrl: parsed.dataUrl,
          thumbnailUrl: parsed.thumbnailUrl || parsed.blobUrl,
        });
      } catch (err) {
        console.warn('File parse warning:', err);
      }
    }

    if (newItems.length === 0) {
      setErrorMsg('Խնդրում ենք ընտրել միայն նկար կամ վիդեո ֆայլեր (JPG, PNG, WEBP, MP4, WEBM, MOV):');
      return;
    }

    setFileQueue((prev) => [...prev, ...newItems]);
  };

  const handleRemoveQueueItem = (id) => {
    setFileQueue((prev) => prev.filter((item) => item.id !== id));
  };

  const handleUpdateItemTitle = (id, newTitle) => {
    setFileQueue((prev) =>
      prev.map((item) => (item.id === id ? { ...item, title: newTitle } : item))
    );
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFilesSelect(e.dataTransfer.files);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg('');

    if (isEncrypted && !masterPassword) {
      setErrorMsg('Գաղտնագրման համար անհրաժեշտ է Master Password: Խնդրում ենք նախ բացել Vault-ը (Unlock Vault):');
      return;
    }

    // 1. URL upload mode
    if (activeTab === 'url') {
      if (!mediaUrl.trim()) {
        setErrorMsg('Խնդրում ենք մուտքագրել մեդիայի հղումը:');
        return;
      }

      setIsSubmitting(true);
      try {
        const finalUrl = mediaUrl.trim();
        const ytId = parseYouTubeVideoId(finalUrl);
        let finalType = 'image';
        let finalThumbnail = '';

        if (ytId) {
          finalType = 'video';
          finalThumbnail = `https://img.youtube.com/vi/${ytId}/hqdefault.jpg`;
        } else {
          finalType = urlType;
          finalThumbnail = urlType === 'image' ? finalUrl : '';
        }

        let savedUrl = finalUrl;
        let savedThumbnail = finalThumbnail;
        if (isEncrypted && masterPassword) {
          const encUrl = encryptData(finalUrl, masterPassword);
          if (encUrl) savedUrl = encUrl;
          if (savedThumbnail) {
            const encThumb = encryptData(savedThumbnail, masterPassword);
            if (encThumb) savedThumbnail = encThumb;
          }
        }

        const newMediaItem = {
          id: `media-${Date.now()}`,
          title: urlTitle.trim() || (ytId ? 'YouTube Video' : 'Web Media'),
          description: '',
          type: finalType,
          url: savedUrl,
          thumbnailUrl: savedThumbnail,
          youtubeId: ytId || null,
          category,
          tags,
          isFavorite: false,
          isEncrypted,
          createdAt: new Date().toISOString(),
        };

        await onSaveBatch([{ item: newMediaItem, blobData: null }]);
        onClose();
      } catch (err) {
        console.error('Error saving URL media:', err);
        setErrorMsg('Սխալ մեդիան պահպանելիս:');
      } finally {
        setIsSubmitting(false);
      }
      return;
    }

    // 2. Batch File Upload mode
    if (fileQueue.length === 0) {
      setErrorMsg('Խնդրում ենք ընտրել կամ drop անել գոնե մեկ նկար կամ վիդեո:');
      return;
    }

    setIsSubmitting(true);
    setUploadProgress({ current: 0, total: fileQueue.length });

    try {
      const batchToSave = [];

      for (let i = 0; i < fileQueue.length; i++) {
        const qItem = fileQueue[i];
        let savedUrl = qItem.blobUrl || '';
        let savedThumbnail = qItem.thumbnailUrl || qItem.blobUrl || '';

        if (isEncrypted && masterPassword) {
          const encUrl = encryptData(qItem.dataUrl, masterPassword);
          if (encUrl) savedUrl = encUrl;
          if (savedThumbnail) {
            const encThumb = encryptData(savedThumbnail, masterPassword);
            if (encThumb) savedThumbnail = encThumb;
          }
        }

        const itemRecord = {
          id: `media-${Date.now()}-${i}-${Math.random().toString(36).substr(2, 4)}`,
          title: qItem.title.trim() || qItem.name,
          description: '',
          type: qItem.type,
          url: savedUrl,
          thumbnailUrl: savedThumbnail,
          category,
          tags,
          isFavorite: false,
          isEncrypted,
          fileSize: qItem.fileSize,
          dimensions: qItem.dimensions || null,
          duration: qItem.duration || null,
          createdAt: new Date().toISOString(),
        };

        batchToSave.push({ item: itemRecord, file: qItem.file, blobData: qItem.dataUrl });
        setUploadProgress({ current: i + 1, total: fileQueue.length });
      }

      await onSaveBatch(batchToSave);
      onClose();
    } catch (err) {
      console.error('Batch save error:', err);
      setErrorMsg('Սխալ ֆայլերը պահպանելիս:');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className={styles.modalBackdrop} onClick={onClose}>
      <div className={styles.modalCard} onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className={styles.modalHeader}>
          <div className={styles.headerTitleRow}>
            <div className={styles.headerIcon}>🎬</div>
            <div>
              <h2 className={styles.modalTitle}>Ավելացնել Մեդիա (Batch Multi-Upload)</h2>
              <p className={styles.modalSubtitle}>
                Ընտրեք կամ drop արեք միանգամից մի քանի նկարներ և վիդեոներ
              </p>
            </div>
          </div>
          <button type="button" className={styles.closeBtn} onClick={onClose}>
            ×
          </button>
        </div>

        {/* Tab Switcher */}
        <div className={styles.tabSwitcher}>
          <button
            type="button"
            className={`${styles.tabBtn} ${activeTab === 'upload' ? styles.tabBtnActive : ''}`}
            onClick={() => setActiveTab('upload')}
          >
            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" width="16" height="16">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
            </svg>
            <span>📁 Վերբեռնել Ֆայլեր ({fileQueue.length})</span>
          </button>

          <button
            type="button"
            className={`${styles.tabBtn} ${activeTab === 'url' ? styles.tabBtnActive : ''}`}
            onClick={() => setActiveTab('url')}
          >
            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" width="16" height="16">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
            </svg>
            <span>🌐 Հղումով (URL / YouTube)</span>
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className={styles.form}>
          {errorMsg && <div className={styles.errorAlert}>{errorMsg}</div>}

          {/* Progress Banner */}
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
                Պահպանվում է {uploadProgress.current} / {uploadProgress.total} ֆայլ...
              </span>
            </div>
          )}

          {/* Tab 1: Upload Dropzone with Multiple file select */}
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
                  accept="image/*,video/*,.png,.jpg,.jpeg,.webp,.gif,.svg,.mp4,.webm,.mov,.ogg"
                  style={{ display: 'none' }}
                  onChange={(e) => handleFilesSelect(e.target.files)}
                />

                <div className={styles.dropzonePrompt}>
                  <div className={styles.uploadIcon}>📁</div>
                  <p className={styles.dropzoneTitle}>
                    Քաշեք և գցեք (Drag & Drop) մի քանի նկարներ կամ վիդեոներ
                  </p>
                  <p className={styles.dropzoneFormats}>
                    Կամ սեղմեք՝ ձեր համակարգչից միանգամից մի քանի ֆայլ ընտրելու համար
                  </p>
                </div>
              </div>

              {/* Selected Files Queue Preview */}
              {fileQueue.length > 0 && (
                <div className={styles.queueContainer}>
                  <div className={styles.queueHeader}>
                    <span>Ընտրված Ֆայլեր ({fileQueue.length})</span>
                    <button
                      type="button"
                      className={styles.clearQueueBtn}
                      onClick={() => setFileQueue([])}
                    >
                      Մաքրել բոլորը
                    </button>
                  </div>

                  <div className={styles.queueList}>
                    {fileQueue.map((item) => (
                      <div key={item.id} className={styles.queueItem}>
                        <div className={styles.queueThumbBox}>
                          {item.type === 'image' ? (
                            <img src={item.dataUrl} alt={item.name} className={styles.queueThumb} />
                          ) : (
                            <div className={styles.videoQueueIcon}>🎥</div>
                          )}
                        </div>

                        <div className={styles.queueItemInfo}>
                          <input
                            type="text"
                            className={styles.queueTitleInput}
                            value={item.title}
                            onChange={(e) => handleUpdateItemTitle(item.id, e.target.value)}
                            title="Խմբագրել անվանումը"
                          />
                          <div className={styles.queueMetaRow}>
                            <span className={styles.typeBadgeMini}>
                              {item.type === 'video' ? 'VIDEO' : 'IMAGE'}
                            </span>
                            <span>{formatBytes(item.fileSize)}</span>
                            {item.dimensions && <span>• {item.dimensions}</span>}
                            {item.duration > 0 && <span>• {formatDuration(item.duration)}</span>}
                          </div>
                        </div>

                        <button
                          type="button"
                          className={styles.removeQueueItemBtn}
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
            /* Tab 2: URL / YouTube */
            <div className={styles.urlInputSection}>
              <div className={styles.inputGroup}>
                <label className={styles.label}>Մեդիա Հղում (Direct Image/Video URL կամ YouTube)</label>
                <input
                  type="url"
                  className={styles.textInput}
                  placeholder="https://images.unsplash.com/... կամ https://youtube.com/watch?v=..."
                  value={mediaUrl}
                  onChange={(e) => setMediaUrl(e.target.value)}
                />
              </div>

              <div className={styles.inputGroup}>
                <label className={styles.label}>Անվանում (Title)</label>
                <input
                  type="text"
                  className={styles.textInput}
                  placeholder="օր. Cyber Architecture Preview"
                  value={urlTitle}
                  onChange={(e) => setUrlTitle(e.target.value)}
                />
              </div>

              {!parseYouTubeVideoId(mediaUrl) && (
                <div className={styles.typeSelectorRow}>
                  <label className={styles.radioLabel}>
                    <input
                      type="radio"
                      name="urlType"
                      checked={urlType === 'image'}
                      onChange={() => setUrlType('image')}
                    />
                    <span>🖼️ Լուսանկար (Image)</span>
                  </label>

                  <label className={styles.radioLabel}>
                    <input
                      type="radio"
                      name="urlType"
                      checked={urlType === 'video'}
                      onChange={() => setUrlType('video')}
                    />
                    <span>🎥 Վիդեո (Video MP4/WebM)</span>
                  </label>
                </div>
              )}
            </div>
          )}

          {/* Bulk Category & Tags */}
          <div className={styles.gridTwo}>
            <div className={styles.inputGroup}>
              <label className={styles.label}>Կատեգորիա / Ալբոմ (Բոլորի համար)</label>
              <select
                className={styles.selectInput}
                value={category}
                onChange={(e) => setCategory(e.target.value)}
              >
                {MEDIA_CATEGORIES.filter((c) => c.id !== 'All').map((cat) => (
                  <option key={cat.id} value={cat.id}>
                    {cat.icon} {cat.label}
                  </option>
                ))}
              </select>
            </div>

            <div className={styles.inputGroup}>
              <label className={styles.label}>Թեգեր (Tags)</label>
              <div className={styles.tagInputWrapper}>
                {tags.map((t) => (
                  <span key={t} className={styles.tagChip}>
                    #{t}
                    <button type="button" onClick={() => handleRemoveTag(t)}>
                      ×
                    </button>
                  </span>
                ))}
                <input
                  type="text"
                  className={styles.tagInputBare}
                  placeholder="+ Թեգ (Enter)"
                  value={tagInput}
                  onChange={(e) => setTagInput(e.target.value)}
                  onKeyDown={handleTagKeyDown}
                />
              </div>
            </div>
          </div>

          {/* Encryption Toggle */}
          <div className={styles.encryptToggleRow}>
            <label className={styles.checkboxWrapper}>
              <input
                type="checkbox"
                checked={isEncrypted}
                onChange={(e) => setIsEncrypted(e.target.checked)}
              />
              <span className={styles.encryptLabelText}>
                🔒 Գաղտնագրել Master Password-ով (Zero-Knowledge AES)
              </span>
            </label>
            <span className={styles.encryptNotice}>
              {isEncrypted
                ? 'Ֆայլերը կպահպանվեն միայն կոդավորված տեսքով'
                : 'Հասանելի կլինեն սովորական դիտման համար'}
            </span>
          </div>

          {/* Footer Buttons */}
          <div className={styles.modalFooter}>
            <button type="button" className={styles.cancelBtn} onClick={onClose}>
              Չեղարկել
            </button>
            <button
              type="submit"
              className={styles.submitBtn}
              disabled={isSubmitting || (activeTab === 'upload' && fileQueue.length === 0)}
            >
              {isSubmitting
                ? 'Վերբեռնվում է...'
                : activeTab === 'upload' && fileQueue.length > 1
                ? `✓ Ավելացնել Բոլորը (${fileQueue.length} ֆայլ)`
                : '✓ Ավելացնել Պահոցում'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
