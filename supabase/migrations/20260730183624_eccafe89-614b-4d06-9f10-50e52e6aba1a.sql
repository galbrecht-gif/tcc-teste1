
CREATE SCHEMA IF NOT EXISTS private;
REVOKE ALL ON SCHEMA private FROM PUBLIC, anon;
GRANT USAGE ON SCHEMA private TO authenticated, service_role;

CREATE OR REPLACE FUNCTION private.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role);
$$;

CREATE OR REPLACE FUNCTION private.can_write(_user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role IN ('admin','funcionario'));
$$;

REVOKE ALL ON FUNCTION private.has_role(uuid, public.app_role) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION private.can_write(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION private.has_role(uuid, public.app_role) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION private.can_write(uuid) TO authenticated, service_role;

-- repoint every policy to the private helpers
DROP POLICY IF EXISTS profiles_select_self_or_admin ON public.profiles;
CREATE POLICY profiles_select_self_or_admin ON public.profiles FOR SELECT TO authenticated
  USING (id = auth.uid() OR private.has_role(auth.uid(), 'admin'));
DROP POLICY IF EXISTS profiles_update_self_or_admin ON public.profiles;
CREATE POLICY profiles_update_self_or_admin ON public.profiles FOR UPDATE TO authenticated
  USING (id = auth.uid() OR private.has_role(auth.uid(), 'admin'))
  WITH CHECK (id = auth.uid() OR private.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS user_roles_select_self_or_admin ON public.user_roles;
CREATE POLICY user_roles_select_self_or_admin ON public.user_roles FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR private.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS companies_select_roled ON public.companies;
CREATE POLICY companies_select_roled ON public.companies FOR SELECT TO authenticated
  USING (private.can_write(auth.uid()) OR private.has_role(auth.uid(), 'visualizador'));
DROP POLICY IF EXISTS companies_insert ON public.companies;
CREATE POLICY companies_insert ON public.companies FOR INSERT TO authenticated WITH CHECK (private.can_write(auth.uid()));
DROP POLICY IF EXISTS companies_update ON public.companies;
CREATE POLICY companies_update ON public.companies FOR UPDATE TO authenticated USING (private.can_write(auth.uid())) WITH CHECK (private.can_write(auth.uid()));
DROP POLICY IF EXISTS companies_delete ON public.companies;
CREATE POLICY companies_delete ON public.companies FOR DELETE TO authenticated USING (private.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS people_select_roled ON public.people;
CREATE POLICY people_select_roled ON public.people FOR SELECT TO authenticated
  USING (private.can_write(auth.uid()) OR private.has_role(auth.uid(), 'visualizador'));
DROP POLICY IF EXISTS people_insert ON public.people;
CREATE POLICY people_insert ON public.people FOR INSERT TO authenticated WITH CHECK (private.can_write(auth.uid()));
DROP POLICY IF EXISTS people_update ON public.people;
CREATE POLICY people_update ON public.people FOR UPDATE TO authenticated USING (private.can_write(auth.uid())) WITH CHECK (private.can_write(auth.uid()));
DROP POLICY IF EXISTS people_delete ON public.people;
CREATE POLICY people_delete ON public.people FOR DELETE TO authenticated USING (private.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS categories_insert ON public.categories;
CREATE POLICY categories_insert ON public.categories FOR INSERT TO authenticated WITH CHECK (private.can_write(auth.uid()));
DROP POLICY IF EXISTS categories_update ON public.categories;
CREATE POLICY categories_update ON public.categories FOR UPDATE TO authenticated USING (private.can_write(auth.uid())) WITH CHECK (private.can_write(auth.uid()));
DROP POLICY IF EXISTS categories_delete ON public.categories;
CREATE POLICY categories_delete ON public.categories FOR DELETE TO authenticated USING (private.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS equipments_insert ON public.equipments;
CREATE POLICY equipments_insert ON public.equipments FOR INSERT TO authenticated WITH CHECK (private.can_write(auth.uid()));
DROP POLICY IF EXISTS equipments_update ON public.equipments;
CREATE POLICY equipments_update ON public.equipments FOR UPDATE TO authenticated USING (private.can_write(auth.uid())) WITH CHECK (private.can_write(auth.uid()));
DROP POLICY IF EXISTS equipments_delete ON public.equipments;
CREATE POLICY equipments_delete ON public.equipments FOR DELETE TO authenticated USING (private.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS reservations_insert ON public.reservations;
CREATE POLICY reservations_insert ON public.reservations FOR INSERT TO authenticated WITH CHECK (private.can_write(auth.uid()));
DROP POLICY IF EXISTS reservations_update ON public.reservations;
CREATE POLICY reservations_update ON public.reservations FOR UPDATE TO authenticated USING (private.can_write(auth.uid())) WITH CHECK (private.can_write(auth.uid()));
DROP POLICY IF EXISTS reservations_delete ON public.reservations;
CREATE POLICY reservations_delete ON public.reservations FOR DELETE TO authenticated USING (private.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS maintenances_insert ON public.maintenances;
CREATE POLICY maintenances_insert ON public.maintenances FOR INSERT TO authenticated WITH CHECK (private.can_write(auth.uid()));
DROP POLICY IF EXISTS maintenances_update ON public.maintenances;
CREATE POLICY maintenances_update ON public.maintenances FOR UPDATE TO authenticated USING (private.can_write(auth.uid())) WITH CHECK (private.can_write(auth.uid()));
DROP POLICY IF EXISTS maintenances_delete ON public.maintenances;
CREATE POLICY maintenances_delete ON public.maintenances FOR DELETE TO authenticated USING (private.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS history_insert ON public.equipment_history;
CREATE POLICY history_insert ON public.equipment_history FOR INSERT TO authenticated WITH CHECK (private.can_write(auth.uid()));

-- storage policies may reference the old helpers
DO $do$
DECLARE r RECORD;
BEGIN
  FOR r IN SELECT policyname, qual, with_check FROM pg_policies WHERE schemaname='storage' AND tablename='objects'
           AND (COALESCE(qual,'') || COALESCE(with_check,'')) LIKE '%can_write%' LOOP
    EXECUTE format('DROP POLICY %I ON storage.objects', r.policyname);
  END LOOP;
END $do$;

CREATE POLICY equipment_photos_read ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'equipment-photos');
CREATE POLICY equipment_photos_write ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'equipment-photos' AND private.can_write(auth.uid()));
CREATE POLICY equipment_photos_update ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'equipment-photos' AND private.can_write(auth.uid()));
CREATE POLICY equipment_photos_delete ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'equipment-photos' AND private.can_write(auth.uid()));

DROP FUNCTION IF EXISTS public.can_write(uuid);

-- keep a self-scoped invoker version of has_role for the app's RPC call
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean LANGUAGE sql STABLE SECURITY INVOKER SET search_path TO 'public' AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role);
$$;
