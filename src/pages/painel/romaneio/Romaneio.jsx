import React from 'react';
import '../../../styles/pages/painel/romaneio/romaneio.css';

export default function Romaneio({ req, baseProdutos = [] }) {
  if (!req) return null;

  const dataImpressao = new Date().toLocaleString('pt-BR');

  // NOVO: Verifica se precisa exibir a coluna do Araturi no romaneio impresso
  const exibirCodigoMatriz = req.origem === 'Conjunto Ceará';

  // Função inteligente que busca o código de barras cruzando com a base de dados
  const buscarCodigoBarras = (item) => {
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
    return item.codigoBarra || item.codigo_barra || item.bipReferencia || '-';
  };

  // --- NOVA INTELIGÊNCIA: Prepara a lista de observações ---
  const obsBrutas = req.historico?.observacoesGerais;
  let listaObservacoes = [];
  
  if (Array.isArray(obsBrutas)) {
    listaObservacoes = obsBrutas;
  } else if (typeof obsBrutas === 'string' && obsBrutas.trim() !== '') {
    // Se for uma requisição antiga, converte o texto livre para o formato da tabela
    listaObservacoes = [{
      id_obs: 'legado',
      texto: obsBrutas,
      autor: 'Sistema (Nota Antiga)',
      data: req.data || ''
    }];
  }

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

      {/* TABELA PRINCIPAL DE ITENS */}
      <table className="romaneio-tabela">
        <thead>
          <tr>
            {/* NOVO: Coluna extra condicional ajustando a largura das demais */}
            {exibirCodigoMatriz && <th style={{ width: '15%' }}>Cód. Araturi</th>}
            <th style={{ width: exibirCodigoMatriz ? '12%' : '15%' }}>Código</th>
            <th style={{ width: exibirCodigoMatriz ? '33%' : '45%' }}>Descrição</th>
            <th style={{ width: '25%' }}>Código de Barras</th>
            <th style={{ width: '15%', textAlign: 'center' }}>Quantidade</th>
          </tr>
        </thead>
        <tbody>
          {req.listaItens && req.listaItens.map((item, index) => (
            <tr key={index}>
              {/* NOVO: Exibe a Célula do Código Araturi se for o caso */}
              {exibirCodigoMatriz && (
                <td style={{ fontWeight: 'bold' }}>{item.codigoMatriz || '-'}</td>
              )}
              
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

      {/* NOVO: TABELA DE OBSERVAÇÕES E INSTRUÇÕES (Renderiza apenas se houver notas) */}
      {listaObservacoes.length > 0 && (
        <div className="romaneio-observacoes">
          <table className="romaneio-tabela">
            <thead>
              <tr>
                <th colSpan="2" style={{ textAlign: 'center', fontSize: '14px', backgroundColor: '#e2e2e2' }}>
                  Observações e Instruções
                </th>
              </tr>
              <tr>
                <th style={{ width: '15%', textAlign: 'center' }}>Obs.</th>
                <th style={{ width: '85%' }}>Descrição da Observação</th>
              </tr>
            </thead>
            <tbody>
              {listaObservacoes.map((obs, index) => (
                <tr key={obs.id_obs || index}>
                  <td style={{ textAlign: 'center', fontWeight: 'bold' }}>Obs. {index + 1}</td>
                  <td>
                    <div style={{ whiteSpace: 'pre-wrap' }}>{obs.texto}</div>
                    {obs.autor && (
                      <div style={{ fontSize: '10px', color: '#555', marginTop: '4px' }}>
                        Adicionado por: {obs.autor} em {obs.data}
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Assinatura Centralizada Exclusiva para o Estoquista */}
      <div className="romaneio-assinaturas" style={{ justifyContent: 'center' }}>
        <div className="assinatura-box" style={{ width: '50%' }}>
          Assinatura do Estoquista
        </div>
      </div>
    </div>
  );
}