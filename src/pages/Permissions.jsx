import { useEffect, useState } from 'react';
import { supabase } from '../services/supabase';
import { Sidebar } from '../components/Sidebar';
import { ShieldCheck, Plus, Trash2, Menu, Save } from 'lucide-react';
import toast from 'react-hot-toast';

export function Permissions() {
  const [roles, setRoles] = useState([]);
  const [permissoes, setPermissoes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [menuAberto, setMenuAberto] = useState(false);
  const [novoCargo, setNovoCargo] = useState('');
  
  // Estados para o Cargo selecionado
  const [roleSelecionada, setRoleSelecionada] = useState(null);
  const [editandoNome, setEditandoNome] = useState('');

  useEffect(() => {
    carregarDados();
  }, []);

  async function carregarDados() {
    const { data: { user } } = await supabase.auth.getUser();
    const { data: perfil } = await supabase.from('perfis').select('empresa_id').eq('id', user.id).single();

    const [resRoles, resPerms] = await Promise.all([
      supabase.from('roles').select('*, role_permissoes(permissao_id)').eq('empresa_id', perfil.empresa_id).order('criado_em', { ascending: true }),
      supabase.from('permissoes').select('*')
    ]);

    setRoles(resRoles.data || []);
    setPermissoes(resPerms.data || []);
    
    // Atualiza os dados da role selecionada se ela já estiver aberta
    if (roleSelecionada) {
      const atualizada = resRoles.data?.find(r => r.id === roleSelecionada.id);
      if (atualizada) setRoleSelecionada(atualizada);
      else setRoleSelecionada(null); // Caso ela tenha sido excluída
    }
    
    setLoading(false);
  }

  async function handleCriarRole(e) {
    e.preventDefault();
    if (!novoCargo.trim()) return;

    const { data: { user } } = await supabase.auth.getUser();
    const { data: perfil } = await supabase.from('perfis').select('empresa_id').eq('id', user.id).single();

    const { error } = await supabase.from('roles').insert([
      { nome: novoCargo, empresa_id: perfil.empresa_id }
    ]);

    if (error) toast.error("Erro ao criar cargo.");
    else {
      toast.success("Cargo criado com sucesso!");
      setNovoCargo('');
      carregarDados();
    }
  }

  async function handleAtualizarNome() {
    if (!editandoNome.trim()) return;
    const { error } = await supabase.from('roles').update({ nome: editandoNome }).eq('id', roleSelecionada.id);
    if (error) toast.error("Erro ao atualizar o nome.");
    else {
      toast.success("Nome atualizado!");
      carregarDados();
    }
  }

  async function handleExcluirRole(id) {
    if (!window.confirm("Atenção: Tem a certeza que deseja excluir este cargo? Os colaboradores vinculados perderão os acessos.")) return;
    
    const { error } = await supabase.from('roles').delete().eq('id', id);
    if (error) toast.error("Erro ao excluir o cargo.");
    else {
      toast.success("Cargo excluído!");
      if (roleSelecionada?.id === id) setRoleSelecionada(null);
      carregarDados();
    }
  }

  async function togglePermissao(permId, temPermissao) {
    if (!roleSelecionada) return;
    
    if (temPermissao) {
      await supabase.from('role_permissoes').delete().match({ role_id: roleSelecionada.id, permissao_id: permId });
    } else {
      await supabase.from('role_permissoes').insert({ role_id: roleSelecionada.id, permissao_id: permId });
    }
    carregarDados();
  }

  // MÁGICA DE UX: Agrupa as permissões por "Módulo" (ex: Admin, Ponto) para facilitar a leitura
  const permissoesPorModulo = permissoes.reduce((acc, perm) => {
    const mod = perm.modulo || 'Outros';
    if (!acc[mod]) acc[mod] = [];
    acc[mod].push(perm);
    return acc;
  }, {});

  return (
    <>
      <style>{`
        .roles-grid { display: grid; grid-template-columns: 300px 1fr; gap: 2rem; align-items: start; }
        @media (max-width: 768px) { .roles-grid { grid-template-columns: 1fr; } }
      `}</style>

      <div className="layout">
        <Sidebar menuAberto={menuAberto} setMenuAberto={setMenuAberto} />
        <div className="main-container">
          <header className="top-header">
             <button className="mobile-header-btn" onClick={() => setMenuAberto(true)}><Menu /></button>
             <div style={{color: '#64748b'}}>Configurações / <strong>Permissões e Cargos</strong></div>
          </header>

          <main className="content">
            <div className="roles-grid">
              
              {/* COLUNA ESQUERDA: LISTA DE CARGOS E CRIAÇÃO */}
              <section className="doohub-card" style={{ padding: '0', overflow: 'hidden', display: 'flex', flexDirection: 'column', height: 'calc(100vh - 120px)' }}>
                <div style={{ padding: '1.5rem', borderBottom: '1px solid #e2e8f0', background: '#f8fafc' }}>
                  <h3 style={{ margin: 0, fontSize: '1.1rem', color: '#1e293b' }}>Seus Cargos</h3>
                </div>
                
                <div style={{ flex: 1, overflowY: 'auto' }}>
                  {roles.map(role => (
                    <div 
                      key={role.id} 
                      onClick={() => {
                        setRoleSelecionada(role);
                        setEditandoNome(role.nome);
                      }}
                      style={{ 
                        padding: '1rem 1.5rem', 
                        borderBottom: '1px solid #f1f5f9', 
                        cursor: 'pointer',
                        background: roleSelecionada?.id === role.id ? '#eff6ff' : '#fff',
                        borderLeft: roleSelecionada?.id === role.id ? '4px solid #0067ff' : '4px solid transparent',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        transition: '0.2s'
                      }}
                    >
                      <span style={{ fontWeight: roleSelecionada?.id === role.id ? 'bold' : '500', color: '#1e293b' }}>
                        {role.nome}
                      </span>
                      <span style={{ fontSize: '0.75rem', color: '#94a3b8', background: '#f1f5f9', padding: '2px 8px', borderRadius: '12px' }}>
                        {role.role_permissoes?.length || 0}
                      </span>
                    </div>
                  ))}
                </div>

                <div style={{ padding: '1.5rem', borderTop: '1px solid #e2e8f0', background: '#f8fafc' }}>
                  <form onSubmit={handleCriarRole} style={{ display: 'flex', gap: '0.5rem' }}>
                    <input 
                      className="form-control" 
                      value={novoCargo} 
                      onChange={e => setNovoCargo(e.target.value)} 
                      placeholder="Nome do novo cargo..." 
                      required 
                      style={{ flex: 1 }}
                    />
                    <button type="submit" className="btn-primary" style={{ padding: '0 1rem' }} title="Criar Cargo"><Plus size={18} /></button>
                  </form>
                </div>
              </section>

              {/* COLUNA DIREITA: DETALHES DO CARGO (EDITAR NOME E PERMISSÕES) */}
              {roleSelecionada ? (
                <section className="doohub-card" style={{ padding: '2rem' }}>
                  
                  {/* CABEÇALHO DO CARGO (EDITAR NOME E EXCLUIR) */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem', marginBottom: '2rem', paddingBottom: '1.5rem', borderBottom: '1px solid #e2e8f0' }}>
                    <div style={{ flex: 1, minWidth: '250px', maxWidth: '400px' }}>
                      <label style={{ fontSize: '0.8rem', color: '#64748b', fontWeight: 'bold', textTransform: 'uppercase', marginBottom: '0.5rem', display: 'block' }}>Configurando Cargo</label>
                      <div style={{ display: 'flex', gap: '0.5rem' }}>
                        <input 
                          className="form-control" 
                          value={editandoNome} 
                          onChange={e => setEditandoNome(e.target.value)} 
                          style={{ fontSize: '1.1rem', fontWeight: 'bold', color: '#1e293b' }}
                        />
                        <button onClick={handleAtualizarNome} className="btn-secondary" style={{ padding: '0 1rem' }} title="Salvar Nome">
                          <Save size={18} />
                        </button>
                      </div>
                    </div>
                    
                    <button 
                      onClick={() => handleExcluirRole(roleSelecionada.id)}
                      className="btn-secondary" 
                      style={{ color: '#ef4444', borderColor: '#fee2e2', background: '#fef2f2', display: 'flex', alignItems: 'center', gap: '0.5rem' }}
                    >
                      <Trash2 size={16} /> Excluir Cargo
                    </button>
                  </div>

                  {/* LISTA DE PERMISSÕES AGRUPADAS */}
                  <div>
                    <h3 style={{ marginBottom: '1.5rem', color: '#1e293b' }}>Acessos Liberados</h3>
                    
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                      {Object.entries(permissoesPorModulo).map(([modulo, perms]) => (
                        <div key={modulo} style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: '12px', overflow: 'hidden' }}>
                          <div style={{ padding: '0.75rem 1.5rem', background: '#f8fafc', borderBottom: '1px solid #e2e8f0', fontWeight: 'bold', color: '#64748b', fontSize: '0.85rem', textTransform: 'uppercase' }}>
                            {modulo}
                          </div>
                          <div style={{ padding: '1rem 1.5rem', display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))', gap: '1rem' }}>
                            {perms.map(perm => {
                              const ativo = roleSelecionada.role_permissoes?.some(rp => rp.permissao_id === perm.id);
                              return (
                                <label key={perm.id} style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem', cursor: 'pointer', padding: '0.5rem', borderRadius: '8px', transition: '0.2s', background: ativo ? '#f0f7ff' : 'transparent' }}>
                                  <input 
                                    type="checkbox" 
                                    checked={ativo} 
                                    onChange={() => togglePermissao(perm.id, ativo)} 
                                    style={{ marginTop: '0.25rem', width: '18px', height: '18px', cursor: 'pointer', accentColor: '#0067ff' }}
                                  />
                                  <div>
                                    <div style={{ fontWeight: '600', color: '#1e293b', fontSize: '0.95rem' }}>{perm.descricao}</div>
                                    <div style={{ fontSize: '0.75rem', color: '#94a3b8', marginTop: '0.1rem', fontFamily: 'monospace' }}>{perm.chave}</div>
                                  </div>
                                </label>
                              );
                            })}
                          </div>
                        </div>
                      ))}
                    </div>

                  </div>
                </section>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', color: '#94a3b8', background: '#f8fafc', borderRadius: '20px', border: '2px dashed #e2e8f0' }}>
                  <ShieldCheck size={48} style={{ marginBottom: '1rem', opacity: 0.5 }} />
                  <h3 style={{ color: '#64748b' }}>Selecione um Cargo</h3>
                  <p style={{ fontSize: '0.9rem' }}>Escolha um cargo na lista ao lado para configurar.</p>
                </div>
              )}

            </div>
          </main>
        </div>
      </div>
    </>
  );
}