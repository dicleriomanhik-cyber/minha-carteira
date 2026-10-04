import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { DataProvider } from './context/DataContext';
import { DialogProvider } from './components/DialogProvider';
import AuthGate from './components/AuthGate';
import Caixa from './pages/Caixa';
import Fiados from './pages/Fiados';
import Produtos from './pages/Produtos';
import Xitique from './pages/Xitique';
import Poupanca from './pages/Poupanca';
import Perfil from './pages/Perfil';
import Despesas from './pages/Despesas';
import Funcionario from './pages/Funcionario';

export default function App() {
  return (
    <AuthProvider>
      <DataProvider>
        <DialogProvider>
          <BrowserRouter>
            <Routes>
              {/* Entrada do funcionário (código da loja + PIN): não passa pelo login do dono. */}
              <Route path="/funcionario" element={<Funcionario />} />
              <Route
                path="*"
                element={(
                  <AuthGate>
                    <Routes>
                      <Route path="/" element={<Caixa />} />
                      <Route path="/fiados" element={<Fiados />} />
                      <Route path="/produtos" element={<Produtos />} />
                      <Route path="/xitique" element={<Xitique />} />
                      <Route path="/poupanca" element={<Poupanca />} />
                      <Route path="/despesas" element={<Despesas />} />
                      <Route path="/perfil" element={<Perfil />} />
                    </Routes>
                  </AuthGate>
                )}
              />
            </Routes>
          </BrowserRouter>
        </DialogProvider>
      </DataProvider>
    </AuthProvider>
  );
}
