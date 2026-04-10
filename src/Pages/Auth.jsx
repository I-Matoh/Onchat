import { useState } from 'react';
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { ArrowRight, Layers } from 'lucide-react';
import { db } from '@/api/supabaseAdapter';
import { useAuth } from '@/lib/AuthContext';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

function AuthShell({ title, subtitle, children, footer }) {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="grid min-h-screen lg:grid-cols-[1.1fr_0.9fr]">
        <section className="relative hidden overflow-hidden bg-gradient-to-br from-primary via-primary/90 to-orange-500 p-12 text-white lg:flex lg:flex-col lg:justify-between">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(255,255,255,0.24),transparent_35%),radial-gradient(circle_at_bottom_right,rgba(255,255,255,0.18),transparent_30%)]" />
          <div className="relative">
            <Link to="/" className="inline-flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/15 backdrop-blur-sm">
                <Layers className="h-5 w-5" />
              </div>
              <span className="font-cal text-xl font-bold tracking-tight">OneChat</span>
            </Link>
          </div>
          <div className="relative max-w-md">
            <p className="mb-4 text-sm font-semibold uppercase tracking-[0.3em] text-white/70">Collaboration, unified</p>
            <h1 className="font-cal text-5xl font-bold leading-tight">Work, chat, tasks, and AI in one shared space.</h1>
            <p className="mt-5 text-base leading-7 text-white/80">
              Keep your team aligned with a single workspace that feels fast, focused, and easy to adopt.
            </p>
          </div>
          <div className="relative text-sm text-white/70">Secure authentication powered by Supabase.</div>
        </section>

        <section className="flex items-center justify-center px-4 py-10 sm:px-6 lg:px-12">
          <div className="w-full max-w-md">
            <Link to="/" className="mb-8 inline-flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground lg:hidden">
              <Layers className="h-4 w-4" />
              OneChat
            </Link>
            <div className="rounded-3xl border border-border bg-card p-8 shadow-xl shadow-primary/5">
              <div className="mb-8">
                <h2 className="font-cal text-3xl font-bold tracking-tight">{title}</h2>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">{subtitle}</p>
              </div>
              {children}
              <div className="mt-6 text-sm text-muted-foreground">{footer}</div>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}

function AuthFormField({ label, ...props }) {
  return (
    <label className="block space-y-2">
      <span className="text-sm font-medium text-foreground">{label}</span>
      <Input {...props} />
    </label>
  );
}

export function SignInPage() {
  const { isAuthenticated, isLoadingAuth, isLoadingPublicSettings } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isLoadingAuth && !isLoadingPublicSettings && isAuthenticated) {
    return <Navigate to="/" replace />;
  }

  if (!location.state?.fromLanding) {
    return <Navigate to="/" replace />;
  }

  const redirectTarget = new URLSearchParams(location.search).get('redirect') || '/';

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');
    setIsSubmitting(true);

    try {
      await db.auth.login({ email, password });
      window.location.href = redirectTarget;
    } catch (submitError) {
      setError(submitError.message || 'Unable to sign in. Please check your credentials and try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AuthShell
      title="Sign in"
      subtitle="Pick up where you left off and get back into your workspace."
      footer={(
        <>
          New to OneChat?{' '}
          <button
            type="button"
            onClick={() => navigate(`/signup?redirect=${encodeURIComponent(redirectTarget)}`, { state: { fromLanding: true } })}
            className="font-medium text-primary hover:underline"
          >
            Create an account
          </button>
        </>
      )}
    >
      <form onSubmit={handleSubmit} className="space-y-5">
        <AuthFormField
          label="Email"
          type="email"
          autoComplete="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          placeholder="you@company.com"
          required
        />
        <AuthFormField
          label="Password"
          type="password"
          autoComplete="current-password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          placeholder="Enter your password"
          required
        />
        {error ? <p className="text-sm text-destructive">{error}</p> : null}
        <Button type="submit" size="lg" className="w-full rounded-xl" disabled={isSubmitting}>
          {isSubmitting ? 'Signing in...' : 'Sign in'}
          {!isSubmitting ? <ArrowRight className="h-4 w-4" /> : null}
        </Button>
      </form>
    </AuthShell>
  );
}

export function SignUpPage() {
  const { isAuthenticated, isLoadingAuth, isLoadingPublicSettings } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isLoadingAuth && !isLoadingPublicSettings && isAuthenticated) {
    return <Navigate to="/" replace />;
  }

  if (!location.state?.fromLanding) {
    return <Navigate to="/" replace />;
  }

  const redirectTarget = new URLSearchParams(location.search).get('redirect') || window.location.origin;

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');
    setSuccess('');

    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setIsSubmitting(true);

    try {
      const { user, session } = await db.auth.signup({
        email,
        password,
        fullName,
        redirectTo: redirectTarget,
      });

      if (session) {
        window.location.href = '/';
        return;
      }

      if (user) {
        setSuccess('Account created. Check your email to confirm your address, then sign in.');
      }
    } catch (submitError) {
      setError(submitError.message || 'Unable to create your account right now.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AuthShell
      title="Create your account"
      subtitle="Start your free trial and invite your team when you are ready."
      footer={(
        <>
          Already have an account?{' '}
          <button
            type="button"
            onClick={() => navigate(`/signin?redirect=${encodeURIComponent(redirectTarget)}`, { state: { fromLanding: true } })}
            className="font-medium text-primary hover:underline"
          >
            Sign in
          </button>
        </>
      )}
    >
      <form onSubmit={handleSubmit} className="space-y-5">
        <AuthFormField
          label="Full name"
          type="text"
          autoComplete="name"
          value={fullName}
          onChange={(event) => setFullName(event.target.value)}
          placeholder="Jane Doe"
        />
        <AuthFormField
          label="Email"
          type="email"
          autoComplete="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          placeholder="you@company.com"
          required
        />
        <AuthFormField
          label="Password"
          type="password"
          autoComplete="new-password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          placeholder="Create a password"
          required
        />
        <AuthFormField
          label="Confirm password"
          type="password"
          autoComplete="new-password"
          value={confirmPassword}
          onChange={(event) => setConfirmPassword(event.target.value)}
          placeholder="Re-enter your password"
          required
        />
        {error ? <p className="text-sm text-destructive">{error}</p> : null}
        {success ? <p className="text-sm text-green-600">{success}</p> : null}
        <Button type="submit" size="lg" className="w-full rounded-xl" disabled={isSubmitting}>
          {isSubmitting ? 'Creating account...' : 'Start free trial'}
          {!isSubmitting ? <ArrowRight className="h-4 w-4" /> : null}
        </Button>
      </form>
    </AuthShell>
  );
}
