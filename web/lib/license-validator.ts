import { supabaseAdmin } from "@/lib/supabase";

interface CachedLicenseValidation {
  err: string | null;
  expiry: number;
}

const licenseValidationCache = new Map<string, CachedLicenseValidation>();

/**
 * Validate license per query (payload-bound killswitch).
 * Returns null if valid, error string if invalid.
 */
export async function validateLicenseKey(regKey: string): Promise<string | null> {
  const normalizedKey = (regKey || "").trim();
  if (!normalizedKey || normalizedKey === "anonymous") {
    return null; // bypass validation for anonymous/dev testing
  }

  const now = Date.now();
  const cached = licenseValidationCache.get(normalizedKey);
  if (cached && cached.expiry > now) {
    return cached.err;
  }

  try {
    const { data, error } = await supabaseAdmin
      .from("licenses")
      .select("is_active, expires_at")
      .eq("reg_key", normalizedKey)
      .maybeSingle();

    let err: string | null = null;
    if (error || !data) {
      err = "License not found";
    } else if (!data.is_active) {
      err = "License revoked";
    } else if (data.expires_at && new Date(data.expires_at).getTime() < now) {
      err = "License expired";
    }

    licenseValidationCache.set(normalizedKey, { err, expiry: now + 60_000 });
    return err;
  } catch {
    return null; // fail-open on transient database connection error to prevent blocking valid students
  }
}

/**
 * Purge license validation cache on administrative mutations (revocation, extension, edits)
 */
export function invalidateLicenseValidationCache(regKey?: string): void {
  if (regKey) {
    licenseValidationCache.delete(regKey.trim());
  } else {
    licenseValidationCache.clear();
  }
}
