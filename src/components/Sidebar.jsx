import { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { supabase } from '../services/supabase';
import {
  Clock, MessageSquare, LogOut, Home,
  History, Database, FileText, Settings, X, Users, Building2, ShieldCheck
} from 'lucide-react';
import toast from 'react-hot-toast';
import { usePermission } from '../hooks/usePermissions';

export function Sidebar({ menuAberto, setMenuAberto }) {
  const navigate = useNavigate();
  const location = useLocation();
  const { temAcesso } = usePermission('usuarios.gerenciar');
  const { temAcesso: podeAcessarAdmin } = usePermission('admin.configuracoes');

  const handleLogout = async () => {
    await supabase.auth.signOut();
    toast.success('Sessão encerrada.');
    navigate('/');
  };

  const isAtivo = (caminho) => location.pathname === caminho;

  const getEstiloItem = (caminho, isSubItem = false) => ({
    display: 'flex',
    alignItems: 'center',
    gap: '0.75rem',
    padding: isSubItem ? '0.75rem 1rem 0.75rem 2.5rem' : '0.75rem 1rem',
    backgroundColor: isAtivo(caminho) ? '#f0f7ff' : 'transparent',
    border: 'none',
    color: isAtivo(caminho) ? '#0067ff' : '#64748b',
    borderRadius: '8px',
    cursor: 'pointer',
    textAlign: 'left',
    fontSize: isSubItem ? '0.85rem' : '0.9rem',
    fontWeight: isAtivo(caminho) ? '600' : '500',
    transition: '0.2s',
    textDecoration: 'none'
  });

  const menuSection = { fontSize: '0.7rem', fontWeight: '700', color: '#94a3b8', textTransform: 'uppercase', marginTop: '1.5rem', marginBottom: '0.5rem', paddingLeft: '0.75rem', letterSpacing: '0.05em' };

  return (
    <aside className={`sidebar ${menuAberto ? 'open' : ''}`}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2.5rem', flexShrink: 0 }}>
        <img src="https://dootax.com.br/wp-content/themes/dootax/assets/imgs/logo_dootax_principal.svg" alt="Logo" style={{ width: '130px' }} />
        <button className="mobile-header-btn" onClick={() => setMenuAberto(false)} style={{ background: 'none', border: 'none' }}>
          <X size={24} />
        </button>
      </div>

      {/* NAV COM SCROLL INTERNO: Resolve o corte do botão Sair */}
      <nav style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '0.25rem',
        flex: 1,
        overflowY: 'auto',
        minHeight: 0,
        paddingRight: '4px'
      }}>
        <button style={getEstiloItem('/dashboard')} onClick={() => navigate('/dashboard')}>
          <Home size={16} /> Início
        </button>

        <div style={menuSection}>Gestão de Ponto</div>
        <button style={getEstiloItem('/ponto')} onClick={() => navigate('/ponto')}><Clock size={16} /> Registro de Ponto</button>
        <button style={getEstiloItem('/historico')} onClick={() => navigate('/historico')}><History size={16} /> Histórico de Pontos</button>
        <button style={getEstiloItem('/banco-horas')} onClick={() => navigate('/banco-horas')}><Database size={16} /> Banco de Horas</button>
        <button style={getEstiloItem('/relatorios')} onClick={() => navigate('/relatorios')}><FileText size={16} /> Relatórios e Folha</button>

        <div style={menuSection}>Comunicação</div>
        <button style={getEstiloItem('/feedbacks')} onClick={() => navigate('/feedbacks')}><MessageSquare size={16} /> Feedbacks</button>

        {podeAcessarAdmin && (
          <>
            <div style={menuSection}>Gestão de Equipe</div>
            <button style={getEstiloItem('/gestao')} onClick={() => navigate('/gestao')}>
              <Users size={16} /> Área do Gestor
            </button>

            <div style={menuSection}>Administração</div>
            <button style={getEstiloItem('/admin')} onClick={() => navigate('/admin')}>
              <Settings size={16} /> Painel de Controle
            </button>

            <div style={menuSection}>Empresa</div>
            <button style={getEstiloItem('/admin/empresa')} onClick={() => navigate('/admin/empresa')}>
              <Building2 size={16} /> Dados da Empresa
            </button>

            <button style={getEstiloItem('/admin/permissoes')} onClick={() => navigate('/admin/permissoes')}>
              <ShieldCheck size={16} /> Permissões e Cargos
            </button>
          </>
        )}
      </nav>

      <div style={{ borderTop: '1px solid #f1f5f9', paddingTop: '1.25rem', marginTop: '1rem', flexShrink: 0 }}>
        <button onClick={handleLogout} style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', fontWeight: '500', width: '100%' }}>
          <LogOut size={18} /> Sair do Sistema
        </button>
      </div>
    </aside>
  );
}