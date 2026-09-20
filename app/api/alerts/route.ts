import { NextResponse } from "next/server";
import { analyzePersistedReportsAndCreateAlerts, listAuthorityAlerts } from "../../../lib/alerts";
import { createSupabaseServerClient } from "../../../lib/supabase/server";
import { isAuthorityUser } from "../../../lib/supabase/authority";

export async function GET() {
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
    await analyzePersistedReportsAndCreateAlerts({ runAnalysis: true });
    const alerts = await listAuthorityAlerts();
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
