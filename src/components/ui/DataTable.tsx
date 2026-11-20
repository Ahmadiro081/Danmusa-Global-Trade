import { useMemo, useState, type ReactNode } from 'react';
import { Search } from 'lucide-react';
import { EmptyState, LoadingSkeleton } from './StateViews';
import { Pagination } from './Pagination';

export interface TableColumn<T> {
  key: string;
  header: string;
  align?: 'left' | 'right';
  render: (row: T) => ReactNode;
}

interface DataTableProps<T> {
  columns: Array<TableColumn<T>>;
  rows: T[];
  rowKey: (row: T) => string;
  emptyTitle: string;
  emptyDescription: string;
  emptyAction?: ReactNode;
  loading?: boolean;
  searchable?: boolean;
  searchPlaceholder?: string;
  searchFilter?: (row: T, query: string) => boolean;
  toolbarExtra?: ReactNode;
  pageSize?: number;
  renderMobileCard?: (row: T) => ReactNode;
}

export function DataTable<T>({
  columns,
  rows,
  rowKey,
  emptyTitle,
  emptyDescription,
  emptyAction,
  loading = false,
  searchable = false,
  searchPlaceholder = 'Search records...',
  searchFilter,
  toolbarExtra,
  pageSize = 15,
  renderMobileCard,
}: DataTableProps<T>) {
  const [query, setQuery] = useState('');
  const [page, setPage] = useState(1);

  const filteredRows = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!searchable || !q) return rows;
    if (searchFilter) {
      return rows.filter((row) => searchFilter(row, q));
    }
    return rows.filter((row) => JSON.stringify(row).toLowerCase().includes(q));
  }, [rows, query, searchable, searchFilter]);

  const totalPages = Math.max(1, Math.ceil(filteredRows.length / pageSize));
  const safePage = Math.min(page, totalPages);
  const paginatedRows = useMemo(() => {
    const start = (safePage - 1) * pageSize;
    return filteredRows.slice(start, start + pageSize);
  }, [filteredRows, safePage, pageSize]);

  if (loading) {
    return <LoadingSkeleton rows={5} />;
  }

  return (
    <div className="space-y-4">
      {(searchable || toolbarExtra) && (
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          {searchable ? (
            <div className="relative w-full sm:max-w-xs">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#64748B]" />
              <input
                type="search"
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value);
                  setPage(1);
                }}
                placeholder={searchPlaceholder}
                className="w-full rounded-lg border border-slate-300 bg-white py-2 pl-9 pr-3 text-sm text-[#202B38] placeholder:text-slate-400 focus:border-[#2563EB] focus:outline-none focus:ring-2 focus:ring-[#2563EB]/20"
              />
            </div>
          ) : (
            <div />
          )}
          {toolbarExtra && (
            <div className="flex flex-wrap items-center gap-2">{toolbarExtra}</div>
          )}
        </div>
      )}

      {filteredRows.length === 0 ? (
        <EmptyState
          title={query ? 'No matching records found' : emptyTitle}
          description={
            query
              ? `No records matched "${query}". Adjust or clear your search filter.`
              : emptyDescription
          }
          action={emptyAction}
        />
      ) : (
        <>
          {/* Mobile card fallback when supplied */}
          {renderMobileCard && (
            <div className="space-y-3 md:hidden">
              {paginatedRows.map((row) => (
                <div
                  key={rowKey(row)}
                  className="rounded-xl border border-slate-200 bg-white p-4 shadow-2xs"
                >
                  {renderMobileCard(row)}
                </div>
              ))}
            </div>
          )}

          {/* Desktop & horizontal-scroll responsive table */}
          <div
            className={`${
              renderMobileCard ? 'hidden md:block' : 'block'
            } overflow-hidden rounded-xl border border-slate-200 bg-white shadow-2xs`}
          >
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-200 text-left text-sm">
                <thead className="bg-[#F5F7FA]">
                  <tr>
                    {columns.map((col) => (
                      <th
                        key={col.key}
                        scope="col"
                        className={`whitespace-nowrap px-4 py-3 text-[11px] font-semibold uppercase tracking-wider text-[#64748B] ${
                          col.align === 'right' ? 'text-right' : 'text-left'
                        }`}
                      >
                        {col.header}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white">
                  {paginatedRows.map((row) => (
                    <tr
                      key={rowKey(row)}
                      className="transition-colors hover:bg-[#F5F7FA]/80"
                    >
                      {columns.map((col) => (
                        <td
                          key={col.key}
                          className={`px-4 py-3.5 text-[#202B38] ${
                            col.align === 'right' ? 'text-right' : 'text-left'
                          }`}
                        >
                          {col.render(row)}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <Pagination
            currentPage={safePage}
            totalPages={totalPages}
            onPageChange={setPage}
            totalItems={filteredRows.length}
            pageSize={pageSize}
          />
        </>
      )}
    </div>
  );
}
