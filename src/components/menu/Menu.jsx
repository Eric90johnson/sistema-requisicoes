import { useState } from 'react';
import '../../styles/components/menu/menu.css';

// Adicionamos a prop aqui
export default function Menu({ aoClicarBaseDados }) { 
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