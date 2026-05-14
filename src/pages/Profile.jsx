import { useEffect, useState } from 'react';
import { supabase } from '../services/supabase';
import { Sidebar } from '../components/Sidebar';
import {
  User, Briefcase, Globe, Link, Save, Lock, Menu
} from 'lucide-react';
import toast from 'react-hot-toast';
import { Loading } from '../components/Loading';

export function Profile() {
  const [loading, setLoading] = useState(true);
  const [menuAberto, setMenuAberto] = useState(false);
  const [perfil, setPerfil] = useState({
    nome_completo: '',
    email: '',
    cpf: '',
    cargo: '',
    departamento: '',
    bio: '',
    linkedin_url: '',
    instagram_url: '',
    avatar_url: ''
  });

  const [novaSenha, setNovaSenha] = useState('');

  useEffect(() => {
    carregarPerfil();
  }, []);

  async function carregarPerfil() {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const { data } = await supabase
        .from('perfis')
        .select('*')
        .eq('id', user.id)
        .single();

      if (data) setPerfil(data);
    }
    setLoading(false);
  }

  async function handleUpdateProfile(e) {
    e.preventDefault();
    setLoading(true);

    const { data: { user } } = await supabase.auth.getUser();

    // Apenas os campos permitidos são enviados para o update
    const { error } = await supabase
      .from('perfis')
      .update({
        bio: perfil.bio,
        linkedin_url: perfil.linkedin_url,
        instagram_url: perfil.instagram_url,
        avatar_url: perfil.avatar_url,
        // Nota: Cargo e Departamento podem ser editáveis ou não, 
        // dependendo da sua regra. Aqui deixamos editar.
        cargo: perfil.cargo,
        departamento: perfil.departamento
      })
      .eq('id', user.id);

    if (error) toast.error("Erro ao atualizar perfil.");
    else toast.success("Perfil atualizado com sucesso!");

    setLoading(false);
  }

  async function handleChangePassword(e) {
    e.preventDefault();
    if (novaSenha.length < 6) return toast.error("A senha deve ter 6+ caracteres.");

    const { error } = await supabase.auth.updateUser({ password: novaSenha });

    if (error) toast.error(error.message);
    else {
      toast.success("Senha alterada com sucesso!");
      setNovaSenha('');
    }
  }

if (loading && !perfil.nome_completo) return <Loading mensagem="Carregando o seu perfil..." />;

  return (
    <div className="layout">
      <div className={`overlay ${menuAberto ? 'open' : ''}`} onClick={() => setMenuAberto(false)}></div>
      <Sidebar menuAberto={menuAberto} setMenuAberto={setMenuAberto} />

      <div className="main-container">
        <header className="top-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <button className="mobile-header-btn" onClick={() => setMenuAberto(true)} style={{ background: 'none', border: 'none' }}>
              <Menu size={24} />
            </button>
            <div style={{ color: '#64748b' }}>Portal / <strong>Meu Perfil</strong></div>
          </div>
        </header>

        <main className="content">
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 350px', gap: '2rem', alignItems: 'start' }}>

            {/* COLUNA ESQUERDA: FORMULÁRIO */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>

              <section style={{ backgroundColor: '#fff', padding: '2rem', borderRadius: '20px', border: '1px solid #e2e8f0' }}>
                <h3 style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <User size={20} color="#0067ff" /> Informações Pessoais
                </h3>

                <form onSubmit={handleUpdateProfile} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>

                  {/* DADOS BLOQUEADOS */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', padding: '1rem', background: '#f8fafc', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                    <div className="input-group" style={{ gridColumn: 'span 2' }}>
                      <label style={{ color: '#94a3b8', fontSize: '0.75rem' }}>NOME COMPLETO (BLOQUEADO)</label>
                      <input className="form-control" value={perfil.nome_completo} disabled style={{ background: 'transparent', border: 'none', padding: 0, fontWeight: 'bold' }} />
                    </div>
                    <div className="input-group">
                      <label style={{ color: '#94a3b8', fontSize: '0.75rem' }}>CPF</label>
                      <input className="form-control" value={perfil.cpf} disabled style={{ background: 'transparent', border: 'none', padding: 0, fontWeight: 'bold' }} />
                    </div>
                    <div className="input-group">
                      <label style={{ color: '#94a3b8', fontSize: '0.75rem' }}>E-MAIL</label>
                      <input className="form-control" value={perfil.email} disabled style={{ background: 'transparent', border: 'none', padding: 0, fontWeight: 'bold' }} />
                    </div>
                  </div>

                  {/* DADOS EDITÁVEIS */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                    <div className="input-group">
                      <label><Briefcase size={14} /> Cargo</label>
                      <input className="form-control" value={perfil.cargo || ''} onChange={e => setPerfil({ ...perfil, cargo: e.target.value })} />
                    </div>
                    <div className="input-group">
                      <label>Departamento</label>
                      <input className="form-control" value={perfil.departamento || ''} onChange={e => setPerfil({ ...perfil, departamento: e.target.value })} />
                    </div>
                  </div>

                  <div className="input-group">
                    <label>Bio / Sobre mim</label>
                    <textarea className="form-control" rows="4" value={perfil.bio || ''} onChange={e => setPerfil({ ...perfil, bio: e.target.value })} placeholder="Conte um pouco sobre sua trajetória..." />
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                    <div className="input-group">
                      <label><Link size={14} /> LinkedIn URL</label>
                      <input className="form-control" value={perfil.linkedin_url || ''} onChange={e => setPerfil({ ...perfil, linkedin_url: e.target.value })} />
                    </div>
                    <div className="input-group">
                      <label><Link size={14} /> Instagram URL</label>
                      <input className="form-control" value={perfil.instagram_url || ''} onChange={e => setPerfil({ ...perfil, instagram_url: e.target.value })} />
                    </div>
                  </div>

                  <button type="submit" className="btn-primary" style={{ alignSelf: 'flex-start' }}>
                    <Save size={18} /> Salvar Alterações
                  </button>
                </form>
              </section>

              {/* SECÇÃO DE SENHA */}
              <section style={{ backgroundColor: '#fff', padding: '2rem', borderRadius: '20px', border: '1px solid #e2e8f0' }}>
                <h3 style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <Lock size={20} color="#ef4444" /> Segurança
                </h3>
                <form onSubmit={handleChangePassword} style={{ display: 'flex', gap: '1rem', alignItems: 'flex-end' }}>
                  <div className="input-group" style={{ flex: 1 }}>
                    <label>Nova Senha</label>
                    <input className="form-control" type="password" value={novaSenha} onChange={e => setNovaSenha(e.target.value)} placeholder="Digite a nova senha" />
                  </div>
                  <button type="submit" className="btn-secondary" style={{ height: '45px' }}>Alterar Senha</button>
                </form>
              </section>

            </div>

            {/* COLUNA DIREITA: AVATAR / PREVIEW */}
            <aside style={{ position: 'sticky', top: '2rem' }}>
              <div style={{ backgroundColor: '#fff', padding: '2rem', borderRadius: '20px', border: '1px solid #e2e8f0', textAlign: 'center' }}>
                <div style={{
                  width: '120px',
                  height: '120px',
                  borderRadius: '50%',
                  backgroundColor: '#f0f7ff',
                  margin: '0 auto 1.5rem',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '3rem',
                  color: '#0067ff',
                  border: '4px solid #fff',
                  boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)',
                  overflow: 'hidden'
                }}>
                  {perfil.avatar_url ? (
                    <img src={perfil.avatar_url} alt="Avatar" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  ) : (
                    perfil.nome_completo?.[0]?.toUpperCase()
                  )}
                </div>
                <h4 style={{ margin: '0 0 0.25rem 0' }}>{perfil.nome_completo}</h4>
                <p style={{ color: '#64748b', fontSize: '0.85rem', margin: '0 0 1.5rem 0' }}>{perfil.cargo || 'Colaborador'}</p>

                <div className="input-group" style={{ textAlign: 'left' }}>
                  <label style={{ fontSize: '0.75rem' }}>URL da Foto</label>
                  <input
                    className="form-control"
                    value={perfil.avatar_url || ''}
                    onChange={e => setPerfil({ ...perfil, avatar_url: e.target.value })}
                    placeholder="https://link-da-foto.jpg"
                  />
                </div>
              </div>
            </aside>

          </div>
        </main>
      </div>
    </div>
  );
}