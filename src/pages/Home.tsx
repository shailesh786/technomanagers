import { lazy, Suspense } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, BookOpen, Users, Star, CheckCircle, TrendingUp, Building2, Award } from 'lucide-react';
import { Button } from '@/components/ui/button';

const FeaturedQuestionsSection = lazy(() => import('./home/FeaturedQuestionsSection'));

const companies = ['Google', 'Meta', 'Amazon', 'Microsoft', 'Apple', 'DoorDash', 'Uber', 'Adobe', 'PayPal'];

const steps = [
  { num: '1', icon: BookOpen, title: 'Browse Questions', desc: 'Explore real interview questions from top tech companies.' },
  { num: '2', icon: CheckCircle, title: 'Practice & Prepare', desc: 'Study sample answers and save your favorites for later.' },
  { num: '3', icon: Star, title: 'Ace Your Interview', desc: 'Walk in confident and land your dream PM role.' },
];

const stats = [
  { icon: TrendingUp, value: '1,500+', label: 'Questions' },
  { icon: Building2, value: '50+', label: 'Companies' },
  { icon: Award, value: '4.9', label: 'Average Rating' },
];

export default function Home() {
  return (
    <div>
      {/* Hero */}
      <section className="bg-gradient-hero py-20 md:py-28">
        <div className="container text-center max-w-3xl mx-auto space-y-6">
          <h1 className="font-heading font-extrabold text-4xl md:text-5xl lg:text-6xl leading-tight tracking-tight">
            Crack Your Next{' '}
            <span className="text-gradient-brand">Product Management</span>{' '}
            Interview
          </h1>
          <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto">
            Practice with real interview questions from top tech companies. Get coached by industry experts.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center pt-4">
            <Link to="/questions">
              <Button size="lg" className="bg-primary text-primary-foreground hover:bg-primary/90 gap-2 text-base px-8">
                Explore Questions <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
            <Link to="/courses">
              <Button size="lg" variant="outline" className="gap-2 text-base px-8">
                View Courses
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="border-b bg-background">
        <div className="container py-8 flex flex-wrap justify-center gap-8 md:gap-16">
          {stats.map((stat) => (
            <div key={stat.label} className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-muted flex items-center justify-center">
                <stat.icon className="h-5 w-5 text-secondary" />
              </div>
              <div>
                <div className="font-heading font-extrabold text-2xl md:text-3xl text-foreground">{stat.value}</div>
                <div className="text-sm text-muted-foreground">{stat.label}</div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Featured Questions */}
      <Suspense
        fallback={
          <section className="container py-16">
            <div className="h-8 w-48 bg-muted rounded animate-pulse mb-8" />
            <div className="grid md:grid-cols-2 gap-4">
              {[0, 1, 2, 3].map((i) => (
                <div key={i} className="h-40 bg-muted rounded-xl animate-pulse" />
              ))}
            </div>
          </section>
        }
      >
        <FeaturedQuestionsSection />
      </Suspense>

      {/* Trending Companies */}
      <section className="bg-muted/50 py-16">
        <div className="container space-y-8 text-center">
          <h2 className="font-heading font-bold text-2xl">Trending Companies</h2>
          <div className="flex flex-wrap justify-center gap-3">
            {companies.map((c) => (
              <Link
                key={c}
                to={`/questions?company=${c}`}
                className="px-5 py-2 rounded-full border bg-background text-sm font-medium hover:bg-secondary hover:text-secondary-foreground transition-all duration-200"
              >
                {c}
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="container py-16 space-y-8">
        <h2 className="font-heading font-bold text-2xl text-center">How It Works</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {steps.map((step) => (
            <div key={step.num} className="text-center space-y-4 p-6 rounded-xl bg-muted/50">
              <div className="inline-flex items-center justify-center h-14 w-14 rounded-xl bg-gradient-brand">
                <step.icon className="h-7 w-7 text-primary-foreground" />
              </div>
              <h3 className="font-heading font-bold text-lg">{step.num}. {step.title}</h3>
              <p className="text-sm text-muted-foreground">{step.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Coaching CTA */}
      <section className="bg-gradient-brand py-16">
        <div className="container text-center space-y-6 max-w-2xl mx-auto">
          <Users className="h-10 w-10 text-primary-foreground mx-auto" />
          <h2 className="font-heading font-bold text-2xl md:text-3xl text-primary-foreground">
            Get Personalized Coaching from PM Experts
          </h2>
          <p className="text-primary-foreground/80">
            1:1 mock interviews, resume reviews, and mentorship sessions.
          </p>
          <Link to="/coaching">
            <Button size="lg" variant="secondary" className="gap-2 text-base px-8">
              View Coaching <ArrowRight className="h-4 w-4" />
            </Button>
          </Link>
        </div>
      </section>
    </div>
  );
}
