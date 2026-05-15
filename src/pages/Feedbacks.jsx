import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../services/supabase';
import { motion, AnimatePresence } from 'framer-motion';
import { Sidebar } from '../components/Sidebar';
import { 
  Menu, MessageSquare, Send, Inbox, Star, Award, TrendingUp, 
  Plus, X, CheckCircle2, AlertTriangle, User, Search
} from 'lucide-react';
import toast from 'react-hot-toast';

const containerAnim = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.08 } } };
const itemAnim = { hidden: { opacity: 0, y: 15 }, show: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 120 } } };

export function Feedbacks() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [menuAberto, setMenuAberto] = useState(false);
  const [abaAtiva, setAbaAtiva] = useState('recebidos'); // 'recebidos' | 'enviados'
  
  // Estados para o Modal de Novo Feedback
  const [modalNovoFeedback, setModalNovoFeedback] = useState(false);
  const [novoFeedback, setNovoFeedback] = useState({ destinatario: '', tipo: 'reconhecimento', mensagem: '' });
  
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

  // Mock Data para visualização do Layout (Substitua por chamadas reais ao Supabase futuramente)
  const feedbacksRecebidos = [
    { id: 1, remetente: 'Ana Silva', cargo: 'Tech Lead', data: '12 Maio 2026', tipo: 'Reconhecimento', cor: 'text-amber-500', bg: 'bg-amber-100', icone: <Award size={16}/>, mensagem: 'Excelente trabalho na entrega da nova dashboard. O código ficou limpo e a interface incrivelmente intuitiva para os utilizadores!' },
    { id: 2, remetente: 'Carlos Santos', cargo: 'Product Manager', data: '05 Maio 2026', tipo: 'Construtivo', cor: 'text-blue-500', bg: 'bg-blue-100', icone: <TrendingUp size={16}/>, mensagem: 'A comunicação durante a planning foi boa, mas acredito que podemos melhorar a clareza nas estimativas de tempo para as próximas sprints.' },
    { id: 3, remetente: 'Mariana Costa', cargo: 'Recursos Humanos', data: '20 Abril 2026', tipo: 'Comportamental', cor: 'text-emerald-500', bg: 'bg-emerald-100', icone: <Star size={16}/>, mensagem: 'A tua proatividade em ajudar os novos colaboradores no onboarding tem feito toda a diferença no clima da equipa. Muito obrigada!' }
  ];

  const feedbacksEnviados = [
    { id: 4, destinatario: 'João Pedro', cargo: 'Desenvolvedor Frontend', data: '10 Maio 2026', tipo: 'Reconhecimento', cor: 'text-amber-500', bg: 'bg-amber-100', icone: <Award size={16}/>, mensagem: 'Obrigado por me ajudares a resolver aquele bug complexo no componente de Ponto. O teu domínio de React ajudou imenso a destravar a tarefa!' }
  ];

  const pedirConfirmacao = (titulo, mensagem, acao, tipo = 'aviso') => {
    setModalConfirmacao({ aberto: true, titulo, mensagem, acao, tipo });
  };

  const handleEnviarFeedback = () => {
    if (!novoFeedback.destinatario.trim() || !novoFeedback.mensagem.trim()) {
      return toast.error("Por favor, preencha o destinatário e a mensagem.");
    }
    
    pedirConfirmacao('Enviar Feedback', `Confirma o envio deste feedback para ${novoFeedback.destinatario}? O destinatário será notificado.`, () => {
      toast.success('Feedback enviado com sucesso!');
      setModalNovoFeedback(false);
      setNovoFeedback({ destinatario: '', tipo: 'reconhecimento', mensagem: '' });
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
              Portal <span className="text-slate-300 mx-2">/</span> <strong className="text-slate-800 uppercase tracking-wider text-[11px]">Cultura e Feedbacks</strong>
            </div>
          </div>
          
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
          
          {/* CABEÇALHO DA PÁGINA E AÇÃO PRINCIPAL */}
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-2">
            <div>
              <h1 className="text-2xl lg:text-3xl font-extrabold text-slate-800 tracking-tight">Feedbacks</h1>
              <p className="text-slate-500 mt-1 text-sm font-medium">Acompanhe a sua evolução e reconheça a sua equipa.</p>
            </div>
            <button 
              onClick={() => setModalNovoFeedback(true)}
              className="bg-brand text-white font-bold text-sm px-6 py-3 rounded-xl hover:bg-brand/90 transition-all shadow-md hover:shadow-lg flex items-center justify-center gap-2 hover:-translate-y-0.5"
            >
              <Send size={16} /> Enviar Feedback
            </button>
          </div>

          {/* CARDS DE RESUMO (MÉTRICAS) */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <motion.div variants={itemAnim} className="bg-white rounded-[24px] p-6 border border-slate-200/60 shadow-sm flex items-center gap-4">
              <div className="w-14 h-14 rounded-2xl bg-brand/10 text-brand flex items-center justify-center shrink-0">
                <Inbox size={28} />
              </div>
              <div>
                <h4 className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-1">Recebidos (Ano)</h4>
                <p className="text-3xl font-black text-slate-800 tabular-nums">14</p>
              </div>
            </motion.div>

            <motion.div variants={itemAnim} className="bg-white rounded-[24px] p-6 border border-slate-200/60 shadow-sm flex items-center gap-4">
              <div className="w-14 h-14 rounded-2xl bg-emerald-50 text-emerald-500 flex items-center justify-center shrink-0">
                <Send size={28} />
              </div>
              <div>
                <h4 className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-1">Enviados (Ano)</h4>
                <p className="text-3xl font-black text-slate-800 tabular-nums">8</p>
              </div>
            </motion.div>

            <motion.div variants={itemAnim} className="bg-gradient-to-br from-amber-400 to-orange-500 rounded-[24px] p-6 border border-amber-500 shadow-sm flex items-center gap-4 text-white">
              <div className="w-14 h-14 rounded-2xl bg-white/20 flex items-center justify-center shrink-0 backdrop-blur-sm">
                <Star size={28} className="text-white" />
              </div>
              <div>
                <h4 className="text-[11px] font-bold text-white/80 uppercase tracking-widest mb-1">Destaque do Mês</h4>
                <p className="text-lg font-black leading-tight">Proatividade &<br/>Trabalho em Equipa</p>
              </div>
            </motion.div>
          </div>

          {/* ABAS (TABS) */}
          <motion.div variants={itemAnim} className="flex gap-6 border-b border-slate-200 mt-4">
            <button 
              onClick={() => setAbaAtiva('recebidos')} 
              className={`pb-4 text-sm font-bold relative transition-colors flex items-center gap-2 ${abaAtiva === 'recebidos' ? 'text-brand' : 'text-slate-400 hover:text-slate-600'}`}
            >
              <Inbox size={16}/> Meus Feedbacks
              {abaAtiva === 'recebidos' && <motion.div layoutId="aba-feedback" className="absolute bottom-0 left-0 right-0 h-0.5 bg-brand rounded-t-full"/>}
            </button>
            <button 
              onClick={() => setAbaAtiva('enviados')} 
              className={`pb-4 text-sm font-bold relative transition-colors flex items-center gap-2 ${abaAtiva === 'enviados' ? 'text-brand' : 'text-slate-400 hover:text-slate-600'}`}
            >
              <Send size={16}/> Enviados por mim
              {abaAtiva === 'enviados' && <motion.div layoutId="aba-feedback" className="absolute bottom-0 left-0 right-0 h-0.5 bg-brand rounded-t-full"/>}
            </button>
          </motion.div>

          {/* ÁREA DE LISTAGEM */}
          <motion.div variants={itemAnim} className="grid grid-cols-1 md:grid-cols-2 gap-6">
            
            <AnimatePresence mode="wait">
              {(abaAtiva === 'recebidos' ? feedbacksRecebidos : feedbacksEnviados).map((fb) => (
                <motion.div 
                  key={fb.id}
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ duration: 0.2 }}
                  className="bg-white rounded-[24px] p-6 shadow-sm border border-slate-200/60 hover:border-brand/30 transition-colors flex flex-col h-full"
                >
                  <div className="flex justify-between items-start mb-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center font-bold text-slate-600 shadow-sm border border-slate-200">
                        {abaAtiva === 'recebidos' ? fb.remetente.charAt(0) : fb.destinatario.charAt(0)}
                      </div>
                      <div>
                        <h4 className="text-sm font-bold text-slate-800">
                          {abaAtiva === 'recebidos' ? fb.remetente : `Para: ${fb.destinatario}`}
                        </h4>
                        <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wide">{fb.cargo}</p>
                      </div>
                    </div>
                    <span className="text-[10px] font-bold text-slate-400 bg-slate-50 px-2 py-1 rounded-md border border-slate-100">
                      {fb.data}
                    </span>
                  </div>

                  <div className={`mb-3 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-bold tracking-widest uppercase self-start ${fb.bg} ${fb.cor}`}>
                    {fb.icone} {fb.tipo}
                  </div>

                  <div className="bg-slate-50 border border-slate-100 rounded-xl p-4 flex-1">
                    <p className="text-sm text-slate-600 leading-relaxed italic">"{fb.mensagem}"</p>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>

            {/* Estado Vazio (Caso não haja feedbacks) */}
            {(abaAtiva === 'recebidos' ? feedbacksRecebidos : feedbacksEnviados).length === 0 && (
              <div className="col-span-1 md:col-span-2 text-center py-16 bg-white rounded-[24px] border border-slate-200/60 border-dashed">
                <MessageSquare className="mx-auto text-slate-300 mb-4" size={48} />
                <h3 className="text-lg font-bold text-slate-700">Nenhum feedback encontrado</h3>
                <p className="text-sm text-slate-500 mt-1">Ainda não existem registos nesta categoria.</p>
              </div>
            )}
          </motion.div>
        </motion.main>
      </div>

      {/* MODAL: NOVO FEEDBACK */}
      <AnimatePresence>
        {modalNovoFeedback && (
          <div className="fixed inset-0 bg-slate-900/60 z-[60] flex items-center justify-center p-4 backdrop-blur-sm">
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="bg-white rounded-3xl shadow-2xl max-w-lg w-full overflow-hidden flex flex-col max-h-[90vh]">
              <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50 shrink-0">
                <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2"><MessageSquare className="text-brand" size={20}/> Escrever Feedback</h3>
                <button onClick={() => setModalNovoFeedback(false)} className="text-slate-400 hover:text-slate-600 p-1.5 rounded-full hover:bg-slate-200 transition-colors"><X size={20} /></button>
              </div>
              
              <div className="p-6 flex flex-col gap-5 overflow-y-auto custom-scrollbar">
                
                <div className="flex flex-col gap-2">
                  <label className="text-xs font-bold text-slate-600 uppercase">Para quem é este feedback? <span className="text-red-500">*</span></label>
                  <div className="relative">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                    <input 
                      type="text" 
                      value={novoFeedback.destinatario}
                      onChange={(e) => setNovoFeedback({...novoFeedback, destinatario: e.target.value})}
                      placeholder="Pesquisar colaborador..." 
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-10 pr-4 py-3 text-sm focus:ring-2 focus:ring-brand outline-none transition-all" 
                    />
                  </div>
                </div>

                <div className="flex flex-col gap-2">
                  <label className="text-xs font-bold text-slate-600 uppercase">Tipo de Feedback <span className="text-red-500">*</span></label>
                  <div className="grid grid-cols-2 gap-3">
                    <button 
                      onClick={() => setNovoFeedback({...novoFeedback, tipo: 'reconhecimento'})}
                      className={`flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all ${novoFeedback.tipo === 'reconhecimento' ? 'border-amber-500 bg-amber-50 text-amber-700' : 'border-slate-100 bg-slate-50 text-slate-500 hover:border-amber-200'}`}
                    >
                      <Award size={24} className={novoFeedback.tipo === 'reconhecimento' ? 'text-amber-500' : 'text-slate-400'}/>
                      <span className="text-xs font-bold uppercase tracking-wider">Reconhecimento</span>
                    </button>
                    <button 
                      onClick={() => setNovoFeedback({...novoFeedback, tipo: 'construtivo'})}
                      className={`flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all ${novoFeedback.tipo === 'construtivo' ? 'border-blue-500 bg-blue-50 text-blue-700' : 'border-slate-100 bg-slate-50 text-slate-500 hover:border-blue-200'}`}
                    >
                      <TrendingUp size={24} className={novoFeedback.tipo === 'construtivo' ? 'text-blue-500' : 'text-slate-400'}/>
                      <span className="text-xs font-bold uppercase tracking-wider">Construtivo</span>
                    </button>
                  </div>
                </div>

                <div className="flex flex-col gap-2">
                  <label className="text-xs font-bold text-slate-600 uppercase">Mensagem <span className="text-red-500">*</span></label>
                  <textarea 
                    rows="4" 
                    value={novoFeedback.mensagem}
                    onChange={(e) => setNovoFeedback({...novoFeedback, mensagem: e.target.value})}
                    placeholder="Escreva a sua mensagem com clareza e empatia..." 
                    className="bg-slate-50 border border-slate-200 rounded-xl p-4 text-sm focus:ring-2 focus:ring-brand outline-none transition-all resize-none"
                  ></textarea>
                </div>

              </div>
              <div className="p-6 border-t border-slate-100 flex gap-3 bg-slate-50/50 shrink-0">
                <button onClick={() => setModalNovoFeedback(false)} className="flex-1 px-4 py-3 rounded-xl font-bold text-sm bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 transition-colors">Cancelar</button>
                <button onClick={handleEnviarFeedback} className="flex-1 px-4 py-3 rounded-xl font-bold text-sm bg-brand text-white hover:opacity-90 transition-colors shadow-sm flex items-center justify-center gap-2">
                  <Send size={16}/> Enviar
                </button>
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