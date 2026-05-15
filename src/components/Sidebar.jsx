import { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { supabase } from '../services/supabase';
import {
  Clock, MessageSquare, LogOut, Home,
  History, Database, FileText, Settings, X, Users, Building2, ShieldCheck, Smile, LayoutGrid
} from 'lucide-react';
import toast from 'react-hot-toast';
import { usePermission } from '../hooks/usePermissions';
import { useModule } from '../hooks/useModule';
import { useAppContext } from '../contexts/AppContext';

export function Sidebar({ menuAberto, setMenuAberto }) {
  const { empresaInfo } = useAppContext();
  const navigate = useNavigate();
  const location = useLocation();
  const { temAcesso: podeAcessarAdmin } = usePermission('admin.configuracoes');
  
  // 🌟 O Segredo de UX: Apenas renderizamos se o módulo estiver ativo
  const { isAtivo: humorAtivo } = useModule('humor');
  const { isAtivo: feedbackAtivo } = useModule('feedbacks');
  
  // 🌟 NOVO: Adicionado verificação para exibir o botão de Mural
  const { isAtivo: muralAtivo } = useModule('mural');

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
    padding: isSubItem ? '0.6rem 1rem 0.6rem 2.5rem' : '0.75rem 1rem',
    backgroundColor: isAtivo(caminho) ? 'var(--brand-color)' : 'transparent',
    color: isAtivo(caminho) ? '#ffffff' : '#64748b',
    border: 'none',
    borderRadius: '12px',
    cursor: 'pointer',
    textAlign: 'left',
    fontSize: '0.9rem',
    fontWeight: isAtivo(caminho) ? '700' : '500',
    transition: 'all 0.2s',
    marginBottom: '0.2rem'
  });

  const menuSection = {
    fontSize: '0.7rem',
    fontWeight: '800',
    color: '#94a3b8',
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
    marginTop: '1.5rem',
    marginBottom: '0.5rem',
    paddingLeft: '1rem'
  };

  return (
    <aside className={`sidebar ${menuAberto ? 'open' : ''}`}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem', padding: '0 0.5rem' }}>
        {empresaInfo?.logo_url ? (
          <img src={empresaInfo.logo_url} alt="Logo" style={{ height: '35px', objectFit: 'contain' }} />
        ) : (
          <h2 style={{ margin: 0, fontSize: '1.25rem', fontWeight: '800', color: '#1e293b' }}>
            {empresaInfo?.nome_fantasia || 'Doo-Hub'}
          </h2>
        )}
        <button className="lg:hidden text-slate-400 hover:text-slate-600" onClick={() => setMenuAberto(false)} style={{ background: 'none', border: 'none' }}>
          <X size={20} />
        </button>
      </div>

      <nav style={{ display: 'flex', flexDirection: 'column', flex: 1, overflowY: 'auto' }} className="custom-scrollbar pr-2">
        
        <div style={menuSection}>Geral</div>
        <button style={getEstiloItem('/dashboard')} onClick={() => navigate('/dashboard')}>
          <Home size={18} /> Início
        </button>

        <div style={menuSection}>Meu Espaço</div>
        <button style={getEstiloItem('/ponto')} onClick={() => navigate('/ponto')}>
          <Clock size={18} /> Relógio de Ponto
        </button>
        <button style={getEstiloItem('/historico')} onClick={() => navigate('/historico')}>
          <History size={18} /> Meu Histórico
        </button>
        <button style={getEstiloItem('/banco-horas')} onClick={() => navigate('/banco-horas')}>
          <Database size={18} /> Banco de Horas
        </button>
        
        {/* Renderização Condicional baseada nos módulos ativos da empresa */}
        {(feedbackAtivo || muralAtivo) && (
          <div style={menuSection}>Comunicação</div>
        )}
        
        {feedbackAtivo && (
          <button style={getEstiloItem('/feedbacks')} onClick={() => navigate('/feedbacks')}>
            <MessageSquare size={18} /> Feedbacks
          </button>
        )}

        {/* 🌟 Botão do Mural: Apenas aparece se estiver ativo */}
        {muralAtivo && (
          <button style={getEstiloItem('/mural')} onClick={() => navigate('/mural')}>
            <MessageSquare size={18} /> Mural da Equipa
          </button>
        )}

        {/* ÁREA ADMINISTRATIVA */}
        {podeAcessarAdmin && (
          <>
            <div style={menuSection}>Gestão de Equipa</div>
            <button style={getEstiloItem('/gestao')} onClick={() => navigate('/gestao')}>
              <Users size={18} /> Área do Gestor
            </button>
            <button style={getEstiloItem('/relatorios')} onClick={() => navigate('/relatorios')}>
              <FileText size={18} /> Relatórios
            </button>

            <div style={menuSection}>Configurações</div>
            <button style={getEstiloItem('/admin/colaboradores')} onClick={() => navigate('/admin/colaboradores')}>
              <Settings size={18} /> Colaboradores
            </button>

            <button style={getEstiloItem('/admin/empresa')} onClick={() => navigate('/admin/empresa')}>
              <Building2 size={18} /> Dados da Empresa
            </button>

            <button style={getEstiloItem('/admin/permissoes')} onClick={() => navigate('/admin/permissoes')}>
              <ShieldCheck size={18} /> Permissões
            </button>

            <button style={getEstiloItem('/admin/modulos')} onClick={() => navigate('/admin/modulos')}>
              <LayoutGrid size={18} /> Módulos
            </button>
          </>
        )}
      </nav>

      <div style={{ borderTop: '1px solid #f1f5f9', paddingTop: '1.25rem', marginTop: '1rem', flexShrink: 0 }}>
        <button onClick={handleLogout} style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', background: 'none', border: 'none', color: '#ef4444', fontWeight: '600', cursor: 'pointer', padding: '0.5rem', width: '100%', borderRadius: '8px', transition: 'background-color 0.2s' }} className="hover:bg-red-50">
          <LogOut size={18} /> Sair do Sistema
        </button>
      </div>
    </aside>
  );
}