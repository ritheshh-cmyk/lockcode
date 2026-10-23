"""Add gemini_key and language columns to the licenses table."""
import os, psycopg2
from dotenv import load_dotenv

load_dotenv(os.path.join(os.path.dirname(__file__), "..", ".env"))

conn = psycopg2.connect(os.environ["DATABASE_URL"])
cur = conn.cursor()

cur.execute("""
    ALTER TABLE licenses ADD COLUMN IF NOT EXISTS gemini_key TEXT;
    ALTER TABLE licenses ADD COLUMN IF NOT EXISTS language TEXT DEFAULT 'Java';
""")

conn.commit()
cur.close()
conn.close()
print("Added gemini_key and language columns")
