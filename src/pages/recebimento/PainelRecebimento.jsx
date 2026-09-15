import React, { useState, useMemo } from 'react';
import '../../styles/pages/painel/painel.css';
import '../../styles/pages/painel/ranking/ranking.css';
import { calcularRanking } from '../painel/utils/calculadoraRanking';
import { useRankingData } from '../painel/hooks/useRankingData'; 

export default function PainelRecebimento({ recebimentos = [], requisicoes = [], aoClicarNovoRecebimento, aoAbrirDetalhesRecebimento, usuarioLogado }) {
  
  // ==========================================
  // ESTADOS DO RANKING
  // ==========================================
  const [mostrarRanking, setMostrarRanking] = useState(false);
  const [dataInicioRanking, setDataInicioRanking] = useState('');
  const [dataFimRanking, setDataFimRanking] = useState('');
  const [colaboradorExpandido, setColaboradorExpandido] = useState(null);
  const [mostrarAvisoData, setMostrarAvisoData] = useState(false); 
  const [mostrarModalAcessoNegado, setMostrarModalAcessoNegado] = useState(false);

  // ==========================================
  // 🚀 ESTADOS DOS FILTROS (ESTILO EXCEL)
  // ==========================================
  const [filtroStatus, setFiltroStatus] = useState('');
  const [filtroData, setFiltroData] = useState('');
  const [ordemData, setOrdemData] = useState('asc'); 
  
  // 🚀 Controle de qual menu flutuante está aberto ('status', 'data' ou null)
  const [menuFiltroAberto, setMenuFiltroAberto] = useState(null);

  const canViewRanking = usuarioLogado?.username === 'admin' || usuarioLogado?.acesso_admin || usuarioLogado?.perm_ver_ranking;

  const {
    dadosRankingReq,
    dadosRankingRec,
    carregandoRanking,
    rankingCarregado,
    buscarDadosRankingCompleto
  } = useRankingData();

  const handleAbrirRanking = () => {
    if (canViewRanking) {
      setMostrarRanking(true);
      setColaboradorExpandido(null);
      setMostrarAvisoData(false);
      if (!rankingCarregado) {
        buscarDadosRankingCompleto();
      }
    } else {
      setMostrarModalAcessoNegado(true);
    }
  };

  const rankingCalculado = useMemo(() => {
    return calcularRanking(dadosRankingReq, dadosRankingRec, dataInicioRanking, dataFimRanking);
  }, [dadosRankingReq, dadosRankingRec, dataInicioRanking, dataFimRanking]);

  const formatarTempo = (segundos) => {
    const h = Math.floor(segundos / 3600).toString().padStart(2, '0');
    const m = Math.floor((segundos % 3600) / 60).toString().padStart(2, '0');
    const s = (segundos % 60).toString().padStart(2, '0');
    return `${h}:${m}:${s}`;
  };

  const handleExpandirColaborador = (nomeColaborador) => {
    if (!dataInicioRanking && !dataFimRanking) {
      setMostrarAvisoData(true);
      setTimeout(() => setMostrarAvisoData(false), 5000);
      return;
    }
    setMostrarAvisoData(false);
    setColaboradorExpandido(prev => prev === nomeColaborador ? null : nomeColaborador);
  };

  // ==========================================
  // LÓGICA DA TABELA DE RECEBIMENTOS E FILTROS
  // ==========================================
  const recebimentosAtivos = recebimentos.filter(rec => rec.status !== 'Concluída' && rec.status !== 'Cancelada');

  const recebimentosFiltradosEOrdenados = useMemo(() => {
    let filtrados = [...recebimentosAtivos];

    if (filtroStatus) {
      filtrados = filtrados.filter(rec => rec.status === filtroStatus);
    }

    if (filtroData) {
      filtrados = filtrados.filter(rec => {
        if (!rec.data_criacao) return false;
        const dataRecLocal = new Date(rec.data_criacao).toLocaleDateString('en-CA'); 
        return dataRecLocal === filtroData;
      });
    }

    return filtrados.sort((a, b) => {
      const tempoA = new Date(a.data_criacao).getTime();
      const tempoB = new Date(b.data_criacao).getTime();
      return ordemData === 'asc' ? tempoA - tempoB : tempoB - tempoA; 
    });
  }, [recebimentosAtivos, filtroStatus, filtroData, ordemData]);

  const getStatusClass = (status) => {
    switch (status) {
      case 'Pendente': return 'status-pendente';
      case 'Em Conferência': return 'status-separacao';
      case 'Aguardando Precificação': return 'status-separado'; 
      case 'Aguardando Cadastro': return 'status-faturado'; 
      case 'Concluída': return 'status-recebido';
      default: return 'status-pendente';
    }
  };

  return (
    <div className="painel-container">
      
      {/* 🚀 OVERLAY INVISÍVEL: Clicar fora fecha o menu flutuante */}
      {menuFiltroAberto && (
        <div 
          style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 40 }} 
          onClick={() => setMenuFiltroAberto(null)} 
        />
      )}

      {mostrarModalAcessoNegado && (
        <div className="modal-acesso-negado-overlay" onClick={() => setMostrarModalAcessoNegado(false)}>
          <div className="modal-acesso-negado-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-acesso-negado-icone">🚫</div>
            <h3>Acesso Restrito</h3>
            <p>Você não tem permissão para visualizar o Ranking da Equipe.</p>
            <button className="btn-fechar-modal-acesso" onClick={() => setMostrarModalAcessoNegado(false)}>
              Entendi
            </button>
          </div>
        </div>
      )}

      <div className="painel-header">
        <button className="btn-ranking-abrir" onClick={handleAbrirRanking}>
          🏆 Ranking da Equipe
        </button>
        
        <div className="contador-requisicoes">
          <span className="numero-destaque">{recebimentosFiltradosEOrdenados.length}</span> 
          <span>cargas exibidas na tabela</span>
        </div>

        <button className="btn-nova-req btn-novo-pedido" onClick={aoClicarNovoRecebimento}>
          + Novo Recebimento
        </button>
      </div>

      <div className="tabela-container-scroll">
        <table className="tabela-requisicoes">
          <thead>
            <tr>
              <th>ID Relatório</th>
              <th>NF</th>
              
              {/* 🚀 CABEÇALHO FILTRO EXCEL: STATUS */}
              <th style={{ position: 'relative' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  Status
                  <button 
                    onClick={() => setMenuFiltroAberto(prev => prev === 'status' ? null : 'status')}
                    style={{ 
                      background: filtroStatus ? '#3498db' : 'transparent', 
                      color: filtroStatus ? 'white' : '#7f8c8d', 
                      border: '1px solid', borderColor: filtroStatus ? '#3498db' : '#bdc3c7', 
                      borderRadius: '4px', cursor: 'pointer', padding: '2px 6px', fontSize: '0.7rem' 
                    }}
                    title="Filtrar Status"
                  >
                    ▼
                  </button>
                </div>

                {/* MENU FLUTUANTE DO STATUS */}
                {menuFiltroAberto === 'status' && (
                  <div style={{ position: 'absolute', top: '100%', left: '0', backgroundColor: 'white', border: '1px solid #bdc3c7', borderRadius: '6px', padding: '15px', boxShadow: '0 4px 12px rgba(0,0,0,0.15)', zIndex: 50, minWidth: '220px', fontWeight: 'normal' }}>
                    <label style={{ display: 'block', marginBottom: '8px', fontSize: '0.85rem', color: '#34495e', fontWeight: 'bold' }}>Filtrar por Status:</label>
                    <select 
                      value={filtroStatus} 
                      onChange={(e) => { setFiltroStatus(e.target.value); setMenuFiltroAberto(null); }}
                      style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #ccc', outline: 'none' }}
                    >
                      <option value="">Todos Ativos</option>
                      <option value="Pendente">Pendente</option>
                      <option value="Em Conferência">Em Conferência</option>
                      <option value="Aguardando Precificação">Ag. Precificação</option>
                      <option value="Aguardando Cadastro">Ag. Cadastro</option>
                    </select>
                  </div>
                )}
              </th>
              
              {/* 🚀 CABEÇALHO FILTRO EXCEL: DATA REGISTRO */}
              <th style={{ position: 'relative' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  Data Registro
                  <button 
                    onClick={() => setMenuFiltroAberto(prev => prev === 'data' ? null : 'data')}
                    style={{ 
                      background: (filtroData || ordemData !== 'asc') ? '#3498db' : 'transparent', 
                      color: (filtroData || ordemData !== 'asc') ? 'white' : '#7f8c8d', 
                      border: '1px solid', borderColor: (filtroData || ordemData !== 'asc') ? '#3498db' : '#bdc3c7', 
                      borderRadius: '4px', cursor: 'pointer', padding: '2px 6px', fontSize: '0.7rem' 
                    }}
                    title="Filtrar e Ordenar Data"
                  >
                    ▼
                  </button>
                </div>

                {/* MENU FLUTUANTE DA DATA */}
                {menuFiltroAberto === 'data' && (
                  <div style={{ position: 'absolute', top: '100%', left: '0', backgroundColor: 'white', border: '1px solid #bdc3c7', borderRadius: '6px', padding: '15px', boxShadow: '0 4px 12px rgba(0,0,0,0.15)', zIndex: 50, minWidth: '220px', fontWeight: 'normal' }}>
                    
                    <label style={{ display: 'block', marginBottom: '8px', fontSize: '0.85rem', color: '#34495e', fontWeight: 'bold' }}>Buscar Data Exata:</label>
                    <input 
                      type="date" 
                      value={filtroData} 
                      onChange={(e) => { setFiltroData(e.target.value); setMenuFiltroAberto(null); }}
                      style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #ccc', marginBottom: '15px', outline: 'none' }}
                    />

                    <label style={{ display: 'block', marginBottom: '8px', fontSize: '0.85rem', color: '#34495e', fontWeight: 'bold' }}>Ordem de Exibição:</label>
                    <select 
                      value={ordemData} 
                      onChange={(e) => { setOrdemData(e.target.value); setMenuFiltroAberto(null); }}
                      style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #ccc', outline: 'none', marginBottom: (filtroData || ordemData !== 'asc') ? '15px' : '0' }}
                    >
                      <option value="asc">↑ Mais Antigos Primeiro</option>
                      <option value="desc">↓ Mais Recentes Primeiro</option>
                    </select>

                    {/* Botão de Limpar (Só aparece se tiver algo filtrado) */}
                    {(filtroData || ordemData !== 'asc') && (
                      <button 
                        onClick={() => { setFiltroData(''); setOrdemData('asc'); setMenuFiltroAberto(null); }}
                        style={{ width: '100%', padding: '8px', backgroundColor: '#e74c3c', color: 'white', border: 'none', borderRadius: '4px', fontWeight: 'bold', cursor: 'pointer' }}
                      >
                        ✖ Limpar Filtros
                      </button>
                    )}
                  </div>
                )}
              </th>
              
              <th>Loja Destino</th>
              <th>Fornecedor / Marca</th>
              <th>Volumes</th>
              <th>Responsável(is)</th>
            </tr>
          </thead>
          <tbody>
            {recebimentosFiltradosEOrdenados.length > 0 ? (
              recebimentosFiltradosEOrdenados.map((rec) => (
                <tr 
                  key={rec.id} 
                  className="linha-tabela-hover linha-tabela-clicavel"
                  onClick={() => aoAbrirDetalhesRecebimento ? aoAbrirDetalhesRecebimento(rec) : alert("Em breve: Detalhes do recebimento!")}
                >
                  <td className="td-motivo-bold">{rec.numero_relatorio}</td>
                  <td style={{ color: '#e67e22', fontWeight: 'bold' }}>{rec.numero_nf}</td>
                  <td>
                    <span className={`status-badge ${getStatusClass(rec.status)}`}>
                      {rec.status}
                    </span>
                  </td>
                  <td>{new Date(rec.data_criacao).toLocaleDateString('pt-BR')}</td>
                  <td><strong>{rec.loja_recebedora}</strong></td>
                  <td>
                    <strong>{rec.nome_fornecedor}</strong>
                    <span className="span-prioridade-subtexto" style={{ display: 'block', marginTop: '2px' }}>
                      {rec.marca}
                    </span>
                  </td>
                  <td>{rec.volumes} cx</td>
                  <td className="td-historico-texto">
                    {rec.status === 'Aguardando Precificação' ? (
                       <span style={{ color: '#d35400', fontWeight: 'bold' }}>💲 Falta Precificar</span>
                    ) : rec.status === 'Aguardando Cadastro' ? (
                       <span style={{ color: '#2980b9', fontWeight: 'bold' }}>⏳ Falta Lançar Sist.</span>
                    ) : (
                       rec.responsavel_recebedor || <span style={{ color: '#e74c3c' }}>Aguardando...</span>
                    )}
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan="8" className="td-vazio-tabela">
                  {filtroStatus || filtroData ? 'Nenhuma carga encontrada com os filtros selecionados.' : 'Nenhuma carga pendente no momento. Pátio limpo!'}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* ========================================== */}
      {/* MODAL DO RANKING                             */}
      {/* ========================================== */}
      {mostrarRanking && (
        <div className="ranking-modal-overlay" onClick={() => setMostrarRanking(false)}>
          <div className="ranking-modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="ranking-modal-header">
              <h3>🏆 Top Separadores (Pontuação Unificada)</h3>
              <button className="btn-fechar-ranking" onClick={() => setMostrarRanking(false)}>✖</button>
            </div>
            
            <div className="ranking-modal-body">
              <div className="ranking-filtros">
                <div style={{ display: 'flex', gap: '15px', flexWrap: 'wrap' }}>
                  <div className="filtro-grupo">
                    <label>Data Início:</label>
                    <input type="date" value={dataInicioRanking} onChange={(e) => {setDataInicioRanking(e.target.value); setMostrarAvisoData(false);}} />
                  </div>
                  <div className="filtro-grupo">
                    <label>Data Fim:</label>
                    <input type="date" value={dataFimRanking} onChange={(e) => {setDataFimRanking(e.target.value); setMostrarAvisoData(false);}} />
                  </div>
                </div>
                
                <div style={{ display: 'flex', gap: '10px', alignItems: 'flex-end' }}>
                  <button className="btn-limpar-ranking" onClick={() => {setDataInicioRanking(''); setDataFimRanking(''); setColaboradorExpandido(null); setMostrarAvisoData(false);}}>Limpar</button>
                  <button 
                    className="btn-limpar-ranking" 
                    style={{ backgroundColor: '#3498db', borderColor: '#2980b9', color: 'white', fontWeight: 'bold' }} 
                    onClick={buscarDadosRankingCompleto} 
                    disabled={carregandoRanking}
                  >
                    {carregandoRanking ? '⏳...' : '🔄 Atualizar'}
                  </button>
                </div>
              </div>

              {mostrarAvisoData && (
                <div className="alerta-filtro-periodo">
                  <span>⚠️</span>
                  Selecione uma Data de Início e/ou Fim para visualizar o extrato detalhado do colaborador.
                </div>
              )}

              {carregandoRanking ? (
                <div className="div-vazia-ranking" style={{ color: '#8e44ad', fontWeight: 'bold' }}>
                  ⏳ Baixando histórico completo da nuvem para montar o ranking...
                </div>
              ) : rankingCalculado.length === 0 ? (
                <div className="div-vazia-ranking">
                  Nenhum dado finalizado neste período.
                </div>
              ) : (
                <>
                  <div className="podio-container">
                    {rankingCalculado[1] && (
                      <div className="podio-lugar podio-prata">
                        <div className="podio-avatar">🥈</div>
                        <span className="podio-nome">{rankingCalculado[1].nome}</span>
                        <span className="podio-nota">{rankingCalculado[1].pontuacao} pts</span>
                      </div>
                    )}
                    {rankingCalculado[0] && (
                      <div className="podio-lugar podio-ouro">
                        <div className="podio-avatar">🥇</div>
                        <span className="podio-nome">{rankingCalculado[0].nome}</span>
                        <span className="podio-nota">{rankingCalculado[0].pontuacao} pts</span>
                      </div>
                    )}
                    {rankingCalculado[2] && (
                      <div className="podio-lugar podio-bronze">
                        <div className="podio-avatar">🥉</div>
                        <span className="podio-nome">{rankingCalculado[2].nome}</span>
                        <span className="podio-nota">{rankingCalculado[2].pontuacao} pts</span>
                      </div>
                    )}
                  </div>

                  <table className="tabela-ranking">
                    <thead>
                      <tr>
                        <th>Posição</th>
                        <th>Colaborador</th>
                        <th>Tarefas</th>
                        <th>Total Peças</th>
                        <th>Velocidade Média</th>
                        <th>Pontuação 🏆</th>
                      </tr>
                    </thead>
                    <tbody>
                      {rankingCalculado.map((colab, index) => (
                        <React.Fragment key={index}>
                          <tr 
                            className={`linha-tabela-clicavel ${index === 0 ? 'linha-ranking-primeiro' : 'linha-ranking-normal'}`}
                            onClick={() => handleExpandirColaborador(colab.nome)}
                            title="Clique para ver o extrato de pontuação"
                          >
                            <td>{index + 1}º</td>
                            <td><strong>{colab.nome}</strong></td>
                            <td>{colab.qtdSeparacoes}</td>
                            <td>{colab.totalItens} un</td>
                            <td>{colab.upm} un/min</td>
                            <td className="upm-destaque">
                              {colab.pontuacao} pts
                            </td>
                          </tr>
                          
                          {colaboradorExpandido === colab.nome && (
                            <tr className="linha-expandida-extrato">
                              <td colSpan="6" className="extrato-td-container">
                                <div className="extrato-card">
                                  <h4 className="extrato-titulo">
                                    🧾 Extrato de Operações — {colab.nome}
                                  </h4>
                                  <table className="extrato-tabela">
                                    <thead>
                                      <tr className="extrato-thead-tr">
                                        <th>Nº Tarefa</th>
                                        <th>Tipo (Motivo)</th>
                                        <th>Tempo Gasto</th>
                                        <th>Itens Bipados</th>
                                        <th>UPM Real</th>
                                        <th className="extrato-th-destaque">Pontos Ganhos</th>
                                      </tr>
                                    </thead>
                                    <tbody>
                                      {colab.historicoReqs.map((h, i) => (
                                        <tr key={i}>
                                          <td><strong>{h.id}</strong></td>
                                          <td>
                                            {h.isReposicaoInterna ? (
                                              <span className="badge-reposicao-interna">⭐ Reposição Interna (x2)</span>
                                            ) : (
                                              <span>{h.motivo}</span>
                                            )}
                                          </td>
                                          <td>{formatarTempo(h.tempoSegundos)}</td>
                                          <td>{h.itensFisicos} un</td>
                                          <td>{h.upm} un/min</td>
                                          <td className="extrato-pontos-positivos">
                                            +{h.pontos} pts
                                          </td>
                                        </tr>
                                      ))}
                                    </tbody>
                                  </table>
                                </div>
                              </td>
                            </tr>
                          )}
                        </React.Fragment>
                      ))}
                    </tbody>
                  </table>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}