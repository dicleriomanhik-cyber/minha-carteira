import { createContext, useContext, useEffect, useRef, useState, useCallback, useMemo } from 'react';
import { HOJE_KEY, amanhaKey, novoId, mesAtualLabel, timestampParaDia, dateKey, formatMoney } from '../utils/format';
import { proximaOcorrencia, textoPrazo, TIPOS_LEMBRETE } from '../utils/lembretes';
import { useAuth } from './AuthContext';
import { supabase } from '../lib/supabase';

const STORAGE_KEY = 'caixaDoDia_transacoes';
const STORAGE_SALDO_INICIAL = 'caixaDoDia_saldoInicial';
const STORAGE_FIADOS = 'caixaDoDia_fiados';
const STORAGE_PRODUTOS = 'caixaDoDia_produtos';
const STORAGE_PARTICIPANTES = 'xitique_participantes';
const STORAGE_PAGAMENTOS = 'xitique_pagamentos';
const STORAGE_ENTREGAS = 'xitique_entregas';
const STORAGE_POUPANCA = 'poupanca_movimentos';
const STORAGE_NOME_USUARIO = 'usuario_nome';

export const BACKUP_KEYS = [
  STORAGE_KEY, STORAGE_SALDO_INICIAL, STORAGE_PARTICIPANTES, STORAGE_PAGAMENTOS,
  STORAGE_ENTREGAS, STORAGE_POUPANCA, STORAGE_NOME_USUARIO, STORAGE_FIADOS, STORAGE_PRODUTOS,
];

export const CATEGORIAS = {
  entrada: [
    { id: 'venda', label: 'Venda de Produtos' },
    { id: 'maquina', label: 'Serviços' },
    { id: 'outra_entrada', label: 'Outra Entrada' },
  ],
  saida: [
    { id: 'almoco', label: 'Almoço' },
    { id: 'transporte', label: 'Transporte' },
    { id: 'troco', label: 'Troco Dado' },
    { id: 'outra_saida', label: 'Outra Saída' },
  ],
};
export const METODOS = [
  { id: 'dinheiro', label: 'Dinheiro' },
  { id: 'mpesa', label: 'M-Pesa' },
  { id: 'emola', label: 'e-Mola' },
  { id: 'mkesh', label: 'mKesh' },
];
export const CAT_LOOKUP = [...CATEGORIAS.entrada, ...CATEGORIAS.saida].reduce((acc, c) => { acc[c.id] = c; return acc; }, {});
CAT_LOOKUP['poupanca'] = { id: 'poupanca', label: 'Para Poupança' };
CAT_LOOKUP['fiado_recebido'] = { id: 'fiado_recebido', label: 'Fiado Recebido' };
CAT_LOOKUP['fiado_sinal'] = { id: 'fiado_sinal', label: 'Sinal de Fiado' };

// Salários e despesas operacionais (saem do saldo total e aparecem no relatório).
export const DESPESA_GRUPOS = [
  { id: 'salarios', label: 'Salários', itens: [
    { id: 'salario_proprio', label: 'Meu salário' },
    { id: 'salario_func', label: 'Salário de funcionário' },
  ] },
  { id: 'administrativas', label: 'Administrativas', itens: [
    { id: 'desp_renda', label: 'Renda e alugueres' },
    { id: 'desp_utilities', label: 'Luz, água, gás, internet e telefone' },
    { id: 'desp_salarios_admin', label: 'Limpeza, segurança e apoio administrativo' },
    { id: 'desp_material', label: 'Material de escritório e consumo' },
    { id: 'desp_servicos_ext', label: 'Contabilidade, jurídico e consultoria' },
  ] },
  { id: 'comerciais', label: 'Comerciais e Vendas', itens: [
    { id: 'desp_marketing', label: 'Marketing e publicidade' },
    { id: 'desp_comissoes', label: 'Comissões de vendas' },
    { id: 'desp_logistica', label: 'Transporte, entregas e embalagens' },
    { id: 'desp_viagens', label: 'Viagens e representação' },
  ] },
  { id: 'tecnologia', label: 'Tecnologia e Ferramentas', itens: [
    { id: 'desp_software', label: 'Subscrições e licenças de software' },
    { id: 'desp_alojamento', label: 'Alojamento web e domínios' },
  ] },
  { id: 'financeiras', label: 'Financeiras', itens: [
    { id: 'desp_juros', label: 'Juros de empréstimos' },
    { id: 'desp_banco', label: 'Comissões e taxas bancárias' },
    { id: 'desp_taxas_pag', label: 'Taxas de pagamentos (M-Pesa, e-Mola, cartões)' },
  ] },
  { id: 'legais', label: 'Legais e Regulatórias', itens: [
    { id: 'desp_seguros', label: 'Seguros' },
    { id: 'desp_licencas', label: 'Licenças, alvarás e taxas autárquicas' },
    { id: 'desp_impostos', label: 'Impostos e taxas operacionais' },
  ] },
];
export const DESPESA_IDS = new Set(DESPESA_GRUPOS.flatMap((g) => g.itens.map((i) => i.id)));
DESPESA_GRUPOS.forEach((g) => g.itens.forEach((i) => { CAT_LOOKUP[i.id] = { id: i.id, label: i.label, grupo: g.label }; }));

function readJSON(key, fallback) {
  try {
    const v = JSON.parse(localStorage.getItem(key));
    return v === null || v === undefined ? fallback : v;
  } catch {
    return fallback;
  }
}

function usePersisted(key, initial) {
  const [state, setState] = useState(() => readJSON(key, initial));
  useEffect(() => {
    localStorage.setItem(key, JSON.stringify(state));
  }, [key, state]);
  return [state, setState];
}

const DataContext = createContext(null);

export function DataProvider({ children }) {
  const [transacoes, setTransacoes] = usePersisted(STORAGE_KEY, []);
  const [saldoInicialMap, setSaldoInicialMap] = usePersisted(STORAGE_SALDO_INICIAL, {});
  const [participantes, setParticipantes] = usePersisted(STORAGE_PARTICIPANTES, []);
  const [pagamentos, setPagamentos] = usePersisted(STORAGE_PAGAMENTOS, []);
  const [entregas, setEntregas] = usePersisted(STORAGE_ENTREGAS, []);
  const [movimentosPoupanca, setMovimentosPoupanca] = usePersisted(STORAGE_POUPANCA, []);
  const [fiados, setFiados] = usePersisted(STORAGE_FIADOS, []);
  const [produtos, setProdutos] = usePersisted(STORAGE_PRODUTOS, []);
  const [usuarioNome, setUsuarioNomeState] = usePersisted(STORAGE_NOME_USUARIO, '');

  /* ---------- Sincronização com Supabase (entre aparelhos) ---------- */
  const { user } = useAuth();
  const [carregandoDados, setCarregandoDados] = useState(true);
  const prontoRef = useRef(false);
  const ignorarProximoSaveRef = useRef(false);

  useEffect(() => {
    let cancelado = false;
    prontoRef.current = false;
    if (!user) { setCarregandoDados(false); return undefined; }
    setCarregandoDados(true);
    (async () => {
      const { data, error } = await supabase.from('dados_financeiros').select('*').eq('id', user.id).maybeSingle();
      if (cancelado) return;
      if (!error && data) {
        ignorarProximoSaveRef.current = true;
        setTransacoes(data.transacoes || []);
        setSaldoInicialMap(data.saldo_inicial || {});
        setParticipantes(data.participantes || []);
        setPagamentos(data.pagamentos || []);
        setEntregas(data.entregas || []);
        setMovimentosPoupanca(data.movimentos_poupanca || []);
        setFiados(data.fiados || []);
        setProdutos(data.produtos || []);
      } else if (!error && !data) {
        // Primeira vez desta conta a sincronizar: envia o que já existe neste aparelho como ponto de partida.
        await supabase.from('dados_financeiros').upsert({
          id: user.id,
          transacoes, saldo_inicial: saldoInicialMap, participantes, pagamentos, entregas,
          movimentos_poupanca: movimentosPoupanca, fiados, produtos,
        });
      }
      if (!cancelado) { prontoRef.current = true; setCarregandoDados(false); }
    })();
    return () => { cancelado = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  useEffect(() => {
    if (!user || !prontoRef.current) return undefined;
    if (ignorarProximoSaveRef.current) { ignorarProximoSaveRef.current = false; return undefined; }
    const handle = setTimeout(() => {
      supabase.from('dados_financeiros').upsert({
        id: user.id,
        transacoes, saldo_inicial: saldoInicialMap, participantes, pagamentos, entregas,
        movimentos_poupanca: movimentosPoupanca, fiados, produtos,
        atualizado_em: new Date().toISOString(),
      }).then(({ error }) => { if (error) console.error('Erro ao sincronizar dados:', error.message); });
    }, 800);
    return () => clearTimeout(handle);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, transacoes, saldoInicialMap, participantes, pagamentos, entregas, movimentosPoupanca, fiados, produtos]);

  /* ---------- Saldo inicial / caixa do dia (por setor: produtos e máquina) ---------- */
  // Formato novo: saldoInicialMap[dk] = { produtos: number, maquina: number }
  // Formato antigo (antes da separação por setor): saldoInicialMap[dk] = number
  // A função abaixo normaliza os dois formatos e assinala quando um dia ainda
  // está no formato antigo e precisa de ser dividido manualmente pelo utilizador.
  const SETORES = ['produtos', 'maquina'];
  const normalizarSaldoInicialDia = useCallback((v) => {
    if (v === undefined || v === null) return null;
    if (typeof v === 'number') return { produtos: v, maquina: 0, legado: true };
    return v;
  }, []);

  // Saldos iniciais definidos UMA vez, no Perfil (guardados em saldoInicialMap.__global).
  // Se ainda não existir, usa o saldo do primeiro dia antigo (compatibilidade).
  const saldoInicialGlobal = useMemo(() => {
    const g = saldoInicialMap.__global;
    if (g) return { produtos: g.produtos || 0, maquina: g.maquina || 0 };
    const dias = Object.keys(saldoInicialMap).filter((k) => !k.startsWith('__')).sort();
    if (!dias.length) return { produtos: 0, maquina: 0 };
    const v = normalizarSaldoInicialDia(saldoInicialMap[dias[0]]);
    return { produtos: v.produtos || 0, maquina: v.maquina || 0 };
  }, [saldoInicialMap, normalizarSaldoInicialDia]);

  const setSaldoInicialGlobal = useCallback((setor, valor) => {
    setSaldoInicialMap((m) => ({ ...m, __global: { ...saldoInicialGlobal, [setor]: valor } }));
  }, [setSaldoInicialMap, saldoInicialGlobal]);

  // Saldo de abertura de um dia = inicial global + tudo o que entrou e saiu antes desse dia.
  // Assim o saldo acumula todos os dias, sem ter de ser definido diariamente.
  const getSaldoInicialSetor = useCallback((dk, setor) => {
    const antes = transacoes.filter((t) => (t.setor || 'produtos') === setor && t.dateKey < dk);
    const ent = antes.filter((t) => t.tipo === 'entrada').reduce((s, t) => s + t.valor, 0);
    const sai = antes.filter((t) => t.tipo === 'saida').reduce((s, t) => s + t.valor, 0);
    return (saldoInicialGlobal[setor] || 0) + ent - sai;
  }, [transacoes, saldoInicialGlobal]);

  // Mantido por compatibilidade: saldo inicial "total" de um dia (soma dos setores).
  const getSaldoInicial = useCallback((dk) => SETORES.reduce((s, setor) => s + getSaldoInicialSetor(dk, setor), 0), [getSaldoInicialSetor]);

  const precisaMigrarSaldoInicialHoje = useMemo(() => {
    const v = normalizarSaldoInicialDia(saldoInicialMap[HOJE_KEY]);
    return !!(v && v.legado);
  }, [saldoInicialMap, normalizarSaldoInicialDia]);

  const saldoInicialLegadoHoje = useMemo(() => (typeof saldoInicialMap[HOJE_KEY] === 'number' ? saldoInicialMap[HOJE_KEY] : null), [saldoInicialMap]);

  const saldoInicialSetorDefinidoHoje = useCallback((setor) => {
    const v = normalizarSaldoInicialDia(saldoInicialMap[HOJE_KEY]);
    if (!v || v.legado) return false;
    return v[setor] !== undefined;
  }, [saldoInicialMap, normalizarSaldoInicialDia]);

  const setSaldoInicialSetorHoje = useCallback((setor, valor) => {
    setSaldoInicialMap((m) => {
      const atual = normalizarSaldoInicialDia(m[HOJE_KEY]) || { produtos: 0, maquina: 0 };
      const { legado, ...limpo } = atual;
      return { ...m, [HOJE_KEY]: { ...limpo, [setor]: valor } };
    });
  }, [setSaldoInicialMap, normalizarSaldoInicialDia]);

  const saldoFechamentoDiaSetor = useCallback((dk, setor) => {
    const doDia = transacoes.filter((t) => t.dateKey === dk && (t.setor || 'produtos') === setor);
    const ent = doDia.filter((t) => t.tipo === 'entrada').reduce((s, t) => s + t.valor, 0);
    const sai = doDia.filter((t) => t.tipo === 'saida').reduce((s, t) => s + t.valor, 0);
    return getSaldoInicialSetor(dk, setor) + ent - sai;
  }, [transacoes, getSaldoInicialSetor]);

  const saldoFechamentoDia = useCallback((dk) => SETORES.reduce((s, setor) => s + saldoFechamentoDiaSetor(dk, setor), 0), [saldoFechamentoDiaSetor]);

  const ultimoDiaAnteriorComDados = useCallback(() => {
    const chaves = new Set([...transacoes.map((t) => t.dateKey), ...Object.keys(saldoInicialMap).filter((k) => !k.startsWith('__'))]);
    const anteriores = [...chaves].filter((k) => k < HOJE_KEY).sort((a, b) => b.localeCompare(a));
    return anteriores.length ? anteriores[0] : null;
  }, [transacoes, saldoInicialMap]);

  const sugestaoSaldoInicialSetor = useCallback((setor) => {
    if (saldoInicialSetorDefinidoHoje(setor)) return getSaldoInicialSetor(HOJE_KEY, setor);
    const prevDia = ultimoDiaAnteriorComDados();
    return prevDia ? Math.max(0, saldoFechamentoDiaSetor(prevDia, setor)) : 0;
  }, [saldoInicialSetorDefinidoHoje, getSaldoInicialSetor, ultimoDiaAnteriorComDados, saldoFechamentoDiaSetor]);

  const doHoje = useMemo(() => transacoes.filter((t) => t.dateKey === HOJE_KEY).sort((a, b) => b.timestamp - a.timestamp), [transacoes]);
  const doHojePorSetor = useCallback((setor) => doHoje.filter((t) => (t.setor || 'produtos') === setor), [doHoje]);
  const totalEntradasHoje = useMemo(() => doHoje.filter((t) => t.tipo === 'entrada').reduce((s, t) => s + t.valor, 0), [doHoje]);
  const totalSaidasHoje = useMemo(() => doHoje.filter((t) => t.tipo === 'saida').reduce((s, t) => s + t.valor, 0), [doHoje]);

  const totalEntradasSetorHoje = useCallback((setor) => doHojePorSetor(setor).filter((t) => t.tipo === 'entrada').reduce((s, t) => s + t.valor, 0), [doHojePorSetor]);
  const totalSaidasSetorHoje = useCallback((setor) => doHojePorSetor(setor).filter((t) => t.tipo === 'saida').reduce((s, t) => s + t.valor, 0), [doHojePorSetor]);
  const saldoSetorHoje = useCallback((setor) => getSaldoInicialSetor(HOJE_KEY, setor) + totalEntradasSetorHoje(setor) - totalSaidasSetorHoje(setor), [getSaldoInicialSetor, totalEntradasSetorHoje, totalSaidasSetorHoje]);

  const saldoProdutosHoje = saldoSetorHoje('produtos');
  const saldoMaquinaHoje = saldoSetorHoje('maquina');
  // Saldo total: nunca é definido manualmente — é sempre a soma automática dos dois setores.
  const saldoHoje = saldoProdutosHoje + saldoMaquinaHoje;
  const totalProdutosHoje = useMemo(() => doHoje.filter((t) => t.tipo === 'entrada' && t.categoria === 'venda').reduce((s, t) => s + t.valor, 0), [doHoje]);
  const totalMaquinaHoje = useMemo(() => doHoje.filter((t) => t.tipo === 'entrada' && t.categoria === 'maquina').reduce((s, t) => s + t.valor, 0), [doHoje]);

  const lucroRealHojeCalc = useCallback(() => {
    const alvo = transacoes.filter((t) => t.dateKey === HOJE_KEY && t.tipo === 'entrada' && t.produtoId);
    const receita = alvo.reduce((s, t) => s + t.valor, 0);
    const custo = alvo.reduce((s, t) => s + (t.custoTotal || 0), 0);
    return { receita, custo, lucro: receita - custo };
  }, [transacoes]);

  const addTransacao = useCallback(({ tipo, categoria, valor, nota, setor = 'produtos', produtoId = null, quantidade = null, custoTotal = 0, metodo = 'dinheiro', dateKey: dk = HOJE_KEY, pessoa = null }) => {
    const tx = { id: novoId(), tipo, categoria, valor, nota, setor, metodo, timestamp: timestampParaDia(dk), dateKey: dk };
    if (pessoa) tx.pessoa = pessoa;
    if (produtoId) { tx.produtoId = produtoId; tx.quantidade = quantidade; tx.custoTotal = custoTotal; }
    setTransacoes((arr) => [...arr, tx]);
    return tx;
  }, [setTransacoes]);

  const registrarVendaComStock = useCallback(({ tipo, categoria, valor, nota, setor = 'produtos', produtoId, quantidade, metodo, dateKey: dk = HOJE_KEY }) => {
    const p = produtos.find((x) => x.id === produtoId);
    if (!p) return { erro: 'Esse produto já não existe no stock.' };
    if (quantidade > p.quantidade) return { erro: `Só tens ${p.quantidade} unidades de "${p.nome}" em stock.` };
    const custoTotal = quantidade * p.precoCusto;
    setProdutos((arr) => arr.map((x) => (x.id === produtoId ? { ...x, quantidade: x.quantidade - quantidade } : x)));
    const notaFinal = nota ? `${p.nome} x${quantidade} · ${nota}` : `${p.nome} x${quantidade}`;
    addTransacao({ tipo, categoria, valor, nota: notaFinal, setor, metodo, produtoId, quantidade, custoTotal, dateKey: dk });
    return { ok: true };
  }, [produtos, setProdutos, addTransacao]);

  // Saldo por método de pagamento. O saldo inicial conta como dinheiro e os registos antigos (sem método) também.
  const saldoPorMetodo = useMemo(() => {
    const r = {};
    METODOS.forEach((m) => { r[m.id] = 0; });
    r.dinheiro += (saldoInicialGlobal.produtos || 0) + (saldoInicialGlobal.maquina || 0);
    transacoes.forEach((t) => {
      const m = t.metodo && r[t.metodo] !== undefined ? t.metodo : 'dinheiro';
      r[m] += t.tipo === 'entrada' ? t.valor : -t.valor;
    });
    return r;
  }, [transacoes, saldoInicialGlobal]);

  const registarDespesa = useCallback(({ categoria, valor, nota, pessoa, setor = 'produtos', metodo = 'dinheiro', dateKey: dk = HOJE_KEY }) => (
    addTransacao({ tipo: 'saida', categoria, valor, nota, setor, metodo, dateKey: dk, pessoa: pessoa || null })
  ), [addTransacao]);

  const nomesPagos = useMemo(() => [...new Set(transacoes.filter((t) => t.categoria === 'salario_func' && t.pessoa).map((t) => t.pessoa))].sort(), [transacoes]);

  const deleteTransacao = useCallback((id) => {
    const t = transacoes.find((x) => x.id === id);
    if (t && t.produtoId) {
      setProdutos((arr) => arr.map((p) => (p.id === t.produtoId ? { ...p, quantidade: p.quantidade + (t.quantidade || 0) } : p)));
    }
    setTransacoes((arr) => arr.filter((x) => x.id !== id));
    // Se esta saída era uma poupança, o movimento da Poupança também sai (o dinheiro volta ao saldo).
    if (t && t.categoria === 'poupanca') setMovimentosPoupanca((arr) => arr.filter((m) => m.txId !== id));
  }, [transacoes, setTransacoes, setProdutos, setMovimentosPoupanca]);

  const deleteDia = useCallback((dk) => {
    const idsPoupanca = new Set(transacoes.filter((t) => t.dateKey === dk && t.categoria === 'poupanca').map((t) => t.id));
    if (idsPoupanca.size) setMovimentosPoupanca((arr) => arr.filter((m) => !idsPoupanca.has(m.txId)));
    setTransacoes((arr) => arr.filter((t) => t.dateKey !== dk));
    setSaldoInicialMap((m) => { const n = { ...m }; delete n[dk]; return n; });
  }, [transacoes, setTransacoes, setSaldoInicialMap, setMovimentosPoupanca]);

  const historicoDias = useMemo(() => {
    const chavesSet = new Set();
    transacoes.forEach((t) => { if (t.dateKey !== HOJE_KEY) chavesSet.add(t.dateKey); });
    Object.keys(saldoInicialMap).forEach((k) => { if (k !== HOJE_KEY && !k.startsWith('__')) chavesSet.add(k); });
    return [...chavesSet].sort((a, b) => b.localeCompare(a));
  }, [transacoes, saldoInicialMap]);

  /* ---------- Xitique ---------- */
  const pagouDia = useCallback((participanteId, dk = HOJE_KEY) => pagamentos.some((p) => p.participanteId === participanteId && p.dateKey === dk), [pagamentos]);
  const pagouHoje = useCallback((participanteId) => pagouDia(participanteId, HOJE_KEY), [pagouDia]);

  const salvarParticipante = useCallback(({ id, nome, valorCombinado, telefone }) => {
    if (id) {
      setParticipantes((arr) => arr.map((p) => (p.id === id ? { ...p, nome, valorCombinado, telefone: telefone || '' } : p)));
    } else {
      setParticipantes((arr) => [...arr, { id: novoId(), nome, valorCombinado, telefone: telefone || '' }]);
    }
  }, [setParticipantes]);

  const deleteParticipante = useCallback((id) => {
    setParticipantes((arr) => arr.filter((x) => x.id !== id));
    setPagamentos((arr) => arr.filter((x) => x.participanteId !== id));
  }, [setParticipantes, setPagamentos]);

  const desmarcarPagamento = useCallback((participanteId, dk = HOJE_KEY) => {
    setPagamentos((arr) => arr.filter((p) => !(p.participanteId === participanteId && p.dateKey === dk)));
  }, [setPagamentos]);

  const registrarPagamento = useCallback((participanteId, valor, dk = HOJE_KEY) => {
    setPagamentos((arr) => [...arr, { id: novoId(), participanteId, valor, dateKey: dk, timestamp: timestampParaDia(dk) }]);
  }, [setPagamentos]);

  const totalGuardadoXitique = useMemo(() => {
    const totalPago = pagamentos.reduce((s, p) => s + p.valor, 0);
    const totalEntregue = entregas.reduce((s, e) => s + e.valor, 0);
    return totalPago - totalEntregue;
  }, [pagamentos, entregas]);

  const registrarEntrega = useCallback((valor, participanteId, dk = HOJE_KEY) => {
    const participante = participantes.find((p) => p.id === participanteId);
    if (!participante) return;
    setEntregas((arr) => [...arr, { id: novoId(), valor, participanteId, nota: participante.nome, dateKey: dk, timestamp: timestampParaDia(dk) }]);
  }, [participantes, setEntregas]);

  const deleteEntrega = useCallback((id) => {
    setEntregas((arr) => arr.filter((e) => e.id !== id));
  }, [setEntregas]);

  /* ---------- Poupança ---------- */
  const totalPoupancaCalc = useMemo(() => movimentosPoupanca.reduce((s, m) => (m.tipo === 'deposito' ? s + m.valor : s - m.valor), 0), [movimentosPoupanca]);

  // Guardar na poupança = saída do Caixa (sai do saldo total) + movimento na Poupança, ligados por txId.
  const guardarPoupanca = useCallback((valor, nota, dk = HOJE_KEY, metaId, { setor = 'produtos', metodo = 'dinheiro' } = {}) => {
    const tx = addTransacao({ tipo: 'saida', categoria: 'poupanca', valor, nota: nota || 'Transferido para Poupança', setor, metodo, dateKey: dk });
    setMovimentosPoupanca((arr) => [...arr, { id: novoId(), tipo: 'deposito', valor, nota, timestamp: tx.timestamp, dateKey: dk, txId: tx.id, metaId }]);
  }, [addTransacao, setMovimentosPoupanca]);

  // Depósitos antigos que nunca saíram do saldo total (não têm saída ligada no Caixa).
  const depositosSemSaida = useMemo(
    () => movimentosPoupanca.filter((m) => m.tipo === 'deposito' && !m.txId),
    [movimentosPoupanca],
  );

  const descontarDepositosAntigos = useCallback(() => {
    const alvos = movimentosPoupanca.filter((m) => m.tipo === 'deposito' && !m.txId);
    if (!alvos.length) return;
    const ligacoes = {};
    const novas = alvos.map((m) => {
      const dk = m.dateKey || dateKey(new Date(m.timestamp));
      const tx = { id: novoId(), tipo: 'saida', categoria: 'poupanca', valor: m.valor, nota: m.nota || 'Transferido para Poupança', setor: 'produtos', metodo: 'dinheiro', timestamp: m.timestamp || timestampParaDia(dk), dateKey: dk };
      ligacoes[m.id] = tx.id;
      return tx;
    });
    setTransacoes((arr) => [...arr, ...novas]);
    setMovimentosPoupanca((arr) => arr.map((m) => (ligacoes[m.id] ? { ...m, txId: ligacoes[m.id], dateKey: m.dateKey || dateKey(new Date(m.timestamp)) } : m)));
  }, [movimentosPoupanca, setTransacoes, setMovimentosPoupanca]);

  const retirarPoupanca = useCallback((valor, nota, dk = HOJE_KEY, metaId) => {
    setMovimentosPoupanca((arr) => [...arr, { id: novoId(), tipo: 'retirada', valor, nota, timestamp: timestampParaDia(dk), dateKey: dk, metaId }]);
  }, [setMovimentosPoupanca]);

  const deleteMovimentoPoupanca = useCallback((id) => {
    const m = movimentosPoupanca.find((x) => x.id === id);
    if (!m) return;
    if (m.tipo === 'deposito' && m.txId) {
      setTransacoes((arr) => arr.filter((t) => t.id !== m.txId));
    }
    setMovimentosPoupanca((arr) => arr.filter((x) => x.id !== id));
  }, [movimentosPoupanca, setMovimentosPoupanca, setTransacoes]);

  // Metas de poupança (nome + valor a atingir)
  const metas = useMemo(() => saldoInicialMap.__metas || [], [saldoInicialMap]);
  const addMeta = useCallback((nome, valor) => {
    setSaldoInicialMap((m) => ({ ...m, __metas: [...(m.__metas || []), { id: novoId(), nome, valor }] }));
  }, [setSaldoInicialMap]);
  const deleteMeta = useCallback((id) => {
    setSaldoInicialMap((m) => ({ ...m, __metas: (m.__metas || []).filter((x) => x.id !== id) }));
    setMovimentosPoupanca((arr) => arr.map((x) => (x.metaId === id ? { ...x, metaId: undefined } : x)));
  }, [setSaldoInicialMap, setMovimentosPoupanca]);

  const guardadoMesAtual = useMemo(() => {
    const mesAtual = mesAtualLabel(Date.now());
    return movimentosPoupanca.filter((m) => m.tipo === 'deposito' && mesAtualLabel(m.timestamp) === mesAtual).reduce((s, m) => s + m.valor, 0);
  }, [movimentosPoupanca]);

  /* ---------- Fiados ---------- */
  const saldoFiado = useCallback((f) => Math.max(0, Math.round(((f.valorTotal || 0) - (f.valorPago || 0)) * 100) / 100), []);

  const statusFiado = useCallback((f) => {
    if (saldoFiado(f) <= 0) return 'pago';
    if (f.vencimento && f.vencimento < HOJE_KEY) return 'vencido';
    if (f.vencimento === amanhaKey()) return 'amanha';
    return 'ok';
  }, [saldoFiado]);

  const nomesClientesFiado = useMemo(() => [...new Set(fiados.map((f) => f.cliente))].sort(), [fiados]);

  const registarRecebimentoFiado = useCallback((fiadoId, valor, categoria, nota, metodo) => {
    const fiado = fiados.find((f) => f.id === fiadoId);
    if (!fiado) return;
    const custoProporcional = fiado.custoTotal ? Math.round((fiado.custoTotal * (valor / fiado.valorTotal)) * 100) / 100 : 0;
    addTransacao({
      tipo: 'entrada', categoria, valor, nota, metodo, setor: 'produtos', // fiado é sempre venda de produtos
      produtoId: fiado.produtoStockId && custoProporcional > 0 ? fiado.produtoStockId : null,
      custoTotal: custoProporcional,
    });
    setFiados((arr) => arr.map((f) => (f.id === fiadoId
      ? { ...f, valorPago: Math.round(((f.valorPago || 0) + valor) * 100) / 100, pagamentos: [...(f.pagamentos || []), { valor, timestamp: Date.now(), metodo }] }
      : f)));
  }, [fiados, addTransacao, setFiados]);

  const arred = (n) => Math.round(n * 100) / 100;

  const salvarFiado = useCallback(({ cliente, produtoStockId, produtoDescricao, quantidade, valorTotal, valorPago, vencimento, telefone, metodo = 'dinheiro' }) => {
    let custoTotal = 0;
    if (produtoStockId) {
      const p = produtos.find((x) => x.id === produtoStockId);
      if (!p) return { erro: 'Esse produto já não existe no stock.' };
      if (quantidade > p.quantidade) return { erro: `Só tens ${p.quantidade} unidades de "${p.nome}" em stock.` };
      custoTotal = quantidade * p.precoCusto;
      setProdutos((arr) => arr.map((x) => (x.id === produtoStockId ? { ...x, quantidade: x.quantidade - quantidade } : x)));
    }
    const agora = Date.now();
    const sinal = valorPago > 0 ? valorPago : 0;
    const fiado = {
      id: novoId(), cliente, telefone: telefone || '', produto: produtoDescricao, produtoInicial: produtoDescricao, produtoStockId: produtoStockId || null,
      quantidade, custoTotal, valorTotal, valorPago: sinal, vencimento, criadoEm: agora,
      pagamentos: sinal > 0 ? [{ valor: sinal, timestamp: agora, metodo }] : [], aumentos: [], extrasStock: [],
    };
    setFiados((arr) => [...arr, fiado]);
    if (sinal > 0) {
      const custoProporcional = custoTotal ? arred(custoTotal * (sinal / valorTotal)) : 0;
      addTransacao({
        tipo: 'entrada', categoria: 'fiado_sinal', valor: sinal, nota: 'Sinal - fiado ' + cliente, metodo, setor: 'produtos',
        produtoId: produtoStockId && custoProporcional > 0 ? produtoStockId : null, custoTotal: custoProporcional,
      });
    }
    return { ok: true };
  }, [produtos, setProdutos, setFiados, addTransacao]);

  // Cliente leva mais mercadoria/serviço: soma ao valor da mesma dívida.
  const aumentarFiado = useCallback((id, { descricao, valor, produtoStockId, quantidade }) => {
    if (!fiados.some((x) => x.id === id)) return { erro: 'Esse fiado já não existe.' };
    let custoExtra = 0;
    let extra = null;
    if (produtoStockId) {
      const p = produtos.find((x) => x.id === produtoStockId);
      if (!p) return { erro: 'Esse produto já não existe no stock.' };
      if (quantidade > p.quantidade) return { erro: `Só tens ${p.quantidade} unidades de "${p.nome}" em stock.` };
      custoExtra = quantidade * p.precoCusto;
      extra = { produtoId: produtoStockId, quantidade };
      setProdutos((arr) => arr.map((x) => (x.id === produtoStockId ? { ...x, quantidade: x.quantidade - quantidade } : x)));
    }
    const agora = Date.now();
    setFiados((arr) => arr.map((x) => (x.id === id ? {
      ...x,
      valorTotal: arred((x.valorTotal || 0) + valor),
      custoTotal: arred((x.custoTotal || 0) + custoExtra),
      produto: `${x.produto} + ${descricao}`,
      produtoInicial: x.produtoInicial || x.produto,
      aumentos: [...(x.aumentos || []), { valor, descricao, timestamp: agora }],
      extrasStock: extra ? [...(x.extrasStock || []), extra] : (x.extrasStock || []),
    } : x)));
    return { ok: true };
  }, [fiados, produtos, setProdutos, setFiados]);

  // Corrigir produto/serviço, valor total, vencimento ou WhatsApp na mesma pessoa.
  const editarFiado = useCallback((id, { produto, valorTotal, vencimento, telefone }) => {
    setFiados((arr) => arr.map((x) => (x.id === id ? {
      ...x, produto, valorTotal, vencimento, telefone: telefone || '',
      produtoInicial: (x.aumentos || []).length === 0 ? produto : x.produtoInicial,
    } : x)));
  }, [setFiados]);

  const deleteFiado = useCallback((id) => {
    const f = fiados.find((x) => x.id === id);
    if (!f) return;
    const devolver = [];
    if (f.produtoStockId && f.quantidade) devolver.push({ produtoId: f.produtoStockId, quantidade: f.quantidade });
    (f.extrasStock || []).forEach((e) => devolver.push(e));
    if (devolver.length) {
      setProdutos((arr) => arr.map((p) => {
        const q = devolver.filter((d) => d.produtoId === p.id).reduce((s, d) => s + d.quantidade, 0);
        return q ? { ...p, quantidade: p.quantidade + q } : p;
      }));
    }
    setFiados((arr) => arr.filter((x) => x.id !== id));
  }, [fiados, setProdutos, setFiados]);

  /* ---------- Produtos ---------- */
  const salvarProduto = useCallback(({ id, nome, quantidade, precoCusto, precoVenda, alertaEm }) => {
    if (id) {
      setProdutos((arr) => arr.map((p) => (p.id === id ? { ...p, nome, quantidade, precoCusto, precoVenda, alertaEm } : p)));
    } else {
      setProdutos((arr) => [...arr, { id: novoId(), nome, quantidade, precoCusto, precoVenda, alertaEm }]);
    }
  }, [setProdutos]);

  const deleteProduto = useCallback((id) => {
    setProdutos((arr) => arr.filter((x) => x.id !== id));
  }, [setProdutos]);

  const reporProduto = useCallback((id, qtd, novoCusto) => {
    setProdutos((arr) => arr.map((p) => {
      if (p.id !== id) return p;
      const next = { ...p, quantidade: p.quantidade + qtd };
      if (!isNaN(novoCusto) && novoCusto >= 0) next.precoCusto = novoCusto;
      return next;
    }));
  }, [setProdutos]);

  /* ---------- Fecho do dia ---------- */
  // Guardado dentro de saldo_inicial (__fechos), por isso sincroniza sem alterar o SQL.
  const fechos = useMemo(() => saldoInicialMap.__fechos || {}, [saldoInicialMap]);
  const salvarFecho = useCallback((dk, { contado, esperado, diferenca }) => {
    setSaldoInicialMap((m) => ({ ...m, __fechos: { ...(m.__fechos || {}), [dk]: { contado, esperado, diferenca, timestamp: Date.now() } } }));
  }, [setSaldoInicialMap]);

  /* ---------- Nome do negócio (usado no Dossiê para crédito) ---------- */
  const negocio = saldoInicialMap.__negocio || '';
  const setNegocio = useCallback((nome) => {
    setSaldoInicialMap((m) => ({ ...m, __negocio: nome }));
  }, [setSaldoInicialMap]);

  /* ---------- Lembretes de pagamentos (renda, licenças, ...) ---------- */
  const lembretes = useMemo(() => saldoInicialMap.__lembretes || [], [saldoInicialMap]);
  const addLembrete = useCallback((dados) => {
    setSaldoInicialMap((m) => ({ ...m, __lembretes: [...(m.__lembretes || []), { id: novoId(), ...dados }] }));
  }, [setSaldoInicialMap]);
  const deleteLembrete = useCallback((id) => {
    setSaldoInicialMap((m) => ({ ...m, __lembretes: (m.__lembretes || []).filter((x) => x.id !== id) }));
  }, [setSaldoInicialMap]);
  const marcarLembretePago = useCallback((id, periodo) => {
    setSaldoInicialMap((m) => ({
      ...m,
      __lembretes: (m.__lembretes || []).map((l) => {
        if (l.id !== id) return l;
        return l.recorrencia === 'unico' ? { ...l, pagoEm: HOJE_KEY } : { ...l, ultimoPeriodo: periodo };
      }),
    }));
  }, [setSaldoInicialMap]);

  /* ---------- Alertas ---------- */
  const computeAlertas = useCallback(() => {
    const alertas = [];
    const amanha = amanhaKey();
    const ativos = fiados.filter((f) => saldoFiado(f) > 0);
    const vencidos = ativos.filter((f) => f.vencimento && f.vencimento < HOJE_KEY);
    const venceHoje = ativos.filter((f) => f.vencimento === HOJE_KEY);
    const venceAmanha = ativos.filter((f) => f.vencimento === amanha);
    if (vencidos.length) {
      const total = vencidos.reduce((s, f) => s + saldoFiado(f), 0);
      alertas.push({ tipo: 'fiado', total, count: vencidos.length, texto: `${vencidos.length} fiado(s) vencido(s) — ${total.toFixed(2)} MT por receber. Toca para ver.` });
    }
    if (venceHoje.length) {
      const total = venceHoje.reduce((s, f) => s + saldoFiado(f), 0);
      alertas.push({ tipo: 'fiado', total, count: venceHoje.length, texto: `${venceHoje.length} fiado(s) vence(m) hoje — ${total.toFixed(2)} MT. Toca para ver.` });
    }
    if (venceAmanha.length) {
      const total = venceAmanha.reduce((s, f) => s + saldoFiado(f), 0);
      alertas.push({ tipo: 'fiado', total, count: venceAmanha.length, texto: `${venceAmanha.length} fiado(s) vence(m) amanhã — ${total.toFixed(2)} MT. Toca para ver.` });
    }
    const baixos = produtos.filter((p) => p.quantidade <= (p.alertaEm !== undefined ? p.alertaEm : 3));
    if (baixos.length) {
      const nomes = baixos.slice(0, 3).map((p) => p.nome).join(', ');
      alertas.push({ tipo: 'stock', texto: `Stock baixo: ${nomes}${baixos.length > 3 ? '…' : ''}. Toca para repor.` });
    }
    lembretes.forEach((l) => {
      const o = proximaOcorrencia(l);
      if (!o) return;
      if (o.dias > (l.avisarDias ?? 3)) return;
      const nome = l.nome || (TIPOS_LEMBRETE.find((t) => t.id === l.tipo) || {}).label || 'Pagamento';
      const valor = l.valor > 0 ? ` — ${formatMoney(l.valor)} MT` : '';
      alertas.push({ tipo: 'lembrete', texto: `${nome}: ${textoPrazo(o.dias)}${valor}. Toca para ver.` });
    });
    const agora = new Date();
    if (agora.getHours() >= 17 && transacoes.some((t) => t.dateKey === HOJE_KEY) && !fechos[HOJE_KEY]) {
      alertas.push({ tipo: 'fecho', texto: 'Ainda não fizeste o fecho de hoje. Toca para conferir o dinheiro.' });
    }
    return alertas;
  }, [fiados, produtos, saldoFiado, lembretes, transacoes, fechos]);

  /* ---------- Backup ---------- */
  const exportarBackup = useCallback(() => {
    const dados = { versao: 1, exportadoEm: new Date().toISOString() };
    BACKUP_KEYS.forEach((k) => { dados[k] = readJSON(k, k.includes('saldoInicial') ? {} : (k === STORAGE_NOME_USUARIO ? '' : [])); });
    const blob = new Blob([JSON.stringify(dados, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `minha-carteira-backup-${HOJE_KEY}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, []);

  const importarBackup = useCallback((dados) => {
    BACKUP_KEYS.forEach((k) => { if (dados[k] !== undefined) localStorage.setItem(k, JSON.stringify(dados[k])); });
    location.reload();
  }, []);

  const value = {
    transacoes, saldoInicialMap, participantes, pagamentos, entregas, movimentosPoupanca, fiados, produtos, usuarioNome,
    carregandoDados,
    setUsuarioNome: setUsuarioNomeState,
    getSaldoInicial, saldoFechamentoDia,
    saldoInicialGlobal, setSaldoInicialGlobal,
    getSaldoInicialSetor, saldoInicialSetorDefinidoHoje, setSaldoInicialSetorHoje, sugestaoSaldoInicialSetor,
    saldoFechamentoDiaSetor, precisaMigrarSaldoInicialHoje, saldoInicialLegadoHoje,
    saldoProdutosHoje, saldoMaquinaHoje, totalEntradasSetorHoje, totalSaidasSetorHoje,
    doHoje, totalEntradasHoje, totalSaidasHoje, saldoHoje, totalProdutosHoje, totalMaquinaHoje, lucroRealHojeCalc,
    addTransacao, registarDespesa, nomesPagos, registrarVendaComStock, deleteTransacao, deleteDia, historicoDias,
    pagouHoje, pagouDia, salvarParticipante, deleteParticipante, desmarcarPagamento, registrarPagamento,
    totalGuardadoXitique, registrarEntrega, deleteEntrega,
    totalPoupancaCalc, guardarPoupanca, depositosSemSaida, descontarDepositosAntigos, retirarPoupanca, deleteMovimentoPoupanca, guardadoMesAtual,
    metas, addMeta, deleteMeta, saldoPorMetodo,
    saldoFiado, statusFiado, nomesClientesFiado, salvarFiado, aumentarFiado, editarFiado, registarRecebimentoFiado, deleteFiado,
    salvarProduto, deleteProduto, reporProduto,
    negocio, setNegocio, fechos, salvarFecho, lembretes, addLembrete, deleteLembrete, marcarLembretePago,
    computeAlertas, exportarBackup, importarBackup,
  };

  return <DataContext.Provider value={value}>{children}</DataContext.Provider>;
}

export function useData() {
  const ctx = useContext(DataContext);
  if (!ctx) throw new Error('useData deve ser usado dentro de <DataProvider>');
  return ctx;
}
