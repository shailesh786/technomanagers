'use client';

/**
 * contexts/QuestionAccessContext.tsx
 *
 * Migrated from src/contexts/QuestionAccessContext.tsx.
 *
 * Changes from original:
 * 1. Added 'use client' directive (uses useState, useCallback, useMemo)
 * 2. Import paths updated: @/ now resolves to root (contexts/, @/types, etc.)
 *
 * Logic is UNCHANGED — manages the free-view gate for unauthenticated users.
 */

import {
  createContext,
  useContext,
  useState,
  useCallback,
  useMemo,
  type ReactNode,
} from 'react';
import { useAuth } from '@/contexts/AuthContext';

interface QuestionAccessContextType {
  /** Number of question detail pages viewed this session (unauthenticated only) */
  viewedCount: number;
  /** Whether the user can view a new question detail / answer */
  canView: boolean;
  /** Record that a question was viewed. Returns true if allowed, false if gated. */
  recordView: (questionId: string) => boolean;
  /** Whether the sign-in gate modal is open */
  gateOpen: boolean;
  setGateOpen: (open: boolean) => void;
  /** Max free views for non-signed-in users */
  maxFreeViews: number;
  /** Whether the user has exhausted free views (only relevant when not signed in) */
  isExhausted: boolean;
}

const QuestionAccessContext = createContext<QuestionAccessContextType | null>(null);

const MAX_FREE_VIEWS = 2;

export function QuestionAccessProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [viewedIds, setViewedIds] = useState<Set<string>>(new Set());
  const [gateOpen, setGateOpen] = useState(false);

  const viewedCount = viewedIds.size;
  const isExhausted = !user && viewedCount >= MAX_FREE_VIEWS;
  const canView = !!user || viewedCount < MAX_FREE_VIEWS;

  const recordView = useCallback(
    (questionId: string) => {
      if (user) return true;
      if (viewedIds.has(questionId)) return true;
      if (viewedIds.size >= MAX_FREE_VIEWS) {
        setGateOpen(true);
        return false;
      }
      setViewedIds((prev) => new Set(prev).add(questionId));
      return true;
    },
    [user, viewedIds],
  );

  const value = useMemo(
    () => ({
      viewedCount,
      canView,
      recordView,
      gateOpen,
      setGateOpen,
      maxFreeViews: MAX_FREE_VIEWS,
      isExhausted,
    }),
    [viewedCount, canView, recordView, gateOpen, setGateOpen, isExhausted],
  );

  return (
    <QuestionAccessContext.Provider value={value}>
      {children}
    </QuestionAccessContext.Provider>
  );
}

export function useQuestionAccess() {
  const ctx = useContext(QuestionAccessContext);
  if (!ctx) throw new Error('useQuestionAccess must be used within QuestionAccessProvider');
  return ctx;
}
