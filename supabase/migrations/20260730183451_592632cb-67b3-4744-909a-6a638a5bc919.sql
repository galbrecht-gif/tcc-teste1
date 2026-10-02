
-- profiles
DROP POLICY IF EXISTS profiles_select_auth ON public.profiles;
CREATE POLICY profiles_select_self_or_admin ON public.profiles
  FOR SELECT TO authenticated
  USING (id = auth.uid() OR public.has_role(auth.uid(), 'admin'));

-- user_roles
DROP POLICY IF EXISTS user_roles_select_auth ON public.user_roles;
CREATE POLICY user_roles_select_self_or_admin ON public.user_roles
  FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));

-- companies / people: require an assigned app role
DROP POLICY IF EXISTS companies_select ON public.companies;
CREATE POLICY companies_select_roled ON public.companies
  FOR SELECT TO authenticated
  USING (
    public.can_write(auth.uid()) OR public.has_role(auth.uid(), 'visualizador')
  );

DROP POLICY IF EXISTS people_select ON public.people;
CREATE POLICY people_select_roled ON public.people
  FOR SELECT TO authenticated
  USING (
    public.can_write(auth.uid()) OR public.has_role(auth.uid(), 'visualizador')
  );

-- harden definer helpers: only allow asking about yourself
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
      AND (_user_id = auth.uid() OR auth.uid() IS NULL)
  );
$$;

CREATE OR REPLACE FUNCTION public.can_write(_user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role IN ('admin','funcionario')
      AND (_user_id = auth.uid() OR auth.uid() IS NULL)
  );
$$;

-- overdue routine: not callable from the browser
CREATE OR REPLACE FUNCTION public.mark_overdue_reservations()
RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE n INTEGER;
BEGIN
  UPDATE public.reservations
  SET status = 'Atrasado'
  WHERE status IN ('Agendado','Retirado') AND data_devolucao < CURRENT_DATE;
  GET DIAGNOSTICS n = ROW_COUNT;
  RETURN n;
END; $$;

REVOKE ALL ON FUNCTION public.mark_overdue_reservations() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.mark_overdue_reservations() TO service_role;

REVOKE ALL ON FUNCTION public.has_role(uuid, app_role) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, app_role) TO authenticated, service_role;
REVOKE ALL ON FUNCTION public.can_write(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.can_write(uuid) TO authenticated, service_role;
