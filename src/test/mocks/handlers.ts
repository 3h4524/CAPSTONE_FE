import { http, HttpResponse } from "msw";

import {
  buildApiKeyOverview,
  buildAvailablePlan,
  buildDesignTemplateSummary,
  buildPagedResult,
  buildSessionUser,
  buildSupportTicket,
} from "@/test/factories";

// axios requests carry a relative path that only gets combined with `baseURL` inside the adapter,
// so MSW sees a relative path while jsdom has no document origin to resolve it against — the
// result is `Invalid URL`. Building absolute URLs here keeps handler matching aligned with what
// axios actually sends on the wire.
const resolveApiUrl = (path: string): string =>
  new URL(path, process.env.NEXT_PUBLIC_API_BASE_URL).toString();

export const handlers = [
  http.post(resolveApiUrl("/api/auth/login"), async ({ request }) => {
    const { email } = (await request.json()) as { email?: string };

    if (email === "locked@apcs.test") {
      return HttpResponse.json(
        { message: "Your account has been locked. Contact support." },
        { status: 423 }
      );
    }

    return HttpResponse.json({ user: buildSessionUser({ email: email ?? "" }) });
  }),

  http.post(resolveApiUrl("/api/auth/refresh"), () => new HttpResponse(null, { status: 204 })),

  http.get(resolveApiUrl("/api/auth/me"), () => HttpResponse.json(buildSessionUser())),

  http.get(resolveApiUrl("/api/api-keys"), () =>
    HttpResponse.json(buildApiKeyOverview())
  ),

  http.get(resolveApiUrl("/api/design-templates"), () =>
    HttpResponse.json(
      buildPagedResult([buildDesignTemplateSummary()], {
        pageSize: 20,
      })
    )
  ),

  http.get(resolveApiUrl("/api/support-tickets"), () =>
    HttpResponse.json(buildPagedResult([buildSupportTicket()], { pageSize: 20 }))
  ),

  http.get(resolveApiUrl("/api/subscriptions/overview"), () =>
    HttpResponse.json({
      currentSubscription: null,
      usageQuotas: [],
      availablePlans: [buildAvailablePlan()],
      recentInvoices: [],
      hasActivePaidPlan: false,
    })
  ),
];