import React, { useEffect, useState } from 'react';
import { isValidUrl, sanitizeUrl } from '../../utils/workspaceValidation.js';
import styles from './DailyWorkspace.module.css';

const CATEGORIES = [
  'Dev Tools',
  'Documentation',
  'Analytics',
  'Business',
  'Admin',
  'General',
];

export function FavoriteLinkFormModal({
  isOpen,
  onClose,
  onSave,
  presets = [],
  initialData = null,
}) {
  const [title, setTitle] = useState('');
  const [url, setUrl] = useState('');
  const [category, setCategory] = useState('Dev Tools');
  const [presetId, setPresetId] = useState('');
  const [description, setDescription] = useState('');
  const [error, setError] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (initialData) {
      setTitle(initialData.title || '');
      setUrl(initialData.url || '');
      setCategory(initialData.category || 'Dev Tools');
      setPresetId(initialData.presetId || '');
      setDescription(initialData.description || '');
    } else {
      setTitle('');
      setUrl('');
      setCategory('Dev Tools');
      setPresetId('');
      setDescription('');
    }
    setError(null);
    setSubmitting(false);
  }, [initialData, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);

    if (!title.trim()) {
      setError('Please provide a title for the link.');
      return;
    }

    const sanitizedUrl = sanitizeUrl(url);
    if (!sanitizedUrl || !isValidUrl(sanitizedUrl)) {
      setError('Please enter a valid HTTP/HTTPS URL.');
      return;
    }

    setSubmitting(true);
    try {
      await onSave(
        {
          title,
          url: sanitizedUrl,
          category,
          presetId: presetId || null,
          description,
        },
        initialData?.id || null
      );
      onClose();
    } catch (err) {
      setError(err.message || 'Failed to save link');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className={styles.modalBackdrop} onClick={onClose}>
      <div
        className={styles.modalContent}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
      >
        <div className={styles.modalHeader}>
          <h2 className={styles.modalTitle}>
            {initialData ? 'Edit Favorite Link' : 'Add Favorite Link'}
          </h2>
          <button
            type="button"
            className={styles.modalCloseBtn}
            onClick={onClose}
            aria-label="Close modal"
          >
            ✕
          </button>
        </div>

        {error && <div className={styles.formErrorAlert}>{error}</div>}

        <form onSubmit={handleSubmit} className={styles.modalForm}>
          <div className={styles.formGroup}>
            <label className={styles.formLabel}>Title *</label>
            <input
              type="text"
              className={styles.formInput}
              placeholder="e.g. GitHub Dashboard"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
            />
          </div>

          <div className={styles.formGroup}>
            <label className={styles.formLabel}>URL Target *</label>
            <input
              type="text"
              className={styles.formInput}
              placeholder="https://github.com/my-repo"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              required
            />
          </div>

          <div className={styles.formRowTwoCol}>
            <div className={styles.formGroup}>
              <label className={styles.formLabel}>Category</label>
              <select
                className={styles.formSelect}
                value={category}
                onChange={(e) => setCategory(e.target.value)}
              >
                {CATEGORIES.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>

            <div className={styles.formGroup}>
              <label className={styles.formLabel}>Associate Preset (Optional)</label>
              <select
                className={styles.formSelect}
                value={presetId}
                onChange={(e) => setPresetId(e.target.value)}
              >
                <option value="">-- None --</option>
                {presets.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className={styles.formGroup}>
            <label className={styles.formLabel}>Notes / Description</label>
            <input
              type="text"
              className={styles.formInput}
              placeholder="Short note about what this tool is used for..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>

          <div className={styles.modalFooter}>
            <button
              type="button"
              className={styles.secondaryBtn}
              onClick={onClose}
              disabled={submitting}
            >
              Cancel
            </button>
            <button
              type="submit"
              className={styles.primaryBtn}
              disabled={submitting}
            >
              {submitting ? 'Saving...' : initialData ? 'Update Link' : 'Add Link'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default FavoriteLinkFormModal;
