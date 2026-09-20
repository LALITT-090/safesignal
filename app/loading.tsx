export default function Loading() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-[#FAF8F5] px-6 text-[#3B3540]">
      <div className="text-center">
        <div className="mx-auto h-10 w-10 animate-spin rounded-full border-2 border-[#432A52] border-t-transparent" />
        <p className="mt-5 text-[11px] font-extrabold uppercase tracking-[0.22em] text-[#432A52]">
          SafeSignal
        </p>
        <p className="mt-2 text-sm text-[#5E5967]">Loading...</p>
      </div>
    </main>
  );
}
