import { useState } from 'react';
import { Package } from 'lucide-react';

interface ProductImageProps {
  src: string | null;
  alt: string;
  aspectClass?: string;
  className?: string;
  priority?: boolean;
}

export function ProductImage({
  src,
  alt,
  aspectClass = 'aspect-[4/3]',
  className = '',
  priority = false,
}: ProductImageProps) {
  const [hasError, setHasError] = useState(false);

  if (!src || hasError) {
    return (
      <div
        className={`flex flex-col items-center justify-center bg-[#F5F7FA] text-[#64748B] ${aspectClass} ${className}`}
        role="img"
        aria-label={alt}
      >
        <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-white text-[#10243A] ring-1 ring-slate-200">
          <Package className="h-5 w-5" />
        </div>
        <span className="mt-2.5 text-[11px] font-medium text-[#64748B]">
          Product image pending
        </span>
      </div>
    );
  }

  return (
    <div className={`relative overflow-hidden bg-[#F5F7FA] ${aspectClass} ${className}`}>
      <img
        src={src}
        alt={alt}
        loading={priority ? 'eager' : 'lazy'}
        decoding="async"
        onError={() => setHasError(true)}
        className="h-full w-full object-cover object-center transition-transform duration-300 group-hover:scale-[1.03]"
      />
    </div>
  );
}
