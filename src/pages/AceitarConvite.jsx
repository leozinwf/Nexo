import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../services/supabase';
import { UserCheck, Lock, ShieldCheck } from 'lucide-react';
import toast from 'react-hot-toast';

export function AceitarConvite() {
  const { id } = useParams();
  const navigate = useNavigate();
  
  const [convite, setConvite] = useState(null);
  const [loading, setLoading] = useState(true);
  const [senha, setSenha] = useState('');
  const [confirmarSenha, setConfirmarSenha] = useState('');

  useEffect(() => {
    verificarConvite();
  }, [id]);

  const verificarConvite = async () => {
    // Busca o convite incluindo os novos campos Nome e CPF
    const { data, error } = await supabase
      .from('convites')
      .select('*, empresas(nome_fantasia)')
      .eq('id', id)
      .maybeSingle();
    
    if (error || !data || data.usado) {
      toast.error('Este convite é inválido ou já expirou.');
      navigate('/');
    } else {
      setConvite(data);
    }
    setLoading(false);
  };

  const handleCriarConta = async (e) => {
    e.preventDefault();
    
    if (senha !== confirmarSenha) return toast.error('As senhas não coincidem!');
    if (senha.length < 6) return toast.error('A senha deve ter pelo menos 6 caracteres.');

    setLoading(true);

    // 1. Cria o utilizador no Supabase Auth
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email: convite.email,
      password: senha,
    });

    if (authError) {
      toast.error(authError.message);
      setLoading(false);
      return;
    }

    if (authData.user) {
      // 2. Transfere TODOS os dados do convite para o perfil definitivo
      const { error: profileError } = await supabase
        .from('perfis')
        .update({
          nome_completo: convite.nome_completo,
          cpf: convite.cpf,
          empresa_id: convite.empresa_id,
          cargo: convite.cargo,
          departamento: convite.departamento,
          tipo_perfil: 'colaborador' // Padrão para novos convites
        })
        .eq('id', authData.user.id);

      if (profileError) {
        console.error("Erro ao atualizar perfil:", profileError);
      }

      // 3. Invalida o convite
      await supabase.from('convites').update({ usado: true }).eq('id', convite.id);

      toast.success('Conta configurada com sucesso! Bem-vindo(a).');
      navigate('/dashboard');
    }
  };

  if (loading) return (
    <div style={{ display: 'flex', height: '100vh', justifyContent: 'center', alignItems: 'center' }}>
      <p>A validar o seu convite...</p>
    </div>
  );

  return (
    <div style={{ display: 'flex', height: '100vh', justifyContent: 'center', alignItems: 'center', backgroundColor: '#f8fafc', padding: '1rem' }}>
      <div className="modal-box" style={{ maxWidth: '450px', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.1)' }}>
        
        <div style={{ padding: '2.5rem' }}>
          <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
            <div style={{ backgroundColor: '#f0f7ff', width: '60px', height: '60px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1rem' }}>
              <UserCheck size={30} color="#0067ff" />
            </div>
            <h2 style={{ margin: 0, color: '#1e293b' }}>Olá, {convite.nome_completo.split(' ')[0]}!</h2>
            <p style={{ color: '#64748b', fontSize: '0.9rem', marginTop: '0.5rem' }}>
              Faltam poucos passos para aceder à <strong>{convite.empresas?.nome_fantasia}</strong>.
            </p>
          </div>

          <form onSubmit={handleCriarConta} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            
            {/* CAMPOS BLOQUEADOS (Visualização apenas) */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '1rem', padding: '1rem', backgroundColor: '#f1f5f9', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
               <small style={{ color: '#64748b', fontWeight: 'bold', textTransform: 'uppercase', fontSize: '0.7rem' }}>Dados Confirmados pelo RH</small>
               
               <div className="input-group">
                 <label style={{ fontSize: '0.8rem' }}>Nome Completo</label>
                 <input className="form-control" value={convite.nome_completo} disabled style={{ border: 'none', background: 'transparent', padding: 0, fontWeight: '600', color: '#1e293b' }} />
               </div>

               <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                 <div className="input-group">
                   <label style={{ fontSize: '0.8rem' }}>CPF</label>
                   <input className="form-control" value={convite.cpf} disabled style={{ border: 'none', background: 'transparent', padding: 0, fontWeight: '600', color: '#1e293b' }} />
                 </div>
                 <div className="input-group">
                   <label style={{ fontSize: '0.8rem' }}>E-mail</label>
                   <input className="form-control" value={convite.email} disabled style={{ border: 'none', background: 'transparent', padding: 0, fontWeight: '600', color: '#1e293b' }} />
                 </div>
               </div>
            </div>

            {/* CAMPOS DE SENHA (Ação do utilizador) */}
            <div className="input-group">
              <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Lock size={14} /> Criar sua Senha
              </label>
              <input 
                className="form-control" 
                type="password" 
                value={senha} 
                onChange={e => setSenha(e.target.value)} 
                required 
                placeholder="Mínimo 6 caracteres"
              />
            </div>

            <div className="input-group">
              <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <ShieldCheck size={14} /> Confirmar Senha
              </label>
              <input 
                className="form-control" 
                type="password" 
                value={confirmarSenha} 
                onChange={e => setConfirmarSenha(e.target.value)} 
                required 
                placeholder="Repita a senha escolhida"
              />
            </div>

            <button type="submit" disabled={loading} className="btn-primary" style={{ width: '100%', padding: '1rem', marginTop: '0.5rem' }}>
              {loading ? 'A configurar conta...' : 'Concluir Registo e Entrar'}
            </button>
          </form>
        </div>

        <div style={{ padding: '1.25rem', backgroundColor: '#f8fafc', borderTop: '1px solid #e2e8f0', textAlign: 'center' }}>
          <small style={{ color: '#94a3b8' }}>Ao continuar, concorda com os termos de uso do sistema.</small>
        </div>
      </div>
    </div>
  );
}