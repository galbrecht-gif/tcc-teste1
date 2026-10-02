/**
 * Tipos e constantes de domínio do sistema de estoque.
 * Centralizados para manter rótulos, cores e regras consistentes na aplicação inteira.
 */
import type { Tables } from "@/integrations/supabase/types";

export type AppRole = "admin" | "funcionario" | "visualizador";
export type EquipmentCondition = "Novo" | "Bom" | "Regular" | "Manutencao" | "Inutilizado";
export type ReservationStatus =
  | "Agendado"
  | "Retirado"
  | "Devolvido"
  | "Atrasado"
  | "Cancelado"
  | "Pendente";
export type MaintenanceStatus = "Aberta" | "EmAndamento" | "Concluida" | "Cancelada";
export type Situacao = "Disponivel" | "Reservado" | "Alugado" | "Em manutencao";

export type Company = Tables<"companies">;
export type Person = Tables<"people">;
export type Category = Tables<"categories">;
export type Equipment = Tables<"equipments">;
export type Reservation = Tables<"reservations">;
export type Maintenance = Tables<"maintenances">;
export type HistoryEntry = Tables<"equipment_history">;
export type Profile = Tables<"profiles">;

export type EquipmentStatusRow = {
  id: string;
  codigo: string;
  nome: string;
  marca: string | null;
  modelo: string | null;
  foto_url: string | null;
  valor: number;
  quantidade: number;
  estado_conservacao: EquipmentCondition;
  ativo: boolean;
  categoria: string | null;
  category_id: string | null;
  maintenance_id: string | null;
  reservation_id: string | null;
  reservation_status: ReservationStatus | null;
  data_retirada: string | null;
  data_devolucao: string | null;
  empresa: string | null;
  company_id: string | null;
  responsavel: string | null;
  situacao: Situacao;
};

export const ROLE_LABELS: Record<AppRole, string> = {
  admin: "Administrador",
  funcionario: "Funcionário",
  visualizador: "Visualizador",
};

export const CONDITION_LABELS: Record<EquipmentCondition, string> = {
  Novo: "Novo",
  Bom: "Bom",
  Regular: "Regular",
  Manutencao: "Manutenção",
  Inutilizado: "Inutilizado",
};

export const RESERVATION_STATUS_LABELS: Record<ReservationStatus, string> = {
  Agendado: "Agendado",
  Retirado: "Retirado",
  Devolvido: "Devolvido",
  Atrasado: "Atrasado",
  Cancelado: "Cancelado",
  Pendente: "Pendente",
};

export const MAINTENANCE_STATUS_LABELS: Record<MaintenanceStatus, string> = {
  Aberta: "Aberta",
  EmAndamento: "Em andamento",
  Concluida: "Concluída",
  Cancelada: "Cancelada",
};

export const SITUACAO_LABELS: Record<Situacao, string> = {
  Disponivel: "Disponível no estoque",
  Reservado: "Reservado",
  Alugado: "Alugado",
  "Em manutencao": "Em manutenção",
};

/** Variante visual (token semântico) para cada estado exibido em badges. */
export type ToneName = "success" | "warning" | "danger" | "info" | "neutral" | "accent";

export const SITUACAO_TONE: Record<Situacao, ToneName> = {
  Disponivel: "success",
  Reservado: "info",
  Alugado: "accent",
  "Em manutencao": "warning",
};

export const RESERVATION_TONE: Record<ReservationStatus, ToneName> = {
  Agendado: "info",
  Retirado: "accent",
  Devolvido: "success",
  Atrasado: "danger",
  Cancelado: "neutral",
  Pendente: "warning",
};

export const MAINTENANCE_TONE: Record<MaintenanceStatus, ToneName> = {
  Aberta: "warning",
  EmAndamento: "info",
  Concluida: "success",
  Cancelada: "neutral",
};

export const CONDITION_TONE: Record<EquipmentCondition, ToneName> = {
  Novo: "success",
  Bom: "success",
  Regular: "info",
  Manutencao: "warning",
  Inutilizado: "danger",
};

export const MAINTENANCE_TYPES = ["Preventiva", "Corretiva", "Calibração", "Inspeção"] as const;

/** Transições de status permitidas no fluxo de uma reserva. */
export const RESERVATION_TRANSITIONS: Record<ReservationStatus, ReservationStatus[]> = {
  Pendente: ["Agendado", "Cancelado"],
  Agendado: ["Retirado", "Cancelado"],
  Retirado: ["Devolvido", "Atrasado"],
  Atrasado: ["Devolvido", "Cancelado"],
  Devolvido: [],
  Cancelado: [],
};
