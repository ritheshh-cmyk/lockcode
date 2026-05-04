"""Add api_key column to the licenses table."""
import psycopg2

conn = psycopg2.connect(
    host="db.swdojmsuznofynwgssxs.supabase.co",
    port=5432, dbname="postgres", user="postgres",
    password="Lucky@9392404104",
)
conn.autocommit = True
cur = conn.cursor()

cur.execute("""
    ALTER TABLE licenses
    ADD COLUMN IF NOT EXISTS api_key TEXT DEFAULT NULL;
""")
print("Added api_key column")

# Verify
cur.execute(
    "SELECT column_name, data_type FROM information_schema.columns "
    "WHERE table_name = 'licenses' ORDER BY ordinal_position"
)
for col, dtype in cur.fetchall():
    print(f"  - {col} ({dtype})")

cur.close()
conn.close()
print("\nDone!")
