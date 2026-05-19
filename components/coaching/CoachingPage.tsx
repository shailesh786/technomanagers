'use client';

/**
 * components/coaching/CoachingPage.tsx  —  Client Component ✅
 *
 * Migrated from src/_vite-pages/Coaching.tsx.
 * Changes:
 * - 'use client' added (useState for active tab)
 * - Hook import: @src/hooks/useCoaching
 * - Component import: @/components/coaching/CoachingCard (migrated RSC)
 * - All logic, JSX, and visual design UNCHANGED.
 */

import { useState } from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import { useCoaching } from '@src/hooks/useCoaching';
import CoachingCard from '@/components/coaching/CoachingCard';
import { Users } from 'lucide-react';

const tabs = ['All', 'Mock Interview', 'Resume Review', 'Mentorship', 'Masterclass'];

export default function CoachingPage() {
  const [activeTab, setActiveTab] = useState('All');
  const { data: services, isLoading } = useCoaching(activeTab);

  return (
    <div className="container py-8">
      <div className="mb-8 space-y-2">
        <h1 className="font-heading font-extrabold text-3xl">1:1 Coaching</h1>
        <p className="text-muted-foreground">Get personalized guidance from experienced Product Managers.</p>
      </div>

      <div className="flex flex-wrap gap-2 mb-8">
        {tabs.map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-1.5 rounded-full text-sm font-medium transition-all duration-200 ${
              activeTab === tab
                ? 'bg-primary text-primary-foreground'
                : 'bg-muted text-muted-foreground hover:bg-muted/80'
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="rounded-xl border p-5 space-y-3">
              <div className="flex gap-2"><Skeleton className="h-3 w-16" /><Skeleton className="h-3 w-16" /></div>
              <Skeleton className="h-4 w-20" />
              <Skeleton className="h-5 w-full" />
              <Skeleton className="h-3 w-3/4" />
              <Skeleton className="h-6 w-24" />
            </div>
          ))}
        </div>
      ) : services?.length === 0 ? (
        <div className="text-center py-20 space-y-4">
          <Users className="h-12 w-12 text-muted-foreground mx-auto" />
          <p className="text-lg text-muted-foreground">No coaching services available for this category.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {services?.map((service) => (
            <CoachingCard key={service.id} service={service} />
          ))}
        </div>
      )}
    </div>
  );
}
