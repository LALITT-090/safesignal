import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "../../../../lib/supabase/server";
import { isAuthorityUser } from "../../../../lib/supabase/authority";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await request.json();
  const status = body.status;
  const allowedStatuses = ["new", "acknowledged", "resolved"];

  if (!allowedStatuses.includes(status)) {
    return NextResponse.json(
      { error: "Valid status is required." },
      { status: 400 }
    );
  }

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

  const { data, error } = await supabase
    .from("alerts")
    .update({ status })
    .eq("id", id)
    .select()
    .single();

  if (error) {
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }

  return NextResponse.json({ alert: data });
}
