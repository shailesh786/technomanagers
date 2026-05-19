'use client';

/**
 * contexts/AuthContext.tsx
 *
 * Migrated from src/contexts/AuthContext.tsx.
 *
 * Changes from original:
 * 1. Added 'use client' directive (required — uses useState, useEffect, hooks)
 * 2. Supabase client: now uses createSupabaseBrowserClient() from @/lib/supabase/client
 *    (cookie-based session, not localStorage — required for SSR compatibility)
 * 3. signInWithGoogle: replaced @lovable.dev/cloud-auth-js (removed in Phase 1)
 *    with native supabase.auth.signInWithOAuth. The redirect goes to /auth/callback
 *    which exchanges the PKCE code for a session (Route Handler already in place).
 *    All other logic (profile fetch, onAuthStateChange, signOut) is UNCHANGED.
 *
 * Phase 3: This context will be wired into app/layout.tsx as part of the
 * providers wrapper.
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

  // Replaced: lovable.auth.signInWithOAuth (package removed in Phase 1)
  // Now uses native Supabase OAuth with PKCE flow.
  // The /auth/callback Route Handler (app/auth/callback/route.ts) exchanges
  // the code for a session and sets the cookie.
  //
  // We thread the ?next= param through to the callback URL so that if the
  // middleware redirected the user from e.g. /profile → /auth?next=/profile,
  // they land back on /profile after signing in rather than the default /.
  const signInWithGoogle = useCallback(async () => {
    const searchParams = new URLSearchParams(window.location.search);
    const next = searchParams.get('next') || '/questions';
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
