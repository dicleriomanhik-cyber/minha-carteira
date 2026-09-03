import { useState } from 'react';
import Header from './Header';
import BottomNav from './BottomNav';
import Footer from './Footer';
import RelatorioModal from './RelatorioModal';

function SubHeader({ titulo, aoVoltar }) {
  return (
    <header className="sticky top-0 z-10 flex items-center gap-3 border-b border-black/10 bg-[var(--bg)]/95 px-4 py-3.5 backdrop-blur">
      <button
        onClick={aoVoltar}
        aria-label="Voltar"
        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[var(--ink)] transition hover:bg-black/5"
      >
        <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M15 19l-7-7 7-7" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>
      <h1 className="font-display text-base font-semibold text-[var(--ink)]">{titulo}</h1>
    </header>
  );
}

export default function Layout({ children, titulo, aoVoltar }) {
  const [relatorioAberto, setRelatorioAberto] = useState(false);
  const subPagina = Boolean(titulo);

  return (
    <div className="min-h-screen bg-[var(--bg)] pb-24">
      {subPagina
        ? <SubHeader titulo={titulo} aoVoltar={aoVoltar} />
        : <Header aoAbrirRelatorio={() => setRelatorioAberto(true)} />}
      <main className="mx-auto max-w-md px-4 py-5">{children}</main>
      <Footer />
      <BottomNav />
      <RelatorioModal aberto={relatorioAberto} aoFechar={() => setRelatorioAberto(false)} />
    </div>
  );
}
