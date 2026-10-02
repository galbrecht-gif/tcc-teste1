
CREATE TYPE public.app_role AS ENUM ('admin', 'funcionario', 'visualizador');
CREATE TYPE public.equipment_condition AS ENUM ('Novo', 'Bom', 'Regular', 'Manutencao', 'Inutilizado');
CREATE TYPE public.reservation_status AS ENUM ('Agendado', 'Retirado', 'Devolvido', 'Atrasado', 'Cancelado');
CREATE TYPE public.maintenance_status AS ENUM ('Aberta', 'EmAndamento', 'Concluida', 'Cancelada');
CREATE TYPE public.history_event AS ENUM ('Cadastro', 'Atualizacao', 'Reserva', 'StatusReserva', 'Manutencao', 'Observacao');

CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  nome TEXT NOT NULL DEFAULT '',
  email TEXT,
  telefone TEXT,
  ativo BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role public.app_role)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role);
$$;

CREATE OR REPLACE FUNCTION public.can_write(_user_id UUID)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role IN ('admin','funcionario'));
$$;

CREATE POLICY "profiles_select_auth" ON public.profiles FOR SELECT TO authenticated USING (true);
CREATE POLICY "profiles_insert_self" ON public.profiles FOR INSERT TO authenticated WITH CHECK (id = auth.uid());
CREATE POLICY "profiles_update_self_or_admin" ON public.profiles FOR UPDATE TO authenticated
  USING (id = auth.uid() OR public.has_role(auth.uid(),'admin'))
  WITH CHECK (id = auth.uid() OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "user_roles_select_auth" ON public.user_roles FOR SELECT TO authenticated USING (true);

CREATE TABLE public.companies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome TEXT NOT NULL,
  cnpj TEXT UNIQUE,
  contato TEXT,
  telefone TEXT,
  email TEXT,
  endereco TEXT,
  ativo BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.companies TO authenticated;
GRANT ALL ON public.companies TO service_role;
ALTER TABLE public.companies ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER companies_updated BEFORE UPDATE ON public.companies FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE public.people (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome TEXT NOT NULL,
  cargo TEXT,
  company_id UUID REFERENCES public.companies(id) ON DELETE SET NULL,
  telefone TEXT,
  email TEXT,
  ativo BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.people TO authenticated;
GRANT ALL ON public.people TO service_role;
ALTER TABLE public.people ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER people_updated BEFORE UPDATE ON public.people FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE public.categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome TEXT NOT NULL UNIQUE,
  descricao TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.categories TO authenticated;
GRANT ALL ON public.categories TO service_role;
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;

CREATE SEQUENCE public.equipment_code_seq START 1;
GRANT USAGE, SELECT ON SEQUENCE public.equipment_code_seq TO authenticated, service_role;

CREATE TABLE public.equipments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  codigo TEXT NOT NULL UNIQUE DEFAULT ('EQ-' || lpad(nextval('public.equipment_code_seq')::text, 5, '0')),
  nome TEXT NOT NULL,
  category_id UUID REFERENCES public.categories(id) ON DELETE SET NULL,
  marca TEXT,
  modelo TEXT,
  patrimonio TEXT,
  num_serie TEXT,
  descricao TEXT,
  estado_conservacao public.equipment_condition NOT NULL DEFAULT 'Bom',
  valor NUMERIC(12,2) NOT NULL DEFAULT 0,
  data_aquisicao DATE,
  foto_url TEXT,
  quantidade INTEGER NOT NULL DEFAULT 1 CHECK (quantidade >= 0),
  ativo BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.equipments TO authenticated;
GRANT ALL ON public.equipments TO service_role;
ALTER TABLE public.equipments ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER equipments_updated BEFORE UPDATE ON public.equipments FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE INDEX equipments_nome_idx ON public.equipments (lower(nome));
CREATE INDEX equipments_category_idx ON public.equipments (category_id);

CREATE TABLE public.reservations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  equipment_id UUID NOT NULL REFERENCES public.equipments(id) ON DELETE CASCADE,
  person_id UUID REFERENCES public.people(id) ON DELETE SET NULL,
  company_id UUID REFERENCES public.companies(id) ON DELETE SET NULL,
  data_retirada DATE NOT NULL,
  data_devolucao DATE NOT NULL,
  quantidade INTEGER NOT NULL DEFAULT 1 CHECK (quantidade > 0),
  observacoes TEXT,
  status public.reservation_status NOT NULL DEFAULT 'Agendado',
  devolvido_em TIMESTAMPTZ,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK (data_devolucao >= data_retirada)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.reservations TO authenticated;
GRANT ALL ON public.reservations TO service_role;
ALTER TABLE public.reservations ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER reservations_updated BEFORE UPDATE ON public.reservations FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE INDEX reservations_equipment_idx ON public.reservations (equipment_id, data_retirada, data_devolucao);

CREATE TABLE public.maintenances (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  equipment_id UUID NOT NULL REFERENCES public.equipments(id) ON DELETE CASCADE,
  tipo TEXT NOT NULL DEFAULT 'Corretiva',
  descricao TEXT,
  custo NUMERIC(12,2) NOT NULL DEFAULT 0,
  fornecedor TEXT,
  data_inicio DATE NOT NULL DEFAULT CURRENT_DATE,
  data_fim DATE,
  status public.maintenance_status NOT NULL DEFAULT 'Aberta',
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.maintenances TO authenticated;
GRANT ALL ON public.maintenances TO service_role;
ALTER TABLE public.maintenances ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER maintenances_updated BEFORE UPDATE ON public.maintenances FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE public.equipment_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  equipment_id UUID NOT NULL REFERENCES public.equipments(id) ON DELETE CASCADE,
  tipo_evento public.history_event NOT NULL,
  descricao TEXT NOT NULL,
  ref_id UUID,
  user_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.equipment_history TO authenticated;
GRANT ALL ON public.equipment_history TO service_role;
ALTER TABLE public.equipment_history ENABLE ROW LEVEL SECURITY;
CREATE INDEX equipment_history_eq_idx ON public.equipment_history (equipment_id, created_at DESC);

CREATE POLICY "companies_select" ON public.companies FOR SELECT TO authenticated USING (true);
CREATE POLICY "companies_insert" ON public.companies FOR INSERT TO authenticated WITH CHECK (public.can_write(auth.uid()));
CREATE POLICY "companies_update" ON public.companies FOR UPDATE TO authenticated USING (public.can_write(auth.uid())) WITH CHECK (public.can_write(auth.uid()));
CREATE POLICY "companies_delete" ON public.companies FOR DELETE TO authenticated USING (public.has_role(auth.uid(),'admin'));

CREATE POLICY "people_select" ON public.people FOR SELECT TO authenticated USING (true);
CREATE POLICY "people_insert" ON public.people FOR INSERT TO authenticated WITH CHECK (public.can_write(auth.uid()));
CREATE POLICY "people_update" ON public.people FOR UPDATE TO authenticated USING (public.can_write(auth.uid())) WITH CHECK (public.can_write(auth.uid()));
CREATE POLICY "people_delete" ON public.people FOR DELETE TO authenticated USING (public.has_role(auth.uid(),'admin'));

CREATE POLICY "categories_select" ON public.categories FOR SELECT TO authenticated USING (true);
CREATE POLICY "categories_insert" ON public.categories FOR INSERT TO authenticated WITH CHECK (public.can_write(auth.uid()));
CREATE POLICY "categories_update" ON public.categories FOR UPDATE TO authenticated USING (public.can_write(auth.uid())) WITH CHECK (public.can_write(auth.uid()));
CREATE POLICY "categories_delete" ON public.categories FOR DELETE TO authenticated USING (public.has_role(auth.uid(),'admin'));

CREATE POLICY "equipments_select" ON public.equipments FOR SELECT TO authenticated USING (true);
CREATE POLICY "equipments_insert" ON public.equipments FOR INSERT TO authenticated WITH CHECK (public.can_write(auth.uid()));
CREATE POLICY "equipments_update" ON public.equipments FOR UPDATE TO authenticated USING (public.can_write(auth.uid())) WITH CHECK (public.can_write(auth.uid()));
CREATE POLICY "equipments_delete" ON public.equipments FOR DELETE TO authenticated USING (public.has_role(auth.uid(),'admin'));

CREATE POLICY "reservations_select" ON public.reservations FOR SELECT TO authenticated USING (true);
CREATE POLICY "reservations_insert" ON public.reservations FOR INSERT TO authenticated WITH CHECK (public.can_write(auth.uid()));
CREATE POLICY "reservations_update" ON public.reservations FOR UPDATE TO authenticated USING (public.can_write(auth.uid())) WITH CHECK (public.can_write(auth.uid()));
CREATE POLICY "reservations_delete" ON public.reservations FOR DELETE TO authenticated USING (public.has_role(auth.uid(),'admin'));

CREATE POLICY "maintenances_select" ON public.maintenances FOR SELECT TO authenticated USING (true);
CREATE POLICY "maintenances_insert" ON public.maintenances FOR INSERT TO authenticated WITH CHECK (public.can_write(auth.uid()));
CREATE POLICY "maintenances_update" ON public.maintenances FOR UPDATE TO authenticated USING (public.can_write(auth.uid())) WITH CHECK (public.can_write(auth.uid()));
CREATE POLICY "maintenances_delete" ON public.maintenances FOR DELETE TO authenticated USING (public.has_role(auth.uid(),'admin'));

CREATE POLICY "history_select" ON public.equipment_history FOR SELECT TO authenticated USING (true);
CREATE POLICY "history_insert" ON public.equipment_history FOR INSERT TO authenticated WITH CHECK (public.can_write(auth.uid()));

CREATE OR REPLACE FUNCTION public.check_reservation_conflict()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
DECLARE
  total INTEGER;
  reservado INTEGER;
BEGIN
  IF NEW.status IN ('Cancelado','Devolvido') THEN RETURN NEW; END IF;

  SELECT quantidade INTO total FROM public.equipments WHERE id = NEW.equipment_id;
  IF total IS NULL THEN RAISE EXCEPTION 'Equipamento nao encontrado'; END IF;

  SELECT COALESCE(SUM(quantidade),0) INTO reservado
  FROM public.reservations
  WHERE equipment_id = NEW.equipment_id
    AND id <> NEW.id
    AND status IN ('Agendado','Retirado','Atrasado')
    AND daterange(data_retirada, data_devolucao, '[]') && daterange(NEW.data_retirada, NEW.data_devolucao, '[]');

  IF reservado + NEW.quantidade > total THEN
    RAISE EXCEPTION 'Conflito de reserva: apenas % unidade(s) disponivel(is) neste periodo (total %, ja reservado %)', total - reservado, total, reservado;
  END IF;

  RETURN NEW;
END; $$;

CREATE TRIGGER reservations_conflict
BEFORE INSERT OR UPDATE OF equipment_id, data_retirada, data_devolucao, quantidade, status
ON public.reservations FOR EACH ROW EXECUTE FUNCTION public.check_reservation_conflict();

CREATE OR REPLACE FUNCTION public.log_equipment_change()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.equipment_history (equipment_id, tipo_evento, descricao, ref_id, user_id)
    VALUES (NEW.id, 'Cadastro', 'Equipamento cadastrado: ' || NEW.nome || ' (' || NEW.codigo || ')', NEW.id, auth.uid());
  ELSE
    IF NEW.estado_conservacao IS DISTINCT FROM OLD.estado_conservacao THEN
      INSERT INTO public.equipment_history (equipment_id, tipo_evento, descricao, ref_id, user_id)
      VALUES (NEW.id, 'Atualizacao', 'Estado de conservacao alterado de ' || OLD.estado_conservacao || ' para ' || NEW.estado_conservacao, NEW.id, auth.uid());
    END IF;
    IF NEW.quantidade IS DISTINCT FROM OLD.quantidade THEN
      INSERT INTO public.equipment_history (equipment_id, tipo_evento, descricao, ref_id, user_id)
      VALUES (NEW.id, 'Atualizacao', 'Quantidade alterada de ' || OLD.quantidade || ' para ' || NEW.quantidade, NEW.id, auth.uid());
    END IF;
  END IF;
  RETURN NEW;
END; $$;
CREATE TRIGGER equipments_history AFTER INSERT OR UPDATE ON public.equipments FOR EACH ROW EXECUTE FUNCTION public.log_equipment_change();

CREATE OR REPLACE FUNCTION public.log_reservation_change()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  alvo TEXT;
  nome_empresa TEXT;
  nome_pessoa TEXT;
BEGIN
  SELECT nome INTO nome_empresa FROM public.companies WHERE id = NEW.company_id;
  SELECT nome INTO nome_pessoa FROM public.people WHERE id = NEW.person_id;
  alvo := COALESCE(nome_pessoa, '') || CASE WHEN nome_empresa IS NOT NULL THEN ' / ' || nome_empresa ELSE '' END;
  IF btrim(alvo) = '' THEN alvo := 'nao informado'; END IF;

  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.equipment_history (equipment_id, tipo_evento, descricao, ref_id, user_id)
    VALUES (NEW.equipment_id, 'Reserva',
      'Reserva criada para ' || alvo || ' de ' || to_char(NEW.data_retirada,'DD/MM/YYYY') || ' ate ' || to_char(NEW.data_devolucao,'DD/MM/YYYY'),
      NEW.id, auth.uid());
  ELSIF NEW.status IS DISTINCT FROM OLD.status THEN
    INSERT INTO public.equipment_history (equipment_id, tipo_evento, descricao, ref_id, user_id)
    VALUES (NEW.equipment_id, 'StatusReserva',
      'Status da reserva alterado de ' || OLD.status || ' para ' || NEW.status || ' (' || alvo || ')',
      NEW.id, auth.uid());
  END IF;
  RETURN NEW;
END; $$;
CREATE TRIGGER reservations_history AFTER INSERT OR UPDATE ON public.reservations FOR EACH ROW EXECUTE FUNCTION public.log_reservation_change();

CREATE OR REPLACE FUNCTION public.log_maintenance_change()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.equipment_history (equipment_id, tipo_evento, descricao, ref_id, user_id)
    VALUES (NEW.equipment_id, 'Manutencao', 'Manutencao ' || NEW.tipo || ' aberta: ' || COALESCE(NEW.descricao,''), NEW.id, auth.uid());
  ELSIF NEW.status IS DISTINCT FROM OLD.status THEN
    INSERT INTO public.equipment_history (equipment_id, tipo_evento, descricao, ref_id, user_id)
    VALUES (NEW.equipment_id, 'Manutencao', 'Manutencao alterada de ' || OLD.status || ' para ' || NEW.status, NEW.id, auth.uid());
  END IF;
  RETURN NEW;
END; $$;
CREATE TRIGGER maintenances_history AFTER INSERT OR UPDATE ON public.maintenances FOR EACH ROW EXECUTE FUNCTION public.log_maintenance_change();

CREATE OR REPLACE FUNCTION public.mark_overdue_reservations()
RETURNS INTEGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE n INTEGER;
BEGIN
  UPDATE public.reservations
  SET status = 'Atrasado'
  WHERE status IN ('Agendado','Retirado') AND data_devolucao < CURRENT_DATE;
  GET DIAGNOSTICS n = ROW_COUNT;
  RETURN n;
END; $$;
GRANT EXECUTE ON FUNCTION public.mark_overdue_reservations() TO authenticated, service_role;

CREATE VIEW public.equipment_status
WITH (security_invoker = true) AS
SELECT
  e.id,
  e.codigo,
  e.nome,
  e.marca,
  e.modelo,
  e.foto_url,
  e.valor,
  e.quantidade,
  e.estado_conservacao,
  e.ativo,
  c.nome AS categoria,
  e.category_id,
  m.id AS maintenance_id,
  r.id AS reservation_id,
  r.status AS reservation_status,
  r.data_retirada,
  r.data_devolucao,
  co.nome AS empresa,
  co.id AS company_id,
  pe.nome AS responsavel,
  CASE
    WHEN m.id IS NOT NULL OR e.estado_conservacao = 'Manutencao' THEN 'Em manutencao'
    WHEN r.status IN ('Retirado','Atrasado') THEN 'Alugado'
    WHEN r.status = 'Agendado' THEN 'Reservado'
    ELSE 'Disponivel'
  END AS situacao
FROM public.equipments e
LEFT JOIN public.categories c ON c.id = e.category_id
LEFT JOIN LATERAL (
  SELECT mm.id FROM public.maintenances mm
  WHERE mm.equipment_id = e.id AND mm.status IN ('Aberta','EmAndamento')
  ORDER BY mm.data_inicio DESC LIMIT 1
) m ON true
LEFT JOIN LATERAL (
  SELECT rr.* FROM public.reservations rr
  WHERE rr.equipment_id = e.id
    AND rr.status IN ('Agendado','Retirado','Atrasado')
    AND rr.data_devolucao >= CURRENT_DATE
  ORDER BY CASE rr.status WHEN 'Atrasado' THEN 0 WHEN 'Retirado' THEN 1 ELSE 2 END, rr.data_retirada
  LIMIT 1
) r ON true
LEFT JOIN public.companies co ON co.id = r.company_id
LEFT JOIN public.people pe ON pe.id = r.person_id;

GRANT SELECT ON public.equipment_status TO authenticated, service_role;

INSERT INTO public.categories (nome, descricao) VALUES
  ('Mobiliario', 'Mesas, cadeiras, armarios e afins'),
  ('Informatica', 'Notebooks, desktops, monitores e perifericos'),
  ('Ferramentas', 'Ferramentas manuais e eletricas'),
  ('Audiovisual', 'Projetores, cameras, som e video'),
  ('Medicao', 'Instrumentos de medicao e ensaio'),
  ('Seguranca', 'EPIs e equipamentos de seguranca'),
  ('Eletrica', 'Equipamentos e componentes eletricos'),
  ('Outros', 'Itens diversos');
