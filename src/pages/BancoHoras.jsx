import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../services/supabase';
import { motion } from 'framer-motion';
import { Sidebar } from '../components/Sidebar';
import { Menu, Database, PlusCircle, MinusCircle, Clock, TrendingUp, TrendingDown, CalendarDays } from 'lucide-react';

const containerAnim = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.08 } } };
const itemAnim = { hidden: { opacity: 0, y: 15 }, show: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 120 } } };

export function BancoHoras() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [menuAberto, setMenuAberto] = useState(false);
  const [loading, setLoading] = useState(true);
  
  const [resumoBanco, setResumoBanco] = useState({ saldoTotal: 0, positivo: 0, negativo: 0 });
  const [diasCalculados, setDiasCalculados] = useState([]);

  useEffect(() => {
    calcularBancoDeHoras();
  }, []);

  const calcularBancoDeHoras = async () => {
    setLoading(true);
    const { data: { user: authUser } } = await supabase.auth.getUser();
    if (!authUser) return navigate('/');
    
    setUser(authUser); // Guardamos o usuário para exibir no cabeçalho

    const { data: registros } = await supabase
      .from('registros_ponto')
      .select('*')
      .eq('usuario_id', authUser.id)
      .order('horario', { ascending: true });

    if (registros) {
      const grupos = {};
      registros.forEach(reg => {
        const dataLocal = new Date(reg.horario).toLocaleDateString('pt-BR');
        if (!grupos[dataLocal]) grupos[dataLocal] = [];
        grupos[dataLocal].push(reg);
      });

      let totalMinPos = 0; 
      let totalMinNeg = 0;
      const diasProc = [];

      Object.entries(grupos).forEach(([data, pontos]) => {
        const entrada = pontos.find(p => p.tipo === 'entrada');
        const saida = pontos.find(p => p.tipo === 'saida');
        const pausa = pontos.find(p => p.tipo === 'pausa');
        const retorno = pontos.find(p => p.tipo === 'retorno');

        // Calcula o saldo apenas de dias fechados (com entrada e saída)
        if (entrada && saida) {
          let tempoMs = new Date(saida.horario).getTime() - new Date(entrada.horario).getTime();
          if (pausa && retorno) {
            tempoMs -= (new Date(retorno.horario).getTime() - new Date(pausa.horario).getTime());
          }
          
          const minTrab = Math.floor(tempoMs / 60000);
          const saldo = minTrab - 480; // 480 minutos = 8 horas (Ajuste conforme a jornada da empresa)
          
          if (saldo > 0) totalMinPos += saldo; 
          else totalMinNeg += Math.abs(saldo);
          
          diasProc.push({ data, minTrab, saldo });
        }
      });
      
      setDiasCalculados(diasProc.reverse());
      setResumoBanco({ saldoTotal: totalMinPos - totalMinNeg, positivo: totalMinPos, negativo: totalMinNeg });
    }
    setLoading(false);
  };

  const formatarMinutos = (totalMinutos, forcarSinal = true) => {
    const isNeg = totalMinutos < 0; 
    const absMin = Math.abs(totalMinutos);
    const h = Math.floor(absMin / 60); 
    const m = absMin % 60;
    const f = `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
    
    if (!forcarSinal) return f;
    return isNeg ? `- ${f}` : `+ ${f}`;
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
              Portal <span className="text-slate-300 mx-2">/</span> <strong className="text-slate-800 uppercase tracking-wider text-[11px]">Banco de Horas</strong>
            </div>
          </div>
          
          {/* PERFIL NO CABEÇALHO (Igual ao Dashboard) */}
          <div className="flex items-center gap-3 cursor-pointer group" onClick={() => navigate('/perfil')}>
            <div className="text-right hidden sm:block">
              <div className="text-sm font-bold text-slate-800 group-hover:text-brand transition-colors">{userName}</div>
              <div className="text-[10px] text-slate-500 font-bold uppercase tracking-tight">Ver Perfil</div>
            </div>
            <div className="w-9 h-9 rounded-full bg-brand text-white flex items-center justify-center font-bold text-sm shadow-sm">
              {userName[0].toUpperCase()}
            </div>
          </div>
        </header>

        <motion.main variants={containerAnim} initial="hidden" animate="show" className="p-6 lg:p-8 max-w-[1200px] mx-auto w-full flex flex-col gap-6 pb-20">
          
          <div className="mb-2">
            <h1 className="text-2xl lg:text-3xl font-extrabold text-slate-800 tracking-tight">Extrato do Banco de Horas</h1>
            <p className="text-slate-500 mt-1 text-sm font-medium">Acompanhe seu saldo e as horas acumuladas.</p>
          </div>

          {loading ? (
             <div className="text-center py-12 bg-white rounded-[24px] border border-slate-200/60 shadow-sm">
               <div className="w-8 h-8 border-4 border-brand border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
               <p className="text-slate-500 font-medium text-sm">Calculando banco de horas...</p>
             </div>
          ) : (
            <>
              {/* CARDS DE RESUMO */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-4">
                <motion.div variants={itemAnim} className="bg-white rounded-[24px] p-6 border border-slate-200/60 shadow-sm flex items-center gap-4">
                  <div className="w-14 h-14 rounded-2xl bg-emerald-50 text-emerald-500 flex items-center justify-center shrink-0">
                    <TrendingUp size={28} />
                  </div>
                  <div>
                    <h4 className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-1">Horas Positivas</h4>
                    <p className="text-2xl font-black text-emerald-600 tabular-nums">{formatarMinutos(resumoBanco.positivo)}</p>
                  </div>
                </motion.div>

                <motion.div variants={itemAnim} className="bg-white rounded-[24px] p-6 border border-slate-200/60 shadow-sm flex items-center gap-4">
                  <div className="w-14 h-14 rounded-2xl bg-red-50 text-red-500 flex items-center justify-center shrink-0">
                    <TrendingDown size={28} />
                  </div>
                  <div>
                    <h4 className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-1">Horas Negativas</h4>
                    <p className="text-2xl font-black text-red-600 tabular-nums">{formatarMinutos(-resumoBanco.negativo)}</p>
                  </div>
                </motion.div>

                <motion.div variants={itemAnim} className={`rounded-[24px] p-6 border shadow-sm flex items-center gap-4 transition-colors ${resumoBanco.saldoTotal >= 0 ? 'bg-gradient-to-br from-brand to-indigo-600 border-indigo-500' : 'bg-gradient-to-br from-red-500 to-rose-600 border-rose-500'}`}>
                  <div className="w-14 h-14 rounded-2xl bg-white/20 text-white flex items-center justify-center shrink-0 backdrop-blur-sm">
                    <Database size={28} />
                  </div>
                  <div>
                    <h4 className="text-[11px] font-bold text-white/80 uppercase tracking-widest mb-1">Saldo Atual</h4>
                    <p className="text-3xl font-black text-white tabular-nums">{formatarMinutos(resumoBanco.saldoTotal)}</p>
                  </div>
                </motion.div>
              </div>

              {/* LISTA DE DIAS CALCULADOS (Estilo Moderno) */}
              <motion.div variants={itemAnim} className="flex flex-col gap-4">
                <h3 className="text-sm font-bold uppercase tracking-wider text-slate-800 flex items-center gap-2 mb-2 mt-4">
                  <CalendarDays size={18} className="text-brand"/> Detalhamento Diário
                </h3>

                {diasCalculados.length === 0 ? (
                  <div className="text-center py-12 bg-white rounded-[24px] border border-slate-200/60 shadow-sm flex flex-col items-center">
                    <Clock className="text-slate-300 mb-3" size={40}/>
                    <p className="text-slate-500 font-medium text-sm">Nenhum dia fechado encontrado no banco.</p>
                  </div>
                ) : (
                  diasCalculados.map((dia, i) => (
                    <div key={i} className="bg-white rounded-[20px] p-5 shadow-sm border border-slate-200/60 hover:border-brand/30 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-slate-50 border border-slate-100 text-slate-400 flex items-center justify-center shrink-0">
                          <Clock size={18} />
                        </div>
                        <div>
                          <div className="font-bold text-slate-800 text-sm">{dia.data}</div>
                          <div className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Fechado</div>
                        </div>
                      </div>

                      <div className="flex gap-4 sm:gap-8 items-center bg-slate-50 px-4 py-2 rounded-xl border border-slate-100">
                        <div className="text-center hidden sm:block">
                          <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Previsto</div>
                          <div className="text-sm font-bold text-slate-600">08:00</div>
                        </div>
                        <div className="w-px h-6 bg-slate-200 hidden sm:block"></div>
                        <div className="text-center">
                          <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Trabalhado</div>
                          <div className="text-sm font-bold text-slate-700">{formatarMinutos(dia.minTrab, false)}</div>
                        </div>
                        <div className="w-px h-6 bg-slate-200"></div>
                        <div className="text-center min-w-[70px]">
                          <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Saldo Diário</div>
                          <div className={`text-sm font-bold ${dia.saldo > 0 ? 'text-emerald-600' : dia.saldo < 0 ? 'text-red-600' : 'text-slate-400'}`}>
                            {dia.saldo === 0 ? '00:00' : formatarMinutos(dia.saldo)}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </motion.div>
            </>
          )}
        </motion.main>
      </div>
    </div>
  );
}