import { useState } from 'react';
import { formatMoney, formatDataCurta } from '../utils/format';

// Cores dos gráficos (validadas com o validador de paletas; o azul claro tem contraste baixo,
// por isso todos os gráficos têm o valor à vista: leitura ao tocar e tabela/legenda).
const COR_VENDAS_DIA = '#1A73E8';
const COR_VENDAS = '#7AA7EB';
const COR_LUCRO = '#1A73E8';
const COR_PREJUIZO = '#B5482F';

const DIAS_ABREV = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

// Um número "redondo" por cima do máximo, para o eixo ter 0 / meio / topo limpos.
export function maximoRedondo(v) {
  if (!(v > 0)) return 1;
  const mag = Math.pow(10, Math.floor(Math.log10(v)));
  for (const f of [1, 2, 2.5, 5, 10]) {
    if (f * mag >= v) return f * mag;
  }
  return 10 * mag;
}

const tick = (n) => String(Math.round(n));

// Barra com o fim dos dados arredondado (4px) e a base quadrada.
function caminhoBarra(x, yBase, w, h, negativa) {
  const r = Math.min(4, h, w / 2);
  if (!negativa) {
    return `M${x},${yBase} L${x},${yBase - h + r} Q${x},${yBase - h} ${x + r},${yBase - h} L${x + w - r},${yBase - h} Q${x + w},${yBase - h} ${x + w},${yBase - h + r} L${x + w},${yBase} Z`;
  }
  return `M${x},${yBase} L${x},${yBase + h - r} Q${x},${yBase + h} ${x + r},${yBase + h} L${x + w - r},${yBase + h} Q${x + w},${yBase + h} ${x + w},${yBase + h - r} L${x + w},${yBase} Z`;
}

function Leitura({ children }) {
  return <p className="mb-1 min-h-[2.5rem] text-xs leading-snug text-[var(--ink)]">{children}</p>;
}

// ---------- Vendas dia a dia ----------
export function GraficoVendasDia({ dias }) {
  const [sel, setSel] = useState(null);
  const W = 320, H = 150, padL = 34, padR = 6, padT = 8, padB = 30;
  const plotW = W - padL - padR, plotH = H - padT - padB;
  const n = dias.length;
  const max = maximoRedondo(dias.reduce((m, d) => Math.max(m, d.vendas), 0));
  const slot = plotW / n;
  const barW = Math.min(24, slot * 0.62);
  const yBase = padT + plotH;
  const melhor = dias.reduce((m, d) => (d.vendas > (m ? m.vendas : 0) ? d : m), null);
  const atual = sel !== null ? dias[sel] : null;
  const resumo = (d) => `${DIAS_ABREV[d.diaSemana]}, ${formatDataCurta(d.dateKey)}: ${formatMoney(d.vendas)} MT`;

  return (
    <div className="py-2">
      <Leitura>
        {atual
          ? <>{resumo(atual)}</>
          : melhor
            ? <>Melhor dia: <b>{resumo(melhor)}</b>. Toca numa barra para ver o valor de cada dia.</>
            : 'Sem vendas neste período.'}
      </Leitura>
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img" aria-label="Vendas de cada dia do período">
        {[0, 0.5, 1].map((f) => {
          const y = yBase - f * plotH;
          return (
            <g key={f}>
              <line x1={padL} x2={W - padR} y1={y} y2={y} stroke="var(--ink)" strokeOpacity="0.1" strokeWidth="1" />
              <text x={padL - 4} y={y + 3} textAnchor="end" fontSize="9" fill="var(--ink-soft)">{tick(max * f)}</text>
            </g>
          );
        })}
        {dias.map((d, i) => {
          const x = padL + i * slot + (slot - barW) / 2;
          const h = (d.vendas / max) * plotH;
          const mostrar = n <= 7 || d.dia === 1 || d.dia % 5 === 0;
          const ativo = sel === null || sel === i;
          return (
            <g key={d.dateKey}>
              {h >= 0.5 && <path d={caminhoBarra(x, yBase, barW, h, false)} fill={COR_VENDAS_DIA} opacity={ativo ? 1 : 0.35} />}
              {mostrar && (
                <text x={padL + i * slot + slot / 2} y={yBase + 11} textAnchor="middle" fontSize="9" fill="var(--ink-soft)">
                  {n <= 7 ? DIAS_ABREV[d.diaSemana] : d.dia}
                </text>
              )}
              {mostrar && n <= 7 && (
                <text x={padL + i * slot + slot / 2} y={yBase + 22} textAnchor="middle" fontSize="9" fill="var(--ink-soft)">{d.dia}</text>
              )}
              <rect x={padL + i * slot} y={padT} width={slot} height={plotH + padB} fill="transparent" onClick={() => setSel(sel === i ? null : i)} style={{ cursor: 'pointer' }} />
            </g>
          );
        })}
      </svg>
    </div>
  );
}

// ---------- Para onde vai o dinheiro ----------
export function GraficoDestino({ itens, receita }) {
  if (itens.length === 0) {
    return <p className="py-2 text-sm text-[var(--ink-soft)]">Sem custos nem saídas neste período.</p>;
  }
  return (
    <div className="space-y-3 py-2">
      <p className="text-xs text-[var(--ink-soft)]">
        {receita > 0 ? 'De cada 100 MT que vendeste, isto foi para:' : 'Saídas do período, da maior para a menor:'}
      </p>
      {itens.map((i) => (
        <div key={i.id}>
          <div className="flex items-baseline justify-between gap-2 text-sm">
            <span className="text-[var(--ink)]">{i.label}</span>
            <span className="font-mono-ref shrink-0 font-semibold text-[var(--ink)]">
              {formatMoney(i.valor)} MT
              {i.pctVendas !== null && <span className="ml-1.5 text-xs font-medium text-[var(--ink-soft)]">{i.pctVendas}%</span>}
            </span>
          </div>
          <div className="mt-1 h-2.5 rounded-full bg-[var(--bg-soft)]">
            <div className="h-full rounded-full" style={{ width: `${Math.max(2, i.pctBarra)}%`, background: COR_LUCRO }} />
          </div>
        </div>
      ))}
    </div>
  );
}

// ---------- Últimos 6 meses ----------
export function GraficoMeses({ meses }) {
  const [sel, setSel] = useState(null);
  const W = 320, H = 170, padL = 34, padR = 6, padT = 8, padB = 22;
  const plotW = W - padL - padR, plotH = H - padT - padB;
  const maxPos = maximoRedondo(meses.reduce((m, x) => Math.max(m, x.vendas, x.lucro), 0));
  const minNeg = meses.reduce((m, x) => Math.min(m, x.lucro, 0), 0);
  const maxNeg = minNeg < 0 ? maximoRedondo(-minNeg) : 0;
  const total = maxPos + maxNeg;
  const yBase = padT + (maxPos / total) * plotH;
  const esc = plotH / total;
  const slot = plotW / meses.length;
  const barW = Math.min(24, slot * 0.3);
  const temPrejuizo = meses.some((m) => m.lucro < 0);
  const atual = sel !== null ? meses[sel] : null;
  const rotulo = (m) => `${m.label} ${m.ano}`;

  const ticks = maxNeg > 0 ? [-maxNeg, 0, maxPos] : [0, maxPos / 2, maxPos];

  return (
    <div className="py-2">
      <Leitura>
        {atual
          ? <>{rotulo(atual)}: vendas <b>{formatMoney(atual.vendas)} MT</b>, lucro <b>{formatMoney(atual.lucro)} MT</b></>
          : 'Toca num mês para ver os valores.'}
      </Leitura>
      <div className="mb-1 flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-[var(--ink-soft)]">
        <span className="flex items-center gap-1.5"><span className="inline-block h-2.5 w-2.5 rounded-sm" style={{ background: COR_VENDAS }} />Vendas</span>
        <span className="flex items-center gap-1.5"><span className="inline-block h-2.5 w-2.5 rounded-sm" style={{ background: COR_LUCRO }} />Lucro</span>
        {temPrejuizo && <span className="flex items-center gap-1.5"><span className="inline-block h-2.5 w-2.5 rounded-sm" style={{ background: COR_PREJUIZO }} />Prejuízo</span>}
      </div>
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img" aria-label="Vendas e lucro dos últimos meses">
        {ticks.map((v) => {
          const y = yBase - v * esc;
          return (
            <g key={v}>
              <line x1={padL} x2={W - padR} y1={y} y2={y} stroke="var(--ink)" strokeOpacity={v === 0 ? 0.25 : 0.1} strokeWidth="1" />
              <text x={padL - 4} y={y + 3} textAnchor="end" fontSize="9" fill="var(--ink-soft)">{tick(v)}</text>
            </g>
          );
        })}
        {meses.map((m, i) => {
          const cx = padL + i * slot + slot / 2;
          const ativo = sel === null || sel === i;
          const hV = Math.max(0, m.vendas) * esc;
          const hL = Math.abs(m.lucro) * esc;
          return (
            <g key={m.chave} opacity={ativo ? 1 : 0.35}>
              {hV >= 0.5 && <path d={caminhoBarra(cx - barW - 1, yBase, barW, hV, false)} fill={COR_VENDAS} />}
              {hL >= 0.5 && <path d={caminhoBarra(cx + 1, yBase, barW, hL, m.lucro < 0)} fill={m.lucro < 0 ? COR_PREJUIZO : COR_LUCRO} />}
              <text x={cx} y={H - 6} textAnchor="middle" fontSize="9" fill="var(--ink-soft)">{m.label}</text>
              <rect x={padL + i * slot} y={padT} width={slot} height={plotH + padB} fill="transparent" onClick={() => setSel(sel === i ? null : i)} style={{ cursor: 'pointer' }} />
            </g>
          );
        })}
      </svg>

      <div className="mt-2 divide-y divide-[var(--ink)]/5 text-xs">
        <div className="flex items-center justify-between py-1 text-[10px] font-semibold uppercase tracking-wide text-[var(--ink-soft)]">
          <span>Mês</span>
          <span className="flex gap-3"><span className="w-20 text-right">Vendas</span><span className="w-20 text-right">Lucro</span></span>
        </div>
        {meses.map((m) => (
          <div key={m.chave} className="flex items-center justify-between py-1.5">
            <span className="text-[var(--ink-soft)]">{m.label} {m.ano}</span>
            <span className="font-mono-ref flex gap-3 text-[var(--ink)]">
              <span className="w-20 text-right">{m.temDados ? formatMoney(m.vendas) : '-'}</span>
              <span className="w-20 text-right font-semibold">{m.temDados ? formatMoney(m.lucro) : '-'}</span>
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
