import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Calendar, CalendarRange, List, Plus, Search } from "lucide-react";
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
import { Calendar as CalendarUI } from "@/components/ui/calendar";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
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
import {
  useCompanies,
  useEquipmentStatus,
  usePeople,
  useReservations,
  useSaveRecord,
} from "@/hooks/use-data";
import { reservationSchema } from "@/lib/schemas";
import { addDaysISO, formatDate, todayISO } from "@/lib/format";
import { RESERVATION_TONE, RESERVATION_TRANSITIONS } from "@/lib/domain";
import type { ReservationStatus } from "@/lib/domain";

export const Route = createFileRoute("/_authenticated/reservas")({
  head: () => ({
    meta: [
      { title: "Reservas | Gestor de Estoque" },
      {
        name: "description",
        content:
          "Agendamento de equipamentos com bloqueio automático de conflitos de período e controle de devolução.",
      },
      { property: "og:title", content: "Agendamento e reservas" },
      {
        property: "og:description",
        content: "Reserve equipamentos sem conflito de datas e acompanhe devoluções.",
      },
    ],
  }),
  component: ReservasPage,
});

const STATUS: ReservationStatus[] = [
  "Pendente",
  "Agendado",
  "Retirado",
  "Devolvido",
  "Atrasado",
  "Cancelado",
];

function ReservasPage() {
  const { canWrite, role, profile } = useAuth();
  const { data: reservas = [], isLoading } = useReservations();
  const { data: equipamentos = [] } = useEquipmentStatus();
  const { data: pessoas = [] } = usePeople();
  const { data: empresas = [] } = useCompanies();
  const salvar = useSaveRecord("reservations", "Reserva registrada com sucesso.");
  const atualizar = useSaveRecord("reservations", "Status da reserva atualizado.");

  const [busca, setBusca] = useState("");
  const [statusFiltro, setStatusFiltro] = useState("todos");
  const [empresaFiltro, setEmpresaFiltro] = useState("todas");
  const [aberto, setAberto] = useState(false);
  const [visualizacao, setVisualizacao] = useState<"lista" | "calendario">("lista");
  const [equipamentoSelecionado, setEquipamentoSelecionado] = useState<string | null>(null);

  const form = useForm({
    resolver: zodResolver(reservationSchema),
    defaultValues: {
      equipment_id: "",
      person_id: "",
      company_id: "none",
      data_retirada: todayISO(),
      data_devolucao: addDaysISO(todayISO(), 7),
      quantidade: 1,
      observacoes: "",
    },
  });

  const filtradas = useMemo(() => {
    const termo = busca.trim().toLowerCase();
    return reservas.filter((r) => {
      const combinaTermo =
        !termo ||
        [r.equipments?.codigo, r.equipments?.nome, r.people?.nome, r.companies?.nome]
          .filter(Boolean)
          .some((v) => String(v).toLowerCase().includes(termo));
      const combinaStatus = statusFiltro === "todos" || r.status === statusFiltro;
      const combinaEmpresa = empresaFiltro === "todas" || r.company_id === empresaFiltro;
      return combinaTermo && combinaStatus && combinaEmpresa;
    });
  }, [reservas, busca, statusFiltro, empresaFiltro]);

  const erros = form.formState.errors;

  function mudarStatus(id: string, status: ReservationStatus) {
    const values: Record<string, unknown> = { status };
    if (status === "Devolvido") values.devolvido_em = new Date().toISOString();
    atualizar.mutate({ id, values });
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Reservas"
        description="Agendamentos de equipamentos. O sistema bloqueia períodos conflitantes automaticamente."
        actions={
          <div className="flex items-center gap-2">
            <Tabs
              value={visualizacao}
              onValueChange={(v) => setVisualizacao(v as "lista" | "calendario")}
              className="hidden sm:block"
            >
              <TabsList>
                <TabsTrigger value="lista">
                  <List className="mr-2 size-4" /> Lista
                </TabsTrigger>
                <TabsTrigger value="calendario">
                  <Calendar className="mr-2 size-4" /> Calendário
                </TabsTrigger>
              </TabsList>
            </Tabs>

            {canWrite ? (
              <Button
                onClick={() => {
                  form.reset({
                    equipment_id: "",
                    person_id: "",
                    company_id: "none",
                    data_retirada: todayISO(),
                    data_devolucao: addDaysISO(todayISO(), 7),
                    quantidade: 1,
                    observacoes: "",
                  });
                  setAberto(true);
                }}
              >
                <Plus className="mr-2 size-4" /> Nova reserva
              </Button>
            ) : (
              <Button
                variant="outline"
                className="border-primary text-primary hover:bg-primary/5"
                onClick={() => {
                  const pessoa = pessoas.find((p) => p.email === profile?.email);
                  form.reset({
                    equipment_id: "",
                    person_id: pessoa?.id ?? "",
                    company_id: pessoa?.company_id ?? "none",
                    data_retirada: todayISO(),
                    data_devolucao: addDaysISO(todayISO(), 7),
                    quantidade: 1,
                    observacoes: "",
                  });
                  setAberto(true);
                }}
              >
                <Plus className="mr-2 size-4" /> Solicitar reserva
              </Button>
            )}
          </div>
        }
      />

      {visualizacao === "lista" ? (
        <div className="space-y-6">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <div className="relative lg:col-span-2">
              <Search className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={busca}
                onChange={(e) => setBusca(e.target.value)}
                placeholder="Equipamento, responsável ou empresa"
                className="pl-9"
                aria-label="Buscar reservas"
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
                    {s}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={empresaFiltro} onValueChange={setEmpresaFiltro}>
              <SelectTrigger aria-label="Filtrar por empresa">
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
            <Skeleton className="h-80 rounded-xl" />
          ) : filtradas.length === 0 ? (
            <EmptyState
              icon={CalendarRange}
              title="Nenhuma reserva encontrada"
              description="Registre uma reserva para acompanhar retiradas e devoluções."
            />
          ) : (
            <Card className="overflow-hidden p-0">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Equipamento</TableHead>
                      <TableHead>Responsável</TableHead>
                      <TableHead>Empresa</TableHead>
                      <TableHead>Período</TableHead>
                      <TableHead>Qtd.</TableHead>
                      <TableHead>Status</TableHead>
                      {canWrite && <TableHead className="w-40">Ação</TableHead>}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filtradas.map((r) => {
                      const proximos = RESERVATION_TRANSITIONS[r.status];
                      return (
                        <TableRow key={r.id}>
                          <TableCell>
                            <p className="font-medium">{r.equipments?.nome ?? "—"}</p>
                            <p className="text-xs text-muted-foreground tabular">
                              {r.equipments?.codigo}
                            </p>
                          </TableCell>
                          <TableCell>{r.people?.nome ?? "—"}</TableCell>
                          <TableCell>{r.companies?.nome ?? "—"}</TableCell>
                          <TableCell className="whitespace-nowrap tabular">
                            {formatDate(r.data_retirada)} → {formatDate(r.data_devolucao)}
                          </TableCell>
                          <TableCell className="tabular">{r.quantidade}</TableCell>
                          <TableCell>
                            <StatusBadge tone={RESERVATION_TONE[r.status]}>{r.status}</StatusBadge>
                          </TableCell>
                          {canWrite && (
                            <TableCell>
                              {proximos.length === 0 ? (
                                <span className="text-xs text-muted-foreground">Finalizada</span>
                              ) : (
                                <Select onValueChange={(v) => mudarStatus(r.id, v as ReservationStatus)}>
                                  <SelectTrigger className="h-8" aria-label="Alterar status">
                                    <SelectValue placeholder="Alterar" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {proximos.map((s: ReservationStatus) => (
                                      <SelectItem key={s} value={s}>
                                        {s === "Agendado" && r.status === "Pendente" 
                                          ? "Aprovar solicitação" 
                                          : `Marcar como ${s.toLowerCase()}`}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              )}
                            </TableCell>
                          )}
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            </Card>
          )}
        </div>
      ) : (
        <Card className="p-6">
          <div className="mb-6 flex flex-wrap items-center gap-4">
            <div className="w-full max-w-sm">
              <Label htmlFor="cal-equip">Filtrar por equipamento</Label>
              <Select
                value={equipamentoSelecionado ?? "todos"}
                onValueChange={(v) => setEquipamentoSelecionado(v === "todos" ? null : v)}
              >
                <SelectTrigger id="cal-equip" className="mt-1.5">
                  <SelectValue placeholder="Todos os equipamentos" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos os equipamentos</SelectItem>
                  {equipamentos.map((e) => (
                    <SelectItem key={e.id} value={e.id}>
                      {e.codigo} · {e.nome}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-wrap items-center gap-4 pt-6">
              <div className="flex items-center gap-2">
                <div className="size-3 rounded-full bg-green-500" />
                <span className="text-xs font-medium">Disponível</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="size-3 rounded-full bg-red-500" />
                <span className="text-xs font-medium">Reservado / Ocupado</span>
              </div>
            </div>
          </div>

          <div className="grid gap-8 lg:grid-cols-[1fr_300px]">
            <div className="rounded-md border bg-card p-4">
             <CalendarUI
                mode="single"
                className="w-full"
                numberOfMonths={4}
                modifiers={{
                  reservado: (date: Date) => {
                    return reservas.some((r: any) => {
                      if (!r?.data_retirada || !r?.data_devolucao) return false;
                      if (["Cancelado", "Devolvido", "Pendente"].includes(r.status)) return false;
                      if (equipamentoSelecionado && r.equipment_id !== equipamentoSelecionado) return false;

                      // Cria uma cópia da data para não alterar o parâmetro do calendário diretamente
                      const d = new Date(date);
                      d.setHours(0, 0, 0, 0);

                      // Converte as strings para datas locais (evita bugs de fuso horário/UTC)
                      const [y1, m1, d1] = r.data_retirada.split("T")[0].split("-").map(Number);
                      const inicio = new Date(y1, m1 - 1, d1);

                      const [y2, m2, d2] = r.data_devolucao.split("T")[0].split("-").map(Number);
                      const fim = new Date(y2, m2 - 1, d2);

                      return d >= inicio && d <= fim;
                    });
                  },
                }}
                modifiersClassNames={{
                  reservado: "bg-red-500 text-white hover:bg-red-600 focus:bg-red-600",
                }}
                classNames={{
                  day: "h-12 w-12 p-0 font-normal aria-selected:opacity-100 bg-green-500/10 text-green-700 hover:bg-green-100",
                  day_today: "border-2 border-primary",
                  day_outside: "opacity-30 bg-transparent text-muted-foreground",
                  day_disabled: "opacity-30 cursor-not-allowed",
                }}
              />
            </div>

            <div className="space-y-4">
              <h3 className="font-display text-sm font-bold uppercase tracking-wider text-muted-foreground">
                Legenda e Informações
              </h3>
              <p className="text-sm text-muted-foreground">
                O calendário exibe a disponibilidade geral ou por equipamento. Dias marcados em{" "}
                <span className="font-semibold text-red-500">vermelho</span> já possuem reservas
                confirmadas.
              </p>
              <div className="rounded-lg bg-muted/50 p-4">
                <h4 className="mb-2 text-xs font-bold uppercase">Como solicitar:</h4>
                <ul className="list-inside list-disc space-y-1 text-xs text-muted-foreground">
                  <li>Clique no botão "Solicitar reserva"</li>
                  <li>Escolha o equipamento e o período</li>
                  <li>Aguarde a aprovação do administrador</li>
                </ul>
              </div>
            </div>
          </div>
        </Card>
      )}

      <Dialog open={aberto} onOpenChange={setAberto}>
        <DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Nova reserva</DialogTitle>
            <DialogDescription>
              Reservas com período sobreposto para o mesmo equipamento são recusadas pelo banco de
              dados.
            </DialogDescription>
          </DialogHeader>
          <form
            id="form-reserva"
            className="grid gap-4 sm:grid-cols-2"
            noValidate
            onSubmit={form.handleSubmit((values) => {
              const data = role === "visualizador" ? { ...values, status: "Pendente" } : values;
              salvar.mutate({ values: data as any }, { onSuccess: () => setAberto(false) });
            })}
          >
            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor="r-equip">Equipamento *</Label>
              <Select
                value={form.watch("equipment_id")}
                onValueChange={(v) => form.setValue("equipment_id", v)}
              >
                <SelectTrigger id="r-equip">
                  <SelectValue placeholder="Selecione o equipamento" />
                </SelectTrigger>
                <SelectContent>
                  {equipamentos
                    .filter((e) => e.ativo)
                    .map((e) => (
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
              <Label htmlFor="r-pessoa">Responsável *</Label>
              <Select
                value={form.watch("person_id")}
                onValueChange={(v) => {
                  form.setValue("person_id", v);
                  const pessoa = pessoas.find((p) => p.id === v);
                  if (pessoa?.company_id) form.setValue("company_id", pessoa.company_id);
                }}
              >
                <SelectTrigger id="r-pessoa">
                  <SelectValue placeholder="Selecione" />
                </SelectTrigger>
                <SelectContent>
                  {pessoas.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.nome}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {erros.person_id && (
                <p className="text-xs text-destructive">{erros.person_id.message}</p>
              )}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="r-empresa">Empresa / setor</Label>
              <Select
                value={form.watch("company_id") ?? "none"}
                onValueChange={(v) => form.setValue("company_id", v)}
              >
                <SelectTrigger id="r-empresa">
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
              <Label htmlFor="r-ret">Retirada *</Label>
              <Input id="r-ret" type="date" {...form.register("data_retirada")} />
              {erros.data_retirada && (
                <p className="text-xs text-destructive">{erros.data_retirada.message}</p>
              )}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="r-dev">Devolução *</Label>
              <Input id="r-dev" type="date" {...form.register("data_devolucao")} />
              {erros.data_devolucao && (
                <p className="text-xs text-destructive">{erros.data_devolucao.message}</p>
              )}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="r-qtd">Quantidade</Label>
              <Input id="r-qtd" type="number" min="1" {...form.register("quantidade")} />
              {erros.quantidade && (
                <p className="text-xs text-destructive">{erros.quantidade.message}</p>
              )}
            </div>
            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor="r-obs">Observações</Label>
              <Textarea id="r-obs" rows={2} {...form.register("observacoes")} />
            </div>
          </form>
          <DialogFooter>
            <Button variant="outline" type="button" onClick={() => setAberto(false)}>
              Cancelar
            </Button>
            <Button type="submit" form="form-reserva" disabled={salvar.isPending}>
              {role === "visualizador" ? "Solicitar" : "Reservar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
