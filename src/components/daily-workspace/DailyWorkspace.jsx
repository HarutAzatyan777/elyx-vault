import React, { useMemo, useState } from 'react';
import { useAuth } from '../../hooks/useAuth.jsx';
import { useDailyWorkspace } from '../../hooks/useDailyWorkspace.js';

import WorkspaceHeader from './WorkspaceHeader.jsx';
import SessionStatusBanner from './SessionStatusBanner.jsx';
import QuickActions from './QuickActions.jsx';
import WorkspacePresetCard from './WorkspacePresetCard.jsx';
import WorkspacePresetFormModal from './WorkspacePresetFormModal.jsx';
import FavoriteLinks from './FavoriteLinks.jsx';
import FavoriteLinkFormModal from './FavoriteLinkFormModal.jsx';
import RecentActivity from './RecentActivity.jsx';

import styles from './DailyWorkspace.module.css';

export function DailyWorkspace() {
  const { user } = useAuth();
  const {
    presets,
    links,
    activities,
    activeSession,
    selectedPreset,
    selectedPresetId,
    setSelectedPresetId,
    loading,
    notification,
    showToast,
    startWork,
    endWork,
    handleSavePreset,
    handleDeletePreset,
    handleSaveLink,
    handleDeleteLink,
    handleOpenLink,
  } = useDailyWorkspace();

  // Search and Filter UI States
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState('ALL');

  // Modal Dialog States
  const [isPresetModalOpen, setIsPresetModalOpen] = useState(false);
  const [editingPreset, setEditingPreset] = useState(null);

  const [isLinkModalOpen, setIsLinkModalOpen] = useState(false);
  const [editingLink, setEditingLink] = useState(null);

  // Extract unique categories from favorite links
  const availableCategories = useMemo(() => {
    const cats = new Set(['Dev Tools', 'Documentation', 'Analytics', 'Business', 'Admin', 'General']);
    links.forEach((l) => {
      if (l.category) cats.add(l.category);
    });
    return Array.from(cats);
  }, [links]);

  // Filter presets based on search query
  const filteredPresets = useMemo(() => {
    if (!searchQuery) return presets;
    const q = searchQuery.toLowerCase();
    return presets.filter(
      (p) =>
        p.name?.toLowerCase().includes(q) ||
        p.description?.toLowerCase().includes(q) ||
        p.accountLabel?.toLowerCase().includes(q) ||
        (p.urls || []).some((u) => u.toLowerCase().includes(q))
    );
  }, [presets, searchQuery]);

  /* -------------------------------------------------------------------------- */
  /* MODAL HANDLERS                                                            */
  /* -------------------------------------------------------------------------- */

  const handleOpenNewPresetModal = () => {
    setEditingPreset(null);
    setIsPresetModalOpen(true);
  };

  const handleOpenEditPresetModal = (preset) => {
    setEditingPreset(preset);
    setIsPresetModalOpen(true);
  };

  const handleOpenNewLinkModal = () => {
    setEditingLink(null);
    setIsLinkModalOpen(true);
  };

  const handleOpenEditLinkModal = (link) => {
    setEditingLink(link);
    setIsLinkModalOpen(true);
  };

  return (
    <div className={styles.container}>
      {/* Toast Notification Banner */}
      {notification && (
        <div
          className={`${styles.toastBanner} ${
            notification.type === 'success'
              ? styles.toastSuccess
              : notification.type === 'warning'
              ? styles.toastWarning
              : notification.type === 'error'
              ? styles.toastError
              : styles.toastInfo
          }`}
        >
          <span>{notification.message}</span>
          <button
            type="button"
            className={styles.toastDismiss}
            onClick={() => showToast(null)}
          >
            ✕
          </button>
        </div>
      )}

      {/* Welcome & Live Clock Header */}
      <WorkspaceHeader
        userEmail={user?.email}
        selectedPreset={selectedPreset}
        activeSession={activeSession}
      />

      {/* Session Controls Banner */}
      <SessionStatusBanner
        activeSession={activeSession}
        selectedPreset={selectedPreset}
        onStartWork={startWork}
        onEndWork={endWork}
        presets={presets}
        onSelectPreset={(id) => setSelectedPresetId(id)}
      />

      {/* Quick Search & Actions Toolbar */}
      <QuickActions
        onNewPreset={handleOpenNewPresetModal}
        onNewLink={handleOpenNewLinkModal}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        activeFilter={activeCategory}
        onFilterChange={setActiveCategory}
        categories={availableCategories}
      />

      {/* Workspace Presets Section */}
      <div className={styles.sectionContainer}>
        <div className={styles.sectionHeader}>
          <div>
            <h2 className={styles.sectionTitle}>⚡ Workspace Presets</h2>
            <p className={styles.sectionSubtitle}>
              Organized URL stacks tailored for different development modes.
            </p>
          </div>

          <button
            type="button"
            className={styles.secondaryBtnSmall}
            onClick={handleOpenNewPresetModal}
          >
            + New Preset
          </button>
        </div>

        {loading ? (
          <div className={styles.skeletonGrid}>
            {[1, 2, 3].map((n) => (
              <div key={n} className={styles.skeletonCard} />
            ))}
          </div>
        ) : filteredPresets.length === 0 ? (
          <div className={styles.emptyLinksState}>
            <div className={styles.emptyLinksIcon}>⚡</div>
            <h3 className={styles.emptyTitle}>No Workspace Presets Found</h3>
            <p className={styles.emptyText}>
              {searchQuery
                ? 'No presets match your current search query.'
                : 'Create your first workspace preset to organize target websites and dev resources.'}
            </p>
            <button
              type="button"
              className={styles.primaryBtnSmall}
              onClick={handleOpenNewPresetModal}
            >
              + Create Preset
            </button>
          </div>
        ) : (
          <div className={styles.presetsGrid}>
            {filteredPresets.map((preset) => (
              <WorkspacePresetCard
                key={preset.id}
                preset={preset}
                isSelected={selectedPresetId === preset.id}
                onSelect={() => setSelectedPresetId(preset.id)}
                onStart={startWork}
                onEdit={handleOpenEditPresetModal}
                onDelete={(p) => handleDeletePreset(p.id, p.name)}
              />
            ))}
          </div>
        )}
      </div>

      {/* Favorite Quick Links Section */}
      <FavoriteLinks
        links={links}
        searchQuery={searchQuery}
        activeCategory={activeCategory}
        onOpenLink={handleOpenLink}
        onEditLink={handleOpenEditLinkModal}
        onDeleteLink={handleDeleteLink}
        onNewLink={handleOpenNewLinkModal}
      />

      {/* Recent Activity Section */}
      <RecentActivity activities={activities} />

      {/* Modals */}
      <WorkspacePresetFormModal
        isOpen={isPresetModalOpen}
        onClose={() => setIsPresetModalOpen(false)}
        onSave={handleSavePreset}
        initialData={editingPreset}
      />

      <FavoriteLinkFormModal
        isOpen={isLinkModalOpen}
        onClose={() => setIsLinkModalOpen(false)}
        onSave={handleSaveLink}
        presets={presets}
        initialData={editingLink}
      />
    </div>
  );
}

export default DailyWorkspace;
