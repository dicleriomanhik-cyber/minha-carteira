import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Header({ aoAbrirRelatorio }) {
  const navigate = useNavigate();
  const { profile } = useAuth();

  const nome = profile?.nome || '';
  const iniciais = nome
    ? nome.trim().split(/\s+/).slice(0, 2).map((p) => p[0]?.toUpperCase()).join('')
    : null;

  return (
    <header className="sticky top-0 z-10 border-b border-black/10 bg-[var(--bg)]/95 backdrop-blur">
      <div className="flex items-center justify-between gap-3 px-4 pt-3">
        <div className="flex items-center gap-2.5">
          <div>
            <span className="block font-display text-lg font-extrabold tracking-tight leading-tight text-[var(--mango)]">Minha Carteira</span>
          </div>
        </div>
        <button
          onClick={aoAbrirRelatorio}
          aria-label="Ver relatórios"
          className="flex items-center gap-1.5 rounded-full px-3 py-2 text-[var(--ink-soft)] transition hover:bg-black/5"
        >
          <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8">
            <path d="M4 19V10M10 19V5M16 19v-7M4 19h16" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          <span className="text-[13px] font-semibold">Relatório</span>
        </button>
      </div>
      <div className="flex items-center gap-2.5 px-4 pb-2.5 pt-1.5">
        <button
          onClick={() => navigate('/perfil')}
          className="flex min-w-0 flex-1 items-center gap-2 text-left"
        >
          {profile?.foto_url ? (
            <img src={profile.foto_url} alt="" className="h-8 w-8 shrink-0 rounded-full object-cover" />
          ) : (
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[var(--bg-soft)] text-sm font-bold text-[var(--ink-soft)]">
              {iniciais || <svg viewBox="0 0 24 24" className="h-1/2 w-1/2" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><circle cx="12" cy="8" r="4" /><path d="M4 20c0-4 4-6 8-6s8 2 8 6" /></svg>}
            </span>
          )}
          <span className="min-w-0 flex-1 truncate text-[13px] font-medium text-[var(--cream-soft)]">
            {nome || 'Ver perfil'}
          </span>
        </button>
      </div>
    </header>
  );
}
