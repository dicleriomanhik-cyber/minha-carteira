-- ============================================================
-- Minha Carteira — configuração inicial do Supabase
-- Corre este ficheiro completo em: Supabase Dashboard → SQL Editor → New query → Run
-- ============================================================

-- 1) Tabela de perfis (um por utilizador autenticado)
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  nome text,
  whatsapp text,
  email text,
  foto_url text,
  criado_em timestamptz not null default now()
);

alter table public.profiles enable row level security;

-- Cada pessoa só vê e edita o seu próprio perfil
create policy "profiles_select_own" on public.profiles
  for select using (auth.uid() = id);

create policy "profiles_update_own" on public.profiles
  for update using (auth.uid() = id);

create policy "profiles_insert_own" on public.profiles
  for insert with check (auth.uid() = id);

-- 2) Criar automaticamente uma linha em "profiles" sempre que alguém se regista
create or replace function public.handle_novo_utilizador()
returns trigger as $$
begin
  insert into public.profiles (id, nome, whatsapp, email)
  values (
    new.id,
    new.raw_user_meta_data->>'nome',
    new.raw_user_meta_data->>'whatsapp',
    new.email
  );
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_novo_utilizador();

-- 3) Bucket de armazenamento para as fotos de perfil
insert into storage.buckets (id, name, public)
values ('avatars', 'avatars', true)
on conflict (id) do nothing;

-- Qualquer pessoa autenticada pode enviar/atualizar a SUA PRÓPRIA foto
-- (o caminho do ficheiro começa sempre com o seu próprio user id: "<user_id>/avatar.ext")
create policy "avatars_upload_own" on storage.objects
  for insert with check (
    bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "avatars_update_own" on storage.objects
  for update using (
    bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text
  );

-- As fotos são públicas para leitura (para aparecerem na app sem precisar de token)
create policy "avatars_read_public" on storage.objects
  for select using (bucket_id = 'avatars');

-- 4) Função para a pessoa poder excluir a própria conta a partir da app
create or replace function public.excluir_minha_conta()
returns void as $$
begin
  delete from auth.users where id = auth.uid();
end;
$$ language plpgsql security definer;

grant execute on function public.excluir_minha_conta() to authenticated;

-- 5) Dados financeiros (Caixa do Dia, Fiados, Produtos, Xitique, Poupança) — um "instantâneo" por utilizador
-- Guardado como JSON para sincronizar entre aparelhos sem reescrever a lógica da app.
create table if not exists public.dados_financeiros (
  id uuid primary key references auth.users(id) on delete cascade,
  transacoes jsonb not null default '[]',
  saldo_inicial jsonb not null default '{}',
  participantes jsonb not null default '[]',
  pagamentos jsonb not null default '[]',
  entregas jsonb not null default '[]',
  movimentos_poupanca jsonb not null default '[]',
  fiados jsonb not null default '[]',
  produtos jsonb not null default '[]',
  atualizado_em timestamptz not null default now()
);

alter table public.dados_financeiros enable row level security;

create policy "dados_financeiros_select_own" on public.dados_financeiros
  for select using (auth.uid() = id);

create policy "dados_financeiros_insert_own" on public.dados_financeiros
  for insert with check (auth.uid() = id);

create policy "dados_financeiros_update_own" on public.dados_financeiros
  for update using (auth.uid() = id);
