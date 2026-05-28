'use client';

/**
 * components/cohort/CohortPage.tsx  —  Client Component ✅
 *
 * Migrated from src/_vite-pages/Cohort.tsx.
 * Changes:
 * - 'use client' added (useState×6, useEffect×3, useRef×2, scroll events,
 *   supabase waitlist insert, useAuth)
 * - supabase import: @/integrations/supabase/client (bridge at root)
 * - Context import: @/contexts/AuthContext (migrated)
 * - All logic, JSX, animations, and visual design UNCHANGED.
 */

import { useState, useEffect, useRef } from 'react';
import {
  Calendar, Video, Award, Play, ArrowRight, Check, Sparkles, Brain, Database,
  Zap, Code, Boxes, Bot, ClipboardCheck, MessageSquare, BookOpen, Users,
  Target, Rocket, RefreshCw, TrendingUp, GraduationCap, X,
} from 'lucide-react';
import { createSupabaseBrowserClient } from '@/lib/supabase/client';

const supabase = createSupabaseBrowserClient();
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';

const CURRICULUM = [
  {
    weeks: 'Week 1–2',
    title: 'AI Fundamentals',
    modules: [
      { n: 1, icon: Brain, title: 'AI & Machine Learning', desc: 'Core concepts, supervised vs unsupervised learning, neural networks fundamentals.' },
      { n: 2, icon: Sparkles, title: 'Algorithms & Case Studies', desc: 'Real-world AI product algorithms, recommendation systems, search ranking.' },
    ],
  },
  {
    weeks: 'Week 3–4',
    title: 'AI Systems & Infrastructure',
    modules: [
      { n: 3, icon: Database, title: 'ML Systems & Data Pipelines', desc: 'Production ML systems, data collection, feature engineering, model training pipelines.' },
      { n: 4, icon: Zap, title: 'Generative AI & LLMs', desc: 'Transformer architecture, GPT/Claude/Gemini, fine-tuning vs prompting, when to use GenAI.' },
    ],
  },
  {
    weeks: 'Week 5',
    title: 'Prompting & Pricing',
    modules: [
      { n: 5, icon: MessageSquare, title: 'Advanced Prompting', desc: 'Prompt engineering, chain-of-thought, few-shot learning, building reliable AI features.' },
      { n: 6, icon: TrendingUp, title: 'AI Pricing Strategy', desc: 'Pricing models for AI products (usage, seat, outcome-based), unit economics of AI.' },
    ],
  },
  {
    weeks: 'Week 6',
    title: 'Building with AI',
    modules: [
      { n: 7, icon: Code, title: 'Advanced Vibe Coding', desc: 'Build AI-powered prototypes rapidly, no-code/low-code AI tools, ship MVPs fast.' },
      { n: 8, icon: Boxes, title: 'RAG Implementation', desc: 'Retrieval-Augmented Generation from scratch, vector databases, knowledge-based AI products.' },
    ],
  },
  {
    weeks: 'Week 7',
    title: 'Scaling & Automation',
    modules: [
      { n: 9, icon: Bot, title: 'AI Agents & Automation', desc: 'Autonomous agents, tool use, multi-agent systems, workflow automation with AI.' },
      { n: 10, icon: ClipboardCheck, title: 'Evals in Detail (Advanced)', desc: 'Evaluate AI product quality, build eval frameworks, measure hallucination & accuracy.' },
    ],
  },
  {
    weeks: 'Week 8',
    title: 'Career & Interview Prep',
    modules: [
      { n: 11, icon: Target, title: 'AI PM Interview Questions', desc: 'Top questions from Google, Meta, Amazon, Anthropic for AI PM roles, with frameworks.' },
      { n: 12, icon: BookOpen, title: '25 AI & Strategy Cases Ebook', desc: 'Comprehensive case studies covering real AI product decisions at top companies.' },
    ],
  },
];

const FEATURES = [
  { icon: Video, title: 'Live Weekly Sessions', desc: '2-hour live sessions every week with industry PMs. Ask questions, get real-time feedback, learn collaboratively.' },
  { icon: Play, title: 'Session Recordings', desc: "Can't attend live? All sessions are recorded and available within 24 hours. Learn at your own pace." },
  { icon: Code, title: 'Hands-on Projects', desc: 'Build real AI products during the cohort. Work on actual product problems from top companies.' },
  { icon: Target, title: 'Mock Interviews', desc: 'Practice AI PM interviews with peers and get expert feedback. Walk into your next interview with confidence.' },
  { icon: Award, title: 'Certificate of Competency', desc: 'Earn a Certificate of Competency in AI Product Management upon completion.' },
  { icon: Users, title: 'PM Community Access', desc: 'Join a private community of 600+ ambitious PMs. Network, share resources, grow together.' },
];

const AUDIENCE = [
  { icon: Rocket, title: 'Aspiring AI PMs', desc: "You're a PM who wants to transition into AI product roles." },
  { icon: RefreshCw, title: 'Career Switchers', desc: "You're in tech (eng, design, data) and want to move into AI PM." },
  { icon: TrendingUp, title: 'Current PMs Upskilling', desc: "You're already a PM but want to add AI expertise to your skillset." },
  { icon: GraduationCap, title: 'Students & Fresh Grads', desc: "You're studying tech/business and want to start your career in AI PM." },
];

const FAQS = [
  { q: 'What is the time commitment?', a: 'Expect 4-6 hours per week — 2 hours for the live session and 2-4 hours for assignments and self-study.' },
  { q: 'Do I need a technical background?', a: 'No. The curriculum starts from AI fundamentals and builds up. PMs from non-technical backgrounds have successfully completed the cohort.' },
  { q: 'What if I miss a live session?', a: "All sessions are recorded and shared within 24 hours. You'll also have access to the community to ask questions async." },
  { q: 'Will I get a certificate?', a: "Yes. You'll receive a Certificate of Competency in AI Product Management upon completing all modules and assignments." },
  { q: 'Is there a refund policy?', a: "Yes. If you're not satisfied after the first 2 weeks, you can request a full refund." },
  { q: 'When does the next cohort start?', a: 'The next cohort launches Summer 2026. Join the waitlist to get notified and receive early bird pricing.' },
];

function Reveal({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([entry]) => entry.isIntersecting && (setVisible(true), obs.disconnect()),
      { threshold: 0.1 },
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);
  return (
    <div
      ref={ref}
      className={`${className} transition-all duration-700 ease-out ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}
    >
      {children}
    </div>
  );
}

export default function CohortPage() {
  const { user, profile } = useAuth();
  const [email, setEmail] = useState(profile?.email || '');
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showStickyCta, setShowStickyCta] = useState(false);
  const [stickyDismissed, setStickyDismissed] = useState(false);
  const [showVideoModal, setShowVideoModal] = useState(false);
  const heroRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (profile?.email) setEmail(profile.email);
  }, [profile]);

  useEffect(() => {
    const onScroll = () => {
      const heroH = heroRef.current?.offsetHeight ?? 600;
      setShowStickyCta(window.scrollY > heroH * 0.8);
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    if (!showVideoModal) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setShowVideoModal(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [showVideoModal]);

  const scrollToWaitlist = () => {
    document.getElementById('waitlist')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;
    setLoading(true);
    try {
      const { error } = await supabase.from('waitlist').insert({
        email: email.trim(),
        user_id: user?.id || null,
      });
      if (error) {
        if (error.code === '23505') {
          toast.info("You're already on the waitlist!");
          setSubmitted(true);
        } else throw error;
      } else {
        setSubmitted(true);
        toast.success("You're on the list!");
      }
    } catch {
      toast.error('Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white scroll-smooth">
      {/* ======================== HERO ======================== */}
      <section
        ref={heroRef}
        className="relative overflow-hidden bg-[#0A2E6B] min-h-screen flex items-center justify-center px-4 py-20"
      >
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            backgroundImage: `linear-gradient(rgba(255,255,255,0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.04) 1px, transparent 1px)`,
            backgroundSize: '60px 60px',
          }}
        />
        <div className="absolute top-[-20%] left-[-10%] w-[600px] h-[600px] rounded-full bg-[#1A7AE8]/30 blur-[120px] animate-pulse" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[500px] h-[500px] rounded-full bg-[#00C2FF]/20 blur-[100px] animate-pulse" style={{ animationDelay: '2s' }} />

        <div className="relative z-10 max-w-5xl mx-auto text-center">
          <div className="flex items-center justify-center gap-3 mb-8">
            <span className="h-px w-10 bg-[#00C2FF]/60" />
            <span className="text-[#00C2FF] text-xs font-bold uppercase tracking-[0.25em]">
              Live Cohort · Starts Summer 2026
            </span>
            <span className="h-px w-10 bg-[#00C2FF]/60" />
          </div>

          <h1 className="text-4xl md:text-6xl lg:text-7xl font-heading font-extrabold text-white mb-6 leading-[1.1]">
            <span className="bg-gradient-to-r from-[#1A7AE8] to-[#00C2FF] bg-clip-text text-transparent">
              AI Product Management
            </span>
            <br />Builder Cohort
          </h1>

          <p className="text-gray-300 text-lg md:text-xl max-w-[650px] mx-auto mb-10 leading-relaxed">
            An 8-week intensive program to master AI Product Management — from fundamentals to advanced implementation. Learn to build, ship, and scale AI-powered products.
          </p>

          <div className="flex flex-wrap items-center justify-center gap-3 mb-10">
            {[
              { icon: Calendar, label: '8 Weeks' },
              { icon: Video, label: 'Live Sessions + Recordings' },
              { icon: Award, label: 'Certificate of Competency' },
            ].map((s) => (
              <div key={s.label} className="flex items-center gap-2 rounded-full bg-white/10 border border-white/20 backdrop-blur-md px-4 py-2 text-white text-sm">
                <s.icon className="h-4 w-4 text-[#00C2FF]" />
                {s.label}
              </div>
            ))}
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-8">
            <button
              onClick={scrollToWaitlist}
              className="group rounded-full bg-gradient-to-r from-[#1A7AE8] to-[#00C2FF] text-white font-semibold px-8 py-4 text-base hover:opacity-90 transition-all hover:scale-105 shadow-[0_10px_40px_-10px_rgba(0,194,255,0.5)] flex items-center gap-2"
            >
              Join the Waitlist
              <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
            </button>
            <button
              onClick={() => setShowVideoModal(true)}
              className="rounded-full border border-white/30 text-white font-semibold px-8 py-4 text-base hover:bg-white/10 transition-all flex items-center gap-2"
            >
              <Play className="h-4 w-4" />
              Watch Demo
            </button>
            <a
              href="https://api.whatsapp.com/send/?phone=917014958894&text=Hi+Shailesh%2C+I%27m+interested+in+the+AI+Product+Builder+Cohort&type=phone_number&app_absent=0"
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-full border border-[#25D366]/60 bg-[#25D366]/10 text-white font-semibold px-8 py-4 text-base hover:bg-[#25D366]/20 transition-all flex items-center gap-2"
            >
              <svg viewBox="0 0 24 24" className="h-4 w-4 fill-[#25D366]" xmlns="http://www.w3.org/2000/svg">
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
              </svg>
              Chat on WhatsApp
            </a>
          </div>
        </div>
      </section>

      {/* ======================== CURRICULUM ======================== */}
      <section className="py-20 md:py-28 px-4 bg-white">
        <div className="max-w-4xl mx-auto">
          <Reveal className="text-center mb-16">
            <h2 className="text-3xl md:text-5xl font-heading font-extrabold text-[#0A2E6B] mb-4">
              8 Weeks. 12 Modules. <span className="bg-gradient-to-r from-[#1A7AE8] to-[#00C2FF] bg-clip-text text-transparent">One Transformation.</span>
            </h2>
            <p className="text-gray-600 text-lg max-w-2xl mx-auto">
              A structured curriculum designed by Senior PMs from top tech companies.
            </p>
          </Reveal>

          <Reveal>
            <Accordion type="multiple" defaultValue={['week-0']} className="space-y-4">
              {CURRICULUM.map((wk, i) => (
                <AccordionItem
                  key={wk.weeks}
                  value={`week-${i}`}
                  className="relative border border-gray-200 rounded-2xl bg-white shadow-sm hover:shadow-md transition-shadow data-[state=open]:shadow-lg"
                >
                  {i < CURRICULUM.length - 1 && (
                    <div className="absolute left-[39px] top-full h-4 w-px bg-gradient-to-b from-[#1A7AE8]/40 to-transparent" />
                  )}
                  <AccordionTrigger className="px-5 py-5 hover:no-underline">
                    <div className="flex items-center gap-4 text-left flex-1">
                      <div className="shrink-0 h-12 w-12 rounded-full bg-gradient-to-br from-[#1A7AE8] to-[#00C2FF] flex items-center justify-center text-white font-bold text-sm shadow-lg">
                        {i + 1}
                      </div>
                      <div className="flex-1">
                        <div className="text-xs font-semibold uppercase tracking-wider text-[#1A7AE8] mb-1">{wk.weeks}</div>
                        <div className="text-lg font-heading font-bold text-[#0A2E6B]">{wk.title}</div>
                      </div>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent className="px-5 pb-5">
                    <div className="ml-16 space-y-4 pt-2">
                      {wk.modules.map((m) => (
                        <div key={m.n} className="flex gap-4 p-4 rounded-xl bg-gradient-to-br from-gray-50 to-blue-50/30 border border-gray-100">
                          <div className="shrink-0 h-10 w-10 rounded-lg bg-white border border-[#1A7AE8]/20 flex items-center justify-center">
                            <m.icon className="h-5 w-5 text-[#1A7AE8]" />
                          </div>
                          <div>
                            <div className="text-xs font-semibold text-gray-500 mb-1">Module {m.n}</div>
                            <div className="font-bold text-[#0A2E6B] mb-1">{m.title}</div>
                            <div className="text-sm text-gray-600 leading-relaxed">{m.desc}</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </Reveal>
        </div>
      </section>

      {/* ======================== WHAT'S INCLUDED ======================== */}
      <section className="py-20 md:py-28 px-4 bg-[#F7F9FC]">
        <div className="max-w-6xl mx-auto">
          <Reveal className="text-center mb-16">
            <h2 className="text-3xl md:text-5xl font-heading font-extrabold text-[#0A2E6B] mb-4">
              Everything You Need to Become an AI PM
            </h2>
          </Reveal>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {FEATURES.map((f) => (
              <Reveal key={f.title}>
                <div className="bg-white rounded-2xl p-7 shadow-sm hover:shadow-xl transition-all hover:-translate-y-1 border border-gray-100 h-full">
                  <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-[#1A7AE8]/10 to-[#00C2FF]/10 flex items-center justify-center mb-5">
                    <f.icon className="h-6 w-6 text-[#1A7AE8]" />
                  </div>
                  <h3 className="font-heading font-bold text-lg text-[#0A2E6B] mb-2">{f.title}</h3>
                  <p className="text-gray-600 text-sm leading-relaxed">{f.desc}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ======================== BONUS BOOKS ======================== */}
      <section className="py-20 md:py-28 px-4 bg-white">
        <div className="max-w-5xl mx-auto">
          <Reveal className="text-center mb-12">
            <div className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-[#1A7AE8]/10 to-[#00C2FF]/10 border border-[#00C2FF]/30 px-4 py-1.5 mb-4">
              <Sparkles className="h-4 w-4 text-[#1A7AE8]" />
              <span className="text-[#1A7AE8] text-xs font-bold uppercase tracking-wider">Extra Bonus</span>
            </div>
            <h2 className="text-3xl md:text-5xl font-heading font-extrabold text-[#0A2E6B] mb-3">Included Free</h2>
            <p className="text-gray-600 text-lg">Two premium books to deepen your PM expertise</p>
          </Reveal>
          <div className="grid md:grid-cols-2 gap-6">
            {[
              { title: 'Strategy for Product Managers', desc: 'A comprehensive guide to product strategy frameworks used at top tech companies.', from: 'from-[#1A7AE8]', to: 'to-[#0A2E6B]' },
              { title: 'Tech for Product Managers', desc: 'Understand the technical foundations every PM needs — from APIs to system design.', from: 'from-[#00C2FF]', to: 'to-[#1A7AE8]' },
            ].map((book) => (
              <Reveal key={book.title}>
                <div className="relative rounded-2xl p-[1.5px] bg-gradient-to-br from-[#1A7AE8] to-[#00C2FF]">
                  <div className="rounded-2xl bg-white p-6 flex gap-5 items-center h-full">
                    <div className={`shrink-0 w-24 h-32 md:w-28 md:h-36 rounded-md bg-gradient-to-br ${book.from} ${book.to} shadow-xl flex items-center justify-center text-white p-3 text-center transform -rotate-3 hover:rotate-0 transition-transform`}>
                      <div>
                        <BookOpen className="h-6 w-6 mx-auto mb-2 opacity-80" />
                        <div className="text-[10px] font-bold leading-tight">{book.title}</div>
                      </div>
                    </div>
                    <div className="flex-1">
                      <div className="text-xs font-semibold text-[#1A7AE8] uppercase tracking-wider mb-1">Free Bonus Book</div>
                      <h3 className="font-heading font-bold text-lg text-[#0A2E6B] mb-2">{book.title}</h3>
                      <p className="text-gray-600 text-sm leading-relaxed">{book.desc}</p>
                    </div>
                  </div>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ======================== AUDIENCE ======================== */}
      <section className="py-20 md:py-28 px-4 bg-[#F7F9FC]">
        <div className="max-w-6xl mx-auto">
          <Reveal className="text-center mb-14">
            <h2 className="text-3xl md:text-5xl font-heading font-extrabold text-[#0A2E6B] mb-3">
              Is This Cohort Right for You?
            </h2>
          </Reveal>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {AUDIENCE.map((a) => (
              <Reveal key={a.title}>
                <div className="bg-white rounded-2xl p-6 shadow-sm hover:shadow-lg transition-all border border-gray-100 h-full">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="h-10 w-10 rounded-lg bg-gradient-to-br from-[#1A7AE8]/10 to-[#00C2FF]/10 flex items-center justify-center">
                      <a.icon className="h-5 w-5 text-[#1A7AE8]" />
                    </div>
                    <Check className="h-5 w-5 text-green-500 ml-auto" />
                  </div>
                  <h3 className="font-heading font-bold text-[#0A2E6B] mb-2">{a.title}</h3>
                  <p className="text-gray-600 text-sm leading-relaxed">{a.desc}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ======================== PRICING + WAITLIST ======================== */}
      <section id="waitlist" className="relative py-20 md:py-28 px-4 bg-[#0A2E6B] overflow-hidden">
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            backgroundImage: `linear-gradient(rgba(255,255,255,0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.04) 1px, transparent 1px)`,
            backgroundSize: '60px 60px',
          }}
        />
        <div className="absolute top-[-20%] right-[-10%] w-[500px] h-[500px] rounded-full bg-[#1A7AE8]/30 blur-[120px]" />
        <div className="absolute bottom-[-10%] left-[-10%] w-[500px] h-[500px] rounded-full bg-[#00C2FF]/20 blur-[100px]" />

        <div className="relative max-w-2xl mx-auto">
          <Reveal className="text-center mb-10">
            <h2 className="text-3xl md:text-5xl font-heading font-extrabold text-white mb-3">
              Join the <span className="bg-gradient-to-r from-[#1A7AE8] to-[#00C2FF] bg-clip-text text-transparent">Waitlist</span>
            </h2>
            <p className="text-gray-300 text-lg">Be the first to know when registration opens.</p>
          </Reveal>

          <Reveal>
            <div className="rounded-3xl bg-white/5 backdrop-blur-md border border-white/10 p-8 md:p-10 mb-10">
              {submitted ? (
                <div className="flex flex-col items-center gap-3 py-4 animate-in fade-in-0 duration-500">
                  <div className="h-14 w-14 rounded-full bg-[#00C2FF]/20 flex items-center justify-center">
                    <Check className="h-7 w-7 text-[#00C2FF]" />
                  </div>
                  <p className="text-gray-200 text-center">
                    🎉 You're on the list! We'll notify you when registration opens.
                  </p>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-2">
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="Enter your email"
                    className="flex-1 rounded-full bg-white/10 border border-white/20 px-5 py-3.5 text-white placeholder:text-gray-400 text-sm outline-none focus:border-[#00C2FF]/60 focus:ring-1 focus:ring-[#00C2FF]/30 transition-all"
                  />
                  <button
                    type="submit"
                    disabled={loading}
                    className="rounded-full bg-gradient-to-r from-[#1A7AE8] to-[#00C2FF] text-white font-semibold px-7 py-3.5 text-sm whitespace-nowrap hover:opacity-90 transition-opacity disabled:opacity-50 flex items-center justify-center gap-1.5"
                  >
                    {loading ? 'Joining...' : <><span>Join Waitlist</span> <ArrowRight className="h-4 w-4" /></>}
                  </button>
                </form>
              )}
              <p className="mt-5 text-[#00C2FF] text-sm font-medium text-center">
                Limited to 50 seats per cohort
              </p>
            </div>
          </Reveal>
        </div>
      </section>

      {/* ======================== FAQ ======================== */}
      <section className="py-20 md:py-28 px-4 bg-white">
        <div className="max-w-3xl mx-auto">
          <Reveal className="text-center mb-12">
            <h2 className="text-3xl md:text-5xl font-heading font-extrabold text-[#0A2E6B] mb-3">
              Frequently Asked Questions
            </h2>
          </Reveal>
          <Reveal>
            <Accordion type="single" collapsible className="space-y-3">
              {FAQS.map((f, i) => (
                <AccordionItem
                  key={i}
                  value={`faq-${i}`}
                  className="border border-gray-200 rounded-xl bg-white px-5 hover:border-[#1A7AE8]/30 transition-colors"
                >
                  <AccordionTrigger className="font-heading font-semibold text-[#0A2E6B] text-left hover:no-underline py-5">
                    {f.q}
                  </AccordionTrigger>
                  <AccordionContent className="text-gray-600 leading-relaxed pb-5">
                    {f.a}
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </Reveal>
        </div>
      </section>

      {/* ======================== STICKY CTA ======================== */}
      {showStickyCta && !stickyDismissed && (
        <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-40 animate-in slide-in-from-bottom-5 duration-300 px-4 w-full max-w-md">
          <div className="rounded-full bg-[#0A2E6B] border border-white/20 shadow-2xl backdrop-blur-md flex items-center gap-2 pl-5 pr-2 py-2">
            <span className="text-white text-sm font-medium hidden sm:inline">Ready to upskill?</span>
            <button
              onClick={scrollToWaitlist}
              className="flex-1 sm:flex-none rounded-full bg-gradient-to-r from-[#1A7AE8] to-[#00C2FF] text-white font-semibold px-5 py-2.5 text-sm whitespace-nowrap hover:opacity-90 transition-opacity flex items-center justify-center gap-1.5"
            >
              Join Waitlist <ArrowRight className="h-3.5 w-3.5" />
            </button>
            <button
              onClick={() => setStickyDismissed(true)}
              className="h-8 w-8 rounded-full text-white/70 hover:text-white hover:bg-white/10 flex items-center justify-center transition-colors"
              aria-label="Dismiss"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      {/* ======================== VIDEO MODAL ======================== */}
      {showVideoModal && (
        <div
          onClick={() => setShowVideoModal(false)}
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in-0 duration-200"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="relative w-[80vw] max-w-[900px] aspect-video bg-black rounded-2xl border border-white/10 overflow-hidden shadow-2xl"
          >
            <button
              onClick={() => setShowVideoModal(false)}
              aria-label="Close video"
              className="absolute -top-3 -right-3 sm:top-3 sm:right-3 h-9 w-9 rounded-full bg-white text-black hover:bg-gray-200 flex items-center justify-center transition-colors z-10 shadow-lg"
            >
              <X className="h-5 w-5" />
            </button>
            <iframe
              width="100%"
              height="100%"
              src="https://www.youtube.com/embed/Bt4ABQbUsZA?autoplay=1"
              title="AI PM Cohort Demo"
              frameBorder="0"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
            />
          </div>
        </div>
      )}
    </div>
  );
}
