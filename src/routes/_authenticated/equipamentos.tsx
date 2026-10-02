import { useMemo, useRef, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import {
  Boxes,
  History,
  ImagePlus,
  Loader2,
  MapPin,
  Pencil,
  Plus,
  Search,
  Trash2,
} from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { EmptyState } from "@/components/EmptyState";
import { StatusBadge } from "@/components/StatusBadge";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
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
  useCategories,
  useDeleteRecord,
  useEquipmentHistory,
  useEquipmentStatus,
  useSaveRecord,
} from "@/hooks/use-data";
import { uploadEquipmentPhoto, useSignedPhoto } from "@/hooks/use-photo";
import { equipmentSchema } from "@/lib/schemas";
import { formatCurrency, formatDate, formatDateTime } from "@/lib/format";
import {
  CONDITION_LABELS,
  CONDITION_TONE,
  SITUACAO_LABELS,
  SITUACAO_TONE,
} from "@/lib/domain";
import type { EquipmentCondition, EquipmentStatusRow, Situacao } from "@/lib/domain";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated/equipamentos")({
  head: () => ({
    meta: [
      { title: "Equipamentos | Gestor de Estoque" },
      {
        name: "description",
        content:
          "Cadastro e rastreio de equipamentos: código, patrimônio, série, valor, foto, situação e histórico completo.",
      },
      { property: "og:title", content: "Controle de equipamentos" },
      {
        property: "og:description",
        content: "Estoque com localização em tempo real e trilha de auditoria.",
      },
    ],
  }),
  component: EquipamentosPage,
});

const CONDICOES: EquipmentCondition[] = ["Novo", "Bom", "Regular", "Manutencao", "Inutilizado"];
const SITUACOES: Situacao[] = ["Disponivel", "Reservado", "Alugado", "Em manutencao"];

const VAZIO = {
  nome: "",
  category_id: "none",
  marca: "",
  modelo: "",
  patrimonio: "",
  num_serie: "",
  descricao: "",
  estado_conservacao: "Novo" as EquipmentCondition,
  valor: 0,
  data_aquisicao: "",
  quantidade: 1,
  foto_url: null as string | null,
};

function Foto({ path, alt, className }: { path: string | null; alt: string; className?: string }) {
  const url = useSignedPhoto(path);
  if (!url) {
    return (
      <span
        className={`grid place-items-center rounded-md bg-muted text-muted-foreground ${className ?? "size-10"}`}
        aria-hidden
      >
        <Boxes className="size-4" />
      </span>
    );
  }
  return <img src={url} alt={alt} loading="lazy" className={`rounded-md object-cover ${className ?? "size-10"}`} />;
}

function HistoricoEquipamento({ equipmentId }: { equipmentId: string }) {
  const { data: eventos = [], isLoading } = useEquipmentHistory(equipmentId);
  if (isLoading) return <Skeleton className="h-32 rounded-lg" />;
  if (eventos.length === 0)
    return <p className="text-sm text-muted-foreground">Nenhum evento registrado ainda.</p>;

  return (
    <ol className="relative space-y-4 border-l border-border pl-5">
      {eventos.map((evento) => (
        <li key={evento.id} className="relative">
          <span className="absolute top-1.5 -left-[23px] size-2.5 rounded-full bg-primary" aria-hidden />
          <p className="text-sm font-medium">{evento.descricao}</p>
          <p className="text-xs text-muted-foreground">
            {formatDateTime(evento.created_at)} · {evento.tipo_evento}
          </p>
        </li>
      ))}
    </ol>
  );
}

function EquipamentosPage() {
  const { canWrite, isAdmin } = useAuth();
  const { data: itens = [], isLoading } = useEquipmentStatus();
  const { data: categorias = [] } = useCategories();
  const salvar = useSaveRecord("equipments", "Equipamento salvo com sucesso.");
  const excluir = useDeleteRecord("equipments");

  const [busca, setBusca] = useState("");
  const [categoriaFiltro, setCategoriaFiltro] = useState("todas");
  const [situacaoFiltro, setSituacaoFiltro] = useState("todas");
  const [condicaoFiltro, setCondicaoFiltro] = useState("todas");
  const [aberto, setAberto] = useState(false);
  const [editandoId, setEditandoId] = useState<string | null>(null);
  const [detalhe, setDetalhe] = useState<EquipmentStatusRow | null>(null);
  const [enviandoFoto, setEnviandoFoto] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const form = useForm({ resolver: zodResolver(equipmentSchema), defaultValues: VAZIO });
  const fotoAtual = form.watch("foto_url");

  const filtrados = useMemo(() => {
    const termo = busca.trim().toLowerCase();
    return itens.filter((item) => {
      const combinaTermo =
        !termo ||
        [item.codigo, item.nome, item.marca, item.modelo, item.categoria, item.empresa, item.responsavel]
          .filter(Boolean)
          .some((v) => String(v).toLowerCase().includes(termo));
      const combinaCategoria = categoriaFiltro === "todas" || item.category_id === categoriaFiltro;
      const combinaSituacao = situacaoFiltro === "todas" || item.situacao === situacaoFiltro;
      const combinaCondicao =
        condicaoFiltro === "todas" || item.estado_conservacao === condicaoFiltro;
      return combinaTermo && combinaCategoria && combinaSituacao && combinaCondicao;
    });
  }, [itens, busca, categoriaFiltro, situacaoFiltro, condicaoFiltro]);

  function abrirNovo() {
    setEditandoId(null);
    form.reset(VAZIO);
    setAberto(true);
  }

  async function abrirEdicao(item: EquipmentStatusRow) {
    const { data } = await supabase.from("equipments").select("*").eq("id", item.id).maybeSingle();
    if (!data) return;
    setEditandoId(item.id);
    form.reset({
      nome: data.nome,
      category_id: data.category_id ?? "none",
      marca: data.marca ?? "",
      modelo: data.modelo ?? "",
      patrimonio: data.patrimonio ?? "",
      num_serie: data.num_serie ?? "",
      descricao: data.descricao ?? "",
      estado_conservacao: data.estado_conservacao as EquipmentCondition,
      valor: Number(data.valor ?? 0),
      data_aquisicao: data.data_aquisicao ?? "",
      quantidade: data.quantidade ?? 1,
      foto_url: data.foto_url,
    });
    setAberto(true);
  }

  async function enviarFoto(file: File) {
    if (file.size > 5 * 1024 * 1024) {
      toast.error("A imagem deve ter no máximo 5 MB.");
      return;
    }
    setEnviandoFoto(true);
    try {
      const path = await uploadEquipmentPhoto(file);
      form.setValue("foto_url", path);
      toast.success("Foto enviada.");
    } catch {
      toast.error("Não foi possível enviar a foto.");
    } finally {
      setEnviandoFoto(false);
    }
  }

  const erros = form.formState.errors;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Equipamentos"
        description="Estoque completo com localização em tempo real e histórico auditável."
        actions={
          canWrite && (
            <Button onClick={abrirNovo}>
              <Plus className="mr-2 size-4" /> Novo equipamento
            </Button>
          )
        }
      />

      <div className="grid gap-3 lg:grid-cols-4">
        <div className="relative lg:col-span-2">
          <Search className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            placeholder="Código, nome, marca, modelo, empresa ou responsável"
            className="pl-9"
            aria-label="Buscar equipamentos"
          />
        </div>
        <Select value={categoriaFiltro} onValueChange={setCategoriaFiltro}>
          <SelectTrigger aria-label="Filtrar por categoria">
            <SelectValue placeholder="Categoria" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todas">Todas as categorias</SelectItem>
            {categorias.map((c) => (
              <SelectItem key={c.id} value={c.id}>
                {c.nome}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <div className="grid grid-cols-2 gap-3">
          <Select value={situacaoFiltro} onValueChange={setSituacaoFiltro}>
            <SelectTrigger aria-label="Filtrar por situação">
              <SelectValue placeholder="Situação" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todas">Todas</SelectItem>
              {SITUACOES.map((s) => (
                <SelectItem key={s} value={s}>
                  {SITUACAO_LABELS[s]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={condicaoFiltro} onValueChange={setCondicaoFiltro}>
            <SelectTrigger aria-label="Filtrar por conservação">
              <SelectValue placeholder="Conservação" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todas">Todas</SelectItem>
              {CONDICOES.map((c) => (
                <SelectItem key={c} value={c}>
                  {CONDITION_LABELS[c]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {isLoading ? (
        <Skeleton className="h-96 rounded-xl" />
      ) : filtrados.length === 0 ? (
        <EmptyState
          icon={Boxes}
          title="Nenhum equipamento encontrado"
          description="Ajuste os filtros ou cadastre um novo equipamento no estoque."
          action={
            canWrite ? (
              <Button onClick={abrirNovo}>
                <Plus className="mr-2 size-4" /> Novo equipamento
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
                  <TableHead>Equipamento</TableHead>
                  <TableHead>Categoria</TableHead>
                  <TableHead>Conservação</TableHead>
                  <TableHead>Situação</TableHead>
                  <TableHead>Localização</TableHead>
                  <TableHead className="text-right">Valor</TableHead>
                  <TableHead className="w-32 text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtrados.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <Foto path={item.foto_url} alt={item.nome} />
                        <div className="min-w-0">
                          <p className="truncate font-medium">{item.nome}</p>
                          <p className="truncate text-xs text-muted-foreground tabular">
                            {item.codigo}
                            {item.marca ? ` · ${item.marca}` : ""}
                            {item.modelo ? ` ${item.modelo}` : ""}
                          </p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>{item.categoria ?? "—"}</TableCell>
                    <TableCell>
                      <StatusBadge tone={CONDITION_TONE[item.estado_conservacao]} dot={false}>
                        {CONDITION_LABELS[item.estado_conservacao]}
                      </StatusBadge>
                    </TableCell>
                    <TableCell>
                      <StatusBadge tone={SITUACAO_TONE[item.situacao]}>
                        {SITUACAO_LABELS[item.situacao]}
                      </StatusBadge>
                    </TableCell>
                    <TableCell className="max-w-56">
                      {item.situacao === "Disponivel" ? (
                        <span className="text-sm text-muted-foreground">Em estoque</span>
                      ) : (
                        <div className="min-w-0 text-sm">
                          <p className="truncate">{item.empresa ?? "Sem empresa"}</p>
                          <p className="truncate text-xs text-muted-foreground">
                            {item.responsavel ?? "—"}
                            {item.data_devolucao ? ` · até ${formatDate(item.data_devolucao)}` : ""}
                          </p>
                        </div>
                      )}
                    </TableCell>
                    <TableCell className="text-right tabular">{formatCurrency(item.valor)}</TableCell>
                    <TableCell className="text-right whitespace-nowrap">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setDetalhe(item)}
                        aria-label={`Detalhes de ${item.nome}`}
                      >
                        <History className="size-4" />
                      </Button>
                      {canWrite && (
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => void abrirEdicao(item)}
                          aria-label={`Editar ${item.nome}`}
                        >
                          <Pencil className="size-4" />
                        </Button>
                      )}
                      {isAdmin && (
                        <ConfirmDialog
                          title={`Excluir ${item.nome}?`}
                          description="O equipamento só pode ser excluído se não houver reservas ou manutenções vinculadas."
                          onConfirm={() => excluir.mutate(item.id)}
                          trigger={
                            <Button variant="ghost" size="icon" aria-label={`Excluir ${item.nome}`}>
                              <Trash2 className="size-4 text-destructive" />
                            </Button>
                          }
                        />
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </Card>
      )}

      {/* Formulário */}
      <Dialog open={aberto} onOpenChange={setAberto}>
        <DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>{editandoId ? "Editar equipamento" : "Novo equipamento"}</DialogTitle>
            <DialogDescription>
              O código do equipamento é gerado automaticamente pelo sistema.
            </DialogDescription>
          </DialogHeader>
          <form
            id="form-equip"
            className="grid gap-4 sm:grid-cols-2"
            noValidate
            onSubmit={form.handleSubmit((values) =>
              salvar.mutate({ id: editandoId ?? undefined, values }, { onSuccess: () => setAberto(false) }),
            )}
          >
            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor="e-nome">Nome *</Label>
              <Input id="e-nome" {...form.register("nome")} />
              {erros.nome && <p className="text-xs text-destructive">{erros.nome.message}</p>}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="e-cat">Categoria</Label>
              <Select
                value={form.watch("category_id") ?? "none"}
                onValueChange={(v) => form.setValue("category_id", v)}
              >
                <SelectTrigger id="e-cat">
                  <SelectValue placeholder="Selecione" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Sem categoria</SelectItem>
                  {categorias.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.nome}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="e-estado">Estado de conservação *</Label>
              <Select
                value={form.watch("estado_conservacao")}
                onValueChange={(v) => form.setValue("estado_conservacao", v as EquipmentCondition)}
              >
                <SelectTrigger id="e-estado">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CONDICOES.map((c) => (
                    <SelectItem key={c} value={c}>
                      {CONDITION_LABELS[c]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="e-marca">Marca</Label>
              <Input id="e-marca" {...form.register("marca")} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="e-modelo">Modelo</Label>
              <Input id="e-modelo" {...form.register("modelo")} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="e-patrimonio">Nº de patrimônio</Label>
              <Input id="e-patrimonio" {...form.register("patrimonio")} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="e-serie">Nº de série</Label>
              <Input id="e-serie" {...form.register("num_serie")} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="e-valor">Valor (R$)</Label>
              <Input id="e-valor" type="number" step="0.01" min="0" {...form.register("valor")} />
              {erros.valor && <p className="text-xs text-destructive">{erros.valor.message}</p>}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="e-qtd">Quantidade</Label>
              <Input id="e-qtd" type="number" min="0" {...form.register("quantidade")} />
              {erros.quantidade && (
                <p className="text-xs text-destructive">{erros.quantidade.message}</p>
              )}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="e-data">Data de aquisição</Label>
              <Input id="e-data" type="date" {...form.register("data_aquisicao")} />
            </div>
            <div className="space-y-1.5">
              <Label>Foto</Label>
              <div className="flex items-center gap-3">
                <Foto path={fotoAtual ?? null} alt="Foto do equipamento" className="size-12" />
                <input
                  ref={fileRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) void enviarFoto(file);
                    e.target.value = "";
                  }}
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => fileRef.current?.click()}
                  disabled={enviandoFoto}
                >
                  {enviandoFoto ? (
                    <Loader2 className="mr-2 size-4 animate-spin" />
                  ) : (
                    <ImagePlus className="mr-2 size-4" />
                  )}
                  Enviar
                </Button>
              </div>
            </div>
            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor="e-desc">Descrição / observações</Label>
              <Textarea id="e-desc" rows={3} {...form.register("descricao")} />
            </div>
          </form>
          <DialogFooter>
            <Button variant="outline" type="button" onClick={() => setAberto(false)}>
              Cancelar
            </Button>
            <Button type="submit" form="form-equip" disabled={salvar.isPending}>
              Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Detalhes + histórico */}
      <Sheet open={Boolean(detalhe)} onOpenChange={(open) => !open && setDetalhe(null)}>
        <SheetContent className="w-full overflow-y-auto sm:max-w-lg">
          {detalhe && (
            <>
              <SheetHeader>
                <SheetTitle>{detalhe.nome}</SheetTitle>
                <SheetDescription className="tabular">
                  {detalhe.codigo} · {detalhe.categoria ?? "Sem categoria"}
                </SheetDescription>
              </SheetHeader>
              <div className="space-y-5 px-4 pb-8">
                <Foto path={detalhe.foto_url} alt={detalhe.nome} className="h-44 w-full" />

                <div className="flex flex-wrap gap-2">
                  <StatusBadge tone={SITUACAO_TONE[detalhe.situacao]}>
                    {SITUACAO_LABELS[detalhe.situacao]}
                  </StatusBadge>
                  <StatusBadge tone={CONDITION_TONE[detalhe.estado_conservacao]} dot={false}>
                    {CONDITION_LABELS[detalhe.estado_conservacao]}
                  </StatusBadge>
                </div>

                <div className="rounded-lg border border-border p-4">
                  <p className="flex items-center gap-2 text-sm font-semibold">
                    <MapPin className="size-4" aria-hidden /> Localização atual
                  </p>
                  {detalhe.situacao === "Disponivel" ? (
                    <p className="mt-2 text-sm text-muted-foreground">
                      Disponível no estoque interno.
                    </p>
                  ) : (
                    <dl className="mt-2 grid grid-cols-2 gap-2 text-sm">
                      <dt className="text-muted-foreground">Empresa</dt>
                      <dd>{detalhe.empresa ?? "—"}</dd>
                      <dt className="text-muted-foreground">Responsável</dt>
                      <dd>{detalhe.responsavel ?? "—"}</dd>
                      <dt className="text-muted-foreground">Período</dt>
                      <dd>
                        {formatDate(detalhe.data_retirada)} → {formatDate(detalhe.data_devolucao)}
                      </dd>
                    </dl>
                  )}
                </div>

                <dl className="grid grid-cols-2 gap-2 text-sm">
                  <dt className="text-muted-foreground">Marca / modelo</dt>
                  <dd>{[detalhe.marca, detalhe.modelo].filter(Boolean).join(" ") || "—"}</dd>
                  <dt className="text-muted-foreground">Quantidade</dt>
                  <dd className="tabular">{detalhe.quantidade}</dd>
                  <dt className="text-muted-foreground">Valor unitário</dt>
                  <dd className="tabular">{formatCurrency(detalhe.valor)}</dd>
                </dl>

                <Separator />

                <div>
                  <p className="mb-3 flex items-center gap-2 text-sm font-semibold">
                    <History className="size-4" aria-hidden /> Histórico completo
                  </p>
                  <HistoricoEquipamento equipmentId={detalhe.id} />
                </div>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}
