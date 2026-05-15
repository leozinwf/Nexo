import React, { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../services/supabase';
import { Sidebar } from '../components/Sidebar';
import { motion, AnimatePresence } from 'framer-motion';
import { Menu, FileText, Printer, Camera, MessageSquare, Eye, X, CheckCircle } from 'lucide-react';
import toast from 'react-hot-toast';

export function Relatorios() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [menuAberto, setMenuAberto] = useState(false);
  const [diasCalculados, setDiasCalculados] = useState([]);
  const [resumo, setResumo] = useState({ horasTrabalhadas: 0, saldoMensal: 0 });

  const [userPerfil, setUserPerfil] = useState(null);
  const [empresaConfig, setEmpresaConfig] = useState({});
  const [assinaturaData, setAssinaturaData] = useState(null);

  // Modais e Câmera
  const [modalAssinatura, setModalAssinatura] = useState(false);
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const [stream, setStream] = useState(null);

  // Filtro
  const hoje = new Date();
  const [mesSelecionado, setMesSelecionado] = useState(`${hoje.getFullYear()}-${String(hoje.getMonth() + 1).padStart(2, '0')}`);

  useEffect(() => {
    carregarRelatorio();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mesSelecionado]);

  const carregarRelatorio = async () => {
    setLoading(true);

    try {
      const { data: { user: authUser } } = await supabase.auth.getUser();
      if (!authUser) {
        navigate('/');
        return;
      }
      setUser(authUser);

      // 1. Dados Fixos
      const resPerfil = await supabase.from('perfis').select('*').eq('id', authUser.id).single();
      setUserPerfil(resPerfil.data);

      const resEmpresa = await supabase.from('config_empresa').select('*').eq('id', 1).single();
      setEmpresaConfig(resEmpresa.data || {});

      const resAss = await supabase
        .from('assinaturas_folha')
        .select('*')
        .eq('usuario_id', authUser.id)
        .eq('mes_referencia', mesSelecionado)
        .maybeSingle();
      setAssinaturaData(resAss.data || null);

      // 2. Lógica de Cálculo de Pontos do Mês
      const [ano, mes] = mesSelecionado.split('-');
      const dataInicio = `${ano}-${mes}-01T00:00:00Z`;
      const ultimoDia = new Date(ano, mes, 0).getDate();
      const dataFim = `${ano}-${mes}-${ultimoDia}T23:59:59Z`;

      const { data: registros } = await supabase
        .from('registros_ponto')
        .select('*')
        .eq('usuario_id', authUser.id)
        .gte('horario', dataInicio)
        .lte('horario', dataFim)
        .order('horario', { ascending: true });

      const grupos = {};
      (registros || []).forEach(r => {
        const d = new Date(r.horario).toLocaleDateString('pt-BR');
        if (!grupos[d]) grupos[d] = [];
        grupos[d].push(r);
      });

      const diasProc = [];
      let totalMin = 0;
      let totalSaldo = 0;

      for (let i = 1; i <= ultimoDia; i++) {
        const dataLoop = new Date(ano, mes - 1, i);
        const dataStr = dataLoop.toLocaleDateString('pt-BR');
        const pontos = grupos[dataStr] || [];

        const ent = pontos.find(p => p.tipo === 'entrada');
        const pau = pontos.find(p => p.tipo === 'pausa');
        const ret = pontos.find(p => p.tipo === 'retorno');
        const sai = pontos.find(p => p.tipo === 'saida');

        const marcStr = [];
        if (ent) marcStr.push(`${formataHora(ent.horario)}(E)`);
        if (pau) marcStr.push(`${formataHora(pau.horario)}(S)`);
        if (ret) marcStr.push(`${formataHora(ret.horario)}(E)`);
        if (sai) marcStr.push(`${formataHora(sai.horario)}(S)`);

        let minT = 0;
        let saldo = 0;
        if (ent && sai) {
          let diff = new Date(sai.horario) - new Date(ent.horario);
          if (pau && ret) diff -= (new Date(ret.horario) - new Date(pau.horario));
          minT = Math.floor(diff / 60000);
          saldo = minT - 480;
          totalMin += minT;
          totalSaldo += saldo;
        }

        diasProc.push({
          data: dataStr,
          semana: dataLoop.toLocaleDateString('pt-BR', { weekday: 'short' }),
          marcacoes: marcStr.join(' '),
          previstas: '08:00',
          trabalhadas: minT > 0 ? formatarMinutos(minT).replace('+', '') : '-',
          abonos: '-',
          saldo: minT > 0 ? formatarMinutos(saldo) : '-'
        });
      }

      setDiasCalculados(diasProc);
      setResumo({ horasTrabalhadas: totalMin, saldoMensal: totalSaldo });
    } catch (error) {
      console.error(error);
      toast.error('Não foi possível carregar o relatório.');
    } finally {
      setLoading(false);
    }
  };

  const formataHora = (iso) => new Date(iso).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

  const formatarMinutos = (t) => {
    const isNeg = t < 0;
    const abs = Math.abs(t);
    const f = `${Math.floor(abs / 60).toString().padStart(2, '0')}:${(abs % 60).toString().padStart(2, '0')}`;
    return isNeg ? `- ${f}` : `+ ${f}`;
  };

  const iniciarCamera = async () => {
    setModalAssinatura(true);
    try {
      const s = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user' } });
      setStream(s);
      if (videoRef.current) videoRef.current.srcObject = s;
    } catch (e) {
      toast.error('Câmara indisponível.');
      fecharCamera();
    }
  };

  const capturarEAssinar = async () => {
    const canvas = canvasRef.current;
    if (!canvas || !videoRef.current) return;

    canvas.width = videoRef.current.videoWidth;
    canvas.height = videoRef.current.videoHeight;
    canvas.getContext('2d').drawImage(videoRef.current, 0, 0);
    const foto = canvas.toDataURL('image/jpeg');

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      toast.error('Utilizador não autenticado.');
      return;
    }

    const { error } = await supabase.from('assinaturas_folha').insert({
      usuario_id: userPerfil?.id || user.id,
      mes_referencia: mesSelecionado,
      foto_assinatura: foto,
      data_assinatura: new Date().toISOString()
    });

    if (error) return toast.error('Erro ao guardar assinatura.');
    toast.success('Documento assinado!');
    fecharCamera();
    carregarRelatorio();
  };

  const fecharCamera = () => {
    if (stream) stream.getTracks().forEach(t => t.stop());
    setStream(null);
    setModalAssinatura(false);
  };

  const userName = user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'Colaborador';

  return (
    <>
      <style>{`
        .print-header, .print-signatures { display: none; }

        @media print {
          @page { size: A4 portrait; margin: 8mm; }
          .no-print { display: none !important; }
          body { font-size: 9px !important; line-height: 1.1 !important; background: #fff !important; }
          .doohub-card { padding: 0 !important; border: none !important; box-shadow: none !important; }
          .print-section { border: 1px solid #000; padding: 4px; margin-bottom: 4px; }
          .print-table { font-size: 9px !important; border-collapse: collapse !important; width: 100%; }
          .print-table th, .print-table td { border: 1px solid #000 !important; padding: 2px 3px !important; }
          .print-table th { background: #eee !important; font-weight: bold; }
          .responsive-table, .responsive-table * { display: revert !important; }
          .print-signatures { margin-top: 15px; display: flex; justify-content: space-between; }
          img { max-height: 60px !important; }
        }
      `}</style>

      <div className="flex h-screen bg-[#f8fafc] overflow-hidden font-sans text-slate-800">
        <div className={`fixed inset-0 bg-slate-900/40 z-40 backdrop-blur-sm transition-opacity lg:hidden no-print ${menuAberto ? 'opacity-100' : 'opacity-0 pointer-events-none'}`} onClick={() => setMenuAberto(false)}></div>
        
        <Sidebar menuAberto={menuAberto} setMenuAberto={setMenuAberto} />
        
        <div className="flex-1 flex flex-col h-screen overflow-y-auto relative print:overflow-visible">
          <header className="sticky top-0 z-30 flex justify-between items-center px-6 py-4 bg-white/70 backdrop-blur-xl border-b border-slate-200/60 no-print">
            <div className="flex items-center gap-4">
              <button className="lg:hidden text-slate-500 hover:text-brand transition" onClick={() => setMenuAberto(true)}>
                <Menu size={24} />
              </button>
              <div className="text-sm font-medium text-slate-500 hidden sm:block">
                Portal <span className="text-slate-300 mx-2">/</span> <strong className="text-slate-800 uppercase tracking-wider text-[11px]">Relatórios e Folha</strong>
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

          <main className="p-6 lg:p-8 max-w-[1200px] mx-auto w-full flex flex-col gap-6 pb-20 print:p-0 print:m-0">
            
            <div className="bg-white rounded-[24px] p-6 shadow-sm border border-slate-200/60 flex flex-wrap gap-4 items-end no-print">
              <div className="flex flex-col gap-2 flex-1 min-w-[200px]">
                <label className="text-xs font-bold text-slate-500 uppercase">Mês de Apuração</label>
                <input 
                  type="month" 
                  className="bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-brand outline-none text-slate-700 w-full" 
                  value={mesSelecionado} 
                  onChange={e => setMesSelecionado(e.target.value)} 
                />
              </div>
              
              <div className="flex gap-2 flex-wrap">
                <button className="bg-white border border-slate-200 text-slate-600 font-bold text-sm px-4 py-2.5 rounded-xl hover:bg-slate-50 transition-colors flex items-center justify-center gap-2 h-[42px]" onClick={() => window.print()}>
                  <Eye size={18} /> Visualizar
                </button>
                <button 
                  className={`font-bold text-sm px-4 py-2.5 rounded-xl transition-colors flex items-center justify-center gap-2 h-[42px] ${assinaturaData ? 'bg-emerald-100 text-emerald-600 cursor-default' : 'bg-brand text-white hover:bg-brand/90'}`} 
                  onClick={assinaturaData ? null : iniciarCamera} 
                  disabled={!!assinaturaData}
                >
                  {assinaturaData ? <CheckCircle size={18} /> : <Camera size={18} />} {assinaturaData ? 'Assinado' : 'Assinar Folha'}
                </button>
                <button className="bg-white border border-slate-200 text-slate-600 font-bold text-sm px-4 py-2.5 rounded-xl hover:bg-slate-50 transition-colors flex items-center justify-center gap-2 h-[42px]" onClick={() => toast.success("Contestação enviada ao RH!")}>
                  <MessageSquare size={18} /> Contestar
                </button>
              </div>
            </div>

            {/* DOCUMENTO PARA IMPRESSÃO (Folha de Ponto) */}
            <div className="bg-white rounded-[24px] shadow-sm border border-slate-200/60 overflow-hidden doohub-card" style={{ padding: '2rem' }}>
              <div className="print-header">
                <div style={{ textAlign: 'center', marginBottom: '6px' }}>
                  <h2 style={{ margin: 0, fontSize: '13px' }}>FOLHA DE PONTO</h2>
                  <div style={{ fontSize: '9px' }}>
                    Apuração: {mesSelecionado} | Emitido em {new Date().toLocaleString('pt-BR')}
                  </div>
                </div>

                <div className="print-section">
                  <strong>DADOS DO EMPREGADOR</strong><br />
                  {empresaConfig.razao_social} | CNPJ: {empresaConfig.cnpj}<br />
                  {empresaConfig.endereco}
                </div>

                <div className="print-section">
                  <strong>DADOS DO TRABALHADOR</strong><br />
                  Nome: {userPerfil?.nome_completo || '-'} | Cargo: {userPerfil?.cargo}<br />
                  CPF: {userPerfil?.cpf || '-'} | Admissão: {userPerfil?.admissao || '-'}
                </div>

                <div className="print-section">
                  <strong>EXPEDIENTE</strong><br />
                  {userPerfil?.expediente}
                </div>
              </div>

              {loading ? (
                <div className="text-center py-12">
                  <div className="w-8 h-8 border-4 border-brand border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                  <p className="text-slate-500 font-medium text-sm">Processando registos...</p>
                </div>
              ) : (
                <>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse print-table">
                      <thead>
                        <tr className="bg-slate-50 border-b border-slate-100">
                          <th className="p-3 text-xs font-bold text-slate-500 uppercase tracking-widest">Dia</th>
                          <th className="p-3 text-xs font-bold text-slate-500 uppercase tracking-widest">Marcações</th>
                          <th className="p-3 text-xs font-bold text-slate-500 uppercase tracking-widest text-center">Trabalhadas</th>
                          <th className="p-3 text-xs font-bold text-slate-500 uppercase tracking-widest text-right">Saldo</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 bg-white">
                        {diasCalculados.map((d, i) => (
                          <tr key={i} className="hover:bg-slate-50/50">
                            <td className="p-3 font-bold text-sm text-slate-700" data-label="Dia">{d.data} <span className="text-[10px] text-slate-400 font-normal ml-1">({d.semana})</span></td>
                            <td className="p-3 text-sm font-medium text-slate-600" data-label="Marcações" style={{ fontFamily: 'monospace' }}>{d.marcacoes || '-'}</td>
                            <td className="p-3 text-center text-sm font-bold text-slate-700" data-label="Horas">{d.trabalhadas}</td>
                            <td className="p-3 text-right text-sm font-bold" data-label="Saldo" style={{ color: d.saldo.includes('-') ? '#ef4444' : (d.saldo !== '-' ? '#10b981' : 'inherit') }}>{d.saldo}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  <div className="mt-8 flex justify-between p-5 bg-slate-50 border border-slate-100 rounded-xl">
                    <div className="text-sm">
                      <span className="text-slate-500 font-bold uppercase tracking-wider block text-[10px] mb-1">Total Trabalhado</span>
                      <strong className="text-xl text-slate-800">{formatarMinutos(resumo.horasTrabalhadas).replace('+', '')}</strong>
                    </div>
                    <div className="text-sm text-right">
                      <span className="text-slate-500 font-bold uppercase tracking-wider block text-[10px] mb-1">Saldo Mensal</span>
                      <strong className="text-xl" style={{ color: resumo.saldoMensal >= 0 ? '#10b981' : '#ef4444' }}>
                        {formatarMinutos(resumo.saldoMensal)}
                      </strong>
                    </div>
                  </div>

                  <div className="print-signatures">
                    <div style={{ width: '45%', textAlign: 'center' }}>
                      {assinaturaData && (
                        <img src={assinaturaData.foto_assinatura} alt="Assinatura Biométrica" style={{ margin: '0 auto' }} />
                      )}
                      <div style={{ borderTop: '1px solid #000' }}>
                        Trabalhador
                      </div>
                    </div>

                    <div style={{ width: '45%', textAlign: 'center' }}>
                      <div style={{ height: '60px' }}></div>
                      <div style={{ borderTop: '1px solid #000' }}>
                        Empregador
                      </div>
                    </div>
                  </div>
                </>
              )}
            </div>
          </main>
        </div>

        {/* MODAL CÂMARA (NOVO ESTILO TAILWIND) */}
        <AnimatePresence>
          {modalAssinatura && (
            <div className="fixed inset-0 bg-slate-900/60 z-[60] flex items-center justify-center p-4 backdrop-blur-sm no-print">
              <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="bg-white rounded-3xl shadow-2xl max-w-sm w-full overflow-hidden text-center">
                <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                  <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2"><Camera className="text-brand" size={20}/> Assinatura Biométrica</h3>
                  <button onClick={fecharCamera} className="text-slate-400 hover:text-slate-600 p-1.5 rounded-full hover:bg-slate-200 transition-colors"><X size={20} /></button>
                </div>
                <div className="p-6">
                  <video ref={videoRef} autoPlay playsInline className="w-full rounded-2xl bg-black shadow-inner" style={{ transform: 'scaleX(-1)' }} />
                  <canvas ref={canvasRef} className="hidden" />
                  <p className="text-xs mt-4 text-slate-500 font-medium">Centralize o seu rosto para assinar a folha de ponto.</p>
                </div>
                <div className="p-6 border-t border-slate-100 bg-slate-50/50">
                  <button onClick={capturarEAssinar} className="w-full px-4 py-3 rounded-xl font-bold text-sm bg-brand text-white hover:opacity-90 transition-opacity shadow-sm">
                    Tirar Foto e Assinar
                  </button>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>
      </div>
    </>
  );
}