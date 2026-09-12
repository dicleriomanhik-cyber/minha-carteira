import { useMemo, useState } from 'react';
import Modal from './Modal';
import PillButton from './PillButton';
import { useData } from '../context/DataContext';
import { CAT_LOOKUP } from '../context/DataContext';
import { formatMoney, formatDataCurta, periodoLabel, HOJE_KEY, seteDiasAtrasKey } from '../utils/format';

function dentroPeriodo(dk, periodo) {
  if (periodo === 'dia') return dk === HOJE_KEY;
  if (periodo === 'semana') return dk >= seteDiasAtrasKey() && dk <= HOJE_KEY;
  if (periodo === 'mes') return dk.slice(0, 7) === HOJE_KEY.slice(0, 7);
  return false;
}

function Linha({ label, valor }) {
  return (
    <div className="flex items-center justify-between py-1.5 text-sm">
      <span className="text-[var(--ink-soft)]">{label}</span>
      <span className="font-mono-ref font-semibold text-[var(--ink)]">{formatMoney(valor)} MT</span>
    </div>
  );
}

function LinhaSaidaSetor({ label, produtos, maquina, total, destaque }) {
  return (
    <div className={`flex items-center justify-between py-1.5 text-sm ${destaque ? 'font-semibold' : ''}`}>
      <span className={destaque ? 'text-[var(--ink)]' : 'text-[var(--ink-soft)]'}>{label}</span>
      <span className="font-mono-ref flex gap-3 text-[var(--ink)]">
        <span className="w-16 text-right text-[var(--ink-soft)]">{formatMoney(produtos)}</span>
        <span className="w-16 text-right text-[var(--ink-soft)]">{formatMoney(maquina)}</span>
        <span className="w-16 text-right font-semibold">{formatMoney(total)}</span>
      </span>
    </div>
  );
}

function Seccao({ titulo, children }) {
  return (
    <div className="mt-4 first:mt-0">
      <p className="text-xs font-semibold uppercase tracking-wide text-[var(--mango)]">{titulo}</p>
      <div className="mt-1 divide-y divide-[var(--ink)]/5">{children}</div>
    </div>
  );
}

export default function RelatorioModal({ aberto, aoFechar }) {
  const [periodo, setPeriodo] = useState('dia');
  const { transacoes, pagamentos, entregas, movimentosPoupanca, fiados, saldoFiado } = useData();

  const dados = useMemo(() => {
    const txs = transacoes.filter((t) => dentroPeriodo(t.dateKey, periodo));
    const totalEntradas = txs.filter((t) => t.tipo === 'entrada').reduce((s, t) => s + t.valor, 0);
    const totalSaidas = txs.filter((t) => t.tipo === 'saida').reduce((s, t) => s + t.valor, 0);
    const totalProdutos = txs.filter((t) => t.tipo === 'entrada' && t.categoria === 'venda').reduce((s, t) => s + t.valor, 0);
    const totalMaquina = txs.filter((t) => t.tipo === 'entrada' && t.categoria === 'maquina').reduce((s, t) => s + t.valor, 0);
    const pagXitique = pagamentos.filter((p) => dentroPeriodo(p.dateKey, periodo)).reduce((s, p) => s + p.valor, 0);
    const entXitique = entregas.filter((e) => dentroPeriodo(e.dateKey, periodo)).reduce((s, e) => s + e.valor, 0);
    const guardadoPoupanca = movimentosPoupanca.filter((m) => m.tipo === 'deposito' && dentroPeriodo(m.dateKey, periodo)).reduce((s, m) => s + m.valor, 0);
    const retiradoPoupanca = movimentosPoupanca.filter((m) => m.tipo === 'retirada' && dentroPeriodo(m.dateKey, periodo)).reduce((s, m) => s + m.valor, 0);
    const recebidoFiados = txs.filter((t) => t.tipo === 'entrada' && (t.categoria === 'fiado_recebido' || t.categoria === 'fiado_sinal')).reduce((s, t) => s + t.valor, 0);
    const emAbertoFiados = fiados.filter((f) => saldoFiado(f) > 0).reduce((s, f) => s + saldoFiado(f), 0);
    const vendasComStock = txs.filter((t) => t.tipo === 'entrada' && t.produtoId);
    const receitaStock = vendasComStock.reduce((s, t) => s + t.valor, 0);
    const custoStock = vendasComStock.reduce((s, t) => s + (t.custoTotal || 0), 0);

    const porDiaMap = new Map();
    txs.forEach((t) => {
      const atual = porDiaMap.get(t.dateKey) || { dateKey: t.dateKey, entradas: 0, saidas: 0 };
      if (t.tipo === 'entrada') atual.entradas += t.valor; else atual.saidas += t.valor;
      porDiaMap.set(t.dateKey, atual);
    });
    const porDia = Array.from(porDiaMap.values()).sort((a, b) => (a.dateKey < b.dateKey ? 1 : -1));

    // Saídas: resumo de todos os movimentos de saída (todas as áreas do Caixa), por categoria e por setor.
    const categoriasSaidaPresentes = [...new Set(txs.filter((t) => t.tipo === 'saida').map((t) => t.categoria))];
    const saidasPorCategoria = categoriasSaidaPresentes.map((catId) => {
      const doCat = txs.filter((t) => t.tipo === 'saida' && t.categoria === catId);
      const produtos = doCat.filter((t) => (t.setor || 'produtos') === 'produtos').reduce((s, t) => s + t.valor, 0);
      const maquina = doCat.filter((t) => t.setor === 'maquina').reduce((s, t) => s + t.valor, 0);
      return { categoria: catId, produtos, maquina, total: produtos + maquina };
    }).sort((a, b) => b.total - a.total);
    const saidasProdutosTotal = saidasPorCategoria.reduce((s, c) => s + c.produtos, 0);
    const saidasMaquinaTotal = saidasPorCategoria.reduce((s, c) => s + c.maquina, 0);

    return {
      totalEntradas, totalSaidas, totalProdutos, totalMaquina, pagXitique, entXitique, guardadoPoupanca, retiradoPoupanca,
      recebidoFiados, emAbertoFiados, receitaStock, custoStock, porDia,
      saidasPorCategoria, saidasProdutosTotal, saidasMaquinaTotal,
    };
  }, [periodo, transacoes, pagamentos, entregas, movimentosPoupanca, fiados, saldoFiado]);

  return (
    <Modal titulo="Relatório" aberto={aberto} aoFechar={aoFechar} tamanho="larga">
      <div className="flex gap-2">
        <PillButton ativo={periodo === 'dia'} onClick={() => setPeriodo('dia')}>Diário</PillButton>
        <PillButton ativo={periodo === 'semana'} onClick={() => setPeriodo('semana')}>Semanal</PillButton>
        <PillButton ativo={periodo === 'mes'} onClick={() => setPeriodo('mes')}>Mensal</PillButton>
      </div>

      <p className="mt-3 text-center text-xs font-medium capitalize text-[var(--ink-soft)]">{periodoLabel(periodo)}</p>

      <Seccao titulo="Caixa do Dia">
        <Linha label="Entradas" valor={dados.totalEntradas} />
        <Linha label="🧺 Produtos" valor={dados.totalProdutos} />
        <Linha label="⚙️ Máquina" valor={dados.totalMaquina} />
        <Linha label="Saídas" valor={dados.totalSaidas} />
      </Seccao>

      <Seccao titulo="Saídas (todas as áreas)">
        {dados.saidasPorCategoria.length === 0 ? (
          <p className="py-2 text-sm text-[var(--ink-soft)]">Sem saídas neste período.</p>
        ) : (
          <>
            <div className="flex items-center justify-between py-1 text-[10px] font-semibold uppercase tracking-wide text-[var(--ink-soft)]">
              <span>Categoria</span>
              <span className="flex gap-3">
                <span className="w-16 text-right">🧺 Prod.</span>
                <span className="w-16 text-right">⚙️ Máq.</span>
                <span className="w-16 text-right">Total</span>
              </span>
            </div>
            {dados.saidasPorCategoria.map((c) => {
              const cat = CAT_LOOKUP[c.categoria] || { icon: '💰', label: c.categoria };
              return <LinhaSaidaSetor key={c.categoria} label={`${cat.icon} ${cat.label}`} produtos={c.produtos} maquina={c.maquina} total={c.total} />;
            })}
            <LinhaSaidaSetor label="Total Geral" produtos={dados.saidasProdutosTotal} maquina={dados.saidasMaquinaTotal} total={dados.totalSaidas} destaque />
          </>
        )}
      </Seccao>

      {periodo !== 'dia' && dados.porDia.length > 0 && (
        <Seccao titulo="Lançamentos por dia">
          {dados.porDia.map((d) => (
            <div key={d.dateKey} className="flex items-center justify-between py-1.5 text-sm">
              <span className="text-[var(--ink-soft)]">{formatDataCurta(d.dateKey)}</span>
              <span className="font-mono-ref text-xs">
                <span className="font-semibold text-[var(--ink)]">+{formatMoney(d.entradas)}</span>
                {d.saidas > 0 && <span className="ml-1.5 text-[var(--brick)]">-{formatMoney(d.saidas)}</span>}
                <span className="ml-1 text-[var(--ink-soft)]">MT</span>
              </span>
            </div>
          ))}
        </Seccao>
      )}

      <Seccao titulo="Stock / Lucro Real">
        <Linha label="Vendeste (ligado ao stock)" valor={dados.receitaStock} />
        <Linha label="Custo da mercadoria" valor={dados.custoStock} />
        <Linha label="Lucro real" valor={dados.receitaStock - dados.custoStock} />
      </Seccao>

      <Seccao titulo="Fiados">
        <Linha label="Recebido no período" valor={dados.recebidoFiados} />
        <Linha label="Em aberto (total atual)" valor={dados.emAbertoFiados} />
      </Seccao>

      <Seccao titulo="Xitique">
        <Linha label="Recebido dos participantes" valor={dados.pagXitique} />
        <Linha label="Entregue" valor={dados.entXitique} />
      </Seccao>

      <Seccao titulo="Poupança">
        <Linha label="Guardado" valor={dados.guardadoPoupanca} />
        <Linha label="Retirado" valor={dados.retiradoPoupanca} />
      </Seccao>
    </Modal>
  );
}
