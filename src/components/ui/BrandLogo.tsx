interface BrandLogoProps {
  variant?: 'dark' | 'light';
  showTagline?: boolean;
  compact?: boolean;
}

export function BrandLogo({
  variant = 'dark',
  showTagline = false,
  compact = false,
}: BrandLogoProps) {
  const isLight = variant === 'light';

  return (
    <div className="inline-flex items-center gap-3 select-none">
      <div
        className={`relative flex shrink-0 items-center justify-center rounded-lg font-display font-extrabold tracking-tight ${
          compact ? 'h-9 w-9 text-sm' : 'h-10 w-10 text-base'
        } ${
          isLight
            ? 'bg-white text-[#10243A] ring-1 ring-white/20'
            : 'bg-[#10243A] text-white'
        }`}
        aria-hidden="true"
      >
        <span>DGT</span>
        <span className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-sm bg-[#F4A62A] ring-2 ring-white" />
      </div>
      <div className="leading-tight">
        <div
          className={`font-display font-bold tracking-tight ${
            compact ? 'text-[15px]' : 'text-base sm:text-[17px]'
          } ${isLight ? 'text-white' : 'text-[#10243A]'}`}
        >
          Danmusa Global Trade
        </div>
        {showTagline && (
          <div
            className={`text-[11px] font-medium tracking-wide ${
              isLight ? 'text-slate-300' : 'text-[#64748B]'
            }`}
          >
            China-to-Nigeria Trade Partner
          </div>
        )}
      </div>
    </div>
  );
}
