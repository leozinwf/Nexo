import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Sidebar } from '../components/Sidebar';
import { Menu } from 'lucide-react';

export function Ponto() {
  const navigate = useNavigate();
  const [menuAberto, setMenuAberto] = useState(false);

  return (
    <>
      <div className="layout">
        {/* Div do overlay que permite fechar o menu no mobile clicando fora */}
        <div className={`overlay ${menuAberto ? 'open' : ''}`} onClick={() => setMenuAberto(false)}></div>
        
        <Sidebar menuAberto={menuAberto} setMenuAberto={setMenuAberto} />

        <div className="main-container">
          <header className="top-header">
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
              <button className="mobile-header-btn" onClick={() => setMenuAberto(true)}>
                <Menu size={24} />
              </button>
              <div style={{ color: '#64748b', fontSize: '0.9rem' }}>Portal / <strong style={{ color: '#1e293b'}}>Título da Tela</strong></div>
            </div>
          </header>

          <main className="content">
            <div style={{ backgroundColor: '#fff', padding: '2rem', borderRadius: '20px', border: '1px solid #e2e8f0' }}>
              <h2 style={{ margin: '0 0 1rem 0', color: '#1e293b' }}>Título da Tela</h2>
              <p style={{ color: '#64748b' }}>Conteúdo em desenvolvimento...</p>
            </div>
          </main>
        </div>
      </div>
    </>
  );
}