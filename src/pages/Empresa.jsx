import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../services/supabase';
import { Sidebar } from '../components/Sidebar';
import { Menu, Save, Building2, Image as ImageIcon, Phone, Mail } from 'lucide-react';
import toast from 'react-hot-toast';

export function Empresa() {
  const navigate = useNavigate();
  const [menuAberto, setMenuAberto] = useState(false);
  const [loading, setLoading] = useState(true);
  const [dadosEmpresa, setDadosEmpresa] = useState({
    nome_fantasia: '',
    razao_social: '',
    cnpj: '',
    email: '',
    telefone: '',
    endereco: '',
    logo_url: ''
  });

  useEffect(() => {
    carregarDados();
  }, []);

  const carregarDados = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return navigate('/');

    // Busca o perfil para saber a empresa do admin
    const { data: perfil } = await supabase.from('perfis').select('empresa_id, tipo_perfil').eq('id', user.id).single();
    
    // Proteção de rota: Só Admin Master ou RH acessa
    if (perfil?.tipo_perfil !== 'admin_master' && perfil?.tipo_perfil !== 'rh') {
      return navigate('/dashboard');
    }

    const { data: empresa } = await supabase.from('empresas').select('*').eq('id', perfil.empresa_id).single();
    if (empresa) setDadosEmpresa(empresa);
    setLoading(false);
  };

  const handleSalvar = async (e) => {
    e.preventDefault();
    const { error } = await supabase.from('empresas').update(dadosEmpresa).eq('id', dadosEmpresa.id);
    
    if (error) toast.error("Erro ao atualizar dados.");
    else toast.success("Identidade da empresa atualizada!");
  };

  if (loading) return <div className="layout">Carregando...</div>;

  return (
    <div className="layout">
      <div className={`overlay ${menuAberto ? 'open' : ''}`} onClick={() => setMenuAberto(false)}></div>
      <Sidebar menuAberto={menuAberto} setMenuAberto={setMenuAberto} />
      
      <div className="main-container">
        <header className="top-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <button className="mobile-header-btn" onClick={() => setMenuAberto(true)} style={{background:'none', border:'none'}}><Menu size={24} /></button>
            <div style={{ color: '#64748b' }}>Administração / <strong>Dados da Empresa</strong></div>
          </div>
        </header>

        <main className="content">
          <div style={{ backgroundColor: '#fff', padding: '2rem', borderRadius: '20px', border: '1px solid #e2e8f0' }}>
            <h2 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#1e293b', marginBottom: '2rem' }}>
              <Building2 color="#0067ff" /> Configurações da Empresa
            </h2>

            <form onSubmit={handleSalvar} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
              <div className="input-group" style={{ gridColumn: 'span 2' }}>
                <label>URL da Logomarca (White-label)</label>
                <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                  <input className="form-control" value={dadosEmpresa.logo_url || ''} onChange={e => setDadosEmpresa({...dadosEmpresa, logo_url: e.target.value})} placeholder="https://link-da-imagem.com/logo.png" />
                  {dadosEmpresa.logo_url && <img src={dadosEmpresa.logo_url} alt="Preview" style={{ height: '40px', borderRadius: '4px' }} />}
                </div>
              </div>

              <div className="input-group">
                <label>Nome Fantasia</label>
                <input className="form-control" value={dadosEmpresa.nome_fantasia} onChange={e => setDadosEmpresa({...dadosEmpresa, nome_fantasia: e.target.value})} required />
              </div>

              <div className="input-group">
                <label>CNPJ</label>
                <input className="form-control" value={dadosEmpresa.cnpj} onChange={e => setDadosEmpresa({...dadosEmpresa, cnpj: e.target.value})} />
              </div>

              <div className="input-group">
                <label><Mail size={14} /> E-mail de Contato</label>
                <input className="form-control" type="email" value={dadosEmpresa.email || ''} onChange={e => setDadosEmpresa({...dadosEmpresa, email: e.target.value})} />
              </div>

              <div className="input-group">
                <label><Phone size={14} /> Telefone</label>
                <input className="form-control" value={dadosEmpresa.telefone || ''} onChange={e => setDadosEmpresa({...dadosEmpresa, telefone: e.target.value})} />
              </div>

              <div className="input-group" style={{ gridColumn: 'span 2' }}>
                <label>Endereço Completo</label>
                <textarea className="form-control" rows="3" value={dadosEmpresa.endereco || ''} onChange={e => setDadosEmpresa({...dadosEmpresa, endereco: e.target.value})} />
              </div>

              <div style={{ gridColumn: 'span 2', marginTop: '1rem' }}>
                <button type="submit" className="btn-action" style={{ backgroundColor: '#0067ff', color: '#fff', border: 'none', width: '200px' }}>
                  <Save size={18} /> Salvar Alterações
                </button>
              </div>
            </form>
          </div>
        </main>
      </div>
    </div>
  );
}