import { createFileRoute } from "@tanstack/react-router";
import { getSession } from "~/lib/auth";
import { getPriceId, type PlanTier } from "~/lib/stripe";

const StripeKey = process.env.Stripe_Secret_Key || "";

export const Route = createFileRoute("/api/stripe/create-checkout")({
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

        const body = (await request.json()) as { plan?: PlanTier };
        const plan = body.plan;
        if (!plan || !["starter", "team", "scale"].includes(plan)) {
          return Response.json({ error: "Invalid plan. Choose: starter, team, or scale." }, { status: 400 });
        }

        const priceId = getPriceId(plan);
        if (!StripeKey) {
          return Response.json({ error: "Stripe not configured" }, { status: 500 });
        }

        // Get the app's base URL for redirects
        const origin = request.headers.get("origin") || "https://2ccaddebe1656613989ca7f52d9909f4.ctonew.app";

        // Create a Stripe Checkout Session via REST API
        const sessionRes = await fetch("https://api.stripe.com/v1/checkout/sessions", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${StripeKey}`,
            "Content-Type": "application/x-www-form-urlencoded",
          },
          body: new URLSearchParams({
            "mode": "subscription",
            "line_items[0][price]": priceId,
            "line_items[0][quantity]": "1",
            "success_url": `${origin}/dashboard?checkout=success&session_id={CHECKOUT_SESSION_ID}`,
            "cancel_url": `${origin}/dashboard?checkout=cancel`,
            "client_reference_id": String(user.id),
            "customer_email": user.email,
          }),
        });

        if (!sessionRes.ok) {
          const err = await sessionRes.json();
          console.error("Stripe checkout error:", err);
          return Response.json({ error: "Failed to create checkout session" }, { status: 502 });
        }

        const session = await sessionRes.json();
        return Response.json({ url: session.url, sessionId: session.id });
      },
    },
  },
});