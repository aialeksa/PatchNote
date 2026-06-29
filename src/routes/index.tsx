import { createFileRoute } from "@tanstack/react-router";
import { createServerFn } from "@tanstack/react-start";
import { readFile } from "node:fs/promises";
import { useState } from "react";

const getBusinessName = createServerFn({ method: "GET" }).handler(async () => {
  try {
    const cfg = JSON.parse(await readFile("site.json", "utf8")) as {
      businessName?: string;
    };
    return cfg.businessName?.trim() ?? "";
  } catch {
    return "";
  }
});

const getWaitlistCount = createServerFn({ method: "GET" }).handler(async () => {
  try {
    const { execSync } = await import("node:child_process");
    const result = execSync(
      `team-db "SELECT COUNT(*) as count FROM waitlist"`,
      { encoding: "utf8" }
    );
    const rows = JSON.parse(result);
    return rows[0]?.count ?? 0;
  } catch {
    return 0;
  }
});

const joinWaitlist = createServerFn({ method: "POST" }).handler(async (ctx) => {
  const data = await ctx.request.json();
  const email = data.email?.trim().toLowerCase();
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return { success: false, error: "Invalid email" };
  }
  try {
    const { execSync } = await import("node:child_process");
    execSync(
      `team-db "INSERT OR IGNORE INTO waitlist (email) VALUES ('${email.replace(/'/g, "''")}')"`,
      { encoding: "utf8" }
    );
    return { success: true };
  } catch {
    return { success: false, error: "Something went wrong" };
  }
});

export const Route = createFileRoute("/")({
  loader: () => Promise.all([getBusinessName(), getWaitlistCount()]),
  component: Home,
});

function Home() {
  const [businessName, waitlistCount] = Route.useLoaderData();
  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!email) return;
    const result = await joinWaitlist({ data: { email } });
    if (result.success) {
      setSubmitted(true);
    } else {
      setError(result.error || "Something went wrong");
    }
  };

  return (
    <div className="min-h-dvh bg-white text-gray-900">
      {/* Navigation */}
      <header className="sticky top-0 z-50 border-b border-gray-100 bg-white/80 backdrop-blur-md">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-2">
            <span className="text-2xl">📝</span>
            <span className="text-lg font-bold tracking-tight">{businessName}</span>
          </div>
          <nav className="hidden items-center gap-8 text-sm font-medium text-gray-600 sm:flex">
            <a href="#features" className="hover:text-gray-900">Features</a>
            <a href="#how-it-works" className="hover:text-gray-900">How it works</a>
            <a href="#pricing" className="hover:text-gray-900">Pricing</a>
          </nav>
          <a
            href="#waitlist"
            className="rounded-full bg-gray-900 px-5 py-2 text-sm font-semibold text-white hover:bg-gray-800 transition-colors"
          >
            Get early access
          </a>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative overflow-hidden px-6 pt-24 pb-32 sm:pt-32 sm:pb-40">
        <div className="absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_top_right,_#e0e7ff_0%,_transparent_50%),radial-gradient(ellipse_at_bottom_left,_#f0fdf4_0%,_transparent_50%)]" />
        <div className="mx-auto max-w-4xl text-center">
          <span className="inline-block rounded-full bg-indigo-50 px-4 py-1.5 text-sm font-medium text-indigo-700 mb-8 border border-indigo-100">
            ✨ Stop writing release notes. Let AI do it.
          </span>
          <h1 className="text-5xl font-bold tracking-tight text-gray-900 sm:text-7xl leading-[1.1]">
            Release notes that{" "}
            <span className="bg-gradient-to-r from-indigo-600 to-emerald-500 bg-clip-text text-transparent">
              write themselves
            </span>
          </h1>
          <p className="mt-6 text-xl text-gray-600 max-w-2xl mx-auto leading-relaxed">
            PatchNotes ingests your git commits, PR descriptions, and Jira tickets,
            then auto-generates polished changelogs in multiple formats and publishes
            them everywhere — on every deploy. One less thing to skip.
          </p>
          <div className="mt-10 flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
            <a
              href="#waitlist"
              className="rounded-full bg-gray-900 px-8 py-3.5 text-base font-semibold text-white hover:bg-gray-800 transition-colors shadow-lg shadow-gray-900/20"
            >
              Join the waitlist
            </a>
            <a
              href="#how-it-works"
              className="rounded-full border border-gray-200 px-8 py-3.5 text-base font-medium text-gray-700 hover:bg-gray-50 transition-colors"
            >
              See how it works
            </a>
          </div>
          <p className="mt-6 text-sm text-gray-400">
            No credit card required. Early access pricing available.
          </p>
        </div>
      </section>

      {/* Social Proof / Stats Bar */}
      <section className="border-y border-gray-100 bg-gray-50/50">
        <div className="mx-auto max-w-5xl px-6 py-10">
          <div className="grid grid-cols-2 gap-8 sm:grid-cols-3 text-center">
            <div>
              <p className="text-3xl font-bold text-gray-900">3min</p>
              <p className="text-sm text-gray-500">Avg. time saved per release</p>
            </div>
            <div>
              <p className="text-3xl font-bold text-gray-900">100%</p>
              <p className="text-sm text-gray-500">Auto-generated from your code</p>
            </div>
            <div className="col-span-2 sm:col-span-1">
              <p className="text-3xl font-bold text-gray-900">{waitlistCount}+</p>
              <p className="text-sm text-gray-500">Engineers waiting for early access</p>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="px-6 py-24 sm:py-32">
        <div className="mx-auto max-w-6xl">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold tracking-tight text-gray-900 sm:text-5xl">
              Everything you need to ship better changelogs
            </h2>
            <p className="mt-4 text-lg text-gray-600 max-w-2xl mx-auto">
              No more copy-pasting from Slack, no more "did we ship that yet?" — just clean,
              professional release notes every single deploy.
            </p>
          </div>
          <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
            <FeatureCard
              icon="🔗"
              title="Git-native"
              description="Connects directly to your GitHub, GitLab, or Bitbucket repos. Reads commits, PRs, and merge messages — no extra tagging."
            />
            <FeatureCard
              icon="🎭"
              title="Multiple tones"
              description="Generate developer release notes, customer-facing summaries, and marketing snippets from the same deploy. Each audience gets the right message."
            />
            <FeatureCard
              icon="📬"
              title="Multi-channel publish"
              description="Push to your changelog page, Slack, email list, and social media in one click. Or use our API for custom integrations."
            />
            <FeatureCard
              icon="🤖"
              title="Jira + Linear aware"
              description="Ingests ticket titles, statuses, and descriptions to add business context. 'Fixed a bug' becomes 'Resolved CRIT-123: Login timeout on Safari'."
            />
            <FeatureCard
              icon="✏️"
              title="Human review, always"
              description="Auto-generate drafts, but keep the final say. Review, tweak, and approve in under 30 seconds. Your changelog, your voice."
            />
            <FeatureCard
              icon="📊"
              title="Analytics & insights"
              description="See which release notes get the most engagement. Know what your users actually care about."
            />
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section id="how-it-works" className="bg-gray-50 border-y border-gray-100 px-6 py-24 sm:py-32">
        <div className="mx-auto max-w-5xl">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold tracking-tight text-gray-900 sm:text-5xl">
              Three steps to never writing release notes again
            </h2>
          </div>
          <div className="grid gap-12 sm:grid-cols-3">
            <StepCard
              number="01"
              title="Connect your repos"
              description="Link your GitHub, GitLab, or Bitbucket repositories. We listen for new releases automatically."
            />
            <StepCard
              number="02"
              title="Configure your voices"
              description="Set up tones for different audiences — technical, customer-facing, marketing. One deploy, three versions."
            />
            <StepCard
              number="03"
              title="Review & publish"
              description="When you ship, we generate drafts instantly. Review in seconds, then publish everywhere with one click."
            />
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="px-6 py-24 sm:py-32">
        <div className="mx-auto max-w-5xl">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold tracking-tight text-gray-900 sm:text-5xl">
              Simple, transparent pricing
            </h2>
            <p className="mt-4 text-lg text-gray-600">
              Start small. Scale as your team grows.
            </p>
          </div>
          <div className="grid gap-8 sm:grid-cols-3">
            <PricingCard
              name="Starter"
              price="29"
              description="For solo devs and side projects"
              features={["1 repository", "1 tone/voice", "Auto-generate drafts", "Web dashboard"]}
              highlighted={false}
            />
            <PricingCard
              name="Team"
              price="99"
              description="For growing product teams"
              features={["5 repositories", "3 tones/voices", "Multi-channel publish", "Slack integration", "Email summaries"]}
              highlighted={true}
            />
            <PricingCard
              name="Scale"
              price="299"
              description="For companies shipping at scale"
              features={["Unlimited repositories", "Unlimited tones", "Custom branding", "API access", "SSO & team seats", "Priority support"]}
              highlighted={false}
            />
          </div>
          <p className="mt-8 text-center text-sm text-gray-400">
            Early access pricing will be 30% off for the first 3 months. Join the waitlist to lock it in.
          </p>
        </div>
      </section>

      {/* Waitlist / Early Access */}
      <section id="waitlist" className="bg-gradient-to-b from-gray-900 to-gray-950 px-6 py-24 sm:py-32 text-white">
        <div className="mx-auto max-w-2xl text-center">
          <span className="inline-block rounded-full bg-indigo-500/20 px-4 py-1.5 text-sm font-medium text-indigo-300 mb-6 border border-indigo-500/30">
            🚀 Launching soon
          </span>
          <h2 className="text-4xl font-bold tracking-tight sm:text-5xl">
            Get early access
          </h2>
          <p className="mt-4 text-lg text-gray-300">
            Be the first to try PatchNotes. Early adopters get 30% off for 3 months and priority feature requests.
          </p>
          {submitted ? (
            <div className="mt-10 rounded-2xl bg-white/10 border border-white/10 p-8">
              <p className="text-xl font-semibold text-indigo-300">You're on the list! 🎉</p>
              <p className="mt-2 text-gray-300">We'll let you know when PatchNotes is ready. Early access pricing is locked in for you.</p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="mt-10 flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
              <input
                type="email"
                placeholder="you@company.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full min-w-0 rounded-xl border border-white/20 bg-white/10 px-5 py-3.5 text-base text-white placeholder-gray-400 outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-500/30 sm:w-80"
              />
              <button
                type="submit"
                className="w-full whitespace-nowrap rounded-xl bg-indigo-500 px-8 py-3.5 text-base font-semibold text-white hover:bg-indigo-400 transition-colors sm:w-auto"
              >
                Join the waitlist
              </button>
            </form>
          )}
          <p className="mt-4 text-sm text-gray-500">
            No spam. Just launch updates and early access perks.
          </p>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-gray-100 bg-white px-6 py-10">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 sm:flex-row">
          <div className="flex items-center gap-2">
            <span className="text-lg">📝</span>
            <span className="text-sm font-bold tracking-tight">{businessName}</span>
          </div>
          <p className="text-sm text-gray-400">
            Built with{" "}
            <a href="https://cto.new" className="underline hover:text-gray-600 transition-colors">
              cto.new
            </a>
          </p>
          <div className="flex gap-6 text-sm text-gray-400">
            <span className="hover:text-gray-600 cursor-default">Privacy</span>
            <span className="hover:text-gray-600 cursor-default">Terms</span>
            <span className="hover:text-gray-600 cursor-default">Contact</span>
          </div>
        </div>
      </footer>
    </div>
  );
}

function FeatureCard({
  icon,
  title,
  description,
}: {
  icon: string;
  title: string;
  description: string;
}) {
  return (
    <div className="group rounded-2xl border border-gray-100 bg-white p-8 transition-all hover:border-gray-200 hover:shadow-lg hover:shadow-gray-100/50">
      <span className="text-3xl">{icon}</span>
      <h3 className="mt-4 text-lg font-semibold text-gray-900">{title}</h3>
      <p className="mt-2 text-sm leading-relaxed text-gray-600">{description}</p>
    </div>
  );
}

function StepCard({
  number,
  title,
  description,
}: {
  number: string;
  title: string;
  description: string;
}) {
  return (
    <div className="text-center">
      <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-indigo-50 text-xl font-bold text-indigo-700 border border-indigo-100">
        {number}
      </div>
      <h3 className="mt-6 text-xl font-semibold text-gray-900">{title}</h3>
      <p className="mt-2 text-base leading-relaxed text-gray-600">{description}</p>
    </div>
  );
}

function PricingCard({
  name,
  price,
  description,
  features,
  highlighted,
}: {
  name: string;
  price: string;
  description: string;
  features: string[];
  highlighted: boolean;
}) {
  return (
    <div
      className={`relative rounded-2xl border p-8 transition-all ${
        highlighted
          ? "border-indigo-200 bg-indigo-50 shadow-lg shadow-indigo-100/50 scale-105"
          : "border-gray-100 bg-white hover:border-gray-200 hover:shadow-lg"
      }`}
    >
      {highlighted && (
        <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-indigo-600 px-3 py-1 text-xs font-semibold text-white">
          Most popular
        </span>
      )}
      <h3 className="text-lg font-semibold text-gray-900">{name}</h3>
      <p className="mt-1 text-sm text-gray-500">{description}</p>
      <div className="mt-6 flex items-baseline gap-1">
        <span className="text-4xl font-bold text-gray-900">${price}</span>
        <span className="text-sm text-gray-500">/mo</span>
      </div>
      <ul className="mt-8 space-y-3">
        {features.map((f) => (
          <li key={f} className="flex items-center gap-3 text-sm text-gray-700">
            <svg className="h-4 w-4 flex-shrink-0 text-emerald-500" fill="none" viewBox="0 0 24 24" strokeWidth="2.5" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
            </svg>
            {f}
          </li>
        ))}
      </ul>
      <a
        href="#waitlist"
        className={`mt-8 flex w-full items-center justify-center rounded-xl py-3 text-sm font-semibold transition-colors ${
          highlighted
            ? "bg-gray-900 text-white hover:bg-gray-800"
            : "border border-gray-200 bg-white text-gray-900 hover:bg-gray-50"
        }`}
      >
        Get early access
      </a>
    </div>
  );
}