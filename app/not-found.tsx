import Link from "next/link";

export default function NotFound() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-[#FAF8F5] px-6 py-16 text-[#3B3540]">
      <div className="max-w-md rounded-[22px] border border-[#E7E0E3] bg-[#FFFFFF] p-8 text-center shadow-[0_18px_32px_rgba(67,42,82,0.06)]">
        <p className="text-[11px] font-extrabold uppercase tracking-[0.22em] text-[#432A52]">
          SafeSignal
        </p>
        <h1 className="mt-4 text-4xl font-extrabold tracking-[-0.04em] text-[#2D1B36]">Page not found</h1>
        <p className="mt-3 text-sm leading-6 text-[#5E5967]">
          The page you requested could not be found. You can return to the SafeSignal home screen.
        </p>
        <Link
          href="/"
          className="mt-6 inline-flex min-h-12 items-center justify-center rounded-xl bg-[#432A52] px-6 py-3 font-semibold text-[#FFFFFF] transition hover:bg-[#5F3E66]"
        >
          Back to home
        </Link>
      </div>
    </main>
  );
}
