import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../services/supabase';
import { Users, Menu, Edit, X, Save, Briefcase, Mail, Search, Shield, Plus, Clock, Trash2, Building, Copy } from 'lucide-react';
import toast from 'react-hot-toast';
import { Sidebar } from '../components/Sidebar';
import { usePermission } from '../hooks/usePermissions';
import { Loading } from '../components/Loading';

const aplicarMascaraCPF = (valor) => {
  return valor.replace(/\D/g, '').replace(/(\d{3})(\d)/, '$1.$2').replace(/(\d{3})(\d)/, '$1.$2').replace(/(\d{3})(\d{1,2})/, '$1-$2').replace(/(-\d{2})\d+?$/, '$1');
};

export function Colaboradores() {
  const navigate = useNavigate();
  const { temAcesso: podeGerenciarUsuarios, loadingPermissao } = usePermission('usuarios.gerenciar');
  
  const [colaboradores, setColaboradores] = useState([]);
  const [cargosRH, setCargosRH] = useState([]);
  const [departamentos, setDepartamentos] = useState([]);
  
  const [busca, setBusca] = useState('');
  const [loading, setLoading] = useState(true);
  const [menuAberto, setMenuAberto] = useState(false);
  const [abaAtiva, setAbaAtiva] = useState('equipe');
  
  const [listaRoles, setListaRoles] = useState([]);
  const [roleSelecionada, setRoleSelecionada] = useState('');
  
  const [modalAberto, setModalAberto] = useState(false);
  const [modalConvite, setModalConvite] = useState(false);
  const [usuarioEditando, setUsuarioEditando] = useState(null);
  const [formConfig, setFormConfig] = useState({});
  const [formConvite, setFormConvite] = useState({ email: '', nome_completo: '', cpf: '', cargo: '', departamento: '' });
  const [empresaIdAdmin, setEmpresaIdAdmin] = useState(null);

  const [novoCargo, setNovoCargo] = useState('');
  const [novoDepto, setNovoDepto] = useState('');

  useEffect(() => {
    carregarDadosIniciais();
  }, []);

  const carregarDadosIniciais = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return navigate('/');

    const { data: perfil } = await supabase.from('perfis').select('empresa_id, tipo_perfil').eq('id', user.id).single();
    if (perfil?.tipo_perfil !== 'admin_master' && perfil?.tipo_perfil !== 'rh') {
      return navigate('/dashboard');
    }
    
    setEmpresaIdAdmin(perfil.empresa_id);

    // 🌟 MÁGICA: Agora buscamos os perfis ativos E os convites pendentes
    const [resRoles, resColabs, resCargos, resDeptos, resConvites] = await Promise.all([
      supabase.from('roles').select('id, nome').eq('empresa_id', perfil.empresa_id),
      supabase.from('perfis').select('*').eq('empresa_id', perfil.empresa_id),
      supabase.from('cargos_rh').select('*').eq('empresa_id', perfil.empresa_id).order('nome', { ascending: true }),
      supabase.from('departamentos').select('*').eq('empresa_id', perfil.empresa_id).order('nome', { ascending: true }),
      supabase.from('convites').select('*').eq('empresa_id', perfil.empresa_id) // Tabela de convites
    ]);

    // Descobre quais emails já completaram o cadastro
    const emailsAtivos = resColabs.data ? resColabs.data.map(p => p.email) : [];
    
    // Filtra apenas os convites que ainda não viraram perfis ativos
    const convitesPendentes = (resConvites.data || []).filter(c => !emailsAtivos.includes(c.email));

    // Junta as duas listas e diz o status de cada um
    const listaCombinada = [
      ...(resColabs.data || []).map(c => ({ ...c, status_usuario: 'ativo' })),
      ...convitesPendentes.map(c => ({ ...c, is_convite: true, status_usuario: 'pendente' }))
    ];

    // Ordena todos por nome em ordem alfabética
    listaCombinada.sort((a, b) => (a.nome_completo || '').localeCompare(b.nome_completo || ''));

    if (resRoles.data) setListaRoles(resRoles.data);
    setColaboradores(listaCombinada);
    if (resCargos.data) setCargosRH(resCargos.data);
    if (resDeptos.data) setDepartamentos(resDeptos.data);
    
    setLoading(false);
  };

  // ==========================================
  // FUNÇÕES DE ESTRUTURA (CARGOS E DEPTOS)
  // ==========================================
  const handleAddCargo = async (e) => {
    e.preventDefault();
    if (!novoCargo.trim()) return;
    await supabase.from('cargos_rh').insert([{ nome: novoCargo.trim(), empresa_id: empresaIdAdmin }]);
    setNovoCargo('');
    toast.success("Cargo registrado!");
    carregarDadosIniciais();
  };

  const handleAddDepto = async (e) => {
    e.preventDefault();
    if (!novoDepto.trim()) return;
    await supabase.from('departamentos').insert([{ nome: novoDepto.trim(), empresa_id: empresaIdAdmin }]);
    setNovoDepto('');
    toast.success("Departamento registrado!");
    carregarDadosIniciais();
  };

  const handleEditarCargo = async (cargo) => {
    const novoNome = window.prompt("Editar nome do cargo:", cargo.nome);
    if (!novoNome || novoNome.trim() === '' || novoNome === cargo.nome) return;
    toast.loading("Atualizando em toda a empresa...", { id: 'edit' });
    await supabase.from('cargos_rh').update({ nome: novoNome.trim() }).eq('id', cargo.id);
    await supabase.from('perfis').update({ cargo: novoNome.trim() }).eq('cargo', cargo.nome).eq('empresa_id', empresaIdAdmin);
    toast.success("Cargo atualizado!", { id: 'edit' });
    carregarDadosIniciais();
  };

  const handleEditarDepto = async (depto) => {
    const novoNome = window.prompt("Editar nome do departamento:", depto.nome);
    if (!novoNome || novoNome.trim() === '' || novoNome === depto.nome) return;
    toast.loading("Atualizando em toda a empresa...", { id: 'edit' });
    await supabase.from('departamentos').update({ nome: novoNome.trim() }).eq('id', depto.id);
    await supabase.from('perfis').update({ departamento: novoNome.trim() }).eq('departamento', depto.nome).eq('empresa_id', empresaIdAdmin);
    toast.success("Departamento atualizado!", { id: 'edit' });
    carregarDadosIniciais();
  };

  const handleExcluirCargo = async (cargo) => {
    const { count } = await supabase.from('perfis').select('id', { count: 'exact', head: true }).eq('cargo', cargo.nome).eq('empresa_id', empresaIdAdmin);
    if (count > 0) return toast.error(`Atenção: Este cargo está atrelado a ${count} colaborador(es). Por favor, altere o cargo deles antes de excluir este.`, { duration: 5000 });
    if (!window.confirm(`Tem certeza que deseja excluir o cargo "${cargo.nome}"?`)) return;
    await supabase.from('cargos_rh').delete().eq('id', cargo.id);
    toast.success("Cargo excluído!");
    carregarDadosIniciais();
  };

  const handleExcluirDepto = async (depto) => {
    const { count } = await supabase.from('perfis').select('id', { count: 'exact', head: true }).eq('departamento', depto.nome).eq('empresa_id', empresaIdAdmin);
    if (count > 0) return toast.error(`Atenção: Este departamento tem ${count} colaborador(es) atrelados. Mude-os de setor primeiro.`, { duration: 5000 });
    if (!window.confirm(`Tem certeza que deseja excluir o departamento "${depto.nome}"?`)) return;
    await supabase.from('departamentos').delete().eq('id', depto.id);
    toast.success("Departamento excluído!");
    carregarDadosIniciais();
  };

  // ==========================================
  // FUNÇÕES DE CONVITE E USUÁRIOS
  // ==========================================
  const copiarLinkConvite = (id) => {
    const link = `${window.location.origin}/convite/${id}`;
    navigator.clipboard.writeText(link);
    toast.success("Link copiado para a área de transferência!");
  };

  const cancelarConvite = async (id) => {
    if(!window.confirm("Tem certeza que deseja cancelar este convite?")) return;
    await supabase.from('convites').delete().eq('id', id);
    toast.success("Convite cancelado!");
    carregarDadosIniciais();
  };

  const gerarConvite = async (e) => {
    e.preventDefault();
    const { data, error } = await supabase.from('convites').insert([{
      empresa_id: empresaIdAdmin, email: formConvite.email, nome_completo: formConvite.nome_completo,
      cpf: formConvite.cpf, cargo: formConvite.cargo, departamento: formConvite.departamento
    }]).select().single();

    if (error) return toast.error("Erro ao gerar convite.");

    const linkConvite = `${window.location.origin}/convite/${data.id}`;
    const assunto = encodeURIComponent(`Convite de acesso: Sistema de Gestão`);
    const corpo = encodeURIComponent(`Olá ${formConvite.nome_completo},\n\nPara concluir o seu registro, confirmar seus dados e criar uma senha segura, por favor clique no link abaixo:\n${linkConvite}`);
    window.open(`mailto:${formConvite.email}?subject=${assunto}&body=${corpo}`);

    toast.success("Convite gerado! O colaborador já aparece na lista.");
    setModalConvite(false);
    setFormConvite({ email: '', nome_completo: '', cpf: '', cargo: '', departamento: '' }); 
    carregarDadosIniciais(); // 🌟 Atualiza a lista na hora!
  };

  const abrirConfiguracao = async (colab) => {
    setUsuarioEditando(colab);
    setFormConfig({ ...colab });
    const { data } = await supabase.from('usuario_roles').select('role_id').eq('usuario_id', colab.id).maybeSingle();
    setRoleSelecionada(data?.role_id || '');
    setModalAberto(true);
  };

  const salvarColaborador = async (e) => {
    e.preventDefault();
    await supabase.from('perfis').update(formConfig).eq('id', usuarioEditando.id);
    
    await supabase.from('usuario_roles').delete().eq('usuario_id', usuarioEditando.id);
    if (roleSelecionada) {
      await supabase.from('usuario_roles').insert([{ usuario_id: usuarioEditando.id, role_id: roleSelecionada }]);
    }

    toast.success("Dados salvos com sucesso!");
    setModalAberto(false);
    carregarDadosIniciais();
  };

  const colaboradoresFiltrados = colaboradores.filter(c => c.nome_completo?.toLowerCase().includes(busca.toLowerCase()) || c.cpf?.includes(busca));

  if (loading || loadingPermissao) return <Loading mensagem="Carregando dados..." />;

  return (
    <div className="layout">
      <Sidebar menuAberto={menuAberto} setMenuAberto={setMenuAberto} />
      
      <div className="main-container">
        <header className="top-header">
          <button className="mobile-header-btn" onClick={() => setMenuAberto(true)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}><Menu size={24} /></button>
          <div style={{ color: '#64748b' }}>Gestão / <strong>Administração de Pessoas</strong></div>
        </header>

        <main className="content">
          <div className="doohub-card" style={{ padding: 0, overflow: 'hidden' }}>
            
            <div style={{ display: 'flex', borderBottom: '1px solid #e2e8f0', background: '#f8fafc' }}>
              <button onClick={() => setAbaAtiva('equipe')} style={{ flex: 1, padding: '1.25rem', border: 'none', background: abaAtiva === 'equipe' ? '#fff' : 'transparent', borderBottom: abaAtiva === 'equipe' ? '3px solid #0067ff' : 'none', fontWeight: 'bold', color: abaAtiva === 'equipe' ? '#0067ff' : '#64748b', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}>
                <Users size={18}/> Membros da Equipe
              </button>
              <button onClick={() => setAbaAtiva('estrutura')} style={{ flex: 1, padding: '1.25rem', border: 'none', background: abaAtiva === 'estrutura' ? '#fff' : 'transparent', borderBottom: abaAtiva === 'estrutura' ? '3px solid #0067ff' : 'none', fontWeight: 'bold', color: abaAtiva === 'estrutura' ? '#0067ff' : '#64748b', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}>
                <Building size={18}/> Estrutura (Cargos e Deptos)
              </button>
            </div>

            <div style={{ padding: '2rem' }}>
              {abaAtiva === 'equipe' && (
                <>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem', gap: '1rem', flexWrap: 'wrap' }}>
                    <div style={{ position: 'relative', flex: 1, maxWidth: '400px' }}>
                      <Search size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
                      <input className="form-control" placeholder="Pesquisar por nome ou CPF..." value={busca} onChange={(e) => setBusca(e.target.value)} style={{ paddingLeft: '2.5rem' }} />
                    </div>
                    {podeGerenciarUsuarios && (
                      <button onClick={() => setModalConvite(true)} className="btn-salvar" style={{ width: 'auto' }}>
                        <Plus size={18} /> Novo Colaborador
                      </button>
                    )}
                  </div>

                  <div style={{ overflowX: 'auto' }}>
                    <table className="doohub-table">
                      <thead>
                        <tr>
                          <th>Nome</th>
                          <th>Cargo / Dept.</th>
                          <th>Status</th>
                          <th>Ponto</th>
                          <th style={{ textAlign: 'right' }}>Ações</th>
                        </tr>
                      </thead>
                      <tbody>
                        {colaboradoresFiltrados.map(c => (
                          <tr key={c.id}>
                            <td>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', opacity: c.status_usuario === 'pendente' ? 0.6 : 1 }}>
                                <div style={{ width: '35px', height: '35px', borderRadius: '50%', background: c.status_usuario === 'pendente' ? '#f1f5f9' : '#eff6ff', color: c.status_usuario === 'pendente' ? '#64748b' : '#0067ff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', fontSize: '0.8rem', flexShrink: 0 }}>
                                  {c.nome_completo?.[0]?.toUpperCase() || 'U'}
                                </div>
                                <div>
                                  <div style={{ fontWeight: '600', color: '#1e293b' }}>{c.nome_completo}</div>
                                  <div style={{ fontSize: '0.7rem', color: '#94a3b8' }}>CPF: {c.cpf || 'Não informado'}</div>
                                </div>
                              </div>
                            </td>
                            <td style={{ opacity: c.status_usuario === 'pendente' ? 0.6 : 1 }}>
                              <div style={{ fontWeight: '500' }}>{c.cargo || '-'}</div>
                              <div style={{ fontSize: '0.75rem', color: '#64748b' }}>{c.departamento || '-'}</div>
                            </td>
                            
                            {/* 🌟 NOVA COLUNA DE STATUS */}
                            <td>
                              {c.status_usuario === 'ativo' ? (
                                <span style={{ padding: '4px 8px', borderRadius: '6px', fontSize: '0.7rem', fontWeight: 'bold', background: '#ecfdf5', color: '#10b981' }}>ATIVO</span>
                              ) : (
                                <span style={{ padding: '4px 8px', borderRadius: '6px', fontSize: '0.7rem', fontWeight: 'bold', background: '#fffbeb', color: '#d97706', border: '1px solid #fde68a' }}>AGUARDANDO</span>
                              )}
                            </td>

                            <td>
                              {c.status_usuario === 'ativo' ? (
                                <span style={{ padding: '4px 8px', borderRadius: '6px', fontSize: '0.7rem', fontWeight: 'bold', background: c.almoco_automatico ? '#ecfdf5' : '#f1f5f9', color: c.almoco_automatico ? '#10b981' : '#64748b' }}>
                                  {c.almoco_automatico ? 'AUTOMÁTICO' : 'MANUAL'}
                                </span>
                              ) : (
                                <span style={{ fontSize: '0.8rem', color: '#94a3b8' }}>-</span>
                              )}
                            </td>
                            
                            {/* 🌟 AÇÕES INTELIGENTES CONFORME O STATUS */}
                            <td style={{ textAlign: 'right' }}>
                              {c.is_convite ? (
                                <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                                  <button className="btn-secondary" style={{ padding: '5px', height: 'auto' }} onClick={() => copiarLinkConvite(c.id)} title="Copiar Link de Convite"><Copy size={14} /></button>
                                  <button className="btn-secondary" style={{ padding: '5px', height: 'auto', color: '#ef4444', borderColor: '#fee2e2', background: '#fef2f2' }} onClick={() => cancelarConvite(c.id)} title="Cancelar Convite"><Trash2 size={14} /></button>
                                </div>
                              ) : (
                                <button className="btn-secondary" style={{ padding: '5px 10px', height: 'auto' }} onClick={() => abrirConfiguracao(c)} title="Editar Colaborador"><Edit size={14} /></button>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </>
              )}

              {/* ABA: ESTRUTURA (CARGOS E DEPTOS) - CÓDIGO MANTIDO */}
              {abaAtiva === 'estrutura' && (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem', alignItems: 'start' }}>
                  <div style={{ background: '#f8fafc', padding: '1.5rem', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                    <h3 style={{ color: '#1e293b', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}><Briefcase size={18} color="#0067ff" /> Gerenciar Cargos</h3>
                    <form onSubmit={handleAddCargo} style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem' }}>
                      <input className="form-control" value={novoCargo} onChange={e => setNovoCargo(e.target.value)} placeholder="Ex: Analista de Sistemas" style={{ flex: 1 }} required />
                      <button type="submit" className="btn-primary" style={{ padding: '0 1rem' }}><Plus size={18} /></button>
                    </form>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                      {cargosRH.length === 0 ? <p style={{ color: '#94a3b8', fontSize: '0.9rem', textAlign: 'center' }}>Nenhum cargo cadastrado.</p> : null}
                      {cargosRH.map(c => (
                        <div key={c.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#fff', padding: '0.75rem 1rem', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                          <strong style={{ color: '#334155', fontSize: '0.9rem' }}>{c.nome}</strong>
                          <div style={{ display: 'flex', gap: '0.5rem' }}>
                            <button onClick={() => handleEditarCargo(c)} className="btn-secondary" style={{ padding: '5px', height: 'auto' }} title="Renomear"><Edit size={14} /></button>
                            <button onClick={() => handleExcluirCargo(c)} className="btn-secondary" style={{ padding: '5px', height: 'auto', color: '#ef4444', borderColor: '#fee2e2', background: '#fef2f2' }} title="Excluir"><Trash2 size={14} /></button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div style={{ background: '#f8fafc', padding: '1.5rem', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                    <h3 style={{ color: '#1e293b', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}><Building size={18} color="#0067ff" /> Gerenciar Departamentos</h3>
                    <form onSubmit={handleAddDepto} style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem' }}>
                      <input className="form-control" value={novoDepto} onChange={e => setNovoDepto(e.target.value)} placeholder="Ex: Comercial, TI..." style={{ flex: 1 }} required />
                      <button type="submit" className="btn-primary" style={{ padding: '0 1rem' }}><Plus size={18} /></button>
                    </form>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                      {departamentos.length === 0 ? <p style={{ color: '#94a3b8', fontSize: '0.9rem', textAlign: 'center' }}>Nenhum departamento cadastrado.</p> : null}
                      {departamentos.map(d => (
                        <div key={d.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#fff', padding: '0.75rem 1rem', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                          <strong style={{ color: '#334155', fontSize: '0.9rem' }}>{d.nome}</strong>
                          <div style={{ display: 'flex', gap: '0.5rem' }}>
                            <button onClick={() => handleEditarDepto(d)} className="btn-secondary" style={{ padding: '5px', height: 'auto' }} title="Renomear"><Edit size={14} /></button>
                            <button onClick={() => handleExcluirDepto(d)} className="btn-secondary" style={{ padding: '5px', height: 'auto', color: '#ef4444', borderColor: '#fee2e2', background: '#fef2f2' }} title="Excluir"><Trash2 size={14} /></button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </main>
      </div>

      {/* MODAL DE EDIÇÃO E CONVITE (MANTIDOS IGUAIS) */}
      {modalAberto && (
        <div className="modal-overlay">
          <div className="modal-box" style={{ maxWidth: '700px', maxHeight: '90vh', overflowY: 'auto' }}>
            <div className="modal-header-box" style={{ borderBottom: '1px solid #e2e8f0', paddingBottom: '1rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                <div style={{ width: '45px', height: '45px', borderRadius: '12px', background: '#0067ff', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Edit size={24} /></div>
                <div><h3 style={{ margin: 0 }}>Editar Colaborador</h3><small style={{ color: '#64748b' }}>Atualizando dados no sistema</small></div>
              </div>
              <button onClick={() => setModalAberto(false)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}><X /></button>
            </div>

            <form onSubmit={salvarColaborador} className="modal-body" style={{ marginTop: '1.5rem' }}>
              <div style={{ marginBottom: '2rem' }}>
                <h4 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#1e293b', marginBottom: '1rem', fontSize: '0.9rem' }}><Users size={16} /> DADOS PESSOAIS</h4>
                <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '1rem' }}>
                  <div className="input-group"><label>Nome Completo</label><input className="form-control" value={formConfig.nome_completo || ''} onChange={e => setFormConfig({...formConfig, nome_completo: e.target.value})} required /></div>
                  <div className="input-group"><label>CPF</label><input className="form-control" value={formConfig.cpf || ''} onChange={e => setFormConfig({...formConfig, cpf: aplicarMascaraCPF(e.target.value)})} maxLength="14" placeholder="000.000.000-00" /></div>
                </div>
              </div>

              <div style={{ marginBottom: '2rem' }}>
                <h4 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#0067ff', marginBottom: '1rem', fontSize: '0.9rem' }}><Briefcase size={16} /> DADOS CONTRATUAIS</h4>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem' }}>
                  <div className="input-group">
                    <label>Cargo</label>
                    <select className="form-control" value={formConfig.cargo || ''} onChange={e => setFormConfig({...formConfig, cargo: e.target.value})}>
                      <option value="">Selecione...</option>
                      {cargosRH.map(c => <option key={c.id} value={c.nome}>{c.nome}</option>)}
                    </select>
                  </div>
                  <div className="input-group">
                    <label>Departamento</label>
                    <select className="form-control" value={formConfig.departamento || ''} onChange={e => setFormConfig({...formConfig, departamento: e.target.value})}>
                      <option value="">Selecione...</option>
                      {departamentos.map(d => <option key={d.id} value={d.nome}>{d.nome}</option>)}
                    </select>
                  </div>
                  <div className="input-group"><label>Admissão</label><input type="date" className="form-control" value={formConfig.admissao || ''} onChange={e => setFormConfig({...formConfig, admissao: e.target.value})} /></div>
                </div>
              </div>

              <div style={{ marginBottom: '2rem', padding: '1.25rem', background: '#f8fafc', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                <h4 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#64748b', marginBottom: '1rem', fontSize: '0.9rem' }}><Shield size={16} /> NÍVEL DE ACESSO</h4>
                <select className="form-control" value={roleSelecionada} onChange={e => setRoleSelecionada(e.target.value)}>
                  <option value="">Colaborador Padrão (Apenas Ponto)</option>
                  {listaRoles.map(r => <option key={r.id} value={r.id}>{r.nome}</option>)}
                </select>
              </div>

              <div>
                <h4 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#f59e0b', marginBottom: '1rem', fontSize: '0.9rem' }}><Clock size={16} /> JORNADA E ALMOÇO</h4>
                <div className="input-group" style={{ marginBottom: '1rem' }}><label>Descrição do Expediente</label><input className="form-control" value={formConfig.expediente || ''} onChange={e => setFormConfig({...formConfig, expediente: e.target.value})} placeholder="Ex: Seg a Sex, 09h às 18h" /></div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
                  <input type="checkbox" id="checkAuto" checked={formConfig.almoco_automatico} onChange={e => setFormConfig({...formConfig, almoco_automatico: e.target.checked})} style={{ width: '16px', height: '16px' }} />
                  <label htmlFor="checkAuto" style={{ cursor: 'pointer', margin: 0 }}>Habilitar Almoço Automático (Pré-assinalado)</label>
                </div>
                {formConfig.almoco_automatico && (
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                    <div className="input-group"><label>Saída Almoço</label><input type="time" className="form-control" value={formConfig.hora_saida_pausa || ''} onChange={e => setFormConfig({...formConfig, hora_saida_pausa: e.target.value})} /></div>
                    <div className="input-group"><label>Retorno Almoço</label><input type="time" className="form-control" value={formConfig.hora_retorno_pausa || ''} onChange={e => setFormConfig({...formConfig, hora_retorno_pausa: e.target.value})} /></div>
                  </div>
                )}
              </div>

              <div className="modal-footer" style={{ marginTop: '2rem', borderTop: '1px solid #e2e8f0', paddingTop: '1.5rem', display: 'flex', justifyContent: 'flex-end', gap: '1rem' }}>
                <button type="button" className="btn-secondary" onClick={() => setModalAberto(false)}>Cancelar</button>
                <button type="submit" className="btn-salvar" style={{ width: 'auto', minWidth: '150px' }}><Save size={18} /> Salvar Alterações</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {modalConvite && (
        <div className="modal-overlay">
          <div className="modal-box" style={{ maxWidth: '500px' }}>
            <div className="modal-header-box">
              <h3>Cadastrar Colaborador</h3>
              <button onClick={() => setModalConvite(false)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}><X size={20} /></button>
            </div>
            <form onSubmit={gerarConvite}>
              <div className="modal-body">
                <div className="input-group"><label>Nome Completo *</label><input className="form-control" value={formConvite.nome_completo || ''} onChange={e => setFormConvite({ ...formConvite, nome_completo: e.target.value })} required placeholder="Ex: João da Silva" /></div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                  <div className="input-group"><label>E-mail *</label><input className="form-control" type="email" value={formConvite.email || ''} onChange={e => setFormConvite({ ...formConvite, email: e.target.value })} required placeholder="joao@empresa.com" /></div>
                  <div className="input-group"><label>CPF *</label><input className="form-control" value={formConvite.cpf || ''} onChange={e => setFormConvite({ ...formConvite, cpf: aplicarMascaraCPF(e.target.value) })} required maxLength="14" placeholder="000.000.000-00" /></div>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                  <div className="input-group">
                    <label>Cargo</label>
                    <select className="form-control" value={formConvite.cargo || ''} onChange={e => setFormConvite({...formConvite, cargo: e.target.value})}>
                      <option value="">Selecione...</option>
                      {cargosRH.map(c => <option key={c.id} value={c.nome}>{c.nome}</option>)}
                    </select>
                  </div>
                  <div className="input-group">
                    <label>Departamento</label>
                    <select className="form-control" value={formConvite.departamento || ''} onChange={e => setFormConvite({...formConvite, departamento: e.target.value})}>
                      <option value="">Selecione...</option>
                      {departamentos.map(d => <option key={d.id} value={d.nome}>{d.nome}</option>)}
                    </select>
                  </div>
                </div>
              </div>
              <div className="modal-footer" style={{ display: 'flex', gap: '1rem' }}>
                <button type="button" className="btn-secondary" style={{ flex: 1 }} onClick={() => setModalConvite(false)}>Cancelar</button>
                <button type="submit" className="btn-salvar" style={{ flex: 2, margin: 0 }}><Mail size={18} /> Gerar Convite</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}