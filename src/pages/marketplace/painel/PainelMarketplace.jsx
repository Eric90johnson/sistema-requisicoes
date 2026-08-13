import React from 'react';
import '../../../styles/pages/marketplace/painel/painelMarketplace.css';

export default function PainelMarketplace({ pedidosMarketplace = [], aoClicarNovoPedido, aoAbrirDetalhes }) {
  
  // ATUALIZADO COM OS NOVOS TERMOS WMS
  const ordemProcessoMarketplace = ['Em Separação', 'Saída de produtos', 'Faturamento', 'Transporte'];
  
  // Filtramos para não exibir pedidos que já foram despachados (Transporte)
  const pedidosAtivos = pedidosMarketplace.filter(ped => ped.status !== 'Transporte');
  
  // Colunas dinâmicas de responsáveis
  const colunasDinamicas = ordemProcessoMarketplace.filter(etapa => 
    pedidosAtivos.some(ped => ped.historico && ped.historico[etapa])
  );

  const getStatusClass = (status) => {
    switch (status) {
      case 'Pendente': return 'status-pendente';
      case 'Em Separação': return 'status-separacao';
      case 'Saída de produtos': return 'status-separado';
      case 'Faturamento': return 'status-faturado';
      case 'Transporte': return 'status-enviado';
      default: return 'status-pendente';
    }
  };

  return (
    <div className="painel-marketplace-container">
      <div className="painel-header">
        <h2>Visão Geral - Entregas Marketplace</h2>
        <button className="btn-nova-req btn-novo-pedido" onClick={aoClicarNovoPedido}>
          📥 + Inserir Pedidos
        </button>
      </div>

      <div className="tabela-wrapper" style={{ overflowX: 'auto' }}>
        <table className="tabela-requisicoes tabela-marketplace" style={{ whiteSpace: 'nowrap', width: '100%' }}>
          <thead>
            <tr>
              <th>ID (Pedido)</th>
              <th>Status</th>
              <th>Data</th>
              <th>Plataforma</th>
              <th>SLA (Prazo)</th>
              <th>Cliente</th>
              
              {colunasDinamicas.map(coluna => (
                <th key={coluna}>Resp. {coluna}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {pedidosAtivos.length > 0 ? (
              pedidosAtivos.map((ped) => (
                <tr key={ped.id} onClick={() => aoAbrirDetalhes(ped)} style={{ cursor: 'pointer' }} className="linha-tabela-hover">
                  <td><strong>{ped.id}</strong></td>
                  <td>
                    <span className={`status-badge ${getStatusClass(ped.status)}`}>
                      {ped.status}
                    </span>
                  </td>
                  <td>{ped.data}</td>
                  <td>{ped.plataforma || '-'}</td>
                  <td style={{ color: '#e74c3c', fontWeight: 'bold' }}>{ped.prazo || '-'}</td>
                  <td>{ped.cliente || '-'}</td>
                  
                  {colunasDinamicas.map(coluna => (
                    <td key={coluna} style={{ color: '#666', fontSize: '0.9em' }}>
                      {ped.historico && ped.historico[coluna] ? ped.historico[coluna] : '-'}
                    </td>
                  ))}
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={6 + colunasDinamicas.length} style={{ textAlign: 'center', padding: '40px', color: '#888', fontStyle: 'italic' }}>
                  Nenhum pedido de marketplace pendente para separação no momento.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}