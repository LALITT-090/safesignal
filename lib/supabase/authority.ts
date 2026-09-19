import type { User } from "@supabase/supabase-js";

function normalizeEmail(value: string | null | undefined) {
  return typeof value === "string" ? value.trim().toLowerCase() : "";
}

function configuredAuthorityEmails() {
  const rawValue =
    process.env.AUTHORITY_EMAILS || process.env.NEXT_PUBLIC_AUTHORITY_EMAILS || "";

  return rawValue
    .split(",")
    .map((email) => normalizeEmail(email))
    .filter(Boolean);
}

export function isAuthorityUser(user: User | null) {
  if (!user) {
    return false;
  }

  const appRole = normalizeEmail(String(user.app_metadata?.role ?? ""));
  const userRole = normalizeEmail(String(user.user_metadata?.role ?? ""));
  const role = appRole || userRole;
  const email = normalizeEmail(user.email);
  const allowlist = configuredAuthorityEmails();

  return role === "authority" || (!!email && allowlist.includes(email));
}
