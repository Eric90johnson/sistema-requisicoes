import { useState, useMemo, useEffect, useRef } from 'react';
import '../../styles/pages/painel/painel.css';
import PainelMarketplace from '../marketplace/painel/PainelMarketplace'; 
import { supabase } from '../../services/supabase';

export default function Painel({ aoClicarNovo, aoClicarNovoPedido, requisicoes, pedidosMarketplace = [], aoAbrirDetalhes }) {
  
  const [abaAtiva, setAbaAtiva] = useState('interna'); 

  const [mostrarRanking, setMostrarRanking] = useState(false);
  const [dataInicioRanking, setDataInicioRanking] = useState('');
  const [dataFimRanking, setDataFimRanking] = useState('');

  const [filtros, setFiltros] = useState({});
  const [colunaFiltroAberta, setColunaFiltroAberta] = useState(null);

  const [alertaDelta, setAlertaDelta] = useState({ visivel: false, estagio: 'pergunta', produtos: [], id: null });

  const [idsDestacados, setIdsDestacados] = useState([]);
  const reqsAnterioresRef = useRef(requisicoes);

  // --- CIRURGIA DE REDE AQUI: Smart Polling com setTimeout para evitar ERR_CONNECTION_CLOSED ---
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
      } catch (e) {
        // Ignora falhas de rede silenciosamente e tenta na próxima rodada
      }

      // Só agenda a PRÓXIMA busca depois que a atual terminar completamente
      if (isMounted) {
        timerId = setTimeout(loopBuscaAlerta, 5000);
      }
    };

    // Inicia o loop
    loopBuscaAlerta();

    return () => {
      isMounted = false;
      if (timerId) clearTimeout(timerId);
    };
  }, []);
  // -----------------------------------------------------------------------------------------

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
  
  const requisicoesAtivas = requisicoes.filter(req => req.status !== 'Recebimento' && req.status !== 'Cancelada');

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

      const aTransporte = a.status === 'Transporte';
      const bTransporte = b.status === 'Transporte';
      if (aTransporte && !bTransporte) return 1;
      if (!aTransporte && bTransporte) return -1;

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
      case 'Saída de produtos': return 'status-separado';
      case 'Faturamento': return 'status-faturado';
      case 'Transporte': return 'status-pendente'; 
      case 'Recebimento': return 'status-recebido';
      case 'Cancelada': return 'status-pendente';
      default: return 'status-pendente';
    }
  };

  const getLinhaPrioridadeClass = (req) => {
    if (req.status === 'Transporte') return 'prioridade-baixa';
    
    switch (req.prioridade) {
      case 1: return 'prioridade-alta';   
      case 2: return 'prioridade-media';  
      case 3: return 'prioridade-baixa';  
      default: return ''; 
    }
  };

  const rankingCalculado = useMemo(() => {
    const reqsValidas = requisicoes.filter(req => {
      if (!req.metricasSeparacao) return false;
      
      if (dataInicioRanking || dataFimRanking) {
        const dataFimReal = req.metricasSeparacao.finalizadoEm ? new Date(req.metricasSeparacao.finalizadoEm) : null;
        if (!dataFimReal) return false;
        
        if (dataInicioRanking) {
          const inicio = new Date(`${dataInicioRanking}T00:00:00`);
          if (dataFimReal < inicio) return false;
        }
        if (dataFimRanking) {
          const fim = new Date(`${dataFimRanking}T23:59:59`);
          if (dataFimReal > fim) return false;
        }
      }
      return true;
    });

    const pontuacoes = {};
    reqsValidas.forEach(req => {
      const resp = req.metricasSeparacao.responsavel;
      const tempoSeg = req.metricasSeparacao.tempoTotalSegundos || 1; 
      const itensFisicos = req.metricasSeparacao.totalItensFisicos || (req.listaItens ? req.listaItens.reduce((acc, item) => acc + Number(item.quantidade), 0) : 0);
      
      const nomes = resp.split('+').map(n => n.trim());
      nomes.forEach(nome => {
        if (!nome) return;
        if (!pontuacoes[nome]) {
          pontuacoes[nome] = { nome, totalItens: 0, totalSegundos: 0, qtdSeparacoes: 0 };
        }
        pontuacoes[nome].totalItens += itensFisicos;
        pontuacoes[nome].totalSegundos += tempoSeg;
        pontuacoes[nome].qtdSeparacoes += 1;
      });
    });

    const rankingFinal = Object.values(pontuacoes).map(p => {
      const upm = p.totalSegundos > 0 ? ((p.totalItens / p.totalSegundos) * 60) : 0;
      const upmFormatado = Number(upm.toFixed(1));
      
      const pontuacaoFinal = Math.round(p.totalItens * upmFormatado);

      return {
        nome: p.nome,
        upm: upmFormatado,
        totalItens: p.totalItens,
        qtdSeparacoes: p.qtdSeparacoes,
        pontuacao: pontuacaoFinal
      };
    });

    rankingFinal.sort((a, b) => b.pontuacao - a.pontuacao); 

    return rankingFinal;
  }, [requisicoes, dataInicioRanking, dataFimRanking]);

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
          <button className="btn-ranking-abrir" onClick={() => setMostrarRanking(true)}>🏆 Ranking da Equipe</button>
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
                  <input type="date" value={dataInicioRanking} onChange={(e) => setDataInicioRanking(e.target.value)} />
                </div>
                <div className="filtro-grupo">
                  <label>Data Fim:</label>
                  <input type="date" value={dataFimRanking} onChange={(e) => setDataFimRanking(e.target.value)} />
                </div>
                <button className="btn-limpar-ranking" onClick={() => {setDataInicioRanking(''); setDataFimRanking('');}}>Limpar</button>
              </div>

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
                        <th>Velocidade</th>
                        <th>Pontuação 🏆</th>
                      </tr>
                    </thead>
                    <tbody>
                      {rankingCalculado.map((colab, index) => (
                        <tr key={index} className={index === 0 ? 'linha-ranking-primeiro' : 'linha-ranking-normal'}>
                          <td>{index + 1}º</td>
                          <td>{colab.nome}</td>
                          <td>{colab.qtdSeparacoes}</td>
                          <td>{colab.totalItens} un</td>
                          <td>{colab.upm} un/min</td>
                          <td className="upm-destaque">
                            {colab.pontuacao} pts
                          </td>
                        </tr>
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