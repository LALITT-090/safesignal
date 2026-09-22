import { NextResponse } from "next/server";
import { listAuthorityAlerts } from "../../../lib/alerts";
import { createSupabaseServerClient } from "../../../lib/supabase/server";
import { isAuthorityUser } from "../../../lib/supabase/authority";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const statusFilter = searchParams.get("status");
  const normalizedFilter = statusFilter ? statusFilter.toLowerCase() : "all";

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user || !isAuthorityUser(user)) {
    return NextResponse.json(
      { error: "Authority sign-in required." },
      { status: 401 }
    );
  }

  try {
    const alerts = await listAuthorityAlerts(normalizedFilter === "all" ? null : normalizedFilter);
    return NextResponse.json({ alerts });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Unable to load alerts.",
      },
      { status: 500 }
    );
  }
}
