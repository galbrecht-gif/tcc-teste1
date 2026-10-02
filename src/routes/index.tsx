import { createFileRoute, Link } from "@tanstack/react-router";
import {
  Boxes,
  CalendarRange,
  ClipboardList,
  FileBarChart,
  MapPin,
  ShieldCheck,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Gestor de Estoque de Equipamentos | Controle e Reservas" },
      {
        name: "description",
        content:
          "Controle patrimonial completo: cadastro de equipamentos, reservas sem conflito, rastreio de localização, manutenções, histórico e relatórios em PDF e Excel.",
      },
      { property: "og:title", content: "Gestor de Estoque de Equipamentos" },
      {
        property: "og:description",
        content:
          "Sistema empresarial para controlar equipamentos, reservas, manutenções e relatórios.",
      },
    ],
  }),
  component: LandingPage,
});

const RECURSOS = [
  {
    icon: Boxes,
    titulo: "Controle de estoque",
    texto:
      "Cadastro completo com código único, patrimônio, número de série, valor, foto e estado de conservação.",
  },
  {
    icon: CalendarRange,
    titulo: "Reservas sem conflito",
    texto:
      "O próprio banco de dados bloqueia duas reservas do mesmo equipamento no mesmo período.",
  },
  {
    icon: MapPin,
    titulo: "Localização em tempo real",
    texto: "Saiba na hora onde cada item está, com quem, em qual empresa e até quando.",
  },
  {
    icon: ClipboardList,
    titulo: "Histórico auditável",
    texto: "Toda reserva, devolução, manutenção e alteração fica registrada permanentemente.",
  },
  {
    icon: FileBarChart,
    titulo: "Relatórios prontos",
    texto: "Exportação em PDF e Excel de equipamentos, reservas, atrasos e manutenções.",
  },
  {
    icon: ShieldCheck,
    titulo: "Níveis de acesso",
    texto: "Administrador, funcionário e visualizador com permissões aplicadas no servidor.",
  },
];

function LandingPage() {
  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-4">
          <div className="flex items-center gap-3">
            <span className="grid size-9 place-items-center rounded-md bg-primary text-primary-foreground">
              <Boxes className="size-5" aria-hidden />
            </span>
            <span className="font-display text-sm font-bold tracking-tight">
              GESTOR DE ESTOQUE
            </span>
          </div>
          <Button asChild>
            <Link to="/auth" search={{ modo: "login" }}>Entrar no sistema</Link>
          </Button>
        </div>
      </header>

      <main>
        <section className="mx-auto max-w-6xl px-5 py-16 sm:py-24">
          <p className="text-xs font-semibold tracking-[0.2em] text-accent-foreground uppercase">
            Gestão patrimonial · Projeto SENAI
          </p>
          <h1 className="mt-4 max-w-3xl font-display text-4xl leading-tight font-extrabold sm:text-5xl">
            Cada equipamento rastreado, cada reserva sob controle.
          </h1>
          <p className="mt-5 max-w-2xl text-lg text-muted-foreground">
            Plataforma completa de controle de estoque e agendamento de equipamentos, com
            prevenção de conflitos, histórico auditável, alertas de atraso e relatórios prontos
            para a operação real de uma empresa.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Button asChild size="lg">
              <Link to="/auth" search={{ modo: "login" }}>Acessar o painel</Link>
            </Button>
            <Button asChild size="lg" variant="outline">
              <Link to="/auth" search={{ modo: "cadastro" }}>
                Criar conta
              </Link>
            </Button>
          </div>
        </section>

        <section className="border-t border-border bg-card/40">
          <div className="mx-auto grid max-w-6xl gap-4 px-5 py-14 sm:grid-cols-2 lg:grid-cols-3">
            {RECURSOS.map(({ icon: Icon, titulo, texto }) => (
              <Card key={titulo} className="gap-3 p-5">
                <span className="grid size-10 place-items-center rounded-md bg-primary/10 text-primary">
                  <Icon className="size-5" aria-hidden />
                </span>
                <h2 className="font-display text-base font-bold">{titulo}</h2>
                <p className="text-sm text-muted-foreground">{texto}</p>
              </Card>
            ))}
          </div>
        </section>
      </main>

      <footer className="border-t border-border">
        <div className="mx-auto max-w-6xl px-5 py-6 text-xs text-muted-foreground">
          Sistema de gerenciamento de estoque de equipamentos · SENAI
        </div>
      </footer>
    </div>
  );
}
