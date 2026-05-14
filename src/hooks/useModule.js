import { useAppContext } from '../contexts/AppContext';

export function useModule(chaveModulo) {
  const { modulos, loadingApp } = useAppContext();
  // Simplesmente verifica se a palavra existe na memória instantânea
  const isAtivo = modulos.includes(chaveModulo);
  return { isAtivo, loadingModulo: loadingApp };
}