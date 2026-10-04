import { supabase } from '../lib/supabase';

// Sessão do funcionário (entra com código da loja + PIN, sem conta no Supabase).
// O token vem de func_entrar (supabase-funcionarios.sql), vale 12 horas e fica só neste aparelho.
const CHAVE_SESSAO = 'mc_func_sessao';
const CHAVE_CODIGO = 'mc_func_codigo';

export function lerSessao() {
  try {
    const s = JSON.parse(localStorage.getItem(CHAVE_SESSAO) || 'null');
    if (!s || !s.token) return null;
    if (new Date(s.expira_em).getTime() <= Date.now()) { localStorage.removeItem(CHAVE_SESSAO); return null; }
    return s;
  } catch { return null; }
}

function guardarSessao(s) {
  try { localStorage.setItem(CHAVE_SESSAO, JSON.stringify(s)); } catch { /* sem armazenamento: a sessão vale só até fechar */ }
}

export function limparSessao() {
  try { localStorage.removeItem(CHAVE_SESSAO); } catch { /* nada a fazer */ }
}

export function lerCodigoGuardado() {
  try { return localStorage.getItem(CHAVE_CODIGO) || ''; } catch { return ''; }
}

function guardarCodigo(c) {
  try { localStorage.setItem(CHAVE_CODIGO, c); } catch { /* nada a fazer */ }
}

// Código da loja: só letras e números, maiúsculas, no máximo 6.
export const limparCodigo = (v) => String(v || '').toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6);

function erroDeRede(texto) {
  return /failed to fetch|networkerror|load failed/i.test(texto);
}

function faltaSql(error, texto) {
  return error?.code === 'PGRST202' || /could not find the function|schema cache/i.test(texto);
}

// Traduz os erros das funções func_* para mensagens que o funcionário entende.
export function mensagemErroFuncionario(error) {
  const texto = String(error?.message || error || '');
  if (faltaSql(error, texto)) return 'O sistema ainda não está preparado. Avisa o dono.';
  if (erroDeRede(texto)) return 'Sem ligação à internet. Tenta outra vez.';
  const stock = texto.match(/sem_stock:(\d+(?:\.\d+)?)/);
  if (stock) {
    const n = Number(stock[1]);
    return n > 0 ? `Só há ${n} ${n === 1 ? 'disponível' : 'disponíveis'} deste produto.` : 'Este produto já não tem stock.';
  }
  const mapa = {
    quantidade_invalida: 'Escreve uma quantidade válida.',
    metodo_invalido: 'Escolhe como o cliente pagou.',
    produto_inexistente: 'Este produto já não existe. Actualiza a lista.',
    sem_preco: 'Este produto ainda não tem preço de venda. Avisa o dono.',
  };
  for (const chave of Object.keys(mapa)) if (texto.includes(chave)) return mapa[chave];
  return 'Não foi possível concluir. Tenta outra vez.';
}

export async function entrarFuncionario(codigo, pin) {
  const cod = limparCodigo(codigo);
  try {
    const { data, error } = await supabase.rpc('func_entrar', { p_codigo: cod, p_pin: pin });
    if (error) return { erro: mensagemErroFuncionario(error) };
    if (!data?.ok) {
      if (data?.erro === 'bloqueado') {
        const m = Number(data.minutos) || 15;
        return { erro: `Demasiadas tentativas erradas. Tenta outra vez daqui a ${m} minuto${m === 1 ? '' : 's'}.` };
      }
      const r = Number(data?.restantes);
      const resto = Number.isFinite(r) && r > 0 ? ` Tens mais ${r} tentativa${r === 1 ? '' : 's'}.` : '';
      return { erro: `Código ou PIN incorretos.${resto}` };
    }
    guardarCodigo(cod);
    const sessao = { token: data.token, nome: data.nome, expira_em: data.expira_em };
    guardarSessao(sessao);
    return { sessao };
  } catch (e) {
    return { erro: mensagemErroFuncionario(e) };
  }
}

export async function sairFuncionario(token) {
  limparSessao();
  try { await supabase.rpc('func_sair', { p_token: token }); } catch { /* a sessão local já foi apagada */ }
}

// Chamadas com token. Devolve { dados, erro, sessaoTerminou }.
async function chamar(nomeFuncao, args) {
  try {
    const { data, error } = await supabase.rpc(nomeFuncao, args);
    if (error) {
      if (String(error.message || '').includes('sessao_invalida')) return { dados: null, erro: '', sessaoTerminou: true };
      return { dados: null, erro: mensagemErroFuncionario(error), sessaoTerminou: false };
    }
    return { dados: data, erro: '', sessaoTerminou: false };
  } catch (e) {
    return { dados: null, erro: mensagemErroFuncionario(e), sessaoTerminou: false };
  }
}

export const obterCatalogo = (token) => chamar('func_catalogo', { p_token: token });
export const obterVendasHoje = (token) => chamar('func_minhas_vendas_hoje', { p_token: token });
export const registarVenda = (token, { produtoId, quantidade, metodo, nota }) =>
  chamar('func_registar_venda', { p_token: token, p_produto_id: produtoId, p_quantidade: quantidade, p_metodo: metodo, p_nota: nota || null });
