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

        const body = (await request.json()) as { published?: boolean };
        const published = body.published ? 1 : 0;

        run(
          `UPDATE releases SET published = ${published} WHERE id = ${params.id} AND user_id = ${user.id}`
        );

        return Response.json({ success: true });
      },
    },
  },
});