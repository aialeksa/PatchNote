import { createFileRoute } from "@tanstack/react-router";
import { getSession } from "~/lib/auth";
import { query, run } from "~/lib/db";

// Simple release note generator (template-based, replace with LLM later)
function generateReleaseNotes(commits: string[], tone: string): { title: string; body: string; summary: string } {
  const count = commits.length;
  const features = commits.filter(c => /feat|add|new|introduce|implement/i.test(c));
  const fixes = commits.filter(c => /fix|bug|patch|resolve|correct/i.test(c));
  const chores = commits.filter(c => /chore|refactor|clean|update|bump|docs/i.test(c));

  const title = `Release v${new Date().toISOString().slice(0, 10).replace(/-/g, ".")}`;

  const tonePrefix = tone === "customer" ? "For our users:" :
    tone === "marketing" ? "🚀 What's new:" :
    "Technical changelog:";

  let body = `## ${title}\n\n`;

  if (tone === "technical") {
    body += `### Changes\n\n`;
    commits.forEach(c => body += `- ${c}\n`);
  } else {
    if (features.length > 0) {
      body += `### ✨ New Features\n\n`;
      features.forEach(c => body += `- ${c.replace(/^(feat|add|new):\s*/i, "")}\n`);
      body += "\n";
    }
    if (fixes.length > 0) {
      body += `### 🐛 Bug Fixes\n\n`;
      fixes.forEach(c => body += `- ${c.replace(/^(fix|bug|patch):\s*/i, "")}\n`);
      body += "\n";
    }
    if (chores.length > 0) {
      body += `### 🔧 Maintenance\n\n`;
      chores.forEach(c => body += `- ${c.replace(/^(chore|refactor|docs|update):\s*/i, "")}\n`);
    }
  }

  const summary = features.length > 0
    ? `${features.length} new feature${features.length > 1 ? "s" : ""}${fixes.length > 0 ? `, ${fixes.length} bug fix${fixes.length > 1 ? "es" : ""}` : ""}`
    : `${count} change${count > 1 ? "s" : ""}`;

  return { title, body, summary };
}

export const Route = createFileRoute("/api/releases")({
  server: {
    handlers: {
      // Generate release notes from provided commits
      POST: async ({ request }) => {
        const cookie = request.headers.get("cookie") || "";
        const match = cookie.match(/patchnotes_session=([^;]+)/);
        if (!match) {
          return Response.json({ error: "Unauthorized" }, { status: 401 });
        }
        const user = getSession(match[1]);
        if (!user) {
          return Response.json({ error: "Unauthorized" }, { status: 401 });
        }

        const body = (await request.json()) as {
          commits?: string[];
          tone?: string;
          repo?: string;
        };

        const commits = body.commits || [];
        const tone = body.tone || "technical";

        if (commits.length === 0) {
          return Response.json(
            { error: "At least one commit message required" },
            { status: 400 }
          );
        }

        const { title, body: noteBody, summary } = generateReleaseNotes(commits, tone);

        run(
          `INSERT INTO releases (user_id, title, body, summary, tone, repo) VALUES (${user.id}, '${title.replace(/'/g, "''")}', '${noteBody.replace(/'/g, "''")}', '${summary.replace(/'/g, "''")}', '${tone.replace(/'/g, "''")}', '${(body.repo || "").replace(/'/g, "''")}')`
        );

        return Response.json({ success: true, title, body: noteBody, summary });
      },

      // Get user's releases
      GET: async ({ request }) => {
        const cookie = request.headers.get("cookie") || "";
        const match = cookie.match(/patchnotes_session=([^;]+)/);
        if (!match) {
          return Response.json({ releases: [] });
        }
        const user = getSession(match[1]);
        if (!user) {
          return Response.json({ releases: [] });
        }

        const releases = query(
          `SELECT id, title, summary, tone, repo, created_at, published FROM releases WHERE user_id = ${user.id} ORDER BY created_at DESC LIMIT 20`
        );

        return Response.json({ releases });
      },
    },
  },
});