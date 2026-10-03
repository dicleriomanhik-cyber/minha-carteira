import { useEffect, useState } from 'react';
import Modal from './Modal';
import Botao from './Botao';
import MetodoLogo from './MetodoLogo';
import { useData, METODOS } from '../context/DataContext';
import { useDialog } from './DialogProvider';
import { formatMoney, formatHora, formatDataCurta, HOJE_KEY } from '../utils/format';

const arred = (n) => Math.round(n * 100) / 100;

function textoDiferenca(dif) {
  if (Math.abs(dif) < 0.005) return { texto: 'Certo', cor: 'var(--teal)' };
  if (dif > 0) return { texto: `Sobram ${formatMoney(dif)} MT`, cor: 'var(--amber)' };
  return { texto: `Faltam ${formatMoney(-dif)} MT`, cor: 'var(--brick)' };
}

function Numero({ label, valor, destaque }) {
  return (
    <div className="rounded-xl bg-[var(--bg-soft)] px-3 py-2.5">
      <p className="text-[10px] font-semibold uppercase tracking-wide text-[var(--ink-soft)]">{label}</p>
      <p className="font-mono-ref mt-0.5 text-[15px] font-bold" style={{ color: destaque || 'var(--ink)' }}>{formatMoney(valor)} <span className="text-[10px] font-semibold text-[var(--ink-soft)]">MT</span></p>
    </div>
  );
}

export default function FechoDiaModal({ aberto, aoFechar }) {
  const {
    doHoje, totalEntradasHoje, totalSaidasHoje, saldoHoje, lucroRealHojeCalc, saldoPorMetodo,
    fechos, salvarFecho, computeAlertas,
  } = useData();
  const { avisar } = useDialog();
  const [contado, setContado] = useState({});

  const fechoHoje = fechos[HOJE_KEY];

  useEffect(() => {
    if (!aberto) return;
    const base = {};
    METODOS.forEach((m) => {
      const v = fechoHoje?.contado?.[m.id];
      base[m.id] = v === undefined ? '' : String(v);
    });
    setContado(base);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [aberto]);

  if (!aberto) return null;

  const lucro = lucroRealHojeCalc();
  const recebidoFiados = doHoje
    .filter((t) => t.tipo === 'entrada' && (t.categoria === 'fiado_recebido' || t.categoria === 'fiado_sinal'))
    .reduce((s, t) => s + t.valor, 0);
  const paraAmanha = computeAlertas().filter((a) => a.tipo !== 'fecho');

  const linhas = METODOS.map((m) => {
    const esperado = arred(saldoPorMetodo[m.id] || 0);
    const texto = contado[m.id];
    const preenchido = texto !== undefined && texto !== '';
    const valor = preenchido ? parseFloat(String(texto).replace(',', '.')) : null;
    const dif = preenchido && !isNaN(valor) ? arred(valor - esperado) : null;
    return { ...m, esperado, preenchido, valor, dif };
  });
  const totalDif = arred(linhas.reduce((s, l) => s + (l.dif || 0), 0));
  const algumPreenchido = linhas.some((l) => l.dif !== null);

  async function guardar() {
    if (!algumPreenchido) { await avisar('Escreve quanto tens em pelo menos um método para conferir.'); return; }
    if (linhas.some((l) => l.preenchido && (l.valor === null || isNaN(l.valor) || l.valor < 0))) { await avisar('Verifica os valores contados.'); return; }
    const c = {};
    const e = {};
    linhas.forEach((l) => { if (l.dif !== null) { c[l.id] = l.valor; e[l.id] = l.esperado; } });
    salvarFecho(HOJE_KEY, { contado: c, esperado: e, diferenca: totalDif });
    aoFechar();
  }

  const anteriores = Object.keys(fechos).filter((k) => k !== HOJE_KEY).sort().reverse().slice(0, 5);

  return (
    <Modal titulo="Fecho do dia" subtitulo="Vê o resumo de hoje e confere o dinheiro que tens com o saldo da app." aberto={aberto} aoFechar={aoFechar} tamanho="larga">
      <div className="space-y-5">
        <section>
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-[var(--ink-soft)]">Resumo de hoje</p>
          <div className="grid grid-cols-2 gap-2">
            <Numero label="Entradas" valor={totalEntradasHoje} destaque="var(--teal)" />
            <Numero label="Saídas" valor={totalSaidasHoje} destaque="var(--brick)" />
            <Numero label="Lucro real" valor={lucro.lucro} />
            <Numero label="Saldo total" valor={saldoHoje} />
          </div>
          <p className="mt-2 text-[12px] leading-relaxed text-[var(--ink-soft)]">
            {doHoje.length} registo{doHoje.length === 1 ? '' : 's'} hoje
            {recebidoFiados > 0 ? ` · ${formatMoney(recebidoFiados)} MT recebidos de fiados` : ''}.
          </p>
        </section>

        <section>
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-[var(--ink-soft)]">Conferir o dinheiro</p>
          <p className="mb-3 text-[12px] leading-relaxed text-[var(--ink-soft)]">Escreve quanto tens agora em cada método. Deixa vazio o que não quiseres conferir.</p>
          <div className="space-y-2.5">
            {linhas.map((l) => {
              const d = l.dif !== null ? textoDiferenca(l.dif) : null;
              return (
                <div key={l.id} className="rounded-xl bg-[var(--bg-soft)] p-3">
                  <div className="flex items-center gap-2.5">
                    <MetodoLogo id={l.id} className="h-8 w-8" />
                    <div className="min-w-0 flex-1">
                      <p className="text-[13px] font-semibold text-[var(--ink)]">{l.label}</p>
                      <p className="font-mono-ref text-[11px] text-[var(--ink-soft)]">Na app: {formatMoney(l.esperado)} MT</p>
                    </div>
                    <input
                      className="campo !w-28 !py-2 text-right"
                      type="number"
                      inputMode="decimal"
                      min="0"
                      step="0.01"
                      placeholder="0,00"
                      aria-label={`Contado em ${l.label}`}
                      value={contado[l.id] ?? ''}
                      onChange={(e) => setContado((c) => ({ ...c, [l.id]: e.target.value }))}
                    />
                  </div>
                  {d && <p className="mt-1.5 text-right text-[12px] font-semibold" style={{ color: d.cor }}>{d.texto}</p>}
                </div>
              );
            })}
          </div>
          {algumPreenchido && (
            <p className="mt-2.5 text-right text-[13px] font-semibold" style={{ color: textoDiferenca(totalDif).cor }}>
              Total: {textoDiferenca(totalDif).texto}
            </p>
          )}
          {fechoHoje && (
            <p className="mt-2 text-[11px] text-[var(--ink-soft)]">Fecho já guardado hoje às {formatHora(fechoHoje.timestamp)}. Se guardares outra vez, substitui esse.</p>
          )}
        </section>

        {paraAmanha.length > 0 && (
          <section>
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-[var(--ink-soft)]">Atenção</p>
            <ul className="space-y-1.5">
              {paraAmanha.map((a, i) => (
                <li key={i} className="rounded-lg bg-[var(--bg-soft)] px-3 py-2 text-[12.5px] leading-snug text-[var(--ink)]">{a.texto.replace(' Toca para ver.', '').replace(' Toca para repor.', '')}</li>
              ))}
            </ul>
          </section>
        )}

        {anteriores.length > 0 && (
          <section>
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-[var(--ink-soft)]">Fechos anteriores</p>
            {anteriores.map((dk) => {
              const d = textoDiferenca(fechos[dk].diferenca || 0);
              return (
                <div key={dk} className="flex items-center justify-between border-b border-dashed border-[var(--ink)]/10 py-2 text-[13px] last:border-none">
                  <span className="text-[var(--ink)]">{formatDataCurta(dk)}</span>
                  <span className="font-semibold" style={{ color: d.cor }}>{d.texto}</span>
                </div>
              );
            })}
          </section>
        )}

        <div className="flex gap-2 pt-1">
          <Botao variante="secundario" onClick={aoFechar}>Fechar</Botao>
          <Botao onClick={guardar}>Guardar fecho</Botao>
        </div>
      </div>
    </Modal>
  );
}
