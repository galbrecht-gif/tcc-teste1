import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

/**
 * Marca reservas vencidas como atrasadas.
 * A rotina roda apenas no servidor: usuários autenticados não podem mais
 * executá-la diretamente pelo banco.
 */
export const markOverdueReservations = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data: canWrite } = await context.supabase.rpc("has_role", {
      _user_id: context.userId,
      _role: "admin",
    });
    const { data: isStaff } = await context.supabase.rpc("has_role", {
      _user_id: context.userId,
      _role: "funcionario",
    });
    if (!canWrite && !isStaff) return { updated: 0 };

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data, error } = await supabaseAdmin.rpc("mark_overdue_reservations");
    if (error) throw new Error(error.message);
    return { updated: data ?? 0 };
  });
