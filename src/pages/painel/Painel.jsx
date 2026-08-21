import { useState, useMemo, useEffect, useRef } from 'react';
import '../../styles/pages/painel/painel.css';
import PainelMarketplace from '../marketplace/painel/PainelMarketplace'; 

export default function Painel({ aoClicarNovo, aoClicarNovoPedido, requisicoes, pedidosMarketplace = [], aoAbrirDetalhes }) {
  
  const [abaAtiva, setAbaAtiva] = useState('interna'); 

  const [mostrarRanking, setMostrarRanking] = useState(false);
  const [dataInicioRanking, setDataInicioRanking] = useState('');
  const [dataFimRanking, setDataFimRanking] = useState('');

  const [filtros, setFiltros] = useState({});
  const [colunaFiltroAberta, setColunaFiltroAberta] = useState(null);

  // Detector de Atualizações em Tempo Real (Piscar a linha)
  const [idsDestacados, setIdsDestacados] = useState([]);
  const reqsAnterioresRef = useRef(requisicoes);

  useEffect(() => {
    // Só compara e pisca se já tínhamos dados antes
    if (reqsAnterioresRef.current.length > 0) {
      const reqsAntigas = reqsAnterioresRef.current;
      const alteradas = [];

      requisicoes.forEach(reqAtual => {
        const reqAntiga = reqsAntigas.find(r => r.id === reqAtual.id);
        // Se a requisição é NOVA ou se o STATUS mudou
        if (!reqAntiga || reqAntiga.status !== reqAtual.status) {
          alteradas.push(reqAtual.id);
        }
      });

      if (alteradas.length > 0) {
        setIdsDestacados(prev => [...new Set([...prev, ...alteradas])]);
        
        // Remove o destaque APÓS 3.5 segundos (tempo suficiente para piscar 3x e descer a linha)
        setTimeout(() => {
          setIdsDestacados(prev => prev.filter(id => !alteradas.includes(id)));
        }, 3500);
      }
    }
    
    reqsAnterioresRef.current = requisicoes;
  }, [requisicoes]);

  const temPedidoPendente = pedidosMarketplace.some(ped => ped.status === 'Pendente');

  const ordemProcesso = ['Em Separação', 'Saída de produtos', 'Faturamento', 'Transporte', 'Recebimento'];
  const requisicoesAtivas = requisicoes.filter(req => req.status !== 'Recebimento');

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
      // REGRA 1: Destaque temporário (Se piscou, vai pro topo imediatamente)
      const aDestacado = idsDestacados.includes(a.id);
      const bDestacado = idsDestacados.includes(b.id);
      if (aDestacado && !bDestacado) return -1; // 'a' sobe
      if (!aDestacado && bDestacado) return 1;  // 'b' sobe

      // REGRA 2: A sua Regra de Negócio de Prioridade (1 Alta, 3 Baixa)
      const prioA = a.prioridade || 3; 
      const prioB = b.prioridade || 3;
      if (prioA !== prioB) return prioA - prioB; 
      
      // REGRA 3: A sua Regra de Negócio de Tempo (Mais antigas no topo)
      const tempoA = a.timestampCriacao || 0;
      const tempoB = b.timestampCriacao || 0;
      return tempoA - tempoB; 
    });
  // IMPORTANTE: Adicionamos o 'idsDestacados' aqui para forçar a tabela a se reorganizar quando a luz apagar
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
      case 'Transporte': return 'status-enviado';
      case 'Recebimento': return 'status-recebido';
      default: return 'status-pendente';
    }
  };

  const getLinhaPrioridadeClass = (prioridade) => {
    switch (prioridade) {
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
      const ef = req.metricasSeparacao.eficienciaPercentual || 0;
      
      const nomes = resp.split('+').map(n => n.trim());
      nomes.forEach(nome => {
        if (!nome) return;
        if (!pontuacoes[nome]) {
          pontuacoes[nome] = { nome, totalEficiencia: 0, qtdSeparacoes: 0 };
        }
        pontuacoes[nome].totalEficiencia += ef;
        pontuacoes[nome].qtdSeparacoes += 1;
      });
    });

    const rankingFinal = Object.values(pontuacoes).map(p => ({
      nome: p.nome,
      mediaEficiencia: Math.round(p.totalEficiencia / p.qtdSeparacoes),
      qtdSeparacoes: p.qtdSeparacoes
    }));

    rankingFinal.sort((a, b) => b.mediaEficiencia - a.mediaEficiencia);

    return rankingFinal;
  }, [requisicoes, dataInicioRanking, dataFimRanking]);

  const RenderHeaderFiltro = ({ titulo, chave, opcoes }) => {
    const estaAberto = colunaFiltroAberta === chave;
    const filtroAtivo = filtros[chave];

    return (
      <th 
        className="th-com-filtro" 
        style={{ zIndex: estaAberto ? 101 : 10 }}
      >
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

      <div className="abas-container">
        <button className={`aba-btn ${abaAtiva === 'interna' ? 'ativa' : ''}`} onClick={() => setAbaAtiva('interna')}>
          🏢 Transferências Internas
        </button>
        
        <button className={`aba-btn ${abaAtiva === 'marketplace' ? 'ativa' : ''}`} onClick={() => setAbaAtiva('marketplace')}>
          🛒 Marketplace {temPedidoPendente && <span className="alerta-pisca">!</span>}
        </button>

        <div style={{ marginLeft: 'auto' }}>
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

            <button className="btn-nova-req" onClick={aoClicarNovo}>+ Nova Requisição</button>
          </div>

          <div className="tabela-container-scroll">
            <table className="tabela-requisicoes" style={{ whiteSpace: 'nowrap' }}>
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
                      style={{ cursor: 'pointer' }} 
                      className={`linha-tabela-hover ${getLinhaPrioridadeClass(req.prioridade)} ${idsDestacados.includes(req.id) ? 'piscar-linha-nova' : ''}`}
                    >
                      <td style={{ fontWeight: 'bold' }} title={req.motivo || ''}>
                        {req.motivo 
                          ? (req.motivo.length > 25 ? `${req.motivo.substring(0, 25)}...` : req.motivo) 
                          : '-'} 
                        {req.prioridade && <span style={{fontSize: '0.8em', display:'block', color:'#666'}}>Prioridade {req.prioridade}</span>}
                      </td>
                      <td>{req.id}</td>
                      <td><span className={`status-badge ${getStatusClass(req.status)}`}>{req.status}</span></td>
                      <td>{req.data}</td>
                      <td><strong>{req.solicitante}</strong></td>
                      <td>{getNomeLojaCurto(req.destino)}</td>
                      <td>{req.itens}</td>
                      
                      {colunasDinamicas.map(coluna => (
                        <td key={coluna} style={{ color: '#666', fontSize: '0.9em' }}>
                          {req.historico && req.historico[coluna] ? req.historico[coluna] : '-'}
                        </td>
                      ))}
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={7 + colunasDinamicas.length} style={{ textAlign: 'center', padding: '40px', color: '#888', fontStyle: 'italic' }}>
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
              <h3>🏆 Top Separadores (Índice de Eficiência)</h3>
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
                <div style={{ textAlign: 'center', padding: '40px', color: '#888' }}>
                  Nenhum dado de separação finalizado neste período.
                </div>
              ) : (
                <>
                  <div className="podio-container">
                    {rankingCalculado[1] && (
                      <div className="podio-lugar podio-prata">
                        <div className="podio-avatar">🥈</div>
                        <span className="podio-nome">{rankingCalculado[1].nome}</span>
                        <span className="podio-nota">+{rankingCalculado[1].mediaEficiencia}%</span>
                      </div>
                    )}
                    {rankingCalculado[0] && (
                      <div className="podio-lugar podio-ouro">
                        <div className="podio-avatar">🥇</div>
                        <span className="podio-nome">{rankingCalculado[0].nome}</span>
                        <span className="podio-nota">+{rankingCalculado[0].mediaEficiencia}%</span>
                      </div>
                    )}
                    {rankingCalculado[2] && (
                      <div className="podio-lugar podio-bronze">
                        <div className="podio-avatar">🥉</div>
                        <span className="podio-nome">{rankingCalculado[2].nome}</span>
                        <span className="podio-nota">+{rankingCalculado[2].mediaEficiencia}%</span>
                      </div>
                    )}
                  </div>

                  <table className="tabela-ranking">
                    <thead>
                      <tr>
                        <th>Posição</th>
                        <th>Colaborador</th>
                        <th>Req. Separadas</th>
                        <th>Média de Eficiência</th>
                      </tr>
                    </thead>
                    <tbody>
                      {rankingCalculado.map((colab, index) => (
                        <tr key={index} style={{ fontWeight: index === 0 ? 'bold' : 'normal' }}>
                          <td>{index + 1}º</td>
                          <td>{colab.nome}</td>
                          <td>{colab.qtdSeparacoes}</td>
                          <td style={{ color: colab.mediaEficiencia >= 0 ? '#27ae60' : '#e74c3c' }}>
                            {colab.mediaEficiencia > 0 ? '+' : ''}{colab.mediaEficiencia}%
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