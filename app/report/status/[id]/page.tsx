"use client";

import { useEffect } from "react";
import { useParams, useRouter } from "next/navigation";

export default function DynamicReportStatusPage() {
  const params = useParams<{ id?: string }>();
  const router = useRouter();

  useEffect(() => {
    if (params?.id) {
      router.replace(`/report/status?reportId=${encodeURIComponent(params.id)}`);
    }
  }, [params, router]);

  return <main className="flex min-h-screen items-center justify-center bg-[#FAF8F5] text-[#5E5967]">Opening report tracking...</main>;
}
