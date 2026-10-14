import React from 'react';
export default function LibraryPagination({ pagination }) {
  if (pagination.totalPages <= 1) return null;
  return (
    <nav
      aria-label="Library pages"
      style={{ display: 'flex', gap: 16, alignItems: 'center', padding: 16 }}
    >
      <button
        type="button"
        disabled={pagination.page <= 1}
        onClick={() => pagination.setPage(pagination.page - 1)}
      >
        Previous page
      </button>
      <span role="status">
        Page {pagination.page} of {pagination.totalPages}
      </span>
      <button
        type="button"
        disabled={pagination.page >= pagination.totalPages}
        onClick={() => pagination.setPage(pagination.page + 1)}
      >
        Next page
      </button>
    </nav>
  );
}
