"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { isAuthorityUser } from "../../lib/supabase/authority";
import { createSupabaseBrowserClient } from "../../lib/supabase/browser";

function NavLink({ href, label, active }: { href: string; label: string; active: boolean }) {
  return (
    <Link
      href={href}
      className={[
        "rounded-full px-3.5 py-2 text-sm font-semibold transition",
        active
          ? "bg-[#F2ECF3] text-[#2D1B36] ring-1 ring-[#432A52]/15"
          : "text-[#432A52] hover:bg-[#FAF8F5] hover:text-[#2D1B36]",
      ].join(" ")}
    >
      {label}
    </Link>
  );
}

export function AppHeader() {
  const pathname = usePathname() ?? "/";
  const router = useRouter();
  const [isAuthority, setIsAuthority] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    async function resolveAuthorityState() {
      const supabase = createSupabaseBrowserClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      setIsAuthority(Boolean(user && isAuthorityUser(user)));
    }

    void resolveAuthorityState();
  }, [pathname]);

  const activeMode =
    pathname.startsWith("/dashboard") ||
    pathname.startsWith("/reviews") ||
    pathname.startsWith("/map") ||
    pathname.startsWith("/operations")
      ? "authority"
      : "public";

  const authorityLinks = [
    { href: "/dashboard", label: "Dashboard" },
    { href: "/reviews", label: "Reviews" },
    { href: "/map", label: "Map" },
    { href: "/operations", label: "Alerts" },
  ];

  const publicLinks = [
    { href: "/", label: "Home" },
    { href: "/report", label: "Report" },
    { href: "/report/status", label: "Report Status" },
  ];

  async function handleSignOut() {
    const supabase = createSupabaseBrowserClient();
    await supabase.auth.signOut();
    router.push("/login");
  }

  const links = activeMode === "authority" ? authorityLinks : publicLinks;

  return (
    <header className="sticky top-0 z-50 border-b border-[#E7E0E3] bg-[#FAF8F5]/90 backdrop-blur-md">
      <div className="page-shell flex items-center justify-between gap-4 py-3.5">
        <div className="flex items-center gap-3">
          <Link href={activeMode === "authority" ? "/dashboard" : "/"} className="text-sm font-extrabold uppercase tracking-[0.22em] text-[#2D1B36]">
            SafeSignal
          </Link>
          <span className="hidden rounded-full border border-[#E7E0E3] bg-white px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.16em] text-[#432A52] sm:inline-flex">
            {activeMode === "authority" ? "Authority" : "Public"}
          </span>
        </div>

        <nav aria-label="Primary navigation" className="hidden items-center gap-2 lg:flex">
          {links.map((link) => (
            <NavLink
              key={link.href + link.label}
              href={link.href}
              label={link.label}
              active={
                pathname === link.href ||
                (link.href === "/dashboard" && pathname.startsWith("/dashboard")) ||
                (link.href === "/operations" && pathname.startsWith("/operations"))
              }
            />
          ))}
        </nav>

        <div className="hidden items-center gap-3 lg:flex">
          {activeMode === "authority" ? (
            <>
              <div className="rounded-full border border-[#E7E0E3] bg-white px-3 py-2 text-[10px] font-bold uppercase tracking-[0.16em] text-[#432A52]">
                {isAuthority ? "Authorized" : "Checking"}
              </div>
              <button
                type="button"
                onClick={handleSignOut}
                className="rounded-full border border-[#E7E0E3] bg-white px-4 py-2 text-sm font-semibold text-[#2D1B36] transition hover:bg-[#F2ECF3]"
              >
                Sign out
              </button>
            </>
          ) : (
            <Link
              href="/login"
              className="rounded-full border border-[#E7E0E3] bg-white px-4 py-2 text-sm font-semibold text-[#2D1B36] transition hover:bg-[#F2ECF3]"
            >
              Authority Login
            </Link>
          )}
        </div>

        <button
          type="button"
          aria-label="Toggle navigation"
          aria-expanded={mobileOpen}
          onClick={() => setMobileOpen((current) => !current)}
          className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-[#E7E0E3] bg-white text-[#2D1B36] lg:hidden"
        >
          <span className="text-lg">☰</span>
        </button>
      </div>

      {mobileOpen && (
        <div className="page-shell pb-4 lg:hidden">
          <div className="safe-card flex flex-col gap-2 p-3">
            {links.map((link) => (
              <Link
                key={link.href + link.label}
                href={link.href}
                onClick={() => setMobileOpen(false)}
                className={[
                  "rounded-2xl px-3 py-2.5 text-sm font-semibold",
                  pathname === link.href ||
                  (link.href === "/dashboard" && pathname.startsWith("/dashboard")) ||
                  (link.href === "/operations" && pathname.startsWith("/operations"))
                    ? "bg-[#F2ECF3] text-[#2D1B36]"
                    : "text-[#432A52] hover:bg-[#FAF8F5]",
                ].join(" ")}
              >
                {link.label}
              </Link>
            ))}

            {activeMode === "authority" ? (
              <button
                type="button"
                onClick={() => {
                  setMobileOpen(false);
                  void handleSignOut();
                }}
                className="mt-1 rounded-2xl border border-[#E7E0E3] bg-white px-3 py-2.5 text-left text-sm font-semibold text-[#2D1B36]"
              >
                Sign out
              </button>
            ) : (
              <Link
                href="/login"
                onClick={() => setMobileOpen(false)}
                className="mt-1 rounded-2xl border border-[#E7E0E3] bg-white px-3 py-2.5 text-left text-sm font-semibold text-[#2D1B36]"
              >
                Authority Login
              </Link>
            )}
          </div>
        </div>
      )}
    </header>
  );
}
