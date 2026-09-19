import { NextResponse } from "next/server";
import { searchLocations } from "../../../../lib/geocoding";

export async function GET(request: Request) {
  const query = new URL(request.url).searchParams.get("q")?.trim() || "";

  if (query.length < 2) {
    return NextResponse.json({ results: [] });
  }

  try {
    return NextResponse.json({ results: await searchLocations(query) });
  } catch {
    return NextResponse.json(
      { error: "Location search is temporarily unavailable." },
      { status: 502 }
    );
  }
}
