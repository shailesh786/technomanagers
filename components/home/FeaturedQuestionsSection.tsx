'use client';


import { useState } from 'react';
import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { useQuestions, useUpvoteQuestion, useSavedQuestions, useSaveQuestion, useUnsaveQuestion } from '@/hooks/useQuestions';
import QuestionCard from '@/components/questions/QuestionCard';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

const PILLS = [
  'All',
  'Product Management',
  'Program Management',
  'Management Consulting',
  'Category Management',
];

export default function FeaturedQuestionsSection() {
  const [selectedPill, setSelectedPill] = useState('All');

  const { data: questions, isLoading } = useQuestions({
    sort: 'Hot',
    ...(selectedPill !== 'All' ? { category: selectedPill } : {}),
  });

  const { user } = useAuth();
  const { data: savedIds = [] } = useSavedQuestions(user?.id);
  const upvote = useUpvoteQuestion();
  const save = useSaveQuestion();
  const unsave = useUnsaveQuestion();

  const featuredQuestions = questions?.slice(0, 4) || [];

  const handleUpvote = (id: string) => {
    if (!user) { toast.info('Sign in to upvote'); return; }
    upvote.mutate(id);
  };

  const handleToggleSave = (id: string) => {
    if (!user) { toast.info('Sign in to save questions'); return; }
    if (savedIds.includes(id)) {
      unsave.mutate({ userId: user.id, questionId: id });
    } else {
      save.mutate({ userId: user.id, questionId: id });
    }
  };

  return (
    <section className="container py-16 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="font-heading font-bold text-2xl">Featured Questions</h2>
        <Link href="/questions" className="text-sm text-secondary hover:underline flex items-center gap-1">
          View all <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      </div>

      {/* Category pills */}
      <div className="flex flex-wrap gap-2">
        {PILLS.map((pill) => (
          <button
            key={pill}
            type="button"
            onClick={() => setSelectedPill(pill)}
            className={cn(
              'px-4 py-1.5 rounded-full text-sm font-medium transition-colors border',
              selectedPill === pill
                ? 'bg-primary text-primary-foreground border-primary'
                : 'bg-background text-muted-foreground border-border hover:border-primary/50 hover:text-foreground',
            )}
          >
            {pill}
          </button>
        ))}
      </div>

      {/* Question grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {isLoading ? (
          Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="rounded-xl border p-5 space-y-3">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-5 w-full" />
              <Skeleton className="h-3 w-48" />
            </div>
          ))
        ) : featuredQuestions.length > 0 ? (
          featuredQuestions.map((q) => (
            <QuestionCard
              key={q.id}
              question={q}
              isSaved={savedIds.includes(q.id)}
              isAuthenticated={!!user}
              onUpvote={() => handleUpvote(q.id)}
              onToggleSave={() => handleToggleSave(q.id)}
            />
          ))
        ) : (
          <p className="text-muted-foreground col-span-2 text-center py-8">
            {selectedPill === 'All' ? 'Questions coming soon!' : `No ${selectedPill} questions yet.`}
          </p>
        )}
      </div>
    </section>
  );
}
