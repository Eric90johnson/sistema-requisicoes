import React from 'react';
import '../../../styles/pages/painel/romaneio/romaneio.css';

export default function Romaneio({ req, baseProdutos = [] }) {
  if (!req) return null;

  const dataImpressao = new Date().toLocaleString('pt-BR');

  // Função inteligente que busca o código de barras cruzando com a base de dados
  const buscarCodigoBarras = (item) => {
    // 1. Tenta buscar na base de produtos cruzando o código
    if (baseProdutos && baseProdutos.length > 0) {
      const produtoBase = baseProdutos.find(p => 
        String(p.codigo) === String(item.cod) || 
        String(p.cod) === String(item.cod) || 
        String(p.codigo_produto) === String(item.cod) ||
        String(p.id) === String(item.cod)
      );
      
      if (produtoBase && (produtoBase.codigoBarra || produtoBase.codigo_barra)) {
        return produtoBase.codigoBarra || produtoBase.codigo_barra;
      }
    }
    
    // 2. Se a requisição já tiver salvo ou for bip manual, usa o que tem
    return item.codigoBarra || item.codigo_barra || item.bipReferencia || '-';
  };

  return (
    <div className="romaneio-container" id="romaneio-print-area">
      <div className="romaneio-header">
        <h1>ROMANEIO DE SEPARAÇÃO</h1>
        <p><strong>Requisição Nº:</strong> {req.id}</p>
      </div>

      <div className="romaneio-info-grid">
        <div>
          <p><strong>Loja Solicitada (Origem):</strong> {req.origem || 'Matriz'}</p>
          <p><strong>Loja Solicitante (Destino):</strong> {req.destino}</p>
        </div>
        <div style={{ textAlign: 'right' }}>
          <p><strong>Data da Solicitação:</strong> {req.data}</p>
          <p><strong>Impresso em:</strong> {dataImpressao}</p>
        </div>
      </div>

      <table className="romaneio-tabela">
        <thead>
          <tr>
            <th style={{ width: '15%' }}>Código</th>
            <th style={{ width: '45%' }}>Descrição</th>
            <th style={{ width: '25%' }}>Código de Barras</th>
            <th style={{ width: '15%', textAlign: 'center' }}>Quantidade</th>
          </tr>
        </thead>
        <tbody>
          {req.listaItens && req.listaItens.map((item, index) => (
            <tr key={index}>
              <td>{item.cod}</td>
              <td>{item.descricao}</td>
              <td style={{ fontFamily: 'monospace', fontSize: '13px' }}>
                {buscarCodigoBarras(item)}
              </td>
              <td style={{ textAlign: 'center', fontSize: '14px' }}><strong>{item.quantidade}</strong></td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* Assinatura Centralizada Exclusiva para o Estoquista */}
      <div className="romaneio-assinaturas" style={{ justifyContent: 'center' }}>
        <div className="assinatura-box" style={{ width: '50%' }}>
          Assinatura do Estoquista
        </div>
      </div>
    </div>
  );
}