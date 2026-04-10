import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  MessageSquare, FileText, CheckSquare, Search, Zap, Shield,
  Users, ArrowRight, ChevronDown, Star, Check, Menu, X, Globe,
  Sparkles, BarChart3, Lock, Layers, Play,
} from 'lucide-react';
import { cn } from '@/lib/utils';

/* ─── Helpers ──────────────────────────────────────── */
/**
 * useScrollReveal - IntersectionObserver hook for scroll animations
 * Triggers visibility when element enters viewport (12% threshold)
 * Used by the Reveal component for staggered entrance animations
 */
function useScrollReveal() {
  const ref = useRef(null);
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) { setVisible(true); obs.disconnect(); } },
      { threshold: 0.12 }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);
  return [ref, visible];
}

/**
 * Reveal - Wrapper component that animates children into view
 * Uses CSS transitions with optional delay for staggered effects
 */
function Reveal({ children, className, delay = 0 }) {
  const [ref, visible] = useScrollReveal();
  return (
    <div
      ref={ref}
      className={cn('transition-all duration-700', visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6', className)}
      style={{ transitionDelay: `${delay}ms` }}
    >
      {children}
    </div>
  );
}

/* ─── Data ─────────────────────────────────────────── */
const FEATURES = [
  {
    icon: MessageSquare,
    color: 'text-blue-500',
    bg: 'bg-blue-50 dark:bg-blue-500/10',
    title: 'Real-time Team Chat',
    desc: 'Channels, DMs, threads — everything your team needs to stay in sync without the noise.',
  },
  {
    icon: FileText,
    color: 'text-violet-500',
    bg: 'bg-violet-50 dark:bg-violet-500/10',
    title: 'Collaborative Docs',
    desc: 'Create, edit, and share documents together in real-time. Knowledge lives with your team, not in inboxes.',
  },
  {
    icon: CheckSquare,
    color: 'text-green-500',
    bg: 'bg-green-50 dark:bg-green-500/10',
    title: 'Tasks & Notes',
    desc: 'Lightweight task tracking and smart notes that capture decisions the moment they happen.',
  },
  {
    icon: Search,
    color: 'text-orange-500',
    bg: 'bg-orange-50 dark:bg-orange-500/10',
    title: 'Unified Search',
    desc: 'One search bar across every message, doc, and task. Find anything in seconds.',
  },
  {
    icon: Sparkles,
    color: 'text-pink-500',
    bg: 'bg-pink-50 dark:bg-pink-500/10',
    title: 'AI Assistant',
    desc: 'Summarise threads, extract action items, draft updates — all with a single prompt.',
  },
  {
    icon: Lock,
    color: 'text-slate-500',
    bg: 'bg-slate-50 dark:bg-slate-500/10',
    title: 'Enterprise Security',
    desc: 'SOC 2 Type II, end-to-end encryption, SSO, and granular permissions baked in from day one.',
  },
];

const STEPS = [
  { num: '01', title: 'Create your workspace', desc: 'Set up in under 60 seconds. No credit card required.' },
  { num: '02', title: 'Invite your team', desc: 'Add members via email or share a link. Roles & permissions included.' },
  { num: '03', title: 'Start collaborating', desc: 'Chat, write docs, assign tasks — everything in one tab, real-time.' },
];

const TESTIMONIALS = [
  {
    quote: "We replaced Slack, Notion, and Asana with OneChat. Our context-switching dropped by 80%.",
    author: 'Sarah Chen',
    role: 'Head of Product, Arkwright Labs',
    avatar: 'SC',
    color: 'bg-violet-500',
  },
  {
    quote: "The AI summaries alone save each engineer 30+ minutes a day. It's become indispensable.",
    author: 'Marcus Webb',
    role: 'CTO, Pillar AI',
    avatar: 'MW',
    color: 'bg-blue-500',
  },
  {
    quote: "Finally, a tool that actually reduces tool sprawl. Onboarding was shockingly fast.",
    author: 'Priya Nair',
    role: 'Operations Lead, Driftwork',
    avatar: 'PN',
    color: 'bg-green-500',
  },
];

const PLANS = [
  {
    name: 'Starter',
    price: { monthly: 10, yearly: 8 },
    desc: 'Perfect for small teams getting started.',
    highlight: false,
    features: [
      'Up to 10 members',
      'Unlimited messages',
      '10 GB storage',
      'Basic AI assistant',
      'Community support',
    ],
  },
  {
    name: 'Business',
    price: { monthly: 25, yearly: 20 },
    desc: 'Everything you need to scale fast.',
    highlight: true,
    badge: 'Most Popular',
    features: [
      'Unlimited members',
      'Unlimited messages & docs',
      '100 GB storage',
      'Advanced AI features',
      'Priority support',
      'Custom integrations',
      'Analytics dashboard',
    ],
  },
  {
    name: 'Enterprise',
    price: { monthly: 35, yearly: 28 },
    desc: 'Advanced security and dedicated support.',
    highlight: false,
    features: [
      'Everything in Business',
      'SSO & SAML',
      'Audit logs',
      'Dedicated SLA',
      'Custom contracts',
      'On-boarding sessions',
      'SLA 99.99% uptime',
    ],
  },
];

const FAQS = [
  { q: 'Can I switch plans anytime?', a: 'Yes. Upgrade or downgrade at any time. Billing is prorated automatically.' },
  { q: 'Is there a free trial?', a: 'Every plan starts with a 14-day free trial — no credit card needed.' },
  { q: 'How is data secured?', a: 'All data is encrypted in transit and at rest. We are SOC 2 Type II certified with optional E2E encryption.' },
  { q: 'Does it integrate with our existing tools?', a: 'Yes — GitHub, Jira, Google Drive, Figma, and 50+ more via our native integrations and Zapier.' },
  { q: 'What are the team size limits?', a: 'Starter supports up to 10 members. Business and Enterprise are unlimited.' },
];

const LOGOS = ['Vercel', 'Stripe', 'Linear', 'Loom', 'Framer', 'Raycast'];

/* ─── Sub-components ────────────────────────────────── */
function Navbar({ onSignIn, onSignUp }) {
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handler = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', handler);
    return () => window.removeEventListener('scroll', handler);
  }, []);

  const links = [
    { label: 'Features', href: '#features' },
    { label: 'How it works', href: '#how' },
    { label: 'Pricing', href: '#pricing' },
    { label: 'FAQ', href: '#faq' },
  ];

  return (
    <header className={cn(
      'fixed top-0 inset-x-0 z-50 transition-all duration-300',
      scrolled ? 'bg-background/90 backdrop-blur-lg border-b border-border shadow-sm' : 'bg-transparent'
    )}>
      <nav className="max-w-6xl mx-auto px-4 sm:px-6 flex items-center justify-between h-16">
        {/* Logo */}
        <a href="#" className="flex items-center gap-2 select-none">
          <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
            <Layers className="w-4 h-4 text-white" />
          </div>
          <span className="font-cal font-bold text-foreground text-lg tracking-tight">OneChat</span>
        </a>

        {/* Desktop links */}
        <div className="hidden md:flex items-center gap-6">
          {links.map(l => (
            <a key={l.href} href={l.href} className="text-sm text-muted-foreground hover:text-foreground transition-colors select-none">
              {l.label}
            </a>
          ))}
        </div>

        {/* Desktop CTAs */}
        <div className="hidden md:flex items-center gap-3">
          <button onClick={onSignIn} className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors select-none">
            Sign in
          </button>
          <button onClick={onSignUp} className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 transition-colors select-none shadow-sm">
            Start Free <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Mobile menu button */}
        <button onClick={() => setOpen(!open)} className="md:hidden p-2 text-foreground select-none">
          {open ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </nav>

      {/* Mobile menu */}
      {open && (
        <div className="md:hidden bg-background border-b border-border px-4 pb-4 space-y-2">
          {links.map(l => (
            <a key={l.href} href={l.href} onClick={() => setOpen(false)}
              className="block py-2 text-sm text-muted-foreground hover:text-foreground select-none">
              {l.label}
            </a>
          ))}
          <button onClick={onSignIn} className="w-full px-4 py-2.5 rounded-lg border border-border text-sm font-medium text-foreground select-none">
            Sign in
          </button>
          <button onClick={onSignUp} className="mt-2 flex items-center justify-center gap-1.5 w-full px-4 py-2.5 rounded-lg bg-primary text-primary-foreground text-sm font-semibold select-none">
            Start Free <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      )}
    </header>
  );
}

function HeroMockup() {
  return (
    <div className="relative w-full max-w-2xl mx-auto mt-12 select-none">
      {/* Glow */}
      <div className="absolute inset-0 -z-10 rounded-2xl bg-gradient-to-br from-primary/30 via-violet-400/20 to-blue-400/20 blur-3xl scale-105" />

      {/* Window shell */}
      <div className="rounded-2xl border border-border bg-card shadow-2xl overflow-hidden">
        {/* Title bar */}
        <div className="flex items-center gap-2 px-4 py-3 border-b border-border bg-muted/30">
          <div className="w-3 h-3 rounded-full bg-red-400" />
          <div className="w-3 h-3 rounded-full bg-yellow-400" />
          <div className="w-3 h-3 rounded-full bg-green-400" />
          <div className="flex-1 mx-4 h-5 rounded-md bg-muted" />
        </div>

        {/* App layout */}
        <div className="flex h-64 sm:h-80">
          {/* Sidebar */}
          <div className="w-40 border-r border-border bg-muted/20 p-3 space-y-1.5 hidden sm:block">
            {['# general', '# design', '# engineering', '# announcements'].map((c, i) => (
              <div key={c} className={cn('text-xs px-2 py-1.5 rounded', i === 0 ? 'bg-primary/10 text-primary font-semibold' : 'text-muted-foreground')}>
                {c}
              </div>
            ))}
            <div className="mt-3 pt-2 border-t border-border">
              <div className="text-xs text-muted-foreground px-2 mb-1">PAGES</div>
              {['📋 Roadmap', '📝 Meeting notes'].map(p => (
                <div key={p} className="text-xs px-2 py-1.5 rounded text-muted-foreground">{p}</div>
              ))}
            </div>
          </div>

          {/* Messages */}
          <div className="flex-1 flex flex-col">
            <div className="flex-1 p-3 space-y-3 overflow-hidden">
              {[
                { name: 'Alex', msg: 'Just pushed the new design system to staging 🎉', color: 'bg-violet-500', mine: false },
                { name: 'Sam', msg: 'Looks great! The typography is much cleaner.', color: 'bg-blue-500', mine: false },
                { name: 'You', msg: 'Agreed. Merging to main now.', color: 'bg-primary', mine: true },
              ].map((m, i) => (
                <div key={i} className={cn('flex gap-2', m.mine && 'flex-row-reverse')}>
                  <div className={cn('w-6 h-6 rounded-full flex items-center justify-center text-white text-xs font-bold shrink-0', m.color)}>
                    {m.name[0]}
                  </div>
                  <div className={cn('max-w-[70%] text-xs px-3 py-2 rounded-xl', m.mine ? 'bg-primary text-primary-foreground rounded-tr-sm' : 'bg-muted text-foreground rounded-tl-sm')}>
                    {m.msg}
                  </div>
                </div>
              ))}
            </div>
            {/* Input bar */}
            <div className="px-3 py-2 border-t border-border">
              <div className="flex items-center gap-2 bg-muted rounded-lg px-3 py-2">
                <span className="text-xs text-muted-foreground flex-1">Message #general</span>
                <div className="w-5 h-5 bg-primary rounded flex items-center justify-center">
                  <ArrowRight className="w-2.5 h-2.5 text-white" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Floating badges */}
      <div className="absolute -top-4 -right-4 bg-green-500 text-white text-xs font-semibold px-3 py-1.5 rounded-full shadow-lg flex items-center gap-1.5 animate-bounce">
        <div className="w-2 h-2 rounded-full bg-white" />
        Live Sync
      </div>
      <div className="absolute -bottom-4 -left-4 bg-card border border-border shadow-lg rounded-xl px-3 py-2 text-xs font-semibold text-foreground flex items-center gap-2">
        <Sparkles className="w-3.5 h-3.5 text-primary" />
        AI summarized 12 messages
      </div>
    </div>
  );
}

function PricingCard({ plan, isYearly, onSignUp }) {
  const price = isYearly ? plan.price.yearly : plan.price.monthly;
  return (
    <div className={cn(
      'relative flex flex-col rounded-2xl border p-6 transition-all duration-300 hover:shadow-xl',
      plan.highlight
        ? 'border-primary bg-primary text-primary-foreground shadow-lg shadow-primary/20 scale-105'
        : 'border-border bg-card hover:border-primary/40'
    )}>
      {plan.badge && (
        <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 bg-primary-foreground text-primary text-xs font-bold rounded-full shadow">
          {plan.badge}
        </div>
      )}
      <div className="mb-4">
        <p className={cn('text-sm font-semibold uppercase tracking-wider mb-1', plan.highlight ? 'text-primary-foreground/70' : 'text-muted-foreground')}>
          {plan.name}
        </p>
        <div className="flex items-end gap-1">
          <span className="text-4xl font-cal font-bold">${price}</span>
          <span className={cn('text-sm mb-1', plan.highlight ? 'text-primary-foreground/70' : 'text-muted-foreground')}>/mo</span>
        </div>
        {isYearly && (
          <p className={cn('text-xs mt-1', plan.highlight ? 'text-primary-foreground/70' : 'text-green-600 dark:text-green-400')}>
            Save ${(plan.price.monthly - plan.price.yearly) * 12}/yr
          </p>
        )}
        <p className={cn('text-sm mt-2', plan.highlight ? 'text-primary-foreground/80' : 'text-muted-foreground')}>{plan.desc}</p>
      </div>
      <ul className="space-y-2.5 flex-1 mb-6">
        {plan.features.map(f => (
          <li key={f} className="flex items-start gap-2 text-sm">
            <Check className={cn('w-4 h-4 mt-0.5 shrink-0', plan.highlight ? 'text-primary-foreground' : 'text-primary')} />
            <span className={plan.highlight ? 'text-primary-foreground/90' : 'text-foreground'}>{f}</span>
          </li>
        ))}
      </ul>
      <button
        onClick={onSignUp}
        className={cn(
          'w-full text-center py-2.5 rounded-xl font-semibold text-sm transition-all select-none',
          plan.highlight
            ? 'bg-primary-foreground text-primary hover:bg-primary-foreground/90'
            : 'bg-primary text-primary-foreground hover:bg-primary/90'
        )}
      >
        Get Started
      </button>
    </div>
  );
}

function FAQItem({ q, a }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border-b border-border last:border-0">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center justify-between w-full py-4 text-left select-none group"
      >
        <span className="font-medium text-foreground text-sm sm:text-base">{q}</span>
        <ChevronDown className={cn('w-4 h-4 text-muted-foreground transition-transform shrink-0 ml-4', open && 'rotate-180')} />
      </button>
      {open && (
        <p className="pb-4 text-sm text-muted-foreground leading-relaxed">{a}</p>
      )}
    </div>
  );
}

/* ─── Main Page ─────────────────────────────────────── */
export default function Landing() {
  const navigate = useNavigate();
  const [isYearly, setIsYearly] = useState(false);

  const openAuthPage = (path) => {
    navigate(path, { state: { fromLanding: true } });
  };

  return (
    <div className="min-h-screen bg-background text-foreground overflow-x-hidden">
      <Navbar
        onSignIn={() => openAuthPage('/signin')}
        onSignUp={() => openAuthPage('/signup')}
      />

      {/* ── Hero ─────────────────────────────────────── */}
      <section className="relative pt-32 pb-20 sm:pt-40 sm:pb-28 px-4 sm:px-6 text-center overflow-hidden">
        {/* Background gradient */}
        <div className="absolute inset-0 -z-10 bg-gradient-to-b from-accent/40 via-background to-background" />
        <div className="absolute top-20 left-1/2 -translate-x-1/2 w-[600px] h-[600px] rounded-full bg-primary/5 blur-3xl -z-10" />

        <Reveal>
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-primary/30 bg-primary/5 text-primary text-xs font-semibold mb-6">
            <Zap className="w-3.5 h-3.5" /> New: AI-powered meeting summaries →
          </div>
        </Reveal>

        <Reveal delay={80}>
          <h1 className="font-cal text-4xl sm:text-6xl lg:text-7xl font-bold text-foreground leading-[1.08] tracking-tight max-w-4xl mx-auto">
            One workspace.<br />
            <span className="text-primary">Every tool your team needs.</span>
          </h1>
        </Reveal>

        <Reveal delay={160}>
          <p className="mt-6 text-lg sm:text-xl text-muted-foreground max-w-2xl mx-auto leading-relaxed">
            Replace Slack, Notion, and Asana with a single real-time platform.
            Chat, docs, tasks and AI — all in one tab, always in sync.
          </p>
        </Reveal>

        <Reveal delay={240}>
          <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-3">
            <button onClick={() => openAuthPage('/signup')} className="inline-flex items-center gap-2 px-6 py-3.5 rounded-xl bg-primary text-primary-foreground font-semibold hover:bg-primary/90 transition-all shadow-lg shadow-primary/25 select-none text-sm sm:text-base">
              Start Free Trial <ArrowRight className="w-4 h-4" />
            </button>
            <a href="#features" className="inline-flex items-center gap-2 px-6 py-3.5 rounded-xl border border-border bg-card text-foreground font-semibold hover:bg-muted transition-all select-none text-sm sm:text-base">
              <Play className="w-4 h-4" /> Book a Demo
            </a>
          </div>
          <p className="mt-3 text-xs text-muted-foreground">No credit card required · 14-day free trial · Cancel anytime</p>
        </Reveal>

        <Reveal delay={320}>
          <HeroMockup />
        </Reveal>
      </section>

      {/* ── Social Proof Logos ───────────────────────── */}
      <section className="py-12 border-y border-border bg-muted/20">
        <div className="max-w-5xl mx-auto px-4 sm:px-6">
          <p className="text-center text-xs font-semibold text-muted-foreground uppercase tracking-widest mb-8">
            Trusted by teams at
          </p>
          <div className="flex flex-wrap justify-center items-center gap-8 sm:gap-12">
            {LOGOS.map(l => (
              <div key={l} className="text-base font-cal font-bold text-muted-foreground/50 hover:text-muted-foreground transition-colors select-none">
                {l}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Features ────────────────────────────────── */}
      <section id="features" className="py-24 px-4 sm:px-6">
        <div className="max-w-6xl mx-auto">
          <Reveal>
            <div className="text-center mb-16">
              <p className="text-primary text-sm font-semibold uppercase tracking-widest mb-3">Features</p>
              <h2 className="font-cal text-3xl sm:text-5xl font-bold text-foreground">Everything in one place.</h2>
              <p className="mt-4 text-lg text-muted-foreground max-w-xl mx-auto">No more tab juggling. Every feature your team reaches for, now living under one roof.</p>
            </div>
          </Reveal>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {FEATURES.map((f, i) => {
              const Icon = f.icon;
              return (
                <Reveal key={f.title} delay={i * 60}>
                  <div className="group p-6 rounded-2xl border border-border bg-card hover:border-primary/40 hover:shadow-lg transition-all duration-300">
                    <div className={cn('w-10 h-10 rounded-xl flex items-center justify-center mb-4', f.bg)}>
                      <Icon className={cn('w-5 h-5', f.color)} />
                    </div>
                    <h3 className="font-semibold text-foreground mb-2">{f.title}</h3>
                    <p className="text-sm text-muted-foreground leading-relaxed">{f.desc}</p>
                  </div>
                </Reveal>
              );
            })}
          </div>
        </div>
      </section>

      {/* ── How It Works ────────────────────────────── */}
      <section id="how" className="py-24 px-4 sm:px-6 bg-muted/30">
        <div className="max-w-4xl mx-auto">
          <Reveal>
            <div className="text-center mb-16">
              <p className="text-primary text-sm font-semibold uppercase tracking-widest mb-3">How it works</p>
              <h2 className="font-cal text-3xl sm:text-5xl font-bold text-foreground">Up and running in minutes.</h2>
            </div>
          </Reveal>
          <div className="grid sm:grid-cols-3 gap-8">
            {STEPS.map((s, i) => (
              <Reveal key={s.num} delay={i * 80}>
                <div className="text-center">
                  <div className="text-5xl font-cal font-bold text-primary/20 mb-4">{s.num}</div>
                  <h3 className="font-semibold text-foreground mb-2">{s.title}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">{s.desc}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ── Testimonials ────────────────────────────── */}
      <section className="py-24 px-4 sm:px-6">
        <div className="max-w-6xl mx-auto">
          <Reveal>
            <div className="text-center mb-16">
              <p className="text-primary text-sm font-semibold uppercase tracking-widest mb-3">Testimonials</p>
              <h2 className="font-cal text-3xl sm:text-5xl font-bold text-foreground">Loved by teams worldwide.</h2>
            </div>
          </Reveal>
          <div className="grid sm:grid-cols-3 gap-6">
            {TESTIMONIALS.map((t, i) => (
              <Reveal key={t.author} delay={i * 80}>
                <div className="p-6 rounded-2xl border border-border bg-card hover:shadow-lg transition-all">
                  <div className="flex gap-1 mb-4">
                    {Array(5).fill(0).map((_, i) => <Star key={i} className="w-4 h-4 fill-yellow-400 text-yellow-400" />)}
                  </div>
                  <p className="text-sm text-foreground leading-relaxed mb-5">"{t.quote}"</p>
                  <div className="flex items-center gap-3">
                    <div className={cn('w-9 h-9 rounded-full flex items-center justify-center text-white text-xs font-bold', t.color)}>
                      {t.avatar}
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-foreground">{t.author}</p>
                      <p className="text-xs text-muted-foreground">{t.role}</p>
                    </div>
                  </div>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ── Product Preview ──────────────────────────── */}
      <section className="py-24 px-4 sm:px-6 bg-gradient-to-b from-accent/20 to-background">
        <div className="max-w-5xl mx-auto text-center">
          <Reveal>
            <p className="text-primary text-sm font-semibold uppercase tracking-widest mb-3">Product Preview</p>
            <h2 className="font-cal text-3xl sm:text-5xl font-bold text-foreground mb-4">Built for how teams actually work.</h2>
            <p className="text-muted-foreground max-w-xl mx-auto mb-12">Real-time editing, instant messaging, and task management — seamlessly connected in a single view.</p>
          </Reveal>
          <Reveal delay={80}>
            <div className="rounded-2xl border border-border bg-card shadow-2xl overflow-hidden">
              <div className="flex items-center gap-2 px-4 py-3 border-b border-border bg-muted/30">
                <div className="w-3 h-3 rounded-full bg-red-400" />
                <div className="w-3 h-3 rounded-full bg-yellow-400" />
                <div className="w-3 h-3 rounded-full bg-green-400" />
                <div className="flex-1 mx-8 h-5 rounded-md bg-muted" />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 divide-y sm:divide-y-0 sm:divide-x divide-border">
                {[
                  { icon: MessageSquare, label: 'Team Chat', color: 'text-blue-500', bg: 'bg-blue-50 dark:bg-blue-500/10', lines: ['# general', '# engineering', '# product', '# design'] },
                  { icon: FileText, label: 'Documents', color: 'text-violet-500', bg: 'bg-violet-50 dark:bg-violet-500/10', lines: ['📋 Q2 Roadmap', '📝 Sprint Notes', '🎯 OKRs 2026', '💡 Ideas'] },
                  { icon: CheckSquare, label: 'Tasks', color: 'text-green-500', bg: 'bg-green-50 dark:bg-green-500/10', lines: ['⬜ Design review', '🔄 API integration', '✅ Deploy v2.1', '⬜ Write specs'] },
                ].map(panel => {
                  const Icon = panel.icon;
                  return (
                    <div key={panel.label} className="p-5">
                      <div className={cn('inline-flex items-center gap-2 px-3 py-1.5 rounded-lg mb-3', panel.bg)}>
                        <Icon className={cn('w-4 h-4', panel.color)} />
                        <span className={cn('text-xs font-semibold', panel.color)}>{panel.label}</span>
                      </div>
                      <div className="space-y-2">
                        {panel.lines.map(l => (
                          <div key={l} className="text-xs text-muted-foreground py-1.5 px-2 rounded hover:bg-muted transition-colors cursor-default">{l}</div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </Reveal>
        </div>
      </section>

      {/* ── Pricing ──────────────────────────────────── */}
      <section id="pricing" className="py-24 px-4 sm:px-6">
        <div className="max-w-5xl mx-auto">
          <Reveal>
            <div className="text-center mb-12">
              <p className="text-primary text-sm font-semibold uppercase tracking-widest mb-3">Pricing</p>
              <h2 className="font-cal text-3xl sm:text-5xl font-bold text-foreground mb-4">Simple, transparent pricing.</h2>
              <p className="text-muted-foreground max-w-md mx-auto mb-8">Start free. Scale as you grow. No hidden fees.</p>

              {/* Toggle */}
              <div className="inline-flex items-center gap-3 bg-muted p-1 rounded-xl">
                <button onClick={() => setIsYearly(false)} className={cn('px-4 py-1.5 rounded-lg text-sm font-medium transition-all select-none', !isYearly ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground')}>Monthly</button>
                <button onClick={() => setIsYearly(true)} className={cn('px-4 py-1.5 rounded-lg text-sm font-medium transition-all select-none', isYearly ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground')}>
                  Yearly <span className="ml-1 text-xs text-green-600 dark:text-green-400 font-semibold">-20%</span>
                </button>
              </div>
            </div>
          </Reveal>
          <div className="grid sm:grid-cols-3 gap-6 items-start">
            {PLANS.map((plan, i) => (
              <Reveal key={plan.name} delay={i * 80}>
                <PricingCard plan={plan} isYearly={isYearly} onSignUp={() => openAuthPage('/signup')} />
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ── FAQ ──────────────────────────────────────── */}
      <section id="faq" className="py-24 px-4 sm:px-6 bg-muted/20">
        <div className="max-w-2xl mx-auto">
          <Reveal>
            <div className="text-center mb-12">
              <p className="text-primary text-sm font-semibold uppercase tracking-widest mb-3">FAQ</p>
              <h2 className="font-cal text-3xl sm:text-4xl font-bold text-foreground">Common questions.</h2>
            </div>
          </Reveal>
          <Reveal delay={80}>
            <div className="bg-card border border-border rounded-2xl px-6">
              {FAQS.map(f => <FAQItem key={f.q} {...f} />)}
            </div>
          </Reveal>
        </div>
      </section>

      {/* ── Final CTA ────────────────────────────────── */}
      <section className="py-24 px-4 sm:px-6">
        <Reveal>
          <div className="max-w-3xl mx-auto text-center bg-gradient-to-br from-primary to-violet-600 rounded-3xl p-12 sm:p-16 shadow-2xl shadow-primary/30">
            <h2 className="font-cal text-3xl sm:text-5xl font-bold text-white mb-4">
              Ready to unify your team?
            </h2>
            <p className="text-white/75 text-lg mb-10 max-w-xl mx-auto">
              Join thousands of teams who replaced their tool stack with OneChat. Start free today.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <button onClick={() => openAuthPage('/signup')} className="inline-flex items-center justify-center gap-2 px-8 py-3.5 rounded-xl bg-white text-primary font-semibold hover:bg-white/90 transition-all select-none shadow-lg text-sm sm:text-base">
                Start Free Trial <ArrowRight className="w-4 h-4" />
              </button>
              <a href="#pricing" className="inline-flex items-center justify-center gap-2 px-8 py-3.5 rounded-xl border border-white/30 text-white font-semibold hover:bg-white/10 transition-all select-none text-sm sm:text-base">
                View Pricing
              </a>
            </div>
            <p className="mt-4 text-white/50 text-xs">No credit card required · Cancel anytime</p>
          </div>
        </Reveal>
      </section>

      {/* ── Footer ───────────────────────────────────── */}
      <footer className="border-t border-border bg-muted/20 py-12 px-4 sm:px-6">
        <div className="max-w-6xl mx-auto">
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-8 mb-10">
            <div className="col-span-2 sm:col-span-1">
              <div className="flex items-center gap-2 mb-3 select-none">
                <div className="w-7 h-7 bg-primary rounded-lg flex items-center justify-center">
                  <Layers className="w-3.5 h-3.5 text-white" />
                </div>
                <span className="font-cal font-bold text-foreground">OneChat</span>
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed">Real-time collaboration for modern teams.</p>
            </div>
            {[
              { title: 'Product', links: ['Features', 'Pricing', 'Changelog', 'Roadmap'] },
              { title: 'Company', links: ['About', 'Blog', 'Careers', 'Press'] },
              { title: 'Resources', links: ['Docs', 'API', 'Status', 'Community'] },
              { title: 'Legal', links: ['Privacy', 'Terms', 'Security', 'Cookies'] },
            ].map(col => (
              <div key={col.title}>
                <p className="text-xs font-semibold text-foreground uppercase tracking-wider mb-3">{col.title}</p>
                <ul className="space-y-2">
                  {col.links.map(l => (
                    <li key={l}><a href="#" className="text-xs text-muted-foreground hover:text-foreground transition-colors select-none">{l}</a></li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-8 border-t border-border">
            <p className="text-xs text-muted-foreground">© 2026 OneChat. All rights reserved.</p>
            <div className="flex items-center gap-4">
              {['Twitter', 'GitHub', 'LinkedIn'].map(s => (
                <a key={s} href="#" className="text-xs text-muted-foreground hover:text-foreground transition-colors select-none">{s}</a>
              ))}
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
