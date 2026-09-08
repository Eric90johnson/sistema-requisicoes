import React from 'react';

export default function ImpressaoRecebimento({
  numeroRelatorio, lojaRecebedora, nomeFornecedor, marca, numeroNF, volumes,
  numeroPedido, responsavelRecebedor, observacoes, itens
}) {
  return (
    <div className="area-impressao-romaneio">
      {/* Estilos injetados apenas para a hora da impressão */}
      <style>{`
        .area-impressao-romaneio { display: none; }
        
        @media print {
          /* Esconde a tela do sistema */
          .recebimento-form, .recebimento-header, .pro-sidebar, .cabecalho-global { 
            display: none !important; 
          }
          
          /* Revela e formata o papel A4 */
          .area-impressao-romaneio { 
            display: block !important; 
            width: 100%; 
            color: #000; 
            background: #fff; 
            font-family: Arial, sans-serif;
          }
          
          @page { margin: 15mm; }
          
          .imp-header { text-align: center; border-bottom: 2px solid #000; padding-bottom: 10px; margin-bottom: 20px; }
          .imp-title { font-size: 1.5rem; font-weight: bold; margin: 0; text-transform: uppercase; }
          .imp-sub { margin: 5px 0 0 0; font-size: 1rem; }
          
          .imp-grid { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 10px; margin-bottom: 25px; }
          .imp-box { border: 1px solid #000; padding: 8px; border-radius: 4px; font-size: 0.9rem; }
          
          .imp-table { width: 100%; border-collapse: collapse; margin-bottom: 25px; }
          .imp-table th, .imp-table td { border: 1px solid #000; padding: 6px; text-align: left; font-size: 0.85rem; }
          .imp-table th { background-color: #f0f0f0; font-weight: bold; }
          
          .imp-obs-box { border: 1px solid #000; padding: 10px; min-height: 80px; margin-bottom: 40px; font-size: 0.9rem; white-space: pre-wrap; }
          
          .imp-assinaturas { display: flex; justify-content: space-around; margin-top: 60px; page-break-inside: avoid; }
          .imp-linha-ass { border-top: 1px solid #000; width: 40%; text-align: center; padding-top: 5px; font-weight: bold; font-size: 0.95rem; }
        }
      `}</style>

      {/* CABEÇALHO DO RELATÓRIO */}
      <div className="imp-header">
        <h1 className="imp-title">Romaneio de Recebimento</h1>
        <p className="imp-sub">Relatório: <strong>{numeroRelatorio}</strong> | Emissão: {new Date().toLocaleDateString('pt-BR')} às {new Date().toLocaleTimeString('pt-BR')}</p>
      </div>

      <div className="imp-grid">
        <div className="imp-box"><strong>Fornecedor:</strong><br/>{nomeFornecedor || '-'}</div>
        <div className="imp-box"><strong>Nota Fiscal:</strong><br/>{numeroNF || '-'}</div>
        <div className="imp-box"><strong>Marca:</strong><br/>{marca || '-'}</div>
        <div className="imp-box"><strong>Volumes:</strong><br/>{volumes ? `${volumes} cx` : '-'}</div>
        <div className="imp-box"><strong>Loja Destino:</strong><br/>{lojaRecebedora}</div>
        <div className="imp-box"><strong>Nº Pedido:</strong><br/>{numeroPedido || '-'}</div>
      </div>

      {/* TABELA DE PRODUTOS NA SEQUÊNCIA EXATA SOLICITADA */}
      <h3 style={{ fontSize: '1.1rem', marginBottom: '10px' }}>Conferência de Produtos</h3>
      <table className="imp-table">
        <thead>
          <tr>
            <th>Cód. Fornecedor</th>
            <th>Cód. Sistema</th>
            <th>Descrição do Produto</th>
            <th>Cód. Barras</th>
            <th>Validade (M/A)</th>
            <th style={{ width: '80px', textAlign: 'center' }}>Qtd Lote</th>
            <th style={{ width: '80px', textAlign: 'center' }}>Avarias</th>
          </tr>
        </thead>
        <tbody>
          {itens.map((item, index) => (
            <tr key={item.id || index}>
              <td>{item.codigoFornecedor || '-'}</td>
              <td>{item.codigoSistema || '-'}</td>
              <td>{item.descricaoFornecedor || '-'}</td>
              <td>{item.codigoBarras || '-'}</td>
              <td>{item.validade || '-'}</td>
              <td style={{ textAlign: 'center' }}>{item.quantidade || '0'}</td>
              <td style={{ textAlign: 'center' }}>{item.avarias || '0'}</td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* OBSERVAÇÕES */}
      <h3 style={{ fontSize: '1.1rem', marginBottom: '10px' }}>Observações / Instruções da Carga</h3>
      <div className="imp-obs-box">
        {observacoes ? observacoes : 'Nenhuma observação registrada nesta carga.'}
      </div>

      {/* ASSINATURAS */}
      <div className="imp-assinaturas">
        <div className="imp-linha-ass">
          <br />
          <span style={{ fontSize: '0.8rem', fontWeight: 'normal', color: '#555' }}>Conferente de Estoque</span>
        </div>
        <div className="imp-linha-ass">
          <br />
          <span style={{ fontSize: '0.8rem', fontWeight: 'normal', color: '#555' }}>Cadastro no sistema</span>
        </div>
      </div>

    </div>
  );
}