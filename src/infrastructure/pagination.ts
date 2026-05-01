import { getEnv } from './validate-env';

export interface PaginationQuery {
  page?: string | number;
  limit?: string | number;
}

export interface PaginationResult {
  page: number;
  limit: number;
  offset: number;
}

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

const DEFAULT_MAX_PAGE_LIMIT = 100;

export const getPagination = (
  query: PaginationQuery,
  customLimit?: number,
  maxLimit: number = DEFAULT_MAX_PAGE_LIMIT,
): PaginationResult => {
  const defaultLimit = getEnv().DEFAULT_PAGE_LIMIT;
  const page = Math.max(parseInt(String(query.page ?? 1), 10) || 1, 1);
  const limit = Math.min(
    Math.max(
      parseInt(String(query.limit ?? customLimit ?? defaultLimit), 10) ||
        defaultLimit,
      1,
    ),
    maxLimit,
  );
  const offset = (page - 1) * limit;
  return { page, limit, offset };
};

export const buildPaginationMeta = (
  page: number,
  limit: number,
  totalCount: number,
): PaginationMeta => {
  const totalPages = Math.ceil(totalCount / limit) || 1;
  return { page, limit, total: totalCount, totalPages };
};
