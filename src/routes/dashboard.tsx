import { createFileRoute, useNavigate, useSearch } from "@tanstack/react-router";
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

type SubscriptionInfo = {
  plan: string | null;
  status: string;
  currentPeriodEnd?: string;
};

function DashboardPage() {
  const navigate = useNavigate();
  const search = useSearch({ from: "/dashboard" }) as { checkout?: string; session_id?: string };
  const [user, setUser] = useState<{ id: number; email: string; name: string } | null>(null);
  const [loading, setLoading] = useState(true);
  const [waitlistCount, setWaitlistCount] = useState(0);
  const [releases, setReleases] = useState<Release[]>([]);
  const [commits, setCommits] = useState("");
  const [tone, setTone] = useState("technical");
  const [version, setVersion] = useState("");
  const [generating, setGenerating] = useState(false);
  const [generatedNote, setGeneratedNote] = useState<{ title: string; body: string } | null>(null);
  const [activeTab, setActiveTab] = useState<"generate" | "history" | "settings">("generate");
  const [repoUrl, setRepoUrl] = useState("");
  const [fetching, setFetching] = useState(false);
  const [fetchError, setFetchError] = useState("");
  const [fetchSuccess, setFetchSuccess] = useState(false);
  const [lastCommitCount, setLastCommitCount] = useState(0);
  const [subscription, setSubscription] = useState<SubscriptionInfo | null>(null);
  const [subscribing, setSubscribing] = useState<string | null>(null);
  const [checkoutMsg, setCheckoutMsg] = useState("");
  const [slackUrl, setSlackUrl] = useState("");
  const [slackSaved, setSlackSaved] = useState(false);
  const [slackMsg, setSlackMsg] = useState("");
  const [editingRelease, setEditingRelease] = useState<number | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editBody, setEditBody] = useState("");

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
    fetchSubscription();
    fetchSettings();
  }, []);

  // Handle Stripe checkout redirect
  useEffect(() => {
    if (search.checkout === "success" && search.session_id) {
      setCheckoutMsg("Verifying payment...");
      fetch("/api/stripe/verify-session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId: search.session_id }),
      })
        .then((r) => r.json())
        .then((data) => {
          if (data.success) {
            setCheckoutMsg(`✅ Payment confirmed! You're on the ${data.plan} plan.`);
            fetchSubscription();
          } else {
            setCheckoutMsg(`❌ Payment verification failed: ${data.error}`);
          }
        })
        .catch(() => setCheckoutMsg("❌ Could not verify payment. Contact support."));
    } else if (search.checkout === "cancel") {
      setCheckoutMsg("Checkout cancelled. You can try again anytime.");
    }
  }, [search.checkout, search.session_id]);

  const fetchSubscription = () => {
    fetch("/api/stripe/subscription")
      .then((r) => r.json())
      .then((data) => setSubscription(data))
      .catch(() => {});
  };

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
        body: JSON.stringify({ commits: lines, tone, version }),
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

  const handleSubscribe = async (plan: string) => {
    setSubscribing(plan);
    try {
      const res = await fetch("/api/stripe/create-checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan }),
      });
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      } else {
        setCheckoutMsg("Failed to start checkout. Try again.");
      }
    } catch {
      setCheckoutMsg("Failed to start checkout. Try again.");
    }
    setSubscribing(null);
  };

  const fetchSettings = () => {
    fetch("/api/settings")
      .then((r) => r.json())
      .then((data) => {
        if (data.slackWebhookUrl) setSlackUrl(data.slackWebhookUrl);
      })
      .catch(() => {});
  };

  const handleSaveSlack = () => {
    setSlackSaved(false);
    setSlackMsg("");
    fetch("/api/settings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ slackWebhookUrl: slackUrl }),
    })
      .then((r) => r.json())
      .then((data) => {
        if (data.success) {
          setSlackSaved(true);
          setSlackMsg("Slack webhook saved! Use the 📢 button on releases to post.");
        }
      })
      .catch(() => setSlackMsg("Failed to save. Try again."));
  };

  const handlePublishSlack = (releaseId: number) => {
    setSlackMsg("");
    fetch("/api/publish-slack", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ releaseId }),
    })
      .then((r) => r.json())
      .then((data) => {
        if (data.success) {
          setSlackMsg("📢 Posted to Slack!");
        } else {
          setSlackMsg(`📢 ${data.error}`);
        }
      })
      .catch(() => setSlackMsg("📢 Failed to post to Slack"));
  };

  const handleStartEdit = (release: Release) => {
    setEditingRelease(release.id);
    setEditTitle(release.title);
    // Fetch full body for editing
    fetch(`/api/releases/${release.id}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.release) setEditBody(data.release.body);
      })
      .catch(() => {});
  };

  const handleSaveEdit = (releaseId: number) => {
    fetch(`/api/releases/${releaseId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: editTitle, body: editBody }),
    })
      .then((r) => r.json())
      .then((data) => {
        if (data.success) {
          setEditingRelease(null);
          fetchReleases();
        }
      })
      .catch(() => {});
  };

  const handleCancelEdit = () => {
    setEditingRelease(null);
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

  const handleLogout = async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
    } catch {}
    navigate({ to: "/" });
  };

  const handleNotifySubscribers = (releaseId: number) => {
    fetch("/api/publish-email", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ releaseId }),
    })
      .then((r) => r.json())
      .then((data) => {
        if (data.success) {
          setCheckoutMsg(`📧 Email notification queued for subscribers!`);
        } else {
          setCheckoutMsg(`📧 ${data.error}`);
        }
      })
      .catch(() => {
        setCheckoutMsg("📧 Failed to send notification");
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

  const isActive = subscription?.status === "active";
  const planLabel = subscription?.plan || "free";

  return (
    <div className="min-h-dvh bg-gray-50">
      {/* Dashboard Nav */}
      <header className="sticky top-0 z-50 border-b border-gray-100 bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-3">
            <a href="/" className="text-xl">📝</a>
            <span className="text-lg font-bold tracking-tight">PatchNotes</span>
            <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium border ${
              isActive
                ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                : "bg-amber-50 text-amber-700 border-amber-200"
            }`}>
              {isActive ? planLabel : "Free"}
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
        {/* Checkout message */}
        {checkoutMsg && (
          <div className="mb-6 rounded-2xl border border-gray-100 bg-white p-4 text-sm">
            {checkoutMsg}
          </div>
        )}

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
          <StatCard icon={isActive ? "✅" : "🔒"} value={isActive ? planLabel : "Free"} label="Plan" />
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
          <button
            onClick={() => setActiveTab("settings")}
            className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
              activeTab === "settings"
                ? "bg-gray-900 text-white"
                : "text-gray-600 hover:text-gray-900"
            }`}
          >
            ⚙️ Settings
          </button>
        </div>

        {activeTab === "generate" && (
          <div className="grid gap-6 lg:grid-cols-2">
            {/* Commit Input */}
            <div className="rounded-2xl border border-gray-100 bg-white p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-gray-900">Commit messages</h2>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={version}
                    onChange={(e) => setVersion(e.target.value)}
                    placeholder="v1.0.0"
                    className="w-24 rounded-lg border border-gray-200 px-2.5 py-1.5 text-xs outline-none focus:border-indigo-400"
                  />
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
                    <button
                      onClick={() => {
                        const text = `${generatedNote?.title}\n\n${generatedNote?.body}`;
                        navigator.clipboard.writeText(text);
                      }}
                      className="rounded-xl bg-gray-900 px-4 py-2 text-xs font-semibold text-white hover:bg-gray-800 transition-colors"
                    >
                      Copy to clipboard
                    </button>
                    <button
                      onClick={() => {
                        const text = `# ${generatedNote?.title}\n\n${generatedNote?.body}`;
                        const blob = new Blob([text], { type: "text/markdown" });
                        const url = URL.createObjectURL(blob);
                        const a = document.createElement("a");
                        a.href = url;
                        a.download = `${generatedNote?.title?.replace(/[^a-z0-9]/gi, "_").toLowerCase() || "release"}.md`;
                        a.click();
                        URL.revokeObjectURL(url);
                      }}
                      className="rounded-xl border border-gray-200 px-4 py-2 text-xs font-medium text-gray-700 hover:bg-gray-50 transition-colors"
                    >
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
                  <div key={release.id} className="px-6 py-4 hover:bg-gray-50 transition-colors">
                    {editingRelease === release.id ? (
                      <div className="space-y-3">
                        <input
                          type="text"
                          value={editTitle}
                          onChange={(e) => setEditTitle(e.target.value)}
                          className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-indigo-400"
                        />
                        <textarea
                          value={editBody}
                          onChange={(e) => setEditBody(e.target.value)}
                          rows={6}
                          className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-indigo-400 resize-none"
                        />
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleSaveEdit(release.id)}
                            className="rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-indigo-500"
                          >
                            Save
                          </button>
                          <button
                            onClick={handleCancelEdit}
                            className="rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-50"
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-center justify-between">
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-gray-900 truncate">{release.title}</p>
                          <p className="text-xs text-gray-500 mt-0.5">
                            {release.summary} · {release.tone} · {new Date(release.created_at).toLocaleDateString()}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handleStartEdit(release)}
                            className="text-xs font-medium px-2 py-1 rounded text-gray-400 hover:text-gray-600 transition-colors"
                          >
                            ✏️
                          </button>
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
                      {release.published === 1 && (
                        <button
                          onClick={() => {
                            handleNotifySubscribers(release.id);
                          }}
                          className="text-xs font-medium px-3 py-1.5 rounded-full bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200 transition-colors"
                        >
                          📧 Notify
                        </button>
                      )}
                      {release.published === 1 && (
                        <button
                          onClick={() => {
                            handlePublishSlack(release.id);
                          }}
                          className="text-xs font-medium px-3 py-1.5 rounded-full bg-purple-50 text-purple-700 hover:bg-purple-100 border border-purple-200 transition-colors"
                        >
                          📢 Slack
                        </button>
                      )}
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

        {activeTab === "settings" && (
          <div className="rounded-2xl border border-gray-100 bg-white p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-2">⚙️ Settings</h2>
            <p className="text-sm text-gray-500 mb-4">Configure integrations to publish your release notes.</p>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium text-gray-700">Slack Webhook URL</label>
                <p className="text-xs text-gray-400 mb-2">
                  Paste a Slack Incoming Webhook URL to post releases to a channel.
                </p>
                <div className="flex gap-3">
                  <input
                    type="text"
                    value={slackUrl}
                    onChange={(e) => setSlackUrl(e.target.value)}
                    placeholder="https://hooks.slack.com/services/T00/B00/xxxxx"
                    className="flex-1 rounded-xl border border-gray-200 px-4 py-2.5 text-sm outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
                  />
                  <button
                    onClick={handleSaveSlack}
                    className="rounded-xl bg-gray-900 px-5 py-2.5 text-sm font-semibold text-white hover:bg-gray-800 transition-colors"
                  >
                    Save
                  </button>
                </div>
                {slackMsg && <p className="mt-2 text-xs text-gray-600">{slackMsg}</p>}
                {slackUrl && (
                  <p className="mt-3 text-xs text-gray-400">
                    📢 After saving, go to History and click the 📢 Slack button on a published release to post it.
                  </p>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Pricing section */}
        {!isActive && (
          <div className="rounded-2xl border border-gray-100 bg-white p-8 mt-6">
            <h2 className="text-xl font-bold text-gray-900 mb-2">Upgrade your plan</h2>
            <p className="text-sm text-gray-500 mb-6">
              Choose a plan that fits your team. All plans include the full release note generator.
            </p>
            <div className="grid gap-4 sm:grid-cols-3">
              <PricingCard
                name="Starter"
                price="$29/mo"
                features={["1 repository", "1 tone", "Basic changelog"]}
                cta="Subscribe"
                onSubscribe={() => handleSubscribe("starter")}
                loading={subscribing === "starter"}
              />
              <PricingCard
                name="Team"
                price="$99/mo"
                features={["5 repositories", "3 tones", "Multi-channel publish", "GitHub auto-fetch"]}
                cta="Subscribe"
                popular={true}
                onSubscribe={() => handleSubscribe("team")}
                loading={subscribing === "team"}
              />
              <PricingCard
                name="Scale"
                price="$299/mo"
                features={["Unlimited repos", "Custom branding", "API access", "Priority support"]}
                cta="Subscribe"
                onSubscribe={() => handleSubscribe("scale")}
                loading={subscribing === "scale"}
              />
            </div>
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

function PricingCard({
  name, price, features, cta, popular, onSubscribe, loading
}: {
  name: string; price: string; features: string[]; cta: string;
  popular?: boolean; onSubscribe: () => void; loading: boolean;
}) {
  return (
    <div className={`rounded-xl border-2 p-5 ${
      popular ? "border-indigo-400 bg-indigo-50/30" : "border-gray-100"
    }`}>
      {popular && (
        <span className="inline-block rounded-full bg-indigo-100 px-3 py-0.5 text-xs font-semibold text-indigo-700 mb-3">
          Most popular
        </span>
      )}
      <h3 className="text-lg font-bold text-gray-900">{name}</h3>
      <p className="text-2xl font-bold text-gray-900 mt-1">{price}</p>
      <ul className="mt-4 space-y-2">
        {features.map((f, i) => (
          <li key={i} className="text-sm text-gray-600 flex items-center gap-2">
            <span className="text-emerald-500">✓</span> {f}
          </li>
        ))}
      </ul>
      <button
        onClick={onSubscribe}
        disabled={loading}
        className={`mt-6 w-full rounded-xl py-2.5 text-sm font-semibold transition-colors ${
          popular
            ? "bg-indigo-600 text-white hover:bg-indigo-500"
            : "bg-gray-900 text-white hover:bg-gray-800"
        } disabled:opacity-50`}
      >
        {loading ? "Loading..." : cta}
      </button>
    </div>
  );
}