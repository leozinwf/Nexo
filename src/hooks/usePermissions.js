import { useAppContext } from '../contexts/AppContext';

export function usePermission(chavePermissao) {
  const { permissoes, loadingApp } = useAppContext();
  // Simplesmente verifica se a permissão existe na memória instantânea
  const temAcesso = permissoes.includes(chavePermissao);
  return { temAcesso, loadingPermissao: loadingApp };
}