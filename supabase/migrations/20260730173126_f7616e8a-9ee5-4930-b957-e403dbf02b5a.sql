
REVOKE ALL ON FUNCTION public.has_role(uuid, public.app_role) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.can_write(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.mark_overdue_reservations() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.set_updated_at() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.log_equipment_change() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.log_reservation_change() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.log_maintenance_change() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.check_reservation_conflict() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.can_write(uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.mark_overdue_reservations() TO authenticated, service_role;
