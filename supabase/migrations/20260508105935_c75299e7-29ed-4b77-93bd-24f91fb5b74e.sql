-- Allow is_pmba to be evaluated inside storage policies (still safe: stable read-only check)
GRANT EXECUTE ON FUNCTION public.is_pmba(uuid) TO authenticated;

-- ============================================================
-- project-vault: restrict to authenticated PMBAs only
-- (edge functions use service role and bypass RLS)
-- ============================================================
DROP POLICY IF EXISTS "project-vault PMBA read"   ON storage.objects;
DROP POLICY IF EXISTS "project-vault PMBA write"  ON storage.objects;
DROP POLICY IF EXISTS "project-vault PMBA update" ON storage.objects;
DROP POLICY IF EXISTS "project-vault PMBA delete" ON storage.objects;

CREATE POLICY "project-vault PMBA read"
  ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'project-vault' AND public.is_pmba(auth.uid()));

CREATE POLICY "project-vault PMBA write"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'project-vault' AND public.is_pmba(auth.uid()));

CREATE POLICY "project-vault PMBA update"
  ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'project-vault' AND public.is_pmba(auth.uid()));

CREATE POLICY "project-vault PMBA delete"
  ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'project-vault' AND public.is_pmba(auth.uid()));

-- ============================================================
-- ticket-attachments: stop anonymous LISTING of the bucket.
-- Direct file URLs still work because the bucket is `public = true`
-- (Supabase serves public-bucket files without consulting RLS).
-- Writes/deletes stay open until authentication is added — TODO.
-- ============================================================
DROP POLICY IF EXISTS "ticket-attachments readable by all" ON storage.objects;

CREATE POLICY "ticket-attachments listable by authenticated"
  ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'ticket-attachments');