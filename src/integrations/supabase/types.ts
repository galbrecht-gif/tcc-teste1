export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.15"
  }
  public: {
    Tables: {
      categories: {
        Row: {
          created_at: string
          descricao: string | null
          id: string
          nome: string
        }
        Insert: {
          created_at?: string
          descricao?: string | null
          id?: string
          nome: string
        }
        Update: {
          created_at?: string
          descricao?: string | null
          id?: string
          nome?: string
        }
        Relationships: []
      }
      companies: {
        Row: {
          ativo: boolean
          cnpj: string | null
          contato: string | null
          created_at: string
          email: string | null
          endereco: string | null
          id: string
          nome: string
          telefone: string | null
          updated_at: string
        }
        Insert: {
          ativo?: boolean
          cnpj?: string | null
          contato?: string | null
          created_at?: string
          email?: string | null
          endereco?: string | null
          id?: string
          nome: string
          telefone?: string | null
          updated_at?: string
        }
        Update: {
          ativo?: boolean
          cnpj?: string | null
          contato?: string | null
          created_at?: string
          email?: string | null
          endereco?: string | null
          id?: string
          nome?: string
          telefone?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      equipment_history: {
        Row: {
          created_at: string
          descricao: string
          equipment_id: string
          id: string
          ref_id: string | null
          tipo_evento: Database["public"]["Enums"]["history_event"]
          user_id: string | null
        }
        Insert: {
          created_at?: string
          descricao: string
          equipment_id: string
          id?: string
          ref_id?: string | null
          tipo_evento: Database["public"]["Enums"]["history_event"]
          user_id?: string | null
        }
        Update: {
          created_at?: string
          descricao?: string
          equipment_id?: string
          id?: string
          ref_id?: string | null
          tipo_evento?: Database["public"]["Enums"]["history_event"]
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "equipment_history_equipment_id_fkey"
            columns: ["equipment_id"]
            isOneToOne: false
            referencedRelation: "equipment_status"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "equipment_history_equipment_id_fkey"
            columns: ["equipment_id"]
            isOneToOne: false
            referencedRelation: "equipments"
            referencedColumns: ["id"]
          },
        ]
      }
      equipments: {
        Row: {
          ativo: boolean
          category_id: string | null
          codigo: string
          created_at: string
          data_aquisicao: string | null
          descricao: string | null
          estado_conservacao: Database["public"]["Enums"]["equipment_condition"]
          foto_url: string | null
          id: string
          marca: string | null
          modelo: string | null
          nome: string
          num_serie: string | null
          patrimonio: string | null
          quantidade: number
          updated_at: string
          valor: number
        }
        Insert: {
          ativo?: boolean
          category_id?: string | null
          codigo?: string
          created_at?: string
          data_aquisicao?: string | null
          descricao?: string | null
          estado_conservacao?: Database["public"]["Enums"]["equipment_condition"]
          foto_url?: string | null
          id?: string
          marca?: string | null
          modelo?: string | null
          nome: string
          num_serie?: string | null
          patrimonio?: string | null
          quantidade?: number
          updated_at?: string
          valor?: number
        }
        Update: {
          ativo?: boolean
          category_id?: string | null
          codigo?: string
          created_at?: string
          data_aquisicao?: string | null
          descricao?: string | null
          estado_conservacao?: Database["public"]["Enums"]["equipment_condition"]
          foto_url?: string | null
          id?: string
          marca?: string | null
          modelo?: string | null
          nome?: string
          num_serie?: string | null
          patrimonio?: string | null
          quantidade?: number
          updated_at?: string
          valor?: number
        }
        Relationships: [
          {
            foreignKeyName: "equipments_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
        ]
      }
      maintenances: {
        Row: {
          created_at: string
          created_by: string | null
          custo: number
          data_fim: string | null
          data_inicio: string
          descricao: string | null
          equipment_id: string
          fornecedor: string | null
          id: string
          status: Database["public"]["Enums"]["maintenance_status"]
          tipo: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          custo?: number
          data_fim?: string | null
          data_inicio?: string
          descricao?: string | null
          equipment_id: string
          fornecedor?: string | null
          id?: string
          status?: Database["public"]["Enums"]["maintenance_status"]
          tipo?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          custo?: number
          data_fim?: string | null
          data_inicio?: string
          descricao?: string | null
          equipment_id?: string
          fornecedor?: string | null
          id?: string
          status?: Database["public"]["Enums"]["maintenance_status"]
          tipo?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "maintenances_equipment_id_fkey"
            columns: ["equipment_id"]
            isOneToOne: false
            referencedRelation: "equipment_status"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "maintenances_equipment_id_fkey"
            columns: ["equipment_id"]
            isOneToOne: false
            referencedRelation: "equipments"
            referencedColumns: ["id"]
          },
        ]
      }
      people: {
        Row: {
          ativo: boolean
          cargo: string | null
          company_id: string | null
          created_at: string
          email: string | null
          id: string
          nome: string
          telefone: string | null
          updated_at: string
        }
        Insert: {
          ativo?: boolean
          cargo?: string | null
          company_id?: string | null
          created_at?: string
          email?: string | null
          id?: string
          nome: string
          telefone?: string | null
          updated_at?: string
        }
        Update: {
          ativo?: boolean
          cargo?: string | null
          company_id?: string | null
          created_at?: string
          email?: string | null
          id?: string
          nome?: string
          telefone?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "people_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "people_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "equipment_status"
            referencedColumns: ["company_id"]
          },
        ]
      }
      profiles: {
        Row: {
          ativo: boolean
          created_at: string
          email: string | null
          id: string
          nome: string
          telefone: string | null
          updated_at: string
        }
        Insert: {
          ativo?: boolean
          created_at?: string
          email?: string | null
          id: string
          nome?: string
          telefone?: string | null
          updated_at?: string
        }
        Update: {
          ativo?: boolean
          created_at?: string
          email?: string | null
          id?: string
          nome?: string
          telefone?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      reservations: {
        Row: {
          company_id: string | null
          created_at: string
          created_by: string | null
          data_devolucao: string
          data_retirada: string
          devolvido_em: string | null
          equipment_id: string
          id: string
          observacoes: string | null
          person_id: string | null
          quantidade: number
          status: Database["public"]["Enums"]["reservation_status"]
          updated_at: string
        }
        Insert: {
          company_id?: string | null
          created_at?: string
          created_by?: string | null
          data_devolucao: string
          data_retirada: string
          devolvido_em?: string | null
          equipment_id: string
          id?: string
          observacoes?: string | null
          person_id?: string | null
          quantidade?: number
          status?: Database["public"]["Enums"]["reservation_status"]
          updated_at?: string
        }
        Update: {
          company_id?: string | null
          created_at?: string
          created_by?: string | null
          data_devolucao?: string
          data_retirada?: string
          devolvido_em?: string | null
          equipment_id?: string
          id?: string
          observacoes?: string | null
          person_id?: string | null
          quantidade?: number
          status?: Database["public"]["Enums"]["reservation_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "reservations_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reservations_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "equipment_status"
            referencedColumns: ["company_id"]
          },
          {
            foreignKeyName: "reservations_equipment_id_fkey"
            columns: ["equipment_id"]
            isOneToOne: false
            referencedRelation: "equipment_status"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reservations_equipment_id_fkey"
            columns: ["equipment_id"]
            isOneToOne: false
            referencedRelation: "equipments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reservations_person_id_fkey"
            columns: ["person_id"]
            isOneToOne: false
            referencedRelation: "people"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      equipment_status: {
        Row: {
          ativo: boolean | null
          categoria: string | null
          category_id: string | null
          codigo: string | null
          company_id: string | null
          data_devolucao: string | null
          data_retirada: string | null
          empresa: string | null
          estado_conservacao:
            | Database["public"]["Enums"]["equipment_condition"]
            | null
          foto_url: string | null
          id: string | null
          maintenance_id: string | null
          marca: string | null
          modelo: string | null
          nome: string | null
          quantidade: number | null
          reservation_id: string | null
          reservation_status:
            | Database["public"]["Enums"]["reservation_status"]
            | null
          responsavel: string | null
          situacao: string | null
          valor: number | null
        }
        Relationships: [
          {
            foreignKeyName: "equipments_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      mark_overdue_reservations: { Args: never; Returns: number }
    }
    Enums: {
      app_role: "admin" | "funcionario" | "visualizador"
      equipment_condition:
        | "Novo"
        | "Bom"
        | "Regular"
        | "Manutencao"
        | "Inutilizado"
      history_event:
        | "Cadastro"
        | "Atualizacao"
        | "Reserva"
        | "StatusReserva"
        | "Manutencao"
        | "Observacao"
      maintenance_status: "Aberta" | "EmAndamento" | "Concluida" | "Cancelada"
      reservation_status:
        | "Agendado"
        | "Retirado"
        | "Devolvido"
        | "Atrasado"
        | "Cancelado"
        | "Pendente"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["admin", "funcionario", "visualizador"],
      equipment_condition: [
        "Novo",
        "Bom",
        "Regular",
        "Manutencao",
        "Inutilizado",
      ],
      history_event: [
        "Cadastro",
        "Atualizacao",
        "Reserva",
        "StatusReserva",
        "Manutencao",
        "Observacao",
      ],
      maintenance_status: ["Aberta", "EmAndamento", "Concluida", "Cancelada"],
      reservation_status: [
        "Agendado",
        "Retirado",
        "Devolvido",
        "Atrasado",
        "Cancelado",
        "Pendente",
      ],
    },
  },
} as const
