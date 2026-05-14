import { useState, useEffect } from 'react';
import { supabase } from '../services/supabase';

export function usePermission(chavePermissao) {
  const [temAcesso, setTemAcesso] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function check() {
      const { data, error } = await supabase.rpc('tem_permissao', { p_chave: chavePermissao });
      setTemAcesso(!!data);
      setLoading(false);
    }
    check();
  }, [chavePermissao]);

  return { temAcesso, loading };
}