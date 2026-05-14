import { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../services/supabase';
import { Sidebar } from '../components/Sidebar';
import { Menu, FileText, Printer, Camera, MessageSquare, Eye, X, CheckCircle } from 'lucide-react';
import toast from 'react-hot-toast';

export function Relatorios() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [menuAberto, setMenuAberto] = useState(false);
  const [diasCalculados, setDiasCalculados] = useState([]);
  const [resumo, setResumo] = useState({ horasTrabalhadas: 0, saldoMensal: 0 });

  const [userPerfil, setUserPerfil] = useState(null);
  const [empresaConfig, setEmpresaConfig] = useState({});
  const [assinaturaData, setAssinaturaData] = useState(null);

  // Modais e Câmera
  const [modalAssinatura, setModalAssinatura] = useState(false);
  const [modalChat, setModalChat] = useState(false);
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
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        navigate('/');
        return;
      }

      // 1. Dados Fixos
      const resPerfil = await supabase.from('perfis').select('*').eq('id', user.id).single();
      setUserPerfil(resPerfil.data);

      const resEmpresa = await supabase.from('config_empresa').select('*').eq('id', 1).single();
      setEmpresaConfig(resEmpresa.data || {});

      const resAss = await supabase
        .from('assinaturas_folha')
        .select('*')
        .eq('usuario_id', user.id)
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
        .eq('usuario_id', user.id)
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
      toast.error('Câmera indisponível.');
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
      toast.error('Usuário não autenticado.');
      return;
    }

    const { error } = await supabase.from('assinaturas_folha').insert({
      usuario_id: userPerfil?.id || user.id,
      mes_referencia: mesSelecionado,
      foto_assinatura: foto,
      data_assinatura: new Date().toISOString()
    });

    if (error) return toast.error('Erro ao salvar assinatura.');
    toast.success('Documento assinado!');
    fecharCamera();
    carregarRelatorio();
  };

  const fecharCamera = () => {
    if (stream) stream.getTracks().forEach(t => t.stop());
    setStream(null);
    setModalAssinatura(false);
  };

  return (
    <>
      <style>{`
        .print-header, .print-signatures { display: none; }

        @media print {
          @page { size: A4 portrait; margin: 8mm; }

          body {
            font-size: 9px !important;
            line-height: 1.1 !important;
          }

          .doohub-card {
            padding: 0 !important;
          }

          .print-section {
            border: 1px solid #000;
            padding: 4px;
            margin-bottom: 4px;
          }

          .print-table {
            font-size: 9px !important;
            border-collapse: collapse !important;
          }

          .print-table th,
          .print-table td {
            border: 1px solid #000 !important;
            padding: 2px 3px !important;
          }

          .print-table th {
            background: #eee !important;
            font-weight: bold;
          }

          /* remove modo mobile */
          .responsive-table,
          .responsive-table * {
            display: revert !important;
          }

          .print-signatures {
            margin-top: 15px;
            display: flex;
            justify-content: space-between;
          }

          img {
            max-height: 60px !important;
          }
        }
      `}</style>

      <div className="layout">
        <div className={`overlay ${menuAberto ? 'open' : ''}`} onClick={() => setMenuAberto(false)}></div>
        <Sidebar menuAberto={menuAberto} setMenuAberto={setMenuAberto} />
        <div className="main-container">
          <header className="top-header no-print">
            <button className="mobile-header-btn" onClick={() => setMenuAberto(true)}><Menu size={24} /></button>
            <div style={{ color: '#64748b' }}>Portal / <strong>Relatórios e Folha</strong></div>
          </header>

          <main className="content">
            <div className="filter-bar no-print" style={{ display: 'flex', gap: '1rem', alignItems: 'flex-end', flexWrap: 'wrap' }}>
              <div className="input-group"><label>Mês</label><input type="month" className="form-control" value={mesSelecionado} onChange={e => setMesSelecionado(e.target.value)} /></div>
              <button className="action-btn" onClick={() => window.print()}><Eye size={18} /> Visualizar</button>
              <button className="action-btn" onClick={assinaturaData ? null : iniciarCamera} disabled={!!assinaturaData} style={{ color: assinaturaData ? '#10b981' : 'inherit' }}>
                {assinaturaData ? <CheckCircle size={18} /> : <Camera size={18} />} {assinaturaData ? 'Assinado' : 'Assinar'}
              </button>
              <button className="action-btn" onClick={() => setModalChat(true)}><MessageSquare size={18} /> Contestar</button>
            </div>

            <div className="doohub-card" style={{ padding: '2rem' }}>
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

              {loading ? <p>Processando registros...</p> : (
                <>
                  <table className="doohub-table responsive-table print-table">
                    <thead><tr><th>Dia</th><th>Marcações</th><th>Trabalhadas</th><th>Saldo</th></tr></thead>
                    <tbody>
                      {diasCalculados.map((d, i) => (
                        <tr key={i}><td data-label="Dia">{d.data} ({d.semana})</td><td data-label="Marcações" style={{ fontFamily: 'monospace' }}>{d.marcacoes || '-'}</td><td data-label="Horas">{d.trabalhadas}</td><td data-label="Saldo">{d.saldo}</td></tr>
                      ))}
                    </tbody>
                  </table>

                  <div style={{ marginTop: '20px', display: 'flex', justifyContent: 'space-between', padding: '15px', background: '#f8fafc', borderRadius: '8px' }}>
                    <div><strong>Total Trabalhado:</strong> {formatarMinutos(resumo.horasTrabalhadas).replace('+', '')}</div>
                    <div><strong>Saldo Mensal:</strong> <span style={{ color: resumo.saldoMensal >= 0 ? '#10b981' : '#ef4444' }}>{formatarMinutos(resumo.saldoMensal)}</span></div>
                  </div>

                  <div className="print-signatures">
                    <div style={{ width: '45%', textAlign: 'center' }}>
                      {assinaturaData && (
                        <img src={assinaturaData.foto_assinatura} />
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

        {modalAssinatura && (
          <div className="modal-overlay">
            <div className="modal-box" style={{ textAlign: 'center' }}>
              <div className="modal-header-box"><h3>Assinatura Biométrica</h3><button onClick={fecharCamera}><X /></button></div>
              <div className="modal-body">
                <video ref={videoRef} autoPlay playsInline style={{ width: '100%', borderRadius: '12px', background: '#000', transform: 'scaleX(-1)' }} />
                <canvas ref={canvasRef} style={{ display: 'none' }} />
                <p style={{ fontSize: '13px', marginTop: '15px', color: '#64748b' }}>Centralize seu rosto para assinar a folha de ponto.</p>
              </div>
              <div className="modal-footer"><button className="form-control" onClick={capturarEAssinar} style={{ background: '#0067ff', color: '#fff', fontWeight: 'bold' }}>Tirar Foto e Assinar</button></div>
            </div>
          </div>
        )}
      </div>
    </>
  );
}