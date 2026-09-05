import { useState } from 'react';
import '../../styles/components/menu/menu.css';
import logo from '../../assets/logo.jpeg';

// --- ÍCONES PROFISSIONAIS (SVG) ---
const IconHome = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
);

const IconPlusCircle = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="16"/><line x1="8" y1="12" x2="16" y2="12"/></svg>
);

const IconCheckSquare = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 11 12 14 22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></svg>
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

const IconMetas = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/></svg>
);

const IconLogout = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" x2="9" y1="12" y2="12"/></svg>
);

export default function Menu({ 
  aoClicarTransferencias, aoClicarMarketplace, aoClicarPainelRecebimento, aoClicarHistorico, aoClicarBaseDados, aoClicarAdmin, aoClicarContatos, aoClicarDashboard, aoClicarMetas, aoClicarNovaRequisicao, aoClicarNovoRecebimento,
  usuarioLogado, aoSair, telaAtual, menuMobileAberto, setMenuMobileAberto 
}) { 
  const [colapsado, setColapsado] = useState(true);
  const [mostrarModalAcessoNegado, setMostrarModalAcessoNegado] = useState(false);

  const [painelMobileAberto, setPainelMobileAberto] = useState(false);
  const [adminMobileAberto, setAdminMobileAberto] = useState(false);

  const isMaster = usuarioLogado?.username === 'admin' || usuarioLogado?.acesso_admin;
  const canViewHistory = isMaster || usuarioLogado?.perm_ver_relatorios;
  const canUpdateStock = isMaster || usuarioLogado?.perm_atualizar_estoque;
  const canManageUsers = isMaster || usuarioLogado?.perm_gerenciar_usuarios;
  const canManageMetas = isMaster || usuarioLogado?.perm_gerenciar_metas;
  const canViewStockData = isMaster || usuarioLogado?.perm_consulta_estoque;
  const canManageNovidades = isMaster || usuarioLogado?.perm_gerenciar_novidades;
  const canViewDashboard = isMaster || usuarioLogado?.perm_dashboard;
  
  const canSeeAdminMenu = isMaster || canUpdateStock || canManageUsers || canManageNovidades;

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

    if (canSeeAdminMenu) {
      const abaDestino = canUpdateStock ? 'base-dados' : (canManageUsers ? 'usuarios' : 'novidades');
      if (aoClicarAdmin) aoClicarAdmin(abaDestino);
    } else {
      setMostrarModalAcessoNegado(true);
      if (window.innerWidth <= 768) setMenuMobileAberto(false);
    }
  };

  const handleSubItemAdminClick = (aba, e) => {
    e.preventDefault();
    
    if (
      (aba === 'base-dados' && !canUpdateStock) ||
      (aba === 'usuarios' && !canManageUsers) ||
      (aba === 'novidades' && !canManageNovidades)
    ) {
      setMostrarModalAcessoNegado(true);
      if (window.innerWidth <= 768) setMenuMobileAberto(false);
      return;
    }

    if (canSeeAdminMenu) {
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

  return (
    <>
      <div 
        className={`sidebar-overlay ${menuMobileAberto ? 'ativo' : ''}`} 
        onClick={() => setMenuMobileAberto(false)}
      ></div>

      {mostrarModalAcessoNegado && (
        <div className="modal-acesso-negado-overlay" onClick={() => setMostrarModalAcessoNegado(false)}>
          <div className="modal-acesso-negado-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-acesso-negado-icone">🚫</div>
            <h3>Acesso Restrito</h3>
            <p>Você não tem permissão para acessar esta funcionalidade.</p>
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
              
              {/* NÍVEL 1: PAINEL PRINCIPAL (Transferência, Marketplace, Recebimento) */}
              <li className={`menu-item sub-menu-parent ${painelMobileAberto ? 'mobile-expandido' : ''}`}>
                <a href="#" onClick={handlePainelClick}>
                  <span className="menu-icon"><IconHome /></span>
                  <span className="menu-title">Painel Principal</span>
                  <span className="menu-seta">▾</span>
                </a>

                <div className="sub-menu-container">
                  <ul>
                    <li className={`menu-item sub-nivel-2 ${telaAtual === 'painel' ? 'ativo-link' : ''}`}>
                      <a href="#" onClick={(e) => { 
                        e.preventDefault(); 
                        handleNavegacao(aoClicarTransferencias);
                      }}>
                        <span className="menu-title">Transferência</span>
                      </a>
                    </li>

                    <li className={`menu-item sub-nivel-2 ${telaAtual === 'marketplace' ? 'ativo-link' : ''}`}>
                      <a href="#" onClick={(e) => { 
                        e.preventDefault(); 
                        handleNavegacao(aoClicarMarketplace);
                      }}>
                        <span className="menu-title">Marketplace</span>
                      </a>
                    </li>

                    {/* NOVO SUBMENU: PAINEL DE RECEBIMENTO */}
                    <li className={`menu-item sub-nivel-2 ${telaAtual === 'painel-recebimento' ? 'ativo-link' : ''}`}>
                      <a href="#" onClick={(e) => { 
                        e.preventDefault(); 
                        handleNavegacao(aoClicarPainelRecebimento);
                      }}>
                        <span className="menu-title">Recebimento</span>
                      </a>
                    </li>
                  </ul>
                </div>
              </li>

              {/* NOVA REQUISIÇÃO */}
              <li className={`menu-item ${telaAtual === 'nova' ? 'ativo' : ''}`}>
                <a href="#" onClick={(e) => { e.preventDefault(); handleNavegacao(aoClicarNovaRequisicao); }}>
                  <span className="menu-icon"><IconPlusCircle /></span>
                  <span className="menu-title">Nova Requisição</span>
                </a>
              </li>

              {/* NOVO RECEBIMENTO */}
              <li className={`menu-item ${telaAtual === 'novo-recebimento' ? 'ativo' : ''}`}>
                <a href="#" onClick={(e) => { 
                  e.preventDefault(); 
                  if (aoClicarNovoRecebimento) handleNavegacao(aoClicarNovoRecebimento);
                  else alert("📦 O módulo de Recebimento está em desenvolvimento!");
                }}>
                  <span className="menu-icon"><IconCheckSquare /></span>
                  <span className="menu-title">Novo Recebimento</span>
                </a>
              </li>

              {/* HISTÓRICO */}
              <li className={`menu-item ${telaAtual === 'historico' ? 'ativo' : ''}`}>
                <a href="#" onClick={(e) => { 
                  e.preventDefault(); 
                  if (canViewHistory) {
                    handleNavegacao(aoClicarHistorico);
                  } else {
                    setMostrarModalAcessoNegado(true);
                    if (window.innerWidth <= 768) setMenuMobileAberto(false);
                  }
                }}>
                  <span className="menu-icon"><IconHistory /></span>
                  <span className="menu-title">Histórico</span>
                </a>
              </li>

              {/* CONSULTA DE ESTOQUE */}
              <li className={`menu-item ${telaAtual === 'base-dados' ? 'ativo' : ''}`}>
                <a href="#" onClick={(e) => { 
                  e.preventDefault(); 
                  if (canViewStockData) {
                    handleNavegacao(aoClicarBaseDados);
                  } else {
                    setMostrarModalAcessoNegado(true);
                    if (window.innerWidth <= 768) setMenuMobileAberto(false);
                  }
                }}>
                  <span className="menu-icon"><IconDatabase /></span>
                  <span className="menu-title">Consulta de Estoque</span>
                </a>
              </li>

              <li className={`menu-item ${telaAtual === 'contatos' ? 'ativo' : ''}`}>
                <a href="#" onClick={(e) => { e.preventDefault(); handleNavegacao(aoClicarContatos); }}>
                  <span className="menu-icon"><IconContact /></span>
                  <span className="menu-title">Contatos</span>
                </a>
              </li>

              <li className="menu-header-texto mt-2"><span>GESTÃO</span></li>
              
              {/* Dashboard */}
              <li className={`menu-item ${telaAtual === 'dashboard' ? 'ativo' : ''}`}>
                <a href="#" onClick={(e) => { 
                  e.preventDefault(); 
                  if (canViewDashboard) {
                    handleNavegacao(aoClicarDashboard);
                  } else {
                    setMostrarModalAcessoNegado(true);
                    if (window.innerWidth <= 768) setMenuMobileAberto(false);
                  }
                }}>
                  <span className="menu-icon"><IconDashboard /></span>
                  <span className="menu-title">Dashboard</span>
                </a>
              </li>

              <li className={`menu-item ${telaAtual === 'metas' ? 'ativo' : ''}`}>
                <a href="#" onClick={(e) => { 
                  e.preventDefault(); 
                  if (canManageMetas) {
                    if (aoClicarMetas) handleNavegacao(aoClicarMetas);
                    else alert("🚀 O módulo de Metas de Estoque está em desenvolvimento!");
                  } else {
                    setMostrarModalAcessoNegado(true);
                    if (window.innerWidth <= 768) setMenuMobileAberto(false);
                  }
                }}>
                  <span className="menu-icon"><IconMetas /></span>
                  <span className="menu-title">Metas Estoque</span>
                </a>
              </li>

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