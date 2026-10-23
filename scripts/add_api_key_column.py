"""Add api_key column to licenses table. Uses DATABASE_URL env var."""
import os, psycopg2
from dotenv import load_dotenv

load_dotenv(os.path.join(os.path.dirname(__file__), "..", ".env"))

db_url = os.environ.get("DATABASE_URL")
if not db_url:
    db_url = (
        f"postgresql://postgres:{os.environ['DB_PASSWORD']}"
        f"@db.swdojmsuznofynwgssxs.supabase.co:5432/postgres"
    )

conn = psycopg2.connect(db_url)
conn.autocommit = True
cur = conn.cursor()

cur.execute("ALTER TABLE licenses ADD COLUMN IF NOT EXISTS api_key TEXT DEFAULT NULL;")
print("Added api_key column (if not already present)")

cur.execute(
    "SELECT column_name, data_type FROM information_schema.columns "
    "WHERE table_name = 'licenses' ORDER BY ordinal_position"
)
for col, dtype in cur.fetchall():
    print(f"  - {col} ({dtype})")

cur.close()
conn.close()
print("\nDone!")
