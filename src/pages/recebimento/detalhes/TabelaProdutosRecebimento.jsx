import React from 'react';

export default function TabelaProdutosRecebimento({
  itens, status, isEditing, isViewer, responsavelRecebedor,
  pausaAtivaInicio, pausaPendente, solicitarPausaAoLider,
  handleAtualizarItem, handleAdicionarItemVazio,
  handleDuplicarParaNovoLote, handleRemoverItem, abrirModalScanner,
  buscarProdutoPorCodigo
}) {

  // TRAVA DE PROTEÇÃO: Se não for conferência ativa ou edição, bloqueia a tabela toda.
  const estaTravado = status === 'Concluída' || status === 'Cancelada' || status === 'Aguardando Cadastro' || (status === 'Pendente' && !isEditing) || isViewer;

  return (
    <div className="recebimento-card">
      <div className="card-titulo-flex">
        <div>
          <h3 style={{ margin: '0 0 5px 0', color: '#2c3e50', fontSize: '1.2rem' }}>
            Lista de Produtos ({itens.length} itens)
          </h3>
          <p style={{ margin: '0', color: '#7f8c8d', fontSize: '0.9rem', fontWeight: 'normal' }}>
            {isViewer 
              ? `Visualizando em Tempo Real. (${responsavelRecebedor} está conferindo agora)` 
              : 'Conferência física, controle de lotes e identificação por código de barras.'}
          </p>
        </div>
        
        {/* BOTÕES DE PAUSA */}
        {status === 'Em Conferência' && !pausaAtivaInicio && !isViewer && (
          <div style={{ display: 'flex', gap: '10px' }} className="no-print">
            <button 
              type="button" 
              onClick={() => solicitarPausaAoLider('Pausa para Almoço')} 
              disabled={pausaPendente} 
              style={{ padding: '8px 12px', backgroundColor: pausaPendente ? '#ecf0f1' : '#f1c40f', color: pausaPendente ? '#bdc3c7' : '#856404', border: 'none', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer' }}
            >
              🍔 Pausa Almoço
            </button>
            <button 
              type="button" 
              onClick={() => solicitarPausaAoLider('Fim de Expediente')} 
              disabled={pausaPendente} 
              style={{ padding: '8px 12px', backgroundColor: pausaPendente ? '#ecf0f1' : '#34495e', color: pausaPendente ? '#bdc3c7' : 'white', border: 'none', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer' }}
            >
              🌙 Fim de Expediente
            </button>
          </div>
        )}
      </div>

      {!pausaAtivaInicio && (
        <div className="tabela-recebimento-wrapper">
          {(status === 'Em Conferência' || isEditing) && !isViewer && (
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '10px' }}>
              <button type="button" className="btn-adicionar-linha no-print" onClick={handleAdicionarItemVazio}>
                + Novo Produto Vazio
              </button>
            </div>
          )}
          
          <table className="tabela-recebimento">
            <thead>
              <tr>
                <th>Cód. Fornecedor</th>
                <th>Cód. Barras 📷</th>
                <th>Cód. Sistema</th>
                <th>Descrição do Produto *</th>
                <th>Validade (Mês/Ano) *</th>
                <th>Qtd Lote *</th>
                <th>Conferido (Bip)</th>
                <th>Avarias</th>
                {!estaTravado && <th className="no-print">Ações</th>}
              </tr>
            </thead>
            <tbody>
              {itens.map((item) => (
                <tr key={item.id}>
                  {/* CÓDIGO DO FORNECEDOR */}
                  <td>
                    <input 
                      type="text" 
                      placeholder="Ex: REF123" 
                      value={item.codigoFornecedor || ''} 
                      onChange={(e) => handleAtualizarItem(item.id, 'codigoFornecedor', e.target.value)} 
                      disabled={estaTravado} 
                      style={{ minWidth: '90px' }}
                    />
                  </td>

                  {/* CÓDIGO DE BARRAS COM CÂMERA EMBUTIDA */}
                  <td>
                    <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                      <input 
                        type="text" 
                        placeholder="Bipar..." 
                        value={item.codigoBarras || ''} 
                        onChange={(e) => handleAtualizarItem(item.id, 'codigoBarras', e.target.value)} 
                        onBlur={(e) => buscarProdutoPorCodigo(item.id, e.target.value)}
                        onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); buscarProdutoPorCodigo(item.id, e.target.value); } }}
                        disabled={estaTravado}
                        style={{ paddingRight: '35px', minWidth: '130px' }}
                      />
                      {!estaTravado && (
                        <button 
                          type="button" 
                          onClick={() => abrirModalScanner(item, 'identificacao')}
                          className="no-print"
                          style={{ position: 'absolute', right: '5px', background: 'none', border: 'none', cursor: 'pointer', fontSize: '1.2rem', padding: '0', color: '#2980b9' }}
                          title="Bipar Código de Barras"
                        >
                          📷
                        </button>
                      )}
                    </div>
                  </td>

                  {/* CÓDIGO DO SISTEMA (AUTO-PREENCHIDO) */}
                  <td>
                    <input 
                      type="text" 
                      placeholder="-" 
                      value={item.codigoSistema || ''} 
                      disabled 
                      style={{ minWidth: '70px', backgroundColor: '#f1f2f6', color: '#7f8c8d', fontWeight: 'bold', textAlign: 'center' }}
                    />
                  </td>

                  {/* DESCRIÇÃO DO PRODUTO (AUTO-PREENCHIDO OU NOVO CADASTRO) */}
                  <td>
                    <input 
                      type="text" 
                      placeholder="Descrição" 
                      value={item.descricaoFornecedor || ''} 
                      onChange={(e) => handleAtualizarItem(item.id, 'descricaoFornecedor', e.target.value)} 
                      disabled={estaTravado} 
                      style={{ 
                        minWidth: '200px', 
                        color: item.descricaoFornecedor === 'NOVO CADASTRO' ? '#e74c3c' : 'inherit',
                        fontWeight: item.descricaoFornecedor === 'NOVO CADASTRO' ? 'bold' : 'normal'
                      }}
                    />
                  </td>

                  {/* VALIDADE */}
                  <td>
                    <input 
                      type="month" 
                      value={item.validade || ''} 
                      onChange={(e) => handleAtualizarItem(item.id, 'validade', e.target.value)} 
                      disabled={estaTravado} 
                      style={{ minWidth: '120px' }} 
                    />
                  </td>

                  {/* QUANTIDADE LOTE */}
                  <td>
                    <input 
                      type="number" 
                      placeholder="0" 
                      style={{ width: '80px' }} 
                      value={item.quantidade || ''} 
                      onChange={(e) => handleAtualizarItem(item.id, 'quantidade', e.target.value)} 
                      disabled={estaTravado} 
                    />
                  </td>

                  {/* CONFERIDO (BIP DE CONTAGEM E DIGITAÇÃO MANUAL) */}
                  <td>
                    <div className="bip-conferencia-grupo">
                      <span className="contador-bip" style={{ color: Number(item.quantidadeBipada) >= Number(item.quantidade) ? '#27ae60' : '#e74c3c' }}>
                        {item.quantidadeBipada} un
                      </span>
                      {!estaTravado && Number(item.quantidadeBipada) < Number(item.quantidade) && (
                        <div style={{ display: 'flex', gap: '5px' }}>
                          <button 
                            type="button" 
                            className="btn-bip-rapido no-print" 
                            onClick={() => abrirModalScanner(item, 'contagem')}
                            title="Ler com Câmera"
                          >
                            📷 Bip
                          </button>
                          <button 
                            type="button" 
                            className="btn-bip-rapido no-print" 
                            style={{ backgroundColor: '#f39c12', padding: '6px 8px' }} 
                            onClick={() => {
                              const novaQtd = window.prompt(`Digite a quantidade conferida manualmente para:\n${item.descricaoFornecedor || 'Este Produto'}`, item.quantidadeBipada);
                              if (novaQtd !== null && novaQtd.trim() !== '') {
                                const num = parseInt(novaQtd, 10);
                                if (!isNaN(num) && num >= 0) {
                                  handleAtualizarItem(item.id, 'quantidadeBipada', num);
                                } else {
                                  alert('Por favor, digite um número válido e maior que zero.');
                                }
                              }
                            }}
                            title="Digitar Quantidade Manualmente"
                          >
                            ✏️
                          </button>
                        </div>
                      )}
                    </div>
                  </td>

                  {/* AVARIAS */}
                  <td>
                    <input 
                      type="number" 
                      placeholder="0" 
                      style={{ width: '80px', borderColor: item.avarias > 0 ? '#e74c3c' : '#bdc3c7' }} 
                      value={item.avarias || ''} 
                      onChange={(e) => handleAtualizarItem(item.id, 'avarias', e.target.value)} 
                      disabled={estaTravado} 
                    />
                  </td>

                  {/* AÇÕES DE LOTE E REMOVER */}
                  {!estaTravado && (
                    <td className="no-print" style={{ display: 'flex', gap: '5px' }}>
                      <button type="button" onClick={() => handleDuplicarParaNovoLote(item)} title="Quebrar em outro Lote de Validade" style={{ background: '#3498db', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', padding: '5px' }}>➕ Lote</button>
                      <button type="button" onClick={() => handleRemoverItem(item.id)} title="Remover" style={{ background: '#e74c3c', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', padding: '5px' }}>🗑️</button>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}