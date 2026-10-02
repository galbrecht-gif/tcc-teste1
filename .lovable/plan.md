# Plano de Implementação - Controle de Acesso e Reserva Visual

Este plano detalha a reestruturação da navegação baseada em cargos (Admin, Funcionário, Visualizador), a reordenação do menu e a implementação da funcionalidade de calendário para solicitações de reserva.

## Alterações de Acesso e Navegação

- **Restrição de Menu:** O cargo `Visualizador` terá acesso exclusivo à aba de **Reservas**.
- **Reordenação do Menu:** A nova ordem será: Empresas, Pessoas, Equipamentos, Reservas, Manutenções, Relatórios e Configurações.
- **Proteção de Rotas:** Garantir que o `Visualizador` seja redirecionado caso tente acessar rotas restritas via URL.

## Funcionalidade de Calendário de Reservas

- **Botão de Visualizador:** Adição de um botão específico na página de Reservas para abrir o calendário de solicitações.
- **Interface do Calendário:**
    - Dias disponíveis exibidos em **verde**.
    - Dias ocupados (reservas aprovadas) exibidos em **vermelho**.
- **Fluxo de Solicitação:**
    - O usuário seleciona os dias no calendário.
    - Envia uma "Solicitação de Reserva".
    - A solicitação entra com status `Pendente` (novo status no banco).
- **Aprovação Admin:**
    - Administradores visualizam solicitações pendentes.
    - Ao aprovar, o status muda para `Agendado` e os dias ficam vermelhos no calendário.

## Detalhes Técnicos

### Banco de Dados
- Adicionar o valor `'Pendente'` ao enum `public.reservation_status`.
- Adicionar campo `solicitado_por` (UUID) na tabela `reservations` para rastrear quem pediu (opcional, já que existe `person_id`, mas útil para auditoria).

### Frontend
- **AppShell:** Filtrar a array `NAV` baseada no `role` do usuário.
- **Reservas Page:** 
    - Implementar componente de calendário (usando `react-day-picker` ou similar já presente no shadcn).
    - Lógica de cores baseada na disponibilidade consultada via Supabase.
    - Switch de visualização: Lista (padrão) vs. Calendário (solicitação).

### Segurança
- Atualizar políticas de RLS para permitir que `Visualizador` insira registros em `reservations` apenas com status `Pendente`.
