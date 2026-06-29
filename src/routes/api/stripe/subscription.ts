import { createFileRoute } from "@tanstack/react-router";
import { getSession } from "~/lib/auth";
import { query } from "~/lib/db";

export const Route = createFileRoute("/api/stripe/subscription")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const cookie = request.headers.get("cookie") || "";
        const match = cookie.match(/patchnotes_session=([^;]+)/);
        if (!match) {
          return Response.json({ plan: null, status: "none" });
        }
        const user = getSession(match[1]);
        if (!user) {
          return Response.json({ plan: null, status: "none" });
        }

        // Check if user has an active subscription
        const subs = query(
          `SELECT plan_tier, status, current_period_end FROM subscriptions WHERE user_id = ${user.id} AND status = 'active' LIMIT 1`
        );

        if (subs.length > 0) {
          return Response.json({
            plan: subs[0].plan_tier,
            status: "active",
            currentPeriodEnd: subs[0].current_period_end,
          });
        }

        return Response.json({ plan: null, status: "none" });
      },
    },
  },
});