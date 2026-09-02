import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { DataProvider } from './context/DataContext';
import Caixa from './pages/Caixa';
import Fiados from './pages/Fiados';
import Produtos from './pages/Produtos';
import Xitique from './pages/Xitique';
import Poupanca from './pages/Poupanca';

export default function App() {
  return (
    <DataProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Caixa />} />
          <Route path="/fiados" element={<Fiados />} />
          <Route path="/produtos" element={<Produtos />} />
          <Route path="/xitique" element={<Xitique />} />
          <Route path="/poupanca" element={<Poupanca />} />
        </Routes>
      </BrowserRouter>
    </DataProvider>
  );
}
