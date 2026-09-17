import React, { useState, useMemo } from 'react';
import '../../styles/pages/painel/painel.css';
import '../../styles/pages/painel/ranking/ranking.css';
import { calcularRanking } from '../painel/utils/calculadoraRanking';
import { useRankingData } from '../painel/hooks/useRankingData'; 

// 🚀 ADICIONADAS AS PROPS DO CARRINHO (itensPreRequisicao, aoIrParaPreRequisicao)
export default function PainelRecebimento({ recebimentos = [], requisicoes = [], aoClicarNovoRecebimento, aoAbrirDetalhesRecebimento, usuarioLogado, itensPreRequisicao = [], aoIrParaPreRequisicao }) {
  
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
  // ESTADOS DOS FILTROS (MIGRADOS DO PAINEL PRINCIPAL)
  // ==========================================
  const [filtros, setFiltros] = useState({});
  const [colunaFiltroAberta, setColunaFiltroAberta] = useState(null);

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

  const opcoesStatus = [...new Set(recebimentosAtivos.map(r => r.status))].filter(Boolean);
  const opcoesData = [...new Set(recebimentosAtivos.map(r => new Date(r.data_criacao).toLocaleDateString('pt-BR')))].filter(Boolean);

  const recebimentosFiltradosEOrdenados = useMemo(() => {
    let filtradas = [...recebimentosAtivos];

    if (filtros.status) filtradas = filtradas.filter(rec => rec.status === filtros.status);
    if (filtros.data) filtradas = filtradas.filter(rec => new Date(rec.data_criacao).toLocaleDateString('pt-BR') === filtros.data);

    return filtradas.sort((a, b) => {
      const tempoA = new Date(a.data_criacao).getTime();
      const tempoB = new Date(b.data_criacao).getTime();
      return tempoA - tempoB; 
    });
  }, [recebimentosAtivos, filtros]);

  const getStatusClass = (status) => {
    switch (status) {
      case 'Pendente': return 'status-pendente';
      case 'Em Conferência': return 'status-separacao';
      case 'Aguardando Precificação': return 'status-separado'; 
      case 'Aguardando Cadastro': return 'status-faturado'; 
      case 'Cadastrado': return 'status-recebido'; // 🚀 NOVO STATUS DE REPOSIÇÃO (Muda a cor para verde)
      case 'Concluída': return 'status-recebido';
      default: return 'status-pendente';
    }
  };

  const RenderHeaderFiltro = ({ titulo, chave, opcoes }) => {
    const estaAberto = colunaFiltroAberta === chave;
    const filtroAtivo = filtros[chave];

    return (
      <th className={`th-com-filtro ${estaAberto ? 'filtro-aberto' : ''}`}>
        <div 
          className="cabecalho-filtro" 
          onClick={() => setColunaFiltroAberta(estaAberto ? null : chave)}
        >
          {titulo}
          <span className={`icone-filtro ${filtroAtivo ? 'ativo' : 'inativo'}`}>▼</span>
        </div>

        {estaAberto && (
          <div className="filtro-dropdown">
            <div 
              className={`filtro-opcao ${!filtroAtivo ? 'selecionado' : ''}`}
              onClick={() => { setFiltros({ ...filtros, [chave]: '' }); setColunaFiltroAberta(null); }}
            >
              (Todos)
            </div>
            {opcoes.map((opcao, idx) => (
              <div 
                key={idx}
                className={`filtro-opcao ${filtroAtivo === opcao ? 'selecionado' : ''}`}
                onClick={() => { setFiltros({ ...filtros, [chave]: opcao }); setColunaFiltroAberta(null); }}
              >
                {opcao}
              </div>
            ))}
          </div>
        )}
      </th>
    );
  };

  return (
    <div className="painel-container">
      
      {colunaFiltroAberta && <div className="filtro-overlay" onClick={() => setColunaFiltroAberta(null)}></div>}

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

        {/* 🚀 BOTÕES DE AÇÃO COM O CARRINHO COMPARTILHADO INJETADO */}
        <div style={{ display: 'flex', gap: '10px' }}>
          {itensPreRequisicao.length > 0 && (
            <button 
              className="btn-nova-req" 
              onClick={aoIrParaPreRequisicao}
              style={{ backgroundColor: '#e67e22', display: 'flex', alignItems: 'center', gap: '8px' }} // Laranja destacando o carrinho
            >
              <span>🛒</span> Fazer Requisição ({itensPreRequisicao.length})
            </button>
          )}

          <button className="btn-nova-req btn-novo-pedido" onClick={aoClicarNovoRecebimento}>
            + Novo Recebimento
          </button>
        </div>
      </div>

      <div className="tabela-container-scroll">
        <table className="tabela-requisicoes">
          <thead>
            <tr>
              <th>ID Relatório</th>
              <th>NF</th>
              <RenderHeaderFiltro titulo="Status" chave="status" opcoes={opcoesStatus} />
              <RenderHeaderFiltro titulo="Data Registro" chave="data" opcoes={opcoesData} />
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
                  onClick={() => aoAbrirDetalhesRecebimento ? aoAbrirDetalhesRecebimento(rec) : null}
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
                    ) : rec.status === 'Cadastrado' ? (
                       <span style={{ color: '#27ae60', fontWeight: 'bold' }}>📦 Pronto p/ Reposição</span>
                    ) : (
                       rec.responsavel_recebedor || <span style={{ color: '#e74c3c' }}>Aguardando...</span>
                    )}
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan="8" className="td-vazio-tabela">
                  Nenhuma carga encontrada com estes filtros. Pátio limpo!
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