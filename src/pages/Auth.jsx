import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { supabase } from '../services/supabase';

export function Auth() {
  const navigate = useNavigate();
  // Estado para controlar qual tela mostrar: 'login' ou 'recovery'
  const [view, setView] = useState('login'); 
  const [loading, setLoading] = useState(false);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    if (view === 'login') {
      // --- LÓGICA DE LOGIN ---
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      
      if (error) {
        toast.error('Acesso negado. Verifique suas credenciais.');
      } else {
        toast.success('Acesso liberado!');
        navigate('/dashboard');
      }
    } else {
      // --- LÓGICA DE RECUPERAÇÃO DE SENHA ---
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: window.location.origin + '/reset-password', // URL de retorno
      });
      
      if (error) {
        toast.error('Erro ao solicitar recuperação: ' + error.message);
      } else {
        toast.success('Link de recuperação enviado para o seu e-mail!');
        setView('login'); // Volta para a tela de login após enviar
      }
    }
    setLoading(false);
  };

  return (
    <div style={styles.container}>
      <div style={styles.card}>
        <div style={styles.header}>
          <img 
            src="https://dootax.com.br/wp-content/themes/dootax/assets/imgs/logo_dootax_principal.svg" 
            alt="Dootax Logo" 
            style={styles.logoImage} 
          />
          <h2 style={styles.title}>Portal Nexo</h2>
          <p style={styles.subtitle}>
            {view === 'login' 
              ? 'Acesse sua conta com o e-mail corporativo' 
              : 'Informe seu e-mail para receber o link de acesso'}
          </p>
        </div>

        <form onSubmit={handleSubmit} style={styles.form}>
          <div style={styles.inputGroup}>
            <label style={styles.label}>E-mail Corporativo</label>
            <input
              type="email"
              placeholder="seu.nome@dootax.com.br"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              style={styles.input}
            />
          </div>

          {view === 'login' && (
            <div style={styles.inputGroup}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <label style={styles.label}>Senha</label>
                <button 
                  type="button" 
                  onClick={() => setView('recovery')} 
                  style={styles.forgotPasswordLink}
                >
                  Esqueceu a senha?
                </button>
              </div>
              <input
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                style={styles.input}
              />
            </div>
          )}

          <button type="submit" disabled={loading} style={styles.button}>
            {loading 
              ? 'Processando...' 
              : view === 'login' ? 'Entrar no Portal' : 'Enviar Link de Recuperação'}
          </button>
        </form>

        {view === 'recovery' && (
          <div style={styles.footer}>
            <button 
              type="button" 
              onClick={() => setView('login')} 
              style={styles.toggleButton}
            >
              ← Voltar para o Login
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

const styles = {
  container: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    minHeight: '100vh',
    width: '100vw',
    backgroundColor: '#f8fafc',
    fontFamily: 'Inter, system-ui, sans-serif',
    margin: 0,
    padding: '1rem',
    boxSizing: 'border-box',
    position: 'fixed',
    top: 0,
    left: 0,
  },
  card: {
    width: '100%',
    maxWidth: '420px',
    padding: '3rem 2.5rem',
    backgroundColor: '#ffffff',
    borderRadius: '24px',
    boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.05), 0 8px 10px -6px rgba(0, 0, 0, 0.01)',
    border: '1px solid #e2e8f0',
    zIndex: 1,
  },
  header: {
    textAlign: 'center',
    marginBottom: '2.5rem',
  },
  logoImage: {
    height: '40px',
    marginBottom: '1.5rem',
    display: 'block',
    margin: '0 auto 1.5rem auto'
  },
  title: {
    fontSize: '1.5rem',
    fontWeight: '700',
    color: '#1e293b',
    margin: 0,
    letterSpacing: '-0.5px'
  },
  subtitle: {
    fontSize: '0.9rem',
    color: '#64748b',
    marginTop: '0.5rem',
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: '1.25rem',
  },
  inputGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.5rem',
  },
  label: {
    fontSize: '0.85rem',
    fontWeight: '600',
    color: '#334155',
    textAlign: 'left',
  },
  input: {
    padding: '0.875rem',
    borderRadius: '12px',
    border: '1px solid #e2e8f0',
    fontSize: '1rem',
    color: '#1e293b',
    backgroundColor: '#f8fafc',
    outline: 'none',
    transition: 'border-color 0.2s',
  },
  button: {
    padding: '1rem',
    borderRadius: '12px',
    border: 'none',
    backgroundColor: '#0067ff',
    color: '#ffffff',
    fontSize: '1rem',
    fontWeight: '700',
    cursor: 'pointer',
    marginTop: '1rem',
    transition: 'opacity 0.2s, transform 0.1s',
  },
  forgotPasswordLink: {
    background: 'none',
    border: 'none',
    color: '#0067ff',
    fontSize: '0.8rem',
    fontWeight: '600',
    cursor: 'pointer',
    padding: 0,
    textDecoration: 'none',
  },
  footer: {
    marginTop: '1.5rem',
    textAlign: 'center',
  },
  toggleButton: {
    background: 'none',
    border: 'none',
    color: '#64748b',
    fontWeight: '600',
    cursor: 'pointer',
    fontSize: '0.9rem',
    transition: 'color 0.2s',
  }
};