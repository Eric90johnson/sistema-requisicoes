import { useState } from 'react';
import '../../styles/admin/admin.css';
import AdminBaseDados from './base-dados/AdminBaseDados';
import AdminUsuarios from './usuarios/AdminUsuarios';
import AdminNovidades from './novidades/AdminNovidades';

export default function Admin({ setProdutos, abaAtiva }) {
  
  // ESTADO QUE CONTROLA AS ABAS LILÁS
  const [lojaAtiva, setLojaAtiva] = useState('ARATURI');
  const lojas = ['ARATURI', 'CONJUNTO CEARA', 'MESSEJANA', 'MULUNGU'];

  return (
    <div className="admin-container">
      <div className="admin-header">
        <h2>⚙️ Painel de Controle</h2>
        <p>Área restrita para gestão do sistema Neta Dantas.</p>
      </div>

      <div 
        className="admin-content" 
        style={abaAtiva === 'base-dados' ? { padding: 0, backgroundColor: 'transparent', boxShadow: 'none' } : {}}
      >
        
        {abaAtiva === 'base-dados' && (
          <div className="painel-abas-premium">
            
            {/* AQUI ESTÃO AS ABAS NO TOPO ABSOLUTO DO ADMIN CONTENT */}
            <div className="abas-lojas-container">
              {lojas.map((loja, index) => (
                <button 
                  key={loja}
                  type="button"
                  className={`aba-loja-btn ${lojaAtiva === loja ? 'ativa' : ''}`}
                  onClick={() => setLojaAtiva(loja)}
                  style={{ zIndex: lojaAtiva === loja ? 10 : lojas.length - index }}
                >
                  <span>{loja}</span>
                </button>
              ))}
            </div>

            <div className="conteudo-aba-ativa">
              {/* Passamos o nome da loja escolhida para o componente de envio */}
              <AdminBaseDados setProdutos={setProdutos} lojaAtiva={lojaAtiva} />
            </div>

          </div>
        )}

        {abaAtiva === 'usuarios' && (
          <AdminUsuarios />
        )}

        {abaAtiva === 'novidades' && (
          <AdminNovidades />
        )}

      </div>
    </div>
  );
}