import { createFileRoute } from "@tanstack/react-router";
import { getSession } from "~/lib/auth";
import { query, run } from "~/lib/db";
import { getTierFromPriceId, type PlanTier } from "~/lib/stripe";

const StripeKey = process.env.Stripe_Secret_Key || "";

export const Route = createFileRoute("/api/stripe/verify-session")({
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

        const body = (await request.json()) as { sessionId?: string };
        const sessionId = body.sessionId;
        if (!sessionId) {
          return Response.json({ error: "Missing session ID" }, { status: 400 });
        }

        if (!StripeKey) {
          return Response.json({ error: "Stripe not configured" }, { status: 500 });
        }

        // Retrieve the checkout session from Stripe
        const sessionRes = await fetch(`https://api.stripe.com/v1/checkout/sessions/${sessionId}`, {
          headers: {
            Authorization: `Bearer ${StripeKey}`,
          },
        });

        if (!sessionRes.ok) {
          const err = await sessionRes.json();
          console.error("Stripe session verify error:", err);
          return Response.json({ error: "Failed to verify session" }, { status: 502 });
        }

        const session = await sessionRes.json();

        // Verify it's for this user
        if (String(session.client_reference_id) !== String(user.id)) {
          return Response.json({ error: "Session does not belong to this user" }, { status: 403 });
        }

        // Verify payment was successful
        if (session.payment_status !== "paid" && session.payment_status !== "no_payment_required") {
          return Response.json({ error: "Payment not completed" }, { status: 400 });
        }

        // Get the subscription details
        const subId = session.subscription;
        if (!subId) {
          return Response.json({ error: "No subscription in session" }, { status: 400 });
        }

        // Get subscription details from Stripe
        const subRes = await fetch(`https://api.stripe.com/v1/subscriptions/${subId}`, {
          headers: {
            Authorization: `Bearer ${StripeKey}`,
          },
        });
        if (!subRes.ok) {
          return Response.json({ error: "Failed to get subscription" }, { status: 502 });
        }
        const subscription = await subRes.json();

        // Determine plan from the price
        const priceId = subscription.items?.data?.[0]?.price?.id;
        const planTier = getTierFromPriceId(priceId);
        if (!planTier) {
          return Response.json({ error: "Unknown plan" }, { status: 400 });
        }

        const periodEnd = new Date(subscription.current_period_end * 1000).toISOString();
        const customerId = session.customer;

        // Upsert subscription in our DB
        const existing = query(`SELECT id FROM subscriptions WHERE user_id = ${user.id}`);
        if (existing.length > 0) {
          run(
            `UPDATE subscriptions SET stripe_customer_id = '${customerId}', stripe_subscription_id = '${subId}', plan_tier = '${planTier}', status = 'active', current_period_end = '${periodEnd}' WHERE user_id = ${user.id}`
          );
        } else {
          run(
            `INSERT INTO subscriptions (user_id, stripe_customer_id, stripe_subscription_id, plan_tier, status, current_period_end) VALUES (${user.id}, '${customerId}', '${subId}', '${planTier}', 'active', '${periodEnd}')`
          );
        }

        return Response.json({
          success: true,
          plan: planTier,
          status: "active",
          currentPeriodEnd: periodEnd,
        });
      },
    },
  },
});