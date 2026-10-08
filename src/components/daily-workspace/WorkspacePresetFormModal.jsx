import React, { useEffect, useState } from 'react';
import { isValidUrl, sanitizeUrl } from '../../utils/workspaceValidation.js';
import styles from './DailyWorkspace.module.css';

const COLOR_OPTIONS = [
  '#8b5cf6', // Violet
  '#3b82f6', // Blue
  '#10b981', // Emerald
  '#f59e0b', // Amber
  '#ec4899', // Pink
  '#6366f1', // Indigo
  '#06b6d4', // Cyan
  '#f97316', // Orange
];

const ICON_OPTIONS = [
  { id: 'code', label: 'Development / Code' },
  { id: 'briefcase', label: 'Business / Office' },
  { id: 'server', label: 'Server / Admin' },
  { id: 'chart', label: 'Marketing / Analytics' },
];

export function WorkspacePresetFormModal({
  isOpen,
  onClose,
  onSave,
  initialData = null,
}) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [icon, setIcon] = useState('code');
  const [color, setColor] = useState('#8b5cf6');
  const [urls, setUrls] = useState(['']);
  const [accountLabel, setAccountLabel] = useState('');
  const [isFavorite, setIsFavorite] = useState(false);
  const [error, setError] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (initialData) {
      setName(initialData.name || '');
      setDescription(initialData.description || '');
      setIcon(initialData.icon || 'code');
      setColor(initialData.color || '#8b5cf6');
      setUrls(initialData.urls && initialData.urls.length > 0 ? initialData.urls : ['']);
      setAccountLabel(initialData.accountLabel || '');
      setIsFavorite(Boolean(initialData.isFavorite));
    } else {
      setName('');
      setDescription('');
      setIcon('code');
      setColor('#8b5cf6');
      setUrls(['', '', '']);
      setAccountLabel('');
      setIsFavorite(false);
    }
    setError(null);
    setSubmitting(false);
  }, [initialData, isOpen]);

  if (!isOpen) return null;

  const handleUrlChange = (index, value) => {
    const updated = [...urls];
    updated[index] = value;
    setUrls(updated);
  };

  const handleAddUrlField = () => {
    setUrls([...urls, '']);
  };

  const handleRemoveUrlField = (index) => {
    const updated = urls.filter((_, i) => i !== index);
    setUrls(updated.length > 0 ? updated : ['']);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);

    if (!name.trim()) {
      setError('Please provide a preset name.');
      return;
    }

    const validUrls = urls
      .map((u) => u.trim())
      .filter((u) => u.length > 0)
      .map((u) => sanitizeUrl(u))
      .filter(Boolean);

    if (validUrls.length === 0) {
      setError('Please enter at least one valid HTTP/HTTPS URL.');
      return;
    }

    setSubmitting(true);
    try {
      await onSave(
        {
          name,
          description,
          icon,
          color,
          urls: validUrls,
          accountLabel,
          isFavorite,
        },
        initialData?.id || null
      );
      onClose();
    } catch (err) {
      setError(err.message || 'Failed to save preset');
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
            {initialData ? 'Edit Workspace Preset' : 'Create Workspace Preset'}
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
            <label className={styles.formLabel}>Preset Name *</label>
            <input
              type="text"
              className={styles.formInput}
              placeholder="e.g. Morning Dev Setup"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>

          <div className={styles.formGroup}>
            <label className={styles.formLabel}>Description</label>
            <input
              type="text"
              className={styles.formInput}
              placeholder="Brief description of this preset's purpose..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>

          <div className={styles.formRowTwoCol}>
            <div className={styles.formGroup}>
              <label className={styles.formLabel}>Icon Category</label>
              <select
                className={styles.formSelect}
                value={icon}
                onChange={(e) => setIcon(e.target.value)}
              >
                {ICON_OPTIONS.map((opt) => (
                  <option key={opt.id} value={opt.id}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>

            <div className={styles.formGroup}>
              <label className={styles.formLabel}>Account Profile Label (Optional)</label>
              <input
                type="text"
                className={styles.formInput}
                placeholder="e.g. Work Profile"
                value={accountLabel}
                onChange={(e) => setAccountLabel(e.target.value)}
              />
            </div>
          </div>

          {/* Color Palette Selection */}
          <div className={styles.formGroup}>
            <label className={styles.formLabel}>Accent Theme Color</label>
            <div className={styles.colorPalette}>
              {COLOR_OPTIONS.map((hex) => (
                <button
                  key={hex}
                  type="button"
                  className={`${styles.colorChip} ${color === hex ? styles.colorChipActive : ''}`}
                  style={{ backgroundColor: hex }}
                  onClick={() => setColor(hex)}
                  aria-label={`Select color ${hex}`}
                />
              ))}
            </div>
          </div>

          {/* URLs Dynamic List */}
          <div className={styles.formGroup}>
            <div className={styles.urlGroupHeader}>
              <label className={styles.formLabel}>Configured URLs *</label>
              <span className={styles.urlCountBadge}>{urls.filter((u) => u.trim()).length} entered</span>
            </div>

            <div className={styles.urlFieldsList}>
              {urls.map((urlVal, index) => {
                const isValid = !urlVal.trim() || isValidUrl(urlVal);
                return (
                  <div key={index} className={styles.urlFieldRow}>
                    <input
                      type="text"
                      className={`${styles.formInput} ${!isValid ? styles.inputInvalid : ''}`}
                      placeholder="https://github.com or http://localhost:3000"
                      value={urlVal}
                      onChange={(e) => handleUrlChange(index, e.target.value)}
                    />
                    {urls.length > 1 && (
                      <button
                        type="button"
                        className={styles.removeUrlBtn}
                        onClick={() => handleRemoveUrlField(index)}
                        title="Remove URL"
                      >
                        ✕
                      </button>
                    )}
                  </div>
                );
              })}
            </div>

            <button
              type="button"
              className={styles.addUrlBtn}
              onClick={handleAddUrlField}
            >
              + Add Another URL
            </button>
          </div>

          {/* Favorite status checkbox */}
          <div className={styles.formCheckboxGroup}>
            <label className={styles.checkboxLabel}>
              <input
                type="checkbox"
                checked={isFavorite}
                onChange={(e) => setIsFavorite(e.target.checked)}
              />
              <span>Mark as Favorite Preset (Shows on dashboard header)</span>
            </label>
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
              {submitting ? 'Saving...' : initialData ? 'Update Preset' : 'Create Preset'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default WorkspacePresetFormModal;
