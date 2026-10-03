import { useMemo, useState } from 'react';
import Modal from './Modal';
import PillButton from './PillButton';
import { useData } from '../context/DataContext';
import { CAT_LOOKUP, DESPESA_GRUPOS, DESPESA_IDS } from '../context/DataContext';
import { calcResultado, calcEquilibrio } from '../utils/resultado';
import { vendasPorDia, destinoDinheiro, ultimosMeses } from '../utils/graficos';
import { GraficoVendasDia, GraficoDestino, GraficoMeses } from './Graficos';
import { HOJE_KEY, semEmoji, formatMoney, formatDataCurta, formatDataLonga, periodoLabel, dateKey } from '../utils/format';

const MESES_LONGO = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];

// Intervalo [início, fim] do período. desloc=0 é o atual; 1 é o anterior; e assim por diante.
function intervalo(periodo, desloc) {
  if (periodo === 'tudo') return ['0000-00-00', '9999-99-99'];
  const base = new Date();
  base.setHours(12, 0, 0, 0);
  if (periodo === 'dia') {
    const d = new Date(base); d.setDate(d.getDate() - desloc);
    return [dateKey(d), dateKey(d)];
  }
  if (periodo === 'semana') {
    const fim = new Date(base); fim.setDate(fim.getDate() - 7 * desloc);
    const ini = new Date(fim); ini.setDate(ini.getDate() - 6);
    return [dateKey(ini), dateKey(fim)];
  }
  const ini = new Date(base.getFullYear(), base.getMonth() - desloc, 1, 12);
  const fim = new Date(ini.getFullYear(), ini.getMonth() + 1, 0, 12);
  return [dateKey(ini), dateKey(fim)];
}

function dentroPeriodo(dk, periodo, desloc) {
  const [a, b] = intervalo(periodo, desloc);
  return dk >= a && dk <= b;
}

function rotuloPeriodo(periodo, desloc) {
  if (periodo === 'tudo') return 'Desde o primeiro registo';
  if (desloc === 0) return periodoLabel(periodo);
  const [a, b] = intervalo(periodo, desloc);
  if (periodo === 'dia') return formatDataLonga(a);
  if (periodo === 'semana') return `${formatDataLonga(a)} — ${formatDataLonga(b)}`;
  return `${MESES_LONGO[Number(a.slice(5, 7)) - 1]} de ${a.slice(0, 4)}`;
}

function Linha({ label, valor }) {
  return (
    <div className="flex items-center justify-between py-1.5 text-sm">
      <span className="text-[var(--ink-soft)]">{label}</span>
      <span className="font-mono-ref font-semibold text-[var(--ink)]">{formatMoney(valor)} MT</span>
    </div>
  );
}

function ItemFiado({ titulo, sub, valor, sinal, bom }) {
  const verde = bom !== undefined ? bom : sinal !== '+';
  return (
    <div className="flex items-start justify-between gap-3 py-1.5 text-sm">
      <span className="min-w-0">
        <span className="block truncate text-[var(--ink)]">{titulo}</span>
        <span className="block text-[11.5px] text-[var(--ink-soft)]">{sub}</span>
      </span>
      <span className={`font-mono-ref shrink-0 font-semibold ${verde ? 'text-[var(--teal)]' : 'text-[var(--brick)]'}`}>{sinal} {formatMoney(valor)} MT</span>
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

export default function RelatorioModal({ aberto, aoFechar, periodoInicial = 'dia' }) {
  const [periodo, setPeriodo] = useState(periodoInicial);
  const [desloc, setDesloc] = useState(0);
  const { transacoes, pagamentos, entregas, movimentosPoupanca, fiados, saldoFiado, metas, totalPoupancaCalc } = useData();

  const dados = useMemo(() => {
    const txs = transacoes.filter((t) => dentroPeriodo(t.dateKey, periodo, desloc));
    const totalEntradas = txs.filter((t) => t.tipo === 'entrada').reduce((s, t) => s + t.valor, 0);
    const totalSaidas = txs.filter((t) => t.tipo === 'saida').reduce((s, t) => s + t.valor, 0);
    const totalProdutos = txs.filter((t) => t.tipo === 'entrada' && t.categoria === 'venda').reduce((s, t) => s + t.valor, 0);
    const totalMaquina = txs.filter((t) => t.tipo === 'entrada' && t.categoria === 'maquina').reduce((s, t) => s + t.valor, 0);
    const pagXitique = pagamentos.filter((p) => dentroPeriodo(p.dateKey, periodo, desloc)).reduce((s, p) => s + p.valor, 0);
    const entXitique = entregas.filter((e) => dentroPeriodo(e.dateKey, periodo, desloc)).reduce((s, e) => s + e.valor, 0);
    const guardadoPoupanca = movimentosPoupanca.filter((m) => m.tipo === 'deposito' && dentroPeriodo(m.dateKey, periodo, desloc)).reduce((s, m) => s + m.valor, 0);
    const retiradoPoupanca = movimentosPoupanca.filter((m) => m.tipo === 'retirada' && dentroPeriodo(m.dateKey, periodo, desloc)).reduce((s, m) => s + m.valor, 0);
    const recebidoFiados = txs.filter((t) => t.tipo === 'entrada' && (t.categoria === 'fiado_recebido' || t.categoria === 'fiado_sinal')).reduce((s, t) => s + t.valor, 0);
    const emAbertoFiados = fiados.filter((f) => saldoFiado(f) > 0).reduce((s, f) => s + saldoFiado(f), 0);
    const arred = (n) => Math.round(n * 100) / 100;
    const dkDe = (ts) => dateKey(new Date(ts));
    const fiadosFeitos = [];
    const fiadosPagos = [];
    fiados.forEach((f) => {
      const aumentos = f.aumentos || [];
      const feitoEm = dkDe(f.criadoEm);
      if (dentroPeriodo(feitoEm, periodo, desloc)) {
        const inicial = arred((f.valorTotal || 0) - aumentos.reduce((s, a) => s + a.valor, 0));
        fiadosFeitos.push({ chave: f.id + '-novo', cliente: f.cliente, texto: f.produtoInicial || f.produto, valor: inicial, ts: f.criadoEm, aumento: false });
      }
      aumentos.forEach((a, i) => {
        if (dentroPeriodo(dkDe(a.timestamp), periodo, desloc)) {
          fiadosFeitos.push({ chave: f.id + '-aum' + i, cliente: f.cliente, texto: a.descricao, valor: a.valor, ts: a.timestamp, aumento: true });
        }
      });
      (f.pagamentos || []).forEach((p, i) => {
        if (dentroPeriodo(dkDe(p.timestamp), periodo, desloc)) {
          fiadosPagos.push({ chave: f.id + '-pag' + i, cliente: f.cliente, texto: f.produto, valor: p.valor, ts: p.timestamp, feitoEm, pagoEm: dkDe(p.timestamp) });
        }
      });
    });
    fiadosFeitos.sort((a, b) => b.ts - a.ts);
    fiadosPagos.sort((a, b) => b.ts - a.ts);
    const totalFiadosFeitos = fiadosFeitos.reduce((s, x) => s + x.valor, 0);
    const totalFiadosPagos = fiadosPagos.reduce((s, x) => s + x.valor, 0);
    const movsPoupanca = movimentosPoupanca
      .filter((m) => dentroPeriodo(m.dateKey || dateKey(new Date(m.timestamp)), periodo, desloc))
      .sort((a, b) => b.timestamp - a.timestamp)
      .map((m) => ({ ...m, meta: (metas.find((x) => x.id === m.metaId) || {}).nome }));
    const vendasComStock = txs.filter((t) => t.tipo === 'entrada' && t.produtoId);
    const receitaStock = vendasComStock.reduce((s, t) => s + t.valor, 0);
    const custoStock = vendasComStock.reduce((s, t) => s + (t.custoTotal || 0), 0);

    const despTxs = txs.filter((t) => t.tipo === 'saida' && DESPESA_IDS.has(t.categoria)).sort((a, b) => b.timestamp - a.timestamp);
    const despPorGrupo = DESPESA_GRUPOS.map((g) => ({
      label: g.label,
      total: despTxs.filter((t) => g.itens.some((i) => i.id === t.categoria)).reduce((s, t) => s + t.valor, 0),
    })).filter((g) => g.total > 0);
    const totalDespesas = despTxs.reduce((s, t) => s + t.valor, 0);

    const res = calcResultado(txs);
    const resAnt = periodo === 'tudo' ? null : calcResultado(transacoes.filter((t) => dentroPeriodo(t.dateKey, periodo, desloc + 1)));
    const equilibrio = periodo === 'mes' ? calcEquilibrio(res) : null;
    let diasMes = 0; let diasRestantes = 0;
    if (periodo === 'mes') {
      const [, fim] = intervalo('mes', desloc);
      diasMes = Number(fim.slice(8, 10));
      diasRestantes = desloc === 0 ? Math.max(1, diasMes - Number(HOJE_KEY.slice(8, 10)) + 1) : 0;
    }

    // Gráficos: vendas dia a dia (semana e mês, no mês actual só até hoje), destino do dinheiro e últimos 6 meses.
    let diasGrafico = [];
    if (periodo === 'semana' || periodo === 'mes') {
      const [ini, fim] = intervalo(periodo, desloc);
      diasGrafico = vendasPorDia(transacoes, ini, fim > HOJE_KEY ? HOJE_KEY : fim);
    }
    const destino = destinoDinheiro(res);
    let meses = [];
    if (periodo === 'mes') {
      const [ini] = intervalo('mes', desloc);
      meses = ultimosMeses(transacoes, new Date(Number(ini.slice(0, 4)), Number(ini.slice(5, 7)) - 1, 1, 12), 6);
    }

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
      recebidoFiados, emAbertoFiados, movsPoupanca, fiadosFeitos, fiadosPagos, totalFiadosFeitos, totalFiadosPagos, receitaStock, custoStock, porDia,
      diasGrafico, destino, meses, saidasPorCategoria, saidasProdutosTotal, saidasMaquinaTotal, despTxs, despPorGrupo, totalDespesas, res, resAnt, equilibrio, diasMes, diasRestantes,
    };
  }, [periodo, desloc, transacoes, pagamentos, entregas, movimentosPoupanca, fiados, saldoFiado, metas]);

  return (
    <Modal titulo="Relatório" aberto={aberto} aoFechar={aoFechar} tamanho="larga">
      <div className="flex gap-2">
        <PillButton ativo={periodo === 'dia'} onClick={() => { setPeriodo('dia'); setDesloc(0); }}>Diário</PillButton>
        <PillButton ativo={periodo === 'semana'} onClick={() => { setPeriodo('semana'); setDesloc(0); }}>Semanal</PillButton>
        <PillButton ativo={periodo === 'mes'} onClick={() => { setPeriodo('mes'); setDesloc(0); }}>Mensal</PillButton>
        <PillButton ativo={periodo === 'tudo'} onClick={() => { setPeriodo('tudo'); setDesloc(0); }}>Total</PillButton>
      </div>

      <div className="mt-3 flex items-center justify-between gap-2">
        <button type="button" aria-label="Período anterior" disabled={periodo === 'tudo'} onClick={() => setDesloc((d) => d + 1)} className="rounded-full px-3 py-1 text-lg text-[var(--ink)] disabled:opacity-30">‹</button>
        <p className="flex-1 text-center text-xs font-medium capitalize text-[var(--ink-soft)]">{rotuloPeriodo(periodo, desloc)}</p>
        <button type="button" aria-label="Período seguinte" disabled={periodo === 'tudo' || desloc === 0} onClick={() => setDesloc((d) => Math.max(0, d - 1))} className="rounded-full px-3 py-1 text-lg text-[var(--ink)] disabled:opacity-30">›</button>
      </div>

      <Seccao titulo="Lucro Líquido">
        {!dados.res.temDados ? (
          <p className="py-2 text-sm text-[var(--ink-soft)]">Sem movimentos neste período.</p>
        ) : (
          <>
            <div className="mb-2 rounded-2xl p-3.5" style={{ background: dados.res.lucroLiquido >= 0 ? 'var(--teal-soft)' : 'var(--brick-soft)' }}>
              <p className="text-[11px] font-semibold uppercase tracking-wide" style={{ color: dados.res.lucroLiquido >= 0 ? 'var(--teal)' : 'var(--brick)' }}>
                {dados.res.lucroLiquido >= 0 ? 'Lucro do período' : 'Prejuízo do período'}
              </p>
              <p className="font-display mt-0.5 text-2xl font-bold" style={{ color: dados.res.lucroLiquido >= 0 ? 'var(--teal)' : 'var(--brick)' }}>
                {formatMoney(dados.res.lucroLiquido)} <span className="text-sm">MT</span>
              </p>
              {dados.resAnt && dados.resAnt.temDados && (() => {
                const dif = Math.round((dados.res.lucroLiquido - dados.resAnt.lucroLiquido) * 100) / 100;
                const ref = periodo === 'dia' ? 'ao dia anterior' : periodo === 'semana' ? 'à semana anterior' : 'ao mês anterior';
                return (
                  <p className="mt-1 text-xs text-[var(--ink-soft)]">
                    {dif === 0 ? `Igual ${ref}.` : `${dif > 0 ? 'Mais' : 'Menos'} ${formatMoney(Math.abs(dif))} MT em relação ${ref}.`}
                  </p>
                );
              })()}
            </div>
            <Linha label="Vendas e serviços (sem trocos)" valor={dados.res.receita} />
            <Linha label="Custo da mercadoria vendida" valor={dados.res.custoMercadoria} />
            <Linha label="Lucro bruto" valor={dados.res.lucroBruto} />
            <Linha label="Salários" valor={dados.res.salarios} />
            <Linha label="Despesas operacionais" valor={dados.res.despesas} />
            <Linha label="Outras saídas" valor={dados.res.outras} />
            <Linha label="Lucro líquido" valor={dados.res.lucroLiquido} />
            <p className="pt-1 text-[11px] leading-relaxed text-[var(--ink-soft)]">
              Conta o dinheiro que entrou e saiu. A Poupança e o Xitique ficam de fora. O custo da mercadoria só é conhecido nas vendas ligadas ao Stock.
            </p>
          </>
        )}
      </Seccao>

      {periodo === 'mes' && dados.equilibrio && (
        <Seccao titulo="Ponto de equilíbrio">
          {dados.equilibrio.estado === 'sem_custos' && (
            <p className="py-2 text-sm text-[var(--ink-soft)]">Regista os salários e as despesas do mês na aba Despesas para ver quanto precisas de vender para não ter prejuízo.</p>
          )}
          {dados.equilibrio.estado === 'sem_margem' && (
            <p className="py-2 text-sm text-[var(--ink-soft)]">Para calcular, faz vendas ligadas a produtos do Stock com preço de custo. Assim a app sabe quanto ganhas em cada venda.</p>
          )}
          {dados.equilibrio.estado === 'ok' && (() => {
            const pe = dados.equilibrio.pe;
            const vendido = dados.res.receita;
            const pc = Math.max(0, Math.min(100, (vendido / pe) * 100));
            const faltam = Math.max(0, pe - vendido);
            const passou = vendido >= pe;
            return (
              <div className="py-2 text-sm">
                <p className="text-[var(--ink)]">
                  Para cobrir os custos do mês precisas de vender <b className="font-mono-ref">{formatMoney(pe)} MT</b>
                  <span className="text-[var(--ink-soft)]"> (ganhas cerca de {Math.round(dados.equilibrio.margem * 100)}% em cada venda).</span>
                </p>
                <div className="mt-2.5 h-2.5 overflow-hidden rounded-full bg-[var(--bg-soft)]">
                  <div className="h-full rounded-full transition-all" style={{ width: pc + '%', background: passou ? 'var(--teal)' : 'var(--mango)' }} />
                </div>
                <p className="mt-1.5 text-xs text-[var(--ink-soft)]">Já vendeste {formatMoney(vendido)} MT ({Math.round(pc)}%).</p>
                {passou ? (
                  <p className="mt-2 font-semibold text-[var(--teal)]">Já passaste o ponto de equilíbrio. O que vender agora, depois de tirar o custo, é lucro.</p>
                ) : desloc === 0 ? (
                  <p className="mt-2 text-[var(--ink)]">
                    Faltam <b className="font-mono-ref">{formatMoney(faltam)} MT</b>: cerca de <b className="font-mono-ref">{formatMoney(faltam / dados.diasRestantes)} MT por dia</b> nos {dados.diasRestantes} dias que restam.
                  </p>
                ) : (
                  <p className="mt-2 font-semibold text-[var(--brick)]">Nesse mês não chegaste ao ponto de equilíbrio. Faltaram {formatMoney(faltam)} MT.</p>
                )}
              </div>
            );
          })()}
        </Seccao>
      )}

      {dados.diasGrafico.length > 1 && (
        <Seccao titulo="Vendas dia a dia">
          <GraficoVendasDia key={`${periodo}-${desloc}`} dias={dados.diasGrafico} />
        </Seccao>
      )}

      {dados.res.temDados && (
        <Seccao titulo="Para onde vai o dinheiro">
          <GraficoDestino itens={dados.destino} receita={dados.res.receita} />
        </Seccao>
      )}

      {periodo === 'mes' && dados.meses.filter((m) => m.temDados).length >= 2 && (
        <Seccao titulo="Últimos 6 meses">
          <GraficoMeses key={desloc} meses={dados.meses} />
        </Seccao>
      )}

      <Seccao titulo="Caixa do Dia">
        <Linha label="Entradas" valor={dados.totalEntradas} />
        <Linha label="Produtos" valor={dados.totalProdutos} />
        <Linha label="Serviços" valor={dados.totalMaquina} />
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
                <span className="w-16 text-right">Prod.</span>
                <span className="w-16 text-right">Serv.</span>
                <span className="w-16 text-right">Total</span>
              </span>
            </div>
            {dados.saidasPorCategoria.map((c) => {
              const cat = CAT_LOOKUP[c.categoria] || { label: c.categoria };
              return <LinhaSaidaSetor key={c.categoria} label={cat.label} produtos={c.produtos} maquina={c.maquina} total={c.total} />;
            })}
            <LinhaSaidaSetor label="Total Geral" produtos={dados.saidasProdutosTotal} maquina={dados.saidasMaquinaTotal} total={dados.totalSaidas} destaque />
          </>
        )}
      </Seccao>

      <Seccao titulo="Salários e Despesas">
        {dados.despTxs.length === 0 ? (
          <p className="py-2 text-sm text-[var(--ink-soft)]">Sem salários nem despesas neste período.</p>
        ) : (
          <>
            {dados.despPorGrupo.map((g) => <Linha key={g.label} label={g.label} valor={g.total} />)}
            {dados.despTxs.map((t) => (
              <ItemFiado
                key={t.id}
                titulo={`${(CAT_LOOKUP[t.categoria] || {}).label || t.categoria}${t.pessoa ? ' · ' + t.pessoa : ''}`}
                sub={`${formatDataCurta(t.dateKey)}${t.nota ? ' · ' + t.nota : ''}`}
                valor={t.valor}
                sinal="−"
              />
            ))}
            <Linha label="Total de salários e despesas" valor={dados.totalDespesas} />
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

      <Seccao titulo="Fiados feitos">
        {dados.fiadosFeitos.length === 0 ? (
          <p className="py-2 text-sm text-[var(--ink-soft)]">Nenhum fiado novo neste período.</p>
        ) : (
          <>
            {dados.fiadosFeitos.map((x) => (
              <ItemFiado key={x.chave} titulo={`${x.cliente} · ${semEmoji(x.texto)}`} sub={`${x.aumento ? 'Aumento de dívida' : 'Dívida feita'} em ${formatDataCurta(dateKey(new Date(x.ts)))}`} valor={x.valor} sinal="+" />
            ))}
            <Linha label="Total de dívidas feitas" valor={dados.totalFiadosFeitos} />
          </>
        )}
      </Seccao>

      <Seccao titulo="Fiados pagos">
        {dados.fiadosPagos.length === 0 ? (
          <p className="py-2 text-sm text-[var(--ink-soft)]">Nenhum pagamento de fiado neste período.</p>
        ) : (
          <>
            {dados.fiadosPagos.map((x) => (
              <ItemFiado key={x.chave} titulo={`${x.cliente} · ${semEmoji(x.texto)}`} sub={`Dívida feita em ${formatDataCurta(x.feitoEm)} · paga em ${formatDataCurta(x.pagoEm)}`} valor={x.valor} sinal="−" />
            ))}
            <Linha label="Total pago" valor={dados.totalFiadosPagos} />
          </>
        )}
        <Linha label="Em aberto (total atual)" valor={dados.emAbertoFiados} />
      </Seccao>

      <Seccao titulo="Xitique">
        <Linha label="Recebido dos participantes" valor={dados.pagXitique} />
        <Linha label="Entregue" valor={dados.entXitique} />
      </Seccao>

      <Seccao titulo="Poupança">
        <Linha label="Guardado" valor={dados.guardadoPoupanca} />
        <Linha label="Retirado" valor={dados.retiradoPoupanca} />
        {dados.movsPoupanca.map((m) => (
          <ItemFiado
            key={m.id}
            titulo={`${m.tipo === 'deposito' ? 'Guardado' : 'Retirado'}${m.nota ? ' · ' + m.nota : ''}`}
            sub={`${formatDataCurta(m.dateKey || dateKey(new Date(m.timestamp)))}${m.meta ? ' · ' + m.meta : ''}`}
            valor={m.valor}
            sinal={m.tipo === 'deposito' ? '+' : '−'}
            bom={m.tipo === 'deposito'}
          />
        ))}
        <Linha label="Total na Poupança (atual)" valor={totalPoupancaCalc} />
      </Seccao>
    </Modal>
  );
}
