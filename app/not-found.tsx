
import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="container flex flex-col items-center justify-center min-h-[60vh] gap-4 text-center">
      <h1 className="text-6xl font-heading font-bold text-primary">404</h1>
      <h2 className="text-2xl font-heading font-semibold">Page not found</h2>
      <p className="text-muted-foreground max-w-md">
        The page you are looking for does not exist or has been moved.
      </p>
      <Link
        href="/"
        className="mt-4 inline-flex items-center justify-center rounded-md bg-primary px-6 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
      >
        Back to home
      </Link>
    </div>
  );
}
