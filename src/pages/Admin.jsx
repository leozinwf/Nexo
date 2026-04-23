import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../services/supabase';
import { Users, Menu, Edit } from 'lucide-react';
import toast from 'react-hot-toast';
import { Sidebar } from '../components/Sidebar';

export function Admin() {
  const navigate = useNavigate();
  const [colaboradores, setColaboradores] = useState([]);
  const [loading, setLoading] = useState(true);
  const [menuAberto, setMenuAberto] = useState(false);
  const [isAdmin, setIsAdmin] = useState(true);

  // Estados do Modal de Edição
  const [modalAberto, setModalAberto] = useState(false);
  const [usuarioEditando, setUsuarioEditando] = useState(null);
  const [formConfig, setFormConfig] = useState({ almoco_automatico: false, hora_saida_pausa: '', hora_retorno_pausa: '' });

  useEffect(() => {
    verificarAcessoEBuscarDados();
  }, []);

  const verificarAcessoEBuscarDados = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return navigate('/');

    const { data: perfil } = await supabase.from('perfis').select('is_admin').eq('id', user.id).maybeSingle();
    if (!perfil?.is_admin) {
      toast.error('Acesso negado.');
      return navigate('/dashboard');
    }

    buscarColaboradores();
  };

  const buscarColaboradores = async () => {
    const { data: usuarios } = await supabase.from('perfis').select('*').order('nome_completo', { ascending: true });
    if (usuarios) setColaboradores(usuarios);
    setLoading(false);
  };

  const abrirConfiguracao = (colab) => {
    setUsuarioEditando(colab);
    setFormConfig({
      almoco_automatico: colab.almoco_automatico || false,
      hora_saida_pausa: colab.hora_saida_pausa || '',
      hora_retorno_pausa: colab.hora_retorno_pausa || ''
    });
    setModalAberto(true);
  };

  const salvarConfiguracao = async (e) => {
    e.preventDefault();
    const { error } = await supabase
      .from('perfis')
      .update(formConfig)
      .eq('id', usuarioEditando.id);

    if (error) {
      toast.error('Erro ao salvar configurações.');
    } else {
      toast.success('Configurações de ponto atualizadas!');
      setModalAberto(false);
      buscarColaboradores(); // Atualiza a tabela
    }
  };

  return (
    <>
      <style>{`
        .layout { display: flex; height: 100vh; width: 100vw; background-color: #f8fafc; overflow: hidden; font-family: 'Inter', sans-serif; }
        .sidebar { width: 260px; min-width: 260px; background-color: #ffffff; color: #1e293b; display: flex; flex-direction: column; padding: 1.5rem; border-right: 1px solid #e2e8f0; transition: transform 0.3s ease; z-index: 50; }
        .main-container { flex: 1; display: flex; flex-direction: column; height: 100vh; overflow-y: auto; }
        .top-header { min-height: 70px; background-color: #fff; border-bottom: 1px solid #e2e8f0; display: flex; justify-content: space-between; align-items: center; padding: 0 2.5rem; }
        .content { padding: 2.5rem; max-width: 1200px; width: 100%; margin: 0 auto; box-sizing: border-box; }
        .admin-table { width: 100%; border-collapse: collapse; text-align: left; }
        .admin-table th { padding: 1rem; border-bottom: 2px solid #e2e8f0; color: #64748b; font-size: 0.85rem; text-transform: uppercase; }
        .admin-table td { padding: 1rem; color: #1e293b; font-size: 0.95rem; border-bottom: 1px solid #f1f5f9; }
        
        /* Modal Estilos */
        .modal-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.5); z-index: 100; display: flex; justify-content: center; align-items: center; }
        .modal-content { background: #fff; padding: 2rem; border-radius: 20px; width: 90%; max-width: 500px; }
        .form-group { display: flex; flex-direction: column; gap: 0.5rem; margin-bottom: 1.25rem; }
        .form-input { padding: 0.75rem; border: 1px solid #e2e8f0; border-radius: 8px; outline: none; }

        @media (max-width: 768px) {
          .sidebar { position: fixed; height: 100%; transform: translateX(-100%); }
          .sidebar.open { transform: translateX(0); }
          .mobile-header-btn { display: block; }
          .top-header { padding: 0 1.5rem; }
          .content { padding: 1.5rem; }
          
          /* Cards na Tabela Mobile */
          .admin-table thead { display: none; }
          .admin-table, .admin-table tbody, .admin-table tr, .admin-table td { display: block; width: 100%; box-sizing: border-box; }
          .admin-table tr { margin-bottom: 1.5rem; border: 1px solid #e2e8f0; border-radius: 12px; padding: 1rem; background: #fafafa; }
          .admin-table td { text-align: right; padding: 0.5rem 0; border-bottom: 1px solid #e2e8f0; position: relative; display: flex; justify-content: flex-end; align-items: center; min-height: 2rem;}
          .admin-table td:last-child { border-bottom: none; }
          .admin-table td::before { content: attr(data-label); position: absolute; left: 0; font-weight: 600; color: #64748b; font-size: 0.85rem; text-transform: uppercase; }
        }
      `}</style>

      <div className="layout">
        {/* MENU LATERAL (Idêntico ao Dashboard) */}
        <Sidebar menuAberto={menuAberto} setMenuAberto={setMenuAberto} />

        <div className="main-container">
          <header className="top-header">
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
              <button className="mobile-header-btn" onClick={() => setMenuAberto(true)} style={{ background: 'none', border: 'none' }}><Menu size={24} /></button>
              <div style={{ color: '#64748b', fontSize: '0.9rem' }}>Portal / <strong style={{ color: '#1e293b'}}>Admin</strong></div>
            </div>
          </header>

          <main className="content">
            <div style={{ backgroundColor: '#fff', borderRadius: '20px', padding: '2rem', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.02)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '2rem', flexWrap: 'wrap', gap: '1rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <Users size={24} color="#0067ff" />
                  <h2 style={{ margin: 0, color: '#1e293b' }}>Equipe Nexo</h2>
                </div>
                <button style={{ backgroundColor: '#0067ff', color: '#fff', border: 'none', padding: '0.75rem 1.5rem', borderRadius: '12px', fontWeight: '600', cursor: 'pointer' }}>+ Novo Colaborador</button>
              </div>

              {loading ? (<p>Carregando equipe...</p>) : (
                <table className="admin-table">
                  <thead>
                    <tr>
                      <th>Nome</th>
                      <th>E-mail</th>
                      <th>Predefinições de Ponto</th>
                      <th>Ações</th>
                    </tr>
                  </thead>
                  <tbody>
                    {colaboradores.map((colab) => (
                      <tr key={colab.id}>
                        <td data-label="Nome">
                          <strong>{colab.nome_completo || 'Sem Nome'}</strong>
                          {colab.is_admin && <span style={{ marginLeft: '0.5rem', backgroundColor: '#fef08a', color: '#854d0e', padding: '0.2rem 0.5rem', borderRadius: '4px', fontSize: '0.7rem', fontWeight: 'bold' }}>Admin</span>}
                        </td>
                        <td data-label="E-mail">{colab.email}</td>
                        <td data-label="Regras">
                          {colab.almoco_automatico 
                            ? <span style={{ color: '#10b981', fontWeight: '600', fontSize: '0.85rem' }}>Automático: {colab.hora_saida_pausa} às {colab.hora_retorno_pausa}</span>
                            : <span style={{ color: '#64748b', fontSize: '0.85rem' }}>Ponto Manual</span>}
                        </td>
                        <td data-label="Ações">
                          <button onClick={() => abrirConfiguracao(colab)} style={{ background: '#f8fafc', border: '1px solid #e2e8f0', padding: '0.5rem 1rem', borderRadius: '8px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#1e293b', fontWeight: '500' }}>
                            <Edit size={16} /> Configurar
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </main>
        </div>
      </div>

      {/* MODAL DE CONFIGURAÇÃO */}
      {modalAberto && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <h3 style={{ margin: 0 }}>Configurar: {usuarioEditando?.nome_completo}</h3>
              <button onClick={() => setModalAberto(false)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}><X size={20}/></button>
            </div>

            <form onSubmit={salvarConfiguracao}>
              <div className="form-group" style={{ flexDirection: 'row', alignItems: 'center', gap: '1rem', background: '#f8fafc', padding: '1rem', borderRadius: '8px' }}>
                <input 
                  type="checkbox" 
                  id="almoco_auto"
                  checked={formConfig.almoco_automatico}
                  onChange={(e) => setFormConfig({...formConfig, almoco_automatico: e.target.checked})}
                  style={{ width: '18px', height: '18px' }}
                />
                <label htmlFor="almoco_auto" style={{ fontWeight: '600', cursor: 'pointer' }}>Ativar Almoço Pré-assinalado</label>
              </div>

              {formConfig.almoco_automatico && (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                  <div className="form-group">
                    <label style={{ fontSize: '0.85rem', color: '#64748b' }}>Horário de Saída</label>
                    <input type="time" className="form-input" required={formConfig.almoco_automatico} value={formConfig.hora_saida_pausa} onChange={(e) => setFormConfig({...formConfig, hora_saida_pausa: e.target.value})} />
                  </div>
                  <div className="form-group">
                    <label style={{ fontSize: '0.85rem', color: '#64748b' }}>Horário de Retorno</label>
                    <input type="time" className="form-input" required={formConfig.almoco_automatico} value={formConfig.hora_retorno_pausa} onChange={(e) => setFormConfig({...formConfig, hora_retorno_pausa: e.target.value})} />
                  </div>
                </div>
              )}

              <div style={{ display: 'flex', gap: '1rem', marginTop: '2rem' }}>
                <button type="button" onClick={() => setModalAberto(false)} style={{ flex: 1, padding: '0.8rem', borderRadius: '8px', border: '1px solid #e2e8f0', background: '#fff', cursor: 'pointer' }}>Cancelar</button>
                <button type="submit" style={{ flex: 1, padding: '0.8rem', borderRadius: '8px', border: 'none', background: '#0067ff', color: '#fff', fontWeight: 'bold', cursor: 'pointer' }}>Salvar Configuração</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}

const styles = {
  navItem: { display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.75rem 1rem', backgroundColor: 'transparent', border: 'none', color: '#64748b', borderRadius: '8px', cursor: 'pointer', textAlign: 'left', fontSize: '0.9rem', fontWeight: '500', transition: '0.2s' },
  menuSection: { fontSize: '0.7rem', fontWeight: '700', color: '#94a3b8', textTransform: 'uppercase', marginTop: '1.5rem', marginBottom: '0.5rem', paddingLeft: '0.75rem', letterSpacing: '0.05em' },
};