import { useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useData } from '../context/DataContext';
import { useDialog } from '../components/DialogProvider';
import { supabase } from '../lib/supabase';
import Layout from '../components/Layout';
import Modal from '../components/Modal';
import Botao from '../components/Botao';
import Campo from '../components/Campo';
import MensagemErro from '../components/MensagemErro';
import { formatMoney } from '../utils/format';
import { IconeCamara, IconeCaneta, IconeBackup } from '../components/Icons';

function PillButton({ icon: Icon, label, onClick }) {
  return (
    <button
      onClick={onClick}
      className="flex flex-1 flex-col items-center gap-1.5 rounded-2xl bg-[var(--bg-soft)] px-2 py-3 text-center transition active:scale-[0.97]"
    >
      <Icon className="h-5 w-5 text-[var(--mango)]" />
      <span className="text-xs font-medium leading-tight text-[var(--ink)]">{label}</span>
    </button>
  );
}

function InfoCard({ label, valor }) {
  if (!valor) return null;
  return (
    <div className="rounded-2xl bg-[var(--bg-soft)] px-4 py-3">
      <p className="text-sm text-[var(--ink)]">{valor}</p>
      <p className="mt-0.5 text-xs text-[var(--ink-soft)]">{label}</p>
    </div>
  );
}

const TERMOS = [
  ["1. O que é esta aplicação", 'Uma ferramenta para registares o teu caixa, fiados, stock, xitique e poupança. Não substitui um contabilista e não dá aconselhamento financeiro, fiscal ou jurídico.'],
  ["2. A tua conta e os teus dados", 'Os teus registos ficam guardados na tua conta, para os poderes ver em vários aparelhos, e também neste telemóvel. Servem para a aplicação funcionar para ti. Só tu deves ter acesso à tua conta, por isso guarda bem a tua palavra-passe.'],
  ["3. Backup", 'Podes exportar uma cópia dos teus dados a qualquer momento. Recomendamos que o faças com regularidade.'],
  ["4. Dados de outras pessoas", 'Ao guardares nomes e números de clientes ou de participantes do xitique, deves ter o consentimento deles e usar esses dados apenas para a tua atividade, como cobrar um fiado ou lembrar um pagamento.'],
  ["5. Exatidão dos registos", 'Os totais são calculados a partir do que registas. Se houver erros nos registos, haverá erros nos totais. Confere os valores antes de tomares decisões.'],
  ["6. Limite de responsabilidade", 'A aplicação é fornecida tal como está, sem garantia de funcionamento contínuo ou livre de erros. Na medida permitida pela lei, a SmartMetrics Limitada não se responsabiliza por perdas resultantes do seu uso.'],
  ["7. Alterações", 'Estes termos podem mudar quando a aplicação evoluir. A versão em vigor é a que aparece aqui.'],
  ["8. Contacto", 'Para dúvidas, usa a secção Suporte no teu Perfil.'],
];

export default function Perfil() {
  const navigate = useNavigate();
  const { user, profile, sair, atualizarPerfil, excluirConta, recarregarPerfil } = useAuth();
  const { exportarBackup, importarBackup, saldoInicialGlobal, setSaldoInicialGlobal } = useData();
  const { confirmar, avisar } = useDialog();
  const fileFotoRef = useRef(null);
  const fileBackupRef = useRef(null);

  const [aEditar, setAEditar] = useState(false);
  const [nome, setNome] = useState(profile?.nome || '');
  const [whatsapp, setWhatsapp] = useState(profile?.whatsapp || '');
  const [erro, setErro] = useState('');
  const [aGuardar, setAGuardar] = useState(false);
  const [aEnviarFoto, setAEnviarFoto] = useState(false);
  const [confirmarExclusao, setConfirmarExclusao] = useState(false);
  const [setorSaldo, setSetorSaldo] = useState(null);
  const [valorSaldo, setValorSaldo] = useState('');
  const [termosAberto, setTermosAberto] = useState(false);

  async function guardarSaldoInicial() {
    const v = parseFloat(valorSaldo);
    if (isNaN(v) || v < 0) { await avisar('Introduz um valor válido (pode ser 0).'); return; }
    setSaldoInicialGlobal(setorSaldo, v);
    setSetorSaldo(null);
  }

  const iniciais = (profile?.nome || user?.email || '?')
    .trim().split(/\s+/).slice(0, 2).map((p) => p[0]?.toUpperCase()).join('');

  async function aoEscolherFoto(e) {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    setAEnviarFoto(true);
    setErro('');
    const ext = file.name.split('.').pop();
    const caminho = `${user.id}/avatar.${ext}`;
    const { error: erroUpload } = await supabase.storage.from('avatars').upload(caminho, file, { upsert: true });
    if (erroUpload) {
      setErro('Não foi possível carregar a foto. Tenta novamente.');
      setAEnviarFoto(false);
      return;
    }
    const { data } = supabase.storage.from('avatars').getPublicUrl(caminho);
    const foto_url = `${data.publicUrl}?t=${Date.now()}`;
    await atualizarPerfil({ foto_url });
    setAEnviarFoto(false);
    e.target.value = '';
  }

  async function aoGuardarInfo() {
    if (!nome.trim()) { setErro('O nome não pode ficar vazio.'); return; }
    setAGuardar(true);
    const { error } = await atualizarPerfil({ nome: nome.trim(), whatsapp: whatsapp.trim() });
    setAGuardar(false);
    if (error) { setErro('Não foi possível guardar. Tenta novamente.'); return; }
    setAEditar(false);
  }

  function aoImportarBackup(e) {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async (ev) => {
      try {
        const dados = JSON.parse(ev.target.result);
        const ok = await confirmar('Isto vai substituir os dados atuais deste aparelho pelos dados deste ficheiro. Continuar?', { perigo: true, textoOk: 'Continuar' });
        if (!ok) {
          e.target.value = '';
          return;
        }
        importarBackup(dados);
      } catch {
        await avisar('Não foi possível ler este ficheiro. Verifica se é um backup válido do Minha Carteira.');
        e.target.value = '';
      }
    };
    reader.readAsText(file);
  }

  async function aoConfirmarExclusao() {
    const { error } = await excluirConta();
    if (error && error.message !== 'not_configured') {
      setErro('Não foi possível excluir a conta agora. Tenta novamente.');
      return;
    }
    setConfirmarExclusao(false);
  }

  return (
    <Layout titulo="Perfil" aoVoltar={() => navigate(-1)}>
      <div className="flex flex-col items-center px-4 pt-4">
        <div className="relative">
          {profile?.foto_url ? (
            <img src={profile.foto_url} alt="Foto de perfil" className="h-24 w-24 rounded-full object-cover" />
          ) : (
            <div className="flex h-24 w-24 items-center justify-center rounded-full bg-[var(--mango)] font-display text-2xl font-bold text-[var(--mango-ink)]">
              {iniciais || '👤'}
            </div>
          )}
          {aEnviarFoto && (
            <div className="absolute inset-0 flex items-center justify-center rounded-full bg-black/40 text-xs text-white">A enviar...</div>
          )}
        </div>
        <h1 className="mt-3 font-display text-lg font-bold text-[var(--ink)]">{profile?.nome || 'Sem nome'}</h1>
        <p className="text-xs text-[var(--ink-soft)]">{user?.email}</p>
        <p className="mt-1 text-[11px] text-[var(--ink-soft)]">Powered by SmartMetrics Limitada</p>

        <div className="mt-5 flex w-full gap-2.5">
          <PillButton icon={IconeCamara} label="Definir Foto" onClick={() => fileFotoRef.current?.click()} />
          <PillButton icon={IconeCaneta} label="Editar Informações" onClick={() => { setNome(profile?.nome || ''); setWhatsapp(profile?.whatsapp || ''); setErro(''); setAEditar(true); }} />
          <PillButton icon={IconeBackup} label="Backup" onClick={() => setAEditar('backup')} />
        </div>
        <input ref={fileFotoRef} type="file" accept="image/*" className="hidden" onChange={aoEscolherFoto} />

        <div className="mt-5 w-full space-y-2.5">
          <InfoCard label="WhatsApp" valor={profile?.whatsapp} />
          <InfoCard label="Email" valor={user?.email} />
        </div>

        <div className="mt-6 w-full">
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-[var(--ink-soft)]">Saldos iniciais</p>
          <div className="space-y-2.5">
            {['produtos', 'maquina'].map((st) => (
              <div key={st} className="flex items-center justify-between rounded-2xl bg-[var(--bg-soft)] px-4 py-3">
                <div>
                  <p className="text-sm font-semibold text-[var(--ink)]">{formatMoney(saldoInicialGlobal[st])} MT</p>
                  <p className="mt-0.5 text-xs text-[var(--ink-soft)]">Saldo {st === 'produtos' ? 'Produtos' : 'Serviços'}</p>
                </div>
                <button onClick={() => { setValorSaldo(saldoInicialGlobal[st] ? String(saldoInicialGlobal[st]) : ''); setSetorSaldo(st); }} className="rounded-full px-3 py-1.5 text-xs font-semibold text-[var(--mango)]">Definir</button>
              </div>
            ))}
            <div className="rounded-2xl bg-[var(--bg-soft)] px-4 py-3">
              <p className="text-sm font-semibold text-[var(--ink)]">{formatMoney(saldoInicialGlobal.produtos + saldoInicialGlobal.maquina)} MT</p>
              <p className="mt-0.5 text-xs text-[var(--ink-soft)]">Saldo total inicial (soma dos dois). O Caixa soma a isto as entradas e saídas de todos os dias.</p>
            </div>
          </div>
        </div>

        <div className="mt-6 w-full">
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-[var(--ink-soft)]">Suporte</p>
          <div className="space-y-2.5">
            <a href="mailto:smartmetrics11@gmail.com" className="block rounded-2xl bg-[var(--bg-soft)] px-4 py-3">
              <p className="text-sm text-[var(--ink)]">smartmetrics11@gmail.com</p>
              <p className="mt-0.5 text-xs text-[var(--ink-soft)]">Email</p>
            </a>
            <div className="rounded-2xl bg-[var(--bg-soft)] px-4 py-3">
              <p className="text-sm text-[var(--ink)]"><a href="tel:+258840225411">840 225 411</a> / <a href="tel:+258860143730">860 143 730</a></p>
              <p className="mt-0.5 text-xs text-[var(--ink-soft)]">Contacto (chamada ou WhatsApp)</p>
            </div>
            <a href="https://wa.me/258840225411?text=Ol%C3%A1%2C%20preciso%20de%20ajuda%20com%20a%20app." target="_blank" rel="noopener noreferrer" className="block rounded-2xl bg-[var(--bg-soft)] px-4 py-3 text-sm font-semibold text-[var(--mango)]">Falar no WhatsApp</a>
            <button onClick={() => setTermosAberto(true)} className="flex w-full items-center justify-between rounded-2xl bg-[var(--bg-soft)] px-4 py-3 text-sm font-semibold text-[var(--ink)]"><span>Termos e condições</span><span aria-hidden="true">›</span></button>
          </div>
        </div>

        <div className="mt-6 w-full space-y-2.5">
          <Botao variante="secundario" onClick={sair}>Sair da conta</Botao>
          <Botao variante="fantasma" className="!text-[var(--brick)]" onClick={() => setConfirmarExclusao(true)}>Excluir conta</Botao>
        </div>
      </div>

      {/* Editar informações */}
      <Modal titulo="Editar Informações" aberto={aEditar === true} aoFechar={() => setAEditar(false)}>
        <div className="space-y-3.5">
          <Campo label="Nome completo">
            <input className="campo" value={nome} onChange={(e) => setNome(e.target.value)} />
          </Campo>
          <Campo label="Número de WhatsApp">
            <input className="campo" type="tel" value={whatsapp} onChange={(e) => setWhatsapp(e.target.value)} />
          </Campo>
          {erro && <MensagemErro>{erro}</MensagemErro>}
          <Botao onClick={aoGuardarInfo} disabled={aGuardar}>{aGuardar ? 'A guardar...' : 'Guardar'}</Botao>
        </div>
      </Modal>

      {/* Definições e backup (movido do Header para dentro do Perfil) */}
      <Modal titulo="Definições e Backup" aberto={aEditar === 'backup'} aoFechar={() => setAEditar(false)}>
        <p className="mb-4 text-sm leading-relaxed text-[var(--ink-soft)]">
          A tua conta sincroniza os dados entre aparelhos. O backup local continua disponível como cópia extra dos dados deste telemóvel.
        </p>
        <div className="space-y-2.5">
          <Botao onClick={exportarBackup}>Exportar Backup</Botao>
          <Botao variante="secundario" onClick={() => fileBackupRef.current?.click()}>Importar Backup</Botao>
          <input ref={fileBackupRef} type="file" accept="application/json" className="hidden" onChange={aoImportarBackup} />
        </div>
      </Modal>

      {/* Saldo inicial (definido uma vez, aqui no Perfil) */}
      <Modal titulo={setorSaldo ? `Saldo inicial — ${setorSaldo === 'produtos' ? 'Produtos' : 'Serviços'}` : ''} aberto={!!setorSaldo} aoFechar={() => setSetorSaldo(null)}>
        <p className="mb-3 text-sm text-[var(--ink-soft)]">Quanto tinhas neste setor quando começaste a usar a app. Defines isto uma só vez; depois o saldo acumula todos os dias no Caixa.</p>
        <Campo label="Valor (MT)">
          <input className="campo" type="number" inputMode="decimal" min="0" step="0.01" placeholder="0,00" value={valorSaldo} onChange={(e) => setValorSaldo(e.target.value)} />
        </Campo>
        <div className="mt-4 flex gap-2">
          <Botao variante="secundario" onClick={() => setSetorSaldo(null)}>Cancelar</Botao>
          <Botao onClick={guardarSaldoInicial}>Guardar</Botao>
        </div>
      </Modal>

      {/* Termos e condições */}
      <Modal titulo="Termos e condições" aberto={termosAberto} aoFechar={() => setTermosAberto(false)}>
        <div className="space-y-3 text-sm leading-relaxed text-[var(--ink-soft)]">
          {TERMOS.map(([t, x]) => (
            <div key={t}><p className="font-semibold text-[var(--ink)]">{t}</p><p>{x}</p></div>
          ))}
        </div>
      </Modal>

      {/* Confirmar exclusão de conta */}
      <Modal titulo="Excluir conta" aberto={confirmarExclusao} aoFechar={() => setConfirmarExclusao(false)}>
        <p className="mb-4 text-sm leading-relaxed text-[var(--ink-soft)]">
          Isto apaga a tua conta e todos os dados associados de forma permanente. Não é possível desfazer. Tens a certeza?
        </p>
        {erro && <div className="mb-3"><MensagemErro>{erro}</MensagemErro></div>}
        <div className="space-y-2.5">
          <Botao variante="perigo" onClick={aoConfirmarExclusao}>Sim, excluir a minha conta</Botao>
          <Botao variante="fantasma" onClick={() => setConfirmarExclusao(false)}>Cancelar</Botao>
        </div>
      </Modal>
    </Layout>
  );
}
