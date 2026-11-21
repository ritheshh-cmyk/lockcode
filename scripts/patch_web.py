import os

# 1. Patch web/app/api/bridge/mcq/route.ts
mcq_path = os.path.join("web", "app", "api", "bridge", "mcq", "route.ts")
with open(mcq_path, "r", encoding="utf-8") as f:
    mcq_code = f.read()

# Replace imports
if 'import { validateLicenseKey } from "@/lib/license-validator";' not in mcq_code:
    mcq_code = mcq_code.replace(
        'import { sanitizePrompt } from "@/lib/sanitize";',
        'import { sanitizePrompt } from "@/lib/sanitize";\nimport { validateLicenseKey } from "@/lib/license-validator";'
    )

# Replace body parsing & add killswitch
old_parse = '''  // 2. Parse payload
  let body: { question?: string; options?: string[]; prompt?: string; regKey?: string; reg_key?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ success: false, error: "Invalid JSON payload" }, { status: 400 });
  }

  const regKey = (body.regKey || body.reg_key || req.headers.get("x-reg-key") || "anonymous").trim();'''

new_parse = '''  // 2. Parse payload
  let body: {
    question?: string;
    options?: string[];
    prompt?: string;
    regKey?: string;
    reg_key?: string;
    optionsCount?: number;
    options_count?: number;
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ success: false, error: "Invalid JSON payload" }, { status: 400 });
  }

  const regKey = (body.regKey || body.reg_key || req.headers.get("x-reg-key") || "anonymous").trim();

  // License validation (killswitch enforcement)
  const licenseError = await validateLicenseKey(regKey);
  if (licenseError) {
    return NextResponse.json(
      {
        success: false,
        error: `License validation failed: ${licenseError}`,
        killswitch: true,
        latency_ms: Date.now() - startTime,
      },
      { status: 403 }
    );
  }'''

if old_parse in mcq_code.replace("\r\n", "\n"):
    # Normalize and replace
    is_crlf = "\r\n" in mcq_code
    norm_code = mcq_code.replace("\r\n", "\n")
    norm_code = norm_code.replace(old_parse, new_parse)
    if "const optionsCount = body.optionsCount || body.options_count || (body.options?.length || 4);" not in norm_code:
        norm_code = norm_code.replace(
            '  const questionText = sanitizePrompt(rawQuestion);',
            '  const questionText = sanitizePrompt(rawQuestion);\n  const optionsCount = body.optionsCount || body.options_count || (body.options?.length || 4);'
        )
        norm_code = norm_code.replace(
            '    mode: "mcq",\n    regKey,',
            '    mode: "mcq",\n    optionsCount,\n    regKey,'
        )
    mcq_code = norm_code.replace("\n", "\r\n") if is_crlf else norm_code
    with open(mcq_path, "w", encoding="utf-8") as f:
        f.write(mcq_code)
    print("Successfully patched mcq/route.ts")
else:
    print("mcq old_parse not matched directly, checking if already patched...")

# 2. Patch web/app/admin/actions.ts
actions_path = os.path.join("web", "app", "admin", "actions.ts")
with open(actions_path, "r", encoding="utf-8") as f:
    actions_code = f.read()

is_crlf = "\r\n" in actions_code
norm_actions = actions_code.replace("\r\n", "\n")

# Make sure imports are present or dynamic
# Let's check updateLicense
old_update_tail = '''  const { error } = await supabaseAdmin
    .from("licenses")
    .update(updatePayload)
    .eq(column, value);
  if (error) throw new Error(error.message);
  revalidatePath("/admin");
}'''

new_update_tail = '''  const { error } = await supabaseAdmin
    .from("licenses")
    .update(updatePayload)
    .eq(column, value);
  if (error) throw new Error(error.message);
  try {
    const { invalidateLicenseValidationCache } = await import("@/lib/license-validator");
    invalidateLicenseValidationCache();
    const { invalidateLicenseAllotmentCache } = await import("@/lib/brain");
    invalidateLicenseAllotmentCache();
  } catch {}
  revalidatePath("/admin");
}'''

if old_update_tail in norm_actions:
    norm_actions = norm_actions.replace(old_update_tail, new_update_tail)
    print("Patched updateLicense in actions.ts")

# Check revokeLicense
old_revoke = '''export async function revokeLicense(idOrKey: string): Promise<void> {
  const { column, value } = getLicenseFilter(idOrKey, "revokeLicense");
  const { error } = await supabaseAdmin.from("licenses").update({ is_active: false }).eq(column, value);
  if (error) throw new Error(error.message);
}'''

new_revoke = '''export async function revokeLicense(idOrKey: string): Promise<void> {
  const { column, value } = getLicenseFilter(idOrKey, "revokeLicense");
  const { error } = await supabaseAdmin.from("licenses").update({ is_active: false }).eq(column, value);
  if (error) throw new Error(error.message);
  try {
    const { invalidateLicenseValidationCache } = await import("@/lib/license-validator");
    invalidateLicenseValidationCache();
    const { invalidateLicenseAllotmentCache } = await import("@/lib/brain");
    invalidateLicenseAllotmentCache();
  } catch {}
}'''

if old_revoke in norm_actions:
    norm_actions = norm_actions.replace(old_revoke, new_revoke)
    print("Patched revokeLicense in actions.ts")

# Check terminateLicense
old_terminate = '''export async function terminateLicense(idOrKey: string): Promise<void> {
  const { column, value } = getLicenseFilter(idOrKey, "terminateLicense");
  const { error } = await supabaseAdmin
    .from("licenses")
    .update({ expires_at: new Date().toISOString(), is_active: false })
    .eq(column, value);
  if (error) throw new Error(error.message);
}'''

new_terminate = '''export async function terminateLicense(idOrKey: string): Promise<void> {
  const { column, value } = getLicenseFilter(idOrKey, "terminateLicense");
  const { error } = await supabaseAdmin
    .from("licenses")
    .update({ expires_at: new Date().toISOString(), is_active: false })
    .eq(column, value);
  if (error) throw new Error(error.message);
  try {
    const { invalidateLicenseValidationCache } = await import("@/lib/license-validator");
    invalidateLicenseValidationCache();
    const { invalidateLicenseAllotmentCache } = await import("@/lib/brain");
    invalidateLicenseAllotmentCache();
  } catch {}
}'''

if old_terminate in norm_actions:
    norm_actions = norm_actions.replace(old_terminate, new_terminate)
    print("Patched terminateLicense in actions.ts")

# Check deleteLicense
old_delete = '''export async function deleteLicense(idOrKey: string): Promise<void> {
  const { column, value } = getLicenseFilter(idOrKey, "deleteLicense");
  const { error } = await supabaseAdmin.from("licenses").delete().eq(column, value);
  if (error) throw new Error(error.message);
}'''

new_delete = '''export async function deleteLicense(idOrKey: string): Promise<void> {
  const { column, value } = getLicenseFilter(idOrKey, "deleteLicense");
  const { error } = await supabaseAdmin.from("licenses").delete().eq(column, value);
  if (error) throw new Error(error.message);
  try {
    const { invalidateLicenseValidationCache } = await import("@/lib/license-validator");
    invalidateLicenseValidationCache();
    const { invalidateLicenseAllotmentCache } = await import("@/lib/brain");
    invalidateLicenseAllotmentCache();
  } catch {}
}'''

if old_delete in norm_actions:
    norm_actions = norm_actions.replace(old_delete, new_delete)
    print("Patched deleteLicense in actions.ts")

actions_code = norm_actions.replace("\n", "\r\n") if is_crlf else norm_actions
with open(actions_path, "w", encoding="utf-8") as f:
    f.write(actions_code)
print("Finished patching actions.ts")
