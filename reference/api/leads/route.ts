import { NextResponse } from "next/server";
import { leadSchema } from "@/lib/schemas";
import { saveLead } from "@/lib/server/db";
import { sendLeadNotification } from "@/lib/server/leadNotification";
import { createRateLimiter } from "./rateLimit";
import { resolveTrustedClientIp } from "./trustedClientIp";

const limiter = createRateLimiter({
  windowMs: 10 * 60 * 1000,
  maxHits: 5,
});

export async function POST(request: Request) {
  if (limiter.isLimited(resolveTrustedClientIp(request))) {
    return NextResponse.json(
      { data: null, error: "Too many requests" },
      { status: 429 },
    );
  }

  const body = await request.json().catch(() => null);
  const parsed = leadSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      {
        data: null,
        error: "Validation failed",
        issues: parsed.error.flatten().fieldErrors,
      },
      { status: 422 },
    );
  }

  const lead = parsed.data;
  const [stored, notified] = await Promise.all([
    saveLead(lead),
    sendLeadNotification(lead),
  ]);
  if (!stored && !notified) {
    return NextResponse.json(
      { data: null, error: "Lead delivery unavailable" },
      { status: 503 },
    );
  }

  return NextResponse.json(
    { data: { received: true }, error: null },
    { status: 201 },
  );
}
