import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { useQuestions } from '@/hooks/useQuestions';
import QuestionCard from '@/components/questions/QuestionCard';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

export default function FeaturedQuestionsSection() {
  const { data: questions, isLoading } = useQuestions({ sort: 'Hot' });
  const { user } = useAuth();
  const featuredQuestions = questions?.slice(0, 4) || [];

  return (
    <section className="container py-16 space-y-8">
      <div className="flex items-center justify-between">
        <h2 className="font-heading font-bold text-2xl">Featured Questions</h2>
        <Link to="/questions" className="text-sm text-secondary hover:underline flex items-center gap-1">
          View all <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      </div>
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
              isAuthenticated={!!user}
              onUpvote={() => toast.info('Sign in to upvote')}
              onToggleSave={() => toast.info('Sign in to save questions')}
            />
          ))
        ) : (
          <p className="text-muted-foreground col-span-2 text-center py-8">Questions coming soon!</p>
        )}
      </div>
    </section>
  );
}