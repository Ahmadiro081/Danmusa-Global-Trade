import { Link } from 'react-router-dom';
import { Button } from '../../components/ui/Button';

export function NotFoundPage() {
  return (
    <div className="mx-auto max-w-2xl px-4 py-24 text-center sm:px-6 lg:px-8">
      <p className="font-mono text-sm font-semibold text-[#8E6B0C]">HTTP 404</p>
      <h1 className="mt-2 font-display text-3xl font-bold text-[#0B1E3D]">
        Page Not Found
      </h1>
      <p className="mt-3 text-sm text-slate-600">
        The requested route does not exist on the Danmusa Global Trade (DGT) platform.
      </p>
      <div className="mt-8 flex flex-wrap justify-center gap-3">
        <Link to="/">
          <Button variant="primary">Return Home</Button>
        </Link>
        <Link to="/catalogue">
          <Button variant="outline">Browse Catalogue</Button>
        </Link>
      </div>
    </div>
  );
}
