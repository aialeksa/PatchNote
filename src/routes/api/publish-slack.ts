import { createFileRoute } from "@tanstack/react-router";
import { getSession } from "~/lib/auth";
import { query } from "~/lib/db";

export const Route = createFileRoute("/api/publish-slack")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const cookie = request.headers.get("cookie") || "";
        const match = cookie.match(/patchnotes_session=([^;]+)/);
        if (!match) return Response.json({ error: "Unauthorized" }, { status: 401 });
        const user = getSession(match[1]);
        if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

        const body = (await request.json()) as { releaseId?: number };
        const releaseId = body.releaseId;
        if (!releaseId) {
          return Response.json({ error: "Release ID required" }, { status: 400 });
        }

        // Get the release
        const releases = query(
          `SELECT id, title, body, summary, tone FROM releases WHERE id = ${releaseId} AND user_id = ${user.id} AND published = 1`
        );
        if (releases.length === 0) {
          return Response.json({ error: "Published release not found" }, { status: 404 });
        }
        const release = releases[0];

        // Get user's Slack webhook URL
        const settings = query(`SELECT slack_webhook_url FROM user_settings WHERE user_id = ${user.id}`);
        const webhookUrl = settings[0]?.slack_webhook_url;
        if (!webhookUrl) {
          return Response.json({ error: "No Slack webhook configured" }, { status: 400 });
        }

        // Format a nice Slack message
        const slackMessage = {
          blocks: [
            {
              type: "header",
              text: { type: "plain_text", text: `📝 ${release.title}`, emoji: true },
            },
            {
              type: "section",
              text: { type: "mrkdwn", text: release.summary || release.body.slice(0, 300) },
            },
            {
              type: "context",
              elements: [
                {
                  type: "mrkdwn",
                  text: `*Tone:* ${release.tone}   *Release ID:* ${release.id}`,
                },
              ],
            },
          ],
        };

        // Send to Slack
        try {
          const slackRes = await fetch(webhookUrl, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(slackMessage),
          });

          if (!slackRes.ok) {
            const errText = await slackRes.text();
            return Response.json({ error: `Slack error: ${errText}` }, { status: 502 });
          }

          return Response.json({ success: true, message: "Posted to Slack!" });
        } catch {
          return Response.json({ error: "Failed to reach Slack webhook" }, { status: 502 });
        }
      },
    },
  },
});