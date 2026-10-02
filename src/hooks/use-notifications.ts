import { useMemo } from "react";
import { useReservations } from "@/hooks/use-data";
import { daysFromToday, todayISO } from "@/lib/format";
import type { ReservationRow } from "@/hooks/use-data";

export type Notification = {
  id: string;
  tone: "danger" | "warning" | "info";
  title: string;
  detail: string;
};

/**
 * Notificações operacionais derivadas das reservas:
 * atrasos, devoluções próximas (até 2 dias) e movimentações do dia.
 */
export function useNotifications() {
  const { data: reservations = [], isLoading } = useReservations();

  return useMemo(() => {
    const hoje = todayISO();
    const items: Notification[] = [];

    const descreve = (r: ReservationRow) =>
      `${r.equipments?.codigo ?? ""} ${r.equipments?.nome ?? "Equipamento"} — ${
        r.people?.nome ?? "responsável não informado"
      }`;

    const atrasadas = reservations.filter(
      (r) => r.status === "Atrasado" || (r.status === "Retirado" && r.data_devolucao < hoje),
    );
    const proximas = reservations.filter(
      (r) =>
        (r.status === "Retirado" || r.status === "Agendado") &&
        r.data_devolucao >= hoje &&
        daysFromToday(r.data_devolucao) <= 2,
    );
    const retiradasHoje = reservations.filter(
      (r) => r.status === "Agendado" && r.data_retirada === hoje,
    );
    const devolucoesHoje = reservations.filter(
      (r) => r.status !== "Devolvido" && r.status !== "Cancelado" && r.data_devolucao === hoje,
    );

    atrasadas.forEach((r) =>
      items.push({
        id: `atraso-${r.id}`,
        tone: "danger",
        title: "Devolução atrasada",
        detail: `${descreve(r)} — venceu em ${r.data_devolucao.split("-").reverse().join("/")}`,
      }),
    );
    proximas.forEach((r) =>
      items.push({
        id: `proximo-${r.id}`,
        tone: "warning",
        title: "Devolução próxima",
        detail: `${descreve(r)} — devolver em ${daysFromToday(r.data_devolucao)} dia(s)`,
      }),
    );
    retiradasHoje.forEach((r) =>
      items.push({
        id: `retirada-${r.id}`,
        tone: "info",
        title: "Retirada agendada para hoje",
        detail: descreve(r),
      }),
    );

    return {
      isLoading,
      notifications: items,
      atrasadas,
      proximas,
      retiradasHoje,
      devolucoesHoje,
    };
  }, [reservations, isLoading]);
}
