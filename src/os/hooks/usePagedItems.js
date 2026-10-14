import { useEffect, useState } from 'react';
export function usePagedItems(items, pageSize = 60) {
  const [page, setPage] = useState(1);
  const totalPages = Math.max(1, Math.ceil(items.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  useEffect(() => setPage(1), [items]);
  return {
    items: items.slice((currentPage - 1) * pageSize, currentPage * pageSize),
    page: currentPage,
    totalPages,
    setPage,
    start: (currentPage - 1) * pageSize,
  };
}
