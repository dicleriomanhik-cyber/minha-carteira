import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { DataProvider } from './context/DataContext';
import AuthGate from './components/AuthGate';
import Caixa from './pages/Caixa';
import Fiados from './pages/Fiados';
import Produtos from './pages/Produtos';
import Xitique from './pages/Xitique';
import Poupanca from './pages/Poupanca';
import Perfil from './pages/Perfil';

export default function App() {
  return (
    <AuthProvider>
      <DataProvider>
        <BrowserRouter>
          <AuthGate>
            <Routes>
              <Route path="/" element={<Caixa />} />
              <Route path="/fiados" element={<Fiados />} />
              <Route path="/produtos" element={<Produtos />} />
              <Route path="/xitique" element={<Xitique />} />
              <Route path="/poupanca" element={<Poupanca />} />
              <Route path="/perfil" element={<Perfil />} />
            </Routes>
          </AuthGate>
        </BrowserRouter>
      </DataProvider>
    </AuthProvider>
  );
}
