import { createContext, useContext, useState, useEffect, useRef } from 'react';
import { supabase } from '../services/supabase';

const AppContext = createContext({});

export function AppProvider({ children }) {
  const [permissoes, setPermissoes] = useState([]);
  const [modulos, setModulos] = useState([]);
  const [empresaInfo, setEmpresaInfo] = useState(null);
  const [loadingApp, setLoadingApp] = useState(true);
  
  // 🌟 O TRUQUE MÁGICO: Guarda na memória se o sistema já fez o primeiro carregamento
  const jaCarregou = useRef(false); 

  useEffect(() => {
    carregarTudo();
    
    const { data: authListener } = supabase.auth.onAuthStateChange((event) => {
      // Se for um "Login", mas já tivermos os dados, ele ignora e NÃO pisca a tela no Alt+Tab
      if (event === 'SIGNED_IN') {
        if (!jaCarregou.current) carregarTudo();
      }
      
      // Quando sai do sistema, limpamos a memória e preparamos para o próximo utilizador
      if (event === 'SIGNED_OUT') {
        setPermissoes([]);
        setModulos([]);
        setEmpresaInfo(null);
        jaCarregou.current = false;
        document.title = 'Doo-Hub';
      }
    });
    
    return () => authListener.subscription.unsubscribe();
  }, []);

  async function carregarTudo() {
    // Só ativa a tela gigante de "Carregando..." se for a primeira vez que entra
    if (!jaCarregou.current) {
      setLoadingApp(true);
    }
    
    const { data: { session } } = await supabase.auth.getSession();
    
    if (session) {
      const [resPerms, resMods, resPerfil] = await Promise.all([
        supabase.rpc('get_minhas_permissoes'),
        supabase.rpc('get_meus_modulos'),
        supabase.from('perfis').select('empresa_id').eq('id', session.user.id).single()
      ]);
      
      if (resPerms.data) setPermissoes(resPerms.data.map(p => p.chave));
      if (resMods.data) setModulos(resMods.data.map(m => m.chave));

      if (resPerfil.data) {
        const { data: empresa } = await supabase
          .from('empresas')
          .select('nome_fantasia, logo_url, favicon_url, proposito')
          .eq('id', resPerfil.data.empresa_id)
          .maybeSingle();
        
        if (empresa) {
          setEmpresaInfo(empresa);
          document.title = empresa.nome_fantasia || 'Doo-Hub';
          
          if (empresa.cor_tema) {
            document.documentElement.style.setProperty('--brand-color', empresa.cor_tema);
          }
          
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
    
    // Marca que o carregamento pesado já foi feito
    jaCarregou.current = true;
    setLoadingApp(false);
  }

  return (
    <AppContext.Provider value={{ permissoes, modulos, empresaInfo, loadingApp }}>
      {children}
    </AppContext.Provider>
  );
}

export const useAppContext = () => useContext(AppContext);