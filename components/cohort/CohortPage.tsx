'use client';

/**
 * components/cohort/CohortPage.tsx — Client Component ✅
 *
 * Next.js conversion of the AI Product Builder Cohort page:
 * - 'use client' added (useState in WeekCard + FAQItem)
 * - import Image from 'next/image' replaces all <img> tags
 * - Hero <img> → <Image fill> inside a relative wrapper
 * - Review <img> → <Image width/height> with style={{ width:'100%', height:'auto' }}
 * - CSSProperties imported from 'react' (replaces React.CSSProperties)
 * - Export renamed: Cohort → CohortPage
 */

import { useState } from 'react';
import type { CSSProperties } from 'react';
import Image from 'next/image';
import { useCohortSettings } from '@/hooks/useCohortSettings';
import {
  ArrowRight, Check, X, Calendar, Clock, Video, Monitor, Mic, Trophy,
  Briefcase, TrendingUp, Code2, GraduationCap, Route, Puzzle, ChevronDown,
  MessageCircle, Users, BookOpen, Award, ExternalLink, ChevronRight,
} from 'lucide-react';

const APPLY_URL = 'https://share-na2.hsforms.com/1vL9J0C6rR9yhuOz54UhLog41clik';
const WA_URL = 'https://api.whatsapp.com/send/?phone=918017145177&text=Hi+Anand%2C+I%27m+interested+in+the+AI+Product+Builder+Cohort&type=phone_number&app_absent=0';

const C = {
  navy: '#0a1628',
  navy2: '#0d2847',
  cyan: '#00b4d8',
  cyan2: '#0ea5e9',
  light: '#f8fafc',
  text: '#0f172a',
  body: '#475569',
  muted: '#94a3b8',
  border: '#e2e8f0',
  wa: '#25d366',
  cyanLight: '#e0f7fa',
  cyanDark: '#006978',
};

// Use the project's global fonts (font-heading / font-body from tailwind.config.ts).
// These empty style objects keep all existing `...heading` / `...body` spreads working
// without overriding the inherited font-family.
const heading: CSSProperties = {};
const body: CSSProperties = {};

const PAGE_WRAP = 'max-w-[1200px] mx-auto px-5 sm:px-8 md:px-10 lg:px-12';

function CTAPrimary({ children, href, light = false }: { children: React.ReactNode; href: string; light?: boolean }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex items-center gap-2 px-8 py-3.5 rounded-full font-semibold transition hover:scale-[1.02] hover:shadow-lg"
      style={{
        ...heading,
        background: light ? '#fff' : C.cyan,
        color: light ? C.cyan : '#fff',
        borderRadius: 100,
      }}
    >
      <ArrowRight className="w-4 h-4" /> {children}
    </a>
  );
}

function CTASecondary({ children, href }: { children: React.ReactNode; href: string }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex items-center gap-2 px-8 py-3.5 rounded-full font-semibold transition hover:bg-white/10"
      style={{ ...heading, border: '1px solid rgba(255,255,255,0.3)', color: '#fff', borderRadius: 100 }}
    >
      <MessageCircle className="w-4 h-4" /> {children}
    </a>
  );
}

function CTAWhatsApp({ children = 'Ask on WhatsApp', href = WA_URL }: { children?: React.ReactNode; href?: string }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex items-center justify-center gap-2 px-8 py-3.5 rounded-full font-semibold transition hover:opacity-90"
      style={{ ...heading, background: C.wa, color: '#fff', borderRadius: 100 }}
    >
      <MessageCircle className="w-4 h-4" /> {children}
    </a>
  );
}

function Eyebrow({ children, dark = false }: { children: React.ReactNode; dark?: boolean }) {
  return (
    <div
      className="text-xs tracking-[0.2em] font-semibold mb-4"
      style={{ ...heading, color: dark ? 'rgba(255,255,255,0.5)' : C.cyan }}
    >
      {children}
    </div>
  );
}

const PHASES = [
  {
    label: 'PHASE 1 · WEEKS 1–3',
    name: 'AI Foundations',
    weeks: [
      {
        n: 'WEEK 1', title: 'AI Fundamentals & Algorithms', sub: 'Lock your capstone problem statement',
        goal: "Build AI literacy from first principles. Understand what makes a product 'AI-powered' and lock in your capstone problem statement.",
        sessions: [
          ['Sat AM — AI Fundamentals', 'Supervised vs Unsupervised Learning, AI Flywheel, AI product taxonomy'],
          ['Sat PM — Algorithms & Use Cases', 'Logistic Regression, Clustering, Decision Trees, SVM, Random Forest, XGBoost'],
          ['Sun AM — Interview Prep 1', 'CIRCLES and STAR frameworks, clarifying questions'],
          ['Sun PM — Office Hours', 'Q&A + AI Opportunity Canvas review'],
        ],
        outcome: 'AI Opportunity Canvas + clarifying question bank (10 Qs) delivered.',
      },
      {
        n: 'WEEK 2', title: 'Generative AI & ML Systems', sub: 'LLMs, transformers, production pipelines',
        goal: 'Build a real mental model of how LLMs and ML production systems actually work.',
        sessions: [
          ['Sat AM — Generative AI Deep Dive', 'Deep Learning, transformers, LLMs, Advanced Prompting'],
          ['Sat PM — ML Systems & Pipelines', 'Training vs inference, feature stores, monitoring'],
          ['Sun AM — Interview Prep 2', 'AI Product Sense questions'],
          ['Sun PM — Office Hours', 'GenAI Q&A + pipeline review'],
        ],
        outcome: 'GenAI feature defined. ML pipeline map + 2 product sense answers.',
      },
      {
        n: 'WEEK 3', title: 'GenAI Tools, AI PM Role & RAG', sub: 'Ship your first working RAG prototype',
        goal: 'Understand the modern AI stack and ship your first working RAG prototype.',
        sessions: [
          ['Sat AM — GenAI Tools & AI PM Role', 'Tool landscape, AI product stack, What AI PMs do in 2026'],
          ['Sat PM — RAG Deep Dive', 'RAG architecture, Vector DBs, embeddings, chunking, RAG vs fine-tuning'],
          ['Sun AM — Interview Prep 3', 'Metrics RCA & Guesstimate'],
          ['Sun PM — Demo Hours', 'Build RAG Prototype'],
        ],
        outcome: 'AI stack diagram + RAG prototype + 3 RCA / guesstimate answers.',
      },
    ],
  },
  {
    label: 'PHASE 2 · WEEKS 4–7',
    name: 'Building AI Products',
    weeks: [
      {
        n: 'WEEK 4', title: 'AI Agents: Concept + Hands-on Build', sub: 'Design and prototype your AI agent same day',
        goal: 'Design and prototype an AI agent — autonomy levels, tool use, memory, HITL.',
        sessions: [
          ['Sat AM — AI Agents Deep Dive', 'Autonomy L1–L4, ReAct, multi-agent systems, MCP, A2A'],
          ['Sat PM — Demo: Agent Hands-on Build', 'Using Claude, LangChain, or no-code tools'],
          ['Sun AM — Interview Prep 4', 'Metrics NSM & Execution'],
          ['Sun PM — Demo Hours', 'Agent Prototyping Continued'],
        ],
        outcome: 'Agent architecture + prototype + NSM + execution answers.',
      },
      {
        n: 'WEEK 5', title: 'Advanced Evals: Spec → Test → Launch Threshold', sub: "Write production evals, define 'good enough to ship'",
        goal: "Write production evals, build a golden test set, decide 'good enough to ship.'",
        sessions: [
          ['Sat AM — Advanced Evals', 'BLEU, ROUGE, RAGAS, LLM-as-judge, eval pipeline tools'],
          ['Sat PM — Demo: Evals Implementation', '10 golden test cases, launch threshold'],
          ['Sun AM — Interview Prep 5', 'AI Strategy, Growth & Pricing'],
          ['Sun PM — Office Hours', 'Eval Spec Review'],
        ],
        outcome: 'Eval framework + golden test set (10 cases) + launch threshold + growth/pricing answers.',
      },
      {
        n: 'WEEK 6', title: 'Spec-Driven Dev & Live Build', sub: 'Spec → prototype → test → ship in one weekend',
        goal: 'Use Claude/AI tools to go from spec to working prototype in one weekend.',
        sessions: [
          ['Sat AM — Spec-Driven Dev & Claude Skills', 'Spec anatomy, vibe coding, PRD-to-shipped'],
          ['Sat PM — Demo: Spec → Prototype Live Build', ''],
          ['Sun AM — Interview Prep 6', 'GTM & Market Entry'],
          ['Sun PM — Demo Hours', 'Lovable Prototyping'],
        ],
        outcome: 'Full spec + working prototype + tested against evals + GTM answers.',
      },
      {
        n: 'WEEK 7', title: 'AI Product Design & UX Polish', sub: 'Trust signals, HITL, AI-native UX patterns',
        goal: 'Design for non-determinism. Polish prototype with trust signals, HITL, AI-native UX.',
        sessions: [
          ['Sat AM — AI Product Design & UX', 'Non-determinism, HITL patterns, explainability UX'],
          ['Sat PM — Demo: UX Audit & Prototype Polish', ''],
          ['Sun AM — Interview Prep 8', 'Behavioural Interview'],
          ['Sun PM — Demo Hours', 'N8N Agent Building'],
        ],
        outcome: 'UX audit complete + prototype polished + mini case study finalised.',
      },
    ],
  },
  {
    label: 'PHASE 3 · WEEKS 8–10',
    name: 'Strategy & Depth',
    weeks: [
      {
        n: 'WEEK 8', title: 'AI Risks, Biases & Product Metrics', sub: 'Responsible AI + the full metrics stack',
        goal: 'Add the responsible-AI and analytics layer your capstone needs.',
        sessions: [
          ['Sat AM — AI Risks & Biases', 'Bias types, hallucinations, EU AI Act, India DPDP Act'],
          ['Sat PM — Product Metrics & AI Analytics', 'AI operational metrics, A/B testing AI, SQL + LLM'],
          ['Sun AM — Interview Prep 8', 'AI General Questions'],
          ['Sun PM — Office Hours', 'Risk + Metrics Q&A'],
        ],
        outcome: 'Risk audit + responsible AI section + full metrics stack + STAR bank (5 stories).',
      },
      {
        n: 'WEEK 9', title: 'GTM, Model Selection & Mock Interview Round 1', sub: 'Moats, model decisions, go-to-market + first full mock loop',
        goal: 'Lock GTM strategy, model selection, complete first 3-round mock interview loop.',
        sessions: [
          ['Sat AM — GTM & Market Entry', 'PLG vs sales-led, competitive moats, launch playbook'],
          ['Sat PM — Model Selection, Latency & Tradeoffs', 'Model comparison, cost-quality, build vs buy'],
          ['Sun AM — Interview Prep 7', 'Evals, Model Selection & Tradeoffs'],
          ['Sun PM — Mock Interview Round 1', 'Full 3-round loop (45–60 min), mentor scoring'],
        ],
        outcome: 'GTM one-pager + model selection matrix + Mock Round 1 scores.',
      },
      {
        n: 'WEEK 10', title: 'Enterprise Case Studies & Mock Interview Round 2', sub: 'Pattern recognition + final interview mastery',
        goal: 'Analyse enterprise AI launches, complete both mock rounds, lock 15-answer story bank.',
        sessions: [
          ['Sat AM — Enterprise AI Case Studies (B2C)', ''],
          ['Sat PM — Enterprise AI Case Studies (B2B)', ''],
          ['Sun AM — Mock Interview Round 2', 'Full 3-round loop, stricter scoring'],
          ['Sun PM — Office Hours', 'Interview Debrief + Story Bank'],
        ],
        outcome: 'Case study teardown + 15-answer story bank. Both mock rounds complete.',
      },
    ],
  },
  {
    label: 'PHASE 4 · WEEKS 11–12',
    name: 'Demo Prep & Demo Day',
    weeks: [
      {
        n: 'WEEK 11', title: 'Capstone Refinement & Mock Demo', sub: 'Turn your capstone into a tight 8-minute story',
        goal: 'Turn capstone into tight 8-minute story. Rehearse until Demo-Day ready.',
        sessions: [
          ['Sat AM — Capstone Refinement', 'Structure, peer review with scoring rubric'],
          ['Sat PM — Mock Demo Presentations', '5 min each + feedback'],
          ['Sun AM — Final Polish + Rehearsal', ''],
        ],
        outcome: 'Full deck (10–12 slides) + demo video + mock demo delivered.',
      },
      {
        n: 'WEEK 12', title: '🎤 Demo Day', sub: 'Live presentation · Portfolio published · Certificate awarded',
        goal: '',
        highlight: true,
        sessions: [
          ['Demo Day Session 1', '8-min capstone + 5-min Q&A + scoring'],
          ['Demo Day Session 2', 'Remaining presentations + Best Project awards + speed interviews'],
          ['Wrap-up', 'Portfolio published, LinkedIn post, certificate, alumni community, accountability partner'],
        ],
        outcome: '✅ COURSE COMPLETE. Portfolio-ready capstone delivered. Interview answers polished. AI PM job-ready.',
      },
    ],
  },
];

const MILESTONES = [
  ['01', 'Problem Definition', 'AI Opportunity Canvas — problem, user segment, solution gaps, AI angle', 'Notion doc / 1-pager'],
  ['02', 'Technical Foundation', 'ML Pipeline Map — algorithm selected, data pipeline, model card', 'Diagram + rationale'],
  ['03', 'RAG Prototype', 'RAG design + working prototype: architecture, knowledge base, retrieval strategy', 'Architecture doc + prototype'],
  ['04', 'Agent Prototype', 'Agent design + working prototype: autonomy level, tools, memory, HITL, tested on 3 scenarios', 'Architecture doc + prototype'],
  ['05', 'Eval Framework', 'Eval spec + 10-case golden set + launch threshold + evals run on prototype', 'Eval spec + test results'],
  ['06', 'Full Spec + Prototype', 'Complete spec + polished prototype, mini case study started', 'Spec doc + prototype link'],
  ['07', 'UX Audit + Polish', '8-principle UX audit, HITL pattern, AI UX copy, prototype finalised, case study complete', 'UX audit + prototype'],
  ['08', 'Quality & Metrics', 'Risk audit + responsible AI section + NSM/supporting/guardrail metrics + A/B test plan', 'Risk doc + metrics'],
  ['09', 'Strategy + Model Decision', 'GTM one-pager + model comparison matrix + cost + latency strategy', 'Strategy doc + model doc'],
  ['10', 'Interview Ready', '15-answer story bank, 2 mock rounds scored, enterprise case study teardown', 'Interview doc + case analysis'],
  ['11', 'Presentation Ready', 'Full capstone deck (10–12 slides) + demo video + mock demo + 2 interview answers', 'Deck + demo video'],
  ['12', '🎤 Demo Day', 'Live 8-min presentation + portfolio published + LinkedIn post + certificate awarded', 'Live demo + portfolio'],
];

const INCLUDED = [
  '45 live sessions across 12 weeks',
  '10 hands-on Demo / Demo Hours sessions',
  '8 structured Interview Prep modules',
  '2 full Mock Interview rounds (mentor scored)',
  'Office Hours throughout for Q&A + STAR practice',
  'Portfolio-ready AI product capstone (all 12 weeks)',
  'Working RAG prototype + AI Agent prototype',
  'Eval framework with golden test set + launch threshold',
  'Spec-driven dev workflow using Claude / AI tools',
  '8-principle UX audit + AI UX copy',
  'Bias audit + Responsible AI section + 3 launch guardrails',
  'Full metrics stack: NSM + supporting + guardrails + A/B',
  'GTM one-pager + model selection matrix + cost strategy',
  '15-answer STAR story bank across 2 mock rounds',
  'Final capstone deck (10–12 slides) + recorded demo video',
  '🎤 Live Demo Day + Best Project awards + speed interviews',
  'Certificate of completion',
  'Async course access + alumni community + job board',
  'All session recordings + bonus content vault',
  'Accountability partner for post-cohort job search',
];

const OUTCOMES = [
  'A portfolio-ready AI capstone: problem → spec → prototype → evals → GTM → Demo Day',
  'AI fundamentals mastered — supervised/unsupervised learning, deep learning, LLMs, CoT + ToT prompting',
  'Working RAG system and AI agent prototype with documented architecture and HITL checkpoints',
  'Production-grade evals — golden test sets, RAGAS, LLM-as-judge, launch threshold defined',
  'AI PM strategy depth — model selection, latency, cost-quality tradeoffs, GTM, competitive moats',
  '8 structured Interview Prep modules + 2 full mock rounds with mentor scoring and written feedback',
  '15-answer STAR story bank, polished interview prep doc, capstone framed as interview answers',
  'Live Demo Day — panel Q&A, certificate awarded, portfolio published, LinkedIn launch post',
];

const FAQS: [string, string][] = [
  ['Do I need to be a developer or engineer to join?',
    'No. The cohort is designed for PMs, engineers, designers, and data scientists alike. All prototyping is done using no-code and AI tools (Claude, LangChain, no-code RAG builders). You need to be able to think through product decisions and use AI tools to build — not write production code.'],
  ['How much time per week do I need to commit?',
    '8 hours per week for Weeks 1–10 (4 live sessions of 2 hrs each on Saturday + Sunday). 6 hours per week for Weeks 11–12 (Demo Prep and Demo Day). All sessions run on Saturday and Sunday mornings and afternoons IST — designed not to conflict with weekday work.'],
  ['What if I miss a session?',
    'All sessions are recorded and shared. Office Hours run throughout the cohort so you can catch up. We strongly recommend attending live — the real value is in Q&A, peer reviews of your capstone work, and real-time mentor feedback on your specific prototype.'],
  ['What does the capstone look like at the end?',
    'A complete portfolio-ready AI product: a written spec, working prototype (RAG or agent), eval framework with a golden test set and launch threshold, GTM one-pager, risk + metrics doc, a polished 10–12 slide deck, and a 3-min recorded demo video. You present it live on Demo Day in front of a panel.'],
  ['Is this heavy on theory or hands-on building?',
    'Heavily hands-on. Every concept week is paired with a Demo/Demo Hours session where you build something the same week. By the end you will have built a working RAG prototype, a working AI agent, run your own evals, and shipped a full spec-driven prototype — all before Demo Day.'],
  ['How does the application process work?',
    "Fill in the application form. The cohort is capped — applications are reviewed on a rolling basis. If you're a fit, you'll receive the payment link. Seats are allocated in order of approved application + payment."],
];

const WHO = [
  [Briefcase, 'PMs transitioning into AI PM roles — building hands-on credibility with working prototypes, not just theory'],
  [TrendingUp, 'Mid-to-senior PMs (3–10 years) who want to lead AI initiatives or move to AI-first companies'],
  [Code2, 'Engineers, data scientists, and designers pivoting into AI Product Management roles'],
  [GraduationCap, 'PMs preparing for AI PM interviews — product sense, metrics, strategy, behavioural, and technical AI questions'],
  [Route, 'Builders who want a structured path through AI fundamentals, RAG, AI agents, evals, and GTM — with a capstone'],
  [Puzzle, 'Anyone who has watched scattered AI tutorials and wants a single, sequenced, mentor-led program'],
] as const;

const VIDEOS: [string, string, string][] = [
  ['https://res.cloudinary.com/topmate/video/upload/v1778235779/Harshit_Testimonial_x1dosu.mp4', "Harshit's Story", 'PM at Indeed'],
  ['https://res.cloudinary.com/topmate/video/upload/v1778235794/WhatsApp_Video_2026-05-05_at_7.08.45_AM_iblof5.mp4', "Aishwarya's Story", 'PM at Microsoft'],
  ['https://res.cloudinary.com/topmate/video/upload/v1778235800/WIN_20260427_21_20_21_Pro_dz8vjv.mp4', "Shikhar's Story", 'PM at Shipturtle'],
];

const REVIEW_COLS: string[][] = [
  [
    'https://res.cloudinary.com/topmate/image/upload/v1778235775/Screenshot_2026-04-30_at_11.49.13_PM_tzle9y.png',
    'https://res.cloudinary.com/topmate/image/upload/v1778235776/Screenshot_2026-04-30_at_11.53.25_PM_xc7eih.png',
    'https://res.cloudinary.com/topmate/image/upload/v1778235776/Screenshot_2026-04-30_at_11.19.17_PM_fgxsai.png',
    'https://res.cloudinary.com/topmate/image/upload/v1778235779/IMG_6584_gtjk82.png',
    'https://res.cloudinary.com/topmate/image/upload/v1778235780/Screenshot_2026-04-30_at_11.11.36_PM_jsjh5p.png',
    'https://res.cloudinary.com/topmate/image/upload/v1778235781/Screenshot_2026-04-30_at_11.23.35_PM_djrk8n.png',
  ],
  [
    'https://res.cloudinary.com/topmate/image/upload/v1778235775/Screenshot_2026-04-26_at_8.16.09_AM_flbn1y.png',
    'https://res.cloudinary.com/topmate/image/upload/v1778235775/IMG_6583_j62jhv.png',
    'https://res.cloudinary.com/topmate/image/upload/v1778235776/Screenshot_2026-04-30_at_11.51.19_PM_vkc6ce.png',
    'https://res.cloudinary.com/topmate/image/upload/v1778235777/IMG_6560_mqbkn2.jpg',
    'https://res.cloudinary.com/topmate/image/upload/v1778235780/Screenshot_2026-04-30_at_11.13.30_PM_dfcc0t.png',
    'https://res.cloudinary.com/topmate/image/upload/v1778235781/Screenshot_2026-04-30_at_11.18.27_PM_fwpnvh.png',
    'https://res.cloudinary.com/topmate/image/upload/v1778235781/Screenshot_2026-04-30_at_11.25.03_PM_in8ujr.png',
  ],
  [
    'https://res.cloudinary.com/topmate/image/upload/v1778235775/Screenshot_2026-04-30_at_11.36.18_PM_zq2fqx.png',
    'https://res.cloudinary.com/topmate/image/upload/v1778235776/Screenshot_2026-04-30_at_11.17.00_PM_yvcsdz.png',
    'https://res.cloudinary.com/topmate/image/upload/v1778235778/IMG_6582_miriui.png',
    'https://res.cloudinary.com/topmate/image/upload/v1778235776/Screenshot_2026-04-30_at_11.22.22_PM_ctgpzf.png',
    'https://res.cloudinary.com/topmate/image/upload/v1778235780/Screenshot_2026-04-30_at_11.14.46_PM_ktbilv.png',
    'https://res.cloudinary.com/topmate/image/upload/v1778235781/Screenshot_2026-04-30_at_11.21.24_PM_ntw6m9.png',
  ],
];

const COMPARISON: Array<[string, string, string]> = [
  ['Format', '45 recorded videos, ~7 hrs total', '45 live sessions, ~90 hrs total'],
  ['Pace', 'Self-paced, lifetime access', 'Structured 12-week schedule'],
  ['Projects you build', '1 prototype demo', '10+ projects across 12 weeks'],
  ['Capstone product', '✕', 'Full AI product: spec → prototype → evals + Demo Day'],
  ['Hands-on Build Hours', '✕', '10 dedicated sessions — RAG, Agents, Evals, UX Audit, Prototyping'],
  ['Mentor feedback', '✕', 'Weekly office hours + scored reviews'],
  ['Interview prep', '20 questions + answers (recorded)', '10 dedicated sessions (20 hrs) + frameworks to tackle every AI PM question type'],
  ['Mock interviews', '✕', '2 full 3-round loops, mentor scored + written feedback'],
  ['Demo Day', '✕', 'Live 8-min presentation + panel Q&A + Best Project awards'],
  ['Strategy & depth classes', '✕', 'GTM, AI Pricing, Model Selection, Latency, AI Safety, AI Analytics, AI ROI'],
  ['SDD + AI Agents + UX', '✕', 'Spec-Driven Development, Agents deep dive (MCP, A2A), UI/UX for AI'],
  ['AI Case Studies (B2C + B2B)', 'PDF book only', '4 hrs of live case study discussion with frameworks'],
  ['Tools: N8N, Claude Skills, Lovable', 'Lovable demo only', 'Hands-on with all three + deployment'],
  ['Peer community', '✕', 'Alumni network + job board + accountability partner'],
  ['Best for', 'Learning AI PM concepts at your own speed', 'Getting job-ready with proof of work + portfolio'],
];

function WeekCard({ w }: { w: typeof PHASES[0]['weeks'][0] & { highlight?: boolean } }) {
  const [open, setOpen] = useState(false);
  const highlight = (w as any).highlight;
  return (
    <div
      className="rounded-2xl overflow-hidden transition"
      style={{ background: highlight ? C.cyanLight : '#fff', border: `1px solid ${highlight ? C.cyan : C.border}` }}
    >
      <button onClick={() => setOpen(!open)} className="w-full flex items-center gap-4 p-5 text-left">
        <span
          className="px-3 py-1 rounded-full text-xs font-bold shrink-0"
          style={{ ...heading, background: highlight ? C.cyan : C.cyanLight, color: highlight ? '#fff' : C.cyanDark, letterSpacing: '0.08em' }}
        >
          {w.n}
        </span>
        <div className="flex-1 min-w-0">
          <div className="font-bold text-base md:text-lg" style={{ ...heading, color: C.text }}>{w.title}</div>
          <div className="text-sm italic" style={{ ...body, color: C.body }}>{w.sub}</div>
        </div>
        <ChevronDown className={`w-5 h-5 shrink-0 transition-transform ${open ? 'rotate-180' : ''}`} style={{ color: C.body }} />
      </button>
      {open && (
        <div className="px-5 pb-5 space-y-4">
          {w.goal && (
            <div className="p-4 rounded-xl text-sm" style={{ background: C.cyanLight, color: C.cyanDark, ...body }}>
              <span className="font-bold" style={heading}>Goal · </span>{w.goal}
            </div>
          )}
          <div className="grid md:grid-cols-2 gap-3">
            {w.sessions.map(([t, d]: [string, string], i: number) => (
              <div key={i} className="p-4 rounded-xl" style={{ border: `1px solid ${C.border}` }}>
                <div className="font-semibold text-sm mb-1" style={{ ...heading, color: C.text }}>{t}</div>
                {d && <div className="text-sm" style={{ ...body, color: C.body }}>{d}</div>}
              </div>
            ))}
          </div>
          {w.outcome && (
            <div className="p-4 rounded-xl text-sm" style={{ background: '#fef3c7', color: '#78350f', ...body }}>
              <span className="font-bold" style={heading}>Milestone · </span>{w.outcome}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function FAQItem({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="rounded-2xl overflow-hidden" style={{ border: `1px solid ${C.border}`, background: '#fff' }}>
      <button onClick={() => setOpen(!open)} className="w-full flex items-center gap-4 p-5 text-left">
        <span className="flex-1 font-semibold text-base md:text-lg" style={{ ...heading, color: C.text }}>{q}</span>
        <ChevronDown className={`w-5 h-5 shrink-0 transition-transform ${open ? 'rotate-180' : ''}`} style={{ color: C.body }} />
      </button>
      {open && <div className="px-5 pb-5 text-base leading-relaxed" style={{ ...body, color: C.body }}>{a}</div>}
    </div>
  );
}

export default function CohortPage() {
  // CTA links are admin-configurable; fall back to the hardcoded constants
  // when no config row exists (or the table hasn't been migrated yet).
  const { data: cohortSettings } = useCohortSettings();
  const applyUrl = cohortSettings?.apply_url || APPLY_URL;
  const waUrl = cohortSettings?.whatsapp_url || WA_URL;
  // Optional link to the externally hosted "current cohort progress" page.
  // Unlike the two CTAs above there is no hardcoded fallback: when the admin
  // leaves it empty, every progress placement on this page is hidden.
  const progressUrl = cohortSettings?.progress_url || '';

  const stats = [
    ['12', 'Weeks Live'], ['45', 'Live Sessions'], ['8h', 'Per Week'],
    ['10+', 'Projects Built'], ['2x', 'Mock Interviews'],
  ];

  return (
    <div style={{ ...body, color: C.text }} className={progressUrl ? 'pb-40 lg:pb-0' : 'pb-24 lg:pb-0'}>
      {/* HERO */}
      <section
        className="relative overflow-hidden"
        style={{
          background: `linear-gradient(135deg, ${C.navy} 0%, ${C.navy2} 100%)`,
          color: '#fff',
        }}
      >
        <div
          aria-hidden
          className="absolute inset-0 opacity-[0.07]"
          style={{
            backgroundImage: `linear-gradient(rgba(255,255,255,0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.5) 1px, transparent 1px)`,
            backgroundSize: '60px 60px',
          }}
        />
        <div
          aria-hidden
          className="absolute -top-40 -left-40 w-[500px] h-[500px] rounded-full blur-3xl opacity-30"
          style={{ background: C.cyan }}
        />
        <div
          aria-hidden
          className="absolute -bottom-40 -right-40 w-[600px] h-[600px] rounded-full blur-3xl opacity-20"
          style={{ background: C.cyan2 }}
        />
        <div className={`${PAGE_WRAP} py-20 md:py-28 relative grid lg:grid-cols-5 gap-12 items-center`}>
          <div className="lg:col-span-3 space-y-6">
            <span
              className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-semibold"
              style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.15)', ...heading }}
            >
              <span className="w-2 h-2 rounded-full animate-pulse" style={{ background: C.cyan }} />
              Applications Open · 12-Week Live Bootcamp
            </span>
            <h1 className="text-4xl md:text-6xl font-extrabold leading-[1.05]" style={heading}>
              Become a Job Ready
              <br />
              <span className="italic font-normal" style={{ ...body, color: C.cyan }}>AI First Product Manager</span>
              <br />
              <span className="text-2xl md:text-4xl font-semibold" style={{ color: 'rgba(255,255,255,0.6)' }}>in 12 Weeks</span>
            </h1>
            <p className="text-lg max-w-2xl" style={{ color: 'rgba(255,255,255,0.75)' }}>
              A 12-week, mentor-led live cohort for PMs, engineers &amp; builders who want to ship a portfolio-ready AI product — RAG, agents, evals, GTM, with dedicated interview prep baked in and a live Demo Day.
            </p>
            <p className="text-base max-w-2xl" style={{ color: 'rgba(255,255,255,0.5)' }}>
              Not a recorded course. You build 10+ projects, get mentor feedback every week, and present on Demo Day.
            </p>
            <div className="flex flex-wrap items-stretch gap-x-6 gap-y-4 py-2">
              {stats.map(([n, l], i) => (
                <div key={i} className="flex items-center gap-6">
                  <div>
                    <div className="text-2xl md:text-3xl font-extrabold" style={{ ...heading, color: C.cyan }}>{n}</div>
                    <div className="text-xs uppercase tracking-wider" style={{ color: 'rgba(255,255,255,0.5)' }}>{l}</div>
                  </div>
                  {i < stats.length - 1 && <div className="h-10 w-px" style={{ background: 'rgba(255,255,255,0.15)' }} />}
                </div>
              ))}
            </div>
            <div className="flex flex-wrap gap-3 pt-2">
              <CTAPrimary href={applyUrl} light>Apply Now</CTAPrimary>
              <CTASecondary href={waUrl}>Ask on WhatsApp</CTASecondary>
            </div>
            {progressUrl && (
              <a href={progressUrl} target="_blank" rel="noopener noreferrer"
                 className="inline-flex items-center gap-2.5 self-start text-[15px] font-medium transition hover:opacity-80"
                 style={{ ...body, color: 'rgba(255,255,255,0.75)' }}>
                <span className="inline-flex items-center gap-1.5 text-[11px] font-bold tracking-[0.12em]"
                      style={{ ...heading, color: C.cyan }}>
                  <span className="w-[7px] h-[7px] rounded-full animate-pulse" style={{ background: C.cyan }} />
                  LIVE NOW
                </span>
                <span className="underline underline-offset-4 decoration-white/35">See what the current cohort is building</span>
                <ExternalLink className="w-[15px] h-[15px]" />
              </a>
            )}
          </div>
          <div className="lg:col-span-2 hidden lg:block">
            <div
              className="rounded-3xl overflow-hidden backdrop-blur shadow-2xl"
              style={{
                background: 'rgba(255,255,255,0.04)',
                border: '1px solid rgba(255,255,255,0.15)',
                boxShadow: '0 0 0 1px rgba(0,180,216,0.08), 0 20px 60px -20px rgba(0,180,216,0.25)',
              }}
            >
              {/* Hero image — Next.js Image with fill */}
              <div className="relative h-[420px] w-full">
                <Image
                  src="https://res.cloudinary.com/topmate/image/upload/v1778317151/WhatsApp_Image_2026-05-09_at_2.06.10_PM_ae5sht.jpg"
                  alt="Shailesh Sharma"
                  fill
                  className="object-cover"
                  style={{ objectPosition: 'top center' }}
                  priority
                />
              </div>
              <div
                className="p-5 space-y-1"
                style={{ background: 'rgba(10,22,40,0.92)', borderTop: '1px solid rgba(255,255,255,0.08)' }}
              >
                <div className="font-bold text-xl text-white" style={heading}>Shailesh Sharma</div>
                <div className="font-semibold" style={{ color: C.cyan }}>AI Product Builder Cohort</div>
                <div className="text-sm" style={{ color: 'rgba(255,255,255,0.6)' }}>IIT Kanpur &amp; IIM Bangalore Alumni</div>
                <div className="text-sm" style={{ color: 'rgba(255,255,255,0.6)' }}>YouTube · 15K Followers</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* TRUST BAR */}
      <section style={{ background: C.light, borderTop: `1px solid ${C.border}`, borderBottom: `1px solid ${C.border}` }}>
        <div className={`${PAGE_WRAP} py-6 flex flex-wrap items-center justify-center gap-x-8 gap-y-3 text-sm`} style={{ color: C.body }}>
          {[
            [Calendar, <>Sat + Sun · 10:30 AM–12:30 PM &amp; 2:30–4:30 PM IST</>],
            [Video, <><b>45 live sessions</b></>],
            [Mic, <>Live <b>Demo Day</b> + certificate</>],
            [BookOpen, <><b>10 Interview Prep</b> + 10 Demo Sessions</>],
            [Trophy, <>Portfolio-ready <b>AI product</b> capstone</>],
            [Users, <>Alumni community + job board</>],
          ].map(([Icon, label]: any, i) => (
            <div key={i} className="flex items-center gap-2">
              <Icon className="w-4 h-4" style={{ color: C.cyan }} />
              <span>{label}</span>
            </div>
          ))}
        </div>
      </section>

      {/* LIVE COHORT PROGRESS STRIP */}
      {progressUrl && (
        <section style={{ background: `linear-gradient(135deg, ${C.navy}, ${C.navy2})`, borderBottom: `1px solid ${C.border}` }}>
          <div className={`${PAGE_WRAP} py-[18px] flex flex-wrap items-center gap-5`}>
            <span className="inline-flex items-center gap-2 px-3 py-[5px] rounded-full text-[11px] font-bold tracking-[0.14em]"
                  style={{ ...heading, background: 'rgba(0,180,216,0.15)', border: '1px solid rgba(0,180,216,0.4)', color: '#7dd8f0' }}>
              <span className="w-[7px] h-[7px] rounded-full animate-pulse" style={{ background: C.cyan }} />LIVE
            </span>
            <span className="text-[17px] font-semibold text-white" style={heading}>A cohort is running right now</span>
            <span className="text-[15px]" style={{ color: 'rgba(255,255,255,0.6)' }}>Weekly updates from inside the batch</span>
            <a href={progressUrl} target="_blank" rel="noopener noreferrer"
               className="md:ml-auto inline-flex items-center gap-2 px-[22px] py-[11px] rounded-full text-sm font-semibold text-white transition hover:bg-white/10"
               style={{ ...heading, border: '1px solid rgba(255,255,255,0.35)', borderRadius: 100 }}>
              Follow the progress <ArrowRight className="w-[15px] h-[15px]" />
            </a>
          </div>
        </section>
      )}

      {/* MAIN + SIDEBAR */}
      <div className={`${PAGE_WRAP} py-16 grid lg:grid-cols-[1fr_340px] gap-10`}>
        <main className="space-y-24 min-w-0">
          {/* WHO */}
          <section id="who">
            <Eyebrow>— WHO THIS IS FOR</Eyebrow>
            <h2 className="text-3xl md:text-5xl font-extrabold mb-3" style={heading}>Built for builders who want to ship real AI</h2>
            <p className="text-lg mb-10" style={{ color: C.body }}>
              Not for passive learners. This is a <em>doing</em> cohort — you ship something real by Week 12.
            </p>
            <div className="grid md:grid-cols-2 gap-5">
              {WHO.map(([Icon, text], i) => (
                <div key={i} className="p-6 rounded-2xl flex gap-4" style={{ background: '#fff', border: `1px solid ${C.border}` }}>
                  <div className="w-12 h-12 rounded-full flex items-center justify-center shrink-0" style={{ background: C.cyanLight }}>
                    <Icon className="w-5 h-5" style={{ color: C.cyan }} />
                  </div>
                  <p className="text-base leading-relaxed" style={{ color: C.body }}>{text}</p>
                </div>
              ))}
            </div>
          </section>

          {/* REVIEWS */}
          <section id="reviews">
            <Eyebrow>— REVIEWS &amp; TESTIMONIALS</Eyebrow>
            <h2 className="text-3xl md:text-5xl font-extrabold mb-3" style={heading}>
              What our <span className="italic font-normal" style={{ ...body, color: C.cyan }}>students</span> are saying
            </h2>
            <p className="text-lg mb-8" style={{ color: C.body }}>
              Real feedback from students who&apos;ve learned with Shailesh across courses, YouTube, mentorship, and 1:1 coaching.
            </p>
            <div className="rounded-3xl p-6 md:p-12 lg:p-14 space-y-10" style={{ background: `linear-gradient(135deg, ${C.navy}, ${C.navy2})`, color: '#fff' }}>
              <div>
                <div className="text-xs tracking-[0.2em] font-semibold mb-4" style={{ ...heading, color: C.cyan }}>🎬 VIDEO TESTIMONIALS</div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 md:gap-4">
                  {VIDEOS.map(([src, name, role], i) => (
                    <div key={i} className="rounded-2xl overflow-hidden" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)' }}>
                      <video src={src} controls preload="metadata" className="w-full h-[320px] object-cover bg-black" />
                      <div className="p-3">
                        <div className="font-semibold text-sm" style={heading}>{name}</div>
                        <div className="text-xs" style={{ color: 'rgba(255,255,255,0.6)' }}>{role}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              <div>
                <div className="text-xs tracking-[0.2em] font-semibold mb-4" style={{ ...heading, color: C.cyan }}>📸 FEEDBACK &amp; REVIEWS</div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {REVIEW_COLS.map((col, i) => (
                    <div key={i} className="space-y-4">
                      {col.map((url, j) => (
                        <div key={j} className="relative w-full rounded-xl overflow-hidden" style={{ border: '1px solid rgba(255,255,255,0.1)' }}>
                          <Image
                            src={url}
                            alt=""
                            width={800}
                            height={600}
                            style={{ width: '100%', height: 'auto' }}
                            className="rounded-xl"
                          />
                        </div>
                      ))}
                    </div>
                  ))}
                </div>
              </div>
              <div className="flex flex-wrap justify-around items-center gap-4 pt-6" style={{ borderTop: '1px solid rgba(255,255,255,0.1)' }}>
                {[['⭐ 5/5', 'AVG RATING'], ['12 wks', 'IDEA TO PORTFOLIO'], ['100%', 'SHIPPED A CAPSTONE']].map(([n, l], i, arr) => (
                  <div key={i} className="flex items-center gap-6">
                    <div className="text-center">
                      <div className="text-2xl font-extrabold" style={{ ...heading, color: C.cyan }}>{n}</div>
                      <div className="text-xs tracking-wider mt-1" style={{ color: 'rgba(255,255,255,0.5)' }}>{l}</div>
                    </div>
                    {i < arr.length - 1 && <div className="hidden md:block h-10 w-px" style={{ background: 'rgba(255,255,255,0.15)' }} />}
                  </div>
                ))}
              </div>
            </div>
          </section>

          {/* COMPARISON */}
          <section>
            <Eyebrow>— ALREADY SEEN THE COURSE?</Eyebrow>
            <h2 className="text-3xl md:text-5xl font-extrabold mb-3" style={heading}>
              The course teaches you AI PM.<br />
              The cohort <span className="italic font-normal" style={{ ...body, color: C.cyan }}>makes</span> you one.
            </h2>
            <p className="text-lg mb-8" style={{ color: C.body }}>
              The self-paced course gives you knowledge. The cohort gives you more knowledge, proof of work, interview readiness, and mentor access — the things that actually get you hired.
            </p>
            <div className="rounded-2xl overflow-hidden overflow-x-auto" style={{ border: `1px solid ${C.border}` }}>
              <table className="w-full text-sm min-w-[700px]">
                <thead>
                  <tr>
                    <th className="text-left p-4 bg-white" />
                    <th className="text-left p-4 font-bold" style={{ ...heading, background: C.light, color: C.body }}>Self-Paced Course</th>
                    <th className="text-left p-4 font-bold" style={{ ...heading, background: C.cyan, color: '#fff' }}>
                      12-Week Live Cohort<br /><span className="text-xs font-normal opacity-90">Starts Soon</span>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {COMPARISON.map(([label, a, b], i) => (
                    <tr key={i} style={{ borderTop: `1px solid ${C.border}` }}>
                      <td className="p-4 font-semibold" style={{ ...heading, color: C.text }}>{label}</td>
                      <td className="p-4" style={{ color: C.body }}>{a === '✕' ? <X className="w-4 h-4 inline" style={{ color: '#cbd5e1' }} /> : a}</td>
                      <td className="p-4" style={{ background: 'rgba(0,180,216,0.06)', color: C.text }}>
                        <span className="inline-flex items-start gap-2"><Check className="w-4 h-4 mt-0.5 shrink-0" style={{ color: C.cyan }} />{b}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="mt-8 p-6 md:p-8 rounded-2xl" style={{ background: 'linear-gradient(135deg, #e0f7fa, #e0f2fe)', border: `1px solid ${C.cyan}40` }}>
              <p className="text-base md:text-lg mb-6" style={{ color: C.text }}>
                The course gives you <b>knowledge.</b> The cohort gives you knowledge + <b>proof of work</b> + <b>interview readiness</b> + <b>mentor access.</b>
              </p>
              <div className="grid grid-cols-2 md:grid-cols-5 gap-4 text-center">
                {[['90+', 'Hours Live'], ['10+', 'Projects Built'], ['20 Hrs', 'Interview Prep'], ['2', 'Mock Interview Rounds'], ['1', 'Portfolio-Ready Capstone']].map(([n, l], i) => (
                  <div key={i}>
                    <div className="text-2xl md:text-3xl font-extrabold" style={{ ...heading, color: C.cyanDark }}>{n}</div>
                    <div className="text-xs md:text-sm mt-1" style={{ color: C.body }}>{l}</div>
                  </div>
                ))}
              </div>
            </div>
          </section>

          {/* CURRICULUM */}
          <section id="curriculum">
            <Eyebrow>— 12-WEEK CURRICULUM</Eyebrow>
            <h2 className="text-3xl md:text-5xl font-extrabold mb-3" style={heading}>Week-by-week breakdown</h2>
            <p className="text-lg mb-10" style={{ color: C.body }}>
              Saturdays + Sundays · 4 sessions/week (10:30 AM–12:30 PM &amp; 2:30–4:30 PM IST) · 8 hrs/week · Weeks 1–10
            </p>
            <div className="space-y-10">
              {PHASES.map((p, i) => (
                <div key={i} className="space-y-4">
                  <div className="flex items-center gap-4">
                    <span className="px-3 py-1.5 rounded-full text-xs font-bold whitespace-nowrap" style={{ ...heading, background: C.cyan, color: '#fff', letterSpacing: '0.08em' }}>{p.label}</span>
                    <div className="h-px flex-1" style={{ background: C.border }} />
                    <span className="italic text-sm md:text-base" style={{ ...body, color: C.body }}>{p.name}</span>
                  </div>
                  <div className="space-y-3">
                    {p.weeks.map((w, j) => <WeekCard key={j} w={w as any} />)}
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* CAPSTONE MILESTONES */}
          <section id="capstone">
            <Eyebrow>— CAPSTONE MILESTONES</Eyebrow>
            <h2 className="text-3xl md:text-5xl font-extrabold mb-3" style={heading}>Week-by-week deliverable map</h2>
            <p className="text-lg mb-8" style={{ color: C.body }}>
              Every learner builds toward the same outcome — a portfolio-ready AI product with full spec, prototype, evals, GTM, and live demo.
            </p>
            <div className="rounded-2xl overflow-hidden overflow-x-auto" style={{ border: `1px solid ${C.border}` }}>
              <table className="w-full text-sm min-w-[700px]">
                <thead>
                  <tr style={{ background: C.navy, color: '#fff' }}>
                    {['WK', 'MILESTONE', 'WHAT YOU DELIVER', 'FORMAT'].map(h => (
                      <th key={h} className="text-left p-4 font-bold text-xs tracking-wider" style={heading}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody style={{ background: '#fff' }}>
                  {MILESTONES.map((row, i) => (
                    <tr key={i} style={{ borderTop: `1px solid ${C.border}` }}>
                      <td className="p-4 font-bold" style={{ ...heading, color: C.cyan }}>{row[0]}</td>
                      <td className="p-4 font-semibold" style={{ ...heading, color: C.text }}>{row[1]}</td>
                      <td className="p-4" style={{ color: C.body }}>{row[2]}</td>
                      <td className="p-4 text-xs" style={{ color: C.muted }}>{row[3]}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          {/* INCLUDED */}
          <section id="includes">
            <Eyebrow>— EVERYTHING INCLUDED</Eyebrow>
            <h2 className="text-3xl md:text-5xl font-extrabold mb-3" style={heading}>Every single thing you get</h2>
            <p className="text-lg mb-10" style={{ color: C.body }}>Not a recorded course. Every item below is live, hands-on, and mentor-guided.</p>
            <div className="grid md:grid-cols-2 gap-4">
              {INCLUDED.map((item, i) => (
                <div key={i} className="flex items-start gap-3 p-4 rounded-xl" style={{ background: '#fff', border: `1px solid ${C.border}` }}>
                  <Check className="w-5 h-5 shrink-0 mt-0.5" style={{ color: '#10b981' }} />
                  <span style={{ color: C.body }}>{item}</span>
                </div>
              ))}
            </div>
          </section>

          {/* OUTCOMES */}
          <section id="outcomes">
            <Eyebrow>— CORE OUTCOMES</Eyebrow>
            <h2 className="text-3xl md:text-5xl font-extrabold mb-3" style={heading}>What you walk away with</h2>
            <p className="text-lg mb-10" style={{ color: C.body }}>Every output below is built, not watched. You&apos;ll have a portfolio to show on Demo Day.</p>
            <div className="grid md:grid-cols-2 gap-5">
              {OUTCOMES.map((text, i) => (
                <div key={i} className="p-6 rounded-2xl flex gap-5" style={{ background: '#fff', border: `1px solid ${C.border}` }}>
                  <div className="text-5xl md:text-6xl font-extrabold leading-none shrink-0" style={{ ...heading, color: C.cyan, opacity: 0.25 }}>
                    {String(i + 1).padStart(2, '0')}
                  </div>
                  <p className="text-base leading-relaxed" style={{ color: C.body }}>{text}</p>
                </div>
              ))}
            </div>
          </section>

          {/* FAQ */}
          <section id="faqs">
            <Eyebrow>— FREQUENTLY ASKED</Eyebrow>
            <h2 className="text-3xl md:text-5xl font-extrabold mb-8" style={heading}>Your questions, answered</h2>
            <div className="space-y-3">
              {FAQS.map(([q, a], i) => <FAQItem key={i} q={q} a={a} />)}
            </div>
          </section>
        </main>

        {/* SIDEBAR */}
        <aside className="hidden lg:block">
          <div
            className="sticky top-[84px] space-y-4 overflow-y-auto pr-1 [&::-webkit-scrollbar]:hidden"
            style={{ maxHeight: 'calc(100vh - 100px)', scrollbarWidth: 'none', msOverflowStyle: 'none' } as CSSProperties}
          >
            <div className="rounded-2xl p-6 text-white" style={{ background: `linear-gradient(135deg, ${C.navy}, ${C.navy2})` }}>
              <div className="font-extrabold text-xl leading-tight mb-2" style={heading}>
                Become a Job Ready AI First Product Manager in 12 Weeks
              </div>
              <div className="text-sm" style={{ color: 'rgba(255,255,255,0.65)' }}>
                12-Week Live Bootcamp · Including Interview Prep · with Shailesh Sharma
              </div>
              <div className="mt-5 space-y-3">
                <a href={applyUrl} target="_blank" rel="noopener noreferrer"
                  className="flex items-center justify-center gap-2 px-5 py-3 rounded-full font-bold text-sm transition hover:opacity-90"
                  style={{ ...heading, background: `linear-gradient(135deg, ${C.cyan}, ${C.cyan2})`, color: '#fff' }}>
                  <ArrowRight className="w-4 h-4" /> Apply Now
                </a>
                <a href={waUrl} target="_blank" rel="noopener noreferrer"
                  className="flex items-center justify-center gap-2 px-5 py-3 rounded-full font-bold text-sm transition hover:opacity-90"
                  style={{ ...heading, background: C.wa, color: '#fff' }}>
                  <MessageCircle className="w-4 h-4" /> Ask on WhatsApp
                </a>
              </div>
            </div>
            {progressUrl && (
              <a href={progressUrl} target="_blank" rel="noopener noreferrer"
                 className="block rounded-2xl p-5 transition hover:shadow-md"
                 style={{ background: C.cyanLight, border: `1px solid ${C.cyan}` }}>
                <div className="flex items-center gap-2 mb-2">
                  <span className="w-[7px] h-[7px] rounded-full animate-pulse" style={{ background: C.cyan }} />
                  <span className="text-[11px] font-bold tracking-[0.14em]" style={{ ...heading, color: C.cyanDark }}>LIVE COHORT</span>
                </div>
                <div className="text-base font-bold leading-snug mb-1.5" style={{ ...heading, color: C.text }}>See the cohort in progress</div>
                <div className="text-sm leading-relaxed mb-3" style={{ ...body, color: C.body }}>
                  Weekly updates, prototypes and discussions from the batch that&rsquo;s running now.
                </div>
                <span className="inline-flex items-center gap-1.5 text-sm font-semibold" style={{ ...heading, color: C.cyanDark }}>
                  Open progress page <ExternalLink className="w-[15px] h-[15px]" />
                </span>
              </a>
            )}
            <div className="rounded-2xl p-5 space-y-3 text-sm" style={{ background: '#fff', border: `1px solid ${C.border}` }}>
              {[
                [Calendar, '12 weeks · Live cohort'],
                [Clock, 'Sat + Sun · 10:30–12:30 & 2:30–4:30 PM IST'],
                [Video, '45 live sessions + recordings'],
                [Monitor, '10 hands-on Demo sessions'],
                [Mic, '2 mock interview rounds'],
                [Trophy, 'Live Demo Day + certificate'],
              ].map(([Icon, t]: any, i) => (
                <div key={i} className="flex items-start gap-3">
                  <Icon className="w-4 h-4 shrink-0 mt-0.5" style={{ color: C.cyan }} />
                  <span style={{ color: C.body }}>{t}</span>
                </div>
              ))}
              <div className="h-px" style={{ background: C.border }} />
              <div className="font-bold text-xs tracking-wider" style={{ ...heading, color: C.text }}>WHAT&apos;S INCLUDED</div>
              {[
                'Portfolio-ready AI product capstone',
                'Working RAG + AI Agent prototype',
                'Eval framework + golden test set',
                'AI PM interview preparation',
                'Alumni community + job board',
              ].map((t, i) => (
                <div key={i} className="flex items-start gap-2">
                  <Check className="w-4 h-4 shrink-0 mt-0.5" style={{ color: '#10b981' }} />
                  <span style={{ color: C.body }}>{t}</span>
                </div>
              ))}
            </div>
          </div>
        </aside>
      </div>

      {/* FINAL CTA */}
      <section className={`${PAGE_WRAP} pb-20`}>
        <div
          className="rounded-3xl p-10 md:p-14 lg:p-16 text-center text-white relative overflow-hidden"
          style={{ background: `linear-gradient(135deg, ${C.navy}, ${C.navy2})` }}
        >
          <div aria-hidden className="absolute -top-32 -right-32 w-[400px] h-[400px] rounded-full blur-3xl opacity-20" style={{ background: C.cyan }} />
          <h2 className="text-3xl md:text-5xl font-extrabold mb-4 relative" style={heading}>Ready to Build Your AI Product?</h2>
          <p className="text-lg mb-8 max-w-2xl mx-auto relative" style={{ color: 'rgba(255,255,255,0.7)' }}>
            12 weeks. 45 live sessions. Working prototypes. Mock interviews. Live Demo Day. Rolling applications.
          </p>
          <div className="flex flex-wrap justify-center gap-3 relative">
            <CTAPrimary href={applyUrl} light>Apply Now</CTAPrimary>
            <CTAWhatsApp href={waUrl} />
          </div>
        </div>
      </section>

      {/* MOBILE COHORT PROGRESS RIBBON — sits directly above the fixed CTA bar */}
      {progressUrl && (
        <a href={progressUrl} target="_blank" rel="noopener noreferrer"
           className="lg:hidden fixed left-0 right-0 bottom-[68px] z-50 flex items-center gap-2.5 px-4 py-3"
           style={{ background: C.cyanLight, borderTop: `1px solid ${C.cyan}59` }}>
          <span className="w-[7px] h-[7px] rounded-full animate-pulse shrink-0" style={{ background: C.cyan }} />
          <span className="text-sm font-semibold" style={{ ...heading, color: C.cyanDark }}>See the current cohort in progress</span>
          <ChevronRight className="w-4 h-4 ml-auto shrink-0" style={{ color: C.cyanDark }} />
        </a>
      )}

      {/* MOBILE FIXED BOTTOM CTA */}
      <div className="lg:hidden fixed bottom-0 left-0 right-0 z-50 p-3 flex gap-2"
        style={{ background: '#fff', borderTop: `1px solid ${C.border}`, boxShadow: '0 -4px 20px rgba(0,0,0,0.06)' }}>
        <a href={applyUrl} target="_blank" rel="noopener noreferrer"
          className="flex-1 flex items-center justify-center gap-2 py-3 rounded-full font-bold text-sm"
          style={{ ...heading, background: C.cyan, color: '#fff' }}>
          <ArrowRight className="w-4 h-4" /> Apply Now
        </a>
        <a href={waUrl} target="_blank" rel="noopener noreferrer"
          className="flex-1 flex items-center justify-center gap-2 py-3 rounded-full font-bold text-sm"
          style={{ ...heading, background: C.wa, color: '#fff' }}>
          <MessageCircle className="w-4 h-4" /> WhatsApp
        </a>
      </div>
    </div>
  );
}
