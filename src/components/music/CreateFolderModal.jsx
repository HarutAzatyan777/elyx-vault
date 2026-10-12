import React, { useState } from 'react';
import styles from './CreateFolderModal.module.css';

const FOLDER_ICONS = ['📁', '🎧', '⚡', '🔥', '💎', '🎸', '🎹', '☕', '🌟', '🏖️', '🚗', '🚀', '💿', '🎙️'];
const FOLDER_COLORS = [
  '#6366f1', // Indigo
  '#06b6d4', // Cyan
  '#ec4899', // Pink
  '#10b981', // Emerald
  '#f59e0b', // Amber
  '#8b5cf6', // Violet
  '#ef4444', // Red
  '#14b8a6', // Teal
];

export const CreateFolderModal = ({ isOpen, onClose, onCreateFolder }) => {
  const [folderName, setFolderName] = useState('');
  const [selectedIcon, setSelectedIcon] = useState('📁');
  const [selectedColor, setSelectedColor] = useState('#06b6d4');
  const [errorMsg, setErrorMsg] = useState('');

  if (!isOpen) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    const clean = folderName.trim();
    if (!clean) {
      setErrorMsg('Խնդրում ենք մուտքագրել ֆոլդերի անվանումը');
      return;
    }

    const newFolder = {
      id: `folder-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      name: clean,
      icon: selectedIcon,
      color: selectedColor,
      createdAt: new Date().toISOString(),
    };

    onCreateFolder(newFolder);
    setFolderName('');
    setErrorMsg('');
    onClose();
  };

  return (
    <div className={styles.backdrop} onClick={onClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div className={styles.header}>
          <div className={styles.titleBox}>
            <div
              className={styles.iconPreview}
              style={{ backgroundColor: `${selectedColor}25`, borderColor: selectedColor }}
            >
              <span className={styles.previewEmoji}>{selectedIcon}</span>
            </div>
            <div>
              <h2 className={styles.title}>Ստեղծել Նոր Ֆոլդեր</h2>
              <p className={styles.subtitle}>Խմբավորեք ձեր երգերը ըստ պանակների կամ ալբոմների</p>
            </div>
          </div>
          <button type="button" className={styles.closeBtn} onClick={onClose} aria-label="Close">
            ×
          </button>
        </div>

        <form onSubmit={handleSubmit} className={styles.form}>
          {errorMsg && <div className={styles.errorAlert}>{errorMsg}</div>}

          {/* Folder Name */}
          <div className={styles.inputGroup}>
            <label className={styles.label}>Ֆոլդերի Անվանում *</label>
            <input
              type="text"
              autoFocus
              className={styles.input}
              placeholder="Օրինակ՝ Armenian Hits, Rock Classics, Gym Focus..."
              value={folderName}
              onChange={(e) => {
                setFolderName(e.target.value);
                if (errorMsg) setErrorMsg('');
              }}
            />
          </div>

          {/* Icon Selector */}
          <div className={styles.inputGroup}>
            <label className={styles.label}>Ընտրել Icon / Էմոջի</label>
            <div className={styles.iconsGrid}>
              {FOLDER_ICONS.map((icon) => (
                <button
                  key={icon}
                  type="button"
                  className={`${styles.iconOption} ${selectedIcon === icon ? styles.iconOptionActive : ''}`}
                  onClick={() => setSelectedIcon(icon)}
                >
                  {icon}
                </button>
              ))}
            </div>
          </div>

          {/* Color Selector */}
          <div className={styles.inputGroup}>
            <label className={styles.label}>Ընտրել Գույն</label>
            <div className={styles.colorsRow}>
              {FOLDER_COLORS.map((col) => (
                <button
                  key={col}
                  type="button"
                  className={`${styles.colorOption} ${selectedColor === col ? styles.colorOptionActive : ''}`}
                  style={{ backgroundColor: col }}
                  onClick={() => setSelectedColor(col)}
                  title={col}
                />
              ))}
            </div>
          </div>

          {/* Footer Actions */}
          <div className={styles.footer}>
            <button type="button" className={styles.cancelBtn} onClick={onClose}>
              Չեղարկել
            </button>
            <button
              type="submit"
              className={styles.submitBtn}
              style={{ background: `linear-gradient(135deg, ${selectedColor} 0%, #0284c7 100%)` }}
            >
              + Ստեղծել Ֆոլդեր
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CreateFolderModal;
