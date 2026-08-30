import ModalNovidades from '../../components/novidades/ModalNovidades';
import React, { useState, useMemo, useEffect, useRef } from 'react';
import '../../styles/pages/painel/painel.css';
import '../../styles/pages/painel/ranking/ranking.css';
import PainelMarketplace from '../marketplace/painel/PainelMarketplace'; 
import { supabase } from '../../services/supabase';
import { calcularRanking } from './utils/calculadoraRanking';

export default function Painel({ aoClicarNovo, aoClicarNovoPedido, requisicoes, pedidosMarketplace = [], aoAbrirDetalhes }) {
  
  const [abaAtiva, setAbaAtiva] = useState('interna'); 

  const [mostrarRanking, setMostrarRanking] = useState(false);
  const [dataInicioRanking, setDataInicioRanking] = useState('');
  const [dataFimRanking, setDataFimRanking] = useState('');
  
  // Estados do Extrato e Alertas visuais
  const [colaboradorExpandido, setColaboradorExpandido] = useState(null);
  const [mostrarAvisoData, setMostrarAvisoData] = useState(false); 

  const [filtros, setFiltros] = useState({});
  const [colunaFiltroAberta, setColunaFiltroAberta] = useState(null);

  const [alertaDelta, setAlertaDelta] = useState({ visivel: false, estagio: 'pergunta', produtos: [], id: null });

  const [idsDestacados, setIdsDestacados] = useState([]);
  const reqsAnterioresRef = useRef(requisicoes);

  useEffect(() => {
    let isMounted = true;
    let timerId = null;

    const loopBuscaAlerta = async () => {
      if (!isMounted) return;

      try {
        const { data, error } = await supabase
          .from('alertas_reposicao')
          .select('*')
          .order('data_criacao', { ascending: false })
          .limit(1);

        if (!error && data && data.length > 0) {
          const alerta = data[0];
          const jaIgnorado = localStorage.getItem(`alerta_ignorado_${alerta.id}`);
          if (!jaIgnorado) {
            setAlertaDelta(prev => {
              if (prev.id !== alerta.id) {
                return { visivel: true, estagio: 'pergunta', produtos: alerta.lista_produtos, id: alerta.id };
              }
              return prev;
            });
          }
        }
      } catch (e) {}

      if (isMounted) {
        timerId = setTimeout(loopBuscaAlerta, 5000);
      }
    };

    loopBuscaAlerta();

    return () => {
      isMounted = false;
      if (timerId) clearTimeout(timerId);
    };
  }, []);

  const handleRecusarAlerta = () => {
    setAlertaDelta(prev => ({ ...prev, estagio: 'despedida' }));
    localStorage.setItem(`alerta_ignorado_${alertaDelta.id}`, 'true');
    setTimeout(() => {
      setAlertaDelta(prev => ({ ...prev, visivel: false }));
    }, 3000);
  };

  const handleAceitarAlerta = () => {
    localStorage.setItem(`alerta_ignorado_${alertaDelta.id}`, 'true');
    setAlertaDelta(prev => ({ ...prev, visivel: false }));
    aoClicarNovo(alertaDelta.produtos); 
  };

  useEffect(() => {
    const alteradas = [];
    const agora = Date.now();

    requisicoes.forEach(reqAtual => {
      if (reqAtual.timestampCriacao && (agora - reqAtual.timestampCriacao < 5000)) {
        alteradas.push(reqAtual.id);
      } else {
        if (reqsAnterioresRef.current.length > 0) {
          const reqAntiga = reqsAnterioresRef.current.find(r => r.id === reqAtual.id);
          if (!reqAntiga || reqAntiga.status !== reqAtual.status) {
            alteradas.push(reqAtual.id);
          }
        }
      }
    });

    if (alteradas.length > 0) {
      setIdsDestacados(prev => [...new Set([...prev, ...alteradas])]);
      setTimeout(() => {
        setIdsDestacados(prev => prev.filter(id => !alteradas.includes(id)));
      }, 3500);
    }
    
    reqsAnterioresRef.current = requisicoes;
  }, [requisicoes]);

  const temPedidoPendente = pedidosMarketplace.some(ped => ped.status === 'Pendente');
  const ordemProcesso = ['Em Separação', 'Saída de produtos', 'Faturamento', 'Transporte', 'Recebimento'];
  
  // ======================================================================================
  // Concluída é o gatilho para sumir
  // ======================================================================================
  const requisicoesAtivas = requisicoes.filter(req => req.status !== 'Concluída' && req.status !== 'Cancelada');

  const getNomeLojaCurto = (nomeLoja) => {
    if (!nomeLoja) return '-';
    if (nomeLoja.includes('Araturi')) return 'Araturi';
    if (nomeLoja.includes('Conjunto Ceará') || nomeLoja.includes('Conjunto Ceara')) return 'Conjunto Ceará';
    if (nomeLoja.includes('Messejana')) return 'Messejana';
    if (nomeLoja.includes('Mulungu')) return 'Mulungu';
    return nomeLoja; 
  };

  const colunasDinamicas = ordemProcesso.filter(etapa => 
    requisicoesAtivas.some(req => req.historico && req.historico[etapa])
  );

  const requisicoesFiltradasEOrdenadas = useMemo(() => {
    let filtradas = requisicoesAtivas;
    
    if (filtros.motivo) filtradas = filtradas.filter(req => req.motivo === filtros.motivo);
    if (filtros.status) filtradas = filtradas.filter(req => req.status === filtros.status);
    if (filtros.destino) filtradas = filtradas.filter(req => getNomeLojaCurto(req.destino) === filtros.destino);
    if (filtros.data) filtradas = filtradas.filter(req => req.data === filtros.data);
    if (filtros.solicitante) filtradas = filtradas.filter(req => req.solicitante === filtros.solicitante);

    colunasDinamicas.forEach(coluna => {
      if (filtros[coluna]) {
        filtradas = filtradas.filter(req => req.historico && req.historico[coluna] === filtros[coluna]);
      }
    });

    return filtradas.sort((a, b) => {
      const aDestacado = idsDestacados.includes(a.id);
      const bDestacado = idsDestacados.includes(b.id);
      if (aDestacado && !bDestacado) return -1; 
      if (!aDestacado && bDestacado) return 1;  

      // Joga Transporte e Recebimento para o final da fila (menor prioridade visual)
      const aBaixaPrioridade = a.status === 'Transporte' || a.status === 'Recebimento';
      const bBaixaPrioridade = b.status === 'Transporte' || b.status === 'Recebimento';
      if (aBaixaPrioridade && !bBaixaPrioridade) return 1;
      if (!aBaixaPrioridade && bBaixaPrioridade) return -1;

      const prioA = a.prioridade || 3; 
      const prioB = b.prioridade || 3;
      if (prioA !== prioB) return prioA - prioB; 
      
      const tempoA = a.timestampCriacao || 0;
      const tempoB = b.timestampCriacao || 0;
      return tempoA - tempoB; 
    });
  }, [requisicoesAtivas, filtros, colunasDinamicas, idsDestacados]);

  const opcoesMotivo = [...new Set(requisicoesAtivas.map(r => r.motivo))].filter(Boolean);
  const opcoesStatus = [...new Set(requisicoesAtivas.map(r => r.status))].filter(Boolean);
  const opcoesDestino = [...new Set(requisicoesAtivas.map(r => getNomeLojaCurto(r.destino)))].filter(Boolean);
  const opcoesData = [...new Set(requisicoesAtivas.map(r => r.data))].filter(Boolean);
  const opcoesSolicitante = [...new Set(requisicoesAtivas.map(r => r.solicitante))].filter(Boolean);

  const getStatusClass = (status) => {
    switch (status) {
      case 'Pendente': return 'status-pendente';
      case 'Em Separação': return 'status-separacao';
      case 'Separado': return 'status-separado';
      case 'Saída de produtos': return 'status-separado';
      case 'Faturamento': return 'status-faturado';
      case 'Transporte': return 'status-enviado'; // Azul claro padrão (verifique o CSS .status-enviado)
      case 'Recebimento': return 'status-enviado'; // Recebimento agora ganha o mesmo visual azul do transporte
      case 'Concluída': return 'status-recebido'; 
      case 'Cancelada': return 'status-pendente';
      default: return 'status-pendente';
    }
  };

  const getLinhaPrioridadeClass = (req) => {
    // Transporte e Recebimento usam a cor da prioridade baixa para ficarem esmaecidos no fundo
    if (req.status === 'Transporte' || req.status === 'Recebimento') return 'prioridade-baixa';
    
    switch (req.prioridade) {
      case 1: return 'prioridade-alta';   
      case 2: return 'prioridade-media';  
      case 3: return 'prioridade-baixa';  
      default: return ''; 
    }
  };

  const rankingCalculado = useMemo(() => {
    return calcularRanking(requisicoes, dataInicioRanking, dataFimRanking);
  }, [requisicoes, dataInicioRanking, dataFimRanking]);

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
      
      {/* INJEÇÃO DO MODAL DE NOVIDADES */}
      <ModalNovidades />

      {alertaDelta.visivel && (
        <div className="chat-notificacao-container">
          <div className="chat-notificacao-header">
            <span className="chat-notificacao-icone">📦</span>
            <span>Atualização do CD</span>
          </div>
          <div className="chat-notificacao-body">
            {alertaDelta.estagio === 'pergunta' ? (
              <>
                <p>Foram identificados novos produtos na base de dados ou atualização de saldo de produtos.</p>
                <p className="chat-pergunta-bold">Gostaria de fazer uma nova requisição com esses produtos?</p>
              </>
            ) : (
              <p className="chat-despedida-azul">
                Tudo bem, quem sabe na próxima! 😉
              </p>
            )}
          </div>
          {alertaDelta.estagio === 'pergunta' && (
            <div className="chat-notificacao-footer">
              <button className="btn-chat-nao" onClick={handleRecusarAlerta}>Não, obrigado</button>
              <button className="btn-chat-sim" onClick={handleAceitarAlerta}>Sim, iniciar</button>
            </div>
          )}
        </div>
      )}

      {colunaFiltroAberta && <div className="filtro-overlay" onClick={() => setColunaFiltroAberta(null)}></div>}

      <div className="abas-container">
        <button className={`aba-btn ${abaAtiva === 'interna' ? 'ativa' : ''}`} onClick={() => setAbaAtiva('interna')}>
          🏢 Transferências Internas
        </button>
        
        <button className={`aba-btn ${abaAtiva === 'marketplace' ? 'ativa' : ''}`} onClick={() => setAbaAtiva('marketplace')}>
          🛒 Marketplace {temPedidoPendente && <span className="alerta-pisca">!</span>}
        </button>

        <div className="ranking-btn-container">
          <button className="btn-ranking-abrir" onClick={() => { setMostrarRanking(true); setColaboradorExpandido(null); setMostrarAvisoData(false); }}>🏆 Ranking da Equipe</button>
        </div>
      </div>

      {abaAtiva === 'interna' && (
        <>
          <div className="painel-header">
            <h2>Visão Geral</h2>
            
            <div className="contador-requisicoes">
              <span className="numero-destaque">{requisicoesAtivas.length}</span> 
              <span>requisições pendentes de conclusão</span>
            </div>

            <button className="btn-nova-req" onClick={() => aoClicarNovo()}>+ Nova Requisição</button>
          </div>

          <div className="tabela-container-scroll">
            <table className="tabela-requisicoes">
              <thead>
                <tr>
                  <RenderHeaderFiltro titulo="Motivo / Prioridade" chave="motivo" opcoes={opcoesMotivo} />
                  <th>ID</th>
                  <RenderHeaderFiltro titulo="Status" chave="status" opcoes={opcoesStatus} />
                  <RenderHeaderFiltro titulo="Data" chave="data" opcoes={opcoesData} />
                  <RenderHeaderFiltro titulo="Solicitante" chave="solicitante" opcoes={opcoesSolicitante} />
                  <RenderHeaderFiltro titulo="Loja Destino" chave="destino" opcoes={opcoesDestino} />
                  <th>Itens</th>
                  
                  {colunasDinamicas.map(coluna => (
                    <RenderHeaderFiltro 
                      key={coluna}
                      titulo={`Resp. ${coluna}`} 
                      chave={coluna} 
                      opcoes={[...new Set(requisicoesAtivas.map(r => r.historico && r.historico[coluna]).filter(Boolean))]} 
                    />
                  ))}
                </tr>
              </thead>
              <tbody>
                {requisicoesFiltradasEOrdenadas.length > 0 ? (
                  requisicoesFiltradasEOrdenadas.map((req) => (
                    <tr 
                      key={req.id} 
                      onClick={() => aoAbrirDetalhes(req)} 
                      className={`linha-tabela-hover linha-tabela-clicavel ${getLinhaPrioridadeClass(req)} ${idsDestacados.includes(req.id) ? 'piscar-linha-nova' : ''}`}
                    >
                      <td className="td-motivo-bold" title={req.motivo || ''}>
                        {req.motivo 
                          ? (req.motivo.length > 25 ? `${req.motivo.substring(0, 25)}...` : req.motivo) 
                          : '-'} 
                        {req.prioridade && <span className="span-prioridade-subtexto">Prioridade {req.prioridade}</span>}
                      </td>
                      
                      <td>{req.id}</td>
                      <td><span className={`status-badge ${getStatusClass(req.status)}`}>{req.status}</span></td>
                      <td>{req.data}</td>
                      <td><strong>{req.solicitante}</strong></td>
                      <td>{getNomeLojaCurto(req.destino)}</td>
                      <td>{req.itens}</td>
                      
                      {colunasDinamicas.map(coluna => (
                        <td key={coluna} className="td-historico-texto">
                          {req.historico && req.historico[coluna] ? req.historico[coluna] : '-'}
                        </td>
                      ))}
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={7 + colunasDinamicas.length} className="td-vazio-tabela">
                      Nenhuma requisição encontrada com os filtros selecionados. A operação está limpa!
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </>
      )}

      {abaAtiva === 'marketplace' && (
        <PainelMarketplace 
          pedidosMarketplace={pedidosMarketplace} 
          aoClicarNovoPedido={aoClicarNovoPedido} 
          aoAbrirDetalhes={aoAbrirDetalhes} 
        />
      )}

      {mostrarRanking && (
        <div className="ranking-modal-overlay" onClick={() => setMostrarRanking(false)}>
          <div className="ranking-modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="ranking-modal-header">
              <h3>🏆 Top Separadores (Pontuação de Produtividade)</h3>
              <button className="btn-fechar-ranking" onClick={() => setMostrarRanking(false)}>✖</button>
            </div>
            
            <div className="ranking-modal-body">
              <div className="ranking-filtros">
                <div className="filtro-grupo">
                  <label>Data Início:</label>
                  <input type="date" value={dataInicioRanking} onChange={(e) => {setDataInicioRanking(e.target.value); setMostrarAvisoData(false);}} />
                </div>
                <div className="filtro-grupo">
                  <label>Data Fim:</label>
                  <input type="date" value={dataFimRanking} onChange={(e) => {setDataFimRanking(e.target.value); setMostrarAvisoData(false);}} />
                </div>
                <button className="btn-limpar-ranking" onClick={() => {setDataInicioRanking(''); setDataFimRanking(''); setColaboradorExpandido(null); setMostrarAvisoData(false);}}>Limpar</button>
              </div>

              {mostrarAvisoData && (
                <div className="alerta-filtro-periodo">
                  <span>⚠️</span>
                  Selecione uma Data de Início e/ou Fim para visualizar o extrato detalhado do colaborador.
                </div>
              )}

              {rankingCalculado.length === 0 ? (
                <div className="div-vazia-ranking">
                  Nenhum dado de separação finalizado neste período.
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
                        <th>Pedidos</th>
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
                            <tr style={{ backgroundColor: '#f9fafd' }}>
                              <td colSpan="6" style={{ padding: '20px', borderBottom: '2px solid #bdc3c7' }}>
                                <div style={{ border: '1px solid #dcdde1', borderRadius: '8px', padding: '15px', backgroundColor: '#ffffff', boxShadow: '0 2px 4px rgba(0,0,0,0.05)' }}>
                                  <h4 style={{ margin: '0 0 15px 0', color: '#2c3e50', borderBottom: '1px solid #ecf0f1', paddingBottom: '8px' }}>
                                    🧾 Extrato de Pedidos — {colab.nome}
                                  </h4>
                                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.9rem', textAlign: 'left' }}>
                                    <thead>
                                      <tr style={{ backgroundColor: '#f4f6f8', color: '#7f8c8d' }}>
                                        <th style={{ padding: '10px' }}>Nº Req</th>
                                        <th style={{ padding: '10px' }}>Tipo (Motivo)</th>
                                        <th style={{ padding: '10px' }}>Tempo de Separação</th>
                                        <th style={{ padding: '10px' }}>Itens Bipados</th>
                                        <th style={{ padding: '10px' }}>UPM Real</th>
                                        <th style={{ padding: '10px', color: '#e67e22' }}>Pontos Ganhos</th>
                                      </tr>
                                    </thead>
                                    <tbody>
                                      {colab.historicoReqs.map(h => (
                                        <tr key={h.id} style={{ borderBottom: '1px solid #ecf0f1' }}>
                                          <td style={{ padding: '10px' }}><strong>{h.id}</strong></td>
                                          <td style={{ padding: '10px' }}>
                                            {h.isReposicaoInterna ? (
                                              <span style={{ color: '#8e44ad', fontWeight: 'bold' }}>⭐ Reposição Interna (x2)</span>
                                            ) : (
                                              <span>{h.motivo}</span>
                                            )}
                                          </td>
                                          <td style={{ padding: '10px' }}>{formatarTempo(h.tempoSegundos)}</td>
                                          <td style={{ padding: '10px' }}>{h.itensFisicos} un</td>
                                          <td style={{ padding: '10px' }}>{h.upm} un/min</td>
                                          <td style={{ padding: '10px', fontWeight: 'bold', color: '#27ae60' }}>
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