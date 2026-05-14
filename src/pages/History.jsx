import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../services/supabase';
import { Calendar, Wrench, Edit2, X, Menu } from 'lucide-react';
import toast from 'react-hot-toast';
import { Sidebar } from '../components/Sidebar';

export function History() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [diasAgrupados, setDiasAgrupados] = useState([]);
  const [menuAberto, setMenuAberto] = useState(false);

  // Estados dos Filtros
  const hoje = new Date();
  const mesAtualFormatado = `${hoje.getFullYear()}-${String(hoje.getMonth() + 1).padStart(2, '0')}`;
  
  const primeiroDiaMes = new Date(hoje.getFullYear(), hoje.getMonth(), 1).toISOString().split('T')[0];
  const ultimoDiaMes = new Date(hoje.getFullYear(), hoje.getMonth() + 1, 0).toISOString().split('T')[0];

  const [mesSelecionado, setMesSelecionado] = useState(mesAtualFormatado);
  const [dataInicio, setDataInicio] = useState(primeiroDiaMes);
  const [dataFim, setDataFim] = useState(ultimoDiaMes);

  const [modalOcorrencia, setModalOcorrencia] = useState({ aberto: false, data: null });
  const [modalPontoManual, setModalPontoManual] = useState({ aberto: false, data: null });

  // Dispara a busca quando o componente é montado
  useEffect(() => { 
    buscarHistorico(); 
  }, []);

  // Quando escolhe um Mês, preenche automaticamente a Data Início e Fim
  const handleMesChange = (e) => {
    const valor = e.target.value;
    setMesSelecionado(valor);
    if (valor) {
      const [ano, mes] = valor.split('-');
      // Mês no JS começa em 0, por isso passamos o mês exato para pegar o último dia (dia 0 do mês seguinte)
      const primeiroDia = new Date(ano, parseInt(mes) - 1, 1).toISOString().split('T')[0];
      const ultimoDia = new Date(ano, parseInt(mes), 0).toISOString().split('T')[0];
      
      setDataInicio(primeiroDia);
      setDataFim(ultimoDia);
    }
  };

  const buscarHistorico = async () => {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return navigate('/');

    const { data: registros } = await supabase
      .from('registros_ponto')
      .select('*')
      .eq('usuario_id', user.id)
      .gte('horario', `${dataInicio}T00:00:00Z`)
      .lte('horario', `${dataFim}T23:59:59Z`)
      .order('horario', { ascending: true });

    const inicio = new Date(`${dataInicio}T12:00:00`); 
    const fim = new Date(`${dataFim}T12:00:00`); 
    const dias = [];
    
    for (let d = new Date(inicio); d <= fim; d.setDate(d.getDate() + 1)) {
      const dataStr = d.toLocaleDateString('pt-BR');
      const pontos = registros?.filter(r => new Date(r.horario).toLocaleDateString('pt-BR') === dataStr) || [];
      dias.push({ 
        dataIso: d.toISOString().split('T')[0], 
        dataExibicao: dataStr, 
        diaSemana: d.toLocaleDateString('pt-BR', { weekday: 'long' }), 
        pontos 
      });
    }
    
    setDiasAgrupados(dias); // Mantém a ordem crescente original
    setLoading(false);
  };

  const getCorPonto = (tipo) => tipo === 'entrada' || tipo === 'retorno' ? '#10b981' : tipo === 'saida' ? '#ef4444' : '#f59e0b';
  
  const simularEnvio = (t) => { 
    toast.success(`${t} enviado com sucesso! Aguardando aprovação.`); 
    setModalOcorrencia({ aberto: false, data: null }); 
    setModalPontoManual({ aberto: false, data: null }); 
  };

  return (
    <div className="layout">
      <div className={`overlay ${menuAberto ? 'open' : ''}`} onClick={() => setMenuAberto(false)}></div>
      <Sidebar menuAberto={menuAberto} setMenuAberto={setMenuAberto} />
      
      <div className="main-container">
        <header className="top-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <button className="mobile-header-btn" onClick={() => setMenuAberto(true)}><Menu size={24} /></button>
            <div style={{ color: '#64748b', fontSize: '0.9rem' }}>Portal / <strong>Histórico</strong></div>
          </div>
        </header>
        
        <main className="content">
          <div className="filter-bar" style={{ alignItems: 'flex-end' }}>
            {/* Atalho por Mês */}
            <div className="input-group">
              <label>Mês de Apuração</label>
              <input 
                type="month" 
                className="form-control" 
                value={mesSelecionado} 
                onChange={handleMesChange} 
              />
            </div>
            
            {/* Filtros Livres por Data */}
            <div className="input-group">
              <label>Data Início</label>
              <input 
                type="date" 
                className="form-control" 
                value={dataInicio} 
                onChange={(e) => setDataInicio(e.target.value)} 
              />
            </div>
            <div className="input-group">
              <label>Data Fim</label>
              <input 
                type="date" 
                className="form-control" 
                value={dataFim} 
                onChange={(e) => setDataFim(e.target.value)} 
              />
            </div>

            <button onClick={buscarHistorico} style={{ background: '#0067ff', color: '#fff', border: 'none', padding: '0.75rem 1.5rem', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold', height: '42px' }}>
              Buscar
            </button>
          </div>

          <div className="table-container">
            <div className="table-header"><div>Data</div><div>Previstas</div><div>Trabalhadas</div><div>Abonos</div><div>Intervalos</div><div>Saldo</div></div>
            {loading ? <p style={{ padding: '2rem', textAlign: 'center' }}>Carregando...</p> : diasAgrupados.map((dia, idx) => (
              <div key={idx} className="table-row">
                <div className="row-main">
                  <div data-label="Data" style={{ fontWeight: 'bold', color: '#0067ff' }}>{dia.dataExibicao}</div>
                  <div data-label="Previstas">08:00</div><div data-label="Trabalhadas">--:--</div><div data-label="Abonos">-</div><div data-label="Intervalos">-</div><div data-label="Saldo">-</div>
                </div>
                <div className="row-details">
                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <button className="form-control" title="Lançar Ocorrência" style={{ width: 'auto', cursor: 'pointer' }} onClick={() => setModalOcorrencia({ aberto: true, data: dia.dataIso })}><Wrench size={14}/></button>
                    <button className="form-control" title="Ponto Manual" style={{ width: 'auto', cursor: 'pointer' }} onClick={() => setModalPontoManual({ aberto: true, data: dia.dataIso })}><Edit2 size={14}/></button>
                  </div>
                  {dia.pontos.length > 0 && (
                    <div className="timeline-container">
                      <div className="timeline-line"></div>
                      {dia.pontos.map((p, i) => (
                        <div key={i} className="timeline-point">
                          <span className="point-time">{new Date(p.horario).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</span>
                          <div className="point-dot" style={{ backgroundColor: getCorPonto(p.tipo) }}></div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </main>
      </div>

      {/* MODAIS (Ocorrência e Ponto Manual) */}
      {modalOcorrencia.aberto && (
        <div className="modal-overlay">
          <div className="modal-box">
            <div className="modal-header-box">
              <h3 style={{ margin: 0, color: '#0f172a', fontSize: '1.25rem', fontWeight: '400' }}>Lançar ocorrência</h3>
              <button onClick={() => setModalOcorrencia({ aberto: false, data: null })} style={{ border: 'none', background: 'none', cursor: 'pointer' }}><X size={20} color="#64748b" /></button>
            </div>
            <div className="modal-body">
              <div className="input-group"><label>Descrição</label><input type="text" className="form-control" placeholder="Ex: Atestado médico, Folga..." /></div>
              <div className="input-group"><label>Data Início</label><input type="datetime-local" className="form-control" defaultValue={`${modalOcorrencia.data}T08:00`} /></div>
            </div>
            <div className="modal-footer">
              <button onClick={() => setModalOcorrencia({ aberto: false, data: null })} style={{ padding: '0.6rem 1.5rem', background: '#fff', border: '1px solid #cbd5e1', borderRadius: '4px', cursor: 'pointer', fontWeight: '500' }}>Cancelar</button>
              <button onClick={() => simularEnvio('Ocorrência')} style={{ padding: '0.6rem 1.5rem', background: '#2563eb', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: '500' }}>Confirmar</button>
            </div>
          </div>
        </div>
      )}

      {modalPontoManual.aberto && (
        <div className="modal-overlay">
          <div className="modal-box">
            <div className="modal-header-box">
              <div>
                <h3 style={{ margin: 0, color: '#0f172a', fontSize: '1.25rem', fontWeight: '400' }}>Lançar Ponto Manual</h3>
                <small style={{ color: '#0067ff' }}>AVISO: Lançamento sujeito a aprovação.</small>
              </div>
              <button onClick={() => setModalPontoManual({ aberto: false, data: null })} style={{ background: 'none', border: 'none', cursor: 'pointer' }}><X size={20} color="#64748b" /></button>
            </div>
            <div className="modal-body">
              <div className="input-group">
                <label>Data e Hora do Ponto:</label>
                <input type="datetime-local" className="form-control" defaultValue={`${modalPontoManual.data}T00:00`} />
              </div>
              <div className="input-group">
                <label>Justificativa: <span style={{ color: 'red' }}>*</span></label>
                <textarea className="form-control" rows="3" placeholder="Motivo do esquecimento..."></textarea>
              </div>
              <div style={{ display: 'flex', gap: '1rem', marginTop: '0.5rem' }}>
                <button onClick={() => simularEnvio('Ponto de Entrada Manual')} style={{ flex: 1, padding: '0.75rem', background: '#10b981', color: '#fff', border: 'none', borderRadius: '30px', fontWeight: 'bold', cursor: 'pointer' }}>ENTRADA</button>
                <button onClick={() => simularEnvio('Ponto de Saída Manual')} style={{ flex: 1, padding: '0.75rem', background: '#ef4444', color: '#fff', border: 'none', borderRadius: '30px', fontWeight: 'bold', cursor: 'pointer' }}>SAÍDA</button>
              </div>
              <p style={{ fontSize: '0.8rem', fontStyle: 'italic', color: '#475569', marginTop: '0.5rem' }}>* A empresa receberá um aviso sobre o lançamento desse ponto, que ficará pendente de aprovação.</p>
            </div>
            <div className="modal-footer" style={{ justifyContent: 'center', background: '#fff', borderTop: 'none' }}>
              <button onClick={() => setModalPontoManual({ aberto: false, data: null })} style={{ padding: '0.6rem 2rem', background: '#fff', border: '1px solid #cbd5e1', borderRadius: '4px', cursor: 'pointer', fontWeight: '500' }}>Cancelar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}