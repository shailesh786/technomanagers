/**
 * lib/course-pages.ts — content for the on-site course detail pages
 * (/courses/[slug]). Only the courses listed here get a page; every other
 * course card keeps linking to Topmate.
 *
 * Server-side only: import it from Server Components and route files, never
 * from 'use client' code (that would ship all the copy to the browser) —
 * client code uses lib/course-links.ts.
 *
 * Copy comes from the design handoff (design_handoff_course_pages/
 * course-data.js) and lives in code for now — admin editing is a later PR.
 * Each page is tied to its `courses` row by id: the row supplies the
 * checkout link (external_url, the Topmate product page — no prices on-site),
 * the thumbnail and the active/inactive switch, so the admin can still retire
 * a course without a deploy.
 */

import type { LucideIcon } from 'lucide-react';
import { BookOpen, Calendar, Clock, MessageCircle, Shield, Users, Video } from 'lucide-react';
import { COURSE_PAGE_IDS } from '@/lib/course-links';
import { INSTRUCTOR_NAME, INSTRUCTOR_PORTRAIT_URL, INSTRUCTOR_YOUTUBE_URL } from '@/components/cohort/InstructorCard';
import type { Course } from '@/types';

export interface CoursePageContent {
  slug: string;
  /** `courses.id` of the row this page sells (from lib/course-links.ts). */
  courseId: string;
  /**
   * Where Enroll Now goes, when it should not be the row's external_url —
   * e.g. straight to Topmate's payment step instead of the product page.
   */
  checkoutUrl?: string;
  /**
   * Lines the bottom-left pop-up cycles through. Facts only — each must be
   * true and checkable (enrolments, rating, where learners work).
   */
  proofPoints?: CourseProofPoint[];
  /**
   * Full <title>, used as an absolute title (no layout suffix). Kept under
   * ~60 characters so Google shows it whole; Google already prints the site
   * name above the link, so no brand suffix. Titles carry the year — update
   * it each January.
   */
  seoTitle: string;
  /** Search snippet: lead with proof, ≤155 characters, no expiring offers. */
  metaDescription: string;
  breadcrumb: string;
  category: string;
  badge: string;
  /** H1 = titleBefore + <gradient>titleLead</gradient> + titleRest. */
  titleBefore: string;
  titleLead: string;
  titleRest: string;
  headline: string;
  /**
   * Null values are hidden on the page. aggregateRating JSON-LD needs both
   * rating and ratingCount, and the count must then be shown on the page
   * (ratingLabel) — leave ratingCount null to show the rating alone.
   */
  proof: { rating: string | null; ratingCount: number | null; ratingLabel: string; enrolled: string | null; enrolledLabel: string };
  facts: { label: string; value: string }[];
  includes: { icon: LucideIcon; text: string }[];
  about: string[];
  outcomes: { title: string; desc: string }[];
  modulesSummary: string;
  moduleUnit: 'Module' | 'Week';
  modules: CourseModule[];
  forWho: string[];
  notFor: string[];
  /** `role` is the reviewer's job or, failing that, the review date. */
  reviews: { quote: string; name: string; role: string }[];
  instructor: CourseInstructor;
  /** Question-bank category the "Practice" cards and "View all" link come from. */
  questionCategory: string;
  faqs: { q: string; a: string }[];
  relatedSlugs: string[];
  ctaTitle: string;
  ctaSub: string;
}

/**
 * A curriculum module as the page shows it: what it covers and a lesson
 * count, never the lesson list — that would hand visitors the study plan.
 * Lesson titles deliberately live only on Topmate, behind checkout.
 */
/**
 * A time-boxed coupon for a course page, configured per course in the admin
 * Courses form (courses.offer_*). `endsAt` is a fixed deadline — the
 * countdown runs to it and the offer disappears once it passes. The code
 * must exist on Topmate.
 */
export interface CourseOffer {
  label: string;
  code: string;
  endsAt: string;
}

export const DEFAULT_OFFER_LABEL = 'Limited-time offer';

/** "16 Nov" — the offer's last day in IST, for share previews. */
export function offerEndDay(offer: CourseOffer): string {
  return new Intl.DateTimeFormat('en-IN', { day: 'numeric', month: 'short', timeZone: 'Asia/Kolkata' }).format(
    new Date(offer.endsAt),
  );
}

/** The share-preview sentence for a live offer: "20% off for a limited time with code AIPM20, till 16 Nov." */
export function offerShareLine(offer: CourseOffer): string {
  return `${offer.label} with code ${offer.code}, till ${offerEndDay(offer)}.`;
}

/** The course row's offer, or null when it has none or it has already ended. */
export function courseOfferFromRow(
  row: Pick<Course, 'offer_label' | 'offer_code' | 'offer_ends_at'> | null | undefined,
  nowMs: number,
): CourseOffer | null {
  const code = row?.offer_code?.trim();
  const endsAt = row?.offer_ends_at;
  if (!code || !endsAt) return null;
  const end = Date.parse(endsAt);
  if (Number.isNaN(end) || end <= nowMs) return null;
  return { label: row?.offer_label?.trim() || DEFAULT_OFFER_LABEL, code, endsAt };
}

export interface CourseProofPoint {
  /** The highlighted lead-in, e.g. "1,120+ learners". */
  strong: string;
  rest: string;
}

export interface CourseModule {
  title: string;
  /** One line on what the module covers or what you can do after it. */
  summary: string;
  /** Keyword chips — the search terms the module covers. */
  tags: string[];
  /** Companies whose real business problems the module works through hands-on. */
  caseStudies?: string[];
  /** Number of locked lessons; omitted for cohort weeks. */
  lessons?: number;
  /** What `lessons` counts, when not lessons (e.g. 'questions'). */
  lessonNoun?: string;
  /** Featured selling point: the brand-gradient card. */
  highlight?: boolean;
  /** The closing certificate step, shown with a shield instead of a lock. */
  certificate?: boolean;
}

export interface CourseInstructor {
  name: string;
  role: string;
  bio: string;
  /** Portrait; without one the page shows the instructor's initials. */
  photoUrl?: string;
  stats: { value: string; label: string }[];
  links: { label: string; href: string }[];
}

export const SHAILESH_SHARMA: CourseInstructor = {
  name: INSTRUCTOR_NAME,
  role: 'Founder, TechnoManagers · IIM Bangalore & IIT Kanpur alumni',
  bio: 'Shailesh coaches candidates for Product Management, Program Management and Consulting interviews, and runs the TechnoManagers YouTube channel and AI PM Builder Cohort.',
  photoUrl: INSTRUCTOR_PORTRAIT_URL,
  stats: [
    { value: '9.6k+', label: 'bookings' },
    { value: '131', label: 'ratings across all services' },
  ],
  links: [{ label: 'YouTube', href: INSTRUCTOR_YOUTUBE_URL }],
};

// Bio, role and photo still to come from Priyanka — keep this to facts until then.
export const PRIYANKA_DALMIA: CourseInstructor = {
  name: 'Priyanka Dalmia',
  role: 'Instructor, TechnoManagers',
  bio: 'Priyanka Dalmia teaches the AI Program Management course at TechnoManagers.',
  stats: [],
  links: [{ label: 'LinkedIn', href: 'https://www.linkedin.com/in/priyanka-dalmia/' }],
};

const PAY_FAQ = {
  q: 'How do I enroll?',
  a: 'Enroll Now opens the course on Topmate, where you see the current price and check out securely. Course access is shared right after payment.',
};

const ALL_COURSE_PAGES: readonly CoursePageContent[] = [
  {
    slug: 'ai-product-management-course',
    courseId: COURSE_PAGE_IDS['ai-product-management-course'],
    checkoutUrl: 'https://topmate.io/technomanagers/1861184/pay',
    proofPoints: [
      { strong: '1,120+ learners', rest: 'have enrolled in the AI Product Management Course.' },
      { strong: 'Rated 4.9', rest: 'by learners who took the course.' },
      { strong: 'Learners now work at', rest: 'Google, Microsoft, Uber and Coinbase.' },
    ],
    seoTitle: 'AI Product Management Course 2026: RAG, Evals & Interview Prep',
    metaDescription:
      'Rated 4.9 by 1,120+ learners now at Google, Microsoft and Uber. Build RAG apps, AI evals and agents, then crack AI PM interviews. Lifetime access.',
    breadcrumb: 'AI Product Management',
    category: 'AI Product Management',
    badge: 'Interview Prep',
    titleBefore: '',
    titleLead: 'AI Product Management',
    titleRest: ' Course',
    headline:
      'Learn machine learning, GenAI, RAG, AI evals, agents and vibe coding as a product manager, then crack AI PM interviews. Our learners now work at Google, Microsoft, Uber and Coinbase.',
    proof: { rating: '4.9', ratingCount: null, ratingLabel: 'average rating', enrolled: '1,120+', enrolledLabel: 'learners enrolled' },
    facts: [
      { label: 'Videos', value: '48+ lectures' },
      { label: 'Case studies', value: '25+' },
      { label: 'Interview questions', value: '20+' },
      { label: 'Access', value: 'Lifetime' },
    ],
    includes: [
      { icon: Video, text: '48+ video lectures' },
      { icon: BookOpen, text: '25+ AI strategy case studies' },
      { icon: MessageCircle, text: '20+ AI PM interview questions' },
      { icon: Shield, text: 'Certificate of Competency in AI Product Management' },
    ],
    about: [
      'Everyone calls themselves an AI Product Manager now. This AI product manager course bridges traditional Product Management and the world of AI, so you treat AI as a product component instead of a black box.',
      'You learn to build RAG systems, write AI evals, design agents, reason about AI pricing and reliability, and prototype with vibe coding. The final modules prepare you for AI PM interviews and AI product sense questions.',
    ],
    outcomes: [
      { title: 'Machine Learning for Product Managers', desc: 'The ML product lifecycle, data pipelines and the AI flywheel: where models fit in a product and what they need to work.' },
      { title: 'AI Algorithms Through Business Case Studies', desc: 'Regression, decision trees and clustering, built hands-on in Google Colab on Hotstar, Swiggy and Amazon business problems.' },
      { title: 'Generative AI and Prompt Engineering', desc: 'How GenAI models work, and the prompting techniques that make AI outputs reliable and repeatable.' },
      { title: 'AI Prototyping With Vibe Coding', desc: 'Build AI prototypes yourself, from basic to advanced vibe coding, with a reliability framework for shipping them.' },
      { title: 'RAG, AI Evals and AI Agents', desc: 'Build RAG applications, write evals for RAG and agentic systems, and design AI agents.' },
      { title: 'Crack AI Product Manager Interviews', desc: '20+ real AI PM interview questions on metrics, product sense, AI pricing, strategy and system design.' },
    ],
    modulesSummary: '8 modules · 48+ videos',
    moduleUnit: 'Module',
    modules: [
      { title: 'AI Product Management & Machine Learning', summary: 'AI product management from the ground up: where models fit in a product, the ML product lifecycle and the data pipelines AI products depend on.', tags: ['AI product management', 'ML product lifecycle', 'AI flywheel', 'Data pipelines'], lessons: 4 },
      { title: 'AI Algorithms & Applications', summary: 'Solve real business problems with AI, hands-on in Google Colab: pick the right algorithm for each problem and build it.', tags: ['Regression', 'Decision trees', 'Clustering', 'Google Colab'], caseStudies: ['Hotstar', 'Swiggy', 'Amazon'], lessons: 4 },
      { title: 'Gen AI & Product Management', summary: 'How generative AI models work, and the prompting techniques that make their outputs reliable.', tags: ['Generative AI', 'LLMs', 'Prompt engineering'], lessons: 5 },
      { title: 'AI Prototyping & Vibe Coding', summary: 'Build AI prototypes yourself with advanced prompting and advanced vibe coding, plus a reliability framework for shipping them.', tags: ['Advanced vibe coding', 'Advanced prompting', 'AI prototyping', 'Model temperature'], lessons: 6 },
      { title: 'Evals, RAG & Agents', summary: 'Build RAG applications, write evals for RAG and agentic systems, and design AI agents.', tags: ['RAG', 'AI evals', 'AI agents', 'Claude Skills'], lessons: 5 },
      { title: 'AI PM Interview Questions', summary: '20 real AI PM interview questions with answers, the way top companies ask them.', tags: ['Metrics', 'Product sense', 'AI pricing', 'System design'], lessons: 20, lessonNoun: 'questions', highlight: true },
      { title: 'AI & Strategic Case Studies', summary: 'AI pricing cases, AI strategy and the tech fundamentals every product manager needs.', tags: ['AI pricing', 'AI strategy', 'Tech for PMs'], lessons: 3 },
      { title: 'Certificate of Competency', summary: 'Finish the course and earn your Certificate of Competency in AI Product Management.', tags: [], certificate: true },
    ],
    forWho: [
      'Product Managers moving into AI products',
      'Engineers and analysts preparing for AI PM interviews',
      'PMs who want to prototype AI ideas without waiting on engineering',
    ],
    notFor: [
      'Anyone wanting live, mentored teaching. See the AI PM Builder Cohort.',
      'ML engineers looking for model-training depth',
      'People who only want a prompting course',
    ],
    // Topmate reviews of this course first, then AI PM Builder Cohort students
    // (from the /cohort testimonial wall), labelled as such.
    reviews: [
      { quote: 'Amazing content on Advanced AI Evals. It helped me unblock a few things I’ve been struggling with while working on evals at scale. So if you are figuring out RAG evals, this framing might save you a lot of trial & error.', name: 'Aishwarya Jaiswal', role: 'Product Manager, Microsoft AI Copilot' },
      { quote: 'It is the only course you need to become the top 1% AI PM, period. Shailesh led the course and the effort he puts into each session is beyond what I have seen from any mentors I have interacted with. Super thankful to Shailesh for hosting this.', name: 'Sonal', role: 'Product Manager' },
      { quote: 'AI ML algorithms are explained in a very easy manner and in great detail. The vibe coding is also explained in extreme detail. The full course is all about hands-on examples.', name: 'Ashish Gupta', role: 'Associate Director, Product Management' },
      { quote: 'A well rounded course, which talks about all of the necessary AI concepts. The beauty is that this course blends AI usage along with the traditional way of PM interview questions. Learning the implementation of evals in a real interview setting blew my mind.', name: 'Agastya', role: 'Dec 2025' },
      { quote: 'The AI PM interview questions are good and well thought. Also I particularly liked the supporting reading material, the case studies. Too good.', name: 'Sarah Lee', role: 'Product Manager, Fintech Startup' },
      { quote: 'This is the only course which you will need to become an AI builder. This completely changed how I look at quality in Generative AI.', name: 'Shikhar Srivastava', role: 'Product Manager, ShipTurtle' },
      { quote: 'A true value for money! PM interview landscape is changing and this course is fresh & relevant. Most of such courses are very expensive; a detailed course at such a price point is a steal!', name: 'Samiksha', role: 'Dec 2025' },
      { quote: 'The course content is really well laid out. It has helped in boosting my confidence by enabling understanding of AI concepts and also helped me witness some of the real life applications of AI.', name: 'Mahak', role: 'Jan 2026' },
      { quote: 'I got an offer at eGov Foundation. I’ll be working under the CTO of Aadhaar. The RAG session in the cohort was a game-changer. In my interviews, I was questioned about a product I hadn’t directly owned, but the hands-on RAG work gave me the confidence to speak about it as I built it.', name: 'Varsha Arun', role: 'Senior AI PM, eGov Foundation · AI PM Cohort' },
      { quote: 'I’ve landed an AI Tech Product Manager role at Hero Vired, a Hero Group company, and I’m holding two other offers. One particularly valuable topic was LLM evals; it was directly relevant to the role and actually came up during my interview discussions.', name: 'Anubhav Arun', role: 'AI PM, Hero Vired · AI PM Cohort' },
      { quote: 'I’ve built a much stronger understanding of how to create AI-native products end to end. I can identify where AI creates value, frame the opportunity and choose the right architecture.', name: 'Akhilesh Ramaraju', role: 'Senior Product Manager, Oracle · AI PM Cohort' },
      { quote: 'Very structured content that has helped me crack my Product Management interview.', name: 'Shivansh Agarwal', role: 'Product Manager, Coinbase' },
    ],
    instructor: SHAILESH_SHARMA,
    questionCategory: 'Artificial Intelligence',
    faqs: [
      { q: 'What does an AI Product Manager do?', a: 'An AI Product Manager owns products where a model is a core component: what to build, how it should behave and when it is reliable enough to ship.' },
      { q: 'Who is this AI product management course for?', a: 'Product managers moving into AI products, engineers and analysts preparing for AI PM interviews, and PMs who want to prototype AI ideas without waiting on engineering.' },
      { q: 'Do I need a coding background?', a: 'No. Algorithms and GenAI are explained step by step, and vibe coding is taught from basics to advanced.' },
      { q: 'Is this AI product manager course online and self-paced?', a: 'Yes. It is an online, self-paced course: 48+ video lectures and 25+ case studies you can work through anytime, with lifetime access.' },
      { q: 'Does it cover AI PM interviews?', a: 'Yes. A full module covers 20+ AI PM interview questions across product sense, pricing, strategy, metrics and evals.' },
      { q: 'Do I get a certificate?', a: 'Yes, a Certificate of Competency in AI Product Management.' },
      { q: 'How long do I have access?', a: 'Lifetime access.' },
      PAY_FAQ,
    ],
    relatedSlugs: ['ai-program-management-course'],
    ctaTitle: 'Build and Ship AI Products',
    ctaSub: '48+ videos, 25+ case studies and AI PM interview prep.',
  },
  {
    slug: 'ai-pm-cohort-recording',
    // Draft: not in COURSE_PAGE_IDS yet, so not published (see COURSE_PAGES below).
    courseId: 'f75e3433-124c-4ece-8fd3-9ec820414371',
    seoTitle: 'AI Product Management Cohort Recording (12 Weeks) | Technomanagers',
    metaDescription:
      'Full recordings of the 12-week AI Product Builder Cohort: RAG, AI agents, evals, AI product design, metrics, GTM and two mock interview rounds.',
    breadcrumb: 'AI PM Cohort Recording',
    category: 'AI Product Management',
    badge: 'June – September',
    titleBefore: '',
    titleLead: 'AI Product Management',
    titleRest: ' Cohort Recording',
    headline: 'All 12 weeks of the live AI Product Builder Cohort, recorded. Learn at your own pace.',
    proof: { rating: null, ratingCount: null, ratingLabel: 'ratings', enrolled: '53', enrolledLabel: 'learners enrolled' },
    facts: [
      { label: 'Format', value: 'Recorded live cohort' },
      { label: 'Length', value: '12 weeks' },
      { label: 'Batch', value: 'June – September' },
      { label: 'Access', value: 'Lifetime' },
    ],
    includes: [
      { icon: Video, text: 'Every live session from the June cohort' },
      { icon: Calendar, text: '12 weeks of curriculum' },
      { icon: Users, text: 'Two full mock interview rounds' },
      { icon: Clock, text: 'Lifetime access' },
    ],
    about: [
      'Each week pairs a concept with a build: from AI fundamentals and RAG to agents, evals, spec-driven development and AI-native UX.',
      'The last month moves to risks, metrics, go-to-market and model selection, with two mock interview rounds and a capstone Demo Day.',
    ],
    outcomes: [
      { title: 'Ship a Working RAG Prototype', desc: 'Go from problem statement to a working RAG prototype by week 3.' },
      { title: 'Design and Build AI Agents', desc: 'Concept and hands-on build in the same session.' },
      { title: 'Write Production Evals', desc: 'Spec, test and define “good enough to ship” launch thresholds.' },
      { title: 'Design AI-Native UX', desc: 'Trust signals, human-in-the-loop and AI-native patterns.' },
      { title: 'Prepare for AI PM Interviews', desc: 'Two full mock interview loops plus enterprise case studies.' },
    ],
    modulesSummary: '12 weeks',
    moduleUnit: 'Week',
    modules: [
      { title: 'AI Fundamentals & Algorithms', summary: 'AI and ML fundamentals, and locking your capstone problem statement.', tags: ['ML basics', 'Capstone'] },
      { title: 'Generative AI & ML Systems', summary: 'LLMs, transformers and how production ML pipelines work.', tags: ['LLMs', 'Transformers'] },
      { title: 'GenAI Tools, AI PM Role & RAG', summary: 'The AI PM role, GenAI tooling and your first working RAG prototype.', tags: ['RAG', 'GenAI tools'] },
      { title: 'AI Agents: Concept + Hands-on Build', summary: 'Design an AI agent and prototype it in the same session.', tags: ['AI agents'] },
      { title: 'Advanced Evals: Spec → Test → Launch Threshold', summary: 'Write production evals and define when an AI feature is good enough to ship.', tags: ['AI evals', 'Launch thresholds'] },
      { title: 'Spec-Driven Dev & Live Build', summary: 'Go from spec to prototype to test to ship in one weekend.', tags: ['Spec-driven development'] },
      { title: 'AI Product Design & UX Polish', summary: 'Trust signals, human-in-the-loop and AI-native UX patterns.', tags: ['AI UX', 'Human-in-the-loop'] },
      { title: 'AI Risks, Biases & Product Metrics', summary: 'Responsible AI and the full AI product metrics stack.', tags: ['Responsible AI', 'AI metrics'] },
      { title: 'GTM, Model Selection & Mock Interview Round 1', summary: 'Moats, model decisions, go-to-market and your first full mock interview loop.', tags: ['GTM', 'Model selection', 'Mock interview'] },
      { title: 'Enterprise Case Studies & Mock Interview Round 2', summary: 'Enterprise AI case studies and a second full mock interview loop.', tags: ['Case studies', 'Mock interview'] },
      { title: 'Capstone Refinement & Mock Demo', summary: 'Turn your capstone into a tight 8-minute story.', tags: ['Capstone'] },
      { title: 'Demo Day', summary: 'A live presentation of your capstone, your portfolio published and your certificate awarded.', tags: ['Demo Day', 'Certificate'], highlight: true },
    ],
    forWho: [
      'PMs who missed the live cohort and want the full curriculum',
      'Product folks who prefer to learn at their own pace',
      'Candidates preparing for AI PM roles who want build experience',
    ],
    notFor: [
      'Anyone wanting live mentorship and Demo Day. Join the next live cohort.',
      'Complete beginners to Product Management',
      'People looking for a short overview course',
    ],
    reviews: [],
    instructor: SHAILESH_SHARMA,
    questionCategory: 'Artificial Intelligence',
    faqs: [
      { q: 'What is the AI Product Builder Cohort?', a: 'A 12-week, mentor-led live cohort to become a job-ready AI Product Manager: RAG, AI agents, evals, interview prep and Demo Day.' },
      { q: 'How is the recording different from the live cohort?', a: 'You get every session from the June to September batch. Live mentorship, feedback and Demo Day are only in the live cohort.' },
      { q: 'How long do I have access?', a: 'Lifetime access.' },
      PAY_FAQ,
    ],
    relatedSlugs: ['ai-product-management-course', 'ai-program-management-course'],
    ctaTitle: 'Get the Full Cohort, Recorded',
    ctaSub: '12 weeks of live sessions, two mock interview rounds and Demo Day.',
  },
  {
    slug: 'ai-program-management-course',
    courseId: COURSE_PAGE_IDS['ai-program-management-course'],
    checkoutUrl: 'https://topmate.io/technomanagers/2033621/pay',
    seoTitle: 'AI Program Management Course 2026: TPM & AI PgM Interview Prep',
    metaDescription:
      'Lead AI programs with real technical depth: ML, GenAI, RAG and AI change management, plus Meta and Google TPM interview guides. Lifetime access.',
    breadcrumb: 'AI Program Management',
    category: 'Program Management',
    badge: 'AI Edition',
    titleBefore: '',
    titleLead: 'AI Program Management',
    titleRest: ' Course',
    headline:
      'Learn machine learning, GenAI, LLMs and RAG as a program manager, drive AI change management, and crack AI program manager interviews at top tech companies.',
    proof: { rating: null, ratingCount: null, ratingLabel: 'ratings', enrolled: null, enrolledLabel: 'learners enrolled' },
    facts: [
      { label: 'Format', value: 'Self-paced video' },
      { label: 'Videos', value: '32+' },
      { label: 'Interview types', value: '5 covered' },
      { label: 'Access', value: 'Lifetime' },
    ],
    includes: [
      { icon: Video, text: '32+ video lessons' },
      { icon: BookOpen, text: '7 modules, self-paced' },
      { icon: MessageCircle, text: 'Meta and Google TPM interview guides' },
      { icon: Clock, text: 'Lifetime access' },
      { icon: Shield, text: 'Certificate of Competency in AI Program Management' },
    ],
    about: [
      'Everyone is adding “AI” to their Program Management title. Managing an AI program is not the same as setting up Jira boards for machine learning engineers.',
      'This AI program manager course bridges traditional Program Management and the ambiguous world of AI: the ML and LLM foundations, prototyping with vibe coding, change management for GenAI adoption, and the five interview types you will face at top tech companies.',
    ],
    outcomes: [
      { title: 'Machine Learning and GenAI for Program Managers', desc: 'The ML lifecycle, LLMs and RAG, explained so you can lead AI programs and hold your own with engineers.' },
      { title: 'Run AI Programs End to End', desc: 'Plan and deliver probabilistic AI work, from model uncertainty to launch, without faking the technical depth.' },
      { title: 'Prototype With Advanced Prompting and Vibe Coding', desc: 'Validate AI ideas and automate workflows yourself instead of waiting for engineering bandwidth.' },
      { title: 'Drive AI Change Management', desc: 'Drive GenAI adoption and navigate organisational friction when rolling out AI tools.' },
      { title: 'Solve AI Program Cases From First Principles', desc: 'Break down never-before-seen AI program challenges and scope them like the top 1%.' },
      { title: 'Crack AI Program Manager Interviews', desc: 'Behavioural, execution, ambiguity, stakeholder and metrics rounds, plus Meta and Google TPM interview guides.' },
    ],
    modulesSummary: '7 modules · 32+ videos',
    moduleUnit: 'Module',
    modules: [
      { title: 'AI Program Manager Interview Prep', summary: 'The full AI program manager interview loop: program responsibilities, change management, behavioural and leadership, execution and delivery, ambiguity, stakeholders and metrics.', tags: ['Behavioural & leadership', 'Execution & delivery', 'Ambiguity', 'Stakeholders', 'Metrics', 'Meta & Google TPM guides'], lessons: 15, highlight: true },
      { title: 'AI & Machine Learning', summary: 'AI program management starts here: the AI flywheel, the AI product lifecycle and the ML data pipelines your programs depend on.', tags: ['AI program management', 'AI flywheel', 'AI lifecycle', 'ML data pipelines'], lessons: 4 },
      { title: 'AI Algorithms & Applications', summary: 'Regression and decision trees, and where each one fits in a real AI program.', tags: ['Linear regression', 'Logistic regression', 'Decision trees'], lessons: 3 },
      { title: 'Generative AI', summary: 'How generative AI and LLMs work, and the advanced prompting techniques that make their output reliable.', tags: ['Generative AI', 'LLMs', 'Advanced prompting'], lessons: 4 },
      { title: 'AI Prototyping & Vibe Coding', summary: 'Prototype AI workflows yourself with advanced vibe coding, model and temperature control, and an AI reliability framework.', tags: ['Advanced vibe coding', 'Prompt engineering', 'AI reliability'], lessons: 5 },
      { title: 'Strategic Cases, RAG & AI Evals', summary: 'Strategic case studies, first-principles case interviews and guesstimates, plus RAG and AI evals for program managers.', tags: ['Strategic cases', 'Guesstimates', 'RAG', 'AI evals'], lessons: 6 },
      { title: 'Certificate of Competency', summary: 'Finish the course and earn your Certificate of Competency in AI Program Management.', tags: [], certificate: true },
    ],
    forWho: [
      'Program and project managers moving onto AI and GenAI programs',
      'TPMs preparing for Staff and Principal PgM roles at top tech firms',
      'Consultants and operations leads switching into Program Management',
    ],
    notFor: [
      'Anyone looking for a PMP or Agile certification',
      'ML engineers who want model-building depth',
      'People who want live, mentored teaching',
    ],
    reviews: [
      { quote: 'Very helpful and insightful. It is like a powerful tool for gaining confidence for lone preparations. Thank you so much, keep up the good work.', name: 'J. Siddhartha Yadav', role: 'Nov 2025' },
      { quote: 'Very insightful course.', name: 'Lavy Sharma', role: 'Feb 2026' },
      { quote: 'Great content', name: 'Anonymous', role: 'Oct 2025' },
    ],
    instructor: PRIYANKA_DALMIA,
    questionCategory: 'Program Management',
    faqs: [
      { q: 'What is AI Program Management?', a: 'Running programs that ship AI and ML products. AI is probabilistic, so planning, delivery and change management work differently from traditional software.' },
      { q: 'Who is this AI program management course for?', a: 'Program and project managers moving onto AI and GenAI programs, TPMs preparing for Staff and Principal roles at top tech firms, and consultants and operations leads switching into Program Management.' },
      { q: 'Do I need a technical background?', a: 'No. ML, LLMs and RAG are explained without jargon so you can lead conversations with engineers.' },
      { q: 'Does it help with Technical Program Manager (TPM) interviews?', a: 'Yes. Alongside the five AI program manager interview rounds, it includes dedicated Meta and Google Technical Program Manager (TPM) interview guides.' },
      { q: 'Is this AI program manager course online and self-paced?', a: 'Yes. It is an online, self-paced course with 32+ video lessons and lifetime access.' },
      { q: 'Which interview rounds are covered?', a: 'Behavioural & Leadership, Program Execution & Delivery, Ambiguity & Problem Solving, Cross Functional & Stakeholder Management, and Domain & Metrics Execution, plus dedicated Meta and Google Technical Program Manager (TPM) interview guides.' },
      { q: 'Do I get a certificate?', a: 'Yes, a Certificate of Competency in AI Program Management.' },
      { q: 'How long do I have access?', a: 'Lifetime access.' },
      PAY_FAQ,
    ],
    relatedSlugs: ['ai-product-management-course'],
    ctaTitle: 'Become an AI Program Manager',
    ctaSub: '32+ videos, 5 interview types and a certificate.',
  },
];

/** The published pages — those listed in lib/course-links.ts. Drafts stay out of routes, sitemap and links. */
export const COURSE_PAGES: readonly CoursePageContent[] = ALL_COURSE_PAGES.filter(
  (p) => (COURSE_PAGE_IDS as Record<string, string>)[p.slug] === p.courseId,
);

export function getCoursePage(slug: string): CoursePageContent | undefined {
  return COURSE_PAGES.find((p) => p.slug === slug);
}

/** "Rated 4.9 · 1,120+ learners enrolled" — the enroll card / sticky bar line. */
export function proofLine(proof: CoursePageContent['proof']): string {
  return (
    [
      proof.rating ? `Rated ${proof.rating}` : null,
      proof.enrolled ? `${proof.enrolled} ${proof.enrolledLabel}` : null,
    ]
      .filter(Boolean)
      .join(' · ') || 'Enroll on Topmate'
  );
}
