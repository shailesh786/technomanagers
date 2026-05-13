import { Navigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Skeleton } from '@/components/ui/skeleton';

export function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useAuth();
  if (isLoading) return <div className="flex justify-center py-20"><Skeleton className="h-8 w-32" /></div>;
  if (!user) return <Navigate to="/auth" replace />;
  return <>{children}</>;
}

export function AdminRoute({ children }: { children: React.ReactNode }) {
  const { isAdmin, isLoading } = useAuth();
  if (isLoading) return <div className="flex justify-center py-20"><Skeleton className="h-8 w-32" /></div>;
  if (!isAdmin) return <Navigate to="/" replace />;
  return <>{children}</>;
}
