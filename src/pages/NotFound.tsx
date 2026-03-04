import { useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';

const NotFound = () => {
  const location = useLocation();

  useEffect(() => {
    console.error('404 Error: User attempted to access non-existent route:', location.pathname);
  }, [location.pathname]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-6 text-foreground">
      <div className="w-full max-w-md rounded-xl border border-border bg-card p-8 text-center shadow-lg shadow-black/25">
        <h1 className="mb-3 text-4xl font-bold">404</h1>
        <p className="mb-5 text-muted-foreground">Oops! Page not found.</p>
        <div className="flex justify-center gap-4 text-sm">
          <Link className="text-primary underline-offset-4 hover:underline" to="/">
            Home
          </Link>
          <Link className="text-primary underline-offset-4 hover:underline" to="/reqwise">
            Open Reqwise
          </Link>
        </div>
      </div>
    </div>
  );
};

export default NotFound;
