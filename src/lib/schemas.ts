import { z } from "zod";
import { isValidCNPJ } from "./format";

/** Schemas de validação compartilhados entre formulários e persistência. */

const optionalText = z
  .string()
  .trim()
  .optional()
  .transform((v) => (v && v.length > 0 ? v : null));

const optionalEmail = z
  .string()
  .trim()
  .optional()
  .refine((v) => !v || z.string().email().safeParse(v).success, "E-mail inválido")
  .transform((v) => (v && v.length > 0 ? v : null));

export const companySchema = z.object({
  nome: z.string().trim().min(2, "Informe o nome da empresa").max(120),
  cnpj: z
    .string()
    .trim()
    .optional()
    .refine((v) => !v || isValidCNPJ(v), "CNPJ inválido")
    .transform((v) => (v && v.length > 0 ? v.replace(/\D/g, "") : null)),
  contato: optionalText,
  telefone: optionalText,
  email: optionalEmail,
  endereco: optionalText,
});
export type CompanyInput = z.input<typeof companySchema>;
export type CompanyValues = z.output<typeof companySchema>;

export const personSchema = z.object({
  nome: z.string().trim().min(2, "Informe o nome da pessoa").max(120),
  cargo: optionalText,
  company_id: z
    .string()
    .optional()
    .transform((v) => (v && v !== "none" ? v : null)),
  telefone: optionalText,
  email: optionalEmail,
});
export type PersonInput = z.input<typeof personSchema>;

export const categorySchema = z.object({
  nome: z.string().trim().min(2, "Informe o nome da categoria").max(60),
  descricao: optionalText,
});
export type CategoryInput = z.input<typeof categorySchema>;

export const equipmentSchema = z.object({
  nome: z.string().trim().min(2, "Informe o nome do equipamento").max(120),
  category_id: z
    .string()
    .optional()
    .transform((v) => (v && v !== "none" ? v : null)),
  marca: optionalText,
  modelo: optionalText,
  patrimonio: optionalText,
  num_serie: optionalText,
  descricao: optionalText,
  estado_conservacao: z.enum(["Novo", "Bom", "Regular", "Manutencao", "Inutilizado"]),
  valor: z.coerce.number().min(0, "Valor não pode ser negativo").default(0),
  data_aquisicao: z
    .string()
    .optional()
    .transform((v) => (v && v.length > 0 ? v : null)),
  quantidade: z.coerce.number().int().min(0, "Quantidade inválida").default(1),
  foto_url: z.string().optional().nullable(),
});
export type EquipmentInput = z.input<typeof equipmentSchema>;

export const reservationSchema = z
  .object({
    equipment_id: z.string().uuid("Selecione o equipamento"),
    person_id: z.string().uuid("Selecione o responsável"),
    company_id: z
      .string()
      .optional()
      .transform((v) => (v && v !== "none" ? v : null)),
    data_retirada: z.string().min(1, "Informe a data de retirada"),
    data_devolucao: z.string().min(1, "Informe a data de devolução"),
    quantidade: z.coerce.number().int().min(1, "Mínimo 1 unidade").default(1),
    observacoes: optionalText,
  })
  .refine((v) => v.data_devolucao >= v.data_retirada, {
    message: "A devolução deve ser igual ou posterior à retirada",
    path: ["data_devolucao"],
  });
export type ReservationInput = z.input<typeof reservationSchema>;

export const maintenanceSchema = z
  .object({
    equipment_id: z.string().uuid("Selecione o equipamento"),
    tipo: z.string().min(2, "Informe o tipo"),
    descricao: optionalText,
    custo: z.coerce.number().min(0, "Custo inválido").default(0),
    fornecedor: optionalText,
    data_inicio: z.string().min(1, "Informe a data de início"),
    data_fim: z
      .string()
      .optional()
      .transform((v) => (v && v.length > 0 ? v : null)),
    status: z.enum(["Aberta", "EmAndamento", "Concluida", "Cancelada"]),
  })
  .refine((v) => !v.data_fim || v.data_fim >= v.data_inicio, {
    message: "A data final deve ser posterior ao início",
    path: ["data_fim"],
  });
export type MaintenanceInput = z.input<typeof maintenanceSchema>;

export const signInSchema = z.object({
  email: z.string().trim().email("E-mail inválido"),
  password: z.string().min(6, "A senha deve ter ao menos 6 caracteres"),
});

export const signUpSchema = signInSchema.extend({
  nome: z.string().trim().min(3, "Informe seu nome completo"),
});

export const profileSchema = z.object({
  nome: z.string().trim().min(3, "Informe seu nome"),
  telefone: optionalText,
});
