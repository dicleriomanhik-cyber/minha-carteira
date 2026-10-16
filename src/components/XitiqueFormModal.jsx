import { useEffect, useState } from 'react';
import Modal from './Modal';
import Campo from './Campo';
import Botao from './Botao';

// Criar, editar ou apagar um xitique. Também serve para juntar o próprio nome a um xitique que geres,
// por isso os campos de nome e de valor podem ser escondidos.
export default function XitiqueFormModal({
  aberto, aoFechar, titulo, ajuda, inicial, mostrarNome = true, mostrarValor = true, aoGuardar, aoApagar,
}) {
  const [nome, setNome] = useState('');
  const [valor, setValor] = useState('');
  const [erro, setErro] = useState('');

  // Preenche só ao abrir (não a cada render, senão apagava o que a pessoa estava a escrever).
  useEffect(() => {
    if (aberto) {
      setNome(inicial?.nome || '');
      setValor(inicial?.valor != null ? String(inicial.valor) : '');
      setErro('');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [aberto]);

  function guardar() {
    const n = nome.trim();
    const v = parseFloat(String(valor).replace(',', '.'));
    if (mostrarNome && !n) { setErro('Escreve o nome do xitique.'); return; }
    if (mostrarValor && (!v || v <= 0)) { setErro('Introduz um valor por ronda válido.'); return; }
    setErro('');
    aoGuardar({ nome: n, valor: mostrarValor ? v : undefined });
  }

  return (
    <Modal titulo={titulo} aberto={aberto} aoFechar={aoFechar}>
      <div className="space-y-4">
        {ajuda && <p className="text-xs leading-relaxed text-[var(--ink-soft)]">{ajuda}</p>}
        {mostrarNome && (
          <Campo label="Nome do xitique">
            <input className="campo" maxLength={40} value={nome} onChange={(e) => setNome(e.target.value)} />
          </Campo>
        )}
        {mostrarValor && (
          <Campo label="Valor por ronda (MT)">
            <input className="campo" type="number" inputMode="decimal" min="0" step="0.01" placeholder="0,00" value={valor} onChange={(e) => setValor(e.target.value)} />
          </Campo>
        )}
        {erro && <p className="text-xs font-semibold text-[var(--brick)]">{erro}</p>}
        <div className="flex gap-2 pt-1">
          <Botao variante="secundario" onClick={aoFechar}>Cancelar</Botao>
          <Botao onClick={guardar}>Guardar</Botao>
        </div>
        {aoApagar && inicial && (
          <Botao variante="perigo" onClick={aoApagar}>Apagar xitique</Botao>
        )}
      </div>
    </Modal>
  );
}
