import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../services/supabase';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Menu, Clock, Bell, MessageSquare, Target, Award, 
  CheckCircle2, TrendingUp, Star, Heart, Coffee, User, Settings2, Lock, Save, 
  LayoutTemplate, Globe, LockKeyhole, X, Plus, LayoutGrid, Megaphone, Link, AlertTriangle, GripHorizontal, FileText
} from 'lucide-react';
import toast from 'react-hot-toast';
import { Sidebar } from '../components/Sidebar';
import { useModule } from '../hooks/useModule';
import { useAppContext } from '../contexts/AppContext';

const containerAnim = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.08 } } };
const itemAnim = { hidden: { opacity: 0, y: 15 }, show: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 120 } } };

export function Dashboard() {
  const { empresaInfo } = useAppContext();
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [perfilUsuario, setPerfilUsuario] = useState(null);
  const [pontosHoje, setPontosHoje] = useState([]);
  const [loadingPonto, setLoadingPonto] = useState(false);
  const [horaAtual, setHoraAtual] = useState(new Date());
  const [menuAberto, setMenuAberto] = useState(false);
  
  const { isAtivo: pontoAtivo } = useModule('ponto');
  const { isAtivo: humorAtivo } = useModule('humor');
  const { isAtivo: muralAtivo } = useModule('mural');
  const { isAtivo: gamificacaoAtivo } = useModule('gamificacao');

  const configPadrao = { 
    saudacao: true, metricas: true, mural: true, perfil_campeao: true, 
    ranking: true, resumo_mural: true, atalhos: true, info_mural: true,
    ordem: ['ponto', 'humor', 'atalhos', 'resumo_mural', 'info_mural', 'metricas', 'mural', 'ranking', 'perfil_campeao']
  };
  
  const [config, setConfig] = useState(configPadrao);
  const [modoEdicao, setModoEdicao] = useState(false);
  const [modalWidgets, setModalWidgets] = useState(false);
  
  // ESTADO DO DRAG & DROP (Agora mais simples e sem bugs)
  const [dragId, setDragId] = useState(null);

  const [modalTemplates, setModalTemplates] = useState(false);
  const [templates, setTemplates] = useState([]);
  const [nomeNovoTemplate, setNomeNovoTemplate] = useState(`Meu Layout - ${new Date().toLocaleDateString('pt-BR')}`);
  const [tipoCompartilhamento, setTipoCompartilhamento] = useState('privado'); 
  const [usuariosEspecificos, setUsuariosEspecificos] = useState('');
  const [abaTemplates, setAbaTemplates] = useState('meus');
  
  const [modalConfirmacao, setModalConfirmacao] = useState({ aberto: false, titulo: '', mensagem: '', acao: null, tipo: 'aviso' });
  
  const [fraseDoDia, setFraseDoDia] = useState('Focados em transformar o futuro.');
  const [humorSelecionado, setHumorSelecionado] = useState(null);
  const [humorTexto, setHumorTexto] = useState('');
  const [loadingHumor, setLoadingHumor] = useState(false);

  useEffect(() => {
    const timer = setInterval(() => setHoraAtual(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (empresaInfo?.proposito) {
      try {
        const parsed = JSON.parse(empresaInfo.proposito);
        if (Array.isArray(parsed) && parsed.length > 0) setFraseDoDia(parsed[Math.floor(Math.random() * parsed.length)]);
        else setFraseDoDia(empresaInfo.proposito);
      } catch (e) { setFraseDoDia(empresaInfo.proposito); }
    }
  }, [empresaInfo]);

  useEffect(() => {
    const carregarDados = async () => {
      const { data: { user: authUser } } = await supabase.auth.getUser();
      if (!authUser) return navigate('/');
      setUser(authUser);

      const { data: perfil } = await supabase.from('perfis').select('*').eq('id', authUser.id).single();
      if (perfil) {
        setPerfilUsuario(perfil);
        if (perfil.dashboard_config) {
          const configSalva = perfil.dashboard_config;
          const ordemAtualizada = [...new Set([...(configSalva.ordem || []), ...configPadrao.ordem])];
          setConfig({ ...configPadrao, ...configSalva, ordem: ordemAtualizada });
        }
        carregarTemplates(perfil.empresa_id);
      }
      buscarPontosHoje(authUser.id);
    };
    carregarDados();
  }, [navigate]);

  const carregarTemplates = async (empresaId) => {
    const { data } = await supabase.from('dashboard_templates').select('*, perfis(nome_completo)').eq('empresa_id', empresaId).order('criado_em', { ascending: false });
    if (data) setTemplates(data);
  };

  const buscarPontosHoje = async (userId) => {
    const hoje = new Date(); hoje.setHours(0, 0, 0, 0);
    const amanha = new Date(hoje); amanha.setDate(amanha.getDate() + 1);
    const { data } = await supabase.from('registros_ponto').select('tipo, horario').eq('usuario_id', userId).gte('horario', hoje.toISOString()).lt('horario', amanha.toISOString()).order('horario', { ascending: true });
    if (data) setPontosHoje(data);
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
    setLoadingPonto(true);
    const { error } = await supabase.from('registros_ponto').insert([{ usuario_id: user.id, empresa_id: perfilUsuario.empresa_id, tipo: tipoSelecionado, dispositivo: 'web' }]);
    if (error) toast.error('Erro ao registrar: ' + error.message);
    else { toast.success('Ponto registrado com sucesso!'); buscarPontosHoje(user.id); }
    setLoadingPonto(false);
  };

  const getOpcoesPonto = () => {
    // REGRA 4 BATIDAS: Se já tem 4 pontos, não retorna botões
    if (pontosHoje.length >= 4) return [];

    const ultimo = pontosHoje.length > 0 ? pontosHoje[pontosHoje.length - 1].tipo : null;
    const opcoes = [];
    if (!ultimo || ultimo === 'saida') opcoes.push({ id: 1, tipo: 'entrada', label: 'Entrada', color: 'bg-green-500 hover:bg-green-600', icon: <Clock size={16}/> });
    else if (ultimo === 'entrada' || ultimo === 'retorno') {
      opcoes.push({ id: 2, tipo: 'pausa', label: 'Almoço', color: 'bg-amber-500 hover:bg-amber-600', icon: <Coffee size={16}/> });
      opcoes.push({ id: 3, tipo: 'saida', label: 'Sair', color: 'bg-red-500 hover:bg-red-600', icon: <CheckCircle2 size={16}/> });
    } else if (ultimo === 'pausa') {
      opcoes.push({ id: 4, tipo: 'retorno', label: 'Retorno', color: 'bg-brand hover:opacity-90', icon: <Clock size={16}/> });
    }
    return opcoes;
  };

  const handleRegistrarHumor = async () => {
    if (humorSelecionado === null) return;
    setLoadingHumor(true);
    
    // Inserção no banco de dados (tabela: registros_humor)
    const { error } = await supabase.from('registros_humor').insert([{
      usuario_id: user.id,
      empresa_id: perfilUsuario.empresa_id,
      nivel_humor: humorSelecionado,
      comentario: humorTexto
    }]);

    if (error) {
      toast.error('Erro ao registrar humor. Tente novamente.');
      console.error(error);
    } else {
      toast.success('Humor registrado com sucesso! Obrigado.');
      setHumorSelecionado(null);
      setHumorTexto('');
    }
    setLoadingHumor(false);
  };

  const toggleWidget = async (widget, necessitaConfirmacao = false) => {
    if (necessitaConfirmacao) {
      pedirConfirmacao("Remover Widget", "Você deseja remover este widget do seu painel?", () => aplicarToggle(widget), 'aviso');
      return;
    }
    aplicarToggle(widget);
  };

  const aplicarToggle = async (widget) => {
    const novoConfig = { ...config, [widget]: !config[widget] };
    setConfig(novoConfig);
    await supabase.from('perfis').update({ dashboard_config: novoConfig }).eq('id', user.id);
  };

  // -------------------------------------------------------------
  // LÓGICA DE DRAG AND DROP REFINADA (S/ BUG DE TREMEDEIRA)
  // -------------------------------------------------------------
  const handleDragStart = (e, id) => {
    if (!modoEdicao) return;
    e.dataTransfer.setData("widgetId", id);
    e.dataTransfer.effectAllowed = "move";
    setTimeout(() => setDragId(id), 0); // Permite gerar a imagem fantasma antes de mudar o estado
  };

  const handleDragOver = (e) => {
    e.preventDefault(); // Obrigatório para o OnDrop funcionar
    e.dataTransfer.dropEffect = "move";
    // Adiciona efeito visual no widget alvo
    if (modoEdicao && e.currentTarget) {
      e.currentTarget.classList.add('drag-target-hover');
    }
  };

  const handleDragLeave = (e) => {
    if (e.currentTarget) {
      e.currentTarget.classList.remove('drag-target-hover');
    }
  };

  const handleDrop = async (e, targetId) => {
    e.preventDefault();
    if (e.currentTarget) e.currentTarget.classList.remove('drag-target-hover');
    
    if (!modoEdicao) return;
    const draggedId = e.dataTransfer.getData("widgetId");
    
    if (!draggedId || draggedId === targetId) {
      setDragId(null);
      return;
    }

    const novaOrdem = [...config.ordem];
    const draggedIndex = novaOrdem.indexOf(draggedId);
    const targetIndex = novaOrdem.indexOf(targetId);
    
    novaOrdem.splice(draggedIndex, 1);
    novaOrdem.splice(targetIndex, 0, draggedId); // Insere na nova posição
    
    setConfig({ ...config, ordem: novaOrdem });
    setDragId(null);

    // Salva a nova ordem no banco
    await supabase.from('perfis').update({ dashboard_config: { ...config, ordem: novaOrdem } }).eq('id', user.id);
  };

  const handleDragEnd = () => {
    setDragId(null);
  };

  const aplicarTemplate = async (templateConfig) => {
    const configAtualizada = { ...configPadrao, ...templateConfig };
    setConfig(configAtualizada);
    await supabase.from('perfis').update({ dashboard_config: configAtualizada }).eq('id', user.id);
    toast.success("Template aplicado com sucesso!");
    setModalTemplates(false);
  };

  const salvarNovoTemplate = async (e) => {
    e.preventDefault();
    if (!nomeNovoTemplate.trim()) return toast.error("Digite um nome para o template.");
    
    const isPublico = tipoCompartilhamento === 'publico';
    const { error } = await supabase.from('dashboard_templates').insert([{ 
      empresa_id: perfilUsuario.empresa_id, 
      usuario_id: user.id, 
      nome: nomeNovoTemplate, 
      is_publico: isPublico, 
      config: config 
    }]);
    
    if (error) return toast.error("Erro ao salvar template.");
    toast.success("Template salvo com sucesso!");
    setNomeNovoTemplate(`Meu Layout - ${new Date().toLocaleDateString('pt-BR')}`);
    setTipoCompartilhamento('privado');
    carregarTemplates(perfilUsuario.empresa_id);
  };

  const userName = user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'Colaborador';
  const emojis = ['😭', '😔', '😐', '🙂', '🤩'];
  const mockFeed = [{ id: 1, user: 'Beatriz Pitondo', action: 'enviou uma celebração para Vendas', time: '5 min atrás', icon: '🎉' }];
  const mockRanking = [{ pos: 1, name: 'Você', coins: 3250, avatar: userName[0].toUpperCase(), isMe: true }];

  const getEditClasses = () => modoEdicao ? 'edit-mode-widget cursor-grab active:cursor-grabbing' : '';

  const renderWidget = (id) => {
    const classNameGrid = {
      metricas: 'col-span-1 md:col-span-2 xl:col-span-3',
      ponto: 'col-span-1',
      humor: 'col-span-1',
      atalhos: 'col-span-1',
      resumo_mural: 'col-span-1',
      info_mural: 'col-span-1 md:col-span-2 xl:col-span-1',
      mural: 'col-span-1 md:col-span-2 xl:col-span-1',
      ranking: 'col-span-1',
      perfil_campeao: 'col-span-1'
    };

    let content = null;
    let hideX = false;
    let isWidgetGradient = false;

    switch (id) {
      case 'ponto':
        if (!pontoAtivo) return null;
        hideX = true;
        const opcoesPonto = getOpcoesPonto();
        content = (
          <>
            {modoEdicao && <div className="absolute top-4 right-4 text-slate-300 flex items-center gap-1 text-[10px] uppercase font-bold"><Lock size={12}/> Fixo</div>}
            <div className="flex justify-between items-center mb-6 mt-2">
              <div className="flex items-center gap-2"><Clock className="text-brand" size={18}/><h3 className="text-sm font-bold uppercase tracking-wider text-slate-600">Registo de Ponto</h3></div>
              <div className="text-3xl font-black text-slate-800 tabular-nums">{horaAtual.toLocaleTimeString('pt-BR')}</div>
            </div>
            
            {opcoesPonto.length === 0 ? (
              <div className="bg-emerald-50 text-emerald-600 text-sm font-bold py-4 px-4 rounded-xl text-center flex flex-col items-center justify-center gap-2 mb-6 border border-emerald-100/50">
                <CheckCircle2 size={24} className="text-emerald-500"/>
                Jornada Concluída por hoje. Bom descanso!
              </div>
            ) : (
              <div className="flex gap-3 mb-6">
                {opcoesPonto.map(acao => (
                  <button key={`btn-${acao.id}`} onClick={() => handleAcaoPonto(acao.tipo)} disabled={loadingPonto || modoEdicao} className={`${acao.color} text-white text-xs font-bold py-3 px-4 rounded-xl flex items-center justify-center gap-2 transition-all shadow-sm hover:-translate-y-0.5 flex-1 ${modoEdicao && 'pointer-events-none'}`}>
                    {acao.icon} {acao.label}
                  </button>
                ))}
              </div>
            )}

            <div className="mt-auto bg-slate-50 rounded-xl p-4 border border-slate-100 relative">
              <div className="absolute left-4 right-4 top-1/2 -translate-y-1/2 h-[2px] bg-slate-200 z-0"></div>
              {pontosHoje.map((p, i) => (
                <div key={`ponto-hist-${i}`} className="relative z-10 flex flex-col items-center bg-slate-50 px-1 gap-1">
                  <div className={`w-3 h-3 rounded-full ring-4 ring-slate-50 ${p.tipo.includes('entrada') || p.tipo === 'retorno' ? 'bg-green-500' : p.tipo === 'saida' ? 'bg-red-500' : 'bg-amber-500'}`}></div>
                  <span className="text-[10px] font-bold text-slate-600">{new Date(p.horario).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</span>
                </div>
              ))}
            </div>
          </>
        );
        break;

      case 'humor':
        if (!humorAtivo) return null;
        hideX = true;
        content = (
          <>
            {modoEdicao && <div className="absolute top-4 right-4 text-slate-300 flex items-center gap-1 text-[10px] uppercase font-bold"><Lock size={12}/> Fixo</div>}
            <div className="flex justify-between items-center mb-4 mt-2">
              <h3 className="text-sm font-bold uppercase tracking-wider text-slate-600">Como está o seu clima?</h3>
              {gamificacaoAtivo && <span className="bg-amber-50 text-amber-600 text-[10px] font-bold px-3 py-1 rounded-full border border-amber-100">+50 Coins</span>}
            </div>
            <div className={`flex justify-between items-center my-4 px-2 ${modoEdicao && 'pointer-events-none'}`}>
              {emojis.map((emoji, idx) => (
                <button key={`emoji-${idx}`} onClick={() => setHumorSelecionado(idx)} className={`text-3xl sm:text-4xl transition-all duration-300 hover:scale-125 ${humorSelecionado === idx ? 'grayscale-0 scale-125' : 'grayscale opacity-40'}`}>{emoji}</button>
              ))}
            </div>
            <AnimatePresence>
              {humorSelecionado !== null && (
                <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="mt-4 overflow-hidden">
                  <textarea className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-sm focus:ring-2 focus:ring-brand outline-none transition-all" rows="2" placeholder="Partilhe o motivo (opcional)..." value={humorTexto} onChange={e => setHumorTexto(e.target.value)} />
                  <button onClick={handleRegistrarHumor} disabled={loadingHumor} className="w-full mt-3 bg-brand text-white text-xs font-bold py-3 rounded-xl shadow-sm hover:opacity-90">
                    {loadingHumor ? 'Registrando...' : 'Registar Sentimento'}
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </>
        );
        break;

      case 'metricas':
        if (!config.metricas) return null;
        content = (
          <div className={`grid grid-cols-2 md:grid-cols-4 gap-4 mt-2 ${modoEdicao ? 'pointer-events-none' : ''}`}>
            {[
              { id: 'm1', title: 'Celebrações', value: '12', icon: <Heart size={18} className="text-rose-500"/>, bg: 'bg-rose-50' },
              { id: 'm2', title: 'Feedbacks', value: '4', icon: <MessageSquare size={18} className="text-brand"/>, bg: 'bg-blue-50' },
              { id: 'm3', title: 'Aniversários', value: '2', icon: <Star size={18} className="text-amber-500"/>, bg: 'bg-amber-50' },
              { id: 'm4', title: 'Tasks Concluídas', value: '28', icon: <CheckCircle2 size={18} className="text-emerald-500"/>, bg: 'bg-emerald-50' },
            ].map(m => (
              <div key={m.id} className="bg-slate-50/50 rounded-2xl p-5 border border-slate-100 flex flex-col sm:flex-row items-center sm:items-start gap-4 text-center sm:text-left hover:bg-white transition-colors">
                <div className={`w-11 h-11 rounded-xl ${m.bg} flex items-center justify-center shrink-0`}>{m.icon}</div>
                <div><div className="text-xl font-black text-slate-800">{m.value}</div><div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{m.title}</div></div>
              </div>
            ))}
          </div>
        );
        break;

      case 'atalhos':
        if (!config.atalhos) return null;
        content = (
          <>
            <h3 className="text-sm font-bold uppercase tracking-wider text-slate-600 flex items-center gap-2 mb-4 mt-2"><Link size={16} className="text-blue-500"/> Atalhos Rápidos</h3>
            <div className={`grid grid-cols-2 gap-3 mt-auto ${modoEdicao ? 'pointer-events-none' : ''}`}>
              <button className="bg-slate-50 hover:bg-brand/5 border border-slate-100 hover:border-brand/30 text-slate-600 hover:text-brand text-xs font-bold py-3 rounded-xl transition-colors">Holerite</button>
              <button className="bg-slate-50 hover:bg-brand/5 border border-slate-100 hover:border-brand/30 text-slate-600 hover:text-brand text-xs font-bold py-3 rounded-xl transition-colors">Políticas RH</button>
              <button className="bg-slate-50 hover:bg-brand/5 border border-slate-100 hover:border-brand/30 text-slate-600 hover:text-brand text-xs font-bold py-3 rounded-xl transition-colors">Suporte TI</button>
              <button className="bg-slate-50 hover:bg-brand/5 border border-slate-100 hover:border-brand/30 text-slate-600 hover:text-brand text-xs font-bold py-3 rounded-xl transition-colors">Benefícios</button>
            </div>
          </>
        );
        break;

      case 'resumo_mural':
        if (!config.resumo_mural || !muralAtivo) return null;
        isWidgetGradient = true;
        content = (
          <>
            <div className="absolute top-0 right-0 p-6 opacity-20"><Megaphone size={64} /></div>
            <h3 className="text-sm font-bold uppercase tracking-wider flex items-center gap-2 mb-4 opacity-90 mt-2"><Megaphone size={16}/> Aviso Recente</h3>
            <div className="z-10 mt-auto">
              <span className="bg-white/20 text-[10px] font-bold px-2 py-1 rounded mb-2 inline-block">Comunicado Oficial</span>
              <p className="text-sm font-bold leading-relaxed">Novo plano de saúde estará disponível a partir da próxima semana. Fiquem atentos.</p>
            </div>
          </>
        );
        break;

      case 'info_mural':
        if (!config.info_mural) return null;
        content = (
          <>
            <h3 className="text-sm font-bold uppercase tracking-wider text-slate-600 flex items-center gap-2 mb-4 mt-2"><FileText size={16} className="text-brand"/> Quadro de Informações</h3>
            <div className={`flex flex-col gap-3 overflow-y-auto custom-scrollbar pr-1 ${modoEdicao ? 'pointer-events-none' : ''}`}>
              <div className="flex gap-3 items-center p-3 rounded-xl bg-blue-50 border border-blue-100/50">
                <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center shrink-0"><FileText size={14}/></div>
                <div className="flex-1"><h4 className="text-xs font-bold text-slate-800">Apresentação Institucional</h4><p className="text-[10px] text-slate-500">PDF • 2.4 MB</p></div>
                <button className="text-brand text-[10px] font-bold hover:underline">Baixar</button>
              </div>
              <div className="flex gap-3 items-center p-3 rounded-xl bg-slate-50 border border-slate-100">
                <div className="w-8 h-8 rounded-full bg-slate-200 text-slate-500 flex items-center justify-center shrink-0"><AlertTriangle size={14}/></div>
                <div className="flex-1"><h4 className="text-xs font-bold text-slate-800">Manutenção do Servidor</h4><p className="text-[10px] text-slate-500">Hoje às 18h</p></div>
              </div>
            </div>
          </>
        );
        break;

      case 'mural':
        if (!config.mural || !muralAtivo) return null;
        content = (
          <>
            <h3 className="text-sm font-bold uppercase tracking-wider text-slate-600 flex items-center gap-2 mb-6 mt-2"><MessageSquare size={16} className="text-brand"/> Mural da Equipe</h3>
            <div className={`flex-1 overflow-y-auto custom-scrollbar pr-2 flex flex-col gap-4 min-h-[250px] ${modoEdicao ? 'pointer-events-none' : ''}`}>
              {mockFeed.map(item => (
                <div key={`feed-${item.id}`} className="flex gap-3 p-3 rounded-xl bg-slate-50 border border-slate-100">
                  <div className="w-10 h-10 rounded-full bg-white shadow-sm border border-slate-100 flex items-center justify-center text-lg shrink-0">{item.icon}</div>
                  <div className="flex-1 min-w-0"><p className="text-xs text-slate-700 leading-relaxed"><strong className="text-slate-900 font-bold">{item.user}</strong> {item.action}</p></div>
                </div>
              ))}
            </div>
          </>
        );
        break;

      case 'ranking':
        if (!config.ranking || !gamificacaoAtivo) return null;
        content = (
          <>
            <h3 className="text-sm font-bold uppercase tracking-wider text-slate-600 flex items-center gap-2 mb-6 mt-2"><Award size={18} className="text-amber-500"/> Ranking Mensal</h3>
            <div className={`flex flex-col gap-2 overflow-y-auto custom-scrollbar pr-1 min-h-[250px] ${modoEdicao ? 'pointer-events-none' : ''}`}>
              {mockRanking.map(r => (
                <div key={`rank-${r.pos}`} className={`flex items-center gap-3 p-3 rounded-xl border ${r.isMe ? 'bg-brand/5 border-brand/20' : 'border-transparent bg-slate-50'}`}>
                  <span className={`w-5 text-center text-xs font-black ${r.pos === 1 ? 'text-amber-500' : 'text-slate-300'}`}>{r.pos}º</span>
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-[10px] font-bold text-white ${r.isMe ? 'bg-brand' : 'bg-slate-300'}`}>{r.avatar}</div>
                  <div className="flex-1 min-w-0"><div className={`text-xs font-bold truncate ${r.isMe ? 'text-brand' : 'text-slate-700'}`}>{r.name}</div></div>
                </div>
              ))}
            </div>
          </>
        );
        break;

      case 'perfil_campeao':
        if (!config.perfil_campeao || !gamificacaoAtivo) return null;
        content = (
          <>
            <div className="flex items-center gap-3 mb-6 mt-2 pointer-events-none">
              <div className="w-12 h-12 rounded-2xl bg-brand/10 text-brand flex items-center justify-center"><User size={24}/></div>
              <div><h3 className="text-sm font-bold text-slate-800">Perfil Campeão</h3><p className="text-[10px] font-bold text-slate-400 uppercase tracking-tight">Nível 12 • 450 XP</p></div>
            </div>
            <div className={`space-y-6 ${modoEdicao ? 'pointer-events-none' : ''}`}>
              {[
                { id: 'miss1', label: 'Feedbacks', progress: 100, color: 'bg-emerald-500' }, 
                { id: 'miss2', label: 'Pesquisas', progress: 50, color: 'bg-brand' }
              ].map(mission => (
                <div key={mission.id}>
                  <div className="flex justify-between text-[10px] font-bold uppercase mb-2"><span className="text-slate-500">{mission.label}</span><span className={mission.progress === 100 ? 'text-emerald-500' : 'text-brand'}>{mission.progress}%</span></div>
                  <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden"><motion.div initial={{ width: 0 }} animate={{ width: mission.progress + '%' }} className={`h-full ${mission.color} rounded-full`}/></div>
                </div>
              ))}
            </div>
          </>
        );
        break;

      default: return null;
    }

    if (!content) return null;

    const bgClass = isWidgetGradient ? 'bg-gradient-to-br from-brand to-indigo-600 text-white' : 'bg-white text-slate-800';
    const isDraggingThis = dragId === id;

    return (
      <motion.div
        key={`widget-${id}`}
        layout
        variants={itemAnim}
        draggable={modoEdicao}
        onDragStart={(e) => handleDragStart(e, id)}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={(e) => handleDrop(e, id)}
        onDragEnd={handleDragEnd}
        className={`${classNameGrid[id]} ${bgClass} rounded-[20px] p-6 shadow-sm border flex flex-col relative transition-all duration-200 
          ${getEditClasses()} 
          ${isDraggingThis ? 'opacity-30 scale-[0.98]' : 'border-slate-200/60'}`}
      >
        {modoEdicao && (
          <>
            <div className={`absolute top-2 left-1/2 -translate-x-1/2 p-1 cursor-grab active:cursor-grabbing ${isWidgetGradient ? 'text-white/50 hover:text-white' : 'text-slate-300 hover:text-brand'}`}><GripHorizontal size={20}/></div>
            {!hideX && <button onClick={() => toggleWidget(id, true)} className="delete-badge"><X size={16}/></button>}
          </>
        )}
        {content}
      </motion.div>
    );
  };

  const getTemplatesExibidos = () => {
    if (abaTemplates === 'meus') {
      return templates.filter(t => t.usuario_id === user?.id);
    } else {
      return templates.filter(t => t.is_publico === true);
    }
  };
  const templatesExibidos = getTemplatesExibidos();

  return (
    <>
      <style>{`
        .edit-mode-widget {
          position: relative;
          z-index: 20;
          transition: transform 0.2s, box-shadow 0.2s, border 0.2s;
          transform: translateY(-4px);
          box-shadow: 0 20px 25px -5px rgba(37, 99, 235, 0.1), 0 8px 10px -6px rgba(37, 99, 235, 0.1);
          border-color: rgba(37, 99, 235, 0.3) !important;
        }

        .edit-mode-widget:hover {
          transform: translateY(-6px);
          box-shadow: 0 25px 30px -5px rgba(37, 99, 235, 0.15), 0 10px 15px -6px rgba(37, 99, 235, 0.1);
        }

        /* CLASSE ADICIONADA: Borda tracejada quando você arrasta um item por cima do outro */
        .drag-target-hover {
          border: 2px dashed var(--brand-color, #2563eb) !important;
          transform: scale(1.02) !important;
          opacity: 0.8;
        }

        .delete-badge {
          position: absolute;
          top: -12px;
          right: -12px;
          background-color: #ef4444;
          color: white;
          border-radius: 50%;
          padding: 6px;
          box-shadow: 0 4px 6px -1px rgba(0,0,0,0.3);
          z-index: 50;
          transition: all 0.2s;
          cursor: pointer;
        }
        .delete-badge:hover { 
          transform: scale(1.15) rotate(90deg); 
          background-color: #dc2626;
        }
      `}</style>

      <div className="flex h-screen bg-[#f8fafc] overflow-hidden font-sans text-slate-800">
        <div className={`fixed inset-0 bg-slate-900/40 z-40 backdrop-blur-sm transition-opacity lg:hidden ${menuAberto ? 'opacity-100' : 'opacity-0 pointer-events-none'}`} onClick={() => setMenuAberto(false)}></div>
        <Sidebar menuAberto={menuAberto} setMenuAberto={setMenuAberto} />

        <div className="flex-1 flex flex-col h-screen overflow-y-auto relative">
          
          <header className="sticky top-0 z-30 flex justify-between items-center px-6 py-4 bg-white/70 backdrop-blur-xl border-b border-slate-200/60">
            <div className="flex items-center gap-4">
              <button className="lg:hidden text-slate-500 hover:text-brand transition" onClick={() => setMenuAberto(true)}><Menu size={24} /></button>
              <div className="text-sm font-medium text-slate-500 hidden sm:block">Painel <span className="text-slate-300 mx-2">/</span> <strong className="text-slate-800 uppercase tracking-wider text-[11px]">Dashboard</strong></div>
            </div>
            
            <div className="flex items-center gap-3">
              <AnimatePresence>
                {modoEdicao && (
                  <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }} className="flex items-center gap-2">
                    <button onClick={() => setModalWidgets(true)} className="flex items-center gap-2 px-3 py-2 rounded-full text-xs font-bold bg-slate-100 text-slate-700 hover:bg-slate-200">
                      <Plus size={16} className="text-brand"/> <span className="hidden sm:inline">Add Widget</span>
                    </button>
                    <button onClick={() => setModalTemplates(true)} className="flex items-center gap-2 px-3 py-2 rounded-full text-xs font-bold bg-brand/10 text-brand hover:bg-brand hover:text-white">
                      <LayoutTemplate size={16}/> <span className="hidden md:inline">Templates</span>
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>

              <button 
                onClick={() => setModoEdicao(!modoEdicao)}
                className={`flex items-center gap-2 px-4 py-2 rounded-full text-xs font-bold border transition-colors ${modoEdicao ? 'bg-emerald-500 text-white border-emerald-500 shadow-md shadow-emerald-500/20 hover:bg-emerald-600' : 'bg-white text-slate-600 border-slate-200 hover:border-brand hover:text-brand shadow-sm'}`}
              >
                {modoEdicao ? <CheckCircle2 size={16} /> : <Settings2 size={16} />}
                <span className="hidden sm:inline">{modoEdicao ? 'Concluir Edição' : 'Personalizar'}</span>
              </button>

              <div className="w-px h-6 bg-slate-200 mx-1 hidden sm:block"></div>
              <div className="flex items-center gap-3 cursor-pointer group" onClick={() => navigate('/perfil')}>
                <div className="text-right hidden sm:block">
                  <div className="text-sm font-bold text-slate-800 group-hover:text-brand transition-colors">{userName}</div>
                </div>
                <div className="w-9 h-9 rounded-full bg-brand text-white flex items-center justify-center font-bold text-sm shadow-sm">{userName[0].toUpperCase()}</div>
              </div>
            </div>
          </header>

          <motion.main variants={containerAnim} initial="hidden" animate="show" className="p-6 lg:p-8 max-w-[1400px] mx-auto w-full flex flex-col gap-6 pb-20">
            
            {config.saudacao && (
              <motion.div variants={itemAnim} className={`relative flex flex-col md:flex-row md:items-center justify-between gap-4 transition-all rounded-[20px] ${modoEdicao ? 'bg-white p-4 border border-slate-200/60' : 'bg-transparent'} ${getEditClasses()}`}>
                {modoEdicao && <button onClick={() => toggleWidget('saudacao', true)} className="delete-badge"><X size={16}/></button>}
                <div>
                  <h1 className="text-2xl lg:text-3xl font-extrabold text-slate-800 tracking-tight">Olá, {userName.split(' ')[0]}! <span className="animate-wave inline-block">👋</span></h1>
                  <p className="text-slate-500 mt-1 text-sm font-medium">Bom trabalho para hoje!</p>
                </div>
                <div className="bg-white border border-slate-200/60 px-5 py-4 rounded-2xl max-w-md shadow-sm flex items-center gap-4">
                  <div className="w-10 h-10 rounded-xl bg-brand/10 flex items-center justify-center text-brand shrink-0"><Target size={20} /></div>
                  <p className="text-sm text-slate-700 font-medium italic">"{fraseDoDia}"</p>
                </div>
              </motion.div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 items-stretch auto-rows-max">
              {config.ordem.map(widgetId => (
                <React.Fragment key={`wrapper-${widgetId}`}>
                  {renderWidget(widgetId)}
                </React.Fragment>
              ))}
            </div>

          </motion.main>
        </div>
      </div>

      <AnimatePresence>
        {modalConfirmacao.aberto && (
          <div className="fixed inset-0 bg-slate-900/60 z-[60] flex items-center justify-center p-4 backdrop-blur-sm">
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="bg-white rounded-3xl shadow-2xl max-w-sm w-full p-6 text-center">
              <div className={`w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 ${modalConfirmacao.tipo === 'perigo' ? 'bg-red-100 text-red-500' : 'bg-amber-100 text-amber-500'}`}>
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
                  Confirmar
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {modalWidgets && (
          <div className="fixed inset-0 bg-slate-900/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="bg-white rounded-3xl shadow-2xl max-w-sm w-full overflow-hidden">
              <div className="p-5 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                <h2 className="text-base font-bold text-slate-800 flex items-center gap-2"><LayoutGrid className="text-brand" size={18}/> Adicionar Widgets</h2>
                <button onClick={() => setModalWidgets(false)} className="text-slate-400 hover:text-slate-600 p-1.5 rounded-full hover:bg-slate-200 transition-colors"><X size={18} /></button>
              </div>
              <div className="p-5 flex flex-col gap-3 max-h-[60vh] overflow-y-auto">
                {!config.saudacao && <button onClick={() => { toggleWidget('saudacao'); setModalWidgets(false); }} className="flex justify-between items-center p-3 rounded-xl border border-slate-200 hover:border-brand hover:bg-brand/5 text-left transition-colors"><span className="text-sm font-bold text-slate-700">Saudação Inicial</span><Plus size={16} className="text-brand"/></button>}
                {!config.info_mural && <button onClick={() => { toggleWidget('info_mural'); setModalWidgets(false); }} className="flex justify-between items-center p-3 rounded-xl border border-slate-200 hover:border-brand hover:bg-brand/5 text-left transition-colors"><span className="text-sm font-bold text-slate-700">Quadro de Informações</span><Plus size={16} className="text-brand"/></button>}
                {!config.resumo_mural && muralAtivo && <button onClick={() => { toggleWidget('resumo_mural'); setModalWidgets(false); }} className="flex justify-between items-center p-3 rounded-xl border border-slate-200 hover:border-brand hover:bg-brand/5 text-left transition-colors"><span className="text-sm font-bold text-slate-700">Resumo do Mural</span><Plus size={16} className="text-brand"/></button>}
                {!config.atalhos && <button onClick={() => { toggleWidget('atalhos'); setModalWidgets(false); }} className="flex justify-between items-center p-3 rounded-xl border border-slate-200 hover:border-brand hover:bg-brand/5 text-left transition-colors"><span className="text-sm font-bold text-slate-700">Atalhos Rápidos</span><Plus size={16} className="text-brand"/></button>}
                {!config.metricas && <button onClick={() => { toggleWidget('metricas'); setModalWidgets(false); }} className="flex justify-between items-center p-3 rounded-xl border border-slate-200 hover:border-brand hover:bg-brand/5 text-left transition-colors"><span className="text-sm font-bold text-slate-700">Métricas Rápidas</span><Plus size={16} className="text-brand"/></button>}
                {!config.mural && muralAtivo && <button onClick={() => { toggleWidget('mural'); setModalWidgets(false); }} className="flex justify-between items-center p-3 rounded-xl border border-slate-200 hover:border-brand hover:bg-brand/5 text-left transition-colors"><span className="text-sm font-bold text-slate-700">Mural Completo</span><Plus size={16} className="text-brand"/></button>}
                {!config.perfil_campeao && gamificacaoAtivo && <button onClick={() => { toggleWidget('perfil_campeao'); setModalWidgets(false); }} className="flex justify-between items-center p-3 rounded-xl border border-slate-200 hover:border-brand hover:bg-brand/5 text-left transition-colors"><span className="text-sm font-bold text-slate-700">Perfil Campeão</span><Plus size={16} className="text-brand"/></button>}
                {!config.ranking && gamificacaoAtivo && <button onClick={() => { toggleWidget('ranking'); setModalWidgets(false); }} className="flex justify-between items-center p-3 rounded-xl border border-slate-200 hover:border-brand hover:bg-brand/5 text-left transition-colors"><span className="text-sm font-bold text-slate-700">Ranking Mensal</span><Plus size={16} className="text-brand"/></button>}
                
                {config.saudacao && config.metricas && config.atalhos && config.info_mural && config.resumo_mural && (muralAtivo ? config.mural : true) && (gamificacaoAtivo ? config.perfil_campeao && config.ranking : true) && (
                  <div className="text-center py-6">
                    <div className="w-12 h-12 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-3 text-slate-300"><CheckCircle2 size={24}/></div>
                    <p className="text-sm text-slate-500 font-medium">Todos os widgets disponíveis<br/>já estão na sua tela.</p>
                  </div>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {modalTemplates && (
          <div className="fixed inset-0 bg-slate-900/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="bg-white rounded-[24px] shadow-2xl max-w-2xl w-full overflow-hidden flex flex-col max-h-[90vh]">
              <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2"><LayoutTemplate className="text-brand"/> Gerenciador de Templates</h2>
                <button onClick={() => setModalTemplates(false)} className="text-slate-400 hover:text-slate-600 p-2"><X size={24} /></button>
              </div>
              
              <div className="p-6 overflow-y-auto flex-1 bg-slate-50">
                <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm mb-8">
                  <h3 className="text-sm font-bold text-slate-800 mb-4">Salvar Layout Atual</h3>
                  <form onSubmit={salvarNovoTemplate} className="flex flex-col gap-3">
                    <input 
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-brand outline-none" 
                      placeholder="Dê um nome para este template..." 
                      value={nomeNovoTemplate} 
                      onChange={e => setNomeNovoTemplate(e.target.value)} 
                      required 
                    />
                    <div className="flex flex-col sm:flex-row gap-3">
                      <div className="flex-1 relative">
                        <select 
                          value={tipoCompartilhamento} 
                          onChange={e => setTipoCompartilhamento(e.target.value)}
                          className="w-full appearance-none bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-brand outline-none cursor-pointer text-slate-700"
                        >
                          <option value="privado">🔒 Apenas eu (Privado)</option>
                          <option value="publico">🌍 Toda a empresa (Geral)</option>
                          <option value="especifico">👥 Usuários Específicos...</option>
                        </select>
                      </div>
                      <button type="submit" className="bg-brand text-white font-bold text-sm px-6 py-2.5 rounded-xl hover:opacity-90 flex items-center justify-center gap-2 whitespace-nowrap"><Save size={16}/> Salvar</button>
                    </div>
                  </form>
                </div>

                <div className="flex gap-6 border-b border-slate-200 mb-6">
                  <button onClick={() => setAbaTemplates('meus')} className={`pb-3 text-sm font-bold relative transition-colors ${abaTemplates === 'meus' ? 'text-brand' : 'text-slate-400 hover:text-slate-600'}`}>
                    Meus Templates
                    {abaTemplates === 'meus' && <motion.div layoutId="aba-ativa" className="absolute bottom-0 left-0 right-0 h-0.5 bg-brand rounded-t-full"/>}
                  </button>
                  <button onClick={() => setAbaTemplates('publicos')} className={`pb-3 text-sm font-bold relative transition-colors ${abaTemplates === 'publicos' ? 'text-brand' : 'text-slate-400 hover:text-slate-600'}`}>
                    Templates da Empresa
                    {abaTemplates === 'publicos' && <motion.div layoutId="aba-ativa" className="absolute bottom-0 left-0 right-0 h-0.5 bg-brand rounded-t-full"/>}
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {templatesExibidos.length === 0 ? (
                    <div className="col-span-1 sm:col-span-2 text-center py-10 bg-white rounded-2xl border border-slate-200 border-dashed">
                      <LayoutTemplate className="mx-auto text-slate-300 mb-3" size={32}/>
                      <p className="text-slate-500 text-sm font-medium">Nenhum template encontrado nesta aba.</p>
                    </div>
                  ) : (
                    templatesExibidos.map(t => (
                      <div key={`tpl-${t.id}`} className="bg-white p-4 rounded-2xl border border-slate-200 hover:border-brand transition-colors flex flex-col group shadow-sm">
                        <div className="flex justify-between items-start mb-2">
                          <h4 className="font-bold text-slate-800 text-sm truncate pr-2">{t.nome}</h4>
                          {t.is_publico ? <Globe size={14} className="text-blue-500 shrink-0" title="Público"/> : <LockKeyhole size={14} className="text-slate-400 shrink-0" title="Privado"/>}
                        </div>
                        <p className="text-[10px] text-slate-400 font-bold mb-4">Criado por: {t.perfis?.nome_completo || 'Desconhecido'}</p>
                        <button onClick={() => aplicarTemplate(t.config)} className="mt-auto w-full bg-brand/10 text-brand font-bold text-xs py-2 rounded-lg hover:bg-brand hover:text-white transition-colors">Aplicar Layout</button>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}