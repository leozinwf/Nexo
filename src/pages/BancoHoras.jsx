import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../services/supabase';
import { Sidebar } from '../components/Sidebar';
import { Menu, Database, PlusCircle, MinusCircle, Clock } from 'lucide-react';

export function BancoHoras() {
  const navigate = useNavigate();
  const [menuAberto, setMenuAberto] = useState(false);
  const [loading, setLoading] = useState(true);
  const [resumoBanco, setResumoBanco] = useState({ saldoTotal: 0, positivo: 0, negativo: 0 });
  const [diasCalculados, setDiasCalculados] = useState([]);

  useEffect(() => {
    calcularBancoDeHoras();
  }, []);

  const calcularBancoDeHoras = async () => {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return navigate('/');

    const { data: registros } = await supabase.from('registros_ponto').select('*').eq('usuario_id', user.id).order('horario', { ascending: true });

    if (registros) {
      const grupos = {};
      registros.forEach(reg => {
        const dataLocal = new Date(reg.horario).toLocaleDateString('pt-BR');
        if (!grupos[dataLocal]) grupos[dataLocal] = [];
        grupos[dataLocal].push(reg);
      });

      let totalMinPos = 0; let totalMinNeg = 0;
      const diasProc = [];

      Object.entries(grupos).forEach(([data, pontos]) => {
        const entrada = pontos.find(p => p.tipo === 'entrada');
        const saida = pontos.find(p => p.tipo === 'saida');
        const pausa = pontos.find(p => p.tipo === 'pausa');
        const retorno = pontos.find(p => p.tipo === 'retorno');

        if (entrada && saida) {
          let tempoMs = new Date(saida.horario).getTime() - new Date(entrada.horario).getTime();
          if (pausa && retorno) tempoMs -= (new Date(retorno.horario).getTime() - new Date(pausa.horario).getTime());
          
          const minTrab = Math.floor(tempoMs / 60000);
          const saldo = minTrab - 480;
          if (saldo > 0) totalMinPos += saldo; else totalMinNeg += Math.abs(saldo);
          diasProc.push({ data, minTrab, saldo });
        }
      });
      setDiasCalculados(diasProc.reverse());
      setResumoBanco({ saldoTotal: totalMinPos - totalMinNeg, positivo: totalMinPos, negativo: totalMinNeg });
    }
    setLoading(false);
  };

  const formatarMinutos = (totalMinutos) => {
    const isNeg = totalMinutos < 0; const absMin = Math.abs(totalMinutos);
    const h = Math.floor(absMin / 60); const m = absMin % 60;
    const f = `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
    return isNeg ? `- ${f}` : `+ ${f}`;
  };

  return (
    <div className="layout">
      <div className={`overlay ${menuAberto ? 'open' : ''}`} onClick={() => setMenuAberto(false)}></div>
      <Sidebar menuAberto={menuAberto} setMenuAberto={setMenuAberto} />
      <div className="main-container">
        <header className="top-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <button className="mobile-header-btn" onClick={() => setMenuAberto(true)}><Menu size={24} /></button>
            <div style={{ color: '#64748b', fontSize: '0.9rem' }}>Portal / <strong>Banco de Horas</strong></div>
          </div>
        </header>
        <main className="content">
          <div style={{ marginBottom: '2rem' }}>
            <h2 style={{ margin: 0, color: '#1e293b', fontSize: '1.75rem' }}>Meu Banco de Horas</h2>
          </div>
          {loading ? <p>Calculando...</p> : (
            <>
              <div className="dashboard-grid">
                <div className="stat-card">
                  <div className="stat-icon" style={{ background: '#dcfce7', color: '#166534' }}><PlusCircle size={28} /></div>
                  <div className="stat-info"><h4>Positivas</h4><p style={{ color: '#166534' }}>{formatarMinutos(resumoBanco.positivo)}</p></div>
                </div>
                <div className="stat-card">
                  <div className="stat-icon" style={{ background: '#fee2e2', color: '#991b1b' }}><MinusCircle size={28} /></div>
                  <div className="stat-info"><h4>Negativas</h4><p style={{ color: '#991b1b' }}>{formatarMinutos(-resumoBanco.negativo)}</p></div>
                </div>
                <div className="stat-card" style={{ border: `2px solid ${resumoBanco.saldoTotal >= 0 ? '#10b981' : '#ef4444'}` }}>
                  <div className="stat-icon" style={{ background: resumoBanco.saldoTotal >= 0 ? '#10b981' : '#ef4444', color: '#fff' }}><Database size={28} /></div>
                  <div className="stat-info"><h4>Saldo Atual</h4><p>{formatarMinutos(resumoBanco.saldoTotal)}</p></div>
                </div>
              </div>
              <div className="table-container">
                <table className="doohub-table responsive-table">
                  <thead><tr><th>Data</th><th>Previsto</th><th>Trabalhado</th><th>Saldo</th></tr></thead>
                  <tbody>
                    {diasCalculados.map((dia, i) => (
                      <tr key={i}>
                        <td data-label="Data"><div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}><Clock size={16} color="#0067ff" /> {dia.data}</div></td>
                        <td data-label="Previsto">08:00</td>
                        <td data-label="Trabalhado">{formatarMinutos(dia.minTrab).replace('+', '')}</td>
                        <td data-label="Saldo"><span className={`badge ${dia.saldo > 0 ? 'positivo' : dia.saldo < 0 ? 'negativo' : 'neutro'}`}>{dia.saldo === 0 ? '00:00' : formatarMinutos(dia.saldo)}</span></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </main>
      </div>
    </div>
  );
}