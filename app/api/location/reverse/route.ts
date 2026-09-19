import { NextResponse } from "next/server";
import { reverseGeocode } from "../../../../lib/geocoding";

export async function GET(request: Request) {
  const params = new URL(request.url).searchParams;
  const latitude = Number(params.get("lat"));
  const longitude = Number(params.get("lon"));

  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
    return NextResponse.json({ error: "A valid location is required." }, { status: 400 });
  }

  try {
    return NextResponse.json({ result: await reverseGeocode(latitude, longitude) });
  } catch {
    return NextResponse.json(
      { error: "We could not identify that location." },
      { status: 502 }
    );
  }
}
