import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState, useEffect } from "react";

export const Route = createFileRoute("/dashboard")({
  component: DashboardPage,
});

type Release = {
  id: number;
  title: string;
  summary: string;
  tone: string;
  repo: string;
  created_at: string;
  published: number;
};

function DashboardPage() {
  const navigate = useNavigate();
  const [user, setUser] = useState<{ id: number; email: string; name: string } | null>(null);
  const [loading, setLoading] = useState(true);
  const [waitlistCount, setWaitlistCount] = useState(0);
  const [releases, setReleases] = useState<Release[]>([]);
  const [commits, setCommits] = useState("");
  const [tone, setTone] = useState("technical");
  const [generating, setGenerating] = useState(false);
  const [generatedNote, setGeneratedNote] = useState<{ title: string; body: string } | null>(null);
  const [activeTab, setActiveTab] = useState<"generate" | "history">("generate");
  const [repoUrl, setRepoUrl] = useState("");
  const [fetching, setFetching] = useState(false);
  const [fetchError, setFetchError] = useState("");
  const [fetchSuccess, setFetchSuccess] = useState(false);
  const [lastCommitCount, setLastCommitCount] = useState(0);

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

    fetchReleases();
  }, []);

  const fetchReleases = () => {
    fetch("/api/releases")
      .then((r) => r.json())
      .then((data) => setReleases(data.releases || []))
      .catch(() => {});
  };

  const handleGenerate = async () => {
    const lines = commits.split("\n").filter((l) => l.trim());
    if (lines.length === 0) return;

    setGenerating(true);
    setGeneratedNote(null);
    try {
      const res = await fetch("/api/releases", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ commits: lines, tone }),
      });
      const data = await res.json();
      if (data.success) {
        setGeneratedNote({ title: data.title, body: data.body });
        setCommits("");
        fetchReleases();
      }
    } catch {}
    setGenerating(false);
  };

  const handleLogout = async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
    } catch {}
    navigate({ to: "/" });
  };

  const handleFetchCommits = () => {
    const url = repoUrl.trim();
    if (!url) return;

    setFetching(true);
    setFetchError("");
    setFetchSuccess(false);

    fetch("/api/github/fetch-commits", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ repoUrl: url, limit: 10 }),
    })
      .then((r) => r.json())
      .then((data) => {
        if (data.error) {
          setFetchError(data.error);
          return;
        }
        if (data.commits && data.commits.length > 0) {
          setCommits(data.commits.join("\n"));
          setLastCommitCount(data.count);
          setFetchSuccess(true);
          setActiveTab("generate");
        } else {
          setFetchError("No commits found in the repository.");
        }
      })
      .catch(() => {
        setFetchError("Failed to fetch commits. Check the URL and try again.");
      })
      .finally(() => {
        setFetching(false);
      });
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
              Beta
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
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">
            Welcome{user.name ? `, ${user.name}` : ""} 👋
          </h1>
          <p className="mt-2 text-gray-500">
            Paste your commit messages below and generate release notes instantly.
          </p>
        </div>

        {/* Stats Grid */}
        <div className="grid gap-6 sm:grid-cols-4 mb-8">
          <StatCard icon="📋" value={`${waitlistCount}`} label="Waitlist" />
          <StatCard icon="🔗" value="0" label="Repos" />
          <StatCard icon="📝" value={`${releases.length}`} label="Notes" />
          <StatCard icon="⚡" value="30s" label="Avg. review time" />
        </div>

        {/* Tabs */}
        <div className="flex gap-1 mb-6 bg-white border border-gray-100 rounded-xl p-1 w-fit">
          <button
            onClick={() => setActiveTab("generate")}
            className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
              activeTab === "generate"
                ? "bg-gray-900 text-white"
                : "text-gray-600 hover:text-gray-900"
            }`}
          >
            ✨ Generate
          </button>
          <button
            onClick={() => setActiveTab("history")}
            className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
              activeTab === "history"
                ? "bg-gray-900 text-white"
                : "text-gray-600 hover:text-gray-900"
            }`}
          >
            📜 History ({releases.length})
          </button>
        </div>

        {activeTab === "generate" && (
          <div className="grid gap-6 lg:grid-cols-2">
            {/* Commit Input */}
            <div className="rounded-2xl border border-gray-100 bg-white p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-gray-900">Commit messages</h2>
                <select
                  value={tone}
                  onChange={(e) => setTone(e.target.value)}
                  className="rounded-lg border border-gray-200 px-3 py-1.5 text-sm outline-none focus:border-indigo-400"
                >
                  <option value="technical">Technical</option>
                  <option value="customer">Customer-facing</option>
                  <option value="marketing">Marketing</option>
                </select>
              </div>
              <textarea
                value={commits}
                onChange={(e) => setCommits(e.target.value)}
                placeholder={`Paste commit messages here, one per line:\n\nfeat: add user authentication\nfix: resolve login timeout on Safari\nchore: update dependencies`}
                rows={10}
                className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 resize-none"
              />
              <button
                onClick={handleGenerate}
                disabled={generating || !commits.trim()}
                className="mt-4 w-full rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-indigo-500 disabled:opacity-50 transition-colors"
              >
                {generating ? "Generating..." : "Generate release notes"}
              </button>
              <p className="mt-2 text-xs text-gray-400">
                Tone: <span className="font-medium">
                  {tone === "technical" ? "Developer-focused changelog" :
                   tone === "customer" ? "User-friendly summary" :
                   "Marketing-friendly announcement"}
                </span>
              </p>
            </div>

            {/* Output Preview */}
            <div className="rounded-2xl border border-gray-100 bg-white p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Preview</h2>
              {generatedNote ? (
                <div className="prose prose-sm max-w-none">
                  <div className="rounded-xl bg-gray-50 border border-gray-100 p-4">
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="text-base font-bold text-gray-900">{generatedNote.title}</h3>
                      <span className="text-xs text-gray-400">Auto-generated</span>
                    </div>
                    <div className="text-sm text-gray-700 whitespace-pre-wrap">{generatedNote.body}</div>
                  </div>
                  <div className="flex gap-2 mt-4">
                    <button className="rounded-xl bg-gray-900 px-4 py-2 text-xs font-semibold text-white hover:bg-gray-800 transition-colors">
                      Copy to clipboard
                    </button>
                    <button className="rounded-xl border border-gray-200 px-4 py-2 text-xs font-medium text-gray-700 hover:bg-gray-50 transition-colors">
                      Download
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center h-64 text-center rounded-xl bg-gray-50 border border-dashed border-gray-200">
                  <span className="text-3xl mb-3">📝</span>
                  <p className="text-sm text-gray-500 max-w-xs">
                    Paste commit messages and select a tone, then generate your release notes. They'll appear here.
                  </p>
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === "history" && (
          <div className="rounded-2xl border border-gray-100 bg-white">
            <div className="p-6 border-b border-gray-100">
              <h2 className="text-lg font-semibold text-gray-900">Release History</h2>
            </div>
            {releases.length === 0 ? (
              <div className="p-12 text-center">
                <span className="text-3xl">📭</span>
                <p className="mt-3 text-sm text-gray-500">No release notes yet. Generate your first one!</p>
              </div>
            ) : (
              <>
              <div className="divide-y divide-gray-100">
                {releases.map((release) => (
                  <div key={release.id} className="flex items-center justify-between px-6 py-4 hover:bg-gray-50 transition-colors">
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">{release.title}</p>
                      <p className="text-xs text-gray-500 mt-0.5">
                        {release.summary} · {release.tone} · {new Date(release.created_at).toLocaleDateString()}
                      </p>
                    </div>
                    <div className="flex items-center gap-3">
                      <button
                        onClick={() => {
                          fetch(`/api/releases/${release.id}`, {
                            method: "PUT",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({ published: !release.published }),
                          }).then(function () {
                            fetchReleases();
                          });
                        }}
                        className={`text-xs font-medium px-3 py-1.5 rounded-full transition-colors ${
                          release.published
                            ? "bg-gray-100 text-gray-600 hover:bg-gray-200"
                            : "bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200"
                        }`}
                      >
                        {release.published ? "Unpublish" : "Publish"}
                      </button>
                      <span className={`text-xs font-medium px-2 py-1 rounded-full ${
                        release.published
                          ? "bg-emerald-50 text-emerald-700"
                          : "bg-gray-100 text-gray-500"
                      }`}>
                        {release.published ? "Live" : "Draft"}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
              {releases.length > 0 && (
                <div className="p-4 border-t border-gray-100 text-center">
                  <a
                    href="/changelog"
                    className="text-xs font-medium text-indigo-600 hover:text-indigo-500 transition-colors"
                  >
                    View public changelog →
                  </a>
                </div>
              )}
              </>
            )}
          </div>
        )}

        {/* Connect a GitHub repo */}
        <div className="rounded-2xl border border-gray-100 bg-white p-6 mt-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-lg font-semibold text-gray-900">📦 Fetch from GitHub</h2>
              <p className="mt-1 text-sm text-gray-500">
                Paste a public repo URL to pull in recent commits automatically.
              </p>
            </div>
          </div>
          <div className="flex gap-3">
            <input
              type="text"
              value={repoUrl}
              onChange={(e) => setRepoUrl(e.target.value)}
              placeholder="https://github.com/owner/repo"
              className="flex-1 rounded-xl border border-gray-200 px-4 py-2.5 text-sm outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
            />
            <button
              onClick={handleFetchCommits}
              disabled={fetching || !repoUrl.trim()}
              className="rounded-xl bg-gray-900 px-5 py-2.5 text-sm font-semibold text-white hover:bg-gray-800 disabled:opacity-50 transition-colors whitespace-nowrap"
            >
              {fetching ? "Fetching..." : "Fetch commits"}
            </button>
          </div>
          {fetchError && (
            <p className="mt-2 text-xs text-red-500">{fetchError}</p>
          )}
          {fetchSuccess && repoUrl && (
            <p className="mt-2 text-xs text-emerald-600">
              ✅ Fetched {lastCommitCount} commits. They're in the text area above — adjust and generate!
            </p>
          )}
        </div>
      </main>
    </div>
  );
}

function StatCard({ icon, value, label }: { icon: string; value: string; label: string }) {
  return (
    <div className="rounded-2xl border border-gray-100 bg-white p-5 text-center">
      <span className="text-xl">{icon}</span>
      <p className="mt-1 text-2xl font-bold text-gray-900">{value}</p>
      <p className="text-xs text-gray-500">{label}</p>
    </div>
  );
}