import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AppProvider } from './contexts/AppContext';

// Páginas de Autenticação e Dashboard
import { Auth } from './pages/Auth';
import { Dashboard } from './pages/Dashboard';
import { Profile } from './pages/Profile';
import { AceitarConvite } from './pages/AceitarConvite';

// Módulo de Ponto
import { History } from './pages/History';
import { Ponto } from './pages/Ponto';
import { BancoHoras } from './pages/BancoHoras';
import { Relatorios } from './pages/Relatorios';

// Módulo de Comunicação
import { Feedbacks } from './pages/Feedbacks';
import { Modulos } from './pages/Modulos';

// Módulos Administrativos
import { Colaboradores } from './pages/Colaboradores'
import { Gestao } from './pages/Gestao';
import { Empresa } from './pages/Empresa';
import { Permissions } from './pages/Permissions';

function App() {
  return (
    <AppProvider>
    <Router>
      <Toaster position="top-right" toastOptions={{ style: { fontFamily: 'Inter, system-ui, sans-serif', fontSize: '14px' } }} />
      <Routes>
        <Route path="/" element={<Auth />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/perfil" element={<Profile />} />
        
        {/* Novas Rotas */}
        <Route path="/ponto" element={<Ponto />} />
        <Route path="/historico" element={<History />} />
        <Route path="/banco-horas" element={<BancoHoras />} />
        <Route path="/relatorios" element={<Relatorios />} />
        <Route path="/feedbacks" element={<Feedbacks />} />
        <Route path="/convite/:id" element={<AceitarConvite />} />
        
        {/* Rotas de Chefia */}
        <Route path="/gestao" element={<Gestao />} />
        <Route path="/admin/colaboradores" element={<Colaboradores />} />
        <Route path="/admin/empresa" element={<Empresa />} />
        <Route path="/admin/permissoes" element={<Permissions />} />
        <Route path="/admin/modulos" element={<Modulos />} />
      </Routes>
    </Router>
    </AppProvider>
  );
}

export default App;