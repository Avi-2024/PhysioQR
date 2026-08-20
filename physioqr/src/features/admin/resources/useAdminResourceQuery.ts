import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import apiClient from '@/lib/api-client';
import { adminResourceModules } from './admin-resource.config';
import type { AdminResourceKey } from './admin-resource.types';
import { displayValue, extractItems, getValue } from './admin-resource.utils';

type ResourceFilters = Record<string, string>;

export function useAdminResourceQuery(
  moduleKey: AdminResourceKey,
  search: string,
  filters: ResourceFilters = {},
) {
  const config = adminResourceModules[moduleKey];

  const query = useQuery({
    queryKey: ['admin-resource-page', moduleKey, search, filters],
    queryFn: async () => {
      const response = await apiClient.get(config.endpoint, {
        params: {
          limit: 50,
          ...(search ? { search } : {}),
          ...filters,
          ...config.queryParams,
        },
      });
      return response.data;
    },
  });

  const rows = useMemo(() => {
    const items = extractItems(query.data);
    const clientQuery = search.trim().toLowerCase();
    if (!clientQuery) return items;

    return items.filter((item) =>
      [config.primaryField, ...config.secondaryFields, config.statusField, config.ownerField]
        .filter(Boolean)
        .some((field) => displayValue(getValue(item, field)).toLowerCase().includes(clientQuery)),
    );
  }, [config, query.data, search]);

  const stats = useMemo(() => {
    const active = rows.filter((row) => {
      const status = displayValue(getValue(row, config.statusField)).toLowerCase();
      return status.includes('active') || status.includes('approved');
    }).length;
    const pending = rows.filter((row) => {
      const status = displayValue(getValue(row, config.statusField)).toLowerCase();
      return status.includes('pending') || status.includes('review') || status.includes('submitted');
    }).length;
    return { total: rows.length, active, pending };
  }, [config.statusField, rows]);

  return { config, query, rows, stats };
}
