'use client';

/**
 * Auth context — wraps Supabase auth state for client components.
 *
 * Uses cookie-based sessions (not localStorage) for SSR compatibility.
 * signInWithGoogle uses native Supabase OAuth with PKCE; the /auth/callback
 * Route Handler exchanges the code for a session cookie.
 */

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useMemo,
  type ReactNode,
} from 'react';
import { createSupabaseBrowserClient } from '@/lib/supabase/client';
import type { Profile } from '@/types';
import type { User } from '@supabase/supabase-js';

interface AuthContextType {
  user: User | null;
  profile: Profile | null;
  isAdmin: boolean;
  isLoading: boolean;
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  // Start true so every consumer sees isLoading=true before the INITIAL_SESSION
  // event fires — prevents a flash where user=null && isLoading=false causes
  // protected pages to redirect before auth has had a chance to resolve.
  const [isLoading, setIsLoading] = useState(true);

  const supabase = createSupabaseBrowserClient();

  const fetchProfile = async (userId: string) => {
    const { data } = await supabase
      .from('profiles')
      .select('id, email, full_name, avatar_url, is_admin, commenting_disabled, created_at, updated_at')
      .eq('id', userId)
      .single();
    setProfile(data as Profile | null);
  };

  useEffect(() => {
    // Set up listener FIRST
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (_event, session) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        // Use setTimeout to avoid Supabase deadlock
        setTimeout(() => fetchProfile(session.user.id), 0);
      } else {
        setProfile(null);
      }
      setIsLoading(false);
    });

    return () => subscription.unsubscribe();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Threads ?next= through to the callback URL so users redirected to /auth
  // (e.g. from /profile) land back on their intended page after signing in.
  // Without an explicit next, return to the CURRENT page — a reader signing
  // in from the free-view gate lands back on the question they were reading.
  // On /auth itself there is no page to return to, so fall back to /questions.
  const signInWithGoogle = useCallback(async () => {
    const searchParams = new URLSearchParams(window.location.search);
    const next =
      searchParams.get('next') ||
      (window.location.pathname !== '/auth'
        ? window.location.pathname + window.location.search
        : '/questions');
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}`,
      },
    });
    if (error) {
      console.error('Google sign-in error:', error);
    }
  }, [supabase]);

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
    setUser(null);
    setProfile(null);
  }, [supabase]);

  const isAdmin = profile?.is_admin ?? false;

  const value = useMemo(
    () => ({ user, profile, isAdmin, isLoading, signInWithGoogle, signOut }),
    [user, profile, isAdmin, isLoading, signInWithGoogle, signOut],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
