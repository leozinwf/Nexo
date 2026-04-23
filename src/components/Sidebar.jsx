import { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { supabase } from '../services/supabase';
import { Clock, MessageSquare, LogOut, Home, History, Database, FileText, Settings, X } from 'lucide-react';
import toast from 'react-hot-toast';

export function Sidebar({ menuAberto, setMenuAberto }) {
    const navigate = useNavigate();
    const location = useLocation(); // Ajuda a saber em qual página estamos
    const [isAdmin, setIsAdmin] = useState(false);

    useEffect(() => {
        const verificarAdmin = async () => {
            const { data: { user } } = await supabase.auth.getUser();
            if (user) {
                const { data: perfil } = await supabase
                    .from('perfis')
                    .select('is_admin')
                    .eq('id', user.id)
                    .maybeSingle();
                if (perfil) setIsAdmin(perfil.is_admin);
            }
        };
        verificarAdmin();
    }, []);

    const handleLogout = async () => {
        await supabase.auth.signOut();
        toast.success('Sessão encerrada.');
        navigate('/');
    };

    // Lógica inteligente para saber qual botão deve ficar azul (ativo)
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
        transition: '0.2s'
    });

    const menuSection = { fontSize: '0.7rem', fontWeight: '700', color: '#94a3b8', textTransform: 'uppercase', marginTop: '1.5rem', marginBottom: '0.5rem', paddingLeft: '0.75rem', letterSpacing: '0.05em' };

    return (
        <aside className={`sidebar ${menuAberto ? 'open' : ''}`}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2.5rem' }}>
                <img src="https://dootax.com.br/wp-content/themes/dootax/assets/imgs/logo_dootax_principal.svg" alt="Logo" style={{ width: '130px' }} />
                <button className="mobile-header-btn" onClick={() => setMenuAberto(false)} style={{ background: 'none', border: 'none' }}>
                    <X size={24} />
                </button>
            </div>

            <nav style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', flex: 1 }}>
                <button style={getEstiloItem('/dashboard')} onClick={() => navigate('/dashboard')}>
                    <Home size={20} /> Início
                </button>

                <div style={menuSection}>Gestão de Ponto</div>
                <button style={getEstiloItem('/ponto')}><Clock size={20} /> Registro de Ponto</button>
                <button style={getEstiloItem('/historico')} onClick={() => navigate('/historico')}><History size={20} /> Histórico de Pontos</button>
                <button style={getEstiloItem('/banco-horas')}><Database size={20} /> Banco de Horas</button>
                <button style={getEstiloItem('/relatorios')}><FileText size={20} /> Relatórios e Folha</button>

                <div style={menuSection}>Comunicação</div>
                <button style={getEstiloItem('/feedbacks')}><MessageSquare size={20} /> Feedbacks</button>

                {isAdmin && (
                    <>
                        <div style={menuSection}>Administração</div>
                        <button style={getEstiloItem('/admin')} onClick={() => navigate('/admin')}>
                            <Settings size={20} /> Painel de Controle
                        </button>
                    </>
                )}
            </nav>

            <div style={{ borderTop: '1px solid #f1f5f9', paddingTop: '1.25rem' }}>
                <button onClick={handleLogout} style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', fontWeight: '500' }}>
                    <LogOut size={18} /> Sair do Sistema
                </button>
            </div>
        </aside>
    );
}