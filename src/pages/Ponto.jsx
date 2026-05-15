import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../services/supabase';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Menu, Clock, CalendarDays, History, Play, Pause, RotateCcw, 
  Square, CheckCircle2, AlertTriangle, ChevronRight, Timer
} from 'lucide-react';
import toast from 'react-hot-toast';
import { Sidebar } from '../components/Sidebar';

const containerAnim = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.1 } } };
const itemAnim = { hidden: { opacity: 0, y: 15 }, show: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 120 } } };

export function Ponto() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [perfilUsuario, setPerfilUsuario] = useState(null);
  const [menuAberto, setMenuAberto] = useState(false);
  
  const [horaAtual, setHoraAtual] = useState(new Date());
  const [pontosHoje, setPontosHoje] = useState([]);
  const [historico, setHistorico] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Modal de Confirmação Customizado
  const [modalConfirmacao, setModalConfirmacao] = useState({ aberto: false, titulo: '', mensagem: '', acao: null, tipo: 'aviso' });

  // Relógio em tempo real
  useEffect(() => {
    const timer = setInterval(() => setHoraAtual(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Carregamento inicial de dados
  useEffect(() => {
    const carregarDados = async () => {
      const { data: { user: authUser } } = await supabase.auth.getUser();
      if (!authUser) return navigate('/');
      setUser(authUser);

      const { data: perfil } = await supabase.from('perfis').select('*').eq('id', authUser.id).single();
      if (perfil) {
        setPerfilUsuario(perfil);
        await buscarPontosHoje(authUser.id);
        await buscarHistorico(authUser.id);
      }
      setLoading(false);
    };
    carregarDados();
  }, [navigate]);

  const buscarPontosHoje = async (userId) => {
    const hoje = new Date(); 
    hoje.setHours(0, 0, 0, 0);
    const amanha = new Date(hoje); 
    amanha.setDate(amanha.getDate() + 1);

    const { data } = await supabase.from('registros_ponto')
      .select('*')
      .eq('usuario_id', userId)
      .gte('horario', hoje.toISOString())
      .lt('horario', amanha.toISOString())
      .order('horario', { ascending: true });
      
    if (data) setPontosHoje(data);
  };

  const buscarHistorico = async (userId) => {
    const trintaDiasAtras = new Date();
    trintaDiasAtras.setDate(trintaDiasAtras.getDate() - 30);

    const { data } = await supabase.from('registros_ponto')
      .select('*')
      .eq('usuario_id', userId)
      .gte('horario', trintaDiasAtras.toISOString())
      .order('horario', { ascending: false });

    if (data) {
      // Agrupar por data (DD/MM/YYYY) para exibir na tabela
      const agrupado = data.reduce((acc, ponto) => {
        const dataStr = new Date(ponto.horario).toLocaleDateString('pt-BR');
        if (!acc[dataStr]) acc[dataStr] = [];
        acc[dataStr].push(ponto);
        return acc;
      }, {});

      // Converter objeto em array e ordernar do mais recente pro mais antigo
      const historicoArray = Object.keys(agrupado).map(data => ({
        data,
        registros: agrupado[data].sort((a, b) => new Date(a.horario) - new Date(b.horario))
      }));

      setHistorico(historicoArray);
    }
  };

  const pedirConfirmacao = (titulo, mensagem, acao, tipo = 'aviso') => {
    setModalConfirmacao({ aberto: true, titulo, mensagem, acao, tipo });
  };

  const handleAcaoPonto = async (tipoSelecionado) => {
    if (tipoSelecionado === 'pausa') {
      pedirConfirmacao("Início de Pausa", "Deseja registrar o início do seu Almoço/Pausa agora?", () => executarAcaoPonto('pausa'), 'aviso');
      return;
    } else if (tipoSelecionado === 'saida') {
      pedirConfirmacao("Encerrar Jornada", "Atenção: Deseja encerrar a sua jornada de trabalho agora?", () => executarAcaoPonto('saida'), 'perigo');
      return;
    }
    executarAcaoPonto(tipoSelecionado);
  };

  const executarAcaoPonto = async (tipoSelecionado) => {
    setLoading(true);
    const { error } = await supabase.from('registros_ponto').insert([{ 
      usuario_id: user.id, 
      empresa_id: perfilUsuario.empresa_id, 
      tipo: tipoSelecionado, 
      dispositivo: 'web' 
    }]);

    if (error) {
      toast.error('Erro ao registrar ponto: ' + error.message);
    } else {
      toast.success('Ponto registrado com sucesso!');
      await buscarPontosHoje(user.id);
      await buscarHistorico(user.id);
    }
    setLoading(false);
  };

  const getOpcoesPonto = () => {
    if (pontosHoje.length >= 4) return [];

    const ultimo = pontosHoje.length > 0 ? pontosHoje[pontosHoje.length - 1].tipo : null;
    const opcoes = [];
    
    if (!ultimo || ultimo === 'saida') {
      opcoes.push({ tipo: 'entrada', label: 'Registrar Entrada', color: 'bg-emerald-500 hover:bg-emerald-600', icon: <Play size={18}/> });
    } else if (ultimo === 'entrada' || ultimo === 'retorno') {
      opcoes.push({ tipo: 'pausa', label: 'Iniciar Pausa', color: 'bg-amber-500 hover:bg-amber-600', icon: <Pause size={18}/> });
      opcoes.push({ tipo: 'saida', label: 'Encerrar Expediente', color: 'bg-red-500 hover:bg-red-600', icon: <Square size={18}/> });
    } else if (ultimo === 'pausa') {
      opcoes.push({ tipo: 'retorno', label: 'Retornar da Pausa', color: 'bg-brand hover:opacity-90', icon: <RotateCcw size={18}/> });
    }
    return opcoes;
  };

  // Calcula horas trabalhadas no dia atual
  const calcularHorasHoje = () => {
    if (pontosHoje.length === 0) return "0h 0m";
    
    let totalMinutos = 0;
    const entrada = pontosHoje.find(p => p.tipo === 'entrada');
    const pausa = pontosHoje.find(p => p.tipo === 'pausa');
    const retorno = pontosHoje.find(p => p.tipo === 'retorno');
    const saida = pontosHoje.find(p => p.tipo === 'saida');

    // Se bateu entrada, mas não pausa nem saída, calcula até o momento atual
    if (entrada && !pausa && !saida) {
      totalMinutos += (horaAtual - new Date(entrada.horario)) / 60000;
    }
    // Se bateu entrada e pausa
    if (entrada && pausa) {
      totalMinutos += (new Date(pausa.horario) - new Date(entrada.horario)) / 60000;
    }
    // Se bateu retorno, calcula do retorno até a saída ou até o momento atual
    if (retorno) {
      const fim = saida ? new Date(saida.horario) : horaAtual;
      totalMinutos += (fim - new Date(retorno.horario)) / 60000;
    }

    const horas = Math.floor(totalMinutos / 60);
    const minutos = Math.floor(totalMinutos % 60);
    return `${horas}h ${minutos}m`;
  };

  const getTipoFormatado = (tipo) => {
    const formatos = {
      'entrada': { label: 'Entrada', color: 'text-emerald-500', bg: 'bg-emerald-100' },
      'pausa': { label: 'Pausa', color: 'text-amber-500', bg: 'bg-amber-100' },
      'retorno': { label: 'Retorno', color: 'text-brand', bg: 'bg-brand/10' },
      'saida': { label: 'Saída', color: 'text-red-500', bg: 'bg-red-100' }
    };
    return formatos[tipo] || { label: tipo, color: 'text-slate-500', bg: 'bg-slate-100' };
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
              Portal <span className="text-slate-300 mx-2">/</span> <strong className="text-slate-800 uppercase tracking-wider text-[11px]">Ponto Eletrônico</strong>
            </div>
          </div>
          
          <div className="flex items-center gap-6">
            <div className="hidden md:flex text-sm font-bold text-slate-600 items-center gap-2 border-r border-slate-200 pr-6">
              <CalendarDays size={18} className="text-brand"/>
              {horaAtual.toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long' })}
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
          </div>
        </header>

        <motion.main variants={containerAnim} initial="hidden" animate="show" className="p-6 lg:p-8 max-w-[1200px] mx-auto w-full flex flex-col gap-8 pb-20">
          
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            {/* CARD DE BATER PONTO (Ocupa 2 colunas no Desktop) */}
            <motion.div variants={itemAnim} className="lg:col-span-2 bg-white rounded-[24px] p-8 shadow-sm border border-slate-200/60 flex flex-col items-center justify-center relative overflow-hidden">
              <div className="absolute top-0 w-full h-2 bg-gradient-to-r from-brand to-indigo-500"></div>
              
              <h2 className="text-sm font-bold uppercase tracking-widest text-slate-400 mb-2">Horário de Brasília</h2>
              <div className="text-6xl md:text-7xl font-black text-slate-800 tabular-nums tracking-tighter mb-8">
                {horaAtual.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                <span className="text-2xl text-slate-400 ml-2 animate-pulse">{horaAtual.getSeconds().toString().padStart(2, '0')}</span>
              </div>

              <div className="w-full max-w-md flex flex-col gap-4">
                {pontosHoje.length >= 4 ? (
                  <div className="bg-emerald-50 border border-emerald-100 rounded-2xl p-6 text-center flex flex-col items-center gap-3">
                    <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-500 flex items-center justify-center"><CheckCircle2 size={24}/></div>
                    <div>
                      <h3 className="font-bold text-emerald-700">Jornada Concluída!</h3>
                      <p className="text-xs text-emerald-600 mt-1">Todos os registros de hoje foram efetuados. Bom descanso.</p>
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col sm:flex-row gap-3">
                    {getOpcoesPonto().map(acao => (
                      <button 
                        key={acao.tipo} 
                        onClick={() => handleAcaoPonto(acao.tipo)} 
                        disabled={loading} 
                        className={`${acao.color} text-white text-sm font-bold py-4 px-6 rounded-2xl flex items-center justify-center gap-2 transition-all shadow-md hover:shadow-lg hover:-translate-y-1 flex-1`}
                      >
                        {acao.icon} {acao.label}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </motion.div>

            {/* CARD DE RESUMO DO DIA */}
            <motion.div variants={itemAnim} className="bg-white rounded-[24px] p-6 shadow-sm border border-slate-200/60 flex flex-col">
              <h3 className="text-sm font-bold uppercase tracking-wider text-slate-800 flex items-center gap-2 mb-6">
                <Timer size={18} className="text-brand"/> Resumo de Hoje
              </h3>
              
              <div className="flex-1 flex flex-col justify-center items-center py-6 bg-slate-50 rounded-2xl border border-slate-100 mb-6">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">Horas Trabalhadas</span>
                <span className="text-4xl font-black text-brand tabular-nums">{calcularHorasHoje()}</span>
              </div>

              <div className="relative">
                <div className="absolute left-3 top-2 bottom-2 w-0.5 bg-slate-200"></div>
                <div className="flex flex-col gap-4">
                  {['entrada', 'pausa', 'retorno', 'saida'].map((tipoBase, idx) => {
                    const ponto = pontosHoje.find(p => p.tipo === tipoBase);
                    const config = getTipoFormatado(tipoBase);
                    
                    return (
                      <div key={idx} className="flex items-center gap-4 relative z-10">
                        <div className={`w-6 h-6 rounded-full flex items-center justify-center border-4 border-white ${ponto ? config.bg + ' ' + config.color : 'bg-slate-200 text-slate-400'}`}>
                          {ponto ? <CheckCircle2 size={12} /> : <div className="w-1.5 h-1.5 rounded-full bg-slate-400"></div>}
                        </div>
                        <div className="flex-1 bg-white border border-slate-100 rounded-xl p-3 flex justify-between items-center shadow-sm">
                          <span className="text-xs font-bold text-slate-600">{config.label}</span>
                          <span className={`text-xs font-bold ${ponto ? 'text-slate-800' : 'text-slate-400'}`}>
                            {ponto ? new Date(ponto.horario).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) : '--:--'}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </motion.div>

          </div>

          {/* TABELA DE HISTÓRICO */}
          <motion.div variants={itemAnim} className="bg-white rounded-[24px] shadow-sm border border-slate-200/60 overflow-hidden mt-2">
            <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
              <h3 className="text-sm font-bold uppercase tracking-wider text-slate-800 flex items-center gap-2">
                <History size={18} className="text-brand"/> Histórico Recente (30 dias)
              </h3>
            </div>
            
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-white border-b border-slate-100">
                    <th className="p-4 text-xs font-bold text-slate-400 uppercase tracking-widest w-40">Data</th>
                    <th className="p-4 text-xs font-bold text-slate-400 uppercase tracking-widest text-center">Entrada</th>
                    <th className="p-4 text-xs font-bold text-slate-400 uppercase tracking-widest text-center">Pausa</th>
                    <th className="p-4 text-xs font-bold text-slate-400 uppercase tracking-widest text-center">Retorno</th>
                    <th className="p-4 text-xs font-bold text-slate-400 uppercase tracking-widest text-center">Saída</th>
                    <th className="p-4 text-xs font-bold text-slate-400 uppercase tracking-widest text-right">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white">
                  {historico.length === 0 ? (
                    <tr>
                      <td colSpan="6" className="p-8 text-center text-sm text-slate-500">Nenhum registro encontrado nos últimos 30 dias.</td>
                    </tr>
                  ) : (
                    historico.map((dia, index) => {
                      const entrada = dia.registros.find(r => r.tipo === 'entrada');
                      const pausa = dia.registros.find(r => r.tipo === 'pausa');
                      const retorno = dia.registros.find(r => r.tipo === 'retorno');
                      const saida = dia.registros.find(r => r.tipo === 'saida');
                      
                      const completo = entrada && pausa && retorno && saida;

                      const formatarHora = (ponto) => ponto ? new Date(ponto.horario).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) : '--:--';

                      return (
                        <tr key={index} className="hover:bg-slate-50/80 transition-colors">
                          <td className="p-4 font-bold text-sm text-slate-700">{dia.data}</td>
                          <td className="p-4 text-center text-sm font-medium text-slate-600">{formatarHora(entrada)}</td>
                          <td className="p-4 text-center text-sm font-medium text-slate-600">{formatarHora(pausa)}</td>
                          <td className="p-4 text-center text-sm font-medium text-slate-600">{formatarHora(retorno)}</td>
                          <td className="p-4 text-center text-sm font-medium text-slate-600">{formatarHora(saida)}</td>
                          <td className="p-4 text-right">
                            {completo ? (
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-600">
                                <CheckCircle2 size={12}/> Completo
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-amber-100 text-amber-600">
                                <AlertTriangle size={12}/> Incompleto
                              </span>
                            )}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </motion.div>

        </motion.main>
      </div>

      {/* Modal de Confirmação Customizado */}
      <AnimatePresence>
        {modalConfirmacao.aberto && (
          <div className="fixed inset-0 bg-slate-900/60 z-[60] flex items-center justify-center p-4 backdrop-blur-sm">
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="bg-white rounded-3xl shadow-2xl max-w-sm w-full p-6 text-center relative overflow-hidden">
              <div className={`absolute top-0 left-0 w-full h-2 ${modalConfirmacao.tipo === 'perigo' ? 'bg-gradient-to-r from-red-400 to-red-600' : 'bg-gradient-to-r from-amber-400 to-amber-600'}`}></div>
              <div className={`w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 mt-2 ${modalConfirmacao.tipo === 'perigo' ? 'bg-red-100 text-red-500' : 'bg-amber-100 text-amber-500'}`}>
                <AlertTriangle size={32} />
              </div>
              <h3 className="text-xl font-bold text-slate-800 mb-2">{modalConfirmacao.titulo}</h3>
              <p className="text-sm text-slate-600 mb-8">{modalConfirmacao.mensagem}</p>
              
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