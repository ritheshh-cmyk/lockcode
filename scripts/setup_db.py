"""Run schema.sql against the Supabase database. Uses DATABASE_URL env var."""
import os, psycopg2
from dotenv import load_dotenv

load_dotenv(os.path.join(os.path.dirname(__file__), "..", ".env"))

db_url = os.environ.get("DATABASE_URL")
if not db_url:
    # Fallback: build from parts
    db_url = (
        f"postgresql://postgres:{os.environ['DB_PASSWORD']}"
        f"@db.swdojmsuznofynwgssxs.supabase.co:5432/postgres"
    )

conn = psycopg2.connect(db_url)
conn.autocommit = True
cur = conn.cursor()

# Read and execute schema
schema_path = os.path.join(os.path.dirname(__file__), "..", "web", "supabase", "schema.sql")
with open(schema_path, "r") as f:
    sql = f.read()

cur.execute(sql)
print("Schema executed successfully!")

# Verify table exists
cur.execute(
    "SELECT column_name, data_type FROM information_schema.columns "
    "WHERE table_name = 'licenses' ORDER BY ordinal_position"
)
rows = cur.fetchall()
print(f'\nTable "licenses" has {len(rows)} columns:')
for col_name, col_type in rows:
    print(f"  - {col_name} ({col_type})")

cur.close()
conn.close()
print("\nDone!")
