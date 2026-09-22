"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createSupabaseBrowserClient } from "../../lib/supabase/browser";
import { isAuthorityUser } from "../../lib/supabase/authority";

type Report = {
  report_id: string;
  category: string | null;
  location_name: string | null;
  location_label: string | null;
  description: string | null;
  incident_time: string;
  status: string | null;
};

export default function AuthorityReportsPage() {
  const router = useRouter();
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function loadReports() {
      const supabase = createSupabaseBrowserClient();
      const { data: { user } } = await supabase.auth.getUser();

      if (!user || !isAuthorityUser(user)) {
        router.replace("/login?next=/authority/reports");
        return;
      }

      try {
        const response = await fetch("/api/reports?view=authority");
        const result = await response.json();
        if (!response.ok) throw new Error(result.error || "Unable to load reports.");
        setReports(result.reports ?? []);
      } catch (loadError) {
        setError(loadError instanceof Error ? loadError.message : "Unable to load reports.");
      } finally {
        setLoading(false);
      }
    }

    void loadReports();
  }, [router]);

  if (loading) return <main className="flex min-h-screen items-center justify-center bg-[#FAF8F5]">Loading reports...</main>;
  if (error) return <main className="bg-[#FAF8F5] p-8 text-[#B94A48]">{error}</main>;

  return (
    <main className="bg-[#FAF8F5] py-10 text-[#3B3540] md:py-12">
      <div className="page-shell">
        <p className="text-xs font-bold uppercase tracking-[0.22em] text-[#432A52]">Authority reports</p>
        <h1 className="mt-2 text-3xl font-extrabold text-[#2D1B36]">All reports</h1>
        <div className="mt-8 overflow-hidden rounded-3xl border border-[#E7E0E3] bg-white">
          <div className="overflow-x-auto">
            <table className="min-w-full text-left">
              <thead className="bg-[#FAF8F5]"><tr>{["Report ID", "Category", "Location", "Description", "Time", "Status"].map((heading) => <th key={heading} className="px-5 py-4 text-[11px] font-bold uppercase tracking-[0.16em] text-[#432A52]">{heading}</th>)}</tr></thead>
              <tbody>{reports.map((report) => <tr key={report.report_id} className="border-t border-[#E7E0E3]"><td className="px-5 py-4 text-sm font-bold text-[#432A52]">{report.report_id}</td><td className="px-5 py-4 text-sm">{report.category || "Not provided"}</td><td className="px-5 py-4 text-sm">{report.location_name || report.location_label || "Location unavailable"}</td><td className="max-w-md px-5 py-4 text-sm">{report.description || "No description provided."}</td><td className="whitespace-nowrap px-5 py-4 text-sm">{new Date(report.incident_time).toLocaleString()}</td><td className="px-5 py-4 text-sm">{report.status || "submitted"}</td></tr>)}</tbody>
            </table>
          </div>
          {reports.length === 0 && <p className="p-10 text-center text-[#5E5967]">No reports available.</p>}
        </div>
      </div>
    </main>
  );
}