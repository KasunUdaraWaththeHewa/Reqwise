import { Link } from 'react-router-dom';
import { ArrowRight, CheckCircle2, Clock3, Command, Database, Rocket, ShieldCheck, Sparkles, Zap } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

const coreFeatures = [
  {
    title: 'Complete request workflow',
    description: 'Compose GET, POST, PUT, DELETE, and PATCH calls with URL, params, headers, and JSON/text body editors.',
    icon: Rocket,
  },
  {
    title: 'Power-user productivity',
    description: 'Use command palette, keyboard shortcuts, and clipboard-first table editing for rapid iteration.',
    icon: Command,
  },
  {
    title: 'Load testing and scheduling',
    description: 'Run concurrent bursts with percentile metrics and automate recurring calls with run controls.',
    icon: Clock3,
  },
  {
    title: 'Local-first persistence',
    description: 'Keep requests, collections, and workspace state reliably stored in your browser using IndexedDB + Zustand.',
    icon: Database,
  },
];

const workflowSteps = [
  {
    title: 'Build requests faster',
    description: 'Create requests with smart defaults, auth presets, and reusable collections in seconds.',
  },
  {
    title: 'Inspect responses clearly',
    description: 'Review headers, status, timing, and body output in one focused response workspace.',
  },
  {
    title: 'Scale confidence',
    description: 'Stress test APIs with parallel runs and share generated fetch scripts with your team.',
  },
];

const Home = () => {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-16 px-6 py-10 md:px-10 lg:py-16">
        <header className="rounded-2xl border border-border bg-card/70 p-6 shadow-xl shadow-black/20 backdrop-blur md:p-10">
          <div className="flex flex-col gap-6">
            <div className="flex flex-wrap items-center gap-3">
              <Badge variant="secondary" className="border border-primary/30 bg-primary/15 text-primary">
                Dark-first API workspace
              </Badge>
              <Badge variant="outline" className="text-muted-foreground">
                Built with React + Vite + Zustand
              </Badge>
            </div>

            <div className="space-y-4">
              <h1 className="max-w-4xl text-3xl font-semibold leading-tight tracking-tight sm:text-4xl lg:text-5xl">
                A modern API workspace that helps your team build, validate, and monitor endpoints with confidence.
              </h1>
              <p className="max-w-3xl text-sm text-muted-foreground sm:text-base">
                Reqwise combines the speed of a developer-first tool with the clarity of a polished product experience. From quick debugging
                to load-test validation, your full workflow lives in one elegant interface.
              </p>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row">
              <Button asChild size="lg" className="group">
                <Link to="/reqwise">
                  Open Reqwise
                  <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
                </Link>
              </Button>
              <Button asChild size="lg" variant="secondary">
                <a href="#features">Explore features</a>
              </Button>
            </div>
          </div>
        </header>

        <section id="features" className="grid gap-4 md:grid-cols-2">
          {coreFeatures.map(({ title, description, icon: Icon }) => (
            <Card key={title} className="border-border/90 bg-card/70 transition-colors hover:border-primary/40">
              <CardHeader className="space-y-3 pb-2">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg border border-primary/35 bg-primary/10 text-primary">
                  <Icon className="h-5 w-5" />
                </div>
                <CardTitle className="text-lg">{title}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">{description}</p>
              </CardContent>
            </Card>
          ))}
        </section>

        <section className="grid gap-4 rounded-2xl border border-border bg-card/50 p-6 md:grid-cols-3 md:p-8">
          {workflowSteps.map((step) => (
            <div key={step.title} className="space-y-2 rounded-xl border border-border/70 bg-background/50 p-4">
              <div className="flex items-center gap-2 text-primary">
                <CheckCircle2 className="h-4 w-4" />
                <p className="text-xs font-medium uppercase tracking-wider">Workflow</p>
              </div>
              <h2 className="text-base font-semibold">{step.title}</h2>
              <p className="text-sm text-muted-foreground">{step.description}</p>
            </div>
          ))}
        </section>

        <section className="grid gap-4 rounded-2xl border border-border bg-card/50 p-6 md:grid-cols-3 md:p-8">
          <div>
            <h2 className="text-xl font-semibold">Why Reqwise</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              Reqwise combines intuitive UX with developer depth so the same workspace works for fast debugging and advanced API validation.
            </p>
          </div>

          <div className="space-y-4 md:col-span-2">
            <div className="flex items-start gap-3">
              <Zap className="mt-0.5 h-4 w-4 text-primary" />
              <p className="text-sm text-muted-foreground">Generate runnable Node.js fetch scripts directly from active request configuration.</p>
            </div>
            <div className="flex items-start gap-3">
              <ShieldCheck className="mt-0.5 h-4 w-4 text-primary" />
              <p className="text-sm text-muted-foreground">Use one-click auth helpers for Bearer, Basic, and API key headers.</p>
            </div>
            <div className="flex items-start gap-3">
              <Command className="mt-0.5 h-4 w-4 text-primary" />
              <p className="text-sm text-muted-foreground">Navigate requests quickly with keyboard-first search and editing controls.</p>
            </div>
          </div>
        </section>

        <section className="rounded-2xl border border-primary/25 bg-primary/5 p-6 md:p-8">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="mb-2 inline-flex items-center gap-2 text-xs font-medium uppercase tracking-[0.2em] text-primary">
                <Sparkles className="h-4 w-4" />
                Ready to start?
              </p>
              <h2 className="text-2xl font-semibold tracking-tight">Open the Reqwise tool and launch your next API test flow.</h2>
              <p className="mt-2 text-sm text-muted-foreground">You can always return to this page from inside the tool using the Home button.</p>
            </div>
            <Button asChild size="lg" className="md:min-w-48">
              <Link to="/reqwise">
                Launch workspace
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </div>
        </section>
      </div>
    </div>
  );
};

export default Home;
