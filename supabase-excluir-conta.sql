-- ============================================================
-- Minha Carteira: excluir conta com 7 dias de espera
-- Correr no Supabase: SQL Editor > New query > colar tudo > Run.
-- Pode ser corrido várias vezes sem estragar nada.
-- Correr ANTES de publicar a versão nova da app.
-- ============================================================

-- 1) Coluna que guarda o dia em que a conta será apagada
alter table public.profiles add column if not exists apagar_em timestamptz;

-- 2) A pessoa pede para excluir a própria conta: fica marcada para daqui a 7 dias
create or replace function public.pedir_exclusao_conta()
returns timestamptz
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  quando timestamptz;
begin
  if auth.uid() is null then
    raise exception 'sem_sessao';
  end if;
  update public.profiles
     set apagar_em = now() + interval '7 days'
   where id = auth.uid()
  returning apagar_em into quando;
  if quando is null then
    raise exception 'sem_perfil';
  end if;
  return quando;
end;
$$;

-- 3) A pessoa muda de ideias dentro dos 7 dias: a conta fica como estava
create or replace function public.cancelar_exclusao_conta()
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if auth.uid() is null then
    raise exception 'sem_sessao';
  end if;
  update public.profiles set apagar_em = null where id = auth.uid();
end;
$$;

revoke all on function public.pedir_exclusao_conta() from public, anon;
revoke all on function public.cancelar_exclusao_conta() from public, anon;
grant execute on function public.pedir_exclusao_conta() to authenticated;
grant execute on function public.cancelar_exclusao_conta() to authenticated;

-- 4) Apaga de vez as contas cujo prazo acabou (corre todos os dias, ver passo 6).
--    Apagar o utilizador apaga em cascata o perfil, os dados financeiros e tudo
--    o que é dos funcionários (códigos, PINs, sessões e vendas).
create or replace function public.apagar_contas_expiradas()
returns integer
language plpgsql
security definer
set search_path = public, auth, pg_temp
as $$
declare
  n integer;
begin
  with apagadas as (
    delete from auth.users u
     using public.profiles p
     where p.id = u.id
       and p.apagar_em is not null
       and p.apagar_em <= now()
    returning u.id
  )
  select count(*) into n from apagadas;
  return n;
end;
$$;

-- Ninguém de fora pode chamar esta função: só o agendador do Supabase
revoke all on function public.apagar_contas_expiradas() from public, anon, authenticated;

-- 5) A função antiga apagava a conta logo, sem espera. Deixa de existir.
drop function if exists public.excluir_minha_conta();

-- 6) A pessoa pode apagar a SUA foto de perfil (a app faz isto ao pedir a exclusão)
drop policy if exists "avatars_delete_own" on storage.objects;
create policy "avatars_delete_own" on storage.objects
  for delete to authenticated using (
    bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text
  );

-- 7) Limpeza diária às 03:00 (UTC), que apaga as contas expiradas.
--    Precisa da extensão pg_cron. Se esta parte avisar que não ficou activa:
--    Database > Extensions > pg_cron > ligar, e depois correr este bloco outra vez.
do $$
begin
  create extension if not exists pg_cron;
  perform cron.unschedule('apagar-contas-expiradas')
   where exists (select 1 from cron.job where jobname = 'apagar-contas-expiradas');
  perform cron.schedule('apagar-contas-expiradas', '0 3 * * *', 'select public.apagar_contas_expiradas()');
exception when others then
  raise notice 'pg_cron nao ficou activo: %', sqlerrm;
end;
$$;

-- Para confirmar que a limpeza diária está agendada, corre isto à parte:
--   select jobname, schedule from cron.job;
