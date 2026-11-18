interface BrandLogoProps {
  compact?: boolean;
  inverted?: boolean;
}

/**
 * Temporary corporate SVG emblem + wordmark for Danmusa Global Trade (DGT).
 * Designed to be swapped for the official company logo asset once finalized.
 */
export function BrandLogo({ compact = false, inverted = false }: BrandLogoProps) {
  const textColor = inverted ? 'text-white' : 'text-[#0B1E3D]';
  const accentColor = '#C59B27';

  return (
    <span className={`inline-flex items-center gap-2.5 whitespace-nowrap shrink-0 ${textColor}`}>
      <svg
        width="28"
        height="28"
        viewBox="0 0 32 32"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden="true"
        className="shrink-0"
      >
        <rect
          x="1"
          y="1"
          width="30"
          height="30"
          rx="6"
          fill={inverted ? '#15315E' : '#0B1E3D'}
          stroke={accentColor}
          strokeWidth="1.5"
        />
        <path
          d="M8 10H15.5C19.0899 10 22 12.6863 22 16C22 19.3137 19.0899 22 15.5 22H8V10Z"
          stroke="#FFFFFF"
          strokeWidth="2"
        />
        <path d="M12 16H24" stroke={accentColor} strokeWidth="2" strokeLinecap="round" />
        <path
          d="M21 13L24.5 16L21 19"
          stroke={accentColor}
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
      <span className="font-display text-base font-bold tracking-tight whitespace-nowrap shrink-0">
        {compact ? 'DGT' : 'Danmusa Global Trade'}
      </span>
    </span>
  );
}
