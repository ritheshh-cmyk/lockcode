$SUPABASE_URL  = "https://swdojmsuznofynwgssxs.supabase.co"
$SERVICE_KEY   = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InN3ZG9qbXN1em5vZnlud2dzc3hzIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NzgyNjU5OSwiZXhwIjoyMDkzNDAyNTk5fQ.n_TZ3gA_tYTr-E8cvU5-F2ORoHDcZiQLnGOhReZx_54"

$headers = @{
    "apikey"        = $SERVICE_KEY
    "Authorization" = "Bearer $SERVICE_KEY"
    "Content-Type"  = "application/json"
    "Prefer"        = "return=representation"
}

Write-Host "`n=== TITAN Supabase Migration ===" -ForegroundColor Cyan

# ─── 1. Add model column to licenses ───────────────────────────────────────
Write-Host "`n[1/3] Adding model column to licenses..." -ForegroundColor Yellow
$sql1 = @"
ALTER TABLE licenses ADD COLUMN IF NOT EXISTS model VARCHAR(50) DEFAULT 'gemini';
UPDATE licenses SET model = 'gemini' WHERE model IS NULL;
"@

$body1 = [System.Text.Encoding]::UTF8.GetBytes(($sql1 | ConvertTo-Json -Compress))
# Use pg_meta SQL endpoint (v1)
try {
    $r1 = Invoke-RestMethod `
        -Uri "$SUPABASE_URL/rest/v1/rpc/exec_sql" `
        -Method POST `
        -Headers $headers `
        -Body ([System.Text.Encoding]::UTF8.GetBytes(([PSCustomObject]@{query=$sql1} | ConvertTo-Json))) `
        -ErrorAction Stop
    Write-Host "  [OK] model column added via RPC" -ForegroundColor Green
} catch {
    Write-Host "  [INFO] RPC not available, using pg_meta endpoint..." -ForegroundColor Gray
    # Fallback: Supabase pg endpoint
    try {
        $pgBody = [System.Text.Encoding]::UTF8.GetBytes(([PSCustomObject]@{query=$sql1} | ConvertTo-Json))
        $r1b = Invoke-RestMethod `
            -Uri "$SUPABASE_URL/pg/query" `
            -Method POST `
            -Headers $headers `
            -Body $pgBody `
            -ErrorAction Stop
        Write-Host "  [OK] model column added via pg endpoint" -ForegroundColor Green
    } catch {
        Write-Host "  [WARN] Could not run via API. Error: $($_.Exception.Message)" -ForegroundColor Yellow
    }
}

# ─── 2. Create admin_config table + insert hash ─────────────────────────────
Write-Host "`n[2/3] Creating admin_config table and inserting password hash..." -ForegroundColor Yellow
$hash = "4016f2f6da63d9d07f20197b69aacc1c4cc65fb489fae9a178605233b2e07035"

# Use upsert via PostgREST (no raw SQL needed — table already existed in earlier sessions)
try {
    $upsertBody = [System.Text.Encoding]::UTF8.GetBytes(([PSCustomObject]@{key="admin_password_hash"; value=$hash} | ConvertTo-Json))
    $upsertHeaders = $headers.Clone()
    $upsertHeaders["Prefer"] = "resolution=merge-duplicates"
    $r2 = Invoke-RestMethod `
        -Uri "$SUPABASE_URL/rest/v1/admin_config" `
        -Method POST `
        -Headers $upsertHeaders `
        -Body $upsertBody `
        -ErrorAction Stop
    Write-Host "  [OK] admin_config row upserted" -ForegroundColor Green
} catch {
    Write-Host "  [WARN] $($_.Exception.Message)" -ForegroundColor Yellow
}

# ─── 3. Verify licenses.model column exists ──────────────────────────────────
Write-Host "`n[3/3] Verifying licenses table structure..." -ForegroundColor Yellow
try {
    $r3 = Invoke-RestMethod `
        -Uri "$SUPABASE_URL/rest/v1/licenses?select=id,model&limit=3" `
        -Method GET `
        -Headers $headers `
        -ErrorAction Stop
    Write-Host "  [OK] licenses.model column verified. Sample rows:" -ForegroundColor Green
    $r3 | ForEach-Object { Write-Host "     id=$($_.id)  model=$($_.model)" -ForegroundColor White }
} catch {
    Write-Host "  [FAIL] $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host "`n=== Done ===" -ForegroundColor Cyan
