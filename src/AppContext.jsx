import { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '../../services/supabase';

// Cria a memória global
const AppContext = createContext({});

export function AppProvider({ children }) {
  const [permissoes, setPermissoes] = useState([]);
  const [modulos, setModulos] = useState([]);
  const [loadingApp, setLoadingApp] = useState(true);

  useEffect(() => {
    carregarTudo();

    // Se o utilizador fizer login ou logout, atualiza a memória
    const { data: authListener } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_IN') carregarTudo();
      if (event === 'SIGNED_OUT') {
        setPermissoes([]);
        setModulos([]);
      }
    });

    return () => authListener.subscription.unsubscribe();
  }, []);

  async function carregarTudo() {
    setLoadingApp(true);
    const { data: { session } } = await supabase.auth.getSession();
    
    if (session) {
      // Executa as duas funções rápidas do SQL ao mesmo tempo!
      const [resPerms, resMods] = await Promise.all([
        supabase.rpc('get_minhas_permissoes'),
        supabase.rpc('get_meus_modulos')
      ]);
      
      // Guarda na memória
      if (resPerms.data) setPermissoes(resPerms.data.map(p => p.chave));
      if (resMods.data) setModulos(resMods.data.map(m => m.chave));
    }
    setLoadingApp(false);
  }

  return (
    <AppContext.Provider value={{ permissoes, modulos, loadingApp }}>
      {children}
    </AppContext.Provider>
  );
}

// Facilitador para chamar a memória
export const useAppContext = () => useContext(AppContext);