import { useState } from 'react';
import '../../styles/components/menu/menu.css';

// NOVO: Adicionamos aoClicarAdmin e usuarioLogado nas propriedades
export default function Menu({ aoClicarPainel, aoClicarHistorico, aoClicarBaseDados, aoClicarAdmin, usuarioLogado, aoSair }) { 
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
              aoClicarPainel(); 
              setAberto(false); 
            }}
          >
            <span>🏠</span> Painel Principal
          </div>

          <div 
            className="menu-item" 
            onClick={() => {
              aoClicarHistorico(); 
              setAberto(false); 
            }}
          >
            <span>🕒</span> Histórico
          </div>

          <div 
            className="menu-item" 
            onClick={() => {
              aoClicarBaseDados(); 
              setAberto(false); 
            }}
          >
            <span>🗄️</span> Base de Dados
          </div>

          {/* NOVO: A mágica acontece aqui! Só aparece se o usuário for o admin */}
          {usuarioLogado?.username === 'admin' && (
            <div 
              className="menu-item" 
              style={{ borderTop: '1px solid #eee', marginTop: '5px', paddingTop: '10px', color: '#8e44ad', fontWeight: 'bold' }}
              onClick={() => {
                aoClicarAdmin(); 
                setAberto(false); 
              }}
            >
              <span>⚙️</span> Painel Administrador
            </div>
          )}

          <div 
            className="menu-item" 
            style={{ borderTop: '1px solid #eee', marginTop: '5px', paddingTop: '10px', color: '#c0392b' }}
            onClick={() => {
              aoSair(); 
              setAberto(false); 
            }}
          >
            <span>🚪</span> Sair do Sistema
          </div>

        </div>
      )}
    </div>
  );
}