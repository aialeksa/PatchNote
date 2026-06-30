import { createFileRoute } from "@tanstack/react-router";
import { getSession } from "~/lib/auth";
import { query, run } from "~/lib/db";

export const Route = createFileRoute("/api/publish-email")({
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

        const body = (await request.json()) as { releaseId?: number };
        const releaseId = body.releaseId;
        if (!releaseId) {
          return Response.json({ error: "Release ID required" }, { status: 400 });
        }

        // Get the release
        const releases = query(
          `SELECT id, title, body, summary, tone, user_id FROM releases WHERE id = ${releaseId} AND user_id = ${user.id} AND published = 1`
        );
        if (releases.length === 0) {
          return Response.json({ error: "Published release not found" }, { status: 404 });
        }

        const release = releases[0];

        // Check there are subscribers
        const subscribers = query("SELECT COUNT(*) as count FROM changelog_subscribers");
        if (subscribers[0]?.count === 0) {
          return Response.json({ error: "No subscribers to notify" }, { status: 400 });
        }

        const origin = request.headers.get("origin") || "https://2ccaddebe1656613989ca7f52d9909f4.ctonew.app";

        const emailBody = `${release.summary}

---

${release.body}

---

View the full changelog: ${origin}/changelog`;

        // Queue the email (escaped for SQLite)
        const safeTitle = release.title.replace(/'/g, "''");
        const safeBody = emailBody.replace(/'/g, "''");

        run(
          `INSERT INTO pending_emails (release_id, subject, body) VALUES (${releaseId}, '${safeTitle}', '${safeBody}')`
        );

        return Response.json({
          success: true,
          message: `Email notification queued for ${subscribers[0].count} subscriber(s)`,
        });
      },
    },
  },
});