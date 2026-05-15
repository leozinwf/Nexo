import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../services/supabase';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Menu, CalendarDays, Wrench, Edit2, X, Search, Clock, FileText, CheckCircle2, AlertTriangle, Paperclip, UploadCloud
} from 'lucide-react';
import toast from 'react-hot-toast';
import { Sidebar } from '../components/Sidebar';

const containerAnim = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.08 } } };
const itemAnim = { hidden: { opacity: 0, y: 15 }, show: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 120 } } };

export function History() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [diasAgrupados, setDiasAgrupados] = useState([]);
  const [menuAberto, setMenuAberto] = useState(false);

  // Estados dos Filtros
  const hoje = new Date();
  const hojeFormatoISO = hoje.toISOString().split('T')[0];
  const mesAtualFormatado = `${hoje.getFullYear()}-${String(hoje.getMonth() + 1).padStart(2, '0')}`;

  const primeiroDiaMes = new Date(hoje.getFullYear(), hoje.getMonth(), 1).toISOString().split('T')[0];
  const ultimoDiaMes = new Date(hoje.getFullYear(), hoje.getMonth() + 1, 0).toISOString().split('T')[0];

  const [mesSelecionado, setMesSelecionado] = useState(mesAtualFormatado);
  const [dataInicio, setDataInicio] = useState(primeiroDiaMes);
  const [dataFim, setDataFim] = useState(hojeFormatoISO > ultimoDiaMes ? ultimoDiaMes : hojeFormatoISO); // Limita ao dia de hoje

  // Estados do Modal: Lançar Ocorrência
  const [modalOcorrencia, setModalOcorrencia] = useState({ aberto: false, data: null });
  const [motivoOcorrencia, setMotivoOcorrencia] = useState('');
  const [dataOcorrencia, setDataOcorrencia] = useState('');
  const [arquivoOcorrencia, setArquivoOcorrencia] = useState(null);

  // Estados do Modal: Ponto Manual
  const [modalPontoManual, setModalPontoManual] = useState({ aberto: false, data: null });
  const [justificativaPonto, setJustificativaPonto] = useState('');
  const [dataPontoManual, setDataPontoManual] = useState('');
  
  // Modal de Confirmação
  const [modalConfirmacao, setModalConfirmacao] = useState({ aberto: false, titulo: '', mensagem: '', acao: null, tipo: 'aviso' });

  useEffect(() => {
    buscarHistorico();
  }, []);

  const handleMesChange = (e) => {
    const valor = e.target.value;
    setMesSelecionado(valor);
    if (valor) {
      const [ano, mes] = valor.split('-');
      const primeiroDia = new Date(ano, parseInt(mes) - 1, 1).toISOString().split('T')[0];
      const ultimoDia = new Date(ano, parseInt(mes), 0).toISOString().split('T')[0];

      setDataInicio(primeiroDia);
      // Bloqueia a Data Fim para não passar de hoje
      setDataFim(ultimoDia > hojeFormatoISO ? hojeFormatoISO : ultimoDia);
    }
  };

  const buscarHistorico = async () => {
    setLoading(true);
    const { data: { user: authUser } } = await supabase.auth.getUser();
    if (!authUser) return navigate('/');
    
    setUser(authUser); // Guardar utilizador para o cabeçalho

    const { data: registros } = await supabase
      .from('registros_ponto')
      .select('*')
      .eq('usuario_id', authUser.id)
      .gte('horario', `${dataInicio}T00:00:00Z`)
      .lte('horario', `${dataFim}T23:59:59Z`)
      .order('horario', { ascending: true });

    const inicio = new Date(`${dataInicio}T12:00:00`);
    const fim = new Date(`${dataFim}T12:00:00`);
    const hojeParaComparacao = new Date();
    hojeParaComparacao.setHours(23, 59, 59, 999);

    const dias = [];

    for (let d = new Date(inicio); d <= fim; d.setDate(d.getDate() + 1)) {
      if (d > hojeParaComparacao) continue;

      const dataStr = d.toLocaleDateString('pt-BR');
      const pontos = registros?.filter(r => new Date(r.horario).toLocaleDateString('pt-BR') === dataStr) || [];
      dias.push({
        dataIso: d.toISOString().split('T')[0],
        dataExibicao: dataStr,
        diaSemana: d.toLocaleDateString('pt-BR', { weekday: 'long' }),
        pontos
      });
    }

    setDiasAgrupados(dias.reverse());
    setLoading(false);
  };

  const getCorPontoEstilo = (ponto) => {
    if (ponto.status === 'pendente') return 'bg-slate-300 ring-slate-100 border-2 border-dashed border-slate-400';
    if (ponto.tipo.includes('entrada') || ponto.tipo === 'retorno') return 'bg-emerald-500 ring-emerald-100';
    if (ponto.tipo === 'saida') return 'bg-red-500 ring-red-100';
    return 'bg-amber-500 ring-amber-100';
  };

  const pedirConfirmacao = (titulo, mensagem, acao, tipo = 'aviso') => {
    setModalConfirmacao({ aberto: true, titulo, mensagem, acao, tipo });
  };

  // Funções Auxiliares para Abrir Modais Limpos
  const abrirModalOcorrencia = (dataIso) => {
    setMotivoOcorrencia('');
    setDataOcorrencia('');
    setArquivoOcorrencia(null);
    setModalOcorrencia({ aberto: true, data: dataIso });
  };

  const abrirModalPontoManual = (dataIso) => {
    setJustificativaPonto('');
    setDataPontoManual('');
    setModalPontoManual({ aberto: true, data: dataIso });
  };

  // Validação e Envio Ocorrência
  const handleConfirmarOcorrencia = () => {
    if (!motivoOcorrencia.trim()) return toast.error("Atenção: Por favor, preencha o motivo da ocorrência.");
    if (!dataOcorrencia) return toast.error("Atenção: A data de referência é obrigatória.");
    
    pedirConfirmacao('Confirmar Ocorrência', 'Deseja submeter esta ocorrência e o anexo para aprovação do gestor?', () => {
      toast.success('Ocorrência enviada com sucesso! Aguardando aprovação.');
      setModalOcorrencia({ aberto: false, data: null });
    });
  };

  // Validação e Envio Ponto Manual (Simulando a entrada "Pendente" na tela)
  const handleConfirmarPontoManual = (tipoAcao) => {
    if (!dataPontoManual) return toast.error("Atenção: A Data e Hora da batida são obrigatórias.");
    if (!justificativaPonto.trim()) return toast.error("Atenção: A justificativa é obrigatória para pontos manuais.");
    
    pedirConfirmacao(`Ponto de ${tipoAcao}`, `Confirma o envio do registo manual de ${tipoAcao.toLowerCase()} para aprovação?`, () => {
      toast.success(`Ponto de ${tipoAcao} enviado! Ficará pendente de aprovação.`);
      
      // Simula a inserção visual na lista para o utilizador ver o status Pendente
      const dataFormatada = new Date(dataPontoManual).toLocaleDateString('pt-BR');
      setDiasAgrupados(prevDias => {
        const novosDias = [...prevDias];
        const diaIndex = novosDias.findIndex(d => d.dataExibicao === dataFormatada);
        
        const novoPonto = {
          horario: dataPontoManual,
          tipo: tipoAcao.toLowerCase(),
          status: 'pendente' // Status pendente
        };

        if (diaIndex >= 0) {
          novosDias[diaIndex].pontos.push(novoPonto);
          // Reordena os pontos pelo horário
          novosDias[diaIndex].pontos.sort((a, b) => new Date(a.horario) - new Date(b.horario));
        }
        return novosDias;
      });

      setModalPontoManual({ aberto: false, data: null });
    });
  };

  const userName = user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'Colaborador';

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
              Portal <span className="text-slate-300 mx-2">/</span> <strong className="text-slate-800 uppercase tracking-wider text-[11px]">Histórico e Ajustes</strong>
            </div>
          </div>
          
          {/* PERFIL NO CABEÇALHO */}
          <div className="flex items-center gap-3 cursor-pointer group" onClick={() => navigate('/perfil')}>
            <div className="text-right hidden sm:block">
              <div className="text-sm font-bold text-slate-800 group-hover:text-brand transition-colors">{userName}</div>
              <div className="text-[10px] text-slate-500 font-bold uppercase tracking-tight">Ver Perfil</div>
            </div>
            <div className="w-9 h-9 rounded-full bg-brand text-white flex items-center justify-center font-bold text-sm shadow-sm">
              {userName?.charAt(0)?.toUpperCase() || 'C'}
            </div>
          </div>
        </header>

        <motion.main variants={containerAnim} initial="hidden" animate="show" className="p-6 lg:p-8 max-w-[1200px] mx-auto w-full flex flex-col gap-6 pb-20">
          
          {/* BARRA DE FILTROS */}
          <motion.div variants={itemAnim} className="bg-white rounded-[24px] p-6 shadow-sm border border-slate-200/60">
            <h3 className="text-sm font-bold uppercase tracking-wider text-slate-800 flex items-center gap-2 mb-6">
              <CalendarDays size={18} className="text-brand"/> Filtros de Apuração
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
              <div className="flex flex-col gap-2">
                <label className="text-xs font-bold text-slate-500 uppercase">Mês</label>
                <input 
                  type="month" 
                  value={mesSelecionado} 
                  onChange={handleMesChange} 
                  className="bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-brand outline-none text-slate-700"
                />
              </div>
              <div className="flex flex-col gap-2">
                <label className="text-xs font-bold text-slate-500 uppercase">Data Início</label>
                <input 
                  type="date" 
                  max={hojeFormatoISO}
                  value={dataInicio} 
                  onChange={(e) => setDataInicio(e.target.value)} 
                  className="bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-brand outline-none text-slate-700"
                />
              </div>
              <div className="flex flex-col gap-2">
                <label className="text-xs font-bold text-slate-500 uppercase">Data Fim</label>
                <input 
                  type="date" 
                  max={hojeFormatoISO}
                  value={dataFim} 
                  onChange={(e) => setDataFim(e.target.value)} 
                  className="bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-brand outline-none text-slate-700"
                />
              </div>
              <button 
                onClick={buscarHistorico} 
                className="bg-brand text-white font-bold text-sm px-6 py-2.5 rounded-xl hover:opacity-90 flex items-center justify-center gap-2 h-[42px] transition-opacity shadow-sm"
              >
                <Search size={16}/> Buscar
              </button>
            </div>
          </motion.div>

          {/* AÇÕES GLOBAIS */}
          <motion.div variants={itemAnim} className="flex justify-end gap-3">
             <button onClick={() => abrirModalOcorrencia(null)} className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 text-slate-600 font-bold text-xs rounded-xl shadow-sm hover:bg-slate-50 transition-colors">
                <Wrench size={14} className="text-amber-500"/> Lançar Ocorrência Geral
             </button>
             <button onClick={() => abrirModalPontoManual(null)} className="flex items-center gap-2 px-4 py-2 bg-brand/10 border border-brand/20 text-brand font-bold text-xs rounded-xl shadow-sm hover:bg-brand hover:text-white transition-colors">
                <Edit2 size={14} /> Ponto Manual
             </button>
          </motion.div>

          {/* LISTA DE DIAS */}
          <div className="flex flex-col gap-4">
            {loading ? (
              <div className="text-center py-12 bg-white rounded-[24px] border border-slate-200/60 shadow-sm">
                <div className="w-8 h-8 border-4 border-brand border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                <p className="text-slate-500 font-medium text-sm">Buscando registos do período...</p>
              </div>
            ) : diasAgrupados.length === 0 ? (
              <div className="text-center py-12 bg-white rounded-[24px] border border-slate-200/60 shadow-sm flex flex-col items-center">
                <CalendarDays className="text-slate-300 mb-3" size={40}/>
                <p className="text-slate-500 font-medium text-sm">Nenhum dia encontrado neste intervalo.</p>
              </div>
            ) : (
              diasAgrupados.map((dia, idx) => (
                <motion.div key={idx} variants={itemAnim} className="bg-white rounded-[24px] p-5 shadow-sm border border-slate-200/60 hover:border-brand/30 transition-colors">
                  
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4 pb-4 border-b border-slate-100">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-brand/10 text-brand flex items-center justify-center font-black">
                        {dia.dataExibicao.split('/')[0]}
                      </div>
                      <div>
                        <div className="font-bold text-slate-800">{dia.dataExibicao}</div>
                        <div className="text-xs text-slate-400 capitalize font-medium">{dia.diaSemana}</div>
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-4 md:gap-8 items-center bg-slate-50 px-4 py-2 rounded-xl border border-slate-100 flex-1 md:flex-none justify-between">
                      <div className="text-center">
                        <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Previstas</div>
                        <div className="text-sm font-bold text-slate-700">08:00</div>
                      </div>
                      <div className="text-center">
                        <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Trabalhadas</div>
                        <div className="text-sm font-bold text-slate-700">{dia.pontos.length > 0 ? '--:--' : '00:00'}</div>
                      </div>
                      <div className="text-center">
                        <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Saldo</div>
                        <div className="text-sm font-bold text-slate-400">-</div>
                      </div>
                    </div>

                    <div className="flex gap-2 shrink-0">
                      <button onClick={() => abrirModalOcorrencia(dia.dataIso)} className="flex items-center justify-center w-10 h-10 bg-slate-50 text-slate-500 rounded-xl hover:bg-amber-50 hover:text-amber-600 transition-colors border border-slate-100" title="Lançar Ocorrência">
                        <Wrench size={16} />
                      </button>
                      <button onClick={() => abrirModalPontoManual(dia.dataIso)} className="flex items-center justify-center w-10 h-10 bg-slate-50 text-slate-500 rounded-xl hover:bg-brand/10 hover:text-brand transition-colors border border-slate-100" title="Ponto Manual">
                        <Edit2 size={16} />
                      </button>
                    </div>
                  </div>

                  {/* Linha do Tempo dos Pontos */}
                  {dia.pontos.length > 0 ? (
                    <div className="flex flex-wrap items-center gap-4 px-2">
                      {dia.pontos.map((p, i) => (
                        <div key={i} className={`flex items-center gap-2 bg-slate-50 border rounded-lg px-3 py-1.5 ${p.status === 'pendente' ? 'border-dashed border-amber-300 bg-amber-50/50' : 'border-slate-100'}`}>
                          <div className={`w-2 h-2 rounded-full ring-2 ${getCorPontoEstilo(p)}`}></div>
                          <span className={`text-xs font-bold ${p.status === 'pendente' ? 'text-amber-700' : 'text-slate-600'}`}>
                            {new Date(p.horario).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                          </span>
                          <span className="text-[10px] text-slate-400 uppercase ml-1 flex items-center gap-1">
                            {p.tipo}
                            {p.status === 'pendente' && <span className="text-amber-500 font-bold bg-amber-100 px-1.5 rounded-md">(PENDENTE)</span>}
                          </span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-xs text-slate-400 font-medium px-2 py-1 italic flex items-center gap-2">
                      Nenhum registo encontrado para este dia.
                    </div>
                  )}

                </motion.div>
              ))
            )}
          </div>
        </motion.main>
      </div>

      {/* MODAL: LANÇAR OCORRÊNCIA */}
      <AnimatePresence>
        {modalOcorrencia.aberto && (
          <div className="fixed inset-0 bg-slate-900/60 z-[60] flex items-center justify-center p-4 backdrop-blur-sm">
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="bg-white rounded-3xl shadow-2xl max-w-md w-full overflow-hidden">
              <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2"><FileText className="text-amber-500" size={20}/> Lançar Ocorrência</h3>
                <button onClick={() => setModalOcorrencia({ aberto: false, data: null })} className="text-slate-400 hover:text-slate-600 p-1.5 rounded-full hover:bg-slate-200 transition-colors"><X size={20} /></button>
              </div>
              <div className="p-6 flex flex-col gap-5">
                <div className="flex flex-col gap-2">
                  <label className="text-xs font-bold text-slate-600 uppercase flex gap-1">Motivo / Descrição <span className="text-red-500">*</span></label>
                  <input 
                    type="text" 
                    value={motivoOcorrencia}
                    onChange={(e) => setMotivoOcorrencia(e.target.value)}
                    placeholder="Ex: Atestado médico, Folga, Casamento..." 
                    className="bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-amber-500 outline-none transition-all" 
                  />
                </div>
                <div className="flex flex-col gap-2">
                  <label className="text-xs font-bold text-slate-600 uppercase flex gap-1">Data Referência <span className="text-red-500">*</span></label>
                  <input 
                    type="datetime-local" 
                    value={dataOcorrencia}
                    onChange={(e) => setDataOcorrencia(e.target.value)}
                    max={`${hojeFormatoISO}T23:59`}
                    className="bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-amber-500 outline-none text-slate-700 transition-all" 
                  />
                </div>
                
                {/* CAMPO DE UPLOAD DE ARQUIVO */}
                <div className="flex flex-col gap-2">
                  <label className="text-xs font-bold text-slate-600 uppercase flex items-center gap-1">
                    <Paperclip size={14}/> Anexar Documento (Opcional)
                  </label>
                  <label className={`flex flex-col items-center justify-center p-6 border-2 border-dashed rounded-xl cursor-pointer transition-colors ${arquivoOcorrencia ? 'border-brand bg-brand/5' : 'border-slate-300 bg-slate-50 hover:bg-slate-100'}`}>
                    <UploadCloud size={28} className={arquivoOcorrencia ? 'text-brand mb-2' : 'text-slate-400 mb-2'} />
                    <span className="text-sm font-medium text-slate-600 text-center">
                      {arquivoOcorrencia ? arquivoOcorrencia.name : 'Clique ou arraste um ficheiro aqui'}
                    </span>
                    {!arquivoOcorrencia && <span className="text-[10px] text-slate-400 mt-1">JPG, PNG, WEBP ou PDF (Max. 5MB)</span>}
                    <input 
                      type="file" 
                      className="hidden" 
                      accept=".jpg,.jpeg,.png,.webp,.pdf" 
                      onChange={(e) => setArquivoOcorrencia(e.target.files[0])}
                    />
                  </label>
                </div>

              </div>
              <div className="p-6 border-t border-slate-100 flex gap-3 bg-slate-50/50">
                <button onClick={() => setModalOcorrencia({ aberto: false, data: null })} className="flex-1 px-4 py-3 rounded-xl font-bold text-sm bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 transition-colors">Cancelar</button>
                <button onClick={handleConfirmarOcorrencia} className="flex-1 px-4 py-3 rounded-xl font-bold text-sm bg-amber-500 text-white hover:bg-amber-600 transition-colors shadow-sm">Confirmar</button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* MODAL: PONTO MANUAL */}
      <AnimatePresence>
        {modalPontoManual.aberto && (
          <div className="fixed inset-0 bg-slate-900/60 z-[60] flex items-center justify-center p-4 backdrop-blur-sm">
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="bg-white rounded-3xl shadow-2xl max-w-md w-full overflow-hidden">
              <div className="p-6 border-b border-slate-100 flex justify-between items-start bg-slate-50/50">
                <div>
                  <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2"><Clock className="text-brand" size={20}/> Inserir Ponto Manual</h3>
                  <p className="text-xs font-bold text-brand mt-1">AVISO: Sujeito a aprovação do gestor.</p>
                </div>
                <button onClick={() => setModalPontoManual({ aberto: false, data: null })} className="text-slate-400 hover:text-slate-600 p-1.5 rounded-full hover:bg-slate-200 transition-colors"><X size={20} /></button>
              </div>
              <div className="p-6 flex flex-col gap-4">
                <div className="flex flex-col gap-2">
                  <label className="text-xs font-bold text-slate-600 uppercase flex gap-1">Data e Hora da Batida <span className="text-red-500">*</span></label>
                  <input 
                    type="datetime-local" 
                    value={dataPontoManual}
                    onChange={(e) => setDataPontoManual(e.target.value)}
                    max={`${hojeFormatoISO}T23:59`}
                    className="bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-brand outline-none text-slate-700 transition-all" 
                  />
                </div>
                <div className="flex flex-col gap-2">
                  <label className="text-xs font-bold text-slate-600 uppercase flex gap-1">Justificativa <span className="text-red-500">*</span></label>
                  <textarea 
                    rows="3" 
                    value={justificativaPonto}
                    onChange={(e) => setJustificativaPonto(e.target.value)}
                    placeholder="Por que não bateu o ponto no horário correto?" 
                    className="bg-slate-50 border border-slate-200 rounded-xl p-4 text-sm focus:ring-2 focus:ring-brand outline-none transition-all resize-none"
                  ></textarea>
                </div>
                <div className="flex gap-3 mt-2">
                  <button onClick={() => handleConfirmarPontoManual('Entrada')} className="flex-1 px-4 py-3 rounded-xl font-bold text-sm bg-emerald-500 text-white hover:bg-emerald-600 transition-colors shadow-sm text-center">Registar Entrada</button>
                  <button onClick={() => handleConfirmarPontoManual('Saída')} className="flex-1 px-4 py-3 rounded-xl font-bold text-sm bg-red-500 text-white hover:bg-red-600 transition-colors shadow-sm text-center">Registar Saída</button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* MODAL DE CONFIRMAÇÃO CUSTOMIZADO */}
      <AnimatePresence>
        {modalConfirmacao.aberto && (
          <div className="fixed inset-0 bg-slate-900/60 z-[70] flex items-center justify-center p-4 backdrop-blur-sm">
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="bg-white rounded-3xl shadow-2xl max-w-sm w-full p-6 text-center relative overflow-hidden">
              <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-amber-400 to-amber-600"></div>
              
              <div className={`w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 mt-2 ${modalConfirmacao.tipo === 'perigo' ? 'bg-red-100 text-red-500' : 'bg-amber-100 text-amber-500'}`}>
                <AlertTriangle size={32} />
              </div>
              <h3 className="text-xl font-bold text-slate-800 mb-2">{modalConfirmacao.titulo}</h3>
              <p className="text-sm text-slate-600 mb-8 px-2">{modalConfirmacao.mensagem}</p>
              
              <div className="flex gap-3">
                <button onClick={() => setModalConfirmacao({ ...modalConfirmacao, aberto: false })} className="flex-1 px-4 py-3 rounded-xl font-bold text-sm bg-slate-100 text-slate-600 hover:bg-slate-200 transition-colors">Cancelar</button>
                <button 
                  onClick={() => { modalConfirmacao.acao(); setModalConfirmacao({ ...modalConfirmacao, aberto: false }); }} 
                  className={`flex-1 px-4 py-3 rounded-xl font-bold text-sm text-white transition-colors shadow-sm ${modalConfirmacao.tipo === 'perigo' ? 'bg-red-500 hover:bg-red-600' : 'bg-brand hover:opacity-90'}`}
                >
                  Confirmar Ação
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}