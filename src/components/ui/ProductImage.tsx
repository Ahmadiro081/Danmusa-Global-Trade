import { Package } from 'lucide-react';
import { useState } from 'react';

interface ProductImageProps {
  src: string | null;
  alt: string;
  categoryLabel?: string;
  aspectRatio?: '4/3' | '16/9' | '1/1';
  className?: string;
}

const ASPECT_CLASS = {
  '4/3': 'aspect-[4/3]',
  '16/9': 'aspect-[16/9]',
  '1/1': 'aspect-square',
} as const;

export function ProductImage({
  src,
  alt,
  categoryLabel = 'DGT Catalogue',
  aspectRatio = '4/3',
  className = '',
}: ProductImageProps) {
  const [hasError, setHasError] = useState(false);

  if (!src || hasError) {
    return (
      <div
        className={`${ASPECT_CLASS[aspectRatio]} w-full overflow-hidden rounded-md bg-slate-100 border border-slate-200 flex flex-col items-center justify-center p-6 text-center ${className}`}
        role="img"
        aria-label={alt}
      >
        <div className="w-10 h-10 rounded-md bg-[#0B1E3D]/10 text-[#0B1E3D] flex items-center justify-center mb-3">
          <Package className="w-5 h-5" aria-hidden="true" />
        </div>
        <span className="text-xs font-medium text-slate-600">{categoryLabel}</span>
        <span className="mt-1 text-[11px] text-slate-400">
          Product imagery pending upload
        </span>
      </div>
    );
  }

  return (
    <div
      className={`${ASPECT_CLASS[aspectRatio]} w-full overflow-hidden rounded-md bg-slate-100 ${className}`}
    >
      <img
        src={src}
        alt={alt}
        referrerPolicy="no-referrer"
        onError={() => setHasError(true)}
        className="h-full w-full object-cover transition-transform duration-200"
      />
    </div>
  );
}
