import { createFileRoute } from "@tanstack/react-router";
import { getSession } from "~/lib/auth";

export const Route = createFileRoute("/api/github/fetch-commits")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        // Auth check
        const cookie = request.headers.get("cookie") || "";
        const match = cookie.match(/patchnotes_session=([^;]+)/);
        if (!match) {
          return Response.json({ error: "Unauthorized" }, { status: 401 });
        }
        const user = getSession(match[1]);
        if (!user) {
          return Response.json({ error: "Unauthorized" }, { status: 401 });
        }

        const body = (await request.json()) as { repoUrl?: string; limit?: number };
        const repoUrl = body.repoUrl || "";
        const limit = Math.min(body.limit || 10, 30);

        // Parse GitHub URL: https://github.com/owner/repo or owner/repo
        let owner: string, repo: string;
        const urlMatch = repoUrl.match(/github\.com\/([^/]+)\/([^/\s?#]+)/);
        const shortMatch = repoUrl.match(/^([\w.-]+)\/([\w.-]+)$/);
        if (urlMatch) {
          owner = urlMatch[1];
          repo = urlMatch[2];
        } else if (shortMatch) {
          owner = shortMatch[1];
          repo = shortMatch[2];
        } else {
          return Response.json(
            { error: "Invalid GitHub repo URL. Use format: https://github.com/owner/repo or owner/repo" },
            { status: 400 }
          );
        }

        // Remove trailing .git
        repo = repo.replace(/\.git$/, "");

        try {
          const res = await fetch(
            `https://api.github.com/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/commits?per_page=${limit}`,
            {
              headers: {
                Accept: "application/vnd.github.v3+json",
                "User-Agent": "PatchNotes/1.0",
              },
            }
          );

          if (res.status === 404) {
            return Response.json(
              { error: `Repository "${owner}/${repo}" not found. Check the URL and make sure it's public.` },
              { status: 404 }
            );
          }
          if (res.status === 403) {
            return Response.json(
              { error: "GitHub API rate limit reached. Try again later, or paste commits manually." },
              { status: 429 }
            );
          }
          if (!res.ok) {
            return Response.json(
              { error: `GitHub API error (${res.status})` },
              { status: 502 }
            );
          }

          const commits = await res.json() as Array<{
            commit: { message: string };
            sha: string;
          }>;

          // Parse commit messages — take the first line of each
          const messages = commits.map((c) => {
            const firstLine = c.commit.message.split("\n")[0].trim();
            return firstLine;
          }).filter((m: string) => m.length > 0);

          return Response.json({
            success: true,
            repo: `${owner}/${repo}`,
            commits: messages,
            count: messages.length,
          });
        } catch (err) {
          return Response.json(
            { error: "Failed to connect to GitHub. Check the URL and try again." },
            { status: 502 }
          );
        }
      },
    },
  },
});