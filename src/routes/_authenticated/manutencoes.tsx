import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Plus, Search, Wrench } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { EmptyState } from "@/components/EmptyState";
import { StatusBadge } from "@/components/StatusBadge";
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
import { useEquipmentStatus, useMaintenances, useSaveRecord } from "@/hooks/use-data";
import { maintenanceSchema } from "@/lib/schemas";
import { formatCurrency, formatDate, todayISO } from "@/lib/format";
import { MAINTENANCE_STATUS_LABELS, MAINTENANCE_TONE, MAINTENANCE_TYPES } from "@/lib/domain";
import type { MaintenanceRow } from "@/hooks/use-data";
import type { MaintenanceStatus } from "@/lib/domain";

export const Route = createFileRoute("/_authenticated/manutencoes")({
  head: () => ({
    meta: [
      { title: "Manutenções | Gestor de Estoque" },
      {
        name: "description",
        content:
          "Ordens de manutenção preventiva e corretiva dos equipamentos, com custos, fornecedor e prazos.",
      },
      { property: "og:title", content: "Controle de manutenções" },
      { property: "og:description", content: "Acompanhe ordens abertas, custos e prazos." },
    ],
  }),
  component: ManutencoesPage,
});

const STATUS: MaintenanceStatus[] = ["Aberta", "EmAndamento", "Concluida", "Cancelada"];

function ManutencoesPage() {
  const { canWrite } = useAuth();
  const { data: manutencoes = [], isLoading } = useMaintenances();
  const { data: equipamentos = [] } = useEquipmentStatus();
  const salvar = useSaveRecord("maintenances", "Manutenção salva com sucesso.");

  const [busca, setBusca] = useState("");
  const [statusFiltro, setStatusFiltro] = useState("todos");
  const [aberto, setAberto] = useState(false);
  const [editando, setEditando] = useState<MaintenanceRow | null>(null);

  const VAZIO = {
    equipment_id: "",
    tipo: "Preventiva",
    descricao: "",
    custo: 0,
    fornecedor: "",
    data_inicio: todayISO(),
    data_fim: "",
    status: "Aberta" as MaintenanceStatus,
  };

  const form = useForm({ resolver: zodResolver(maintenanceSchema), defaultValues: VAZIO });

  const filtradas = useMemo(() => {
    const termo = busca.trim().toLowerCase();
    return manutencoes.filter((m) => {
      const combinaTermo =
        !termo ||
        [m.equipments?.codigo, m.equipments?.nome, m.tipo, m.fornecedor]
          .filter(Boolean)
          .some((v) => String(v).toLowerCase().includes(termo));
      const combinaStatus = statusFiltro === "todos" || m.status === statusFiltro;
      return combinaTermo && combinaStatus;
    });
  }, [manutencoes, busca, statusFiltro]);

  const custoTotal = filtradas.reduce((acc, m) => acc + Number(m.custo ?? 0), 0);
  const erros = form.formState.errors;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Manutenções"
        description="Ordens preventivas e corretivas. Equipamentos em manutenção ficam indisponíveis."
        actions={
          canWrite && (
            <Button
              onClick={() => {
                setEditando(null);
                form.reset(VAZIO);
                setAberto(true);
              }}
            >
              <Plus className="mr-2 size-4" /> Nova manutenção
            </Button>
          )
        }
      />

      <div className="grid gap-3 sm:grid-cols-3">
        <div className="relative sm:col-span-2">
          <Search className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            placeholder="Equipamento, tipo ou fornecedor"
            className="pl-9"
            aria-label="Buscar manutenções"
          />
        </div>
        <Select value={statusFiltro} onValueChange={setStatusFiltro}>
          <SelectTrigger aria-label="Filtrar por status">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos os status</SelectItem>
            {STATUS.map((s) => (
              <SelectItem key={s} value={s}>
                {MAINTENANCE_STATUS_LABELS[s]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {isLoading ? (
        <Skeleton className="h-72 rounded-xl" />
      ) : filtradas.length === 0 ? (
        <EmptyState
          icon={Wrench}
          title="Nenhuma manutenção registrada"
          description="Abra uma ordem para retirar temporariamente um equipamento do estoque."
        />
      ) : (
        <Card className="overflow-hidden p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Equipamento</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Fornecedor</TableHead>
                  <TableHead>Período</TableHead>
                  <TableHead className="text-right">Custo</TableHead>
                  <TableHead>Status</TableHead>
                  {canWrite && <TableHead className="w-20 text-right">Ações</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtradas.map((m) => (
                  <TableRow key={m.id}>
                    <TableCell>
                      <p className="font-medium">{m.equipments?.nome ?? "—"}</p>
                      <p className="text-xs text-muted-foreground tabular">{m.equipments?.codigo}</p>
                    </TableCell>
                    <TableCell>{m.tipo}</TableCell>
                    <TableCell>{m.fornecedor ?? "—"}</TableCell>
                    <TableCell className="whitespace-nowrap tabular">
                      {formatDate(m.data_inicio)} → {m.data_fim ? formatDate(m.data_fim) : "em aberto"}
                    </TableCell>
                    <TableCell className="text-right tabular">{formatCurrency(m.custo)}</TableCell>
                    <TableCell>
                      <StatusBadge tone={MAINTENANCE_TONE[m.status]}>
                        {MAINTENANCE_STATUS_LABELS[m.status]}
                      </StatusBadge>
                    </TableCell>
                    {canWrite && (
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setEditando(m);
                            form.reset({
                              equipment_id: m.equipment_id,
                              tipo: m.tipo,
                              descricao: m.descricao ?? "",
                              custo: Number(m.custo ?? 0),
                              fornecedor: m.fornecedor ?? "",
                              data_inicio: m.data_inicio,
                              data_fim: m.data_fim ?? "",
                              status: m.status as MaintenanceStatus,
                            });
                            setAberto(true);
                          }}
                        >
                          Editar
                        </Button>
                      </TableCell>
                    )}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          <div className="border-t border-border px-4 py-3 text-sm text-muted-foreground">
            Custo total das manutenções listadas:{" "}
            <strong className="text-foreground tabular">{formatCurrency(custoTotal)}</strong>
          </div>
        </Card>
      )}

      <Dialog open={aberto} onOpenChange={setAberto}>
        <DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{editando ? "Editar manutenção" : "Nova manutenção"}</DialogTitle>
            <DialogDescription>
              Enquanto a ordem estiver aberta ou em andamento, o equipamento aparece como
              indisponível.
            </DialogDescription>
          </DialogHeader>
          <form
            id="form-manut"
            className="grid gap-4 sm:grid-cols-2"
            noValidate
            onSubmit={form.handleSubmit((values) =>
              salvar.mutate({ id: editando?.id, values }, { onSuccess: () => setAberto(false) }),
            )}
          >
            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor="m-equip">Equipamento *</Label>
              <Select
                value={form.watch("equipment_id")}
                onValueChange={(v) => form.setValue("equipment_id", v)}
              >
                <SelectTrigger id="m-equip">
                  <SelectValue placeholder="Selecione" />
                </SelectTrigger>
                <SelectContent>
                  {equipamentos.map((e) => (
                    <SelectItem key={e.id} value={e.id}>
                      {e.codigo} · {e.nome}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {erros.equipment_id && (
                <p className="text-xs text-destructive">{erros.equipment_id.message}</p>
              )}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="m-tipo">Tipo *</Label>
              <Select value={form.watch("tipo")} onValueChange={(v) => form.setValue("tipo", v)}>
                <SelectTrigger id="m-tipo">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {MAINTENANCE_TYPES.map((t) => (
                    <SelectItem key={t} value={t}>
                      {t}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="m-status">Status *</Label>
              <Select
                value={form.watch("status")}
                onValueChange={(v) => form.setValue("status", v as MaintenanceStatus)}
              >
                <SelectTrigger id="m-status">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {STATUS.map((s) => (
                    <SelectItem key={s} value={s}>
                      {MAINTENANCE_STATUS_LABELS[s]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="m-inicio">Início *</Label>
              <Input id="m-inicio" type="date" {...form.register("data_inicio")} />
              {erros.data_inicio && (
                <p className="text-xs text-destructive">{erros.data_inicio.message}</p>
              )}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="m-fim">Conclusão</Label>
              <Input id="m-fim" type="date" {...form.register("data_fim")} />
              {erros.data_fim && <p className="text-xs text-destructive">{erros.data_fim.message}</p>}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="m-custo">Custo (R$)</Label>
              <Input id="m-custo" type="number" step="0.01" min="0" {...form.register("custo")} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="m-forn">Fornecedor</Label>
              <Input id="m-forn" {...form.register("fornecedor")} />
            </div>
            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor="m-desc">Descrição do serviço</Label>
              <Textarea id="m-desc" rows={3} {...form.register("descricao")} />
            </div>
          </form>
          <DialogFooter>
            <Button variant="outline" type="button" onClick={() => setAberto(false)}>
              Cancelar
            </Button>
            <Button type="submit" form="form-manut" disabled={salvar.isPending}>
              Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
