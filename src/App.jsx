import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { Auth } from './pages/Auth';
import { Dashboard } from './pages/Dashboard';
import { Admin } from './pages/Admin';
import { Profile } from './pages/Profile';
import { History } from './pages/History';

function App() {
  return (
    <Router>
      <Toaster position="top-right" toastOptions={{ style: { fontFamily: 'Inter, system-ui, sans-serif', fontSize: '14px' } }} />
      <Routes>
        <Route path="/" element={<Auth />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/admin" element={<Admin />} />
        <Route path="/perfil" element={<Profile />} />
        <Route path="/historico" element={<History />} />
      </Routes>
    </Router>
  );
}

export default App;