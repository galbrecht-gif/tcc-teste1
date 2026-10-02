import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Pencil, Plus, Search, Trash2, Users } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { EmptyState } from "@/components/EmptyState";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
import { useCompanies, useDeleteRecord, usePeople, useSaveRecord } from "@/hooks/use-data";
import { personSchema } from "@/lib/schemas";
import type { Person } from "@/lib/domain";

export const Route = createFileRoute("/_authenticated/pessoas")({
  head: () => ({
    meta: [
      { title: "Pessoas | Gestor de Estoque" },
      {
        name: "description",
        content: "Cadastro de responsáveis pelos equipamentos, com cargo, empresa e contato.",
      },
      { property: "og:title", content: "Cadastro de pessoas" },
      { property: "og:description", content: "Responsáveis por retiradas e devoluções." },
    ],
  }),
  component: PessoasPage,
});

const VAZIO = { nome: "", cargo: "", company_id: "none", telefone: "", email: "" };

function PessoasPage() {
  const { canWrite, isAdmin } = useAuth();
  const { data: pessoas = [], isLoading } = usePeople();
  const { data: empresas = [] } = useCompanies();
  const salvar = useSaveRecord("people", "Pessoa salva com sucesso.");
  const excluir = useDeleteRecord("people");
  const [busca, setBusca] = useState("");
  const [empresaFiltro, setEmpresaFiltro] = useState("todas");
  const [editando, setEditando] = useState<Person | null>(null);
  const [aberto, setAberto] = useState(false);

  const form = useForm({ resolver: zodResolver(personSchema), defaultValues: VAZIO });

  const filtradas = useMemo(() => {
    const termo = busca.trim().toLowerCase();
    return pessoas.filter((p) => {
      const combinaEmpresa = empresaFiltro === "todas" || p.company_id === empresaFiltro;
      const combinaTermo =
        !termo ||
        [p.nome, p.cargo, p.email, p.telefone]
          .filter(Boolean)
          .some((v) => String(v).toLowerCase().includes(termo));
      return combinaEmpresa && combinaTermo;
    });
  }, [pessoas, busca, empresaFiltro]);

  function abrirNovo() {
    setEditando(null);
    form.reset(VAZIO);
    setAberto(true);
  }

  function abrirEdicao(pessoa: Person) {
    setEditando(pessoa);
    form.reset({
      nome: pessoa.nome,
      cargo: pessoa.cargo ?? "",
      company_id: pessoa.company_id ?? "none",
      telefone: pessoa.telefone ?? "",
      email: pessoa.email ?? "",
    });
    setAberto(true);
  }

  const erros = form.formState.errors;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Pessoas"
        description="Responsáveis pelas retiradas, devoluções e uso dos equipamentos."
        actions={
          canWrite && (
            <Button onClick={abrirNovo}>
              <Plus className="mr-2 size-4" /> Nova pessoa
            </Button>
          )
        }
      />

      <div className="flex flex-col gap-3 sm:flex-row">
        <div className="relative flex-1">
          <Search className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            placeholder="Buscar por nome, cargo, e-mail ou telefone"
            className="pl-9"
            aria-label="Buscar pessoas"
          />
        </div>
        <Select value={empresaFiltro} onValueChange={setEmpresaFiltro}>
          <SelectTrigger className="sm:w-64" aria-label="Filtrar por empresa">
            <SelectValue placeholder="Empresa" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todas">Todas as empresas</SelectItem>
            {empresas.map((e) => (
              <SelectItem key={e.id} value={e.id}>
                {e.nome}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {isLoading ? (
        <Skeleton className="h-64 rounded-xl" />
      ) : filtradas.length === 0 ? (
        <EmptyState
          icon={Users}
          title="Nenhuma pessoa encontrada"
          description="Cadastre os responsáveis que poderão retirar equipamentos."
          action={
            canWrite ? (
              <Button onClick={abrirNovo}>
                <Plus className="mr-2 size-4" /> Nova pessoa
              </Button>
            ) : undefined
          }
        />
      ) : (
        <Card className="overflow-hidden p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>Cargo</TableHead>
                  <TableHead>Empresa</TableHead>
                  <TableHead>Telefone</TableHead>
                  <TableHead>E-mail</TableHead>
                  {canWrite && <TableHead className="w-24 text-right">Ações</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtradas.map((pessoa) => (
                  <TableRow key={pessoa.id}>
                    <TableCell className="font-medium">{pessoa.nome}</TableCell>
                    <TableCell>{pessoa.cargo ?? "—"}</TableCell>
                    <TableCell>{pessoa.companies?.nome ?? "—"}</TableCell>
                    <TableCell className="tabular">{pessoa.telefone ?? "—"}</TableCell>
                    <TableCell className="max-w-48 truncate">{pessoa.email ?? "—"}</TableCell>
                    {canWrite && (
                      <TableCell className="text-right whitespace-nowrap">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => abrirEdicao(pessoa)}
                          aria-label={`Editar ${pessoa.nome}`}
                        >
                          <Pencil className="size-4" />
                        </Button>
                        {isAdmin && (
                          <ConfirmDialog
                            title={`Excluir ${pessoa.nome}?`}
                            description="Só é possível excluir pessoas sem reservas vinculadas."
                            onConfirm={() => excluir.mutate(pessoa.id)}
                            trigger={
                              <Button
                                variant="ghost"
                                size="icon"
                                aria-label={`Excluir ${pessoa.nome}`}
                              >
                                <Trash2 className="size-4 text-destructive" />
                              </Button>
                            }
                          />
                        )}
                      </TableCell>
                    )}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </Card>
      )}

      <Dialog open={aberto} onOpenChange={setAberto}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{editando ? "Editar pessoa" : "Nova pessoa"}</DialogTitle>
            <DialogDescription>
              Pessoas cadastradas podem ser vinculadas como responsáveis em reservas.
            </DialogDescription>
          </DialogHeader>
          <form
            id="form-pessoa"
            className="grid gap-4 sm:grid-cols-2"
            noValidate
            onSubmit={form.handleSubmit((values) =>
              salvar.mutate({ id: editando?.id, values }, { onSuccess: () => setAberto(false) }),
            )}
          >
            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor="p-nome">Nome *</Label>
              <Input id="p-nome" {...form.register("nome")} />
              {erros.nome && <p className="text-xs text-destructive">{erros.nome.message}</p>}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="p-cargo">Cargo</Label>
              <Input id="p-cargo" {...form.register("cargo")} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="p-empresa">Empresa</Label>
              <Select
                value={form.watch("company_id") ?? "none"}
                onValueChange={(v) => form.setValue("company_id", v)}
              >
                <SelectTrigger id="p-empresa">
                  <SelectValue placeholder="Selecione" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Sem empresa</SelectItem>
                  {empresas.map((e) => (
                    <SelectItem key={e.id} value={e.id}>
                      {e.nome}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="p-telefone">Telefone</Label>
              <Input id="p-telefone" {...form.register("telefone")} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="p-email">E-mail</Label>
              <Input id="p-email" type="email" {...form.register("email")} />
              {erros.email && <p className="text-xs text-destructive">{erros.email.message}</p>}
            </div>
          </form>
          <DialogFooter>
            <Button variant="outline" type="button" onClick={() => setAberto(false)}>
              Cancelar
            </Button>
            <Button type="submit" form="form-pessoa" disabled={salvar.isPending}>
              Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
