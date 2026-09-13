import React, { useState, useMemo } from 'react';
import { Search, ChevronLeft, ChevronRight, ArrowUpDown, Filter } from 'lucide-react';
import { Input } from './Input.js';
import { Button } from './Button.js';
import { Badge } from './Badge.js';

export interface Column<T> {
  header: string;
  accessorKey?: keyof T;
  cell?: (row: T) => React.ReactNode;
  sortable?: boolean;
  className?: string;
}

export interface DataTableProps<T> {
  columns: Column<T>[];
  data: T[];
  searchPlaceholder?: string;
  searchKey?: keyof T;
  filterOptions?: { label: string; key: keyof T; value: string }[];
  pageSize?: number;
  emptyMessage?: string;
  title?: string;
  actions?: React.ReactNode;
  isLoading?: boolean;
}

export function DataTable<T extends Record<string, any>>({
  columns,
  data,
  searchPlaceholder = 'Search records...',
  searchKey,
  filterOptions,
  pageSize = 10,
  emptyMessage = 'No matching records found.',
  title,
  actions,
  isLoading = false,
}: DataTableProps<T>) {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedFilter, setSelectedFilter] = useState<string>('ALL');
  const [sortKey, setSortKey] = useState<keyof T | null>(null);
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [currentPage, setCurrentPage] = useState(1);

  // Filtered & Searched Data
  const processedData = useMemo(() => {
    let result = [...data];

    // Search
    if (searchTerm) {
      const q = searchTerm.toLowerCase();
      result = result.filter((item) => {
        if (searchKey) {
          const val = String(item[searchKey] || '').toLowerCase();
          return val.includes(q);
        }
        // General search across all string/number fields
        return Object.values(item).some((v) =>
          String(v || '')
            .toLowerCase()
            .includes(q)
        );
      });
    }

    // Filter
    if (selectedFilter !== 'ALL' && filterOptions) {
      const opt = filterOptions.find((f) => f.label === selectedFilter);
      if (opt) {
        result = result.filter((item) => String(item[opt.key]) === opt.value);
      }
    }

    // Sort
    if (sortKey) {
      result.sort((a, b) => {
        const valA = a[sortKey];
        const valB = b[sortKey];
        if (valA === valB) return 0;
        if (valA === null || valA === undefined) return 1;
        if (valB === null || valB === undefined) return -1;
        if (typeof valA === 'number' && typeof valB === 'number') {
          return sortOrder === 'asc' ? valA - valB : valB - valA;
        }
        return sortOrder === 'asc'
          ? String(valA).localeCompare(String(valB))
          : String(valB).localeCompare(String(valA));
      });
    }

    return result;
  }, [data, searchTerm, searchKey, selectedFilter, filterOptions, sortKey, sortOrder]);

  // Pagination
  const totalPages = Math.ceil(processedData.length / pageSize) || 1;
  const paginatedData = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return processedData.slice(start, start + pageSize);
  }, [processedData, currentPage, pageSize]);

  const handleSort = (key?: keyof T) => {
    if (!key) return;
    if (sortKey === key) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortKey(key);
      setSortOrder('asc');
    }
  };

  return (
    <div className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-xs overflow-hidden text-left">
      {/* Table Header Bar */}
      <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-3 bg-slate-50/50 dark:bg-slate-900/50">
        <div className="flex items-center gap-3">
          {title && (
            <h4 className="font-semibold text-sm md:text-base text-slate-900 dark:text-white">
              {title}
            </h4>
          )}
          <Badge variant="neutral" size="sm">
            {processedData.length} records
          </Badge>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <div className="w-full sm:w-64">
            <Input
              placeholder={searchPlaceholder}
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setCurrentPage(1);
              }}
              leftIcon={<Search className="w-4 h-4" />}
            />
          </div>

          {filterOptions && filterOptions.length > 0 && (
            <div className="flex items-center gap-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-1 text-xs">
              <Filter className="w-3.5 h-3.5 text-slate-400 ml-1.5" />
              <select
                value={selectedFilter}
                onChange={(e) => {
                  setSelectedFilter(e.target.value);
                  setCurrentPage(1);
                }}
                aria-label="Filter records"
                className="bg-transparent border-none text-slate-700 dark:text-slate-200 text-xs focus:ring-0 cursor-pointer pr-2 py-0.5"
              >
                <option value="ALL">All Categories</option>
                {filterOptions.map((opt) => (
                  <option key={opt.label} value={opt.label}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>
          )}

          {actions}
        </div>
      </div>

      {/* Table Body Container - Mobile Horizontal Scroll */}
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse text-xs md:text-sm">
          <thead>
            <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-100/70 dark:bg-slate-800/60 text-slate-600 dark:text-slate-400 font-semibold uppercase tracking-wider text-[11px]">
              {columns.map((col, idx) => (
                <th
                  key={idx}
                  onClick={() => col.sortable && handleSort(col.accessorKey)}
                  className={`py-3 px-4 select-none ${col.sortable ? 'cursor-pointer hover:text-slate-900 dark:hover:text-white' : ''} ${
                    col.className || ''
                  }`}
                >
                  <div className="flex items-center gap-1.5">
                    <span>{col.header}</span>
                    {col.sortable && <ArrowUpDown className="w-3 h-3 text-slate-400" />}
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80">
            {isLoading ? (
              <tr>
                <td colSpan={columns.length} className="py-12 text-center text-slate-400">
                  <div className="flex items-center justify-center gap-2">
                    <div className="w-5 h-5 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
                    <span>Loading data...</span>
                  </div>
                </td>
              </tr>
            ) : paginatedData.length === 0 ? (
              <tr>
                <td colSpan={columns.length} className="py-12 text-center text-slate-400">
                  {emptyMessage}
                </td>
              </tr>
            ) : (
              paginatedData.map((row, rowIdx) => (
                <tr
                  key={rowIdx}
                  className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors"
                >
                  {columns.map((col, colIdx) => {
                    let cellContent: React.ReactNode = null;
                    try {
                      if (col.cell) {
                        cellContent = col.cell(row);
                      } else if (col.accessorKey) {
                        cellContent = String(row[col.accessorKey] ?? '');
                      }
                    } catch (err) {
                      console.warn('DataTable cell render error:', err);
                      cellContent = col.accessorKey ? String(row[col.accessorKey] ?? '-') : '-';
                    }

                    return (
                      <td key={colIdx} className={`py-3.5 px-4 text-slate-700 dark:text-slate-300 ${col.className || ''}`}>
                        {cellContent}
                      </td>
                    );
                  })}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination Footer */}
      {totalPages > 1 && (
        <div className="p-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 bg-slate-50/40 dark:bg-slate-900/40">
          <span>
            Page {currentPage} of {totalPages}
          </span>
          <div className="flex items-center gap-1.5">
            <Button
              variant="outline"
              size="sm"
              disabled={currentPage <= 1}
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
            >
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={currentPage >= totalPages}
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
            >
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
