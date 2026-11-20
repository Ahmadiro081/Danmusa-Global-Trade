import { ChevronLeft, ChevronRight } from 'lucide-react';

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  totalItems?: number;
  pageSize?: number;
}

export function Pagination({
  currentPage,
  totalPages,
  onPageChange,
  totalItems,
  pageSize,
}: PaginationProps) {
  if (totalPages <= 1) return null;

  const startItem =
    totalItems !== undefined && pageSize !== undefined
      ? (currentPage - 1) * pageSize + 1
      : null;
  const endItem =
    totalItems !== undefined && pageSize !== undefined
      ? Math.min(currentPage * pageSize, totalItems)
      : null;

  const pages: number[] = [];
  const start = Math.max(1, currentPage - 2);
  const end = Math.min(totalPages, currentPage + 2);
  for (let p = start; p <= end; p += 1) {
    pages.push(p);
  }

  return (
    <nav
      className="flex flex-col items-center justify-between gap-3 border-t border-slate-200 pt-4 sm:flex-row"
      aria-label="Pagination"
    >
      {startItem !== null && endItem !== null && totalItems !== undefined ? (
        <p className="text-xs text-[#64748B] tabular-nums">
          Showing <span className="font-semibold text-[#202B38]">{startItem}</span>–
          <span className="font-semibold text-[#202B38]">{endItem}</span> of{' '}
          <span className="font-semibold text-[#202B38]">{totalItems}</span>
        </p>
      ) : (
        <p className="text-xs text-[#64748B] tabular-nums">
          Page <span className="font-semibold text-[#202B38]">{currentPage}</span> of{' '}
          <span className="font-semibold text-[#202B38]">{totalPages}</span>
        </p>
      )}

      <div className="inline-flex items-center gap-1">
        <button
          type="button"
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage <= 1}
          className="inline-flex h-9 items-center gap-1 rounded-lg border border-slate-200 bg-white px-3 text-xs font-medium text-[#202B38] transition-colors hover:border-[#10243A] disabled:pointer-events-none disabled:opacity-40"
        >
          <ChevronLeft className="h-3.5 w-3.5" />
          Prev
        </button>

        {pages.map((page) => (
          <button
            key={page}
            type="button"
            onClick={() => onPageChange(page)}
            aria-current={page === currentPage ? 'page' : undefined}
            className={`h-9 min-w-[36px] rounded-lg px-2.5 text-xs font-semibold tabular-nums transition-colors ${
              page === currentPage
                ? 'bg-[#10243A] text-white'
                : 'border border-slate-200 bg-white text-[#202B38] hover:border-[#10243A]'
            }`}
          >
            {page}
          </button>
        ))}

        <button
          type="button"
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage >= totalPages}
          className="inline-flex h-9 items-center gap-1 rounded-lg border border-slate-200 bg-white px-3 text-xs font-medium text-[#202B38] transition-colors hover:border-[#10243A] disabled:pointer-events-none disabled:opacity-40"
        >
          Next
          <ChevronRight className="h-3.5 w-3.5" />
        </button>
      </div>
    </nav>
  );
}
