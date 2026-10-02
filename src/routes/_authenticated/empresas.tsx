import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Building2, Pencil, Plus, Search, Trash2 } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { EmptyState } from "@/components/EmptyState";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useAuth } from "@/hooks/use-auth";
import { useCompanies, useDeleteRecord, useSaveRecord } from "@/hooks/use-data";
import { companySchema } from "@/lib/schemas";
import { formatCNPJ } from "@/lib/format";
import type { Company } from "@/lib/domain";

export const Route = createFileRoute("/_authenticated/empresas")({
  head: () => ({
    meta: [
      { title: "Empresas | Gestor de Estoque" },
      {
        name: "description",
        content: "Cadastro de empresas e setores que utilizam os equipamentos do estoque.",
      },
      { property: "og:title", content: "Cadastro de empresas" },
      { property: "og:description", content: "Gerencie empresas, contatos e endereços." },
    ],
  }),
  component: EmpresasPage,
});

const VAZIO = { nome: "", cnpj: "", contato: "", telefone: "", email: "", endereco: "" };

function EmpresasPage() {
  const { canWrite, isAdmin } = useAuth();
  const { data: empresas = [], isLoading } = useCompanies();
  const salvar = useSaveRecord("companies", "Empresa salva com sucesso.");
  const excluir = useDeleteRecord("companies");
  const [busca, setBusca] = useState("");
  const [editando, setEditando] = useState<Company | null>(null);
  const [aberto, setAberto] = useState(false);

  const form = useForm({ resolver: zodResolver(companySchema), defaultValues: VAZIO });

  const filtradas = useMemo(() => {
    const termo = busca.trim().toLowerCase();
    if (!termo) return empresas;
    return empresas.filter((e) =>
      [e.nome, e.cnpj, e.contato, e.email, e.telefone]
        .filter(Boolean)
        .some((v) => String(v).toLowerCase().includes(termo)),
    );
  }, [empresas, busca]);

  function abrirNovo() {
    setEditando(null);
    form.reset(VAZIO);
    setAberto(true);
  }

  function abrirEdicao(empresa: Company) {
    setEditando(empresa);
    form.reset({
      nome: empresa.nome,
      cnpj: empresa.cnpj ?? "",
      contato: empresa.contato ?? "",
      telefone: empresa.telefone ?? "",
      email: empresa.email ?? "",
      endereco: empresa.endereco ?? "",
    });
    setAberto(true);
  }

  const erros = form.formState.errors;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Empresas"
        description="Clientes, setores e unidades que recebem os equipamentos."
        actions={
          canWrite && (
            <Button onClick={abrirNovo}>
              <Plus className="mr-2 size-4" /> Nova empresa
            </Button>
          )
        }
      />

      <div className="relative max-w-md">
        <Search className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
          placeholder="Buscar por nome, CNPJ, contato ou e-mail"
          className="pl-9"
          aria-label="Buscar empresas"
        />
      </div>

      {isLoading ? (
        <Skeleton className="h-64 rounded-xl" />
      ) : filtradas.length === 0 ? (
        <EmptyState
          icon={Building2}
          title={busca ? "Nenhuma empresa encontrada" : "Nenhuma empresa cadastrada"}
          description={
            busca
              ? "Ajuste os termos da busca e tente novamente."
              : "Cadastre as empresas que utilizarão os equipamentos."
          }
          action={
            canWrite && !busca ? (
              <Button onClick={abrirNovo}>
                <Plus className="mr-2 size-4" /> Nova empresa
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
                  <TableHead>Empresa</TableHead>
                  <TableHead>CNPJ</TableHead>
                  <TableHead>Contato</TableHead>
                  <TableHead>Telefone</TableHead>
                  <TableHead>E-mail</TableHead>
                  {canWrite && <TableHead className="w-24 text-right">Ações</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtradas.map((empresa) => (
                  <TableRow key={empresa.id}>
                    <TableCell className="font-medium">
                      {empresa.nome}
                      {empresa.endereco && (
                        <span className="block text-xs text-muted-foreground">
                          {empresa.endereco}
                        </span>
                      )}
                    </TableCell>
                    <TableCell className="tabular">{formatCNPJ(empresa.cnpj)}</TableCell>
                    <TableCell>{empresa.contato ?? "—"}</TableCell>
                    <TableCell className="tabular">{empresa.telefone ?? "—"}</TableCell>
                    <TableCell className="max-w-48 truncate">{empresa.email ?? "—"}</TableCell>
                    {canWrite && (
                      <TableCell className="text-right whitespace-nowrap">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => abrirEdicao(empresa)}
                          aria-label={`Editar ${empresa.nome}`}
                        >
                          <Pencil className="size-4" />
                        </Button>
                        {isAdmin && (
                          <ConfirmDialog
                            title={`Excluir ${empresa.nome}?`}
                            description="A empresa só pode ser excluída se não houver reservas ou pessoas vinculadas."
                            onConfirm={() => excluir.mutate(empresa.id)}
                            trigger={
                              <Button
                                variant="ghost"
                                size="icon"
                                aria-label={`Excluir ${empresa.nome}`}
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
            <DialogTitle>{editando ? "Editar empresa" : "Nova empresa"}</DialogTitle>
            <DialogDescription>
              Os dados de contato são usados nas reservas e relatórios.
            </DialogDescription>
          </DialogHeader>
          <form
            id="form-empresa"
            className="grid gap-4 sm:grid-cols-2"
            noValidate
            onSubmit={form.handleSubmit((values) =>
              salvar.mutate(
                { id: editando?.id, values },
                { onSuccess: () => setAberto(false) },
              ),
            )}
          >
            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor="nome">Nome *</Label>
              <Input id="nome" {...form.register("nome")} />
              {erros.nome && <p className="text-xs text-destructive">{erros.nome.message}</p>}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="cnpj">CNPJ</Label>
              <Input id="cnpj" placeholder="00.000.000/0000-00" {...form.register("cnpj")} />
              {erros.cnpj && <p className="text-xs text-destructive">{erros.cnpj.message}</p>}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="contato">Pessoa de contato</Label>
              <Input id="contato" {...form.register("contato")} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="telefone">Telefone</Label>
              <Input id="telefone" {...form.register("telefone")} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="email">E-mail</Label>
              <Input id="email" type="email" {...form.register("email")} />
              {erros.email && <p className="text-xs text-destructive">{erros.email.message}</p>}
            </div>
            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor="endereco">Endereço</Label>
              <Textarea id="endereco" rows={2} {...form.register("endereco")} />
            </div>
          </form>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAberto(false)} type="button">
              Cancelar
            </Button>
            <Button type="submit" form="form-empresa" disabled={salvar.isPending}>
              Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
