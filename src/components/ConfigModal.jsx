import { useRef } from 'react';
import Modal from './Modal';
import Botao from './Botao';
import { useData } from '../context/DataContext';

export default function ConfigModal({ aberto, aoFechar }) {
  const { exportarBackup, importarBackup } = useData();
  const fileRef = useRef(null);

  function aoImportar(e) {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const dados = JSON.parse(ev.target.result);
        if (!window.confirm('Isto vai substituir todos os dados atuais do app pelos dados deste ficheiro. Continuar?')) {
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

  return (
    <Modal titulo="Definições e Backup" aberto={aberto} aoFechar={aoFechar}>
      <p className="mb-4 text-sm leading-relaxed text-[var(--ink-soft)]">
        Os teus dados ficam guardados só neste telemóvel. Faz backup regularmente — se trocares de aparelho ou limpares o browser, os dados não guardados perdem-se.
      </p>
      <div className="space-y-2.5">
        <Botao onClick={exportarBackup}>⬇️ Exportar Backup</Botao>
        <Botao variante="secundario" onClick={() => fileRef.current?.click()}>⬆️ Importar Backup</Botao>
        <input ref={fileRef} type="file" accept="application/json" className="hidden" onChange={aoImportar} />
      </div>
      <div className="mt-5">
        <Botao variante="fantasma" onClick={aoFechar}>Fechar</Botao>
      </div>
    </Modal>
  );
}
