import { useEffect, useMemo, useState } from 'react';
import Modal from './Modal';
import Botao from './Botao';
import Campo from './Campo';
import { useAuth } from '../context/AuthContext';
import { useData } from '../context/DataContext';
import { useDialog } from './DialogProvider';
import { calcDossie, PERIODOS_DOSSIE } from '../utils/dossie';
import { formatMoney, semEmoji, HOJE_KEY } from '../utils/format';

function Linha({ label, valor, cor }) {
  return (
    <div className="flex items-center justify-between py-1.5 text-sm">
      <span className="text-[var(--ink-soft)]">{label}</span>
      <span className="font-mono-ref font-semibold" style={{ color: cor || 'var(--ink)' }}>{valor}</span>
    </div>
  );
}

export default function DossieModal({ aberto, aoFechar }) {
  const { profile } = useAuth();
  const { transacoes, fiados, produtos, movimentosPoupanca, totalPoupancaCalc, saldoFiado, negocio, setNegocio } = useData();
  const { avisar } = useDialog();
  const [n, setN] = useState(6);
  const [nome, setNome] = useState('');
  const [aGerar, setAGerar] = useState(false);

  useEffect(() => {
    if (!aberto) return;
    setNome(negocio || '');
    import('jspdf').catch(() => {}); // aquece o carregamento para o PDF sair mais depressa
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [aberto]);

  const dados = useMemo(
    () => calcDossie({ n, transacoes, fiados, produtos, movimentosPoupanca, totalPoupanca: totalPoupancaCalc, saldoFiado }),
    [n, transacoes, fiados, produtos, movimentosPoupanca, totalPoupancaCalc, saldoFiado],
  );

  if (!aberto) return null;

  const podePartilhar = typeof navigator !== 'undefined' && typeof navigator.share === 'function';

  async function preparar() {
    if (!nome.trim()) { await avisar('Escreve o nome do teu negócio.'); return null; }
    if (!dados.temDados) { await avisar('Ainda não há registos neste período para incluir no dossiê.'); return null; }
    if (nome.trim() !== negocio) setNegocio(nome.trim());
    const { criarDossiePdf } = await import('../utils/dossiePdf');
    const doc = await criarDossiePdf(dados, { negocio: nome.trim(), responsavel: profile?.nome || '', whatsapp: profile?.whatsapp || '' });
    const slug = semEmoji(nome).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'negocio';
    return { doc, ficheiro: `Dossie-${slug}-${HOJE_KEY}.pdf` };
  }

  async function descarregar() {
    setAGerar(true);
    try {
      const r = await preparar();
      if (r) r.doc.save(r.ficheiro);
    } catch {
      await avisar('Não foi possível criar o PDF agora. Tenta novamente.');
    }
    setAGerar(false);
  }

  async function partilhar() {
    setAGerar(true);
    try {
      const r = await preparar();
      if (r) {
        const file = new File([r.doc.output('blob')], r.ficheiro, { type: 'application/pdf' });
        if (navigator.canShare && navigator.canShare({ files: [file] })) {
          await navigator.share({ files: [file], title: `Dossiê financeiro - ${nome.trim()}` });
        } else {
          r.doc.save(r.ficheiro);
        }
      }
    } catch (e) {
      if (e?.name !== 'AbortError') await avisar('Não foi possível partilhar o PDF agora. Tenta descarregar.');
    }
    setAGerar(false);
  }

  const t = dados.total;

  return (
    <Modal titulo="Dossiê para pedir crédito" subtitulo="Um PDF com o resumo financeiro do teu negócio para mostrar a um banco ou a uma instituição de microcrédito." aberto={aberto} aoFechar={aoFechar} tamanho="larga">
      <div className="space-y-5">
        <Campo label="Nome do negócio">
          <input className="campo" type="text" maxLength={60} value={nome} onChange={(e) => setNome(e.target.value)} />
        </Campo>

        <Campo label="Período">
          <div className="flex gap-2">
            {PERIODOS_DOSSIE.map((p) => (
              <button
                key={p}
                type="button"
                onClick={() => setN(p)}
                className={`flex-1 rounded-lg px-3 py-2 text-sm font-medium transition ${n === p ? 'bg-[var(--mango)] text-[var(--mango-ink)]' : 'bg-[var(--bg-soft)] text-[var(--ink)]'}`}
              >
                {p} meses
              </button>
            ))}
          </div>
        </Campo>

        <section className="rounded-2xl bg-[var(--bg-soft)] px-4 py-3">
          <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-[var(--ink-soft)]">O que vai no PDF</p>
          <div className="divide-y divide-[var(--ink)]/5">
            <Linha label="Vendas" valor={`${formatMoney(t.receita)} MT`} />
            <Linha label="Lucro líquido" valor={`${formatMoney(t.lucroLiquido)} MT`} cor={t.lucroLiquido >= 0 ? 'var(--teal)' : 'var(--brick)'} />
            <Linha label="Fiados cobrados" valor={`${formatMoney(dados.fiados.cobrados)} MT`} />
            <Linha label="Stock ao preço de custo" valor={`${formatMoney(dados.stock.valorCusto)} MT`} />
            <Linha label="Poupança" valor={`${formatMoney(dados.poupanca.total)} MT`} />
          </div>
          <p className="mt-2 text-[11.5px] leading-relaxed text-[var(--ink-soft)]">Inclui ainda o gráfico e a tabela mês a mês.</p>
        </section>

        {dados.temDados && dados.mesesComDados < n && (
          <p className="rounded-xl bg-[var(--amber-soft)] px-3.5 py-2.5 text-[12.5px] leading-snug text-[var(--amber)]">
            Só tens registos há {dados.mesesComDados} mês(es). O dossiê vai mostrar só esses, e o banco vai ver isso.
          </p>
        )}
        {!dados.temDados && (
          <p className="rounded-xl bg-[var(--brick-soft)] px-3.5 py-2.5 text-[12.5px] leading-snug text-[var(--brick)]">Ainda não há registos neste período.</p>
        )}

        <p className="text-[11.5px] leading-relaxed text-[var(--ink-soft)]">
          Os valores vêm do que registaste na app. Confere o Caixa, as despesas e o stock antes de entregares o dossiê, porque erros nos registos aparecem nos totais.
        </p>

        <div className="space-y-2.5 pt-1">
          <Botao onClick={descarregar} disabled={aGerar}>{aGerar ? 'A criar o PDF...' : 'Descarregar PDF'}</Botao>
          {podePartilhar && <Botao variante="secundario" onClick={partilhar} disabled={aGerar}>Partilhar (WhatsApp, email...)</Botao>}
          <Botao variante="fantasma" onClick={aoFechar} disabled={aGerar}>Fechar</Botao>
        </div>
      </div>
    </Modal>
  );
}
