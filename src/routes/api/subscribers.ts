import { createFileRoute } from "@tanstack/react-router";
import { getSession } from "~/lib/auth";
import { query } from "~/lib/db";

export const Route = createFileRoute("/api/subscribers")({
  server: {
    handlers: {
      // Subscribe
      POST: async ({ request }) => {
        const body = (await request.json()) as { email?: string };
        const email = body.email?.trim().toLowerCase();
        if (!email || !email.includes("@")) {
          return Response.json({ error: "Valid email required" }, { status: 400 });
        }

        try {
          query(`INSERT INTO changelog_subscribers (email) VALUES ('${email.replace(/'/g, "''")}')`);
          return Response.json({ success: true });
        } catch {
          return Response.json({ error: "Already subscribed" }, { status: 409 });
        }
      },

      // Get subscriber count (public)
      GET: async () => {
        const rows = query("SELECT COUNT(*) as count FROM changelog_subscribers");
        return Response.json({ count: rows[0]?.count || 0 });
      },
    },
  },
});