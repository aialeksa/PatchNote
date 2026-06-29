import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect } from "react";

type ChangelogRelease = {
  id: number;
  title: string;
  body: string;
  summary: string;
  tone: string;
  repo: string;
  created_at: string;
  user_name: string;
};

export const Route = createFileRoute("/changelog")({
  component: ChangelogPage,
});

function ChangelogPage() {
  const [releases, setReleases] = useState<ChangelogRelease[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/changelog")
      .then((r) => r.json())
      .then((data) => setReleases(data.releases || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="min-h-dvh bg-white">
      {/* Header */}
      <header className="border-b border-gray-100">
        <div className="mx-auto max-w-3xl px-6 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <a href="/" className="text-xl">📝</a>
              <span className="font-bold tracking-tight">PatchNotes</span>
              <span className="text-xs text-gray-400 ml-1">Changelog</span>
            </div>
            <a
              href="/dashboard"
              className="rounded-full border border-gray-200 px-4 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
            >
              Dashboard
            </a>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-6 py-12">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold tracking-tight text-gray-900">What's new</h1>
          <p className="mt-3 text-lg text-gray-500">
            The latest updates and improvements from PatchNotes users.
          </p>
        </div>

        {loading ? (
          <div className="text-center py-12">
            <div className="inline-block h-6 w-6 animate-spin rounded-full border-2 border-gray-300 border-t-indigo-600" />
            <p className="mt-3 text-sm text-gray-500">Loading changelog...</p>
          </div>
        ) : releases.length === 0 ? (
          <div className="text-center py-16">
            <span className="text-5xl">📭</span>
            <h2 className="mt-4 text-xl font-semibold text-gray-900">No releases yet</h2>
            <p className="mt-2 text-gray-500">
              Published release notes will appear here.{" "}
              <a href="/dashboard" className="text-indigo-600 hover:text-indigo-500 font-medium">
                Generate your first one →
              </a>
            </p>
          </div>
        ) : (
          <div className="space-y-8">
            {releases.map((release) => (
              <article
                key={release.id}
                className="rounded-2xl border border-gray-100 bg-white p-8 shadow-sm"
              >
                <div className="flex items-center gap-3 mb-4">
                  <span className="text-xs font-medium text-indigo-600 bg-indigo-50 px-2.5 py-1 rounded-full border border-indigo-100">
                    {release.tone}
                  </span>
                  <time className="text-xs text-gray-400">
                    {new Date(release.created_at).toLocaleDateString("en-US", {
                      year: "numeric",
                      month: "long",
                      day: "numeric",
                    })}
                  </time>
                  <span className="text-xs text-gray-400">·</span>
                  <span className="text-xs text-gray-400">{release.user_name}</span>
                </div>
                <div className="prose prose-sm prose-gray max-w-none">
                  <div
                    dangerouslySetInnerHTML={{
                      __html: release.body
                        .replace(/^## (.+)$/gm, '<h2 class="text-xl font-bold text-gray-900 mt-0 mb-4">$1</h2>')
                        .replace(/^### (.+)$/gm, '<h3 class="text-base font-semibold text-gray-900 mt-6 mb-2">$1</h3>')
                        .replace(/^- (.+)$/gm, '<li class="text-sm text-gray-700 ml-4 py-0.5 list-disc">$1</li>')
                        .replace(/\n\n/g, "</p><p class=\"text-sm text-gray-700\">")
                        .replace(/^\*\*(.+)\*\*$/gm, '<strong>$1</strong>'),
                    }}
                  />
                </div>
                <div className="mt-4 pt-4 border-t border-gray-50 flex items-center gap-2">
                  <span className="text-xs text-gray-400">📝 {release.summary}</span>
                  {release.repo && (
                    <>
                      <span className="text-xs text-gray-300">·</span>
                      <span className="text-xs text-gray-400">🔗 {release.repo}</span>
                    </>
                  )}
                </div>
              </article>
            ))}
          </div>
        )}
      </main>

      <footer className="border-t border-gray-50 px-6 py-8 mt-16">
        <div className="mx-auto max-w-3xl text-center text-sm text-gray-400">
          Powered by{" "}
          <a href="/" className="font-medium hover:text-gray-600 transition-colors">PatchNotes</a>
          {" · "}
          <a href="/dashboard" className="underline hover:text-gray-600 transition-colors">Generate your own</a>
        </div>
      </footer>
    </div>
  );
}