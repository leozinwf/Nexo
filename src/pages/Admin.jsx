import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../services/supabase';
import { Users, Menu, Edit, X, Building, Save, Briefcase, FileText } from 'lucide-react';
import toast from 'react-hot-toast';
import { Sidebar } from '../components/Sidebar';

export function Admin() {
  const navigate = useNavigate();
  const [colaboradores, setColaboradores] = useState([]);
  const [loading, setLoading] = useState(true);
  const [menuAberto, setMenuAberto] = useState(false);
  const [abaAtiva, setAbaAtiva] = useState('equipe');

  const [modalAberto, setModalAberto] = useState(false);
  const [usuarioEditando, setUsuarioEditando] = useState(null);
  const [formConfig, setFormConfig] = useState({});
  const [dadosEmpresa, setDadosEmpresa] = useState({ razao_social: '', cnpj: '', endereco: '' });

  useEffect(() => {
    carregarDadosIniciais();
  }, []);

  const carregarDadosIniciais = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return navigate('/');
    const { data: perfil } = await supabase.from('perfis').select('is_admin').eq('id', user.id).single();
    if (!perfil?.is_admin) return navigate('/dashboard');

    const resEmpresa = await supabase.from('config_empresa').select('*').eq('id', 1).single();
    if (resEmpresa.data) setDadosEmpresa(resEmpresa.data);

    const resColabs = await supabase.from('perfis').select('*').order('nome_completo', { ascending: true });
    if (resColabs.data) setColaboradores(resColabs.data);
    setLoading(false);
  };

  const abrirConfiguracao = (colab) => {
    setUsuarioEditando(colab);
    setFormConfig({ ...colab });
    setModalAberto(true);
  };

  const salvarColaborador = async (e) => {
    e.preventDefault();
    const { error } = await supabase.from('perfis').update(formConfig).eq('id', usuarioEditando.id);
    if (error) return toast.error("Erro ao salvar dados.");
    toast.success("Perfil atualizado com sucesso!");
    setModalAberto(false);
    carregarDadosIniciais();
  };

  const salvarEmpresa = async (e) => {
    e.preventDefault();
    const { error } = await supabase.from('config_empresa').update(dadosEmpresa).eq('id', 1);
    if (error) return toast.error("Erro ao salvar empresa.");
    toast.success("Dados da empresa atualizados!");
  };

  return (
    <div className="layout">
      <div className={`overlay ${menuAberto ? 'open' : ''}`} onClick={() => setMenuAberto(false)}></div>
      <Sidebar menuAberto={menuAberto} setMenuAberto={setMenuAberto} />
      <div className="main-container">
        <header className="top-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <button className="mobile-header-btn" onClick={() => setMenuAberto(true)}><Menu size={24} /></button>
            <div style={{ color: '#64748b' }}>Portal / <strong>Administração</strong></div>
          </div>
        </header>

        <main className="content">
          <div className="doohub-card" style={{ padding: 0, overflow: 'hidden' }}>
            <div style={{ display: 'flex', borderBottom: '1px solid #e2e8f0', background: '#f8fafc' }}>
              <button onClick={() => setAbaAtiva('equipe')} style={{ flex: 1, padding: '1.25rem', border: 'none', background: abaAtiva === 'equipe' ? '#fff' : 'transparent', borderBottom: abaAtiva === 'equipe' ? '3px solid #0067ff' : 'none', fontWeight: 'bold', color: abaAtiva === 'equipe' ? '#0067ff' : '#64748b', cursor: 'pointer' }}>Equipe e Contratos</button>
              <button onClick={() => setAbaAtiva('empresa')} style={{ flex: 1, padding: '1.25rem', border: 'none', background: abaAtiva === 'empresa' ? '#fff' : 'transparent', borderBottom: abaAtiva === 'empresa' ? '3px solid #0067ff' : 'none', fontWeight: 'bold', color: abaAtiva === 'empresa' ? '#0067ff' : '#64748b', cursor: 'pointer' }}>Dados da Empresa</button>
            </div>

            <div style={{ padding: '2rem' }}>
              {abaAtiva === 'equipe' ? (
                loading ? <p>Carregando equipe...</p> : (
                  <table className="doohub-table responsive-table">
                    <thead>
                      <tr><th>Nome</th><th>Cargo / Departamento</th><th>Ponto</th><th>Ações</th></tr>
                    </thead>
                    <tbody>
                      {colaboradores.map(c => (
                        <tr key={c.id}>
                          <td data-label="Nome"><strong>{c.nome_completo}</strong><br/><small>{c.cpf || 'CPF não cadastrado'}</small></td>
                          <td data-label="Cargo">{c.cargo || '-'}<br/><small>{c.departamento || '-'}</small></td>
                          <td data-label="Ponto">{c.almoco_automatico ? '🍱 Automático' : '🖱️ Manual'}</td>
                          <td data-label="Ações">
                            <button className="action-btn" style={{padding:'5px 10px'}} onClick={() => abrirConfiguracao(c)}><Edit size={16} /> Editar</button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )
              ) : (
                <form onSubmit={salvarEmpresa} style={{ maxWidth: '600px' }}>
                  <div className="input-group" style={{marginBottom:'1rem'}}><label>Razão Social</label><input className="form-control" value={dadosEmpresa.razao_social} onChange={e => setDadosEmpresa({...dadosEmpresa, razao_social: e.target.value})} required /></div>
                  <div className="input-group" style={{marginBottom:'1rem'}}><label>CNPJ</label><input className="form-control" value={dadosEmpresa.cnpj} onChange={e => setDadosEmpresa({...dadosEmpresa, cnpj: e.target.value})} required /></div>
                  <div className="input-group" style={{marginBottom:'1.5rem'}}><label>Endereço Completo</label><textarea className="form-control" rows="3" value={dadosEmpresa.endereco} onChange={e => setDadosEmpresa({...dadosEmpresa, endereco: e.target.value})} required /></div>
                  <button type="submit" className="action-btn" style={{background:'#0067ff', color:'#fff', width:'auto'}}><Save size={18} /> Atualizar Empresa</button>
                </form>
              )}
            </div>
          </div>
        </main>
      </div>

      {modalAberto && (
        <div className="modal-overlay">
          <div className="modal-box" style={{ maxWidth: '650px', maxHeight: '90vh', overflowY: 'auto' }}>
            <div className="modal-header-box"><h3>Configurar Colaborador</h3><button onClick={() => setModalAberto(false)}><X /></button></div>
            <form onSubmit={salvarColaborador} className="modal-body">
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div className="input-group"><label>CPF</label><input className="form-control" value={formConfig.cpf || ''} onChange={e => setFormConfig({...formConfig, cpf: e.target.value})} /></div>
                <div className="input-group"><label>Data de Admissão</label><input type="date" className="form-control" value={formConfig.admissao || ''} onChange={e => setFormConfig({...formConfig, admissao: e.target.value})} /></div>
                <div className="input-group"><label>Cargo</label><input className="form-control" value={formConfig.cargo || ''} onChange={e => setFormConfig({...formConfig, cargo: e.target.value})} /></div>
                <div className="input-group"><label>Departamento</label><input className="form-control" value={formConfig.departamento || ''} onChange={e => setFormConfig({...formConfig, departamento: e.target.value})} /></div>
                <div className="input-group" style={{gridColumn:'span 2'}}><label>Expediente</label><textarea className="form-control" rows="2" value={formConfig.expediente || ''} onChange={e => setFormConfig({...formConfig, expediente: e.target.value})} /></div>
              </div>

              <div style={{marginTop:'1.5rem', padding:'1rem', background:'#f8fafc', borderRadius:'8px', border:'1px solid #e2e8f0'}}>
                <h4 style={{marginBottom:'1rem'}}>Configuração de Almoço</h4>
                <div style={{display:'flex', alignItems:'center', gap:'1rem', marginBottom:'1rem'}}>
                   <input type="checkbox" checked={formConfig.almoco_automatico} onChange={e => setFormConfig({...formConfig, almoco_automatico: e.target.checked})} id="auto" />
                   <label htmlFor="auto">Habilitar Almoço Pré-assinalado</label>
                </div>
                {formConfig.almoco_automatico && (
                  <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:'1rem'}}>
                    <div className="input-group"><label>Saída Almoço</label><input type="time" className="form-control" value={formConfig.hora_saida_pausa || ''} onChange={e => setFormConfig({...formConfig, hora_saida_pausa: e.target.value})} /></div>
                    <div className="input-group"><label>Retorno Almoço</label><input type="time" className="form-control" value={formConfig.hora_retorno_pausa || ''} onChange={e => setFormConfig({...formConfig, hora_retorno_pausa: e.target.value})} /></div>
                  </div>
                )}
              </div>
              <div className="modal-footer"><button type="submit" className="form-control" style={{background:'#0067ff', color:'#fff', fontWeight:'bold'}}>Salvar Alterações</button></div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}