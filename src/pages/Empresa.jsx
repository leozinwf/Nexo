import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../services/supabase';
import { Sidebar } from '../components/Sidebar';
import { Menu, Save, Building2, Phone, Mail, Upload, Plus, Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { Loading } from '../components/Loading';

export function Empresa() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [menuAberto, setMenuAberto] = useState(false);
  const [loading, setLoading] = useState(true);
  const [perfilUsuario, setPerfilUsuario] = useState(null);
  
  const [propositos, setPropositos] = useState([""]); 

  const [dadosEmpresa, setDadosEmpresa] = useState({
    nome_fantasia: '',
    razao_social: '',
    cnpj: '',
    email: '',
    telefone: '',
    endereco: '',
    logo_url: '',
    favicon_url: '',
    cor_tema: '#2563eb' 
  });

  useEffect(() => {
    carregarDados();
  }, []);

  const carregarDados = async () => {
    const { data: { user: authUser } } = await supabase.auth.getUser();
    if (!authUser) return navigate('/');
    setUser(authUser);

    const { data: perfil } = await supabase.from('perfis').select('empresa_id, tipo_perfil').eq('id', authUser.id).single();

    if (perfil?.tipo_perfil !== 'admin_master' && perfil?.tipo_perfil !== 'rh') {
      return navigate('/dashboard');
    }
    
    setPerfilUsuario(perfil);

    const { data: empresa } = await supabase.from('empresas').select('*').eq('id', perfil.empresa_id).single();
    
    if (empresa) {
      setDadosEmpresa(empresa);
      if (empresa.proposito) {
        try {
          const parsed = JSON.parse(empresa.proposito);
          setPropositos(Array.isArray(parsed) ? parsed : [empresa.proposito]);
        } catch (e) {
          setPropositos([empresa.proposito]);
        }
      }
    }
    setLoading(false);
  };

  const handleUpload = async (e, campoAlvo) => {
    const file = e.target.files[0];
    if (!file) return;

    toast.loading(`A fazer upload...`, { id: 'upload' });

    const fileExt = file.name.split('.').pop();
    const fileName = `${perfilUsuario.empresa_id}-${campoAlvo}-${Date.now()}.${fileExt}`;

    const { error: uploadError } = await supabase.storage
      .from('logos')
      .upload(fileName, file, { upsert: true });

    if (uploadError) {
      toast.error(`Erro: ${uploadError.message}`, { id: 'upload' });
      return;
    }

    const { data: { publicUrl } } = supabase.storage.from('logos').getPublicUrl(fileName);
    setDadosEmpresa({ ...dadosEmpresa, [campoAlvo]: publicUrl });
    toast.success('Imagem carregada com sucesso!', { id: 'upload' });
  };

  const adicionarProposito = () => {
    if (propositos.length < 5) setPropositos([...propositos, ""]);
  };

  const atualizarProposito = (texto, index) => {
    const novos = [...propositos];
    novos[index] = texto;
    setPropositos(novos);
  };

  const removerProposito = (index) => {
    const novos = propositos.filter((_, i) => i !== index);
    setPropositos(novos.length ? novos : [""]);
  };

  const handleSalvar = async (e) => {
    e.preventDefault();
    const propositosLimpos = propositos.filter(p => p.trim() !== "");
    const propositoFinalString = JSON.stringify(propositosLimpos);

    const { error } = await supabase
      .from('empresas')
      .update({
        nome_fantasia: dadosEmpresa.nome_fantasia,
        razao_social: dadosEmpresa.razao_social,
        cnpj: dadosEmpresa.cnpj,
        email: dadosEmpresa.email,
        telefone: dadosEmpresa.telefone,
        endereco: dadosEmpresa.endereco,
        logo_url: dadosEmpresa.logo_url,
        favicon_url: dadosEmpresa.favicon_url,
        proposito: propositoFinalString,
        cor_tema: dadosEmpresa.cor_tema 
      })
      .eq('id', perfilUsuario.empresa_id);
      
    if (error) toast.error("Erro ao salvar: " + error.message);
    else {
      toast.success("Dados atualizados com sucesso!");
      setTimeout(() => window.location.reload(), 1500);
    }
  };

  const userName = user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'Gestor';

  if (loading) return <Loading mensagem="A carregar dados da empresa..." />;

  return (
    <div className="flex h-screen bg-[#f8fafc] overflow-hidden font-sans text-slate-800">
      <div className={`fixed inset-0 bg-slate-900/40 z-40 backdrop-blur-sm transition-opacity lg:hidden ${menuAberto ? 'opacity-100' : 'opacity-0 pointer-events-none'}`} onClick={() => setMenuAberto(false)}></div>
      <Sidebar menuAberto={menuAberto} setMenuAberto={setMenuAberto} />

      <div className="flex-1 flex flex-col h-screen overflow-y-auto relative">
        <header className="sticky top-0 z-30 flex justify-between items-center px-6 py-4 bg-white/70 backdrop-blur-xl border-b border-slate-200/60">
          <div className="flex items-center gap-4">
            <button className="lg:hidden text-slate-500 hover:text-brand transition" onClick={() => setMenuAberto(true)}>
              <Menu size={24} />
            </button>
            <div className="text-sm font-medium text-slate-500 hidden sm:block">
              Administração <span className="text-slate-300 mx-2">/</span> <strong className="text-slate-800 uppercase tracking-wider text-[11px]">Dados da Empresa</strong>
            </div>
          </div>
          
          <div className="flex items-center gap-3 cursor-pointer group" onClick={() => navigate('/perfil')}>
            <div className="text-right hidden sm:block">
              <div className="text-sm font-bold text-slate-800 group-hover:text-brand transition-colors">{userName}</div>
              <div className="text-[10px] text-slate-500 font-bold uppercase tracking-tight">Ver Perfil</div>
            </div>
            <div className="w-9 h-9 rounded-full bg-brand text-white flex items-center justify-center font-bold text-sm shadow-sm">
              {userName?.charAt(0)?.toUpperCase() || 'G'}
            </div>
          </div>
        </header>

        <main className="content p-6 lg:p-8 max-w-[1200px] mx-auto w-full">
          <div style={{ backgroundColor: '#fff', padding: '2rem', borderRadius: '24px', border: '1px solid #e2e8f0', boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)' }}>
            <h2 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#1e293b', marginBottom: '2rem' }}>
              <Building2 color="#0067ff" /> Configurações Gerais
            </h2>

            <form onSubmit={handleSalvar} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1.5rem' }}>
              
              <div className="input-group" style={{ gridColumn: '1 / -1' }}>
                <label>Logotipo</label>
                <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', flexWrap: 'wrap' }}>
                  <input 
                    className="form-control" 
                    value={dadosEmpresa.logo_url || ''} 
                    onChange={e => setDadosEmpresa({ ...dadosEmpresa, logo_url: e.target.value })} 
                    placeholder="https://link.com/logo.png" 
                    style={{ flex: 1, minWidth: '200px' }}
                  />
                  <label className="btn-secondary" style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0 1rem', height: '45px', margin: 0 }}>
                    <Upload size={16} /> Fazer Upload
                    <input type="file" accept="image/*" style={{ display: 'none' }} onChange={(e) => handleUpload(e, 'logo_url')} />
                  </label>
                  {dadosEmpresa.logo_url && <img src={dadosEmpresa.logo_url} alt="Logo" style={{ height: '40px', borderRadius: '4px', objectFit: 'contain' }} />}
                </div>
              </div>

              <div className="input-group" style={{ gridColumn: '1 / -1' }}>
                <label>Ícone do Navegador (Favicon)</label>
                <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', flexWrap: 'wrap' }}>
                  <input 
                    className="form-control" 
                    value={dadosEmpresa.favicon_url || ''} 
                    onChange={e => setDadosEmpresa({ ...dadosEmpresa, favicon_url: e.target.value })} 
                    placeholder="https://link.com/favicon.ico" 
                    style={{ flex: 1, minWidth: '200px' }}
                  />
                  <label className="btn-secondary" style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0 1rem', height: '45px', margin: 0 }}>
                    <Upload size={16} /> Fazer Upload
                    <input type="file" accept="image/*" style={{ display: 'none' }} onChange={(e) => handleUpload(e, 'favicon_url')} />
                  </label>
                  {dadosEmpresa.favicon_url && <img src={dadosEmpresa.favicon_url} alt="Favicon" style={{ height: '32px', width: '32px', borderRadius: '4px', objectFit: 'cover' }} />}
                </div>
              </div>

              <div className="input-group" style={{ gridColumn: '1 / -1' }}>
                <label>Cor Principal da Plataforma</label>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                  <input 
                    type="color" 
                    value={dadosEmpresa.cor_tema || '#2563eb'} 
                    onChange={e => setDadosEmpresa({...dadosEmpresa, cor_tema: e.target.value})}
                    style={{ width: '50px', height: '50px', padding: 0, border: 'none', borderRadius: '8px', cursor: 'pointer' }}
                  />
                  <span style={{ fontSize: '0.9rem', color: '#64748b' }}>
                    Escolha a cor primária que combina com a sua marca. Esta cor será aplicada na Dashboard e noutros elementos.
                  </span>
                </div>
              </div>

              <div className="input-group">
                <label>Nome Fantasia *</label>
                <input className="form-control" value={dadosEmpresa.nome_fantasia || ''} onChange={e => setDadosEmpresa({ ...dadosEmpresa, nome_fantasia: e.target.value })} required />
              </div>

              <div className="input-group">
                <label>CNPJ</label>
                <input className="form-control" value={dadosEmpresa.cnpj || ''} onChange={e => setDadosEmpresa({ ...dadosEmpresa, cnpj: e.target.value })} />
              </div>

              <div className="input-group">
                <label><Mail size={14} /> E-mail de Contato</label>
                <input className="form-control" type="email" value={dadosEmpresa.email || ''} onChange={e => setDadosEmpresa({ ...dadosEmpresa, email: e.target.value })} />
              </div>

              <div className="input-group">
                <label><Phone size={14} /> Telefone</label>
                <input className="form-control" value={dadosEmpresa.telefone || ''} onChange={e => setDadosEmpresa({ ...dadosEmpresa, telefone: e.target.value })} />
              </div>

              <div className="input-group" style={{ gridColumn: '1 / -1' }}>
                <label>Endereço Completo</label>
                <textarea className="form-control" rows="3" value={dadosEmpresa.endereco || ''} onChange={e => setDadosEmpresa({ ...dadosEmpresa, endereco: e.target.value })} />
              </div>

              <div className="input-group" style={{ gridColumn: '1 / -1', background: '#f8fafc', padding: '1.5rem', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                  <label style={{ margin: 0 }}>Frases de Propósito (Máx 5)</label>
                  <span style={{ fontSize: '0.8rem', color: '#64748b' }}>Aparecem de forma rotativa no Dashboard</span>
                </div>
                
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  {propositos.map((prop, idx) => (
                    <div key={idx} style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                      <span style={{ color: '#94a3b8', fontWeight: 'bold' }}>{idx + 1}.</span>
                      <input 
                        className="form-control" 
                        value={prop} 
                        onChange={(e) => atualizarProposito(e.target.value, idx)} 
                        placeholder={`Digite a frase ${idx + 1}...`}
                        style={{ flex: 1 }}
                      />
                      <button 
                        type="button" 
                        onClick={() => removerProposito(idx)}
                        style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', padding: '0.5rem' }}
                        title="Remover Frase"
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>
                  ))}
                </div>

                {propositos.length < 5 && (
                  <button 
                    type="button" 
                    onClick={adicionarProposito}
                    className="btn-secondary" 
                    style={{ marginTop: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.5rem 1rem', width: 'max-content' }}
                  >
                    <Plus size={16} /> Adicionar Frase
                  </button>
                )}
              </div>

              <div style={{ gridColumn: '1 / -1', marginTop: '1rem', display: 'flex', justifyContent: 'flex-start' }}>
                <button type="submit" className="btn-salvar">
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