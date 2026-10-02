import { useEffect, useMemo } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import {
  AlertTriangle,
  Boxes,
  CalendarClock,
  CheckCircle2,
  CircleDollarSign,
  PackageCheck,
  Wrench,
} from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { PageHeader } from "@/components/PageHeader";
import { StatCard } from "@/components/StatCard";
import { StatusBadge } from "@/components/StatusBadge";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useEquipmentStatus, useMaintenances, useMarkOverdue } from "@/hooks/use-data";
import { useNotifications } from "@/hooks/use-notifications";
import { formatCurrency, formatDate } from "@/lib/format";
import { RESERVATION_TONE, SITUACAO_LABELS, SITUACAO_TONE } from "@/lib/domain";
import type { Situacao } from "@/lib/domain";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({
    meta: [
      { title: "Painel de controle | Gestor de Estoque" },
      {
        name: "description",
        content:
          "Indicadores de estoque, disponibilidade, manutenções, atrasos e valor patrimonial dos equipamentos.",
      },
      { property: "og:title", content: "Painel de controle do estoque" },
      {
        property: "og:description",
        content: "Visão geral de equipamentos, reservas e alertas operacionais.",
      },
    ],
  }),
  component: DashboardPage,
});

const CHART_COLORS = [
  "var(--color-chart-1)",
  "var(--color-chart-2)",
  "var(--color-chart-3)",
  "var(--color-chart-4)",
  "var(--color-chart-5)",
];

function DashboardPage() {
  const { data: status = [], isLoading } = useEquipmentStatus();
  const { data: maintenances = [] } = useMaintenances();
  const { notifications, atrasadas, proximas } = useNotifications();
  const markOverdue = useMarkOverdue();

  useEffect(() => {
    markOverdue.mutate();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const resumo = useMemo(() => {
    const ativos = status.filter((s) => s.ativo);
    const conta = (situacao: Situacao) => ativos.filter((s) => s.situacao === situacao).length;
    return {
      total: ativos.length,
      unidades: ativos.reduce((acc, s) => acc + (s.quantidade ?? 0), 0),
      disponiveis: conta("Disponivel"),
      alugados: conta("Alugado"),
      reservados: conta("Reservado"),
      manutencao: conta("Em manutencao"),
      valor: ativos.reduce((acc, s) => acc + Number(s.valor ?? 0) * (s.quantidade ?? 1), 0),
    };
  }, [status]);

  const porSituacao = useMemo(
    () =>
      (["Disponivel", "Alugado", "Reservado", "Em manutencao"] as Situacao[])
        .map((situacao) => ({
          name: SITUACAO_LABELS[situacao],
          value: status.filter((s) => s.ativo && s.situacao === situacao).length,
        }))
        .filter((d) => d.value > 0),
    [status],
  );

  const porCategoria = useMemo(() => {
    const map = new Map<string, number>();
    status
      .filter((s) => s.ativo)
      .forEach((s) => {
        const key = s.categoria ?? "Sem categoria";
        map.set(key, (map.get(key) ?? 0) + 1);
      });
    return [...map.entries()]
      .map(([categoria, total]) => ({ categoria, total }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 8);
  }, [status]);

  const manutencoesAbertas = maintenances.filter(
    (m) => m.status === "Aberta" || m.status === "EmAndamento",
  );

  if (isLoading) {
    return (
      <div className="space-y-6">
        <PageHeader title="Painel de controle" description="Carregando indicadores..." />
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} className="h-20 rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Painel de controle"
        description="Visão geral do estoque, movimentações e alertas operacionais."
        actions={
          <Button asChild>
            <Link to="/reservas">Nova reserva</Link>
          </Button>
        }
      />

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Equipamentos ativos"
          value={resumo.total}
          hint={`${resumo.unidades} unidades em estoque`}
          icon={Boxes}
        />
        <StatCard
          label="Disponíveis"
          value={resumo.disponiveis}
          hint="Prontos para reserva"
          icon={CheckCircle2}
          tone="success"
        />
        <StatCard
          label="Em uso / reservados"
          value={resumo.alugados + resumo.reservados}
          hint={`${resumo.alugados} alugados · ${resumo.reservados} reservados`}
          icon={PackageCheck}
          tone="accent"
        />
        <StatCard
          label="Em manutenção"
          value={resumo.manutencao}
          hint={`${manutencoesAbertas.length} ordens abertas`}
          icon={Wrench}
          tone="warning"
        />
        <StatCard
          label="Devoluções atrasadas"
          value={atrasadas.length}
          hint="Requerem contato imediato"
          icon={AlertTriangle}
          tone="danger"
        />
        <StatCard
          label="Devoluções próximas"
          value={proximas.length}
          hint="Vencem em até 2 dias"
          icon={CalendarClock}
          tone="info"
        />
        <StatCard
          label="Valor patrimonial"
          value={formatCurrency(resumo.valor)}
          hint="Somatório dos itens ativos"
          icon={CircleDollarSign}
        />
        <StatCard
          label="Alertas ativos"
          value={notifications.length}
          hint="Atrasos, vencimentos e retiradas"
          icon={AlertTriangle}
          tone={notifications.length > 0 ? "warning" : "success"}
        />
      </section>

      <section className="grid gap-4 lg:grid-cols-5">
        <Card className="gap-4 p-5 lg:col-span-3">
          <div>
            <h2 className="font-display text-base font-bold">Equipamentos por categoria</h2>
            <p className="text-xs text-muted-foreground">Distribuição do acervo ativo</p>
          </div>
          <div className="h-72">
            {porCategoria.length === 0 ? (
              <p className="pt-16 text-center text-sm text-muted-foreground">
                Cadastre equipamentos para visualizar o gráfico.
              </p>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={porCategoria} margin={{ left: -20, right: 8 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" vertical={false} />
                  <XAxis
                    dataKey="categoria"
                    tick={{ fontSize: 11, fill: "var(--color-muted-foreground)" }}
                    interval={0}
                    angle={-15}
                    textAnchor="end"
                    height={60}
                  />
                  <YAxis
                    allowDecimals={false}
                    tick={{ fontSize: 11, fill: "var(--color-muted-foreground)" }}
                  />
                  <Tooltip
                    contentStyle={{
                      background: "var(--color-popover)",
                      border: "1px solid var(--color-border)",
                      borderRadius: 8,
                      fontSize: 12,
                      color: "var(--color-popover-foreground)",
                    }}
                  />
                  <Bar dataKey="total" name="Equipamentos" fill="var(--color-chart-1)" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </Card>

        <Card className="gap-4 p-5 lg:col-span-2">
          <div>
            <h2 className="font-display text-base font-bold">Situação do estoque</h2>
            <p className="text-xs text-muted-foreground">Onde estão os equipamentos agora</p>
          </div>
          <div className="h-72">
            {porSituacao.length === 0 ? (
              <p className="pt-16 text-center text-sm text-muted-foreground">Sem dados ainda.</p>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={porSituacao}
                    dataKey="value"
                    nameKey="name"
                    innerRadius={55}
                    outerRadius={90}
                    paddingAngle={2}
                  >
                    {porSituacao.map((_, i) => (
                      <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                    ))}
                  </Pie>
                  <Legend wrapperStyle={{ fontSize: 12 }} />
                  <Tooltip
                    contentStyle={{
                      background: "var(--color-popover)",
                      border: "1px solid var(--color-border)",
                      borderRadius: 8,
                      fontSize: 12,
                      color: "var(--color-popover-foreground)",
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>
        </Card>
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
        <Card className="gap-3 p-5">
          <div className="flex items-center justify-between">
            <h2 className="font-display text-base font-bold">Alertas de devolução</h2>
            <Button asChild variant="ghost" size="sm">
              <Link to="/reservas">Ver reservas</Link>
            </Button>
          </div>
          {atrasadas.length === 0 && proximas.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">
              Nenhuma devolução pendente ou atrasada.
            </p>
          ) : (
            <ul className="divide-y divide-border">
              {[...atrasadas, ...proximas].slice(0, 6).map((r) => (
                <li key={r.id} className="flex items-center justify-between gap-3 py-2.5">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">
                      {r.equipments?.codigo} · {r.equipments?.nome}
                    </p>
                    <p className="truncate text-xs text-muted-foreground">
                      {r.people?.nome ?? "—"} · devolver em {formatDate(r.data_devolucao)}
                    </p>
                  </div>
                  <StatusBadge tone={RESERVATION_TONE[r.status]}>{r.status}</StatusBadge>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card className="gap-3 p-5">
          <div className="flex items-center justify-between">
            <h2 className="font-display text-base font-bold">Equipamentos em campo</h2>
            <Button asChild variant="ghost" size="sm">
              <Link to="/equipamentos">Ver estoque</Link>
            </Button>
          </div>
          {status.filter((s) => s.situacao !== "Disponivel").length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">
              Todos os equipamentos estão disponíveis no estoque.
            </p>
          ) : (
            <ul className="divide-y divide-border">
              {status
                .filter((s) => s.situacao !== "Disponivel")
                .slice(0, 6)
                .map((s) => (
                  <li key={s.id} className="flex items-center justify-between gap-3 py-2.5">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">
                        {s.codigo} · {s.nome}
                      </p>
                      <p className="truncate text-xs text-muted-foreground">
                        {s.empresa ?? "Sem empresa"} · {s.responsavel ?? "sem responsável"}
                      </p>
                    </div>
                    <StatusBadge tone={SITUACAO_TONE[s.situacao]}>
                      {SITUACAO_LABELS[s.situacao]}
                    </StatusBadge>
                  </li>
                ))}
            </ul>
          )}
        </Card>
      </section>
    </div>
  );
}
