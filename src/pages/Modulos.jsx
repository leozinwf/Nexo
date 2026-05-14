import { useEffect, useState } from 'react';
import { supabase } from '../services/supabase';
import { Sidebar } from '../components/Sidebar';
import { LayoutGrid, Menu, Save, Info } from 'lucide-react';
import toast from 'react-hot-toast';

export function Modulos() {
  const [modulos, setModulos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [menuAberto, setMenuAberto] = useState(false);

  useEffect(() => {
    carregarModulos();
  }, []);

  async function carregarModulos() {
    const { data: { user } } = await supabase.auth.getUser();
    const { data: perfil } = await supabase.from('perfis').select('empresa_id').eq('id', user.id).single();

    // Busca todos os módulos e o status de ativação da empresa
    const { data: todosModulos } = await supabase.from('modulos').select('*');
    const { data: ativacoes } = await supabase.from('empresa_modulos').select('*').eq('empresa_id', perfil.empresa_id);

    // Mapeia os dados para facilitar o uso no switch
    const listaFormatada = todosModulos.map(m => ({
      ...m,
      ativo: ativacoes?.find(a => a.modulo_id === m.id)?.ativo ?? false
    }));

    setModulos(listaFormatada);
    setLoading(false);
  }

  async function toggleModulo(moduloId, statusAtual) {
    const { data: { user } } = await supabase.auth.getUser();
    const { data: perfil } = await supabase.from('perfis').select('empresa_id').eq('id', user.id).single();

    const { error } = await supabase.from('empresa_modulos').upsert({
      empresa_id: perfil.empresa_id,
      modulo_id: moduloId,
      ativo: !statusAtual,
      updated_at: new Date()
    });

    if (error) toast.error("Erro ao alterar módulo.");
    else {
      toast.success("Configuração atualizada!");
      carregarModulos();
    }
  }

  return (
    <div className="layout">
      <Sidebar menuAberto={menuAberto} setMenuAberto={setMenuAberto} />
      <div className="main-container">
        <header className="top-header">
           <button className="mobile-header-btn" onClick={() => setMenuAberto(true)}><Menu /></button>
           <div style={{color: '#64748b'}}>Administração / <strong>Módulos do Sistema</strong></div>
        </header>

        <main className="content">
          <div style={{ maxWidth: '800px' }}>
            <h2 style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem' }}>
              <LayoutGrid color="#0067ff" /> Marketplace Interno
            </h2>
            <p style={{ color: '#64748b', marginBottom: '2rem' }}>
              Ative ou desative as funcionalidades que sua empresa deseja utilizar.
            </p>

            <div style={{ display: 'grid', gap: '1rem' }}>
              {modulos.map(mod => (
                <div key={mod.id} className="doohub-card" style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'space-between', 
                  padding: '1.5rem',
                  borderLeft: mod.ativo ? '4px solid #10b981' : '4px solid #e2e8f0'
                }}>
                  <div style={{ flex: 1 }}>
                    <h3 style={{ margin: 0, fontSize: '1.1rem', color: '#1e293b' }}>{mod.nome}</h3>
                    <p style={{ margin: '0.25rem 0 0 0', color: '#64748b', fontSize: '0.9rem' }}>{mod.descricao}</p>
                  </div>
                  
                  <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    <span style={{ fontSize: '0.8rem', fontWeight: 'bold', color: mod.ativo ? '#10b981' : '#94a3b8' }}>
                      {mod.ativo ? 'ATIVADO' : 'DESATIVADO'}
                    </span>
                    <label className="switch">
                      <input 
                        type="checkbox" 
                        checked={mod.ativo} 
                        onChange={() => toggleModulo(mod.id, mod.ativo)} 
                      />
                      <span className="slider round"></span>
                    </label>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}