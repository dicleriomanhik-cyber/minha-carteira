import { useEffect, useMemo, useState } from 'react';
import Modal from './Modal';
import Botao from './Botao';
import Campo from './Campo';
import { IconeWhatsApp } from './Icons';
import { useData } from '../context/DataContext';
import { useDialog } from './DialogProvider';
import { agruparClientes } from '../utils/clientesFiado';
import { linkWhatsApp } from '../utils/whatsapp';
import { formatMoney, formatDataCurta, dateKey, semEmoji } from '../utils/format';

function Linha2({ label, valor }) {
  return (
    <div className="flex justify-between gap-3">
      <span className="text-[var(--ink-soft)]">{label}</span>
      <span className="text-right font-mono-ref font-medium text-[var(--ink)]">{valor}</span>
    </div>
  );
}

export default function FichaClienteModal({ chave, aoFechar }) {
  const { fiados, limitesFiado, definirLimiteFiado, saldoFiado } = useData();
  const { avisar } = useDialog();
  const [limiteTxt, setLimiteTxt] = useState('');

  const ficha = useMemo(
    () => (chave ? agruparClientes(fiados, limitesFiado, saldoFiado).find((x) => x.chave === chave) || null : null),
    [chave, fiados, limitesFiado, saldoFiado],
  );

  useEffect(() => { setLimiteTxt(ficha && ficha.limite ? String(ficha.limite) : ''); }, [chave]); // eslint-disable-line react-hooks/exhaustive-deps

  async function guardarLimite() {
    const v = parseFloat(limiteTxt);
    if (!v || v <= 0) { await avisar('Introduz um limite válido, maior que zero.'); return; }
    definirLimiteFiado(ficha.nome, v);
  }

  const msg = ficha
    ? `Olá ${ficha.nome}, tudo bem? Este é um lembrete amigável: tens ${formatMoney(ficha.deve)} MT em fiado connosco${ficha.vencidoCount ? `, dos quais ${formatMoney(ficha.vencidoValor)} MT já venceram` : ''}. Quando puderes acertar, agradecemos. Obrigado!`
    : '';

  return (
    <Modal titulo={ficha ? semEmoji(ficha.nome) : ''} subtitulo={ficha ? 'Ficha do cliente' : undefined} aberto={!!ficha} aoFechar={aoFechar} tamanho="larga">
      {ficha && (
        <div className="space-y-4 text-sm">
          <div className="rounded-2xl bg-[var(--bg-soft)] px-4 py-3">
            <p className="text-xs text-[var(--ink-soft)]">Deve agora</p>
            <p className="font-mono-ref text-lg font-bold text-[var(--ink)]">{formatMoney(ficha.deve)} MT</p>
            {ficha.vencidoCount > 0 && (
              <p className="mt-0.5 text-xs font-semibold text-[var(--brick)]">{formatMoney(ficha.vencidoValor)} MT já vencido ({ficha.vencidoCount} fiado{ficha.vencidoCount > 1 ? 's' : ''})</p>
            )}
          </div>

          <div className="space-y-1.5">
            <Linha2 label="Levou a fiado (total)" valor={`${formatMoney(ficha.totalFiado)} MT`} />
            <Linha2 label="Já pagou" valor={`${formatMoney(ficha.totalPago)} MT`} />
            <Linha2 label="Fiados feitos" valor={ficha.fiados.length} />
            <Linha2 label="Cliente desde" valor={formatDataCurta(dateKey(new Date(ficha.desde)))} />
            <Linha2 label="Pagou a tempo" valor={ficha.contados > 0 ? `${ficha.aTempo} de ${ficha.contados}` : 'Ainda sem fiados pagos'} />
          </div>

          <div className="rounded-2xl border border-[var(--ink-soft)]/20 p-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-[var(--ink-soft)]">Limite de fiado</p>
            {ficha.limite ? (
              <>
                <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-[var(--bg-soft)]">
                  <div className="h-full rounded-full" style={{ width: `${Math.min(100, Math.round(ficha.uso * 100))}%`, background: ficha.estado === 'passou' ? 'var(--brick)' : ficha.estado === 'perto' ? 'var(--amber)' : 'var(--teal)' }} />
                </div>
                <p className="mt-1.5 text-xs font-semibold" style={{ color: ficha.estado === 'passou' ? 'var(--brick)' : 'var(--ink)' }}>
                  {ficha.estado === 'passou'
                    ? `Passou o limite em ${formatMoney(ficha.deve - ficha.limite)} MT`
                    : `Ainda pode levar ${formatMoney(ficha.limite - ficha.deve)} MT`}
                  <span className="font-normal text-[var(--ink-soft)]"> · limite {formatMoney(ficha.limite)} MT</span>
                </p>
              </>
            ) : (
              <p className="mt-1 text-xs text-[var(--ink-soft)]">Sem limite. Define quanto este cliente pode dever ao mesmo tempo e a app avisa antes de passares disso.</p>
            )}
            <div className="mt-3">
              <Campo label="Limite (MT)">
                <input className="campo" type="number" inputMode="decimal" min="0" step="0.01" placeholder="0,00" value={limiteTxt} onChange={(e) => setLimiteTxt(e.target.value)} />
              </Campo>
            </div>
            <div className="mt-2 flex gap-2">
              {ficha.limite && <Botao variante="secundario" onClick={() => { definirLimiteFiado(ficha.nome, null); setLimiteTxt(''); }}>Remover</Botao>}
              <Botao onClick={guardarLimite}>Guardar limite</Botao>
            </div>
          </div>

          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-[var(--mango)]">Fiados deste cliente</p>
            <div className="mt-1 divide-y divide-[var(--ink)]/5">
              {ficha.fiados.map((f) => {
                const saldo = saldoFiado(f);
                const vencido = saldo > 0 && f.vencimento && f.vencimento < dateKey(new Date());
                return (
                  <div key={f.id} className="flex items-start justify-between gap-3 py-2">
                    <span className="min-w-0 text-[12.5px] text-[var(--ink-soft)]">
                      <span className="block truncate text-[var(--ink)]">{semEmoji(f.produto)}</span>
                      {formatDataCurta(dateKey(new Date(f.criadoEm)))}{saldo > 0 ? ` · vence ${formatDataCurta(f.vencimento)}` : ' · pago'}
                    </span>
                    <span className="shrink-0 text-right font-mono-ref text-[13px] font-semibold" style={{ color: vencido ? 'var(--brick)' : 'var(--ink)' }}>
                      {saldo > 0 ? `deve ${formatMoney(saldo)}` : formatMoney(f.valorTotal)}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="flex gap-2 pt-1">
            {ficha.deve > 0 && (
              <a href={linkWhatsApp(ficha.telefone, msg)} target="_blank" rel="noopener noreferrer" className="flex flex-1 items-center justify-center gap-1.5 rounded-full bg-[#25D366] px-4 py-3 text-sm font-semibold text-white">
                <IconeWhatsApp className="h-4 w-4" />
                Lembrar
              </a>
            )}
            <Botao variante="secundario" onClick={aoFechar}>Fechar</Botao>
          </div>
        </div>
      )}
    </Modal>
  );
}
