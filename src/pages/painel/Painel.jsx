import { useState } from 'react';
import '../../styles/pages/painel/painel.css';
import PainelMarketplace from '../marketplace/painel/PainelMarketplace'; // Importa o novo arquivo dedicado!

export default function Painel({ aoClicarNovo, aoClicarNovoPedido, requisicoes, pedidosMarketplace = [], aoAbrirDetalhes }) {
  
  // ESTADO PARA CONTROLAR A ABA ATIVA
  const [abaAtiva, setAbaAtiva] = useState('interna'); // 'interna' ou 'marketplace'

  // Lógica da exclamação piscante
  const temPedidoPendente = pedidosMarketplace.some(ped => ped.status === 'Pendente');

  // =========================================================================
  // CÓDIGO ORIGINAL DA SUA TABELA DE TRANSFERÊNCIAS (Preservado)
  // =========================================================================
  const ordemProcesso = ['Em Separação', 'Separado', 'Faturado', 'Enviado', 'Recebido'];
  
  const requisicoesAtivas = requisicoes.filter(req => req.status !== 'Recebido');
  
  const colunasDinamicas = ordemProcesso.filter(etapa => 
    requisicoesAtivas.some(req => req.historico && req.historico[etapa])
  );

  const getStatusClass = (status) => {
    switch (status) {
      case 'Pendente': return 'status-pendente';
      case 'Em Separação': return 'status-separacao';
      case 'Separado': return 'status-separado';
      case 'Faturado': return 'status-faturado';
      case 'Enviado': return 'status-enviado';
      case 'Recebido': return 'status-recebido';
      default: return 'status-pendente';
    }
  };

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
      </div>

      {/* ABA 1: TRANSFERÊNCIAS INTERNAS (Seu código original) */}
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

      {/* ABA 2: MARKETPLACE (Renderiza o componente isolado) */}
      {abaAtiva === 'marketplace' && (
        <PainelMarketplace 
          pedidosMarketplace={pedidosMarketplace} 
          aoClicarNovoPedido={aoClicarNovoPedido} 
          aoAbrirDetalhes={aoAbrirDetalhes} 
        />
      )}

    </div>
  );
}