import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../services/supabase';
import { Lock } from 'lucide-react';
import toast from 'react-hot-toast';

export function ResetPassword() {
  const navigate = useNavigate();
  const [novaSenha, setNovaSenha] = useState('');
  const [loading, setLoading] = useState(false);

  // Verifica se o utilizador tem permissão para estar nesta tela (veio do link)
  useEffect(() => {
    supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === "PASSWORD_RECOVERY") {
        console.log("Modo de recuperação ativado.");
      }
    });
  }, []);

  const handleUpdatePassword = async (e) => {
    e.preventDefault();
    if (novaSenha.length < 6) return toast.error("A senha deve ter pelo menos 6 caracteres.");

    setLoading(true);
    // Atualiza a senha no banco de dados
    const { error } = await supabase.auth.updateUser({ password: novaSenha });

    if (error) {
      toast.error("Erro ao atualizar a senha: " + error.message);
    } else {
      toast.success("Senha atualizada com sucesso!");
      navigate('/dashboard'); // Redireciona para o sistema
    }
    setLoading(false);
  };

  return (
    <div style={{ display: 'flex', height: '100vh', backgroundColor: '#f8fafc', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ backgroundColor: '#fff', padding: '3rem', borderRadius: '20px', boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1)', width: '100%', maxWidth: '450px', textAlign: 'center' }}>
        
        <div style={{ width: '60px', height: '60px', borderRadius: '50%', backgroundColor: '#eff6ff', color: '#0067ff', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.5rem' }}>
          <Lock size={30} />
        </div>
        
        <h2 style={{ color: '#1e293b', marginBottom: '0.5rem' }}>Criar Nova Senha</h2>
        <p style={{ color: '#64748b', fontSize: '0.95rem', marginBottom: '2rem' }}>
          Por favor, digite a sua nova senha de acesso ao sistema.
        </p>

        <form onSubmit={handleUpdatePassword} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', textAlign: 'left' }}>
          <div className="input-group">
            <label style={{ fontWeight: 'bold', color: '#334155' }}>Nova Senha *</label>
            <input 
              type="password" 
              className="form-control" 
              value={novaSenha} 
              onChange={e => setNovaSenha(e.target.value)} 
              required 
              placeholder="Minimo de 6 caracteres"
              style={{ padding: '0.85rem' }}
            />
          </div>

          <button 
            type="submit" 
            disabled={loading}
            style={{ backgroundColor: '#0067ff', color: '#fff', border: 'none', padding: '1rem', borderRadius: '12px', fontWeight: 'bold', fontSize: '1rem', cursor: loading ? 'not-allowed' : 'pointer', transition: '0.2s' }}
          >
            {loading ? 'A salvar...' : 'Confirmar e Acessar'}
          </button>
        </form>
      </div>
    </div>
  );
}