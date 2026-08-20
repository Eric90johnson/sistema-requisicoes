import React, { useState } from 'react';
import '../../styles/components/rodape/rodape.css';

export default function Rodape() {
  const VERSAO_SISTEMA = "1.3.2"; 
  
  // Estado para controlar se o rodapé está aberto ou fechado no celular
  const [expandido, setExpandido] = useState(false);

  const alternarRodape = () => {
    setExpandido(!expandido);
  };

  return (
    <footer className={`rodape-container ${expandido ? 'expandido' : ''}`}>
      <div className="rodape-conteudo">
        
        {/* Sessão 1: Informações da Loja (Clicável no Mobile) */}
        <div className="rodape-secao rodape-header-mobile" onClick={alternarRodape}>
          <div className="titulo-com-icone">
            <h3>Neta Dantas Cosméticos e Presentes</h3>
            <span className="icone-expandir">
              {expandido ? '▲' : '▼'}
            </span>
          </div>
          <p style={{ color: '#bdc3c7', fontSize: '0.9rem' }}>
            Sistema Integrado de Gestão de Estoque e Requisições.
          </p>
        </div>
        
        {/* Sessão 2: Contatos WhatsApp (Fica oculto no celular até clicar) */}
        <div className="rodape-secao conteudo-colapsavel">
          <h4>📞 WhatsApp das Lojas</h4>
          <ul>
            <li><strong>Araturi:</strong> (85) 9XXXX-XXXX</li>
            <li><strong>Conj. Ceará:</strong> (85) 9XXXX-XXXX</li>
            <li><strong>Messejana:</strong> (85) 9XXXX-XXXX</li>
          </ul>
        </div>

        {/* Sessão 3: Redes Sociais (Fica oculto no celular até clicar) */}
        <div className="rodape-secao conteudo-colapsavel">
          <h4>📱 Redes Sociais</h4>
          <ul>
            <li>
              📷 Instagram: <br/>
              <a href="https://instagram.com/netadantas" target="_blank" rel="noopener noreferrer">
                <strong>@netadantas</strong>
              </a>
            </li>
          </ul>
        </div>
        
      </div>
      
      {/* Barra Inferior com a Versão (Fica oculto no celular até clicar) */}
      <div className="rodape-bottom conteudo-colapsavel">
        <p>&copy; {new Date().getFullYear()} Neta Dantas. Todos os direitos reservados.</p>
        
        <span className="versao-app">
          Versão {VERSAO_SISTEMA}
        </span>
      </div>
    </footer>
  );
}