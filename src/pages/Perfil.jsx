import { useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useData } from '../context/DataContext';
import { supabase } from '../lib/supabase';
import Layout from '../components/Layout';
import Modal from '../components/Modal';
import Botao from '../components/Botao';
import Campo from '../components/Campo';
import MensagemErro from '../components/MensagemErro';

function PillButton({ icon, label, onClick }) {
  return (
    <button
      onClick={onClick}
      className="flex flex-1 flex-col items-center gap-1.5 rounded-2xl bg-[var(--bg-soft)] px-2 py-3 text-center transition active:scale-[0.97]"
    >
      <span className="text-lg">{icon}</span>
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

export default function Perfil() {
  const navigate = useNavigate();
  const { user, profile, sair, atualizarPerfil, excluirConta, recarregarPerfil } = useAuth();
  const { exportarBackup, importarBackup } = useData();
  const fileFotoRef = useRef(null);
  const fileBackupRef = useRef(null);

  const [aEditar, setAEditar] = useState(false);
  const [nome, setNome] = useState(profile?.nome || '');
  const [whatsapp, setWhatsapp] = useState(profile?.whatsapp || '');
  const [erro, setErro] = useState('');
  const [aGuardar, setAGuardar] = useState(false);
  const [aEnviarFoto, setAEnviarFoto] = useState(false);
  const [confirmarExclusao, setConfirmarExclusao] = useState(false);

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
    reader.onload = (ev) => {
      try {
        const dados = JSON.parse(ev.target.result);
        if (!window.confirm('Isto vai substituir os dados atuais deste aparelho pelos dados deste ficheiro. Continuar?')) {
          e.target.value = '';
          return;
        }
        importarBackup(dados);
      } catch {
        window.alert('Não foi possível ler este ficheiro. Verifica se é um backup válido do Minha Carteira.');
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

        <div className="mt-5 flex w-full gap-2.5">
          <PillButton icon="📷" label="Definir Foto" onClick={() => fileFotoRef.current?.click()} />
          <PillButton icon="✏️" label="Editar Informações" onClick={() => { setNome(profile?.nome || ''); setWhatsapp(profile?.whatsapp || ''); setErro(''); setAEditar(true); }} />
          <PillButton icon="⬇️" label="Backup" onClick={() => setAEditar('backup')} />
        </div>
        <input ref={fileFotoRef} type="file" accept="image/*" className="hidden" onChange={aoEscolherFoto} />

        <div className="mt-5 w-full space-y-2.5">
          <InfoCard label="WhatsApp" valor={profile?.whatsapp} />
          <InfoCard label="Email" valor={user?.email} />
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
          <Botao onClick={exportarBackup}>⬇️ Exportar Backup</Botao>
          <Botao variante="secundario" onClick={() => fileBackupRef.current?.click()}>⬆️ Importar Backup</Botao>
          <input ref={fileBackupRef} type="file" accept="application/json" className="hidden" onChange={aoImportarBackup} />
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
