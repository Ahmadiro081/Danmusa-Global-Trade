import { Link } from 'react-router-dom';
import { ArrowLeft, Compass } from 'lucide-react';
import { Button } from '../../components/ui/Button';

export function NotFoundPage() {
  return (
    <div className="flex min-h-[65vh] items-center justify-center bg-[#F5F7FA] px-4 py-16">
      <div className="max-w-md rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-xs">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-[#EFF6FF] text-[#2563EB]">
          <Compass className="h-6 w-6" />
        </div>
        <p className="mt-4 font-mono text-xs font-bold uppercase tracking-wider text-[#2563EB]">
          Error 404
        </p>
        <h1 className="mt-2 font-display text-2xl font-extrabold text-[#10243A]">
          Page not found
        </h1>
        <p className="mt-2 text-sm leading-relaxed text-[#64748B]">
          The page you are looking for may have moved or does not exist. Return to the Danmusa Global Trade storefront or browse our product catalogue.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-3">
          <Link to="/">
            <Button variant="primary" size="md">
              <ArrowLeft className="h-4 w-4" />
              Back to Home
            </Button>
          </Link>
          <Link to="/catalogue">
            <Button variant="outline" size="md">
              Browse Products
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
