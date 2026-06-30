import { createFileRoute } from "@tanstack/react-router";
import { query, run } from "~/lib/db";
import { getSession } from "~/lib/auth";

export const Route = createFileRoute("/api/releases/id")({
  server: {
    handlers: {
      // Get a specific release by ID (public — no auth needed for published notes)
      GET: async ({ params }) => {
        const rows = query(
          `SELECT id, title, body, summary, tone, repo, created_at, published FROM releases WHERE id = ${params.id}`
        );
        if (rows.length === 0) {
          return Response.json({ error: "Not found" }, { status: 404 });
        }
        return Response.json({ release: rows[0] });
      },

      // Toggle publish status
      PUT: async ({ request, params }) => {
        const cookie = request.headers.get("cookie") || "";
        const match = cookie.match(/patchnotes_session=([^;]+)/);
        if (!match) {
          return Response.json({ error: "Unauthorized" }, { status: 401 });
        }
        const user = getSession(match[1]);
        if (!user) {
          return Response.json({ error: "Unauthorized" }, { status: 401 });
        }

        const body = (await request.json()) as { published?: boolean; title?: string; body?: string };
        const published = body.published !== undefined ? (body.published ? 1 : 0) : undefined;

        // Check the release exists and belongs to this user
        const existing = query(`SELECT id FROM releases WHERE id = ${params.id} AND user_id = ${user.id}`);
        if (existing.length === 0) {
          return Response.json({ error: "Not found" }, { status: 404 });
        }

        // Build update dynamically
        const updates: string[] = [];
        if (published !== undefined) updates.push(`published = ${published}`);
        if (body.title !== undefined) updates.push(`title = '${body.title.replace(/'/g, "''")}'`);
        if (body.body !== undefined) updates.push(`body = '${body.body.replace(/'/g, "''")}'`);

        if (updates.length > 0) {
          run(`UPDATE releases SET ${updates.join(", ")} WHERE id = ${params.id} AND user_id = ${user.id}`);
        }

        return Response.json({ success: true });
      },
    },
  },
});