import { useEffect, useMemo, useState } from 'react';
import Modal from './Modal';
import Botao from './Botao';
import Campo from './Campo';
import { useAuth } from '../context/AuthContext';
import { useData, CAT_LOOKUP, DESPESA_IDS, METODOS } from '../context/DataContext';
import { useDialog } from './DialogProvider';
import { ehSalario, mesAno, dataLonga, montarRecibo, criarReciboPdf, criarReciboImagem } from '../utils/recibo';
import { formatMoney, semEmoji } from '../utils/format';

const ABAS = [
  { id: 'salarios', label: 'Salários' },
  { id: 'despesas', label: 'Renda e despesas' },
];

function slug(t) {
  return semEmoji(t || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

function rotulo(tx) {
  if (tx.categoria === 'salario_func') return tx.pessoa ? `Salário de ${semEmoji(tx.pessoa)}` : 'Salário de funcionário';
  return CAT_LOOKUP[tx.categoria]?.label || 'Despesa';
}

function referenteInicial(tx) {
  const nota = semEmoji(tx.nota || '').trim();
  if (ehSalario(tx)) return `Salário de ${mesAno(tx.dateKey)}${nota ? ` (${nota})` : ''}`;
  if (tx.categoria === 'desp_renda') return `Renda de ${mesAno(tx.dateKey)}`;
  return nota || CAT_LOOKUP[tx.categoria]?.label || '';
}

export default function ReciboModal({ aberto, aoFechar, txIdInicial = null }) {
  const { profile } = useAuth();
  const { transacoes, negocio, setNegocio } = useData();
  const { avisar } = useDialog();
  const [aba, setAba] = useState('salarios');
  const [selId, setSelId] = useState(null);
  const [nomeNegocio, setNomeNegocio] = useState('');
  const [recebedor, setRecebedor] = useState('');
  const [referente, setReferente] = useState('');
  const [formato, setFormato] = useState('pdf');
  const [aGerar, setAGerar] = useState(false);

  const pagamentos = useMemo(() => transacoes
    .filter((t) => t.tipo === 'saida' && DESPESA_IDS.has(t.categoria))
    .sort((a, b) => b.dateKey.localeCompare(a.dateKey) || (a.timestamp < b.timestamp ? 1 : a.timestamp > b.timestamp ? -1 : 0)),
  [transacoes]);

  const lista = useMemo(
    () => pagamentos.filter((t) => (aba === 'salarios' ? ehSalario(t) : !ehSalario(t))).slice(0, 60),
    [pagamentos, aba],
  );

  const tx = useMemo(() => pagamentos.find((t) => t.id === selId) || null, [pagamentos, selId]);

  function escolher(t) {
    setSelId(t.id);
    setRecebedor(t.categoria === 'salario_func' ? (t.pessoa || '') : t.categoria === 'salario_proprio' ? (profile?.nome || '') : '');
    setReferente(referenteInicial(t));
  }

  useEffect(() => {
    if (!aberto) return;
    setNomeNegocio(negocio || '');
    setFormato('pdf');
    const inicial = txIdInicial ? pagamentos.find((t) => t.id === txIdInicial) : null;
    if (inicial) { setAba(ehSalario(inicial) ? 'salarios' : 'despesas'); escolher(inicial); } else { setSelId(null); }
    import('jspdf').catch(() => {}); // aquece o carregamento
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [aberto, txIdInicial]);

  if (!aberto) return null;

  const podePartilhar = typeof navigator !== 'undefined' && typeof navigator.share === 'function';
  const salario = tx ? ehSalario(tx) : false;

  async function preparar() {
    if (!tx) { await avisar('Escolhe primeiro o pagamento.'); return null; }
    if (!nomeNegocio.trim()) { await avisar('Escreve o nome do teu negócio.'); return null; }
    if (salario && !recebedor.trim()) { await avisar('Escreve o nome de quem recebeu o salário.'); return null; }
    if (nomeNegocio.trim() !== negocio) setNegocio(nomeNegocio.trim());
    const r = montarRecibo(tx, {
      negocio: nomeNegocio.trim(),
      responsavel: profile?.nome || '',
      recebedor,
      referente,
      categoriaLabel: CAT_LOOKUP[tx.categoria]?.label || '',
      metodoLabel: METODOS.find((m) => m.id === tx.metodo)?.label || 'Dinheiro',
    });
    const base = `Comprovativo-${slug(recebedor) || slug(CAT_LOOKUP[tx.categoria]?.label) || 'pagamento'}-${tx.dateKey}`;
    if (formato === 'pdf') {
      const doc = await criarReciboPdf(r);
      return { blob: doc.output('blob'), ficheiro: `${base}.pdf`, tipo: 'application/pdf' };
    }
    const blob = await criarReciboImagem(r);
    return { blob, ficheiro: `${base}.png`, tipo: 'image/png' };
  }

  function guardarFicheiro(blob, ficheiro) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = ficheiro;
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 4000);
  }

  async function descarregar() {
    setAGerar(true);
    try {
      const r = await preparar();
      if (r) guardarFicheiro(r.blob, r.ficheiro);
    } catch {
      await avisar('Não foi possível criar o comprovativo agora. Tenta novamente.');
    }
    setAGerar(false);
  }

  async function partilhar() {
    setAGerar(true);
    try {
      const r = await preparar();
      if (r) {
        const file = new File([r.blob], r.ficheiro, { type: r.tipo });
        if (navigator.canShare && navigator.canShare({ files: [file] })) {
          await navigator.share({ files: [file], title: 'Comprovativo de pagamento' });
        } else {
          guardarFicheiro(r.blob, r.ficheiro);
        }
      }
    } catch (e) {
      if (e?.name !== 'AbortError') await avisar('Não foi possível partilhar agora. Tenta descarregar.');
    }
    setAGerar(false);
  }

  const seg = (ativo) => `flex-1 rounded-lg px-3 py-2 text-sm font-medium transition ${ativo ? 'bg-[var(--mango)] text-[var(--mango-ink)]' : 'bg-[var(--bg-soft)] text-[var(--ink)]'}`;

  return (
    <Modal titulo="Comprovativos" subtitulo="Cria um comprovativo de um salário, da renda ou de outra despesa para enviares por WhatsApp." aberto={aberto} aoFechar={aoFechar} tamanho="larga">
      <div className="space-y-5">
        <div className="flex gap-2">
          {ABAS.map((a) => (
            <button key={a.id} type="button" onClick={() => { setAba(a.id); setSelId(null); }} className={seg(aba === a.id)}>{a.label}</button>
          ))}
        </div>

        <Campo label="Escolhe o pagamento">
          {lista.length === 0 ? (
            <p className="rounded-xl bg-[var(--bg-soft)] px-3.5 py-3 text-[12.5px] leading-snug text-[var(--ink-soft)]">
              {aba === 'salarios'
                ? 'Ainda não registaste nenhum salário. Regista-o na aba Despesas e ele aparece aqui.'
                : 'Ainda não registaste nenhuma renda ou despesa. Regista-a na aba Despesas e ela aparece aqui.'}
            </p>
          ) : (
            <div className="max-h-56 space-y-1.5 overflow-y-auto rounded-xl">
              {lista.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => escolher(t)}
                  className={`flex w-full items-center justify-between gap-3 rounded-xl px-3.5 py-2.5 text-left transition ${selId === t.id ? 'bg-[var(--mango)] text-[var(--mango-ink)]' : 'bg-[var(--bg-soft)] text-[var(--ink)]'}`}
                >
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-semibold">{rotulo(t)}</span>
                    <span className="block text-xs opacity-75">{dataLonga(t.dateKey)}</span>
                  </span>
                  <span className="font-mono-ref shrink-0 text-sm font-semibold">{formatMoney(t.valor)} MT</span>
                </button>
              ))}
            </div>
          )}
        </Campo>

        {tx && (
          <>
            <Campo label="Nome do negócio">
              <input className="campo" type="text" maxLength={60} value={nomeNegocio} onChange={(e) => setNomeNegocio(e.target.value)} />
            </Campo>
            <Campo label={salario ? 'Quem recebeu' : 'Quem recebeu (opcional)'}>
              <input className="campo" type="text" maxLength={60} value={recebedor} onChange={(e) => setRecebedor(e.target.value)} />
            </Campo>
            <Campo label="Referente a">
              <input className="campo" type="text" maxLength={80} value={referente} onChange={(e) => setReferente(e.target.value)} />
            </Campo>

            <Campo label="Formato">
              <div className="flex gap-2">
                <button type="button" onClick={() => setFormato('pdf')} className={seg(formato === 'pdf')}>PDF</button>
                <button type="button" onClick={() => setFormato('imagem')} className={seg(formato === 'imagem')}>Imagem</button>
              </div>
            </Campo>

            <p className="text-[11.5px] leading-relaxed text-[var(--ink-soft)]">
              É um comprovativo interno, gerado a partir do que registaste. Não substitui factura nem recibo fiscal. O valor, a data e o método vêm do registo; se estiverem errados, corrige-os na aba Despesas antes de enviares.
            </p>

            <div className="space-y-2.5 pt-1">
              {podePartilhar && <Botao onClick={partilhar} disabled={aGerar}>{aGerar ? 'A criar...' : 'Enviar (WhatsApp, email...)'}</Botao>}
              <Botao variante={podePartilhar ? 'secundario' : undefined} onClick={descarregar} disabled={aGerar}>{aGerar && !podePartilhar ? 'A criar...' : formato === 'pdf' ? 'Descarregar PDF' : 'Descarregar imagem'}</Botao>
            </div>
          </>
        )}

        <Botao variante="fantasma" onClick={aoFechar} disabled={aGerar}>Fechar</Botao>
      </div>
    </Modal>
  );
}
