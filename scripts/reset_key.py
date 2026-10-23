"""Reset a license key (clear machine_id + activated_at). Uses DATABASE_URL env var."""
import os, psycopg2
from dotenv import load_dotenv

load_dotenv(os.path.join(os.path.dirname(__file__), "..", ".env"))

db_url = os.environ.get("DATABASE_URL")
if not db_url:
    db_url = (
        f"postgresql://postgres:{os.environ['DB_PASSWORD']}"
        f"@db.swdojmsuznofynwgssxs.supabase.co:5432/postgres"
    )

reg_key = input("Enter reg_key to reset: ").strip()
if not reg_key:
    print("No key entered. Exiting.")
    raise SystemExit(1)

conn = psycopg2.connect(db_url)
conn.autocommit = True
cur = conn.cursor()
cur.execute(
    "UPDATE licenses SET machine_id = NULL, activated_at = NULL WHERE reg_key = %s",
    (reg_key,)
)
print(f"Reset {cur.rowcount} row(s) for key {reg_key!r}")
cur.close()
conn.close()
