import psycopg2
conn = psycopg2.connect(
    host="db.swdojmsuznofynwgssxs.supabase.co",
    port=5432, dbname="postgres", user="postgres",
    password="Lucky@9392404104"
)
conn.autocommit = True
cur = conn.cursor()
cur.execute("UPDATE licenses SET machine_id = NULL, activated_at = NULL WHERE reg_key = '12402879'")
print(f"Reset {cur.rowcount} row(s)")
cur.close()
conn.close()
