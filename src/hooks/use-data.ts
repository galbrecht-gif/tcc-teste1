import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { markOverdueReservations } from "@/lib/reservations.functions";
import type {
  Category,
  Company,
  Equipment,
  EquipmentStatusRow,
  HistoryEntry,
  Maintenance,
  Person,
  Reservation,
} from "@/lib/domain";

/**
 * Camada de acesso a dados.
 * Todas as leituras/escritas passam pelo cliente do navegador e são filtradas
 * pelas políticas de segurança (RLS) do banco de acordo com o nível de acesso.
 */

function unwrap<T>({ data, error }: { data: T | null; error: { message: string } | null }): T {
  if (error) throw new Error(traduzErro(error.message));
  return (data ?? []) as T;
}

/** Converte erros técnicos do banco em mensagens amigáveis. */
export function traduzErro(message: string): string {
  if (message.includes("Conflito de reserva")) return message;
  if (message.includes("companies_cnpj_key")) return "Já existe uma empresa com este CNPJ.";
  if (message.includes("categories_nome_key")) return "Já existe uma categoria com este nome.";
  if (message.includes("equipments_codigo_key")) return "Já existe um equipamento com este código.";
  if (message.includes("violates foreign key"))
    return "Não é possível excluir: existem registros vinculados a este item.";
  if (message.includes("row-level security") || message.includes("permission denied"))
    return "Você não tem permissão para executar esta ação.";
  return message;
}

export const queryKeys = {
  companies: ["companies"] as const,
  people: ["people"] as const,
  categories: ["categories"] as const,
  equipments: ["equipments"] as const,
  equipmentStatus: ["equipment-status"] as const,
  reservations: ["reservations"] as const,
  maintenances: ["maintenances"] as const,
  history: (id: string) => ["history", id] as const,
};

/* ---------------------------------- Leituras --------------------------------- */

export function useCompanies() {
  return useQuery({
    queryKey: queryKeys.companies,
    queryFn: async () =>
      unwrap<Company[]>(await supabase.from("companies").select("*").order("nome")),
  });
}

export function usePeople() {
  return useQuery({
    queryKey: queryKeys.people,
    queryFn: async () =>
      unwrap<(Person & { companies: { nome: string } | null })[]>(
        await supabase.from("people").select("*, companies(nome)").order("nome"),
      ),
  });
}

export function useCategories() {
  return useQuery({
    queryKey: queryKeys.categories,
    queryFn: async () =>
      unwrap<Category[]>(await supabase.from("categories").select("*").order("nome")),
  });
}

export function useEquipments() {
  return useQuery({
    queryKey: queryKeys.equipments,
    queryFn: async () =>
      unwrap<(Equipment & { categories: { nome: string } | null })[]>(
        await supabase.from("equipments").select("*, categories(nome)").order("codigo"),
      ),
  });
}

export function useEquipmentStatus() {
  return useQuery({
    queryKey: queryKeys.equipmentStatus,
    queryFn: async () =>
      unwrap<EquipmentStatusRow[]>(
        (await supabase.from("equipment_status").select("*").order("codigo")) as never,
      ),
  });
}

export type ReservationRow = Reservation & {
  equipments: { nome: string; codigo: string } | null;
  people: { nome: string } | null;
  companies: { nome: string } | null;
};

export function useReservations() {
  return useQuery({
    queryKey: queryKeys.reservations,
    queryFn: async () =>
      unwrap<ReservationRow[]>(
        await supabase
          .from("reservations")
          .select("*, equipments(nome, codigo), people(nome), companies(nome)")
          .order("data_retirada", { ascending: false }),
      ),
  });
}

export type MaintenanceRow = Maintenance & {
  equipments: { nome: string; codigo: string } | null;
};

export function useMaintenances() {
  return useQuery({
    queryKey: queryKeys.maintenances,
    queryFn: async () =>
      unwrap<MaintenanceRow[]>(
        await supabase
          .from("maintenances")
          .select("*, equipments(nome, codigo)")
          .order("data_inicio", { ascending: false }),
      ),
  });
}

export function useEquipmentHistory(equipmentId: string) {
  return useQuery({
    queryKey: queryKeys.history(equipmentId),
    queryFn: async () =>
      unwrap<HistoryEntry[]>(
        await supabase
          .from("equipment_history")
          .select("*")
          .eq("equipment_id", equipmentId)
          .order("created_at", { ascending: false }),
      ),
    enabled: Boolean(equipmentId),
  });
}

/* --------------------------------- Escritas ---------------------------------- */

type TableName =
  | "companies"
  | "people"
  | "categories"
  | "equipments"
  | "reservations"
  | "maintenances";

const INVALIDATES: Record<TableName, readonly (readonly string[])[]> = {
  companies: [queryKeys.companies, queryKeys.people, queryKeys.equipmentStatus],
  people: [queryKeys.people],
  categories: [queryKeys.categories, queryKeys.equipments],
  equipments: [queryKeys.equipments, queryKeys.equipmentStatus],
  reservations: [queryKeys.reservations, queryKeys.equipmentStatus],
  maintenances: [queryKeys.maintenances, queryKeys.equipmentStatus],
};

/** Mutação genérica de gravação (create/update) com mensagens amigáveis. */
export function useSaveRecord(table: TableName, successMessage = "Registro salvo com sucesso.") {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, values }: { id?: string; values: Record<string, unknown> }) => {
      const client = supabase.from(table) as never as {
        update: (v: Record<string, unknown>) => { eq: (c: string, v: string) => Promise<{ error: { message: string } | null }> };
        insert: (v: Record<string, unknown>) => Promise<{ error: { message: string } | null }>;
      };
      const query = id ? client.update(values).eq("id", id) : client.insert(values);
      const { error } = await query;
      if (error) throw new Error(traduzErro(error.message));
    },
    onSuccess: () => {
      INVALIDATES[table].forEach((key) => qc.invalidateQueries({ queryKey: key }));
      qc.invalidateQueries({ queryKey: ["history"] });
      toast.success(successMessage);
    },
    onError: (error: Error) => toast.error(error.message),
  });
}

export function useDeleteRecord(table: TableName) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from(table).delete().eq("id", id);
      if (error) throw new Error(traduzErro(error.message));
    },
    onSuccess: () => {
      INVALIDATES[table].forEach((key) => qc.invalidateQueries({ queryKey: key }));
      toast.success("Registro excluído.");
    },
    onError: (error: Error) => toast.error(error.message),
  });
}

/** Marca automaticamente como atrasadas as reservas vencidas (via servidor). */
export function useMarkOverdue() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      await markOverdueReservations({ data: undefined });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.reservations });
      qc.invalidateQueries({ queryKey: queryKeys.equipmentStatus });
    },
  });
}

