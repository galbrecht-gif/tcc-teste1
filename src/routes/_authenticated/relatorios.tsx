import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Eye, FileBarChart, FileSpreadsheet, FileText } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
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
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "sonner";
import { useEquipmentStatus, useMaintenances, useReservations } from "@/hooks/use-data";
import { exportToExcel, exportToPDF, type ReportColumn } from "@/lib/reports";
import { formatCurrency, formatDate, todayISO } from "@/lib/format";
import { MAINTENANCE_STATUS_LABELS, SITUACAO_LABELS } from "@/lib/domain";
import type { EquipmentStatusRow } from "@/lib/domain";
import type { MaintenanceRow, ReservationRow } from "@/hooks/use-data";

export const Route = createFileRoute("/_authenticated/relatorios")({
  head: () => ({
    meta: [
      { title: "Relatórios | Gestor de Estoque" },
      {
        name: "description",
        content:
          "Exportação e pré-visualização de relatórios de equipamentos, reservas, atrasos e manutenções.",
      },
      { property: "og:title", content: "Relatórios do estoque" },
      { property: "og:description", content: "Pré-visualize e gere relatórios em PDF e Excel." },
    ],
  }),
  component: RelatoriosPage,
});

const colunasEquipamentos: ReportColumn<EquipmentStatusRow>[] = [
  { header: "Código", value: (e) => e.codigo },
  { header: "Equipamento", value: (e) => e.nome, width: 28 },
  { header: "Categoria", value: (e) => e.categoria ?? "—" },
  { header: "Marca/Modelo", value: (e) => [e.marca, e.modelo].filter(Boolean).join(" ") || "—" },
  { header: "Qtd.", value: (e) => e.quantidade },
  { header: "Conservação", value: (e) => e.estado_conservacao },
  { header: "Situação", value: (e) => SITUACAO_LABELS[e.situacao] },
  { header: "Empresa", value: (e) => e.empresa ?? "—" },
  { header: "Responsável", value: (e) => e.responsavel ?? "—" },
  { header: "Valor", value: (e) => formatCurrency(e.valor) },
];

const colunasReservas: ReportColumn<ReservationRow>[] = [
  { header: "Equipamento", value: (r) => `${r.equipments?.codigo ?? ""} ${r.equipments?.nome ?? ""}`, width: 30 },
  { header: "Responsável", value: (r) => r.people?.nome ?? "—" },
  { header: "Empresa", value: (r) => r.companies?.nome ?? "—" },
  { header: "Retirada", value: (r) => formatDate(r.data_retirada) },
  { header: "Devolução", value: (r) => formatDate(r.data_devolucao) },
  { header: "Qtd.", value: (r) => r.quantidade },
  { header: "Status", value: (r) => r.status },
];

const colunasManutencoes: ReportColumn<MaintenanceRow>[] = [
  { header: "Equipamento", value: (m) => `${m.equipments?.codigo ?? ""} ${m.equipments?.nome ?? ""}`, width: 30 },
  { header: "Tipo", value: (m) => m.tipo },
  { header: "Fornecedor", value: (m) => m.fornecedor ?? "—" },
  { header: "Início", value: (m) => formatDate(m.data_inicio) },
  { header: "Conclusão", value: (m) => (m.data_fim ? formatDate(m.data_fim) : "em aberto") },
  { header: "Custo", value: (m) => formatCurrency(m.custo) },
  { header: "Status", value: (m) => MAINTENANCE_STATUS_LABELS[m.status] },
];

type RelatorioItem = {
  id: string;
  titulo: string;
  descricao: string;
  total: number;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  colunas: ReportColumn<any>[];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  dados: any[];
};

function RelatoriosPage() {
  const { data: equipamentos = [] } = useEquipmentStatus();
  const { data: reservas = [] } = useReservations();
  const { data: manutencoes = [] } = useMaintenances();
  const [gerando, setGerando] = useState<string | null>(null);
  const [relatorioSelecionado, setRelatorioSelecionado] = useState<RelatorioItem | null>(null);

  const atrasadas = reservas.filter((r) => r.status === "Atrasado");
  const emCampo = equipamentos.filter((e) => e.situacao !== "Disponivel");

  const relatorios: RelatorioItem[] = [
    {
      id: "estoque",
      titulo: "Inventário completo",
      descricao: "Todos os equipamentos com situação, localização e valor patrimonial.",
      total: equipamentos.length,
      colunas: colunasEquipamentos,
      dados: equipamentos,
    },
    {
      id: "campo",
      titulo: "Equipamentos em campo",
      descricao: "Itens alugados, reservados ou em manutenção, com empresa e responsável.",
      total: emCampo.length,
      colunas: colunasEquipamentos,
      dados: emCampo,
    },
    {
      id: "reservas",
      titulo: "Reservas e movimentações",
      descricao: "Histórico de agendamentos com períodos e status.",
      total: reservas.length,
      colunas: colunasReservas,
      dados: reservas,
    },
    {
      id: "atrasos",
      titulo: "Devoluções atrasadas",
      descricao: "Reservas vencidas que exigem cobrança imediata.",
      total: atrasadas.length,
      colunas: colunasReservas,
      dados: atrasadas,
    },
    {
      id: "manutencoes",
      titulo: "Manutenções e custos",
      descricao: "Ordens de serviço com fornecedor, prazos e custo total.",
      total: manutencoes.length,
      colunas: colunasManutencoes,
      dados: manutencoes,
    },
  ];

  async function gerar(
    formato: "pdf" | "excel",
    relatorio: RelatorioItem,
  ) {
    if (relatorio.dados.length === 0) {
      toast.error("Não há registros para exportar neste relatório.");
      return;
    }
    setGerando(`${relatorio.id}-${formato}`);
    try {
      const filename = `${relatorio.id}-${todayISO()}`;
      if (formato === "pdf") {
        await exportToPDF({
          title: relatorio.titulo,
          subtitle: "Gestor de Estoque de Equipamentos",
          columns: relatorio.colunas,
          rows: relatorio.dados,
          filename,
        });
      } else {
        await exportToExcel({
          columns: relatorio.colunas,
          rows: relatorio.dados,
          filename,
          sheetName: relatorio.titulo,
        });
      }
      toast.success("Relatório gerado com sucesso.");
    } catch {
      toast.error("Não foi possível gerar o relatório.");
    } finally {
      setGerando(null);
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Relatórios"
        description="Visualize na tela ou exporte os dados operacionais em PDF e Excel."
      />

      <div className="grid gap-4 md:grid-cols-2">
        {relatorios.map((relatorio) => (
          <Card key={relatorio.id} className="gap-3 p-5">
            <div className="flex items-start gap-3">
              <span className="grid size-10 shrink-0 place-items-center rounded-md bg-primary/10 text-primary">
                <FileBarChart className="size-5" aria-hidden />
              </span>
              <div className="min-w-0">
                <h2 className="font-display text-base font-bold">{relatorio.titulo}</h2>
                <p className="text-sm text-muted-foreground">{relatorio.descricao}</p>
                <p className="mt-1 text-xs text-muted-foreground tabular">
                  {relatorio.total} registro(s)
                </p>
              </div>
            </div>
            <div className="flex flex-wrap gap-2 pt-1">
              <Button
                variant="default"
                size="sm"
                onClick={() => setRelatorioSelecionado(relatorio)}
              >
                <Eye className="mr-2 size-4" /> Visualizar
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={gerando === `${relatorio.id}-pdf`}
                onClick={() => void gerar("pdf", relatorio)}
              >
                <FileText className="mr-2 size-4" /> PDF
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={gerando === `${relatorio.id}-excel`}
                onClick={() => void gerar("excel", relatorio)}
              >
                <FileSpreadsheet className="mr-2 size-4" /> Excel
              </Button>
            </div>
          </Card>
        ))}
      </div>

      {/* Modal de Pré-visualização */}
      <Dialog
        open={!!relatorioSelecionado}
        onOpenChange={(open) => !open && setRelatorioSelecionado(null)}
      >
        <DialogContent className="max-w-4xl max-h-[85vh] flex flex-col">
          <DialogHeader className="flex flex-row items-center justify-between space-y-0 pr-6">
            <div>
              <DialogTitle className="text-lg font-bold">
                {relatorioSelecionado?.titulo}
              </DialogTitle>
              <DialogDescription>
                {relatorioSelecionado?.total} registro(s) encontrado(s)
              </DialogDescription>
            </div>
            {relatorioSelecionado && (
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={gerando === `${relatorioSelecionado.id}-pdf`}
                  onClick={() => void gerar("pdf", relatorioSelecionado)}
                >
                  <FileText className="mr-1.5 size-4" /> PDF
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={gerando === `${relatorioSelecionado.id}-excel`}
                  onClick={() => void gerar("excel", relatorioSelecionado)}
                >
                  <FileSpreadsheet className="mr-1.5 size-4" /> Excel
                </Button>
              </div>
            )}
          </DialogHeader>

          <ScrollArea className="flex-1 mt-4 border rounded-md">
            {relatorioSelecionado && relatorioSelecionado.dados.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    {relatorioSelecionado.colunas.map((col, idx) => (
                      <TableHead key={idx} className="whitespace-nowrap font-bold">
                        {col.header}
                      </TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {relatorioSelecionado.dados.map((row, rowIdx) => (
                    <TableRow key={rowIdx}>
                      {relatorioSelecionado.colunas.map((col, colIdx) => (
                        <TableCell key={colIdx} className="whitespace-nowrap text-sm">
                          {String(col.value(row) ?? "—")}
                        </TableCell>
                      ))}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <div className="p-8 text-center text-sm text-muted-foreground">
                Nenhum registro encontrado para este relatório.
              </div>
            )}
          </ScrollArea>
        </DialogContent>
      </Dialog>
    </div>
  );
}