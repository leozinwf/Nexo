import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../services/supabase';
import { Sidebar } from '../components/Sidebar';
import { LayoutGrid, Menu, Briefcase, Heart, MessageSquare, LayoutTemplate } from 'lucide-react';
import toast from 'react-hot-toast';
import { usePermission } from '../hooks/usePermissions';
import { Loading } from '../components/Loading';

export function Modulos() {
  const navigate = useNavigate();
  const [modulos, setModulos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [menuAberto, setMenuAberto] = useState(false);
  const [empresaId, setEmpresaId] = useState(null);

  const { temAcesso: podeGerenciar, loadingPermissao } = usePermission('admin.modulos');

  useEffect(() => {
    if (!loadingPermissao && !podeGerenciar) {
      toast.error("Você não tem permissão para aceder a esta área.");
      navigate('/dashboard');
    }
  }, [podeGerenciar, loadingPermissao, navigate]);

  useEffect(() => {
    carregarDados();
  }, []);

  async function carregarDados() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data: perfil } = await supabase.from('perfis').select('empresa_id').eq('id', user.id).single();
    setEmpresaId(perfil.empresa_id);

    const { data: todosModulos } = await supabase.from('modulos').select('*').order('nome');
    const { data: ativacoes } = await supabase.from('empresa_modulos').select('*').eq('empresa_id', perfil.empresa_id);

    const listaFormatada = todosModulos.map(m => ({
      ...m,
      ativo: ativacoes?.find(a => a.modulo_id === m.id)?.ativo ?? false
    }));

    setModulos(listaFormatada);
    setLoading(false);
  }

  async function toggleModulo(moduloId, statusAtual) {
    const novoStatus = !statusAtual;
    
    const { error } = await supabase
      .from('empresa_modulos')
      .upsert({ empresa_id: empresaId, modulo_id: moduloId, ativo: novoStatus }, { onConflict: 'empresa_id, modulo_id' });

    if (error) {
      toast.error("Erro ao atualizar módulo.");
    } else {
      setModulos(modulos.map(m => m.id === moduloId ? { ...m, ativo: novoStatus } : m));
      toast.success(`Módulo ${novoStatus ? 'ativado' : 'desativado'} com sucesso!`);
    }
  }

  // 🌟 LÓGICA DE CATEGORIZAÇÃO VISUAL
  const categorias = [
    {
      id: 'operacional',
      titulo: 'Operacional & RH',
      icone: <Briefcase size={18} className="text-slate-500" />,
      chaves: ['ponto', 'folha_pagamento']
    },
    {
      id: 'engajamento',
      titulo: 'Engajamento & Clima',
      icone: <Heart size={18} className="text-rose-500" />,
      chaves: ['humor', 'gamificacao']
    },
    {
      id: 'comunicacao',
      titulo: 'Comunicação Interna',
      icone: <MessageSquare size={18} className="text-blue-500" />,
      chaves: ['mural', 'feedbacks']
    }
  ];

  // Função para retornar as "Badges" (etiquetas) indicando onde o módulo aparece
  const getImpactoVisual = (chave) => {
    switch(chave) {
      case 'ponto': return ['Dashboard', 'Menu Lateral'];
      case 'humor': return ['Dashboard'];
      case 'gamificacao': return ['Dashboard'];
      case 'mural': return ['Dashboard', 'Menu Lateral'];
      case 'feedbacks': return ['Menu Lateral'];
      default: return [];
    }
  };

  if (loading || loadingPermissao) return <Loading mensagem="A carregar módulos..." />;

  // Descobrir módulos que não estão mapeados em nenhuma categoria (vão para "Outros")
  const chavesMapeadas = categorias.flatMap(c => c.chaves);
  const modulosOutros = modulos.filter(m => !chavesMapeadas.includes(m.chave));

  return (
    <div className="layout">
      <Sidebar menuAberto={menuAberto} setMenuAberto={setMenuAberto} />
      <div className="main-container">
        
        <header className="top-header">
          <button className="mobile-header-btn" onClick={() => setMenuAberto(true)} style={{ background: 'none', border: 'none' }}><Menu size={24} /></button>
          <div style={{ color: '#64748b' }}>Administração / <strong>Módulos do Sistema</strong></div>
        </header>

        <main className="content p-6 lg:p-8 max-w-[1000px] mx-auto w-full">
          
          <div className="mb-8">
            <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-3">
              <LayoutGrid className="text-brand" /> Ativação de Funcionalidades
            </h2>
            <p className="text-slate-500 text-sm mt-2">
              Ligue ou desligue módulos para personalizar a plataforma. As alterações refletem instantaneamente para toda a empresa.
            </p>
          </div>

          <div className="flex flex-col gap-8">
            {categorias.map(categoria => {
              const modulosDestaCategoria = modulos.filter(m => categoria.chaves.includes(m.chave));
              if (modulosDestaCategoria.length === 0) return null;

              return (
                <div key={categoria.id} className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
                  
                  {/* Cabeçalho da Categoria */}
                  <div className="bg-slate-50 border-b border-slate-200 px-6 py-4 flex items-center gap-3">
                    {categoria.icone}
                    <h3 className="font-bold text-slate-800 text-sm uppercase tracking-wide">{categoria.titulo}</h3>
                  </div>

                  {/* Lista de Módulos (Linhas Compactas) */}
                  <div className="flex flex-col divide-y divide-slate-100">
                    {modulosDestaCategoria.map(mod => {
                      const tagsImpacto = getImpactoVisual(mod.chave);
                      
                      return (
                        <div key={mod.id} className="px-6 py-5 flex items-center justify-between hover:bg-slate-50/50 transition-colors gap-4">
                          <div className="flex-1">
                            <div className="flex items-center gap-3 mb-1">
                              <h4 className={`text-sm font-bold ${mod.ativo ? 'text-slate-900' : 'text-slate-500'}`}>{mod.nome}</h4>
                              
                              {/* 🌟 ETIQUETAS MOSTRANDO ONDE AFETA */}
                              <div className="flex gap-2">
                                {tagsImpacto.map(tag => (
                                  <span key={tag} className="flex items-center gap-1 text-[9px] font-bold uppercase tracking-wider bg-brand/10 text-brand px-2 py-0.5 rounded-md border border-brand/20">
                                    {tag === 'Dashboard' ? <LayoutTemplate size={10} /> : <Menu size={10} />}
                                    {tag}
                                  </span>
                                ))}
                              </div>
                            </div>
                            <p className="text-xs text-slate-500 leading-relaxed">{mod.descricao}</p>
                          </div>
                          
                          {/* 🌟 NOVO TOGGLE SWITCH COMPACTO */}
                          <div className="flex items-center gap-3">
                            <span className={`text-[10px] font-bold uppercase tracking-widest w-16 text-right ${mod.ativo ? 'text-brand' : 'text-slate-400'}`}>
                              {mod.ativo ? 'Ligado' : 'Desligado'}
                            </span>
                            <label className="toggle-switch">
                              <input type="checkbox" checked={mod.ativo} onChange={() => toggleModulo(mod.id, mod.ativo)} />
                              <span className="toggle-slider"></span>
                            </label>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}

            {/* Categoria Genérica (Outros) */}
            {modulosOutros.length > 0 && (
              <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
                <div className="bg-slate-50 border-b border-slate-200 px-6 py-4 flex items-center gap-3">
                  <LayoutGrid size={18} className="text-slate-500" />
                  <h3 className="font-bold text-slate-800 text-sm uppercase tracking-wide">Outros Módulos</h3>
                </div>
                <div className="flex flex-col divide-y divide-slate-100">
                  {modulosOutros.map(mod => (
                    <div key={mod.id} className="px-6 py-5 flex items-center justify-between hover:bg-slate-50/50 transition-colors gap-4">
                      <div className="flex-1">
                        <h4 className={`text-sm font-bold mb-1 ${mod.ativo ? 'text-slate-900' : 'text-slate-500'}`}>{mod.nome}</h4>
                        <p className="text-xs text-slate-500 leading-relaxed">{mod.descricao}</p>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className={`text-[10px] font-bold uppercase tracking-widest w-16 text-right ${mod.ativo ? 'text-brand' : 'text-slate-400'}`}>
                          {mod.ativo ? 'Ligado' : 'Desligado'}
                        </span>
                        <label className="toggle-switch">
                          <input type="checkbox" checked={mod.ativo} onChange={() => toggleModulo(mod.id, mod.ativo)} />
                          <span className="toggle-slider"></span>
                        </label>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

          </div>
        </main>
      </div>
    </div>
  );
}