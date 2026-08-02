import { useState } from 'react';
import '../../styles/components/menu/menu.css';

// Recebemos todas as props de navegação aqui
export default function Menu({ aoClicarPainel, aoClicarHistorico, aoClicarBaseDados }) { 
  const [aberto, setAberto] = useState(false);

  const alternarMenu = () => setAberto(!aberto);

  return (
    <div className="menu-container">
      <button className="hamburger-btn" onClick={alternarMenu} title="Menu">
        <span className="hamburger-linha"></span>
        <span className="hamburger-linha"></span>
        <span className="hamburger-linha"></span>
      </button>

      {aberto && (
        <div className="menu-dropdown">
          
          <div 
            className="menu-item" 
            onClick={() => {
              aoClicarPainel(); // Volta para a tela inicial
              setAberto(false); // Fecha o menu
            }}
          >
            <span>🏠</span> Painel Principal
          </div>

          <div 
            className="menu-item" 
            onClick={() => {
              aoClicarHistorico(); // Vai para a tela de histórico
              setAberto(false);    // Fecha o menu
            }}
          >
            <span>🕒</span> Histórico
          </div>

          <div 
            className="menu-item" 
            onClick={() => {
              aoClicarBaseDados(); // Chama a função que troca a tela
              setAberto(false);    // Fecha a caixinha do menu
            }}
          >
            <span>🗄️</span> Base de Dados
          </div>

        </div>
      )}
    </div>
  );
}