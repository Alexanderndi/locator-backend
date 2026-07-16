export interface PaginationMeta {
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export function paginate<T>(
  items: T[],
  page: number,
  pageSize: number,
): { data: T[]; meta: PaginationMeta } {
  const total = items.length;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const safePage = Math.min(Math.max(1, page), totalPages);
  const start = (safePage - 1) * pageSize;
  return {
    data: items.slice(start, start + pageSize),
    meta: { total, page: safePage, pageSize, totalPages },
  };
}
