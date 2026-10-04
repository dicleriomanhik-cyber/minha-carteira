import Modal from './Modal';
import { TERMOS } from '../utils/termos';

export default function TermosModal({ aberto, aoFechar }) {
  return (
    <Modal titulo="Termos e condições" aberto={aberto} aoFechar={aoFechar}>
      <div className="space-y-3 text-sm leading-relaxed text-[var(--ink-soft)]">
        {TERMOS.map(([t, x]) => (
          <div key={t}><p className="font-semibold text-[var(--ink)]">{t}</p><p>{x}</p></div>
        ))}
      </div>
    </Modal>
  );
}
