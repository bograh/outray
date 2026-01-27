import { createFileRoute } from "@tanstack/react-router";
import { auth } from "../../../lib/auth";
import {
  initializeTransaction,
  PAYSTACK_PRICES_KOBO,
  type PaystackPlan,
} from "../../../lib/paystack";

export const Route = createFileRoute("/api/checkout/paystack")({
  server: {
    handlers: {
      /**
       * GET /api/checkout/paystack?plan=beam&organizationId=xxx
       *
       * Initializes a Paystack transaction and returns the access_code
       * for opening the Paystack popup on the frontend.
       */
      GET: async ({ request }) => {
        const url = new URL(request.url);
        const plan = url.searchParams.get("plan") as PaystackPlan | null;
        const organizationId = url.searchParams.get("organizationId");

        // Validate plan
        if (!plan || !["ray", "beam", "pulse"].includes(plan)) {
          return Response.json(
            { error: "Invalid plan. Must be ray, beam, or pulse." },
            { status: 400 },
          );
        }

        // Validate organization ID
        if (!organizationId) {
          return Response.json(
            { error: "Organization ID is required." },
            { status: 400 },
          );
        }

        // Get user session
        const session = await auth.api.getSession({
          headers: request.headers,
        });

        if (!session?.user) {
          return Response.json({ error: "Authentication required." }, { status: 401 });
        }

        const email = session.user.email;
        if (!email) {
          return Response.json(
            { error: "User email is required for Paystack checkout." },
            { status: 400 },
          );
        }

        try {
          const amount = PAYSTACK_PRICES_KOBO[plan];

          const result = await initializeTransaction({
            email,
            amount,
            metadata: {
              organizationId,
              plan,
              userId: session.user.id,
            },
            callback_url: `${process.env.APP_URL}/api/checkout/paystack-callback`,
          });

          return Response.json({
            success: true,
            accessCode: result.data.access_code,
            reference: result.data.reference,
            authorizationUrl: result.data.authorization_url,
          });
        } catch (error) {
          console.error("[Paystack Checkout] Error:", error);
          return Response.json(
            {
              error:
                error instanceof Error
                  ? error.message
                  : "Failed to initialize payment",
            },
            { status: 500 },
          );
        }
      },
    },
  },
});
