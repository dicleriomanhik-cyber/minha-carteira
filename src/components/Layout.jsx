import { useState } from 'react';
import Header from './Header';
import BottomNav from './BottomNav';
import Footer from './Footer';
import ConfigModal from './ConfigModal';
import RelatorioModal from './RelatorioModal';

export default function Layout({ children }) {
  const [relatorioAberto, setRelatorioAberto] = useState(false);
  const [configAberto, setConfigAberto] = useState(false);

  return (
    <div className="min-h-screen bg-[var(--bg)] pb-24">
      <Header aoAbrirRelatorio={() => setRelatorioAberto(true)} aoAbrirConfig={() => setConfigAberto(true)} />
      <main className="mx-auto max-w-md px-4 py-5">{children}</main>
      <Footer />
      <BottomNav />
      <RelatorioModal aberto={relatorioAberto} aoFechar={() => setRelatorioAberto(false)} />
      <ConfigModal aberto={configAberto} aoFechar={() => setConfigAberto(false)} />
    </div>
  );
}
