import { createFileRoute } from "@tanstack/react-router";
import { query } from "~/lib/db";

export const Route = createFileRoute("/api/changelog")({
  server: {
    handlers: {
      GET: async () => {
        const releases = query(
          `SELECT r.id, r.title, r.body, r.summary, r.tone, r.repo, r.created_at, u.name as user_name
           FROM releases r
           JOIN users u ON r.user_id = u.id
           WHERE r.published = 1
           ORDER BY r.created_at DESC
           LIMIT 50`
        );
        return Response.json({ releases });
      },
    },
  },
});