import type { AdminResourceConfig, ApiRecord } from './admin-resource.types';

export const getValue = (record: ApiRecord, path?: string): unknown => {
  if (!path) return undefined;
  return path.split('.').reduce<unknown>((value, part) => {
    if (value && typeof value === 'object') return (value as Record<string, unknown>)[part];
    return undefined;
  }, record);
};

export const asRecord = (value: unknown): ApiRecord =>
  value && typeof value === 'object' ? (value as ApiRecord) : {};

export const displayValue = (value: unknown): string => {
  if (value === undefined || value === null || value === '') return '-';
  if (typeof value === 'boolean') return value ? 'Active' : 'Inactive';
  if (Array.isArray(value)) return `${value.length} items`;
  if (typeof value === 'object') return JSON.stringify(value);
  return String(value);
};

export const toDateInputValue = (value: unknown) => {
  if (!value) return undefined;
  const date = new Date(String(value));
  if (Number.isNaN(date.getTime())) return undefined;
  return date.toISOString().slice(0, 10);
};

export const formatDate = (value: unknown) => {
  if (!value) return '-';
  const date = new Date(String(value));
  return Number.isNaN(date.getTime())
    ? String(value)
    : date.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
};

export const formatAmount = (value: unknown) => {
  const numberValue = Number(value);
  if (Number.isNaN(numberValue)) return '-';
  return `INR ${numberValue.toLocaleString('en-IN')}`;
};

export const extractItems = (data: unknown): ApiRecord[] => {
  if (Array.isArray(data)) return data as ApiRecord[];
  if (data && typeof data === 'object' && Array.isArray((data as { items?: unknown[] }).items)) {
    return (data as { items: ApiRecord[] }).items;
  }
  if (data && typeof data === 'object') return [data as ApiRecord];
  return [];
};

export const recordObjectId = (record?: ApiRecord) => displayValue(getValue(record ?? {}, '_id'));

export const getRecordId = (record: ApiRecord, config: AdminResourceConfig) => {
  const preferred = getValue(record, config.idField) || getValue(record, 'id') || getValue(record, '_id');
  return displayValue(preferred);
};
