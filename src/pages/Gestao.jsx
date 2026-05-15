import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../services/supabase';
import { motion, AnimatePresence } from 'framer-motion';
import { Sidebar } from '../components/Sidebar';
import { 
  Menu, Users, CheckCircle, XCircle, Clock, AlertTriangle, 
  UserPlus, FileBarChart, Activity, UserCheck, UserMinus, Search, FileText
} from 'lucide-react';
import toast from 'react-hot-toast';

const containerAnim = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.08 } } };
const itemAnim = { hidden: { opacity: 0, y: 15 }, show: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 120 } } };

export function Gestao() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [menuAberto, setMenuAberto] = useState(false);
  const [abaAtiva, setAbaAtiva] = useState('aprovacoes'); // 'aprovacoes' | 'equipa'
  
  // Modal de Confirmação Customizado
  const [modalConfirmacao, setModalConfirmacao] = useState({ aberto: false, titulo: '', mensagem: '', acao: null, tipo: 'aviso' });

  useEffect(() => {
    const carregarDados = async () => {
      const { data: { user: authUser } } = await supabase.auth.getUser();
      if (!authUser) return navigate('/');
      setUser(authUser);
    };
    carregarDados();
  }, [navigate]);

  // ==========================================
  // MOCK DATA (Substituir por queries reais depois)
  // ==========================================
  const pendencias = [
    { id: 1, nome: 'João Pedro', cargo: 'Desenvolvedor Frontend', tipo: 'Ponto Manual', data: '15/05/2026', hora: '08:00', descricao: 'Esqueci-me de registar a entrada ao chegar ao escritório.', icone: <Clock size={16}/>, cor: 'text-brand', bg: 'bg-brand/10' },
    { id: 2, nome: 'Maria Silva', cargo: 'UX Designer', tipo: 'Ocorrência', data: '14/05/2026', hora: 'Dia Inteiro', descricao: 'Atestado Médico (Anexo incluído).', icone: <FileText size={16}/>, cor: 'text-amber-500', bg: 'bg-amber-100' },
    { id: 3, nome: 'Carlos Souza', cargo: 'QA Analyst', tipo: 'Ponto Manual', data: '13/05/2026', hora: '18:05', descricao: 'O sistema estava lento e não consegui registar a saída a tempo.', icone: <Clock size={16}/>, cor: 'text-brand', bg: 'bg-brand/10' }
  ];

  const equipa = [
    { id: 1, nome: 'João Pedro', cargo: 'Desenvolvedor Frontend', status: 'Trabalhando', ultimaBatida: 'Entrada às 08:00', humor: '🤩' },
    { id: 2, nome: 'Maria Silva', cargo: 'UX Designer', status: 'Ausente', ultimaBatida: 'Atestado Médico', humor: '🤒' },
    { id: 3, nome: 'Carlos Souza', cargo: 'QA Analyst', status: 'Em Pausa', ultimaBatida: 'Pausa às 12:15', humor: '🙂' },
    { id: 4, nome: 'Ana Costa', cargo: 'Product Manager', status: 'Trabalhando', ultimaBatida: 'Retorno às 13:00', humor: '🤩' },
  ];

  const pedirConfirmacao = (titulo, mensagem, acao, tipo = 'aviso') => {
    setModalConfirmacao({ aberto: true, titulo, mensagem, acao, tipo });
  };

  const handleAprovar = (nome) => {
    pedirConfirmacao('Aprovar Pedido', `Tem a certeza que deseja aprovar o pedido de ${nome}?`, () => {
      toast.success(`Pedido de ${nome} aprovado com sucesso!`);
    }, 'aviso');
  };

  const handleRejeitar = (nome) => {
    pedirConfirmacao('Rejeitar Pedido', `Atenção: Tem a certeza que deseja rejeitar o pedido de ${nome}?`, () => {
      toast.success(`Pedido de ${nome} rejeitado.`);
    }, 'perigo');
  };

  const userName = user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'Gestor';

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
              Portal <span className="text-slate-300 mx-2">/</span> <strong className="text-slate-800 uppercase tracking-wider text-[11px]">Gestão de Equipa</strong>
            </div>
          </div>
          
          <div className="flex items-center gap-3 cursor-pointer group" onClick={() => navigate('/perfil')}>
            <div className="text-right hidden sm:block">
              <div className="text-sm font-bold text-slate-800 group-hover:text-brand transition-colors">{userName}</div>
              <div className="text-[10px] text-slate-500 font-bold uppercase tracking-tight">Ver Perfil</div>
            </div>
            <div className="w-9 h-9 rounded-full bg-brand text-white flex items-center justify-center font-bold text-sm shadow-sm">
              {userName?.charAt(0)?.toUpperCase() || 'G'}
            </div>
          </div>
        </header>

        <motion.main variants={containerAnim} initial="hidden" animate="show" className="p-6 lg:p-8 max-w-[1200px] mx-auto w-full flex flex-col gap-6 pb-20">
          
          {/* CABEÇALHO DA PÁGINA E AÇÃO PRINCIPAL */}
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-2">
            <div>
              <h1 className="text-2xl lg:text-3xl font-extrabold text-slate-800 tracking-tight">Painel de Gestão</h1>
              <p className="text-slate-500 mt-1 text-sm font-medium">Acompanhe a sua equipa, aprove pendências e analise métricas.</p>
            </div>
            <button className="bg-brand text-white font-bold text-sm px-6 py-3 rounded-xl hover:bg-brand/90 transition-all shadow-md hover:shadow-lg flex items-center justify-center gap-2 hover:-translate-y-0.5">
              <UserPlus size={16} /> Adicionar Colaborador
            </button>
          </div>

          {/* CARDS DE MÉTRICAS */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
            <motion.div variants={itemAnim} className="bg-white rounded-[24px] p-5 md:p-6 border border-slate-200/60 shadow-sm flex flex-col gap-3 hover:-translate-y-1 transition-transform">
              <div className="w-10 h-10 md:w-12 md:h-12 rounded-xl bg-blue-50 text-blue-500 flex items-center justify-center shrink-0">
                <Users size={20} />
              </div>
              <div>
                <p className="text-2xl md:text-3xl font-black text-slate-800 tabular-nums">24</p>
                <h4 className="text-[10px] md:text-xs font-bold text-slate-400 uppercase tracking-widest mt-1">Colaboradores</h4>
              </div>
            </motion.div>

            <motion.div variants={itemAnim} className="bg-white rounded-[24px] p-5 md:p-6 border border-slate-200/60 shadow-sm flex flex-col gap-3 hover:-translate-y-1 transition-transform">
              <div className="w-10 h-10 md:w-12 md:h-12 rounded-xl bg-amber-50 text-amber-500 flex items-center justify-center shrink-0 relative">
                <AlertTriangle size={20} />
                <span className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full animate-ping"></span>
              </div>
              <div>
                <p className="text-2xl md:text-3xl font-black text-slate-800 tabular-nums">3</p>
                <h4 className="text-[10px] md:text-xs font-bold text-slate-400 uppercase tracking-widest mt-1">Aprovações Pend.</h4>
              </div>
            </motion.div>

            <motion.div variants={itemAnim} className="bg-white rounded-[24px] p-5 md:p-6 border border-slate-200/60 shadow-sm flex flex-col gap-3 hover:-translate-y-1 transition-transform">
              <div className="w-10 h-10 md:w-12 md:h-12 rounded-xl bg-rose-50 text-rose-500 flex items-center justify-center shrink-0">
                <UserMinus size={20} />
              </div>
              <div>
                <p className="text-2xl md:text-3xl font-black text-slate-800 tabular-nums">1</p>
                <h4 className="text-[10px] md:text-xs font-bold text-slate-400 uppercase tracking-widest mt-1">Ausentes Hoje</h4>
              </div>
            </motion.div>

            <motion.div variants={itemAnim} className="bg-gradient-to-br from-emerald-400 to-teal-500 rounded-[24px] p-5 md:p-6 shadow-sm flex flex-col gap-3 text-white hover:-translate-y-1 transition-transform">
              <div className="w-10 h-10 md:w-12 md:h-12 rounded-xl bg-white/20 flex items-center justify-center shrink-0 backdrop-blur-sm">
                <Activity size={20} className="text-white" />
              </div>
              <div>
                <p className="text-2xl md:text-3xl font-black tabular-nums">🤩 Excelente</p>
                <h4 className="text-[10px] md:text-xs font-bold text-white/80 uppercase tracking-widest mt-1">Humor Médio</h4>
              </div>
            </motion.div>
          </div>

          {/* ABAS (TABS) */}
          <motion.div variants={itemAnim} className="flex gap-6 border-b border-slate-200 mt-2">
            <button 
              onClick={() => setAbaAtiva('aprovacoes')} 
              className={`pb-4 text-sm font-bold relative transition-colors flex items-center gap-2 ${abaAtiva === 'aprovacoes' ? 'text-brand' : 'text-slate-400 hover:text-slate-600'}`}
            >
              <CheckCircle size={16}/> Aprovações Pendentes
              {abaAtiva === 'aprovacoes' && <motion.div layoutId="aba-gestao" className="absolute bottom-0 left-0 right-0 h-0.5 bg-brand rounded-t-full"/>}
            </button>
            <button 
              onClick={() => setAbaAtiva('equipa')} 
              className={`pb-4 text-sm font-bold relative transition-colors flex items-center gap-2 ${abaAtiva === 'equipa' ? 'text-brand' : 'text-slate-400 hover:text-slate-600'}`}
            >
              <Users size={16}/> Acompanhamento da Equipa
              {abaAtiva === 'equipa' && <motion.div layoutId="aba-gestao" className="absolute bottom-0 left-0 right-0 h-0.5 bg-brand rounded-t-full"/>}
            </button>
          </motion.div>

          {/* CONTEÚDO DAS ABAS */}
          <motion.div variants={itemAnim} className="mt-2">
            
            <AnimatePresence mode="wait">
              {/* ABA: APROVAÇÕES PENDENTES */}
              {abaAtiva === 'aprovacoes' && (
                <motion.div 
                  key="aba-aprovacoes"
                  initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.2 }}
                  className="flex flex-col gap-4"
                >
                  {pendencias.map((item) => (
                    <div key={item.id} className="bg-white rounded-[24px] p-5 md:p-6 shadow-sm border border-slate-200/60 hover:border-brand/30 transition-colors flex flex-col lg:flex-row lg:items-center justify-between gap-6">
                      
                      <div className="flex items-start gap-4">
                        <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center font-bold text-slate-600 shadow-sm border border-slate-200 shrink-0">
                          {item.nome.charAt(0)}
                        </div>
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <h4 className="text-base font-bold text-slate-800">{item.nome}</h4>
                            <span className="hidden md:inline text-[10px] text-slate-400 uppercase tracking-widest font-bold">({item.cargo})</span>
                          </div>
                          
                          <div className="flex flex-wrap items-center gap-2 mb-2">
                            <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[10px] font-bold tracking-widest uppercase ${item.bg} ${item.cor}`}>
                              {item.icone} {item.tipo}
                            </span>
                            <span className="text-xs font-bold text-slate-500 bg-slate-50 px-2 py-1 rounded-md border border-slate-100">
                              {item.data} • {item.hora}
                            </span>
                          </div>
                          
                          <p className="text-sm text-slate-600"><strong>Justificativa:</strong> {item.descricao}</p>
                        </div>
                      </div>

                      <div className="flex gap-3 shrink-0 lg:w-auto w-full">
                        <button onClick={() => handleRejeitar(item.nome)} className="flex-1 lg:flex-none flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold bg-white border border-slate-200 text-red-500 hover:bg-red-50 hover:border-red-200 transition-colors">
                          <XCircle size={16}/> Rejeitar
                        </button>
                        <button onClick={() => handleAprovar(item.nome)} className="flex-1 lg:flex-none flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold bg-brand text-white hover:opacity-90 transition-opacity shadow-sm">
                          <CheckCircle size={16}/> Aprovar
                        </button>
                      </div>

                    </div>
                  ))}
                </motion.div>
              )}

              {/* ABA: ACOMPANHAMENTO DA EQUIPA */}
              {abaAtiva === 'equipa' && (
                <motion.div 
                  key="aba-equipa"
                  initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.2 }}
                >
                  <div className="bg-white rounded-[24px] shadow-sm border border-slate-200/60 overflow-hidden">
                    <div className="p-4 md:p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                      <div className="relative w-full max-w-sm">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                        <input 
                          type="text" 
                          placeholder="Pesquisar colaborador..." 
                          className="w-full bg-white border border-slate-200 rounded-xl pl-10 pr-4 py-2 text-sm focus:ring-2 focus:ring-brand outline-none transition-all shadow-sm" 
                        />
                      </div>
                      <button className="hidden md:flex items-center gap-2 text-sm font-bold text-slate-500 hover:text-brand transition-colors">
                        <FileBarChart size={16}/> Exportar Relatório
                      </button>
                    </div>

                    <div className="overflow-x-auto">
                      <table className="w-full text-left border-collapse min-w-[600px]">
                        <thead>
                          <tr className="bg-white border-b border-slate-100">
                            <th className="p-4 text-xs font-bold text-slate-400 uppercase tracking-widest">Colaborador</th>
                            <th className="p-4 text-xs font-bold text-slate-400 uppercase tracking-widest">Status Atual</th>
                            <th className="p-4 text-xs font-bold text-slate-400 uppercase tracking-widest">Último Registo</th>
                            <th className="p-4 text-xs font-bold text-slate-400 uppercase tracking-widest text-center">Humor</th>
                            <th className="p-4 text-xs font-bold text-slate-400 uppercase tracking-widest text-right">Ações</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 bg-white">
                          {equipa.map((membro) => (
                            <tr key={membro.id} className="hover:bg-slate-50/80 transition-colors">
                              <td className="p-4">
                                <div className="flex items-center gap-3">
                                  <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center font-bold text-slate-600 text-xs shadow-sm border border-slate-200">
                                    {membro.nome.charAt(0)}
                                  </div>
                                  <div>
                                    <div className="font-bold text-sm text-slate-800">{membro.nome}</div>
                                    <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{membro.cargo}</div>
                                  </div>
                                </div>
                              </td>
                              <td className="p-4">
                                <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold tracking-widest uppercase border 
                                  ${membro.status === 'Trabalhando' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 
                                    membro.status === 'Em Pausa' ? 'bg-amber-50 text-amber-600 border-amber-100' : 
                                    'bg-red-50 text-red-600 border-red-100'}`}
                                >
                                  {membro.status === 'Trabalhando' ? <UserCheck size={12}/> : membro.status === 'Em Pausa' ? <Clock size={12}/> : <UserMinus size={12}/>}
                                  {membro.status}
                                </span>
                              </td>
                              <td className="p-4 text-sm font-medium text-slate-600">{membro.ultimaBatida}</td>
                              <td className="p-4 text-center text-xl">{membro.humor}</td>
                              <td className="p-4 text-right">
                                <button className="text-brand text-xs font-bold hover:underline">Ver Perfil</button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

          </motion.div>
        </motion.main>
      </div>

      {/* MODAL DE CONFIRMAÇÃO CUSTOMIZADO */}
      <AnimatePresence>
        {modalConfirmacao.aberto && (
          <div className="fixed inset-0 bg-slate-900/60 z-[70] flex items-center justify-center p-4 backdrop-blur-sm">
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="bg-white rounded-3xl shadow-2xl max-w-sm w-full p-6 text-center relative overflow-hidden">
              <div className={`absolute top-0 left-0 w-full h-2 ${modalConfirmacao.tipo === 'perigo' ? 'bg-gradient-to-r from-red-400 to-red-600' : 'bg-gradient-to-r from-amber-400 to-amber-600'}`}></div>
              
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
                  Confirmar
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}