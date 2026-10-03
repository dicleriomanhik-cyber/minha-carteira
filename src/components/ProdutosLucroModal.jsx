import { useMemo, useState } from 'react';
import Modal from './Modal';
import PillButton from './PillButton';
import { useData } from '../context/DataContext';
import { rankingProdutos, PERIODOS_LUCRO } from '../utils/produtosLucro';
import { formatMoney, semEmoji } from '../utils/format';

export default function ProdutosLucroModal({ aberto, aoFechar }) {
  const { transacoes, produtos } = useData();
  const [periodo, setPeriodo] = useState('30');

  const r = useMemo(() => (aberto ? rankingProdutos(transacoes, produtos, periodo) : null), [aberto, transacoes, produtos, periodo]);
  const maior = r && r.itens.length ? Math.max(...r.itens.map((i) => Math.abs(i.lucro)), 1) : 1;

  return (
    <Modal titulo="Produtos mais lucrativos" aberto={aberto} aoFechar={aoFechar} tamanho="larga">
      {r && (
        <div className="space-y-4">
          <div className="flex gap-2">
            {PERIODOS_LUCRO.map((p) => (
              <PillButton key={p.id} ativo={periodo === p.id} onClick={() => setPeriodo(p.id)}>{p.label}</PillButton>
            ))}
          </div>

          {r.itens.length === 0 ? (
            <p className="rounded-2xl bg-[var(--bg-soft)] px-4 py-3 text-sm text-[var(--ink-soft)]">
              Ainda não há vendas de produtos do stock neste período. Vende com o botão Vender para ver aqui quais ganham mais.
            </p>
          ) : (
            <>
              <div className="rounded-2xl bg-[var(--bg-soft)] px-4 py-3">
                <p className="text-xs text-[var(--ink-soft)]">Lucro dos produtos no período</p>
                <p className="font-mono-ref text-lg font-bold text-[var(--ink)]">{formatMoney(r.lucroTotal)} MT</p>
                <p className="mt-0.5 text-xs text-[var(--ink-soft)]">Vendeste {formatMoney(r.receitaTotal)} MT</p>
              </div>

              <div>
                {r.itens.map((i, idx) => (
                  <div key={i.produtoId} className="border-b border-dashed border-[var(--ink)]/10 py-3 last:border-none">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate text-[13.5px] font-semibold text-[var(--ink)]">{idx + 1}. {semEmoji(i.nome)}</p>
                        <p className="font-mono-ref text-[11.5px] text-[var(--ink-soft)]">
                          Vendeste {formatMoney(i.receita)} MT{i.unidades > 0 ? ` · ${i.unidades} unid.` : ''}
                        </p>
                      </div>
                      <div className="shrink-0 text-right">
                        <p className="font-mono-ref text-sm font-bold" style={{ color: i.lucro < 0 ? 'var(--brick)' : 'var(--teal)' }}>{formatMoney(i.lucro)} MT</p>
                        <p className="text-[11px] text-[var(--ink-soft)]">{i.margem === null ? '' : `${Math.round(i.margem * 100)}% de margem`}</p>
                      </div>
                    </div>
                    <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-[var(--bg-soft)]">
                      <div className="h-full rounded-full" style={{ width: `${Math.max(3, (Math.abs(i.lucro) / maior) * 100)}%`, background: i.lucro < 0 ? 'var(--brick)' : 'var(--mango)' }} />
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}

          {r.parados.length > 0 && (
            <div>
              <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-[var(--ink-soft)]">Parados no período</p>
              <p className="mb-1 text-xs text-[var(--ink-soft)]">Têm stock mas não venderam. É dinheiro teu parado na prateleira.</p>
              {r.parados.map((p) => (
                <div key={p.produtoId} className="flex items-center justify-between gap-3 border-b border-dashed border-[var(--ink)]/10 py-2 last:border-none">
                  <span className="truncate text-[13px] text-[var(--ink)]">{semEmoji(p.nome)}</span>
                  <span className="font-mono-ref shrink-0 text-xs text-[var(--ink-soft)]">{p.quantidade} unid. · {formatMoney(p.parado)} MT</span>
                </div>
              ))}
            </div>
          )}

          <p className="text-xs leading-relaxed text-[var(--ink-soft)]">
            Conta só vendas ligadas ao stock. Fiados entram no lucro quando são pagos, por isso as unidades mostradas são só das vendas a pronto.
          </p>
        </div>
      )}
    </Modal>
  );
}
