
CREATE POLICY "equipment_photos_select" ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'equipment-photos');
CREATE POLICY "equipment_photos_insert" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'equipment-photos' AND public.can_write(auth.uid()));
CREATE POLICY "equipment_photos_update" ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'equipment-photos' AND public.can_write(auth.uid()))
  WITH CHECK (bucket_id = 'equipment-photos' AND public.can_write(auth.uid()));
CREATE POLICY "equipment_photos_delete" ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'equipment-photos' AND public.can_write(auth.uid()));
