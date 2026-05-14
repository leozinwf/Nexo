import { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '../services/supabase';

const AppContext = createContext({});

export function AppProvider({ children }) {
  const [permissoes, setPermissoes] = useState([]);
  const [modulos, setModulos] = useState([]);
  const [empresaInfo, setEmpresaInfo] = useState(null);
  const [loadingApp, setLoadingApp] = useState(true);

  useEffect(() => {
    carregarTudo();
    const { data: authListener } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_IN') carregarTudo();
      if (event === 'SIGNED_OUT') {
        setPermissoes([]);
        setModulos([]);
        setEmpresaInfo(null);
        document.title = 'Doo-Hub'; // Reseta o título ao sair
      }
    });
    return () => authListener.subscription.unsubscribe();
  }, []);

  async function carregarTudo() {
    setLoadingApp(true);
    const { data: { session } } = await supabase.auth.getSession();
    
    if (session) {
      const [resPerms, resMods, resPerfil] = await Promise.all([
        supabase.rpc('get_minhas_permissoes'),
        supabase.rpc('get_meus_modulos'),
        supabase.from('perfis').select('empresa_id').eq('id', session.user.id).single()
      ]);
      
      if (resPerms.data) setPermissoes(resPerms.data.map(p => p.chave));
      if (resMods.data) setModulos(resMods.data.map(m => m.chave));

      // Busca dados da empresa para White-label
      if (resPerfil.data) {
        const { data: empresa } = await supabase
          .from('empresas')
          .select('nome_fantasia, logo_url, favicon_url, proposito')
          .eq('id', resPerfil.data.empresa_id)
          .maybeSingle();
        
        if (empresa) {
          setEmpresaInfo(empresa);
          
          // 🌟 MÁGICA 1: Troca o título da aba do navegador
          document.title = empresa.nome_fantasia || 'Doo-Hub';
          
          // 🌟 MÁGICA 2: Injeta o Favicon da Empresa se ele existir
          if (empresa.favicon_url) {
            let link = document.querySelector("link[rel~='icon']");
            if (!link) {
              link = document.createElement('link');
              link.rel = 'icon';
              document.head.appendChild(link);
            }
            link.href = empresa.favicon_url;
          }
        }
      }
    }
    setLoadingApp(false);
  }

  return (
    <AppContext.Provider value={{ permissoes, modulos, empresaInfo, loadingApp }}>
      {children}
    </AppContext.Provider>
  );
}

export const useAppContext = () => useContext(AppContext);