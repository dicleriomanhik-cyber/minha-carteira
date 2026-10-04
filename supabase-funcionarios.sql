-- ============================================================
-- Minha Carteira — funcionários com acesso limitado por PIN (fase 1: base de dados)
-- Corre este ficheiro completo em: Supabase Dashboard → SQL Editor → New query → Run
-- Depois de correr o supabase-setup.sql. Pode ser corrido mais de uma vez sem estragar nada.
--
-- Como funciona:
-- * O dono tem um "código da loja" (6 caracteres). O funcionário entra com esse código + o seu PIN (4 a 6 dígitos).
-- * O funcionário NÃO tem conta no Supabase e NÃO lê nenhuma tabela. Só chama as funções func_* abaixo,
--   que lhe devolvem apenas o catálogo (nome, preço de venda, disponível) e deixam registar vendas.
-- * As vendas do funcionário ficam numa tabela à parte (vendas_funcionarios). A app do dono importa-as para
--   o Caixa. Assim a app do dono nunca apaga nem é apagada por uma venda do funcionário (os dados do dono
--   são um único bloco JSON gravado por inteiro).
-- * PINs guardados só como hash (bcrypt). 5 PINs errados bloqueiam a loja 15 minutos.
-- ============================================================

create schema if not exists extensions;
create extension if not exists pgcrypto with schema extensions;

-- 1) Tabelas -------------------------------------------------

create table if not exists public.lojas_acesso (
  dono_id uuid primary key references auth.users(id) on delete cascade,
  codigo text not null unique,
  tentativas_falhadas int not null default 0,
  bloqueado_ate timestamptz,
  criado_em timestamptz not null default now()
);

create table if not exists public.funcionarios_acesso (
  id uuid primary key default gen_random_uuid(),
  dono_id uuid not null references auth.users(id) on delete cascade,
  nome text not null,
  pin_hash text not null,
  ativo boolean not null default true,
  ultimo_acesso timestamptz,
  criado_em timestamptz not null default now()
);
create index if not exists funcionarios_acesso_dono_idx on public.funcionarios_acesso (dono_id);

create table if not exists public.funcionarios_sessoes (
  token_hash text primary key,
  funcionario_id uuid not null references public.funcionarios_acesso(id) on delete cascade,
  expira_em timestamptz not null,
  criado_em timestamptz not null default now()
);
create index if not exists funcionarios_sessoes_func_idx on public.funcionarios_sessoes (funcionario_id);

create table if not exists public.vendas_funcionarios (
  id uuid primary key default gen_random_uuid(),
  dono_id uuid not null references auth.users(id) on delete cascade,
  funcionario_id uuid references public.funcionarios_acesso(id) on delete set null,
  funcionario_nome text not null,
  produto_id text not null,
  produto_nome text not null,
  quantidade int not null check (quantidade > 0),
  valor numeric not null check (valor >= 0),
  metodo text not null check (metodo in ('dinheiro', 'mpesa', 'emola', 'mkesh')),
  nota text,
  data_key text not null,
  criado_em timestamptz not null default now(),
  importada boolean not null default false,
  importada_em timestamptz
);
create index if not exists vendas_funcionarios_dono_idx on public.vendas_funcionarios (dono_id, importada);

-- 2) Segurança das tabelas ----------------------------------
-- Ninguém de fora lê estas tabelas directamente. Só o dono lê e marca como importadas as vendas dele.

alter table public.lojas_acesso enable row level security;
alter table public.funcionarios_acesso enable row level security;
alter table public.funcionarios_sessoes enable row level security;
alter table public.vendas_funcionarios enable row level security;

revoke all on public.lojas_acesso from anon, authenticated;
revoke all on public.funcionarios_acesso from anon, authenticated;
revoke all on public.funcionarios_sessoes from anon, authenticated;
revoke all on public.vendas_funcionarios from anon, authenticated;

grant select, update on public.vendas_funcionarios to authenticated;

drop policy if exists "vendas_func_select_dono" on public.vendas_funcionarios;
create policy "vendas_func_select_dono" on public.vendas_funcionarios
  for select to authenticated using (auth.uid() = dono_id);

drop policy if exists "vendas_func_update_dono" on public.vendas_funcionarios;
create policy "vendas_func_update_dono" on public.vendas_funcionarios
  for update to authenticated using (auth.uid() = dono_id) with check (auth.uid() = dono_id);

-- 3) Funções internas (ninguém de fora as chama) ------------

create or replace function public._codigo_novo()
returns text language plpgsql volatile
set search_path = public, extensions as $$
declare
  alfabeto constant text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; -- 32 caracteres, sem I, O, 0, 1
  r text := '';
  i int;
begin
  for i in 1..6 loop
    r := r || substr(alfabeto, (get_byte(gen_random_bytes(1), 0) % 32) + 1, 1);
  end loop;
  return r;
end $$;

create or replace function public._func_sessao(p_token text)
returns public.funcionarios_acesso
language plpgsql security definer
set search_path = public, extensions as $$
declare v public.funcionarios_acesso;
begin
  if p_token is null or length(p_token) < 20 then raise exception 'sessao_invalida'; end if;
  select f.* into v
    from public.funcionarios_sessoes s
    join public.funcionarios_acesso f on f.id = s.funcionario_id
   where s.token_hash = encode(sha256(convert_to(p_token, 'utf8')), 'hex')
     and s.expira_em > now()
     and f.ativo;
  if not found then raise exception 'sessao_invalida'; end if;
  return v;
end $$;

-- Quantidade já vendida pelos funcionários e ainda não importada para o Caixa do dono (para o stock mostrado ser certo).
create or replace function public._pendente_produto(p_dono uuid, p_produto text)
returns numeric language sql stable security definer
set search_path = public, extensions as $$
  select coalesce(sum(quantidade), 0)
    from public.vendas_funcionarios
   where dono_id = p_dono and not importada and produto_id = p_produto;
$$;

-- 4) Funções do DONO (precisa de ter sessão iniciada) -------

create or replace function public.dono_codigo_loja()
returns text language plpgsql security definer
set search_path = public, extensions as $$
declare v_uid uuid := auth.uid(); v_cod text;
begin
  if v_uid is null then raise exception 'sem_sessao'; end if;
  select codigo into v_cod from public.lojas_acesso where dono_id = v_uid;
  if v_cod is not null then return v_cod; end if;
  loop
    v_cod := public._codigo_novo();
    begin
      insert into public.lojas_acesso (dono_id, codigo) values (v_uid, v_cod);
      return v_cod;
    exception when unique_violation then
      select codigo into v_cod from public.lojas_acesso where dono_id = v_uid;
      if v_cod is not null then return v_cod; end if;
    end;
  end loop;
end $$;

-- Gera um código novo. Quem tinha o código antigo deixa de poder entrar e as sessões abertas terminam.
create or replace function public.dono_novo_codigo()
returns text language plpgsql security definer
set search_path = public, extensions as $$
declare v_uid uuid := auth.uid(); v_cod text;
begin
  if v_uid is null then raise exception 'sem_sessao'; end if;
  perform public.dono_codigo_loja();
  loop
    v_cod := public._codigo_novo();
    begin
      update public.lojas_acesso
         set codigo = v_cod, tentativas_falhadas = 0, bloqueado_ate = null
       where dono_id = v_uid;
      exit;
    exception when unique_violation then
      null; -- código repetido por acaso: tenta outro
    end;
  end loop;
  delete from public.funcionarios_sessoes
   where funcionario_id in (select id from public.funcionarios_acesso where dono_id = v_uid);
  return v_cod;
end $$;

create or replace function public.dono_listar_funcionarios()
returns table (id uuid, nome text, ativo boolean, ultimo_acesso timestamptz, criado_em timestamptz)
language plpgsql security definer
set search_path = public, extensions as $$
begin
  if auth.uid() is null then raise exception 'sem_sessao'; end if;
  return query
    select f.id, f.nome, f.ativo, f.ultimo_acesso, f.criado_em
      from public.funcionarios_acesso f
     where f.dono_id = auth.uid()
     order by f.criado_em;
end $$;

create or replace function public.dono_criar_funcionario(p_nome text, p_pin text)
returns uuid language plpgsql security definer
set search_path = public, extensions as $$
declare v_uid uuid := auth.uid(); v_nome text := btrim(coalesce(p_nome, '')); v_id uuid;
begin
  if v_uid is null then raise exception 'sem_sessao'; end if;
  if length(v_nome) < 1 or length(v_nome) > 60 then raise exception 'nome_invalido'; end if;
  if p_pin is null or p_pin !~ '^[0-9]{4,6}$' then raise exception 'pin_invalido'; end if;
  if (select count(*) from public.funcionarios_acesso where dono_id = v_uid) >= 20 then raise exception 'limite_funcionarios'; end if;
  if exists (select 1 from public.funcionarios_acesso f where f.dono_id = v_uid and f.pin_hash = crypt(p_pin, f.pin_hash)) then
    raise exception 'pin_em_uso';
  end if;
  perform public.dono_codigo_loja();
  insert into public.funcionarios_acesso (dono_id, nome, pin_hash)
  values (v_uid, v_nome, crypt(p_pin, gen_salt('bf')))
  returning id into v_id;
  return v_id;
end $$;

create or replace function public.dono_mudar_pin(p_id uuid, p_pin text)
returns void language plpgsql security definer
set search_path = public, extensions as $$
declare v_uid uuid := auth.uid();
begin
  if v_uid is null then raise exception 'sem_sessao'; end if;
  if p_pin is null or p_pin !~ '^[0-9]{4,6}$' then raise exception 'pin_invalido'; end if;
  if not exists (select 1 from public.funcionarios_acesso where id = p_id and dono_id = v_uid) then raise exception 'nao_encontrado'; end if;
  if exists (select 1 from public.funcionarios_acesso f where f.dono_id = v_uid and f.id <> p_id and f.pin_hash = crypt(p_pin, f.pin_hash)) then
    raise exception 'pin_em_uso';
  end if;
  update public.funcionarios_acesso set pin_hash = crypt(p_pin, gen_salt('bf')) where id = p_id;
  delete from public.funcionarios_sessoes where funcionario_id = p_id;
end $$;

create or replace function public.dono_definir_ativo(p_id uuid, p_ativo boolean)
returns void language plpgsql security definer
set search_path = public, extensions as $$
declare v_uid uuid := auth.uid();
begin
  if v_uid is null then raise exception 'sem_sessao'; end if;
  update public.funcionarios_acesso set ativo = coalesce(p_ativo, false) where id = p_id and dono_id = v_uid;
  if not found then raise exception 'nao_encontrado'; end if;
  if not coalesce(p_ativo, false) then delete from public.funcionarios_sessoes where funcionario_id = p_id; end if;
end $$;

-- Apaga o acesso. As vendas já feitas ficam guardadas com o nome do funcionário.
create or replace function public.dono_apagar_funcionario(p_id uuid)
returns void language plpgsql security definer
set search_path = public, extensions as $$
begin
  if auth.uid() is null then raise exception 'sem_sessao'; end if;
  delete from public.funcionarios_acesso where id = p_id and dono_id = auth.uid();
  if not found then raise exception 'nao_encontrado'; end if;
end $$;

-- 5) Funções do FUNCIONÁRIO (chamadas sem conta; a segurança é o token) ----

-- Devolve sempre um resultado (nunca uma excepção), para o contador de tentativas falhadas não ser desfeito.
create or replace function public.func_entrar(p_codigo text, p_pin text)
returns jsonb language plpgsql security definer
set search_path = public, extensions as $$
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
   where f.dono_id = v_loja.dono_id and f.ativo and f.pin_hash = crypt(p_pin, f.pin_hash)
   limit 1;

  if not found then
    v_falhas := v_loja.tentativas_falhadas + 1;
    if v_falhas >= 5 then
      update public.lojas_acesso set tentativas_falhadas = 0, bloqueado_ate = now() + interval '15 minutes' where dono_id = v_loja.dono_id;
      return jsonb_build_object('ok', false, 'erro', 'bloqueado', 'minutos', 15);
    end if;
    update public.lojas_acesso set tentativas_falhadas = v_falhas where dono_id = v_loja.dono_id;
    return jsonb_build_object('ok', false, 'erro', 'dados_invalidos', 'restantes', 5 - v_falhas);
  end if;

  update public.lojas_acesso set tentativas_falhadas = 0, bloqueado_ate = null where dono_id = v_loja.dono_id;
  delete from public.funcionarios_sessoes where funcionario_id = v_func.id and expira_em <= now();
  v_token := encode(gen_random_bytes(24), 'hex');
  v_exp := now() + interval '12 hours';
  insert into public.funcionarios_sessoes (token_hash, funcionario_id, expira_em)
  values (encode(sha256(convert_to(v_token, 'utf8')), 'hex'), v_func.id, v_exp);
  update public.funcionarios_acesso set ultimo_acesso = now() where id = v_func.id;
  return jsonb_build_object('ok', true, 'token', v_token, 'nome', v_func.nome, 'expira_em', v_exp);
end $$;

create or replace function public.func_sair(p_token text)
returns void language plpgsql security definer
set search_path = public, extensions as $$
begin
  delete from public.funcionarios_sessoes where token_hash = encode(sha256(convert_to(coalesce(p_token, ''), 'utf8')), 'hex');
end $$;

-- Só nome, preço de venda e disponível. Nunca preço de custo. O disponível já desconta vendas ainda não importadas.
create or replace function public.func_catalogo(p_token text)
returns jsonb language plpgsql security definer
set search_path = public, extensions as $$
declare v public.funcionarios_acesso := public._func_sessao(p_token); r jsonb;
begin
  select coalesce(jsonb_agg(jsonb_build_object(
           'id', p ->> 'id',
           'nome', p ->> 'nome',
           'precoVenda', coalesce(nullif(p ->> 'precoVenda', '')::numeric, 0),
           'disponivel', greatest(0, coalesce(nullif(p ->> 'quantidade', '')::numeric, 0) - public._pendente_produto(v.dono_id, p ->> 'id'))
         ) order by p ->> 'nome'), '[]'::jsonb)
    into r
    from public.dados_financeiros d
   cross join lateral jsonb_array_elements(d.produtos) p
   where d.id = v.dono_id;
  return coalesce(r, '[]'::jsonb);
end $$;

-- O preço é calculado aqui (preço de venda x quantidade): o funcionário não pode mudar o valor.
create or replace function public.func_registar_venda(p_token text, p_produto_id text, p_quantidade int, p_metodo text, p_nota text default null)
returns jsonb language plpgsql security definer
set search_path = public, extensions as $$
declare
  v public.funcionarios_acesso := public._func_sessao(p_token);
  prod jsonb; preco numeric; disp numeric; v_valor numeric; v_id uuid; v_nota text;
begin
  if p_quantidade is null or p_quantidade < 1 or p_quantidade > 10000 then raise exception 'quantidade_invalida'; end if;
  if p_metodo is null or p_metodo not in ('dinheiro', 'mpesa', 'emola', 'mkesh') then raise exception 'metodo_invalido'; end if;

  perform pg_advisory_xact_lock(hashtext(v.dono_id::text)); -- dois funcionários ao mesmo tempo não vendem o mesmo último item

  select p into prod
    from public.dados_financeiros d, jsonb_array_elements(d.produtos) p
   where d.id = v.dono_id and p ->> 'id' = p_produto_id
   limit 1;
  if prod is null then raise exception 'produto_inexistente'; end if;

  preco := coalesce(nullif(prod ->> 'precoVenda', '')::numeric, 0);
  if preco <= 0 then raise exception 'sem_preco'; end if;

  disp := coalesce(nullif(prod ->> 'quantidade', '')::numeric, 0) - public._pendente_produto(v.dono_id, p_produto_id);
  if p_quantidade > disp then raise exception 'sem_stock:%', greatest(0, disp); end if;

  v_valor := preco * p_quantidade;
  v_nota := nullif(left(btrim(coalesce(p_nota, '')), 120), '');

  insert into public.vendas_funcionarios
    (dono_id, funcionario_id, funcionario_nome, produto_id, produto_nome, quantidade, valor, metodo, nota, data_key)
  values
    (v.dono_id, v.id, v.nome, p_produto_id, prod ->> 'nome', p_quantidade, v_valor, p_metodo, v_nota,
     to_char(now() at time zone 'Africa/Maputo', 'YYYY-MM-DD'))
  returning id into v_id;

  return jsonb_build_object('ok', true, 'id', v_id, 'valor', v_valor, 'disponivel', disp - p_quantidade);
end $$;

-- As vendas de hoje deste funcionário (sem custos nem lucro).
create or replace function public.func_minhas_vendas_hoje(p_token text)
returns jsonb language plpgsql security definer
set search_path = public, extensions as $$
declare v public.funcionarios_acesso := public._func_sessao(p_token); r jsonb;
begin
  select coalesce(jsonb_agg(jsonb_build_object(
           'id', x.id, 'produto', x.produto_nome, 'quantidade', x.quantidade,
           'valor', x.valor, 'metodo', x.metodo, 'criado_em', x.criado_em
         ) order by x.criado_em desc), '[]'::jsonb)
    into r
    from public.vendas_funcionarios x
   where x.funcionario_id = v.id
     and x.data_key = to_char(now() at time zone 'Africa/Maputo', 'YYYY-MM-DD');
  return r;
end $$;

-- 6) Quem pode chamar o quê ---------------------------------

revoke execute on function public._codigo_novo() from public, anon, authenticated;
revoke execute on function public._func_sessao(text) from public, anon, authenticated;
revoke execute on function public._pendente_produto(uuid, text) from public, anon, authenticated;

revoke execute on function public.dono_codigo_loja() from public, anon;
revoke execute on function public.dono_novo_codigo() from public, anon;
revoke execute on function public.dono_listar_funcionarios() from public, anon;
revoke execute on function public.dono_criar_funcionario(text, text) from public, anon;
revoke execute on function public.dono_mudar_pin(uuid, text) from public, anon;
revoke execute on function public.dono_definir_ativo(uuid, boolean) from public, anon;
revoke execute on function public.dono_apagar_funcionario(uuid) from public, anon;
grant execute on function public.dono_codigo_loja() to authenticated;
grant execute on function public.dono_novo_codigo() to authenticated;
grant execute on function public.dono_listar_funcionarios() to authenticated;
grant execute on function public.dono_criar_funcionario(text, text) to authenticated;
grant execute on function public.dono_mudar_pin(uuid, text) to authenticated;
grant execute on function public.dono_definir_ativo(uuid, boolean) to authenticated;
grant execute on function public.dono_apagar_funcionario(uuid) to authenticated;

revoke execute on function public.func_entrar(text, text) from public;
revoke execute on function public.func_sair(text) from public;
revoke execute on function public.func_catalogo(text) from public;
revoke execute on function public.func_registar_venda(text, text, int, text, text) from public;
revoke execute on function public.func_minhas_vendas_hoje(text) from public;
grant execute on function public.func_entrar(text, text) to anon, authenticated;
grant execute on function public.func_sair(text) to anon, authenticated;
grant execute on function public.func_catalogo(text) to anon, authenticated;
grant execute on function public.func_registar_venda(text, text, int, text, text) to anon, authenticated;
grant execute on function public.func_minhas_vendas_hoje(text) to anon, authenticated;
