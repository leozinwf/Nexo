import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../services/supabase';
// 🌟 CORREÇÃO 1: Adicionado o ícone Clock na importação
import { Users, Menu, Edit, X, Save, Briefcase, Mail, Search, Calendar, Shield, Plus, Clock } from 'lucide-react';
import toast from 'react-hot-toast';
import { Sidebar } from '../components/Sidebar';
import { usePermission } from '../hooks/usePermissions';
import { Loading } from '../components/Loading';

export function Colaboradores() {
  const navigate = useNavigate();
  const { temAcesso: podeGerenciarUsuarios, loadingPermissao } = usePermission('usuarios.gerenciar');
  
  const [colaboradores, setColaboradores] = useState([]);
  const [busca, setBusca] = useState('');
  const [loading, setLoading] = useState(true);
  const [menuAberto, setMenuAberto] = useState(false);
  const [listaRoles, setListaRoles] = useState([]);
  const [roleSelecionada, setRoleSelecionada] = useState('');
  
  const [modalAberto, setModalAberto] = useState(false);
  const [modalConvite, setModalConvite] = useState(false);
  const [usuarioEditando, setUsuarioEditando] = useState(null);
  const [formConfig, setFormConfig] = useState({});
  const [formConvite, setFormConvite] = useState({ email: '', nome_completo: '', cpf: '', cargo: '', departamento: '' });
  const [empresaIdAdmin, setEmpresaIdAdmin] = useState(null);

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

    const [resRoles, resColabs] = await Promise.all([
      supabase.from('roles').select('id, nome').eq('empresa_id', perfil.empresa_id),
      supabase.from('perfis').select('*').eq('empresa_id', perfil.empresa_id).order('nome_completo', { ascending: true })
    ]);

    if (resRoles.data) setListaRoles(resRoles.data);
    if (resColabs.data) setColaboradores(resColabs.data);
    setLoading(false);
  };

  const colaboradoresFiltrados = colaboradores.filter(c => 
    c.nome_completo?.toLowerCase().includes(busca.toLowerCase()) || 
    c.cpf?.includes(busca)
  );

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

  const gerarConvite = async (e) => {
    e.preventDefault();

    const { data, error } = await supabase.from('convites').insert([
      {
        empresa_id: empresaIdAdmin,
        email: formConvite.email,
        nome_completo: formConvite.nome_completo,
        cpf: formConvite.cpf,
        cargo: formConvite.cargo,
        departamento: formConvite.departamento
      }
    ]).select().single();

    if (error) return toast.error("Erro ao gerar convite.");

    const linkConvite = `${window.location.origin}/convite/${data.id}`;

    const assunto = encodeURIComponent(`Convite de acesso: Sistema de Gestão`);
    const corpo = encodeURIComponent(
      `Olá ${formConvite.nome_completo},\n\n` +
      `Bem-vindo(a) à equipa! O seu perfil de ${formConvite.cargo} já foi pré-cadastrado no nosso sistema.\n\n` +
      `Para concluir o seu registo, confirmar os seus dados e criar uma palavra-passe segura, por favor clique no link abaixo:\n` +
      `${linkConvite}\n\n` +
      `Com os melhores cumprimentos,\nEquipa de Recursos Humanos`
    );

    window.open(`mailto:${formConvite.email}?subject=${assunto}&body=${corpo}`);

    toast.success("Convite gerado! Link aberto no seu e-mail.");
    setModalConvite(false);
    setFormConvite({ email: '', nome_completo: '', cpf: '', cargo: '', departamento: '' }); 
  };

  if (loading || loadingPermissao) return <Loading mensagem="A carregar colaboradores..." />;

  return (
    <div className="layout">
      <Sidebar menuAberto={menuAberto} setMenuAberto={setMenuAberto} />
      
      <div className="main-container">
        <header className="top-header">
          <button className="mobile-header-btn" onClick={() => setMenuAberto(true)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}><Menu size={24} /></button>
          <div style={{ color: '#64748b' }}>Gestão / <strong>Colaboradores</strong></div>
        </header>

        <main className="content">
          <div className="doohub-card" style={{ padding: '2rem' }}>
            
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem', gap: '1rem', flexWrap: 'wrap' }}>
              <div style={{ position: 'relative', flex: 1, maxWidth: '400px' }}>
                <Search size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
                <input 
                  className="form-control" 
                  placeholder="Pesquisar por nome ou CPF..." 
                  value={busca}
                  onChange={(e) => setBusca(e.target.value)}
                  style={{ paddingLeft: '2.5rem' }}
                />
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
                    <th>Admissão</th>
                    <th>Ponto</th>
                    <th style={{ textAlign: 'right' }}>Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {colaboradoresFiltrados.map(c => (
                    <tr key={c.id}>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                          <div style={{ width: '35px', height: '35px', borderRadius: '50%', background: '#eff6ff', color: '#0067ff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', fontSize: '0.8rem', flexShrink: 0 }}>
                            {c.nome_completo?.[0]?.toUpperCase() || 'U'}
                          </div>
                          <div>
                            <div style={{ fontWeight: '600', color: '#1e293b' }}>{c.nome_completo}</div>
                            <div style={{ fontSize: '0.7rem', color: '#94a3b8' }}>CPF: {c.cpf || 'Não informado'}</div>
                          </div>
                        </div>
                      </td>
                      <td>
                        <div style={{ fontWeight: '500' }}>{c.cargo || '-'}</div>
                        <div style={{ fontSize: '0.75rem', color: '#64748b' }}>{c.departamento || '-'}</div>
                      </td>
                      <td>{c.admissao ? new Date(c.admissao).toLocaleDateString('pt-BR') : '-'}</td>
                      <td>
                        <span style={{ 
                          padding: '4px 8px', borderRadius: '6px', fontSize: '0.7rem', fontWeight: 'bold',
                          background: c.almoco_automatico ? '#ecfdf5' : '#f1f5f9',
                          color: c.almoco_automatico ? '#10b981' : '#64748b'
                        }}>
                          {c.almoco_automatico ? 'AUTOMÁTICO' : 'MANUAL'}
                        </span>
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        <button className="btn-secondary" style={{ padding: '5px 10px', height: 'auto' }} onClick={() => abrirConfiguracao(c)}>
                          <Edit size={14} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </main>
      </div>

      {/* MODAL DE EDIÇÃO */}
      {modalAberto && (
        <div className="modal-overlay">
          <div className="modal-box" style={{ maxWidth: '700px', maxHeight: '90vh', overflowY: 'auto' }}>
            <div className="modal-header-box" style={{ borderBottom: '1px solid #e2e8f0', paddingBottom: '1rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                <div style={{ width: '45px', height: '45px', borderRadius: '12px', background: '#0067ff', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Edit size={24} />
                </div>
                <div>
                  <h3 style={{ margin: 0 }}>Editar Colaborador</h3>
                  <small style={{ color: '#64748b' }}>Atualizando dados no sistema</small>
                </div>
              </div>
              <button onClick={() => setModalAberto(false)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}><X /></button>
            </div>

            <form onSubmit={salvarColaborador} className="modal-body" style={{ marginTop: '1.5rem' }}>
              
              {/* 🌟 CORREÇÃO 2: Secção de Dados Pessoais com Nome e CPF */}
              <div style={{ marginBottom: '2rem' }}>
                <h4 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#1e293b', marginBottom: '1rem', fontSize: '0.9rem' }}>
                  <Users size={16} /> DADOS PESSOAIS
                </h4>
                <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '1rem' }}>
                  <div className="input-group">
                    <label>Nome Completo</label>
                    <input className="form-control" value={formConfig.nome_completo || ''} onChange={e => setFormConfig({...formConfig, nome_completo: e.target.value})} required />
                  </div>
                  <div className="input-group">
                    <label>CPF</label>
                    <input className="form-control" value={formConfig.cpf || ''} onChange={e => setFormConfig({...formConfig, cpf: e.target.value})} />
                  </div>
                </div>
              </div>

              <div style={{ marginBottom: '2rem' }}>
                <h4 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#0067ff', marginBottom: '1rem', fontSize: '0.9rem' }}>
                  <Briefcase size={16} /> DADOS CONTRATUAIS
                </h4>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem' }}>
                  <div className="input-group"><label>Cargo</label><input className="form-control" value={formConfig.cargo || ''} onChange={e => setFormConfig({...formConfig, cargo: e.target.value})} /></div>
                  <div className="input-group"><label>Departamento</label><input className="form-control" value={formConfig.departamento || ''} onChange={e => setFormConfig({...formConfig, departamento: e.target.value})} /></div>
                  <div className="input-group"><label>Admissão</label><input type="date" className="form-control" value={formConfig.admissao || ''} onChange={e => setFormConfig({...formConfig, admissao: e.target.value})} /></div>
                </div>
              </div>

              <div style={{ marginBottom: '2rem', padding: '1.25rem', background: '#f8fafc', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                <h4 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#64748b', marginBottom: '1rem', fontSize: '0.9rem' }}>
                  <Shield size={16} /> NÍVEL DE ACESSO
                </h4>
                <select className="form-control" value={roleSelecionada} onChange={e => setRoleSelecionada(e.target.value)}>
                  <option value="">Colaborador Padrão (Apenas Ponto)</option>
                  {listaRoles.map(r => <option key={r.id} value={r.id}>{r.nome}</option>)}
                </select>
              </div>

              <div>
                <h4 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#f59e0b', marginBottom: '1rem', fontSize: '0.9rem' }}>
                  <Clock size={16} /> JORNADA E ALMOÇO
                </h4>
                <div className="input-group" style={{ marginBottom: '1rem' }}>
                  <label>Descrição do Expediente</label>
                  <input className="form-control" value={formConfig.expediente || ''} onChange={e => setFormConfig({...formConfig, expediente: e.target.value})} placeholder="Ex: Seg a Sex, 09h às 18h" />
                </div>
                
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

      {/* MODAL DE CONVITE */}
      {modalConvite && (
        <div className="modal-overlay">
          <div className="modal-box" style={{ maxWidth: '500px' }}>
            <div className="modal-header-box">
              <h3>Cadastrar Colaborador</h3>
              <button onClick={() => setModalConvite(false)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}><X size={20} /></button>
            </div>

            <form onSubmit={gerarConvite}>
              <div className="modal-body">
                <div className="input-group">
                  <label>Nome Completo *</label>
                  <input className="form-control" value={formConvite.nome_completo || ''} onChange={e => setFormConvite({ ...formConvite, nome_completo: e.target.value })} required placeholder="Ex: João da Silva" />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                  <div className="input-group">
                    <label>E-mail *</label>
                    <input className="form-control" type="email" value={formConvite.email || ''} onChange={e => setFormConvite({ ...formConvite, email: e.target.value })} required placeholder="joao@empresa.com" />
                  </div>

                  <div className="input-group">
                    <label>CPF *</label>
                    <input className="form-control" value={formConvite.cpf || ''} onChange={e => setFormConvite({ ...formConvite, cpf: e.target.value })} required placeholder="000.000.000-00" />
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                  <div className="input-group">
                    <label>Cargo</label>
                    <input className="form-control" value={formConvite.cargo || ''} onChange={e => setFormConvite({ ...formConvite, cargo: e.target.value })} placeholder="Ex: Vendedor" />
                  </div>

                  <div className="input-group">
                    <label>Departamento</label>
                    <input className="form-control" value={formConvite.departamento || ''} onChange={e => setFormConvite({ ...formConvite, departamento: e.target.value })} placeholder="Ex: Comercial" />
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