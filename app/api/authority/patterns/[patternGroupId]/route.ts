import { NextResponse } from "next/server";
import { getPersistedPatternCluster } from "../../../../../lib/pattern-groups";
import { createSupabaseServerClient } from "../../../../../lib/supabase/server";
import { isAuthorityUser } from "../../../../../lib/supabase/authority";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ patternGroupId: string }> }
) {
  const { patternGroupId } = await params;
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user || !isAuthorityUser(user)) {
    return NextResponse.json({ error: "Authority access required." }, { status: 403 });
  }

  try {
    const pattern = await getPersistedPatternCluster(patternGroupId);
    if (!pattern) {
      console.error("Pattern Group unavailable", { patternGroupId, table: "pattern_groups" });
      return NextResponse.json({ error: "Pattern Group unavailable." }, { status: 404 });
    }

    return NextResponse.json({ pattern });
  } catch (error) {
    console.error("Pattern Group query failed", { patternGroupId, table: "pattern_groups", error });
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to load Pattern Group." },
      { status: 500 }
    );
  }
}