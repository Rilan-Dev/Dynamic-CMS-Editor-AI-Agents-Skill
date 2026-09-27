import { NextResponse } from "next/server";
import { leadSchema } from "@/lib/schemas";

/**
 * Lead intake (contact form).
 * P4 (data layer) persists to the `leads` table via leadRepo and adds
 * notifications; until then the endpoint validates and acknowledges so
 * the production form flow is real end-to-end.
 */
export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { data: null, error: "Invalid JSON body" },
      { status: 400 }
    );
  }

  const parsed = leadSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { data: null, error: "Validation failed", issues: parsed.error.flatten().fieldErrors },
      { status: 422 }
    );
  }

  // TODO(P4): await leadRepo.create(parsed.data)
  console.info("[lead]", parsed.data.email, parsed.data.service);

  return NextResponse.json({ data: { received: true }, error: null }, { status: 201 });
}
