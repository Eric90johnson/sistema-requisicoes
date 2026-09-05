import React, { useState } from 'react';
import '../../styles/components/rodape/rodape.css';

export default function Rodape() {
  const VERSAO_SISTEMA = "1.5.5"; 
  
  // Estado para controlar a sanfona no mobile
  const [expandido, setExpandido] = useState(false);

  const alternarRodape = () => {
    setExpandido(!expandido);
  };

  return (
    <footer className={`rodape-minimalista ${expandido ? 'expandido' : ''}`}>
      
      {/* Esquerda: Informações do Sistema (Clicável no Mobile) */}
      <div className="rodape-esquerda" onClick={alternarRodape}>
        <strong>Neta Dantas Cosméticos e Presentes</strong>
        <span>Sistema Integrado de Gestão de Estoque e Requisições.</span>
        
        {/* Ícone que só aparece no celular */}
        <span className="icone-expandir-rodape">
          {expandido ? '▲' : '▼'}
        </span>
      </div>
      
      {/* Centro: Direitos e Autoria */}
      <div className="rodape-centro">
        <span>&copy; {new Date().getFullYear()} Neta Dantas. Todos os direitos reservados.</span>
        <span className="desenvolvedor">Desenvolvido por Eric Johnson</span>
      </div>

      {/* Direita: Versão */}
      <div className="rodape-direita">
        <span className="versao-app">Versão {VERSAO_SISTEMA}</span>
      </div>

    </footer>
  );
}