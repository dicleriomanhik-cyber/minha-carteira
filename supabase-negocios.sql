-- ============================================================
-- Minha Carteira: vários negócios na mesma conta (fase 1, só base de dados)
-- Correr no Supabase: SQL Editor > New query > colar tudo > Run.
-- Pode ser corrido várias vezes sem estragar nada.
--
-- ANTES de correr: no Perfil da app, faz um Backup (exportar uma cópia dos dados).
--
-- A app actual continua a funcionar sem nenhuma alteração depois de correr este ficheiro.
--
-- Como funciona:
-- * Cada linha de dados_financeiros passa a ser UM NEGÓCIO.
-- * O negócio que já existe (o teu) mantém o mesmo id, que é o id da conta (id = dono_id).
--   Os funcionários, os códigos da loja e as vendas dos funcionários continuam ligados a ele.
-- * Os negócios novos recebem um id aleatório, criado no servidor pela função criar_negocio.
-- ============================================================

-- 1) Novas colunas -------------------------------------------
alter table public.dados_financeiros
  add column if not exists dono_id uuid references auth.users(id) on delete cascade;
alter table public.dados_financeiros add column if not exists nome text;
alter table public.dados_financeiros add column if not exists criado_em timestamptz not null default now();

-- 2) Os negócios que já existem: o dono é a própria conta e o nome vem do dossiê, se houver
update public.dados_financeiros set dono_id = id where dono_id is null;
update public.dados_financeiros
   set nome = coalesce(nullif(btrim(saldo_inicial ->> '__negocio'), ''), 'O meu negócio')
 where nome is null or btrim(nome) = '';

alter table public.dados_financeiros alter column dono_id set not null;

-- 3) O id deixa de ser obrigatoriamente o id da conta (os negócios novos têm id próprio).
--    A ligação à conta passa a ser feita por dono_id (apagar a conta continua a apagar tudo).
alter table public.dados_financeiros drop constraint if exists dados_financeiros_id_fkey;
alter table public.dados_financeiros alter column id set default gen_random_uuid();
create index if not exists dados_financeiros_dono_idx on public.dados_financeiros (dono_id);

-- 4) Antes de gravar: completa o que falta e não deixa mudar o dono
create or replace function public._negocio_antes_de_gravar()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
begin
  if tg_op = 'INSERT' then
    if new.dono_id is null then
      new.dono_id := new.id;        -- versão antiga da app: o negócio é o da própria conta
    end if;
  else
    new.dono_id := old.dono_id;     -- o dono de um negócio nunca muda
  end if;
  if new.nome is null or btrim(new.nome) = '' then
    new.nome := 'O meu negócio';
  end if;
  return new;
end;
$$;

drop trigger if exists negocio_antes_de_gravar on public.dados_financeiros;
create trigger negocio_antes_de_gravar
  before insert or update on public.dados_financeiros
  for each row execute function public._negocio_antes_de_gravar();

-- 5) Segurança: cada pessoa só vê e grava os seus negócios.
--    Inserir directamente só é possível para o negócio principal (id = id da conta).
--    Os outros negócios criam-se pela função criar_negocio, para ninguém poder
--    ocupar um id que não é seu.
drop policy if exists "dados_financeiros_select_own" on public.dados_financeiros;
drop policy if exists "dados_financeiros_insert_own" on public.dados_financeiros;
drop policy if exists "dados_financeiros_update_own" on public.dados_financeiros;

create policy "dados_financeiros_select_own" on public.dados_financeiros
  for select using (auth.uid() = dono_id);

create policy "dados_financeiros_insert_own" on public.dados_financeiros
  for insert with check (auth.uid() = dono_id and id = auth.uid());

create policy "dados_financeiros_update_own" on public.dados_financeiros
  for update using (auth.uid() = dono_id) with check (auth.uid() = dono_id);

-- 6) Criar um negócio novo (devolve o id do negócio criado)
create or replace function public.criar_negocio(p_nome text)
returns uuid
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_uid uuid := auth.uid();
  v_nome text := btrim(coalesce(p_nome, ''));
  v_id uuid;
begin
  if v_uid is null then
    raise exception 'sem_sessao';
  end if;
  if length(v_nome) < 1 or length(v_nome) > 60 then
    raise exception 'nome_invalido';
  end if;
  if not exists (select 1 from public.dados_financeiros where id = v_uid) then
    raise exception 'sem_negocio_principal';
  end if;
  -- Limite técnico só para evitar abusos (não é um limite para quem usa a app normalmente)
  if (select count(*) from public.dados_financeiros where dono_id = v_uid) >= 50 then
    raise exception 'limite_negocios';
  end if;
  insert into public.dados_financeiros (dono_id, nome, saldo_inicial)
  values (v_uid, v_nome, jsonb_build_object('__negocio', v_nome))
  returning id into v_id;
  return v_id;
end;
$$;

revoke all on function public.criar_negocio(text) from public, anon;
grant execute on function public.criar_negocio(text) to authenticated;

-- ============================================================
-- Para confirmar que correu bem, corre estas duas verificações (uma de cada vez):
--
-- 1) Cada negócio deve ter dono_id e nome (e, nos que já existiam, dono_id = id):
--    select id, dono_id, nome from public.dados_financeiros;
--
-- 2) Só devem aparecer a chave primária e a ligação do dono_id a auth.users
--    (a ligação antiga do id já não deve aparecer):
--    select conname, pg_get_constraintdef(oid) from pg_constraint
--     where conrelid = 'public.dados_financeiros'::regclass;
-- ============================================================
