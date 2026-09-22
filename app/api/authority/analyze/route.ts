import { NextResponse } from "next/server";
import { analyzePersistedReportsAndCreateAlerts } from "../../../../lib/alerts";
import { createSupabaseServerClient } from "../../../../lib/supabase/server";
import { isAuthorityUser } from "../../../../lib/supabase/authority";

export async function POST() {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user || !isAuthorityUser(user)) {
    return NextResponse.json({ error: "Authority access required." }, { status: 403 });
  }

  try {
    const result = await analyzePersistedReportsAndCreateAlerts({
      runAnalysis: true,
      includeCoordinates: true,
    });
    return NextResponse.json({ patternGroupCount: result.patternGroupCount ?? 0 });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to analyze reports." },
      { status: 500 }
    );
  }
}