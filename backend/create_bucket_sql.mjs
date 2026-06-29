import pg from 'pg';

process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

const connectionString = "postgresql://postgres.oawomrlsitttrbulxgyk:jzqqWU5XbrckrIAD@aws-1-ap-south-1.pooler.supabase.com:6543/postgres?sslmode=require&pgbouncer=true";

async function main() {
  const pool = new pg.Pool({
    connectionString,
    ssl: { rejectUnauthorized: false }
  });

  try {
    console.log("Connecting to Supabase PostgreSQL database...");
    
    // Create the bucket in storage.buckets using SQL
    console.log("Inserting bucket 'academic-files' into storage.buckets...");
    await pool.query(`
      INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types) 
      VALUES (
        'academic-files', 
        'academic-files', 
        true, 
        104857600, 
        ARRAY['application/vnd.android.package-archive', 'application/pdf', 'image/*', 'video/*']::text[]
      )
      ON CONFLICT (id) DO UPDATE SET 
        public = EXCLUDED.public,
        file_size_limit = EXCLUDED.file_size_limit,
        allowed_mime_types = EXCLUDED.allowed_mime_types;
    `);

    console.log("Adding RLS policies for storage bucket 'academic-files'...");
    
    // Allow public read access to files in academic-files bucket
    await pool.query(`
      DROP POLICY IF EXISTS "Public Access" ON storage.objects;
      CREATE POLICY "Public Access" ON storage.objects FOR SELECT USING (bucket_id = 'academic-files');
    `);

    // Allow insert/update/delete access for uploads (in a real app this might be restricted, but since it's a student app, we allow it)
    await pool.query(`
      DROP POLICY IF EXISTS "Insert Access" ON storage.objects;
      CREATE POLICY "Insert Access" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'academic-files');
      
      DROP POLICY IF EXISTS "Update Access" ON storage.objects;
      CREATE POLICY "Update Access" ON storage.objects FOR UPDATE USING (bucket_id = 'academic-files');

      DROP POLICY IF EXISTS "Delete Access" ON storage.objects;
      CREATE POLICY "Delete Access" ON storage.objects FOR DELETE USING (bucket_id = 'academic-files');
    `);

    console.log("🎉 Supabase Storage bucket 'academic-files' created and configured successfully!");
  } catch (error) {
    console.error("❌ Error:", error);
  } finally {
    await pool.end();
  }
}

main();
