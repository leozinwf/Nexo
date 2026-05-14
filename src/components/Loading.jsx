import { Loader2 } from 'lucide-react';

export function Loading({ mensagem = 'Carregando...' }) {
  return (
    <div className="layout" style={{ 
      display: 'flex', 
      flexDirection: 'column', 
      alignItems: 'center', 
      justifyContent: 'center', 
      height: '100vh',
      backgroundColor: '#f8fafc' 
    }}>
      {/* O ícone Loader2 já tem formato de spinner. Vamos animá-lo no CSS */}
      <Loader2 size={48} color="#0067ff" className="spinner-animado" />
      
      <p style={{ 
        marginTop: '1.5rem', 
        color: '#64748b', 
        fontSize: '1.1rem', 
        fontWeight: '500',
        animation: 'pulseText 2s infinite' 
      }}>
        {mensagem}
      </p>
    </div>
  );
}