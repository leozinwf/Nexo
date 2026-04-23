import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../services/supabase';
import { ChevronRight, Star, Menu, CheckCircle2, Clock } from 'lucide-react';
import toast from 'react-hot-toast';
import { Sidebar } from '../components/Sidebar';

// =========================================================
// TRAVA GLOBAL DO ROBÔ (Fora do componente React)
// Garante que o registo automático não duplique no Strict Mode
// =========================================================
let roboRodando = false;

export function Dashboard() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [pontosHoje, setPontosHoje] = useState([]);
  const [loadingPonto, setLoadingPonto] = useState(false);
  const [horaAtual, setHoraAtual] = useState(new Date());
  const [isAdmin, setIsAdmin] = useState(false);
  const [menuAberto, setMenuAberto] = useState(false);

  // Atualiza o relógio a cada 1 segundo
  useEffect(() => {
    const timer = setInterval(() => setHoraAtual(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Busca todos os registros do dia de hoje (00:00 até 23:59)
  const buscarPontosHoje = async (userId, perfilUsuario) => {
    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);
    const amanha = new Date(hoje);
    amanha.setDate(amanha.getDate() + 1);

    const { data } = await supabase
      .from('registros_ponto')
      .select('tipo, horario')
      .eq('usuario_id', userId)
      .gte('horario', hoje.toISOString())
      .lt('horario', amanha.toISOString())
      .order('horario', { ascending: true });

    // ====================================================================
    // MOTOR DO PONTO PRÉ-ASSINALADO COM VALIDAÇÃO DE TURNO
    // ====================================================================
    
    // Pega a primeira batida de entrada do dia
    const primeiraEntrada = data?.find(p => p.tipo === 'entrada');

    // O robô só executa se o colaborador já tiver entrado E tiver o almoço automático ativado
    if (data && primeiraEntrada && perfilUsuario?.almoco_automatico && !roboRodando) {
      roboRodando = true; 
      let precisaAtualizarTela = false;

      try {
        const agora = new Date();

        if (perfilUsuario.hora_saida_pausa && perfilUsuario.hora_retorno_pausa) {
          const [horaPausa, minPausa] = perfilUsuario.hora_saida_pausa.split(':');
          const dataPausa = new Date();
          dataPausa.setHours(parseInt(horaPausa), parseInt(minPausa), 0, 0);

          const [horaRetorno, minRetorno] = perfilUsuario.hora_retorno_pausa.split(':');
          const dataRetorno = new Date();
          dataRetorno.setHours(parseInt(horaRetorno), parseInt(minRetorno), 0, 0);

          const horarioPrimeiraEntrada = new Date(primeiraEntrada.horario);

          // REGRA DE OURO: O almoço só é lançado se o colaborador começou a trabalhar ANTES da hora do almoço.
          if (horarioPrimeiraEntrada <= dataPausa) {
            
            // 1. Regista a pausa se já passou da hora e não existe registo
            if (agora >= dataPausa && !data.some(p => p.tipo === 'pausa')) {
              await supabase.from('registros_ponto').insert([
                { usuario_id: userId, tipo: 'pausa', dispositivo: 'sistema_automatico', horario: dataPausa.toISOString() }
              ]);
              precisaAtualizarTela = true;
            }

            // 2. Regista o retorno se já passou da hora e não existe registo
            if (agora >= dataRetorno && !data.some(p => p.tipo === 'retorno')) {
              await supabase.from('registros_ponto').insert([
                { usuario_id: userId, tipo: 'retorno', dispositivo: 'sistema_automatico', horario: dataRetorno.toISOString() }
              ]);
              precisaAtualizarTela = true;
            }
          }
        }

        if (precisaAtualizarTela) {
          const { data: dadosAtualizados } = await supabase
            .from('registros_ponto')
            .select('tipo, horario')
            .eq('usuario_id', userId)
            .gte('horario', hoje.toISOString())
            .lt('horario', amanha.toISOString())
            .order('horario', { ascending: true });

          setPontosHoje(dadosAtualizados || []);
          return; 
        }
      } catch (error) {
        console.error("Erro no robô de ponto:", error);
      } finally {
        roboRodando = false;
      }
    }
    // ====================================================================

    if (data) setPontosHoje(data);
  };

  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setUser(user);

        const { data: perfil } = await supabase
          .from('perfis')
          .select('*')
          .eq('id', user.id)
          .maybeSingle();

        if (perfil) setIsAdmin(perfil.is_admin);
        buscarPontosHoje(user.id, perfil);
      } else {
        navigate('/');
      }
    };
    getUser();
  }, [navigate]);

  const getOpcoesPonto = () => {
    const ultimo = pontosHoje.length > 0 ? pontosHoje[pontosHoje.length - 1].tipo : null;
    const opcoes = [];

    if (!ultimo || ultimo === 'saida') {
      opcoes.push({ tipo: 'entrada', label: 'Registrar Entrada', color: '#0067ff', outline: false });
    } else if (ultimo === 'entrada' || ultimo === 'retorno') {
      opcoes.push({ tipo: 'pausa', label: 'Pausa (Almoço/Janta)', color: '#f59e0b', outline: false });
      opcoes.push({ tipo: 'saida_temporaria', label: 'Saída Temporária', color: '#64748b', outline: true });
      opcoes.push({ tipo: 'saida', label: 'Encerrar Jornada', color: '#ef4444', outline: true });
    } else if (ultimo === 'pausa' || ultimo === 'saida_temporaria') {
      opcoes.push({ tipo: 'retorno', label: 'Retornar ao Trabalho', color: '#10b981', outline: false });
    }
    return opcoes;
  };

  const registrarPonto = async (tipoSelecionado) => {
    setLoadingPonto(true);
    const { error } = await supabase.from('registros_ponto').insert([
      { usuario_id: user.id, tipo: tipoSelecionado, dispositivo: 'web' }
    ]);
    
    if (error) toast.error('Erro: ' + error.message);
    else {
      toast.success('Ponto registrado!');
      const { data: perfil } = await supabase.from('perfis').select('*').eq('id', user.id).maybeSingle();
      buscarPontosHoje(user.id, perfil);
    }
    setLoadingPonto(false);
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate('/');
  };

  const getCorBorda = (tipo) => {
    if (tipo === 'entrada' || tipo === 'retorno') return '#10b981';
    if (tipo === 'saida' || tipo === 'saida_temporaria') return '#ef4444';
    return '#f59e0b';
  };

  const formatarTipo = (tipo) => {
    const mapas = { 'entrada': 'Entrada', 'saida': 'Saída', 'pausa': 'Pausa', 'retorno': 'Retorno', 'saida_temporaria': 'Saída Temporária' };
    return mapas[tipo] || tipo;
  };

  const userName = user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'Colaborador';

  return (
    <>
      <style>{`
        .layout { display: flex; height: 100vh; width: 100vw; background-color: #f8fafc; overflow: hidden; font-family: 'Inter', sans-serif; }
        .sidebar { width: 260px; min-width: 260px; background-color: #ffffff; color: #1e293b; display: flex; flex-direction: column; padding: 1.5rem; border-right: 1px solid #e2e8f0; transition: transform 0.3s ease; z-index: 50; }
        .main-container { flex: 1; display: flex; flex-direction: column; height: 100vh; overflow-y: auto; }
        .top-header { min-height: 70px; background-color: #fff; border-bottom: 1px solid #e2e8f0; display: flex; justify-content: space-between; align-items: center; padding: 0 2.5rem; }
        .content { padding: 2.5rem; max-width: 1200px; width: 100%; margin: 0 auto; box-sizing: border-box; }
        .timeline { display: flex; flex-wrap: wrap; gap: 1rem; margin-top: 1.5rem; padding-top: 1.5rem; border-top: 1px solid #f1f5f9; width: 100%; }
        .timeline-item { background: #f8fafc; border: 1px solid #e2e8f0; padding: 0.75rem 1rem; border-radius: 12px; flex: 1; min-width: 130px; display: flex; flex-direction: column; gap: 0.25rem; }
        .btn-action { padding: 1rem 1.5rem; border-radius: 12px; font-weight: 700; cursor: pointer; transition: 0.2s; font-size: 0.95rem; }
        @media (max-width: 768px) {
          .sidebar { position: fixed; height: 100%; transform: translateX(-100%); }
          .sidebar.open { transform: translateX(0); }
          .mobile-header-btn { display: block; }
          .overlay.open { display: block; position: fixed; inset: 0; background: rgba(0,0,0,0.5); z-index: 40; }
          .content { padding: 1.5rem; }
          .top-header { padding: 0 1.5rem; }
        }
      `}</style>

      <div className="layout">
        <div className={`overlay ${menuAberto ? 'open' : ''}`} onClick={() => setMenuAberto(false)}></div>

        <Sidebar menuAberto={menuAberto} setMenuAberto={setMenuAberto} />

        <div className="main-container">
          <header className="top-header">
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
              <button className="mobile-header-btn" onClick={() => setMenuAberto(true)} style={{background:'none', border:'none'}}><Menu size={24} /></button>
              <div style={{ color: '#64748b', fontSize: '0.9rem' }}>Portal / <strong style={{ color: '#1e293b'}}>Início</strong></div>
            </div>
            <div className="perfil-link" onClick={() => navigate('/perfil')} style={{display:'flex', alignItems:'center', gap:'1rem', cursor:'pointer'}}>
              <span style={{ fontSize: '0.85rem', color: '#64748b' }}>Analista de Sistemas</span>
              <div style={{ width: '35px', height: '35px', backgroundColor: '#f0f7ff', color: '#0067ff', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', border: '1px solid #e0efff' }}>
                {userName[0].toUpperCase()}
              </div>
            </div>
          </header>

          <main className="content">
            <div style={{ backgroundColor: '#fff', padding: '1.75rem', borderRadius: '20px', border: '1px solid #e2e8f0', borderLeft: '4px solid #0067ff', marginBottom: '1.5rem', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.02)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1.5rem', alignItems: 'flex-start' }}>
                <div>
                  <h3 style={{ margin: '0 0 0.5rem 0', color: '#1e293b', fontSize: '1.2rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <Clock size={20} color="#0067ff" /> Registro de Ponto
                  </h3>
                  <div style={{ fontSize: '3.25rem', fontWeight: '800', color: '#1e293b', letterSpacing: '-2px' }}>
                    {horaAtual.toLocaleTimeString('pt-BR')}
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
                  {getOpcoesPonto().map(acao => (
                    <button 
                      key={acao.tipo}
                      onClick={() => registrarPonto(acao.tipo)} 
                      disabled={loadingPonto}
                      className="btn-action"
                      style={{
                        backgroundColor: acao.outline ? 'transparent' : acao.color, 
                        color: acao.outline ? acao.color : '#fff', 
                        border: acao.outline ? `1px solid ${acao.color}` : 'none',
                        padding: '1rem 1.5rem', borderRadius: '12px', fontWeight: '700'
                      }}
                    >
                      {acao.label}
                    </button>
                  ))}
                </div>
              </div>
              {pontosHoje.length > 0 && (
                <div className="timeline">
                  {pontosHoje.map((ponto, index) => (
                    <div key={index} className="timeline-item" style={{ borderLeft: `4px solid ${getCorBorda(ponto.tipo)}` }}>
                      <strong style={{ color: '#1e293b', fontSize: '1rem' }}>
                        {new Date(ponto.horario).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                      </strong>
                      <span style={{ color: '#64748b', fontSize: '0.8rem', fontWeight: '500' }}>{formatarTipo(ponto.tipo)}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <section style={{ backgroundColor: '#fff', padding: '2.5rem', borderRadius: '20px', border: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h2 style={{ fontSize: '1.5rem', margin: '0 0 0.5rem 0', color: '#1e293b' }}>Olá, {userName}! 👋</h2>
                <p style={{ margin: 0, color: '#64748b' }}>Como se sente hoje?</p>
                <div style={{ display: 'flex', gap: '1rem', marginTop: '1.25rem' }}>
                  <button style={styles.moodBtn}>😊</button>
                  <button style={styles.moodBtn}>😐</button>
                  <button style={styles.moodBtn}>😔</button>
                </div>
              </div>
              <div style={{ backgroundColor: '#f8fafc', padding: '1.25rem', borderRadius: '16px', border: '1px solid #e2e8f0', maxWidth: '220px', textAlign: 'center' }}>
                <small style={{ color: '#ff9900', fontWeight: 'bold' }}>PROPÓSITO DOOTAX</small>
                <p style={{ fontSize: '0.85rem', color: '#334155', margin: '0.5rem 0 0 0' }}>"Descomplicar as rotinas fiscais."</p>
              </div>
            </section>
          </main>
        </div>
      </div>
    </>
  );
}

const styles = {
  navItem: { display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.75rem 1rem', backgroundColor: 'transparent', border: 'none', color: '#64748b', borderRadius: '8px', cursor: 'pointer', textAlign: 'left', fontSize: '0.9rem', fontWeight: '500' },
  menuSection: { fontSize: '0.7rem', fontWeight: '700', color: '#94a3b8', textTransform: 'uppercase', marginTop: '1.5rem', marginBottom: '0.5rem', paddingLeft: '0.75rem' },
  moodBtn: { fontSize: '1.5rem', padding: '0.6rem', border: '1px solid #e2e8f0', borderRadius: '14px', backgroundColor: '#fff', cursor: 'pointer' }
};