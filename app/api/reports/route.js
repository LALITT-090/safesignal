import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { createSupabaseServerClient } from "../../../lib/supabase/server";
import { isAuthorityUser } from "../../../lib/supabase/authority";

function getSupabaseAdmin() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error("Supabase server environment variables are missing.");
  }

  return createClient(supabaseUrl, serviceRoleKey);
}

function normalizeText(value) {
  if (typeof value !== "string") {
    return "";
  }

  return value.trim();
}

function normalizeOptionalText(value) {
  if (typeof value !== "string") {
    return null;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function normalizeStatus(value) {
  const normalized = normalizeText(value || "").toLowerCase();
  const validStatuses = ["submitted", "connected", "under_review", "reviewed"];

  return validStatuses.includes(normalized) ? normalized : null;
}

function generateReportId() {
  return `SS-${Math.random().toString(36).slice(2, 9).toUpperCase()}`;
}

function normalizeCoordinate(value, minimum, maximum) {
  if (value === null || value === undefined || value === "") {
    return null;
  }

  const coordinate = Number(value);
  return Number.isFinite(coordinate) && coordinate >= minimum && coordinate <= maximum
    ? coordinate
    : null;
}

export async function GET(request) {
  try {
    const supabase = getSupabaseAdmin();
    const { searchParams } = new URL(request.url);
    const reportId = normalizeText(searchParams.get("report_id") || "");
    const includeCoordinates = searchParams.get("view") === "authority";

    if (includeCoordinates) {
      const supabaseAuth = await createSupabaseServerClient();
      const {
        data: { user },
      } = await supabaseAuth.auth.getUser();

      if (!user) {
        return NextResponse.json({ error: "Authority sign-in required." }, { status: 401 });
      }

      if (!isAuthorityUser(user)) {
        return NextResponse.json({ error: "Authority access required." }, { status: 403 });
      }
    }

    let query = supabase
      .from("reports")
      .select(
        includeCoordinates
          ? "id, report_id, category, description, location_name, location_label, latitude, longitude, incident_time, status, review_notes, reviewed_by, reviewed_at"
          : "id, report_id, category, description, location_name, location_label, incident_time, status"
      )
      .order("incident_time", {
        ascending: false,
      });

    if (reportId) {
      query = query.eq("report_id", reportId.toUpperCase());
    }

    const { data, error } = reportId
      ? await query.maybeSingle()
      : await query;

    if (error) {
      return NextResponse.json(
        {
          error: "Unable to load the requested report.",
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      report: reportId ? data ?? null : null,
      reports: reportId ? (data ? [data] : []) : data ?? [],
    });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Unable to connect to the reports API.",
      },
      { status: 500 }
    );
  }
}

export async function POST(request) {
  try {
    const body = await request.json();
    const category = normalizeText(body.category || "");
    const description = normalizeText(body.description || "");
    const otherDetail = normalizeText(body.other_category_details || "");
    const resolvedCategory = category || "Other";

    const incomingLocation = normalizeText(
      body.location_label || body.location_name || ""
    );
    const latitude = normalizeCoordinate(body.latitude, -90, 90);
    const longitude = normalizeCoordinate(body.longitude, -180, 180);

    const incidentTime = normalizeText(body.incident_time || "") || new Date().toISOString();
    const generatedReportId = generateReportId();

    const normalizedDescription =
      typeof description === "string"
        ? description.trim()
        : "";

    const finalDescription = [
      resolvedCategory === "Other" && otherDetail ? otherDetail : null,
      normalizedDescription || null,
    ]
      .filter(Boolean)
      .join("\n\n") || null;

    const payload = {
      report_id: generatedReportId,
      category: resolvedCategory,
      description: finalDescription,
      location_name: incomingLocation || "Location unavailable",
      location_label: incomingLocation || "Location unavailable",
      latitude,
      longitude,
      incident_time: incidentTime,
    };

    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase
      .from("reports")
      .insert([payload])
      .select("report_id")
      .single();

    if (error) {
      return NextResponse.json(
        {
          error: error.message,
        },
        { status: 500 }
      );
    }

    return NextResponse.json(
      {
        report_id: data?.report_id || generatedReportId,
        message: "Report submitted anonymously.",
      },
      { status: 201 }
    );
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Unable to create the report.",
      },
      { status: 500 }
    );
  }
}

export async function PATCH(request) {
  try {
    const body = await request.json();
    const reportId = normalizeText(body.report_id || "");
    const description = body.description;
    const status = normalizeStatus(body.status);
    const reviewNotes = normalizeOptionalText(body.review_notes || "");
    const reviewedBy = normalizeOptionalText(body.reviewed_by || "");

    if (!reportId) {
      return NextResponse.json(
        {
          error: "A report ID is required.",
        },
        { status: 400 }
      );
    }

    const normalizedDescription =
      typeof description === "string"
        ? description.trim()
        : null;

    const payload = {};

    if (description !== undefined) {
      payload.description = normalizedDescription || null;
    }

    if (status) {
      payload.status = status;
      payload.reviewed_at = new Date().toISOString();
    }

    if (reviewNotes !== null) {
      payload.review_notes = reviewNotes;
    }

    if (reviewedBy) {
      payload.reviewed_by = reviewedBy;
    }

    if (Object.keys(payload).length === 0) {
      return NextResponse.json(
        {
          error: "No valid update fields were supplied.",
        },
        { status: 400 }
      );
    }

    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase
      .from("reports")
      .update(payload)
      .eq("report_id", reportId.toUpperCase())
      .select("report_id, description, status, review_notes, reviewed_at")
      .single();

    if (error) {
      return NextResponse.json(
        {
          error: error.message,
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      report_id: data?.report_id || reportId,
      description: data?.description ?? "",
    });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Unable to update the report description.",
      },
      { status: 500 }
    );
  }
}

export async function PUT(request) {
  return PATCH(request);
}