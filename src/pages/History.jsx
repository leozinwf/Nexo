import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../services/supabase';
import { ArrowLeft, Calendar, Wrench, Edit2, Menu, History as HistoryIcon } from 'lucide-react';
import toast from 'react-hot-toast';
import { Sidebar } from '../components/Sidebar';

export function History() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [diasAgrupados, setDiasAgrupados] = useState([]);
  
  // Estados do Layout Global
  const [isAdmin, setIsAdmin] = useState(false);
  const [menuAberto, setMenuAberto] = useState(false);
  const [userName, setUserName] = useState('Colaborador');

  // Estados do Filtro de Data (Padrão: Mês Atual)
  const hoje = new Date();
  const primeiroDiaMes = new Date(hoje.getFullYear(), hoje.getMonth(), 1).toISOString().split('T')[0];
  const ultimoDiaMes = new Date(hoje.getFullYear(), hoje.getMonth() + 1, 0).toISOString().split('T')[0];
  
  const [dataInicio, setDataInicio] = useState(primeiroDiaMes);
  const [dataFim, setDataFim] = useState(ultimoDiaMes);

  // Estados dos Modais
  const [modalOcorrencia, setModalOcorrencia] = useState({ aberto: false, data: null });
  const [modalPontoManual, setModalPontoManual] = useState({ aberto: false, data: null });

  useEffect(() => {
    buscarHistorico();
  }, [dataInicio, dataFim]);

  const buscarHistorico = async () => {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return navigate('/');

    setUserName(user.user_metadata?.full_name || user.email?.split('@')[0] || 'Colaborador');

    const { data: perfil } = await supabase.from('perfis').select('is_admin').eq('id', user.id).maybeSingle();
    if (perfil) setIsAdmin(perfil.is_admin);

    // Busca os registros no período selecionado
    const { data: registros } = await supabase
      .from('registros_ponto')
      .select('*')
      .eq('usuario_id', user.id)
      .gte('horario', `${dataInicio}T00:00:00Z`)
      .lte('horario', `${dataFim}T23:59:59Z`)
      .order('horario', { ascending: true });

    gerarDiasDoFiltro(registros || []);
  };

  const gerarDiasDoFiltro = (registros) => {
    const inicio = new Date(`${dataInicio}T12:00:00`);
    const fim = new Date(`${dataFim}T12:00:00`);
    const dias = [];

    for (let d = new Date(inicio); d <= fim; d.setDate(d.getDate() + 1)) {
      const dataStrLocal = d.toLocaleDateString('pt-BR');
      const dataFormatadaBanco = d.toISOString().split('T')[0];
      
      const pontosDoDia = registros.filter(r => {
        const dataPonto = new Date(r.horario).toLocaleDateString('pt-BR');
        return dataPonto === dataStrLocal;
      });

      dias.push({
        dataIso: dataFormatadaBanco,
        dataExibicao: dataStrLocal,
        diaSemana: d.toLocaleDateString('pt-BR', { weekday: 'long' }),
        pontos: pontosDoDia
      });
    }

    setDiasAgrupados(dias.reverse());
    setLoading(false);
  };

  const getCorPonto = (tipo) => {
    if (tipo === 'entrada' || tipo === 'retorno') return '#10b981';
    if (tipo === 'saida') return '#ef4444';
    return '#f59e0b';
  };

  const simularEnvio = (tipo) => {
    toast.success(`${tipo} enviada para aprovação do RH!`);
    setModalOcorrencia({ aberto: false, data: null });
    setModalPontoManual({ aberto: false, data: null });
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate('/');
  };

  return (
    <>
      <style>{`
        /* Estilos do Layout Global (Idênticos ao Dashboard) */
        .layout { display: flex; height: 100vh; width: 100vw; background-color: #f8fafc; overflow: hidden; font-family: 'Inter', sans-serif; }
        .sidebar { width: 260px; min-width: 260px; background-color: #ffffff; color: #1e293b; display: flex; flex-direction: column; padding: 1.5rem; border-right: 1px solid #e2e8f0; transition: transform 0.3s ease; z-index: 50; }
        .main-container { flex: 1; display: flex; flex-direction: column; height: 100vh; overflow-y: auto; }
        .top-header { min-height: 70px; background-color: #fff; border-bottom: 1px solid #e2e8f0; display: flex; justify-content: space-between; align-items: center; padding: 0 2.5rem; }
        .content { padding: 2.5rem; max-width: 1200px; width: 100%; margin: 0 auto; box-sizing: border-box; }
        .mobile-header-btn { display: none; background: none; border: none; cursor: pointer; color: #1e293b; }
        .overlay { display: none; position: fixed; inset: 0; background: rgba(0,0,0,0.5); z-index: 40; }
        
        /* Filtro Superior */
        .filter-bar { background: #fff; padding: 1.5rem; border-radius: 12px; border: 1px solid #e2e8f0; margin-bottom: 2rem; display: flex; gap: 1rem; align-items: flex-end; flex-wrap: wrap; }
        .input-group { display: flex; flex-direction: column; gap: 0.5rem; }
        .input-group label { font-size: 0.85rem; font-weight: 600; color: #64748b; }
        .input-group input { padding: 0.75rem; border: 1px solid #cbd5e1; border-radius: 8px; color: #1e293b; outline: none; }
        .btn-buscar { background: #0067ff; color: #fff; border: none; padding: 0.75rem 2rem; border-radius: 8px; font-weight: 600; cursor: pointer; height: 42px; }

        /* Tabela Dootax Style */
        .table-container { background: #fff; border-radius: 12px; border: 1px solid #e2e8f0; overflow: hidden; }
        .table-header { display: grid; grid-template-columns: 1.5fr 1fr 1fr 1fr 1fr 1fr; background: #0f172a; color: #fff; padding: 1rem; font-size: 0.85rem; font-weight: 600; text-align: center; }
        .table-row { border-bottom: 1px solid #e2e8f0; }
        .row-main { display: grid; grid-template-columns: 1.5fr 1fr 1fr 1fr 1fr 1fr; padding: 1rem; align-items: center; text-align: center; font-size: 0.9rem; color: #334155; }
        .row-details { background: #f8fafc; padding: 1rem; border-top: 1px solid #f1f5f9; display: flex; align-items: center; gap: 2rem; }
        
        /* Ações e Timeline */
        .action-btns { display: flex; gap: 0.5rem; }
        .btn-icon { background: #fff; border: 1px solid #cbd5e1; padding: 0.5rem; border-radius: 50%; color: #64748b; cursor: pointer; display: flex; align-items: center; justify-content: center; transition: 0.2s; }
        .btn-icon:hover { border-color: #0067ff; color: #0067ff; }
        
        .timeline-container { flex: 1; position: relative; display: flex; justify-content: space-between; align-items: center; margin: 0 2rem; padding-top: 1.5rem; }
        .timeline-line { position: absolute; top: 28px; left: 0; right: 0; height: 2px; background: #cbd5e1; z-index: 1; }
        .timeline-point { position: relative; z-index: 2; display: flex; flex-direction: column; align-items: center; gap: 0.5rem; }
        .point-dot { width: 14px; height: 14px; border-radius: 50%; border: 2px solid #fff; box-shadow: 0 0 0 1px #cbd5e1; }
        .point-time { font-size: 0.8rem; font-weight: 600; color: #1e293b; position: absolute; top: -20px; }

        /* Modais */
        .modal-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.5); z-index: 100; display: flex; justify-content: center; align-items: center; }
        .modal-box { background: #fff; width: 90%; max-width: 450px; border-radius: 8px; overflow: hidden; box-shadow: 0 20px 25px -5px rgba(0,0,0,0.1); }
        .modal-header-box { display: flex; justify-content: space-between; align-items: center; padding: 1.25rem 1.5rem; border-bottom: 1px solid #e2e8f0; }
        .modal-header-box h3 { margin: 0; color: #0f172a; font-size: 1.25rem; font-weight: 400; }
        .modal-body { padding: 1.5rem; display: flex; flex-direction: column; gap: 1rem; }
        .modal-footer { padding: 1rem 1.5rem; border-top: 1px solid #e2e8f0; display: flex; justify-content: flex-end; gap: 1rem; background: #f8fafc; }
        .form-control { width: 100%; padding: 0.75rem; border: 1px solid #cbd5e1; border-radius: 4px; outline: none; font-family: 'Inter', sans-serif; box-sizing: border-box; }
        .warning-text { font-size: 0.8rem; font-style: italic; color: #475569; margin-top: 0.5rem; }

        @media (max-width: 768px) {
          .sidebar { position: fixed; height: 100%; transform: translateX(-100%); }
          .sidebar.open { transform: translateX(0); }
          .mobile-header-btn { display: block; }
          .overlay.open { display: block; }
          .top-header { padding: 0 1.5rem; }
          .content { padding: 1.5rem; }
          
          .table-header { display: none; }
          .row-main { grid-template-columns: 1fr; text-align: left; gap: 0.5rem; }
          .row-details { flex-direction: column; align-items: flex-start; }
          .timeline-container { margin: 1rem 0; width: 100%; justify-content: flex-start; gap: 2rem; overflow-x: auto; padding-bottom: 1rem; }
        }
      `}</style>

      <div className="layout">
        <div className={`overlay ${menuAberto ? 'open' : ''}`} onClick={() => setMenuAberto(false)}></div>

        {/* MENU LATERAL */}
        <Sidebar menuAberto={menuAberto} setMenuAberto={setMenuAberto} />

        {/* CONTEÚDO PRINCIPAL */}
        <div className="main-container">
          <header className="top-header">
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
              <button className="mobile-header-btn" onClick={() => setMenuAberto(true)} style={{background:'none', border:'none'}}><Menu size={24} /></button>
              <div style={{ color: '#64748b', fontSize: '0.9rem' }}>Portal / <strong style={{ color: '#1e293b'}}>Histórico</strong></div>
            </div>
            <div onClick={() => navigate('/perfil')} style={{display:'flex', alignItems:'center', gap:'1rem', cursor:'pointer'}}>
              <span style={{ fontSize: '0.85rem', color: '#64748b' }}>Analista de Sistemas</span>
              <div style={{ width: '35px', height: '35px', backgroundColor: '#f0f7ff', color: '#0067ff', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', border: '1px solid #e0efff' }}>
                {userName[0].toUpperCase()}
              </div>
            </div>
          </header>

          <main className="content">
            <div style={{ marginBottom: '2rem' }}>
              <h1 style={{ margin: 0, fontSize: '1.5rem', color: '#1e293b' }}>Histórico de pontos, férias, ocorrências e faltas</h1>
            </div>
            
            {/* BARRA DE FILTRO */}
            <div className="filter-bar">
              <div className="input-group">
                <label>Período de Apuração (Início):</label>
                <input type="date" value={dataInicio} onChange={(e) => setDataInicio(e.target.value)} />
              </div>
              <div className="input-group">
                <label>Período de Apuração (Fim):</label>
                <input type="date" value={dataFim} onChange={(e) => setDataFim(e.target.value)} />
              </div>
              <button className="btn-buscar" onClick={buscarHistorico}>Buscar</button>
            </div>

            {/* TABELA DE REGISTROS */}
            <div className="table-container">
              <div className="table-header">
                <div style={{ textAlign: 'left' }}>Data</div>
                <div>Previstas</div>
                <div>Trabalhadas</div>
                <div>Abonos</div>
                <div>Intervalos</div>
                <div>Saldo</div>
              </div>

              {loading ? (
                <div style={{ padding: '2rem', textAlign: 'center', color: '#64748b' }}>Carregando registros...</div>
              ) : diasAgrupados.length === 0 ? (
                <div style={{ padding: '2rem', textAlign: 'center', color: '#64748b' }}>Nenhum dado encontrado no período.</div>
              ) : (
                diasAgrupados.map((dia, idx) => (
                  <div key={idx} className="table-row">
                    <div className="row-main">
                      <div style={{ textAlign: 'left', fontWeight: '600', color: '#0067ff' }}>
                        {dia.dataExibicao} <span style={{ fontWeight: '400', color: '#64748b', fontSize: '0.8rem' }}>({dia.diaSemana})</span>
                      </div>
                      <div>08:00</div>
                      <div>{dia.pontos.length > 0 ? '--:--' : '-'}</div> 
                      <div>-</div>
                      <div>{dia.pontos.length > 2 ? '01:00' : '-'}</div>
                      <div>-</div>
                    </div>

                    {/* Detalhes expansíveis com Timeline e Botões */}
                    <div className="row-details">
                      <div className="action-btns">
                        <button className="btn-icon" title="Lançar Ocorrência (Atestado)" onClick={() => setModalOcorrencia({ aberto: true, data: dia.dataIso })}>
                          <Wrench size={16} />
                        </button>
                        <button className="btn-icon" title="Lançar Ponto Manual" onClick={() => setModalPontoManual({ aberto: true, data: dia.dataIso })}>
                          <Edit2 size={16} />
                        </button>
                      </div>

                      {dia.pontos.length > 0 ? (
                        <div className="timeline-container">
                          <div className="timeline-line"></div>
                          {dia.pontos.map((p, i) => (
                            <div key={i} className="timeline-point">
                              <span className="point-time">
                                {new Date(p.horario).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                              </span>
                              <div className="point-dot" style={{ backgroundColor: getCorPonto(p.tipo) }}></div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div style={{ flex: 1, textAlign: 'center', color: '#94a3b8', fontSize: '0.85rem' }}>
                          Sem registros neste dia.
                        </div>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </main>
        </div>
      </div>

      {/* MODAL 1: Lançar Ocorrência (Atestado) */}
      {modalOcorrencia.aberto && (
        <div className="modal-overlay">
          <div className="modal-box">
            <div className="modal-header-box">
              <h3>Lançar ocorrência</h3>
              <button onClick={() => setModalOcorrencia({ aberto: false, data: null })} style={{ background: 'none', border: 'none', cursor: 'pointer' }}><X size={20} color="#64748b" /></button>
            </div>
            <div className="modal-body">
              <div className="input-group">
                <label style={{ color: '#0f172a' }}>Descrição:</label>
                <input type="text" className="form-control" placeholder="Ex: Atestado médico, Folga..." />
              </div>
              <div style={{ display: 'flex', gap: '1rem', marginTop: '0.5rem' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.9rem', color: '#334155' }}>
                  <input type="radio" name="tipo_oco" defaultChecked /> Por Data e Hora
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.9rem', color: '#334155' }}>
                  <input type="radio" name="tipo_oco" /> Expediente completo
                </label>
              </div>
              <div className="input-group">
                <label style={{ color: '#0f172a' }}>Data e Hora Início:</label>
                <input type="datetime-local" className="form-control" defaultValue={`${modalOcorrencia.data}T08:00`} />
              </div>
              <div className="input-group">
                <label style={{ color: '#0f172a' }}>Anexo (opcional):</label>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <button style={{ background: '#f1f5f9', border: '1px solid #cbd5e1', padding: '0.5rem 1rem', borderRadius: '4px', cursor: 'pointer', fontSize: '0.85rem' }}>Escolher arquivo</button>
                  <span style={{ fontSize: '0.85rem', color: '#64748b' }}>Nenhum arquivo escolhido</span>
                </div>
              </div>
              <p className="warning-text">* A empresa receberá um aviso sobre o lançamento dessa ocorrência e poderá solicitar um documento para oficializar a inclusão da mesma, que ficará pendente de aprovação.</p>
            </div>
            <div className="modal-footer">
              <button onClick={() => setModalOcorrencia({ aberto: false, data: null })} style={{ padding: '0.6rem 1.5rem', background: '#fff', border: '1px solid #cbd5e1', borderRadius: '4px', cursor: 'pointer', fontWeight: '500' }}>Cancelar</button>
              <button onClick={() => simularEnvio('Ocorrência')} style={{ padding: '0.6rem 1.5rem', background: '#2563eb', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: '500' }}>Confirmar</button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 2: Lançar Ponto Manual */}
      {modalPontoManual.aberto && (
        <div className="modal-overlay">
          <div className="modal-box">
            <div className="modal-header-box">
              <div>
                <h3>Lançar Ponto Manual</h3>
                <small style={{ color: '#0067ff' }}>AVISO: Lançamento sujeito a aprovação.</small>
              </div>
              <button onClick={() => setModalPontoManual({ aberto: false, data: null })} style={{ background: 'none', border: 'none', cursor: 'pointer' }}><X size={20} color="#64748b" /></button>
            </div>
            <div className="modal-body">
              <div className="input-group">
                <label style={{ color: '#0f172a' }}>Data e Hora do Ponto:</label>
                <input type="datetime-local" className="form-control" defaultValue={`${modalPontoManual.data}T00:00`} />
              </div>
              <div className="input-group">
                <label style={{ color: '#0f172a' }}>Observação:</label>
                <input type="text" className="form-control" placeholder="Opcional" />
              </div>
              <div className="input-group">
                <label style={{ color: '#0f172a' }}>Justificativa: <span style={{ color: 'red' }}>*</span></label>
                <textarea className="form-control" rows="3" placeholder="Motivo do esquecimento..."></textarea>
              </div>
              <div style={{ display: 'flex', gap: '1rem', marginTop: '0.5rem' }}>
                <button onClick={() => simularEnvio('Ponto de Entrada Manual')} style={{ flex: 1, padding: '0.75rem', background: '#10b981', color: '#fff', border: 'none', borderRadius: '30px', fontWeight: 'bold', cursor: 'pointer' }}>ENTRADA</button>
                <button onClick={() => simularEnvio('Ponto de Saída Manual')} style={{ flex: 1, padding: '0.75rem', background: '#ef4444', color: '#fff', border: 'none', borderRadius: '30px', fontWeight: 'bold', cursor: 'pointer' }}>SAÍDA</button>
              </div>
              <p className="warning-text">* A empresa receberá um aviso sobre o lançamento desse ponto, que ficará pendente de aprovação.</p>
            </div>
            <div className="modal-footer" style={{ justifyContent: 'center', background: '#fff', borderTop: 'none' }}>
              <button onClick={() => setModalPontoManual({ aberto: false, data: null })} style={{ padding: '0.6rem 2rem', background: '#fff', border: '1px solid #cbd5e1', borderRadius: '4px', cursor: 'pointer', fontWeight: '500' }}>Cancelar</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

const styles = {
  navItem: { display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.75rem 1rem', backgroundColor: 'transparent', border: 'none', color: '#64748b', borderRadius: '8px', cursor: 'pointer', textAlign: 'left', fontSize: '0.9rem', fontWeight: '500', transition: '0.2s' },
  menuSection: { fontSize: '0.7rem', fontWeight: '700', color: '#94a3b8', textTransform: 'uppercase', marginTop: '1.5rem', marginBottom: '0.5rem', paddingLeft: '0.75rem', letterSpacing: '0.05em' },
};