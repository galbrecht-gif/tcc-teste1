import { useEffect, useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { Boxes, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable/index";

import { signInSchema, signUpSchema } from "@/lib/schemas";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ensureAccount } from "@/lib/account.functions";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Entrar | Gestor de Estoque de Equipamentos" },
      {
        name: "description",
        content:
          "Acesse o sistema de gestão de estoque para controlar equipamentos, reservas e manutenções.",
      },
      { property: "og:title", content: "Entrar no Gestor de Estoque" },
      {
        property: "og:description",
        content: "Área de acesso ao sistema de controle de equipamentos.",
      },
      { name: "robots", content: "noindex" },
    ],
  }),
  validateSearch: (search: Record<string, unknown>) => ({
    modo: search.modo === "cadastro" ? ("cadastro" as const) : ("login" as const),
  }),
  component: AuthPage,
});

type SignIn = z.infer<typeof signInSchema>;
type SignUp = z.infer<typeof signUpSchema>;

function AuthPage() {
  const navigate = useNavigate();
  const { modo } = Route.useSearch();
  const [aba, setAba] = useState<"login" | "cadastro">(modo);
  const [carregandoGoogle, setCarregandoGoogle] = useState(false);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log("Evento Auth:", event, "Sessão:", session); // <--- Adiciona esta linha para ver no F12
      if (session) {
        try {
          await ensureAccount({ data: {} });
        } catch (e) {
          console.error("Erro no ensureAccount:", e);
        }
        void navigate({ to: "/dashboard" });
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  const loginForm = useForm<SignIn>({
    resolver: zodResolver(signInSchema),
    defaultValues: { email: "", password: "" },
  });
  const cadastroForm = useForm<SignUp>({
    resolver: zodResolver(signUpSchema),
    defaultValues: { nome: "", email: "", password: "" },
  });
  async function entrar(values: SignIn) {
    const { error } = await supabase.auth.signInWithPassword(values);
    if (error) {
      toast.error(
        error.message.includes("Invalid login")
          ? "E-mail ou senha incorretos."
          : "Não foi possível entrar. Tente novamente.",
      );
      return;
    }
    await ensureAccount({ data: {} }).catch(() => undefined);
    toast.success("Bem-vindo de volta!");
    void navigate({ to: "/dashboard" });
  }

  async function cadastrar(values: SignUp) {
    const { error } = await supabase.auth.signUp({
      email: values.email,
      password: values.password,
      options: {
        emailRedirectTo: `${window.location.origin}/dashboard`,
        data: { nome: values.nome },
      },
    });

    if (error) {
      toast.error(
        error.message.includes("already registered")
          ? "Este e-mail já possui cadastro."
          : "Não foi possível criar a conta. Tente novamente.",
      );
      return;
    }

    const { data: sessionData } = await supabase.auth.getSession();
    if (sessionData.session) {
      await ensureAccount({ data: { nome: values.nome } }).catch(() => undefined);
      toast.success("Conta criada com sucesso!");
      void navigate({ to: "/dashboard" });
    } else {
      toast.success("Conta criada. Confirme seu e-mail para acessar o sistema.");
      setAba("login");
    }
  }

  async function entrarComGoogle() {
    setCarregandoGoogle(true);
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: `${window.location.origin}/auth`,
        },
      });
      if (error) throw error;
    } catch (error) {
      toast.error("Não foi possível entrar com o Google.");
    } finally {
      setCarregandoGoogle(false);
    }
  }

  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      <aside className="hidden flex-col justify-between bg-sidebar p-10 lg:flex">
        <div className="flex items-center gap-3">
          <span className="grid size-10 place-items-center rounded-md bg-sidebar-primary text-sidebar-primary-foreground">
            <Boxes className="size-5" aria-hidden />
          </span>
          <span className="font-display text-sm font-bold text-sidebar-foreground">
            GESTOR DE ESTOQUE
          </span>
        </div>
        <div className="max-w-md">
          <h2 className="font-display text-3xl font-bold text-sidebar-foreground">
            Controle total do patrimônio da sua operação.
          </h2>
          <p className="mt-4 text-sm text-sidebar-foreground/70">
            Equipamentos, reservas, manutenções e histórico em um único painel — com bloqueio
            automático de conflitos e alertas de atraso.
          </p>
        </div>
        <p className="text-xs text-sidebar-foreground/50">SENAI · Gestão patrimonial</p>
      </aside>

      <main className="flex items-center justify-center px-5 py-12">
        <Card className="w-full max-w-md p-6 sm:p-8">
          <div className="mb-6">
            <h1 className="font-display text-2xl font-bold">Acesso ao sistema</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Entre com sua conta corporativa para continuar.
            </p>
          </div>

          <Tabs value={aba} onValueChange={(v) => setAba(v as "login" | "cadastro")}>
            <TabsList className="w-full">
              <TabsTrigger value="login" className="flex-1">
                Entrar
              </TabsTrigger>
              <TabsTrigger value="cadastro" className="flex-1">
                Criar conta
              </TabsTrigger>
            </TabsList>

            <TabsContent value="login" className="mt-5">
              <form onSubmit={loginForm.handleSubmit(entrar)} className="space-y-4" noValidate>
                <div className="space-y-1.5">
                  <Label htmlFor="login-email">E-mail</Label>
                  <Input
                    id="login-email"
                    type="email"
                    autoComplete="email"
                    {...loginForm.register("email")}
                  />
                  {loginForm.formState.errors.email && (
                    <p className="text-xs text-destructive">
                      {loginForm.formState.errors.email.message}
                    </p>
                  )}
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="login-senha">Senha</Label>
                  <Input
                    id="login-senha"
                    type="password"
                    autoComplete="current-password"
                    {...loginForm.register("password")}
                  />
                  {loginForm.formState.errors.password && (
                    <p className="text-xs text-destructive">
                      {loginForm.formState.errors.password.message}
                    </p>
                  )}
                </div>
                <Button type="submit" className="w-full" disabled={loginForm.formState.isSubmitting}>
                  {loginForm.formState.isSubmitting && (
                    <Loader2 className="mr-2 size-4 animate-spin" />
                  )}
                  Entrar
                </Button>
              </form>
            </TabsContent>

            <TabsContent value="cadastro" className="mt-5">
              <form
                onSubmit={cadastroForm.handleSubmit(cadastrar)}
                className="space-y-4"
                noValidate
              >
                <div className="space-y-1.5">
                  <Label htmlFor="cad-nome">Nome completo</Label>
                  <Input id="cad-nome" autoComplete="name" {...cadastroForm.register("nome")} />
                  {cadastroForm.formState.errors.nome && (
                    <p className="text-xs text-destructive">
                      {cadastroForm.formState.errors.nome.message}
                    </p>
                  )}
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="cad-email">E-mail</Label>
                  <Input
                    id="cad-email"
                    type="email"
                    autoComplete="email"
                    {...cadastroForm.register("email")}
                  />
                  {cadastroForm.formState.errors.email && (
                    <p className="text-xs text-destructive">
                      {cadastroForm.formState.errors.email.message}
                    </p>
                  )}
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="cad-senha">Senha</Label>
                  <Input
                    id="cad-senha"
                    type="password"
                    autoComplete="new-password"
                    {...cadastroForm.register("password")}
                  />
                  {cadastroForm.formState.errors.password && (
                    <p className="text-xs text-destructive">
                      {cadastroForm.formState.errors.password.message}
                    </p>
                  )}
                </div>
                <Button
                  type="submit"
                  className="w-full"
                  disabled={cadastroForm.formState.isSubmitting}
                >
                  {cadastroForm.formState.isSubmitting && (
                    <Loader2 className="mr-2 size-4 animate-spin" />
                  )}
                  Criar conta
                </Button>
                <p className="text-xs text-muted-foreground">
                  O primeiro usuário cadastrado recebe acesso de administrador. Os demais entram
                  como visualizadores até que um administrador altere o nível de acesso.
                </p>
              </form>
            </TabsContent>
          </Tabs>

          <div className="my-5 flex items-center gap-3">
            <span className="h-px flex-1 bg-border" />
            <span className="text-xs text-muted-foreground">ou</span>
            <span className="h-px flex-1 bg-border" />
          </div>

          <Button
            variant="outline"
            className="w-full"
            onClick={() => void entrarComGoogle()}
            disabled={carregandoGoogle}
          >
            {carregandoGoogle && <Loader2 className="mr-2 size-4 animate-spin" />}
            Continuar com Google
          </Button>
        </Card>
      </main>
    </div>
  );
}

