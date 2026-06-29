import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState, useEffect } from "react";

export const Route = createFileRoute("/dashboard")({
  component: DashboardPage,
});

function DashboardPage() {
  const navigate = useNavigate();
  const [user, setUser] = useState<{ id: number; email: string; name: string } | null>(null);
  const [loading, setLoading] = useState(true);
  const [waitlistCount, setWaitlistCount] = useState(0);

  useEffect(() => {
    fetch("/api/auth/me")
      .then((r) => r.json())
      .then((data) => {
        if (!data.user) {
          navigate({ to: "/login" });
          return;
        }
        setUser(data.user);
      })
      .catch(() => navigate({ to: "/login" }))
      .finally(() => setLoading(false));

    fetch("/api/waitlist")
      .then((r) => r.json())
      .then((data) => setWaitlistCount(data.count || 0))
      .catch(() => {});
  }, []);

  const handleLogout = async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
    } catch {}
    navigate({ to: "/" });
  };

  if (loading) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-gray-50">
        <div className="text-lg text-gray-500">Loading...</div>
      </div>
    );
  }

  if (!user) return null;

  return (
    <div className="min-h-dvh bg-gray-50">
      {/* Dashboard Nav */}
      <header className="sticky top-0 z-50 border-b border-gray-100 bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-3">
            <a href="/" className="text-xl">📝</a>
            <span className="text-lg font-bold tracking-tight">PatchNotes</span>
            <span className="rounded-full bg-indigo-50 px-2.5 py-0.5 text-xs font-medium text-indigo-700 border border-indigo-100">
              Dashboard
            </span>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-sm text-gray-500">{user.email}</span>
            <button
              onClick={handleLogout}
              className="rounded-full border border-gray-200 px-4 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
            >
              Sign out
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-6 py-12">
        {/* Welcome */}
        <div className="mb-10">
          <h1 className="text-3xl font-bold text-gray-900">
            Welcome{user.name ? `, ${user.name}` : ""} 👋
          </h1>
          <p className="mt-2 text-gray-500">
            PatchNotes is in early access. Here's what you can do while we build the full product.
          </p>
        </div>

        {/* Stats Grid */}
        <div className="grid gap-6 sm:grid-cols-3 mb-10">
          <StatCard icon="📋" value={`${waitlistCount}`} label="Waitlist signups" />
          <StatCard icon="🔗" value="0" label="Connected repos" />
          <StatCard icon="📝" value="0" label="Notes generated" />
        </div>

        {/* Connect Repos Card */}
        <div className="rounded-2xl border border-gray-100 bg-white p-8 mb-6">
          <div className="flex items-start justify-between">
            <div>
              <h2 className="text-xl font-semibold text-gray-900">Connect your first repository</h2>
              <p className="mt-2 text-gray-500 max-w-lg">
                Link a GitHub, GitLab, or Bitbucket repo to start auto-generating release notes from your commits and PRs.
              </p>
            </div>
            <span className="rounded-full bg-amber-50 px-3 py-1 text-xs font-medium text-amber-700 border border-amber-200">
              Coming soon
            </span>
          </div>
          <div className="mt-6 flex gap-4">
            <button disabled className="rounded-xl border border-gray-200 bg-gray-50 px-5 py-2.5 text-sm font-medium text-gray-400 cursor-not-allowed">
              Connect GitHub
            </button>
            <button disabled className="rounded-xl border border-gray-200 bg-gray-50 px-5 py-2.5 text-sm font-medium text-gray-400 cursor-not-allowed">
              Connect GitLab
            </button>
          </div>
        </div>

        {/* Quick Start Guide */}
        <div className="rounded-2xl border border-gray-100 bg-white p-8">
          <h2 className="text-xl font-semibold text-gray-900">Getting Started</h2>
          <div className="mt-6 grid gap-6 sm:grid-cols-3">
            <QuickStep number="1" title="Connect a repo" description="Link your code repository so PatchNotes can read your commits and PRs." />
            <QuickStep number="2" title="Set your tones" description="Configure how your release notes sound — technical, customer-facing, or marketing." />
            <QuickStep number="3" title="Review & publish" description="When you ship, we generate notes instantly. Review and publish with one click." />
          </div>
        </div>

        {/* Settings footer */}
        <div className="mt-10 text-center">
          <p className="text-sm text-gray-400">
            PatchNotes is in private beta.{" "}
            <a href="mailto:hello@patchnotes.dev" className="underline hover:text-gray-600 transition-colors">
              Send feedback
            </a>
          </p>
        </div>
      </main>
    </div>
  );
}

function StatCard({ icon, value, label }: { icon: string; value: string; label: string }) {
  return (
    <div className="rounded-2xl border border-gray-100 bg-white p-6 text-center">
      <span className="text-2xl">{icon}</span>
      <p className="mt-2 text-3xl font-bold text-gray-900">{value}</p>
      <p className="text-sm text-gray-500">{label}</p>
    </div>
  );
}

function QuickStep({ number, title, description }: { number: string; title: string; description: string }) {
  return (
    <div className="text-center">
      <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-full bg-indigo-50 text-sm font-bold text-indigo-700">
        {number}
      </div>
      <h3 className="mt-3 text-sm font-semibold text-gray-900">{title}</h3>
      <p className="mt-1 text-xs text-gray-500">{description}</p>
    </div>
  );
}