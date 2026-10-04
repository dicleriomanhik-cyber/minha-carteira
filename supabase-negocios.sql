-- ============================================================
-- Minha Carteira — vários negócios na mesma conta (fase 1: base de dados)
-- Corre este ficheiro completo em: Supabase Dashboard → SQL Editor → New query → Run
-- Depois de correr o supabase-setup.sql e o supabase-funcionarios.sql.
-- Pode ser corrido mais de uma vez sem estragar nada.
--
-- Como funciona:
-- * Cada conta (utilizador) passa a ter 1 ou mais negócios (tabela negocios).
-- * Os dados financeiros, o código da loja, os funcionários, os PINs e as vendas dos funcionários
--   passam a pertencer a um NEGÓCIO (e não directamente ao utilizador).
-- * Migração sem mover dados: o PRIMEIRO negócio de cada conta usa o MESMO id do utilizador.
--   Assim a linha de dados_financeiros que já existe fica ligada a esse negócio sem ser tocada.
--   O nome vem do nome do negócio que o dono já tinha escrito na app (ou "O meu negócio").
-- * A app antiga continua a funcionar depois deste SQL: as funções dono_* sem negócio
--   (dono_codigo_loja(), dono_criar_funcionario(nome, pin), ...) passam a trabalhar no negócio
--   mais antigo da conta. Podem ser removidas quando a app nova estiver publicada.
-- * Funcionários: cada negócio tem o seu código da loja e os seus PINs. O mesmo PIN pode existir em
--   negócios diferentes, mas não duas vezes no mesmo negócio.
-- ============================================================

create schema if not exists extensions;
create extension if not exists pgcrypto with schema extensions;

-- 1) Tabela dos negócios -------------------------------------

create table if not exists public.negocios (
  id uuid primary key default gen_random_uuid(),
  dono_id uuid not null references auth.users(id) on delete cascade,
  nome text not null check (length(btrim(nome)) between 1 and 60),
  criado_em timestamptz not null default now()
);
create index if not exists negocios_dono_idx on public.negocios (dono_id, criado_em);

alter table public.negocios enable row level security;
revoke all on public.negocios from anon, authenticated;
grant select on public.negocios to authenticated;   -- criar, mudar o nome e apagar só pelas funções dono_*_negocio

drop policy if exists "negocios_select_own" on public.negocios;
create policy "negocios_select_own" on public.negocios
  for select to authenticated using (auth.uid() = dono_id);

-- 2) Primeiro negócio de cada conta (id do negócio = id do utilizador) ---------

insert into public.negocios (id, dono_id, nome)
select u.id, u.id,
       coalesce(
         nullif(left(btrim(case when jsonb_typeof(d.saldo_inicial -> '__negocio') = 'string'
                               then d.saldo_inicial ->> '__negocio' end), 60), ''),
         'O meu negócio')
  from auth.users u
  left join public.dados_financeiros d on d.id = u.id
on conflict (id) do nothing;

-- Quem se registar a partir de agora também recebe o primeiro negócio (id = id do utilizador).
create or replace function public._negocio_inicial()
returns trigger language plpgsql security definer
set search_path = public, extensions, pg_temp as $$
begin
  insert into public.negocios (id, dono_id, nome) values (new.id, new.id, 'O meu negócio')
  on conflict (id) do nothing;
  return new;
end $$;

drop trigger if exists on_auth_user_negocio on auth.users;
create trigger on_auth_user_negocio
  after insert on auth.users
  for each row execute function public._negocio_inicial();

-- 3) dados_financeiros passa a ser por negócio -----------------

-- Deixa de apontar para o utilizador (qualquer chave estrangeira para auth.users) e passa a apontar para o negócio.
do $$
declare r record;
begin
  for r in select conname from pg_constraint
            where conrelid = 'public.dados_financeiros'::regclass and contype = 'f'
              and confrelid = 'auth.users'::regclass
  loop
    execute format('alter table public.dados_financeiros drop constraint %I', r.conname);
  end loop;
  if not exists (select 1 from pg_constraint
                  where conrelid = 'public.dados_financeiros'::regclass and conname = 'dados_financeiros_negocio_fk') then
    alter table public.dados_financeiros
      add constraint dados_financeiros_negocio_fk foreign key (id) references public.negocios(id) on delete cascade;
  end if;
end $$;

drop policy if exists "dados_financeiros_select_own" on public.dados_financeiros;
drop policy if exists "dados_financeiros_insert_own" on public.dados_financeiros;
drop policy if exists "dados_financeiros_update_own" on public.dados_financeiros;

create policy "dados_financeiros_select_own" on public.dados_financeiros
  for select to authenticated
  using (exists (select 1 from public.negocios n where n.id = dados_financeiros.id and n.dono_id = auth.uid()));

create policy "dados_financeiros_insert_own" on public.dados_financeiros
  for insert to authenticated
  with check (exists (select 1 from public.negocios n where n.id = dados_financeiros.id and n.dono_id = auth.uid()));

create policy "dados_financeiros_update_own" on public.dados_financeiros
  for update to authenticated
  using (exists (select 1 from public.negocios n where n.id = dados_financeiros.id and n.dono_id = auth.uid()))
  with check (exists (select 1 from public.negocios n where n.id = dados_financeiros.id and n.dono_id = auth.uid()));

-- 4) Funcionários, código da loja e vendas passam a ser por negócio ----------
-- (dono_id fica nas tabelas: continua a servir de segurança e de apagar tudo se a conta for apagada)

-- lojas_acesso: uma linha (código) por negócio
alter table public.lojas_acesso add column if not exists negocio_id uuid;
update public.lojas_acesso set negocio_id = dono_id where negocio_id is null;
alter table public.lojas_acesso alter column negocio_id set not null;
do $$
begin
  if exists (select 1 from pg_constraint
              where conrelid = 'public.lojas_acesso'::regclass and contype = 'p'
                and pg_get_constraintdef(oid) like '%(dono_id)%') then
    alter table public.lojas_acesso drop constraint lojas_acesso_pkey;
    alter table public.lojas_acesso add primary key (negocio_id);
  end if;
  if not exists (select 1 from pg_constraint
                  where conrelid = 'public.lojas_acesso'::regclass and conname = 'lojas_acesso_negocio_fk') then
    alter table public.lojas_acesso
      add constraint lojas_acesso_negocio_fk foreign key (negocio_id) references public.negocios(id) on delete cascade;
  end if;
end $$;

-- funcionarios_acesso
alter table public.funcionarios_acesso add column if not exists negocio_id uuid;
update public.funcionarios_acesso set negocio_id = dono_id where negocio_id is null;
alter table public.funcionarios_acesso alter column negocio_id set not null;
do $$
begin
  if not exists (select 1 from pg_constraint
                  where conrelid = 'public.funcionarios_acesso'::regclass and conname = 'funcionarios_acesso_negocio_fk') then
    alter table public.funcionarios_acesso
      add constraint funcionarios_acesso_negocio_fk foreign key (negocio_id) references public.negocios(id) on delete cascade;
  end if;
end $$;
create index if not exists funcionarios_acesso_negocio_idx on public.funcionarios_acesso (negocio_id);

-- vendas_funcionarios (as políticas e permissões desta tabela, por dono_id, ficam como estavam)
alter table public.vendas_funcionarios add column if not exists negocio_id uuid;
update public.vendas_funcionarios set negocio_id = dono_id where negocio_id is null;
alter table public.vendas_funcionarios alter column negocio_id set not null;
do $$
begin
  if not exists (select 1 from pg_constraint
                  where conrelid = 'public.vendas_funcionarios'::regclass and conname = 'vendas_funcionarios_negocio_fk') then
    alter table public.vendas_funcionarios
      add constraint vendas_funcionarios_negocio_fk foreign key (negocio_id) references public.negocios(id) on delete cascade;
  end if;
end $$;
create index if not exists vendas_funcionarios_negocio_idx on public.vendas_funcionarios (negocio_id, importada);

-- 5) Funções internas (ninguém de fora as chama) ------------

-- Confirma que o negócio é do utilizador com sessão iniciada.
create or replace function public._negocio_do_dono(p_negocio uuid)
returns uuid language plpgsql stable security definer
set search_path = public, extensions, pg_temp as $$
begin
  if auth.uid() is null then raise exception 'sem_sessao'; end if;
  if p_negocio is null
     or not exists (select 1 from public.negocios where id = p_negocio and dono_id = auth.uid()) then
    raise exception 'negocio_invalido';
  end if;
  return p_negocio;
end $$;

-- O negócio mais antigo da conta (só para a app antiga, que não escolhe negócio).
create or replace function public._negocio_principal()
returns uuid language plpgsql stable security definer
set search_path = public, extensions, pg_temp as $$
declare v uuid;
begin
  if auth.uid() is null then raise exception 'sem_sessao'; end if;
  select id into v from public.negocios where dono_id = auth.uid() order by criado_em, id limit 1;
  if v is null then raise exception 'negocio_invalido'; end if;
  return v;
end $$;

-- Quantidade já vendida pelos funcionários e ainda não importada para o Caixa (por negócio).
drop function if exists public._pendente_produto(uuid, text);
create function public._pendente_produto(p_negocio uuid, p_produto text)
returns numeric language sql stable security definer
set search_path = public, extensions, pg_temp as $$
  select coalesce(sum(quantidade), 0)
    from public.vendas_funcionarios
   where negocio_id = p_negocio and not importada and produto_id = p_produto;
$$;

-- 6) Funções do DONO para gerir negócios ---------------------

create or replace function public.dono_criar_negocio(p_nome text)
returns uuid language plpgsql security definer
set search_path = public, extensions, pg_temp as $$
declare v_uid uuid := auth.uid(); v_nome text := btrim(coalesce(p_nome, '')); v_id uuid;
begin
  if v_uid is null then raise exception 'sem_sessao'; end if;
  if length(v_nome) < 1 or length(v_nome) > 60 then raise exception 'nome_invalido'; end if;
  if exists (select 1 from public.negocios where dono_id = v_uid and lower(nome) = lower(v_nome)) then
    raise exception 'nome_em_uso';
  end if;
  insert into public.negocios (dono_id, nome) values (v_uid, v_nome) returning id into v_id;
  return v_id;
end $$;

create or replace function public.dono_renomear_negocio(p_id uuid, p_nome text)
returns void language plpgsql security definer
set search_path = public, extensions, pg_temp as $$
declare v_nome text := btrim(coalesce(p_nome, ''));
begin
  perform public._negocio_do_dono(p_id);
  if length(v_nome) < 1 or length(v_nome) > 60 then raise exception 'nome_invalido'; end if;
  if exists (select 1 from public.negocios where dono_id = auth.uid() and id <> p_id and lower(nome) = lower(v_nome)) then
    raise exception 'nome_em_uso';
  end if;
  update public.negocios set nome = v_nome where id = p_id;
end $$;

-- Apaga o negócio e TUDO o que é dele (dados, código da loja, funcionários, vendas por importar).
-- Só com o nome escrito igual (sem distinguir maiúsculas) e nunca o último negócio da conta.
create or replace function public.dono_apagar_negocio(p_id uuid, p_nome text)
returns void language plpgsql security definer
set search_path = public, extensions, pg_temp as $$
declare v_nome text;
begin
  perform public._negocio_do_dono(p_id);
  if (select count(*) from public.negocios where dono_id = auth.uid()) <= 1 then raise exception 'ultimo_negocio'; end if;
  select nome into v_nome from public.negocios where id = p_id;
  if lower(btrim(coalesce(p_nome, ''))) is distinct from lower(v_nome) then raise exception 'nome_nao_confere'; end if;
  delete from public.negocios where id = p_id and dono_id = auth.uid();
end $$;

-- 7) Funções do DONO para os funcionários, agora por negócio -----------

create or replace function public.dono_codigo_loja(p_negocio uuid)
returns text language plpgsql security definer
set search_path = public, extensions, pg_temp as $$
declare v_uid uuid := auth.uid(); v_cod text;
begin
  perform public._negocio_do_dono(p_negocio);
  select codigo into v_cod from public.lojas_acesso where negocio_id = p_negocio;
  if v_cod is not null then return v_cod; end if;
  loop
    v_cod := public._codigo_novo();
    begin
      insert into public.lojas_acesso (negocio_id, dono_id, codigo) values (p_negocio, v_uid, v_cod);
      return v_cod;
    exception when unique_violation then
      select codigo into v_cod from public.lojas_acesso where negocio_id = p_negocio;
      if v_cod is not null then return v_cod; end if;
    end;
  end loop;
end $$;

-- Gera um código novo para este negócio. Quem tinha o código antigo deixa de poder entrar e as sessões abertas terminam.
create or replace function public.dono_novo_codigo(p_negocio uuid)
returns text language plpgsql security definer
set search_path = public, extensions, pg_temp as $$
declare v_cod text;
begin
  perform public._negocio_do_dono(p_negocio);
  perform public.dono_codigo_loja(p_negocio);
  loop
    v_cod := public._codigo_novo();
    begin
      update public.lojas_acesso
         set codigo = v_cod, tentativas_falhadas = 0, bloqueado_ate = null
       where negocio_id = p_negocio;
      exit;
    exception when unique_violation then
      null; -- código repetido por acaso: tenta outro
    end;
  end loop;
  delete from public.funcionarios_sessoes
   where funcionario_id in (select id from public.funcionarios_acesso where negocio_id = p_negocio);
  return v_cod;
end $$;

create or replace function public.dono_listar_funcionarios(p_negocio uuid)
returns table (id uuid, nome text, ativo boolean, ultimo_acesso timestamptz, criado_em timestamptz)
language plpgsql security definer
set search_path = public, extensions, pg_temp as $$
begin
  perform public._negocio_do_dono(p_negocio);
  return query
    select f.id, f.nome, f.ativo, f.ultimo_acesso, f.criado_em
      from public.funcionarios_acesso f
     where f.negocio_id = p_negocio
     order by f.criado_em;
end $$;

create or replace function public.dono_criar_funcionario(p_negocio uuid, p_nome text, p_pin text)
returns uuid language plpgsql security definer
set search_path = public, extensions, pg_temp as $$
declare v_uid uuid := auth.uid(); v_nome text := btrim(coalesce(p_nome, '')); v_id uuid;
begin
  perform public._negocio_do_dono(p_negocio);
  if length(v_nome) < 1 or length(v_nome) > 60 then raise exception 'nome_invalido'; end if;
  if p_pin is null or p_pin !~ '^[0-9]{4,6}$' then raise exception 'pin_invalido'; end if;
  if (select count(*) from public.funcionarios_acesso where negocio_id = p_negocio) >= 20 then raise exception 'limite_funcionarios'; end if;
  if exists (select 1 from public.funcionarios_acesso f where f.negocio_id = p_negocio and f.pin_hash = crypt(p_pin, f.pin_hash)) then
    raise exception 'pin_em_uso';
  end if;
  perform public.dono_codigo_loja(p_negocio);
  insert into public.funcionarios_acesso (negocio_id, dono_id, nome, pin_hash)
  values (p_negocio, v_uid, v_nome, crypt(p_pin, gen_salt('bf')))
  returning id into v_id;
  return v_id;
end $$;

-- Mesma assinatura de antes (o id do funcionário já diz de que negócio é); o PIN tem de ser único DENTRO do negócio.
create or replace function public.dono_mudar_pin(p_id uuid, p_pin text)
returns void language plpgsql security definer
set search_path = public, extensions, pg_temp as $$
declare v_uid uuid := auth.uid(); v_neg uuid;
begin
  if v_uid is null then raise exception 'sem_sessao'; end if;
  if p_pin is null or p_pin !~ '^[0-9]{4,6}$' then raise exception 'pin_invalido'; end if;
  select negocio_id into v_neg from public.funcionarios_acesso where id = p_id and dono_id = v_uid;
  if v_neg is null then raise exception 'nao_encontrado'; end if;
  if exists (select 1 from public.funcionarios_acesso f where f.negocio_id = v_neg and f.id <> p_id and f.pin_hash = crypt(p_pin, f.pin_hash)) then
    raise exception 'pin_em_uso';
  end if;
  update public.funcionarios_acesso set pin_hash = crypt(p_pin, gen_salt('bf')) where id = p_id;
  delete from public.funcionarios_sessoes where funcionario_id = p_id;
end $$;

-- Compatibilidade com a app antiga (sem escolher negócio): trabalham no negócio mais antigo da conta.
-- Podem ser apagadas quando a app nova estiver publicada.
create or replace function public.dono_codigo_loja()
returns text language sql security definer
set search_path = public, extensions, pg_temp as $$
  select public.dono_codigo_loja(public._negocio_principal());
$$;

create or replace function public.dono_novo_codigo()
returns text language sql security definer
set search_path = public, extensions, pg_temp as $$
  select public.dono_novo_codigo(public._negocio_principal());
$$;

create or replace function public.dono_listar_funcionarios()
returns table (id uuid, nome text, ativo boolean, ultimo_acesso timestamptz, criado_em timestamptz)
language sql security definer
set search_path = public, extensions, pg_temp as $$
  select * from public.dono_listar_funcionarios(public._negocio_principal());
$$;

create or replace function public.dono_criar_funcionario(p_nome text, p_pin text)
returns uuid language sql security definer
set search_path = public, extensions, pg_temp as $$
  select public.dono_criar_funcionario(public._negocio_principal(), p_nome, p_pin);
$$;

-- 8) Funções do FUNCIONÁRIO, agora por negócio ----------------

create or replace function public.func_entrar(p_codigo text, p_pin text)
returns jsonb language plpgsql security definer
set search_path = public, extensions, pg_temp as $$
declare
  v_loja public.lojas_acesso;
  v_func public.funcionarios_acesso;
  v_token text;
  v_exp timestamptz;
  v_falhas int;
begin
  if p_codigo is null or p_pin is null or p_pin !~ '^[0-9]{4,6}$' then
    return jsonb_build_object('ok', false, 'erro', 'dados_invalidos');
  end if;

  select * into v_loja from public.lojas_acesso where codigo = upper(btrim(p_codigo)) for update;
  if not found then return jsonb_build_object('ok', false, 'erro', 'dados_invalidos'); end if;

  if v_loja.bloqueado_ate is not null and v_loja.bloqueado_ate > now() then
    return jsonb_build_object('ok', false, 'erro', 'bloqueado',
      'minutos', greatest(1, ceil(extract(epoch from (v_loja.bloqueado_ate - now())) / 60)::int));
  end if;

  select f.* into v_func
    from public.funcionarios_acesso f
   where f.negocio_id = v_loja.negocio_id and f.ativo and f.pin_hash = crypt(p_pin, f.pin_hash)
   limit 1;

  if not found then
    v_falhas := v_loja.tentativas_falhadas + 1;
    if v_falhas >= 5 then
      update public.lojas_acesso set tentativas_falhadas = 0, bloqueado_ate = now() + interval '15 minutes' where negocio_id = v_loja.negocio_id;
      return jsonb_build_object('ok', false, 'erro', 'bloqueado', 'minutos', 15);
    end if;
    update public.lojas_acesso set tentativas_falhadas = v_falhas where negocio_id = v_loja.negocio_id;
    return jsonb_build_object('ok', false, 'erro', 'dados_invalidos', 'restantes', 5 - v_falhas);
  end if;

  update public.lojas_acesso set tentativas_falhadas = 0, bloqueado_ate = null where negocio_id = v_loja.negocio_id;
  delete from public.funcionarios_sessoes where funcionario_id = v_func.id and expira_em <= now();
  v_token := encode(gen_random_bytes(24), 'hex');
  v_exp := now() + interval '12 hours';
  insert into public.funcionarios_sessoes (token_hash, funcionario_id, expira_em)
  values (encode(sha256(convert_to(v_token, 'utf8')), 'hex'), v_func.id, v_exp);
  update public.funcionarios_acesso set ultimo_acesso = now() where id = v_func.id;
  return jsonb_build_object('ok', true, 'token', v_token, 'nome', v_func.nome, 'expira_em', v_exp);
end $$;

create or replace function public.func_catalogo(p_token text)
returns jsonb language plpgsql security definer
set search_path = public, extensions, pg_temp as $$
declare v public.funcionarios_acesso := public._func_sessao(p_token); r jsonb;
begin
  select coalesce(jsonb_agg(jsonb_build_object(
           'id', p ->> 'id',
           'nome', p ->> 'nome',
           'precoVenda', coalesce(nullif(p ->> 'precoVenda', '')::numeric, 0),
           'disponivel', greatest(0, coalesce(nullif(p ->> 'quantidade', '')::numeric, 0) - public._pendente_produto(v.negocio_id, p ->> 'id'))
         ) order by p ->> 'nome'), '[]'::jsonb)
    into r
    from public.dados_financeiros d
   cross join lateral jsonb_array_elements(d.produtos) p
   where d.id = v.negocio_id;
  return coalesce(r, '[]'::jsonb);
end $$;

create or replace function public.func_registar_venda(p_token text, p_produto_id text, p_quantidade int, p_metodo text, p_nota text default null)
returns jsonb language plpgsql security definer
set search_path = public, extensions, pg_temp as $$
declare
  v public.funcionarios_acesso := public._func_sessao(p_token);
  prod jsonb; preco numeric; disp numeric; v_valor numeric; v_id uuid; v_nota text;
begin
  if p_quantidade is null or p_quantidade < 1 or p_quantidade > 10000 then raise exception 'quantidade_invalida'; end if;
  if p_metodo is null or p_metodo not in ('dinheiro', 'mpesa', 'emola', 'mkesh') then raise exception 'metodo_invalido'; end if;

  perform pg_advisory_xact_lock(hashtext(v.negocio_id::text)); -- dois funcionários ao mesmo tempo não vendem o mesmo último item

  select p into prod
    from public.dados_financeiros d, jsonb_array_elements(d.produtos) p
   where d.id = v.negocio_id and p ->> 'id' = p_produto_id
   limit 1;
  if prod is null then raise exception 'produto_inexistente'; end if;

  preco := coalesce(nullif(prod ->> 'precoVenda', '')::numeric, 0);
  if preco <= 0 then raise exception 'sem_preco'; end if;

  disp := coalesce(nullif(prod ->> 'quantidade', '')::numeric, 0) - public._pendente_produto(v.negocio_id, p_produto_id);
  if p_quantidade > disp then raise exception 'sem_stock:%', greatest(0, disp); end if;

  v_valor := preco * p_quantidade;
  v_nota := nullif(left(btrim(coalesce(p_nota, '')), 120), '');

  insert into public.vendas_funcionarios
    (negocio_id, dono_id, funcionario_id, funcionario_nome, produto_id, produto_nome, quantidade, valor, metodo, nota, data_key)
  values
    (v.negocio_id, v.dono_id, v.id, v.nome, p_produto_id, prod ->> 'nome', p_quantidade, v_valor, p_metodo, v_nota,
     to_char(now() at time zone 'Africa/Maputo', 'YYYY-MM-DD'))
  returning id into v_id;

  return jsonb_build_object('ok', true, 'id', v_id, 'valor', v_valor, 'disponivel', disp - p_quantidade);
end $$;

-- 9) Quem pode chamar o quê ---------------------------------

revoke execute on function public._negocio_inicial() from public, anon, authenticated;
revoke execute on function public._negocio_do_dono(uuid) from public, anon, authenticated;
revoke execute on function public._negocio_principal() from public, anon, authenticated;
revoke execute on function public._pendente_produto(uuid, text) from public, anon, authenticated;

revoke execute on function public.dono_criar_negocio(text) from public, anon;
revoke execute on function public.dono_renomear_negocio(uuid, text) from public, anon;
revoke execute on function public.dono_apagar_negocio(uuid, text) from public, anon;
revoke execute on function public.dono_codigo_loja(uuid) from public, anon;
revoke execute on function public.dono_novo_codigo(uuid) from public, anon;
revoke execute on function public.dono_listar_funcionarios(uuid) from public, anon;
revoke execute on function public.dono_criar_funcionario(uuid, text, text) from public, anon;
revoke execute on function public.dono_codigo_loja() from public, anon;
revoke execute on function public.dono_novo_codigo() from public, anon;
revoke execute on function public.dono_listar_funcionarios() from public, anon;
revoke execute on function public.dono_criar_funcionario(text, text) from public, anon;

grant execute on function public.dono_criar_negocio(text) to authenticated;
grant execute on function public.dono_renomear_negocio(uuid, text) to authenticated;
grant execute on function public.dono_apagar_negocio(uuid, text) to authenticated;
grant execute on function public.dono_codigo_loja(uuid) to authenticated;
grant execute on function public.dono_novo_codigo(uuid) to authenticated;
grant execute on function public.dono_listar_funcionarios(uuid) to authenticated;
grant execute on function public.dono_criar_funcionario(uuid, text, text) to authenticated;
grant execute on function public.dono_codigo_loja() to authenticated;
grant execute on function public.dono_novo_codigo() to authenticated;
grant execute on function public.dono_listar_funcionarios() to authenticated;
grant execute on function public.dono_criar_funcionario(text, text) to authenticated;
