"""Run schema.sql against the Supabase database."""
import psycopg2

conn = psycopg2.connect(
    host="db.swdojmsuznofynwgssxs.supabase.co",
    port=5432,
    dbname="postgres",
    user="postgres",
    password="Lucky@9392404104",
)
conn.autocommit = True
cur = conn.cursor()

# Read and execute schema
with open("web/supabase/schema.sql", "r") as f:
    sql = f.read()

cur.execute(sql)
print("Schema executed successfully!")

# Verify table exists
cur.execute(
    "SELECT column_name, data_type FROM information_schema.columns "
    "WHERE table_name = 'licenses' ORDER BY ordinal_position"
)
rows = cur.fetchall()
print(f'\nTable "licenses" created with {len(rows)} columns:')
for col_name, col_type in rows:
    print(f"  - {col_name} ({col_type})")

# Check RLS
cur.execute(
    "SELECT policyname, cmd FROM pg_policies WHERE tablename = 'licenses'"
)
policies = cur.fetchall()
print(f"\nRLS policies ({len(policies)}):")
for name, cmd in policies:
    print(f"  - {name} ({cmd})")

cur.close()
conn.close()
print("\nDone!")
