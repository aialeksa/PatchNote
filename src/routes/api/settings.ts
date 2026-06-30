import { createFileRoute } from "@tanstack/react-router";
import { getSession } from "~/lib/auth";
import { query, run } from "~/lib/db";

export const Route = createFileRoute("/api/settings")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const cookie = request.headers.get("cookie") || "";
        const match = cookie.match(/patchnotes_session=([^;]+)/);
        if (!match) return Response.json({ error: "Unauthorized" }, { status: 401 });
        const user = getSession(match[1]);
        if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

        const settings = query(`SELECT slack_webhook_url FROM user_settings WHERE user_id = ${user.id}`);
        return Response.json({
          slackWebhookUrl: settings[0]?.slack_webhook_url || "",
        });
      },

      POST: async ({ request }) => {
        const cookie = request.headers.get("cookie") || "";
        const match = cookie.match(/patchnotes_session=([^;]+)/);
        if (!match) return Response.json({ error: "Unauthorized" }, { status: 401 });
        const user = getSession(match[1]);
        if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

        const body = (await request.json()) as { slackWebhookUrl?: string };
        const url = (body.slackWebhookUrl || "").trim();

        const existing = query(`SELECT id FROM user_settings WHERE user_id = ${user.id}`);
        if (existing.length > 0) {
          run(`UPDATE user_settings SET slack_webhook_url = '${url.replace(/'/g, "''")}' WHERE user_id = ${user.id}`);
        } else {
          run(`INSERT INTO user_settings (user_id, slack_webhook_url) VALUES (${user.id}, '${url.replace(/'/g, "''")}')`);
        }

        return Response.json({ success: true });
      },
    },
  },
});