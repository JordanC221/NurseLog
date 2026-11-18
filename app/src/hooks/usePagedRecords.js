import { useCallback, useEffect, useRef, useState } from "react";

export const PAGE_SIZE = 25;

/**
 * Cursor-paginated entity list. Replaces fixed `list()` caps so totals and
 * histories stay complete as records grow.
 */
export function usePagedRecords(entity, { filter = {}, sort = "-created_date", pageSize = PAGE_SIZE } = {}) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState(null);
  const [cursor, setCursor] = useState(null);
  const [hasMore, setHasMore] = useState(false);
  const requestId = useRef(0);

  const filterKey = JSON.stringify(filter);

  const load = useCallback(async () => {
    const id = ++requestId.current;
    setLoading(true);
    setError(null);
    try {
      const page = await entity.filter(JSON.parse(filterKey), { sort, limit: pageSize });
      if (id !== requestId.current) return;
      setItems(page.items || []);
      setCursor(page.next_cursor || null);
      setHasMore(Boolean(page.has_more));
    } catch (e) {
      if (id !== requestId.current) return;
      setItems([]);
      setCursor(null);
      setHasMore(false);
      setError(e?.message || "Could not load records.");
    } finally {
      if (id === requestId.current) setLoading(false);
    }
  }, [entity, filterKey, sort, pageSize]);

  useEffect(() => {
    load();
  }, [load]);

  const loadMore = useCallback(async () => {
    if (!cursor || loadingMore || loading) return;
    setLoadingMore(true);
    try {
      const page = await entity.filter(JSON.parse(filterKey), { sort, limit: pageSize, cursor });
      setItems((prev) => [...prev, ...(page.items || [])]);
      setCursor(page.next_cursor || null);
      setHasMore(Boolean(page.has_more));
    } catch (e) {
      setError(e?.message || "Could not load more records.");
    } finally {
      setLoadingMore(false);
    }
  }, [entity, filterKey, sort, pageSize, cursor, loading, loadingMore]);

  return { items, loading, loadingMore, error, hasMore, loadMore, reload: load, setItems };
}