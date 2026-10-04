import { supabase } from '../lib/supabase';

// Fase 4 feita: o ecrã de entrada do funcionário (/funcionario) e a importação das vendas dele para o Caixa do dono estão activos.
// Esta chave mostra ao dono o botão "Entrar como funcionário" no Login/Cadastro e o botão de enviar o acesso por WhatsApp.
export const ENTRADA_FUNCIONARIO_ATIVA = true;

// Traduz os erros das funções dono_* do Supabase (supabase-funcionarios.sql) para mensagens que o dono entende.
export function mensagemErroAcesso(error) {
  if (!error) return '';
  const texto = String(error.message || error || '');
  if (error.code === 'PGRST202' || /could not find the function|schema cache/i.test(texto)) {
    return 'A base de dados ainda não tem o acesso dos funcionários. Corre o ficheiro supabase-funcionarios.sql no Supabase.';
  }
  if (/failed to fetch|networkerror|load failed/i.test(texto)) return 'Sem ligação à internet. Tenta outra vez.';
  const mapa = {
    sem_sessao: 'A tua sessão terminou. Sai da conta e entra outra vez.',
    nome_invalido: 'Escreve o nome do funcionário (até 60 letras).',
    pin_invalido: 'O PIN tem de ter de 4 a 6 números.',
    pin_em_uso: 'Esse PIN já é de outro funcionário. Escolhe um PIN diferente.',
    limite_funcionarios: 'Chegaste ao limite de 20 funcionários.',
    nao_encontrado: 'Esse funcionário já não existe. Fecha e abre esta janela outra vez.',
  };
  for (const chave of Object.keys(mapa)) if (texto.includes(chave)) return mapa[chave];
  return 'Não foi possível concluir. Tenta outra vez.';
}

export const pinValido = (pin) => /^[0-9]{4,6}$/.test(pin || '');

// Só números, no máximo 6.
export const limparPin = (valor) => String(valor || '').replace(/\D/g, '').slice(0, 6);

// PIN de 4 números ao acaso, sem sequências fáceis de adivinhar (0000, 1234, 4321...).
export function gerarPin() {
  const facil = (p) => /^(\d)\1+$/.test(p) || '01234567890'.includes(p) || '09876543210'.includes(p);
  for (let i = 0; i < 50; i += 1) {
    const buf = new Uint32Array(1);
    (globalThis.crypto || window.crypto).getRandomValues(buf);
    const p = String(buf[0] % 10000).padStart(4, '0');
    if (!facil(p)) return p;
  }
  return '5827';
}

export function formatarUltimoAcesso(ts) {
  if (!ts) return 'Ainda não entrou';
  const d = new Date(ts);
  if (Number.isNaN(d.getTime())) return 'Ainda não entrou';
  const dd = String(d.getDate()).padStart(2, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const hh = String(d.getHours()).padStart(2, '0');
  const mi = String(d.getMinutes()).padStart(2, '0');
  return `Último acesso: ${dd}/${mm} às ${hh}:${mi}`;
}

export function textoAcesso({ codigo, pin, nome }) {
  return `Olá${nome ? ` ${nome}` : ''}! Para registares vendas na MinhaCarteira, abre ${window.location.origin} e escolhe "Entrar como funcionário".\nCódigo da loja: ${codigo}\nO teu PIN: ${pin}\nNão partilhes o PIN com ninguém.`;
}

// ---- chamadas ao Supabase (funções do dono). Cada uma devolve { dados, erro } com o erro já em português. ----
async function chamar(nomeFuncao, args) {
  try {
    const { data, error } = await supabase.rpc(nomeFuncao, args);
    if (error) return { dados: null, erro: mensagemErroAcesso(error) };
    return { dados: data, erro: '' };
  } catch (e) {
    return { dados: null, erro: mensagemErroAcesso(e) };
  }
}

export const obterCodigoLoja = () => chamar('dono_codigo_loja');
export const gerarNovoCodigo = () => chamar('dono_novo_codigo');
export const listarFuncionarios = () => chamar('dono_listar_funcionarios');
export const criarFuncionario = (nome, pin) => chamar('dono_criar_funcionario', { p_nome: nome, p_pin: pin });
export const mudarPin = (id, pin) => chamar('dono_mudar_pin', { p_id: id, p_pin: pin });
export const definirAtivo = (id, ativo) => chamar('dono_definir_ativo', { p_id: id, p_ativo: ativo });
export const apagarFuncionario = (id) => chamar('dono_apagar_funcionario', { p_id: id });
