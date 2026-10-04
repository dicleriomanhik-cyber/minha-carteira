-- ============================================================
-- Minha Carteira — funcionários com PIN (fase 5: reforço de segurança)
-- Corre este ficheiro em: Supabase Dashboard → SQL Editor → New query → Run
-- Só se já tinhas corrido o supabase-funcionarios.sql antes. Pode ser corrido mais de uma vez.
-- (Quem corre o supabase-funcionarios.sql actual já tem isto no fim do ficheiro.)
-- ============================================================

-- 7) Reforço de segurança (fase 5) ----------------------------
-- a) O dono só pode marcar uma venda como importada (false -> true). Não pode mudar valor, quantidade, produto, método
--    nem desfazer a importação: a app do dono só precisa disto.
revoke update on public.vendas_funcionarios from authenticated;
grant update (importada, importada_em) on public.vendas_funcionarios to authenticated;

drop policy if exists "vendas_func_update_dono" on public.vendas_funcionarios;
create policy "vendas_func_update_dono" on public.vendas_funcionarios
  for update to authenticated
  using (auth.uid() = dono_id and not importada)
  with check (auth.uid() = dono_id and importada);

-- b) As funções com security definer só procuram objectos em public e extensions (nunca num esquema temporário).
alter function public._func_sessao(text) set search_path = public, extensions, pg_temp;
alter function public._pendente_produto(uuid, text) set search_path = public, extensions, pg_temp;
alter function public._codigo_novo() set search_path = public, extensions, pg_temp;
alter function public.dono_codigo_loja() set search_path = public, extensions, pg_temp;
alter function public.dono_novo_codigo() set search_path = public, extensions, pg_temp;
alter function public.dono_listar_funcionarios() set search_path = public, extensions, pg_temp;
alter function public.dono_criar_funcionario(text, text) set search_path = public, extensions, pg_temp;
alter function public.dono_mudar_pin(uuid, text) set search_path = public, extensions, pg_temp;
alter function public.dono_definir_ativo(uuid, boolean) set search_path = public, extensions, pg_temp;
alter function public.dono_apagar_funcionario(uuid) set search_path = public, extensions, pg_temp;
alter function public.func_entrar(text, text) set search_path = public, extensions, pg_temp;
alter function public.func_sair(text) set search_path = public, extensions, pg_temp;
alter function public.func_catalogo(text) set search_path = public, extensions, pg_temp;
alter function public.func_registar_venda(text, text, int, text, text) set search_path = public, extensions, pg_temp;
alter function public.func_minhas_vendas_hoje(text) set search_path = public, extensions, pg_temp;
