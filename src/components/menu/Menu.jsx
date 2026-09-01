import { useState } from 'react';
import '../../styles/components/menu/menu.css';
import logo from '../../assets/logo.jpeg';

// --- ÍCONES PROFISSIONAIS (SVG) ---
const IconHome = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
);

const IconHistory = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
);

const IconDatabase = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><ellipse cx="12" cy="5" rx="9" ry="3"/><path d="M3 5V19A9 3 0 0 0 21 19V5"/><path d="M3 12A9 3 0 0 0 21 12"/></svg>
);

const IconContact = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/></svg>
);

const IconAdmin = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"/><circle cx="12" cy="12" r="3"/></svg>
);

const IconDashboard = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="9"/><rect x="14" y="3" width="7" height="5"/><rect x="14" y="12" width="7" height="9"/><rect x="3" y="16" width="7" height="5"/></svg>
);

const IconLogout = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" x2="9" y1="12" y2="12"/></svg>
);

export default function Menu({ 
  aoClicarTransferencias, aoClicarMarketplace, aoClicarHistorico, aoClicarBaseDados, aoClicarAdmin, aoClicarContatos, aoClicarDashboard,
  usuarioLogado, aoSair, telaAtual, menuMobileAberto, setMenuMobileAberto 
}) { 
  const [colapsado, setColapsado] = useState(true);
  const [mostrarModalAcessoNegado, setMostrarModalAcessoNegado] = useState(false);

  // Estados para controlar a abertura dos submenus por toque no mobile
  const [painelMobileAberto, setPainelMobileAberto] = useState(false);
  const [transferenciasMobileAberto, setTransferenciasMobileAberto] = useState(false);
  const [adminMobileAberto, setAdminMobileAberto] = useState(false);

  const handleNavegacao = (acao) => {
    if (acao) acao();
    if (window.innerWidth <= 768) {
      setMenuMobileAberto(false);
    }
  };

  const handleAdminClick = (aba, e) => {
    e.preventDefault();
    if (window.innerWidth <= 768) {
      setAdminMobileAberto(!adminMobileAberto);
      return;
    }

    if (usuarioLogado?.username === 'admin') {
      if (aoClicarAdmin) aoClicarAdmin(aba);
    } else {
      setMostrarModalAcessoNegado(true);
    }
  };

  const handleSubItemAdminClick = (aba, e) => {
    e.preventDefault();
    if (usuarioLogado?.username === 'admin') {
      if (aoClicarAdmin) aoClicarAdmin(aba);
      if (window.innerWidth <= 768) {
        setMenuMobileAberto(false);
      }
    } else {
      setMostrarModalAcessoNegado(true);
      if (window.innerWidth <= 768) {
        setMenuMobileAberto(false);
      }
    }
  };

  const handlePainelClick = (e) => {
    e.preventDefault();
    if (window.innerWidth <= 768) {
      setPainelMobileAberto(!painelMobileAberto);
    } else {
      handleNavegacao(aoClicarTransferencias);
    }
  };

  const handleTransferenciasClick = (e) => {
    e.preventDefault();
    if (window.innerWidth <= 768) {
      // No mobile, alterna o nível 3 (Transferência Externa / Reposição Interna)
      setTransferenciasMobileAberto(!transferenciasMobileAberto);
    } else {
      handleNavegacao(aoClicarTransferencias);
    }
  };

  return (
    <>
      <div 
        className={`sidebar-overlay ${menuMobileAberto ? 'ativo' : ''}`} 
        onClick={() => setMenuMobileAberto(false)}
      ></div>

      {/* POPUP DE ACESSO NEGADO */}
      {mostrarModalAcessoNegado && (
        <div className="modal-acesso-negado-overlay" onClick={() => setMostrarModalAcessoNegado(false)}>
          <div className="modal-acesso-negado-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-acesso-negado-icone">🚫</div>
            <h3>Acesso Restrito</h3>
            <p>Você não tem permissão para acessar esta função de Administrador.</p>
            <button className="btn-fechar-modal-acesso" onClick={() => setMostrarModalAcessoNegado(false)}>
              Entendi
            </button>
          </div>
        </div>
      )}

      <aside 
        className={`pro-sidebar ${colapsado ? 'colapsado' : ''} ${menuMobileAberto ? 'mobile-aberto' : ''}`}
        onMouseEnter={() => setColapsado(false)} 
        onMouseLeave={() => setColapsado(true)} 
      >
        <div className="sidebar-header">
          <div className="pro-sidebar-logo">
            <img src={logo} alt="Logo" className="logo-icone-imagem" />
            <h5 className="logo-texto">Lojas Neta Dantas</h5>
          </div>
        </div>

        <div className="sidebar-content">
          <nav className="menu-nav">
            <ul>
              <li className="menu-header-texto"><span>SISTEMA</span></li>
              
              {/* NÍVEL 1: PAINEL PRINCIPAL */}
              <li className={`menu-item sub-menu-parent ${painelMobileAberto ? 'mobile-expandido' : ''}`}>
                <a href="#" onClick={handlePainelClick}>
                  <span className="menu-icon"><IconHome /></span>
                  <span className="menu-title">Painel Principal</span>
                  <span className="menu-seta">▾</span>
                </a>

                {/* NÍVEL 2 */}
                <div className="sub-menu-container">
                  <ul>
                    {/* MARKETPLACE */}
                    <li className={`menu-item sub-nivel-2 ${telaAtual === 'marketplace' ? 'ativo-link' : ''}`}>
                      <a href="#" onClick={(e) => { 
                        e.preventDefault(); 
                        handleNavegacao(aoClicarMarketplace);
                      }}>
                        <span className="menu-title">Marketplace</span>
                      </a>
                    </li>

                    {/* TRANSFERÊNCIAS */}
                    <li className={`menu-item sub-menu-parent sub-nivel-2 ${telaAtual === 'painel' ? 'ativo-link' : ''} ${transferenciasMobileAberto ? 'mobile-expandido-nivel3' : ''}`}>
                      <a href="#" onClick={handleTransferenciasClick}>
                        <span className="menu-title">Transferências</span>
                        <span className="menu-seta">▸</span>
                      </a>

                      {/* NÍVEL 3: OPÇÕES DE TRANSFERÊNCIAS */}
                      <div className="sub-menu-container sub-nivel-3-container">
                        <ul>
                          <li className="menu-item sub-nivel-3">
                            <a href="#" onClick={(e) => e.preventDefault()}>
                              <span className="menu-title">Transferência Externa</span>
                            </a>
                          </li>
                          <li className="menu-item sub-nivel-3">
                            <a href="#" onClick={(e) => e.preventDefault()}>
                              <span className="menu-title">Reposição Interna</span>
                            </a>
                          </li>
                        </ul>
                      </div>
                    </li>
                  </ul>
                </div>
              </li>

              <li className={`menu-item ${telaAtual === 'historico' ? 'ativo' : ''}`}>
                <a href="#" onClick={(e) => { e.preventDefault(); handleNavegacao(aoClicarHistorico); }}>
                  <span className="menu-icon"><IconHistory /></span>
                  <span className="menu-title">Histórico</span>
                </a>
              </li>

              <li className={`menu-item ${telaAtual === 'base-dados' ? 'ativo' : ''}`}>
                <a href="#" onClick={(e) => { e.preventDefault(); handleNavegacao(aoClicarBaseDados); }}>
                  <span className="menu-icon"><IconDatabase /></span>
                  <span className="menu-title">Base de Dados</span>
                </a>
              </li>

              <li className={`menu-item ${telaAtual === 'contatos' ? 'ativo' : ''}`}>
                <a href="#" onClick={(e) => { e.preventDefault(); handleNavegacao(aoClicarContatos); }}>
                  <span className="menu-icon"><IconContact /></span>
                  <span className="menu-title">Contatos</span>
                </a>
              </li>

              {/* SEÇÃO DE GESTÃO */}
              <li className="menu-header-texto mt-2"><span>GESTÃO</span></li>
              
              {/* Dashboard */}
              <li className={`menu-item ${telaAtual === 'dashboard' ? 'ativo' : ''}`}>
                <a href="#" onClick={(e) => { e.preventDefault(); handleNavegacao(aoClicarDashboard); }}>
                  <span className="menu-icon"><IconDashboard /></span>
                  <span className="menu-title">Dashboard</span>
                </a>
              </li>

              {/* Administrador */}
              <li className={`menu-item sub-menu-parent ${adminMobileAberto ? 'mobile-expandido' : ''}`}>
                <a href="#" onClick={(e) => handleAdminClick('base-dados', e)}>
                  <span className="menu-icon icon-admin"><IconAdmin /></span>
                  <span className="menu-title text-admin">Administrador</span>
                  <span className="menu-seta">▾</span>
                </a>

                <div className="sub-menu-container">
                  <ul>
                    <li className="menu-item sub-nivel-2">
                      <a href="#" onClick={(e) => handleSubItemAdminClick('base-dados', e)}>
                        <span className="menu-title">Base de Dados</span>
                      </a>
                    </li>
                    <li className="menu-item sub-nivel-2">
                      <a href="#" onClick={(e) => handleSubItemAdminClick('usuarios', e)}>
                        <span className="menu-title">Gestão de Usuários</span>
                      </a>
                    </li>
                    <li className="menu-item sub-nivel-2">
                      <a href="#" onClick={(e) => handleSubItemAdminClick('novidades', e)}>
                        <span className="menu-title">Novidades</span>
                      </a>
                    </li>
                  </ul>
                </div>
              </li>
            </ul>
          </nav>
        </div>

        <div className="sidebar-footer">
          <ul>
            <li className="menu-item sair-item">
              <a href="#" onClick={(e) => { e.preventDefault(); aoSair(); }}>
                <span className="menu-icon"><IconLogout /></span>
                <span className="menu-title">Sair do Sistema</span>
              </a>
            </li>
          </ul>
          
          <div className="footer-usuario-info">
            <span>Logado como:</span>
            <strong>{usuarioLogado?.nome_completo || 'Usuário'}</strong>
          </div>
        </div>
      </aside>
    </>
  );
}