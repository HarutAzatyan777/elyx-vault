import React from 'react';
import { extractDomain, getFaviconUrl } from '../../utils/workspaceValidation.js';
import styles from './DailyWorkspace.module.css';

export function FavoriteLinks({
  links,
  searchQuery,
  activeCategory,
  onOpenLink,
  onEditLink,
  onDeleteLink,
  onNewLink,
}) {
  // Filter links by search query and category
  const filteredLinks = links.filter((link) => {
    const matchesSearch =
      !searchQuery ||
      link.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      link.url?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      link.category?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      link.description?.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesCategory =
      activeCategory === 'ALL' || !activeCategory || link.category === activeCategory;

    return matchesSearch && matchesCategory;
  });

  return (
    <div className={styles.sectionContainer}>
      <div className={styles.sectionHeader}>
        <div>
          <h2 className={styles.sectionTitle}>⭐ Favorite Quick Links</h2>
          <p className={styles.sectionSubtitle}>
            Frequently accessed dev tools, docs, and management portals.
          </p>
        </div>

        <button
          type="button"
          className={styles.secondaryBtnSmall}
          onClick={onNewLink}
        >
          + Add New Link
        </button>
      </div>

      {filteredLinks.length === 0 ? (
        <div className={styles.emptyLinksState}>
          <div className={styles.emptyLinksIcon}>🔗</div>
          <h3 className={styles.emptyTitle}>No Favorite Links Found</h3>
          <p className={styles.emptyText}>
            {searchQuery || activeCategory !== 'ALL'
              ? 'No links match your current search or category filter.'
              : 'Add your frequently visited URLs to access them with a single click.'}
          </p>
          <button
            type="button"
            className={styles.primaryBtnSmall}
            onClick={onNewLink}
          >
            + Add First Link
          </button>
        </div>
      ) : (
        <div className={styles.linksGrid}>
          {filteredLinks.map((link) => (
            <div key={link.id} className={styles.linkCard}>
              <div className={styles.linkCardTop}>
                <div className={styles.linkFaviconBox}>
                  <img
                    src={getFaviconUrl(link.url)}
                    alt=""
                    className={styles.linkFaviconImg}
                    onError={(e) => {
                      e.target.style.display = 'none';
                    }}
                  />
                </div>

                <div className={styles.linkTitleBox}>
                  <h4 className={styles.linkTitle}>{link.title}</h4>
                  <span className={styles.linkCategoryTag}>
                    {link.category || 'General'}
                  </span>
                </div>

                <div className={styles.linkActionsMenu}>
                  <button
                    type="button"
                    className={styles.iconBtn}
                    onClick={() => onEditLink(link)}
                    title="Edit Link"
                  >
                    <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" width="15" height="15">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                    </svg>
                  </button>
                  <button
                    type="button"
                    className={`${styles.iconBtn} ${styles.iconBtnDanger}`}
                    onClick={() => onDeleteLink(link.id, link.title)}
                    title="Delete Link"
                  >
                    <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" width="15" height="15">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                </div>
              </div>

              {link.description && (
                <p className={styles.linkDescription}>{link.description}</p>
              )}

              <div className={styles.linkCardFooter}>
                <span className={styles.linkDomainText}>
                  {extractDomain(link.url)}
                </span>
                <button
                  type="button"
                  className={styles.openLinkBtn}
                  onClick={() => onOpenLink(link)}
                >
                  <span>Open</span>
                  <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" width="14" height="14">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                  </svg>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default FavoriteLinks;
