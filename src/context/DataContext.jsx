import { createContext, useContext, useEffect, useRef, useState, useCallback, useMemo } from 'react';
import { HOJE_KEY, amanhaKey, novoId, mesAtualLabel } from '../utils/format';
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
    { id: 'venda', label: 'Venda de Produtos', icon: '🧺' },
    { id: 'maquina', label: 'Máquina de Moer', icon: '⚙️' },
    { id: 'outra_entrada', label: 'Outra Entrada', icon: '➕' },
  ],
  saida: [
    { id: 'almoco', label: 'Almoço', icon: '🍽️' },
    { id: 'transporte', label: 'Transporte', icon: '🚌' },
    { id: 'troco', label: 'Troco Dado', icon: '💱' },
    { id: 'outra_saida', label: 'Outra Saída', icon: '➖' },
  ],
};
export const CAT_LOOKUP = [...CATEGORIAS.entrada, ...CATEGORIAS.saida].reduce((acc, c) => { acc[c.id] = c; return acc; }, {});
CAT_LOOKUP['poupanca'] = { id: 'poupanca', label: 'Para Poupança', icon: '🐷' };
CAT_LOOKUP['fiado_recebido'] = { id: 'fiado_recebido', label: 'Fiado Recebido', icon: '📒' };
CAT_LOOKUP['fiado_sinal'] = { id: 'fiado_sinal', label: 'Sinal de Fiado', icon: '📒' };

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

  const getSaldoInicialSetor = useCallback((dk, setor) => {
    const v = normalizarSaldoInicialDia(saldoInicialMap[dk]);
    return v ? (v[setor] || 0) : 0;
  }, [saldoInicialMap, normalizarSaldoInicialDia]);

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
    const chaves = new Set([...transacoes.map((t) => t.dateKey), ...Object.keys(saldoInicialMap)]);
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

  const addTransacao = useCallback(({ tipo, categoria, valor, nota, setor = 'produtos', produtoId = null, quantidade = null, custoTotal = 0 }) => {
    const agora = Date.now();
    const tx = { id: novoId(), tipo, categoria, valor, nota, setor, timestamp: agora, dateKey: HOJE_KEY };
    if (produtoId) { tx.produtoId = produtoId; tx.quantidade = quantidade; tx.custoTotal = custoTotal; }
    setTransacoes((arr) => [...arr, tx]);
    return tx;
  }, [setTransacoes]);

  const registrarVendaComStock = useCallback(({ tipo, categoria, valor, nota, setor = 'produtos', produtoId, quantidade }) => {
    const p = produtos.find((x) => x.id === produtoId);
    if (!p) return { erro: 'Esse produto já não existe no stock.' };
    if (quantidade > p.quantidade) return { erro: `Só tens ${p.quantidade} unidades de "${p.nome}" em stock.` };
    const custoTotal = quantidade * p.precoCusto;
    setProdutos((arr) => arr.map((x) => (x.id === produtoId ? { ...x, quantidade: x.quantidade - quantidade } : x)));
    const notaFinal = nota ? `${p.nome} x${quantidade} · ${nota}` : `${p.nome} x${quantidade}`;
    addTransacao({ tipo, categoria, valor, nota: notaFinal, setor, produtoId, quantidade, custoTotal });
    return { ok: true };
  }, [produtos, setProdutos, addTransacao]);

  const deleteTransacao = useCallback((id) => {
    const t = transacoes.find((x) => x.id === id);
    if (t && t.produtoId) {
      setProdutos((arr) => arr.map((p) => (p.id === t.produtoId ? { ...p, quantidade: p.quantidade + (t.quantidade || 0) } : p)));
    }
    setTransacoes((arr) => arr.filter((x) => x.id !== id));
  }, [transacoes, setTransacoes, setProdutos]);

  const deleteDia = useCallback((dk) => {
    setTransacoes((arr) => arr.filter((t) => t.dateKey !== dk));
    setSaldoInicialMap((m) => { const n = { ...m }; delete n[dk]; return n; });
  }, [setTransacoes, setSaldoInicialMap]);

  const historicoDias = useMemo(() => {
    const chavesSet = new Set();
    transacoes.forEach((t) => { if (t.dateKey !== HOJE_KEY) chavesSet.add(t.dateKey); });
    Object.keys(saldoInicialMap).forEach((k) => { if (k !== HOJE_KEY) chavesSet.add(k); });
    return [...chavesSet].sort((a, b) => b.localeCompare(a));
  }, [transacoes, saldoInicialMap]);

  /* ---------- Xitique ---------- */
  const pagouHoje = useCallback((participanteId) => pagamentos.some((p) => p.participanteId === participanteId && p.dateKey === HOJE_KEY), [pagamentos]);

  const salvarParticipante = useCallback(({ id, nome, valorCombinado }) => {
    if (id) {
      setParticipantes((arr) => arr.map((p) => (p.id === id ? { ...p, nome, valorCombinado } : p)));
    } else {
      setParticipantes((arr) => [...arr, { id: novoId(), nome, valorCombinado }]);
    }
  }, [setParticipantes]);

  const deleteParticipante = useCallback((id) => {
    setParticipantes((arr) => arr.filter((x) => x.id !== id));
    setPagamentos((arr) => arr.filter((x) => x.participanteId !== id));
  }, [setParticipantes, setPagamentos]);

  const desmarcarPagamento = useCallback((participanteId) => {
    setPagamentos((arr) => arr.filter((p) => !(p.participanteId === participanteId && p.dateKey === HOJE_KEY)));
  }, [setPagamentos]);

  const registrarPagamento = useCallback((participanteId, valor) => {
    setPagamentos((arr) => [...arr, { id: novoId(), participanteId, valor, dateKey: HOJE_KEY, timestamp: Date.now() }]);
  }, [setPagamentos]);

  const totalGuardadoXitique = useMemo(() => {
    const totalPago = pagamentos.reduce((s, p) => s + p.valor, 0);
    const totalEntregue = entregas.reduce((s, e) => s + e.valor, 0);
    return totalPago - totalEntregue;
  }, [pagamentos, entregas]);

  const registrarEntrega = useCallback((valor, participanteId) => {
    const participante = participantes.find((p) => p.id === participanteId);
    if (!participante) return;
    setEntregas((arr) => [...arr, { id: novoId(), valor, participanteId, nota: participante.nome, dateKey: HOJE_KEY, timestamp: Date.now() }]);
  }, [participantes, setEntregas]);

  const deleteEntrega = useCallback((id) => {
    setEntregas((arr) => arr.filter((e) => e.id !== id));
  }, [setEntregas]);

  /* ---------- Poupança ---------- */
  const totalPoupancaCalc = useMemo(() => movimentosPoupanca.reduce((s, m) => (m.tipo === 'deposito' ? s + m.valor : s - m.valor), 0), [movimentosPoupanca]);

  const guardarPoupanca = useCallback((valor, nota) => {
    // Assunção: retirada para poupança sai do saldo de Produtos (dinheiro geral do bolso).
    const tx = addTransacao({ tipo: 'saida', categoria: 'poupanca', valor, nota: nota || 'Transferido para Poupança', setor: 'produtos' });
    setMovimentosPoupanca((arr) => [...arr, { id: novoId(), tipo: 'deposito', valor, nota, timestamp: tx.timestamp, dateKey: HOJE_KEY, txId: tx.id }]);
  }, [addTransacao, setMovimentosPoupanca]);

  const retirarPoupanca = useCallback((valor, nota) => {
    setMovimentosPoupanca((arr) => [...arr, { id: novoId(), tipo: 'retirada', valor, nota, timestamp: Date.now(), dateKey: HOJE_KEY }]);
  }, [setMovimentosPoupanca]);

  const deleteMovimentoPoupanca = useCallback((id) => {
    const m = movimentosPoupanca.find((x) => x.id === id);
    if (!m) return;
    if (m.tipo === 'deposito' && m.txId) {
      setTransacoes((arr) => arr.filter((t) => t.id !== m.txId));
    }
    setMovimentosPoupanca((arr) => arr.filter((x) => x.id !== id));
  }, [movimentosPoupanca, setMovimentosPoupanca, setTransacoes]);

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

  const registarRecebimentoFiado = useCallback((fiadoId, valor, categoria, nota) => {
    const fiado = fiados.find((f) => f.id === fiadoId);
    if (!fiado) return;
    const custoProporcional = fiado.custoTotal ? Math.round((fiado.custoTotal * (valor / fiado.valorTotal)) * 100) / 100 : 0;
    addTransacao({
      tipo: 'entrada', categoria, valor, nota, setor: 'produtos', // fiado é sempre venda de produtos
      produtoId: fiado.produtoStockId && custoProporcional > 0 ? fiado.produtoStockId : null,
      custoTotal: custoProporcional,
    });
    setFiados((arr) => arr.map((f) => (f.id === fiadoId
      ? { ...f, valorPago: Math.round(((f.valorPago || 0) + valor) * 100) / 100, pagamentos: [...f.pagamentos, { valor, timestamp: Date.now() }] }
      : f)));
  }, [fiados, addTransacao, setFiados]);

  const salvarFiado = useCallback(({ cliente, produtoStockId, produtoDescricao, quantidade, valorTotal, valorPago, vencimento }) => {
    let custoTotal = 0;
    if (produtoStockId) {
      const p = produtos.find((x) => x.id === produtoStockId);
      if (!p) return { erro: 'Esse produto já não existe no stock.' };
      if (quantidade > p.quantidade) return { erro: `Só tens ${p.quantidade} unidades de "${p.nome}" em stock.` };
      custoTotal = quantidade * p.precoCusto;
      setProdutos((arr) => arr.map((x) => (x.id === produtoStockId ? { ...x, quantidade: x.quantidade - quantidade } : x)));
    }
    const agora = Date.now();
    const fiado = {
      id: novoId(), cliente, produto: produtoDescricao, produtoStockId: produtoStockId || null,
      quantidade, custoTotal, valorTotal, valorPago: 0, vencimento, criadoEm: agora, pagamentos: [],
    };
    setFiados((arr) => [...arr, fiado]);
    if (valorPago > 0) {
      // aplicado depois de o fiado existir no estado (próximo render); usamos valor calculado diretamente
      setTimeout(() => registarRecebimentoFiado(fiado.id, valorPago, 'fiado_sinal', 'Sinal - fiado ' + cliente), 0);
    }
    return { ok: true };
  }, [produtos, setProdutos, setFiados, registarRecebimentoFiado]);

  const deleteFiado = useCallback((id) => {
    const f = fiados.find((x) => x.id === id);
    if (!f) return;
    if (f.produtoStockId && f.quantidade) {
      setProdutos((arr) => arr.map((p) => (p.id === f.produtoStockId ? { ...p, quantidade: p.quantidade + f.quantidade } : p)));
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

  /* ---------- Alertas ---------- */
  const computeAlertas = useCallback(() => {
    const alertas = [];
    const amanha = amanhaKey();
    const ativos = fiados.filter((f) => saldoFiado(f) > 0);
    const vencidos = ativos.filter((f) => f.vencimento && f.vencimento < HOJE_KEY);
    const venceAmanha = ativos.filter((f) => f.vencimento === amanha);
    if (vencidos.length) {
      const total = vencidos.reduce((s, f) => s + saldoFiado(f), 0);
      alertas.push({ tipo: 'fiado', total, count: vencidos.length, texto: `🔴 ${vencidos.length} fiado(s) vencido(s) — ${total.toFixed(2)} MT por receber. Toca para ver.` });
    }
    if (venceAmanha.length) {
      const total = venceAmanha.reduce((s, f) => s + saldoFiado(f), 0);
      alertas.push({ tipo: 'fiado', total, count: venceAmanha.length, texto: `🟠 ${venceAmanha.length} fiado(s) vence(m) amanhã — ${total.toFixed(2)} MT. Toca para ver.` });
    }
    const baixos = produtos.filter((p) => p.quantidade <= (p.alertaEm !== undefined ? p.alertaEm : 3));
    if (baixos.length) {
      const nomes = baixos.slice(0, 3).map((p) => p.nome).join(', ');
      alertas.push({ tipo: 'stock', texto: `📦 Stock baixo: ${nomes}${baixos.length > 3 ? '…' : ''}. Toca para repor.` });
    }
    return alertas;
  }, [fiados, produtos, saldoFiado]);

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
    getSaldoInicialSetor, saldoInicialSetorDefinidoHoje, setSaldoInicialSetorHoje, sugestaoSaldoInicialSetor,
    saldoFechamentoDiaSetor, precisaMigrarSaldoInicialHoje, saldoInicialLegadoHoje,
    saldoProdutosHoje, saldoMaquinaHoje, totalEntradasSetorHoje, totalSaidasSetorHoje,
    doHoje, totalEntradasHoje, totalSaidasHoje, saldoHoje, totalProdutosHoje, totalMaquinaHoje, lucroRealHojeCalc,
    addTransacao, registrarVendaComStock, deleteTransacao, deleteDia, historicoDias,
    pagouHoje, salvarParticipante, deleteParticipante, desmarcarPagamento, registrarPagamento,
    totalGuardadoXitique, registrarEntrega, deleteEntrega,
    totalPoupancaCalc, guardarPoupanca, retirarPoupanca, deleteMovimentoPoupanca, guardadoMesAtual,
    saldoFiado, statusFiado, nomesClientesFiado, salvarFiado, registarRecebimentoFiado, deleteFiado,
    salvarProduto, deleteProduto, reporProduto,
    computeAlertas, exportarBackup, importarBackup,
  };

  return <DataContext.Provider value={value}>{children}</DataContext.Provider>;
}

export function useData() {
  const ctx = useContext(DataContext);
  if (!ctx) throw new Error('useData deve ser usado dentro de <DataProvider>');
  return ctx;
}
