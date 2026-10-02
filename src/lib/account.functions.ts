import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

/**
 * Funções de servidor para gestão de contas e níveis de acesso.
 * Os papéis vivem em uma tabela separada (public.user_roles) sem política de escrita
 * para usuários autenticados — a atribuição só acontece aqui, no servidor.
 */

/**
 * Garante que o usuário autenticado possua perfil e um nível de acesso.
 * O primeiro usuário do sistema recebe o papel de administrador.
 */
export const ensureAccount = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { nome?: string } | undefined) =>
    z.object({ nome: z.string().trim().max(120).optional() }).parse(input ?? {}),
  )
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const userId = context.userId;
    const email = (context.claims.email as string | undefined) ?? null;

    const { data: profile } = await supabaseAdmin
      .from("profiles")
      .select("id, nome")
      .eq("id", userId)
      .maybeSingle();

    if (!profile) {
      await supabaseAdmin.from("profiles").insert({
        id: userId,
        nome: data.nome?.trim() || email?.split("@")[0] || "Usuário",
        email,
      });
    } else if (data.nome && !profile.nome) {
      await supabaseAdmin.from("profiles").update({ nome: data.nome }).eq("id", userId);
    }

    const { data: myRoles } = await supabaseAdmin
      .from("user_roles")
      .select("role")
      .eq("user_id", userId);

    if (!myRoles || myRoles.length === 0) {
      const { count } = await supabaseAdmin
        .from("user_roles")
        .select("id", { count: "exact", head: true })
        .eq("role", "admin");
      const role = (count ?? 0) === 0 ? "admin" : "visualizador";
      await supabaseAdmin.from("user_roles").insert({ user_id: userId, role });
      return { role };
    }

    return { role: myRoles[0].role };
  });

/** Altera o nível de acesso de um usuário. Restrito a administradores. */
export const setUserRole = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { userId: string; role: string }) =>
    z
      .object({
        userId: z.string().uuid(),
        role: z.enum(["admin", "funcionario", "visualizador"]),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const { data: isAdmin } = await context.supabase.rpc("has_role", {
      _user_id: context.userId,
      _role: "admin",
    });
    if (!isAdmin) throw new Error("Apenas administradores podem alterar níveis de acesso.");

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    await supabaseAdmin.from("user_roles").delete().eq("user_id", data.userId);
    const { error } = await supabaseAdmin
      .from("user_roles")
      .insert({ user_id: data.userId, role: data.role });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

/** Lista usuários com perfil e nível de acesso. Restrito a administradores. */
export const listUsers = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data: isAdmin } = await context.supabase.rpc("has_role", {
      _user_id: context.userId,
      _role: "admin",
    });
    if (!isAdmin) throw new Error("Acesso restrito a administradores.");

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const [{ data: profiles }, { data: roles }] = await Promise.all([
      supabaseAdmin.from("profiles").select("*").order("nome"),
      supabaseAdmin.from("user_roles").select("user_id, role"),
    ]);

    return (profiles ?? []).map((p) => ({
      ...p,
      role: roles?.find((r) => r.user_id === p.id)?.role ?? null,
    }));
  });
