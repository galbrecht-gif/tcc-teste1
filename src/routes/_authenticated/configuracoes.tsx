import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Plus, ShieldCheck, Tags } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useAuth } from "@/hooks/use-auth";
import { useCategories, useSaveRecord } from "@/hooks/use-data";
import { categorySchema, profileSchema } from "@/lib/schemas";
import { listUsers, setUserRole } from "@/lib/account.functions";
import { ROLE_LABELS } from "@/lib/domain";
import type { AppRole } from "@/lib/domain";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated/configuracoes")({
  head: () => ({
    meta: [
      { title: "Configurações | Gestor de Estoque" },
      {
        name: "description",
        content: "Perfil do usuário, categorias de equipamentos e níveis de acesso do sistema.",
      },
      { property: "og:title", content: "Configurações do sistema" },
      { property: "og:description", content: "Perfil, categorias e permissões de acesso." },
    ],
  }),
  component: ConfiguracoesPage,
});

const PAPEIS: AppRole[] = ["admin", "funcionario", "visualizador"];

function ConfiguracoesPage() {
  const { profile, role, isAdmin, canWrite, refresh } = useAuth();
  const { data: categorias = [] } = useCategories();
  const salvarCategoria = useSaveRecord("categories", "Categoria salva.");
  const queryClient = useQueryClient();

  const perfilForm = useForm({
    resolver: zodResolver(profileSchema),
    defaultValues: { nome: profile?.nome ?? "", telefone: profile?.telefone ?? "" },
  });
  const categoriaForm = useForm({
    resolver: zodResolver(categorySchema),
    defaultValues: { nome: "", descricao: "" },
  });

  const [salvandoPerfil, setSalvandoPerfil] = useState(false);

  const { data: usuarios = [], refetch: recarregarUsuarios } = useQuery({
    queryKey: ["users"],
    queryFn: () => listUsers({ data: undefined as never }),
    enabled: isAdmin,
  });

  async function salvarPerfil(values: { nome: string; telefone: string | null }) {
    if (!profile) return;
    setSalvandoPerfil(true);
    const { error } = await supabase
      .from("profiles")
      .update({ nome: values.nome, telefone: values.telefone })
      .eq("id", profile.id);
    setSalvandoPerfil(false);
    if (error) {
      toast.error("Não foi possível atualizar o perfil.");
      return;
    }
    toast.success("Perfil atualizado.");
    await refresh();
  }

  async function alterarPapel(userId: string, novoPapel: AppRole) {
    try {
      await setUserRole({ data: { userId, role: novoPapel } });
      toast.success("Nível de acesso atualizado.");
      await recarregarUsuarios();
      queryClient.invalidateQueries();
    } catch {
      toast.error("Não foi possível alterar o nível de acesso.");
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Configurações"
        description="Perfil, categorias de equipamentos e controle de acesso."
      />

      <Card className="gap-4 p-5">
        <div>
          <h2 className="font-display text-base font-bold">Meu perfil</h2>
          <p className="text-xs text-muted-foreground">
            {profile?.email} · {role ? ROLE_LABELS[role] : "Sem nível definido"}
          </p>
        </div>
        <form
          className="grid gap-4 sm:grid-cols-2"
          noValidate
          onSubmit={perfilForm.handleSubmit((values) => void salvarPerfil(values))}
        >
          <div className="space-y-1.5">
            <Label htmlFor="c-nome">Nome</Label>
            <Input id="c-nome" {...perfilForm.register("nome")} />
            {perfilForm.formState.errors.nome && (
              <p className="text-xs text-destructive">
                {perfilForm.formState.errors.nome.message}
              </p>
            )}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="c-tel">Telefone</Label>
            <Input id="c-tel" {...perfilForm.register("telefone")} />
          </div>
          <div className="sm:col-span-2">
            <Button type="submit" disabled={salvandoPerfil}>
              Salvar perfil
            </Button>
          </div>
        </form>
      </Card>

      <Card className="gap-4 p-5">
        <div className="flex items-center gap-2">
          <Tags className="size-4 text-muted-foreground" aria-hidden />
          <h2 className="font-display text-base font-bold">Categorias de equipamentos</h2>
        </div>
        {canWrite && (
          <form
            className="flex flex-col gap-3 sm:flex-row"
            noValidate
            onSubmit={categoriaForm.handleSubmit((values) =>
              salvarCategoria.mutate({ values }, { onSuccess: () => categoriaForm.reset() }),
            )}
          >
            <Input placeholder="Nome da categoria" {...categoriaForm.register("nome")} />
            <Input placeholder="Descrição (opcional)" {...categoriaForm.register("descricao")} />
            <Button type="submit" disabled={salvarCategoria.isPending}>
              <Plus className="mr-2 size-4" /> Adicionar
            </Button>
          </form>
        )}
        {categoriaForm.formState.errors.nome && (
          <p className="text-xs text-destructive">
            {categoriaForm.formState.errors.nome.message}
          </p>
        )}
        <Separator />
        {categorias.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nenhuma categoria cadastrada.</p>
        ) : (
          <ul className="flex flex-wrap gap-2">
            {categorias.map((c) => (
              <li
                key={c.id}
                className="rounded-full border border-border px-3 py-1 text-sm"
                title={c.descricao ?? undefined}
              >
                {c.nome}
              </li>
            ))}
          </ul>
        )}
      </Card>

      {isAdmin && (
        <Card className="gap-4 p-5">
          <div className="flex items-center gap-2">
            <ShieldCheck className="size-4 text-muted-foreground" aria-hidden />
            <h2 className="font-display text-base font-bold">Níveis de acesso</h2>
          </div>
          <p className="text-xs text-muted-foreground">
            Administrador gerencia tudo; funcionário cadastra e movimenta; visualizador apenas
            consulta.
          </p>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Usuário</TableHead>
                  <TableHead>E-mail</TableHead>
                  <TableHead className="w-56">Nível de acesso</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {usuarios.map((u) => (
                  <TableRow key={u.id}>
                    <TableCell className="font-medium">{u.nome}</TableCell>
                    <TableCell className="max-w-56 truncate">{u.email ?? "—"}</TableCell>
                    <TableCell>
                      <Select
                        value={u.role ?? undefined}
                        onValueChange={(v) => void alterarPapel(u.id, v as AppRole)}
                      >
                        <SelectTrigger aria-label={`Nível de acesso de ${u.nome}`}>
                          <SelectValue placeholder="Sem acesso" />
                        </SelectTrigger>
                        <SelectContent>
                          {PAPEIS.map((p) => (
                            <SelectItem key={p} value={p}>
                              {ROLE_LABELS[p]}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </Card>
      )}
    </div>
  );
}
