import { useState, useMemo } from 'react';
import '../../styles/pages/painel/painel.css';
import PainelMarketplace from '../marketplace/painel/PainelMarketplace'; 

export default function Painel({ aoClicarNovo, aoClicarNovoPedido, requisicoes, pedidosMarketplace = [], aoAbrirDetalhes }) {
  
  const [abaAtiva, setAbaAtiva] = useState('interna'); 

  // --- ESTADOS DO MODAL DE RANKING ---
  const [mostrarRanking, setMostrarRanking] = useState(false);
  const [dataInicioRanking, setDataInicioRanking] = useState('');
  const [dataFimRanking, setDataFimRanking] = useState('');

  const temPedidoPendente = pedidosMarketplace.some(ped => ped.status === 'Pendente');

  const ordemProcesso = ['Em Separação', 'Saída de produtos', 'Faturamento', 'Transporte', 'Recebimento'];
  const requisicoesAtivas = requisicoes.filter(req => req.status !== 'Recebimento');
  const colunasDinamicas = ordemProcesso.filter(etapa => 
    requisicoesAtivas.some(req => req.historico && req.historico[etapa])
  );

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

  // --- LÓGICA MATEMÁTICA DO RANKING (ÍNDICE DE EFICIÊNCIA) ---
  const rankingCalculado = useMemo(() => {
    // 1. Filtra as requisições que já foram finalizadas e possuem métricas
    const reqsValidas = requisicoes.filter(req => {
      if (!req.metricasSeparacao) return false;
      
      // 2. Aplica o filtro de datas (se houver)
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

    // 3. Agrupa por funcionário e soma as eficiências
    const pontuacoes = {};
    reqsValidas.forEach(req => {
      const resp = req.metricasSeparacao.responsavel;
      const ef = req.metricasSeparacao.eficienciaPercentual || 0;
      
      // Se a tarefa foi feita em dupla ("João + Maria"), pontua ambos justamente
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

    // 4. Calcula a Média de Eficiência de cada um
    const rankingFinal = Object.values(pontuacoes).map(p => ({
      nome: p.nome,
      mediaEficiencia: Math.round(p.totalEficiencia / p.qtdSeparacoes),
      qtdSeparacoes: p.qtdSeparacoes
    }));

    // 5. Ordena do maior (mais eficiente) para o menor
    rankingFinal.sort((a, b) => b.mediaEficiencia - a.mediaEficiencia);

    return rankingFinal;
  }, [requisicoes, dataInicioRanking, dataFimRanking]);

  return (
    <div className="painel-container">
      
      {/* NAVEGAÇÃO DE ABAS */}
      <div className="abas-container">
        <button 
          className={`aba-btn ${abaAtiva === 'interna' ? 'ativa' : ''}`} 
          onClick={() => setAbaAtiva('interna')}
        >
          🏢 Transferências Internas
        </button>
        
        <button 
          className={`aba-btn ${abaAtiva === 'marketplace' ? 'ativa' : ''}`} 
          onClick={() => setAbaAtiva('marketplace')}
        >
          🛒 Marketplace 
          {temPedidoPendente && <span className="alerta-pisca">!</span>}
        </button>

        {/* BOTÃO GERENCIAL DO RANKING */}
        <div style={{ marginLeft: 'auto' }}>
          <button className="btn-ranking-abrir" onClick={() => setMostrarRanking(true)}>
            🏆 Ranking da Equipe
          </button>
        </div>
      </div>

      {/* ABA 1: TRANSFERÊNCIAS INTERNAS */}
      {abaAtiva === 'interna' && (
        <>
          <div className="painel-header">
            <h2>Visão Geral</h2>
            <button className="btn-nova-req" onClick={aoClicarNovo}>+ Nova Requisição</button>
          </div>

          <div style={{ overflowX: 'auto' }}>
            <table className="tabela-requisicoes" style={{ whiteSpace: 'nowrap' }}>
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Status</th>
                  <th>Data</th>
                  <th>Solicitante</th>
                  <th>Loja Destino</th>
                  <th>Itens</th>
                  
                  {colunasDinamicas.map(coluna => (
                    <th key={coluna}>Resp. {coluna}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {requisicoesAtivas.length > 0 ? (
                  requisicoesAtivas.map((req) => (
                    <tr key={req.id} onClick={() => aoAbrirDetalhes(req)} style={{ cursor: 'pointer' }} className="linha-tabela-hover">
                      <td>{req.id}</td>
                      <td>
                        <span className={`status-badge ${getStatusClass(req.status)}`}>
                          {req.status}
                        </span>
                      </td>
                      <td>{req.data}</td>
                      <td><strong>{req.solicitante}</strong></td>
                      <td>{req.destino}</td>
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
                    <td 
                      colSpan={6 + colunasDinamicas.length} 
                      style={{ textAlign: 'center', padding: '40px', color: '#888', fontStyle: 'italic' }}
                    >
                      Parabéns equipe de estoque! Nenhuma requisição de transferência pendente no momento. A operação está limpa!
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </>
      )}

      {/* ABA 2: MARKETPLACE */}
      {abaAtiva === 'marketplace' && (
        <PainelMarketplace 
          pedidosMarketplace={pedidosMarketplace} 
          aoClicarNovoPedido={aoClicarNovoPedido} 
          aoAbrirDetalhes={aoAbrirDetalhes} 
        />
      )}

      {/* ========================================== */}
      {/* MODAL DO RANKING GERENCIAL DE PRODUTIVIDADE  */}
      {/* ========================================== */}
      {mostrarRanking && (
        <div className="ranking-modal-overlay" onClick={() => setMostrarRanking(false)}>
          <div className="ranking-modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="ranking-modal-header">
              <h3>🏆 Top Separadores (Índice de Eficiência)</h3>
              <button className="btn-fechar-ranking" onClick={() => setMostrarRanking(false)}>✖</button>
            </div>
            
            <div className="ranking-modal-body">
              {/* FILTROS DE DATA */}
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
                  {/* PÓDIO DOS VENCEDORES */}
                  <div className="podio-container">
                    {/* 2º LUGAR */}
                    {rankingCalculado[1] && (
                      <div className="podio-lugar podio-prata">
                        <div className="podio-avatar">🥈</div>
                        <span className="podio-nome">{rankingCalculado[1].nome}</span>
                        <span className="podio-nota">+{rankingCalculado[1].mediaEficiencia}%</span>
                      </div>
                    )}
                    
                    {/* 1º LUGAR */}
                    {rankingCalculado[0] && (
                      <div className="podio-lugar podio-ouro">
                        <div className="podio-avatar">🥇</div>
                        <span className="podio-nome">{rankingCalculado[0].nome}</span>
                        <span className="podio-nota">+{rankingCalculado[0].mediaEficiencia}%</span>
                      </div>
                    )}

                    {/* 3º LUGAR */}
                    {rankingCalculado[2] && (
                      <div className="podio-lugar podio-bronze">
                        <div className="podio-avatar">🥉</div>
                        <span className="podio-nome">{rankingCalculado[2].nome}</span>
                        <span className="podio-nota">+{rankingCalculado[2].mediaEficiencia}%</span>
                      </div>
                    )}
                  </div>

                  {/* TABELA DE POSIÇÕES */}
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