import { createFileRoute } from "@tanstack/react-router";
import { execSync } from "node:child_process";

export const Route = createFileRoute("/api/waitlist")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          const body = (await request.json()) as { email?: string };
          const email = body.email?.trim().toLowerCase();
          if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
            return Response.json(
              { success: false, error: "Invalid email" },
              { status: 400 }
            );
          }
          execSync(
            `team-db "INSERT OR IGNORE INTO waitlist (email) VALUES ('${email.replace(/'/g, "''")}')"`,
            { encoding: "utf8" }
          );
          return Response.json({ success: true });
        } catch {
          return Response.json(
            { success: false, error: "Something went wrong" },
            { status: 500 }
          );
        }
      },
      GET: async () => {
        try {
          const result = execSync(
            `team-db "SELECT COUNT(*) as count FROM waitlist"`,
            { encoding: "utf8" }
          );
          const rows = JSON.parse(result);
          return Response.json({ count: rows[0]?.count ?? 0 });
        } catch {
          return Response.json({ count: 0 });
        }
      },
    },
  },
});