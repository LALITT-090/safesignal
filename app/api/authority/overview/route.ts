import { NextResponse } from "next/server";
import { analyzePersistedReportsAndCreateAlerts, listAuthorityAlerts } from "../../../../lib/alerts";
import { listPersistedPatternClusters } from "../../../../lib/pattern-groups";
import { createSupabaseServerClient } from "../../../../lib/supabase/server";
import { isAuthorityUser } from "../../../../lib/supabase/authority";

export async function GET() {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user || !isAuthorityUser(user)) {
    return NextResponse.json({ error: "Authority access required." }, { status: 403 });
  }

  try {
    const result = await analyzePersistedReportsAndCreateAlerts({
      runAnalysis: false,
      includeCoordinates: true,
    });
    const alerts = await listAuthorityAlerts();
    const patterns = await listPersistedPatternClusters();

    return NextResponse.json({ reports: result.reports, patterns, alerts });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to load authority overview." },
      { status: 500 }
    );
  }
}