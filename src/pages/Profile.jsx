import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../services/supabase';
import { ArrowLeft, User, Mail, Briefcase } from 'lucide-react';
import { Sidebar } from '../components/Sidebar';

export function Profile() {
  const navigate = useNavigate();
  const [perfil, setPerfil] = useState(null);

  useEffect(() => {
    const buscarPerfil = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return navigate('/');

      const { data } = await supabase
        .from('perfis')
        .select('*')
        .eq('id', user.id)
        .single();
        
      setPerfil(data);
    };
    buscarPerfil();
  }, [navigate]);

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#f8fafc', padding: '2rem', fontFamily: 'Inter, sans-serif' }}>
      <button onClick={() => navigate('/dashboard')} style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#64748b', marginBottom: '2rem' }}>
        <ArrowLeft size={20} /> Voltar
      </button>

      <div style={{ maxWidth: '600px', margin: '0 auto', backgroundColor: '#fff', padding: '2rem', borderRadius: '20px', border: '1px solid #e2e8f0' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem', marginBottom: '2rem', paddingBottom: '2rem', borderBottom: '1px solid #f1f5f9' }}>
          <div style={{ width: '80px', height: '80px', backgroundColor: '#f0f7ff', color: '#0067ff', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '2rem', fontWeight: 'bold' }}>
            {perfil?.nome_completo ? perfil.nome_completo[0].toUpperCase() : 'U'}
          </div>
          <div>
            <h1 style={{ margin: 0, color: '#1e293b' }}>{perfil?.nome_completo || 'Colaborador'}</h1>
            <span style={{ backgroundColor: perfil?.is_admin ? '#fef08a' : '#f1f5f9', color: perfil?.is_admin ? '#854d0e' : '#64748b', padding: '0.2rem 0.6rem', borderRadius: '8px', fontSize: '0.8rem', fontWeight: 'bold' }}>
              {perfil?.is_admin ? 'Administrador' : 'Acesso Padrão'}
            </span>
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <Mail color="#94a3b8" />
            <div>
              <p style={{ margin: 0, fontSize: '0.85rem', color: '#64748b' }}>E-mail corporativo</p>
              <p style={{ margin: 0, color: '#1e293b', fontWeight: '500' }}>{perfil?.email}</p>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <Briefcase color="#94a3b8" />
            <div>
              <p style={{ margin: 0, fontSize: '0.85rem', color: '#64748b' }}>Cargo</p>
              <p style={{ margin: 0, color: '#1e293b', fontWeight: '500' }}>{perfil?.cargo || 'Não definido'}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}