import React from 'react';
import styles from './DailyWorkspace.module.css';

export function RecentActivity({ activities }) {
  const formatActivityTime = (timestamp) => {
    if (!timestamp) return 'Just now';
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins} minute${diffMins > 1 ? 's' : ''} ago`;

    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;

    return date.toLocaleDateString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
  };

  const getActivityBadge = (type) => {
    switch (type) {
      case 'START_WORK':
        return { icon: '🚀', label: 'Session Started', color: '#10b981' };
      case 'END_WORK':
        return { icon: '🏁', label: 'Session Ended', color: '#3b82f6' };
      case 'OPEN_LINK':
        return { icon: '🔗', label: 'Opened Link', color: '#8b5cf6' };
      case 'CREATE_PRESET':
      case 'UPDATE_PRESET':
        return { icon: '⚙️', label: 'Preset Action', color: '#f59e0b' };
      default:
        return { icon: '📌', label: 'Activity', color: '#6b7280' };
    }
  };

  return (
    <div className={styles.sectionContainer}>
      <div className={styles.sectionHeader}>
        <div>
          <h2 className={styles.sectionTitle}>📜 Recent Workspace Activity</h2>
          <p className={styles.sectionSubtitle}>
            Audit log of launched presets, opened links, and work duration.
          </p>
        </div>
      </div>

      {activities.length === 0 ? (
        <div className={styles.emptyActivityState}>
          <p>No recent activity logged yet. Click <strong>Start Work</strong> to begin tracking.</p>
        </div>
      ) : (
        <div className={styles.activityTimeline}>
          {activities.map((act) => {
            const badge = getActivityBadge(act.type);
            return (
              <div key={act.id} className={styles.activityRow}>
                <div
                  className={styles.activityIconWrapper}
                  style={{ backgroundColor: `${badge.color}1E`, color: badge.color }}
                >
                  {badge.icon}
                </div>

                <div className={styles.activityContent}>
                  <div className={styles.activityTop}>
                    <span className={styles.activityTitle}>{act.title}</span>
                    <span className={styles.activityTime}>
                      {formatActivityTime(act.createdAt)}
                    </span>
                  </div>
                  {act.metadata && (
                    <div className={styles.activityMetadata}>
                      {act.metadata.durationSeconds && (
                        <span className={styles.metaTag}>
                          ⏱️ Duration: {Math.floor(act.metadata.durationSeconds / 60)}m {act.metadata.durationSeconds % 60}s
                        </span>
                      )}
                      {act.metadata.urlCount && (
                        <span className={styles.metaTag}>
                          🌐 {act.metadata.urlCount} tabs opened
                        </span>
                      )}
                      {act.metadata.domain && (
                        <span className={styles.metaTag}>
                          {act.metadata.domain}
                        </span>
                      )}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default RecentActivity;
