import React from 'react';

export default function TabelaProdutosRecebimento({
  itens, status, isEditing, isViewer, responsavelRecebedor,
  pausaAtivaInicio, pausaPendente, solicitarPausaAoLider,
  handleAtualizarItem, handleAdicionarItemVazio,
  handleDuplicarParaNovoLote, handleRemoverItem, abrirModalScanner,
  buscarProdutoPorCodigo, pedidosBip, codigoManual, setCodigoManual,
  solicitarBipManual, isEncarregado, exibirPopup
}) {

  // 🚀 TRAVA FÍSICA CORRIGIDA: Permite destravar os campos físicos caso isEditing seja ativado durante "Aguardando Precificação"
  const estaTravado = status === 'Concluída' || status === 'Cancelada' || status === 'Aguardando Cadastro' || (status === 'Aguardando Precificação' && !isEditing) || (status === 'Pendente' && !isEditing) || isViewer;

  // TRAVA DE PREÇOS: Fica liberada durante a etapa de "Aguardando Precificação".
  const estaTravadoPrecos = status === 'Concluída' || status === 'Cancelada' || status === 'Aguardando Cadastro' || (status === 'Pendente' && !isEditing) || isViewer;

  // REGRA DE VISIBILIDADE: Só exibe as colunas de preços quando já passou da conferência
  const mostrarPrecos = status === 'Aguardando Precificação' || status === 'Aguardando Cadastro' || status === 'Concluída';

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
              : 'Conferência física, controle de lotes, identificação por código de barras e precificação.'}
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
                {/* EXIBE COLUNAS DE PREÇO APENAS SE A REGRA PERMITIR */}
                {mostrarPrecos && (
                  <>
                    <th style={{ color: '#27ae60' }}>Custo (R$)</th>
                    <th style={{ color: '#2980b9' }}>Venda (R$)</th>
                  </>
                )}
                {!estaTravado && <th className="no-print">Ações</th>}
              </tr>
            </thead>
            <tbody>
              {itens.map((item) => {
                const chaveItem = String(item.id);
                const statusBip = isEncarregado ? 'aprovado' : pedidosBip[chaveItem];

                return (
                  <tr key={item.id}>
                    {/* CÓDIGO DO FORNECEDOR */}
                    <td>
                      {estaTravado ? (
                        <span style={{ fontWeight: '500', color: '#34495e', fontSize: '0.85rem' }}>{item.codigoFornecedor || '-'}</span>
                      ) : (
                        <input 
                          type="text" 
                          placeholder="Ex: REF123" 
                          value={item.codigoFornecedor || ''} 
                          onChange={(e) => handleAtualizarItem(item.id, 'codigoFornecedor', e.target.value)} 
                          style={{ minWidth: '90px' }}
                        />
                      )}
                    </td>

                    {/* CÓDIGO DE BARRAS COM CÂMERA EMBUTIDA */}
                    <td>
                      {estaTravado ? (
                        <span style={{ fontWeight: '500', color: '#34495e', fontSize: '0.85rem' }}>{item.codigoBarras || '-'}</span>
                      ) : (
                        <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                          <input 
                            type="text" 
                            placeholder="Bipar..." 
                            value={item.codigoBarras || ''} 
                            onChange={(e) => handleAtualizarItem(item.id, 'codigoBarras', e.target.value)} 
                            onBlur={(e) => buscarProdutoPorCodigo(item.id, e.target.value)}
                            onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); buscarProdutoPorCodigo(item.id, e.target.value); } }}
                            style={{ paddingRight: '35px', minWidth: '130px' }}
                          />
                          <button 
                            type="button" 
                            onClick={() => abrirModalScanner(item, 'identificacao')}
                            className="no-print"
                            style={{ position: 'absolute', right: '5px', background: 'none', border: 'none', cursor: 'pointer', fontSize: '1.2rem', padding: '0', color: '#2980b9' }}
                            title="Bipar Código de Barras"
                          >
                            📷
                          </button>
                        </div>
                      )}
                    </td>

                    {/* CÓDIGO DO SISTEMA */}
                    <td>
                      <span style={{ fontWeight: 'bold', color: '#7f8c8d', fontSize: '0.85rem' }}>{item.codigoSistema || '-'}</span>
                    </td>

                    {/* DESCRIÇÃO DO PRODUTO */}
                    <td>
                      {estaTravado ? (
                        <span style={{ 
                          fontWeight: item.descricaoFornecedor === 'NOVO CADASTRO' ? 'bold' : '500', 
                          color: item.descricaoFornecedor === 'NOVO CADASTRO' ? '#e74c3c' : '#34495e',
                          fontSize: '0.85rem'
                        }}>
                          {item.descricaoFornecedor || '-'}
                        </span>
                      ) : (
                        <input 
                          type="text" 
                          placeholder="Descrição" 
                          value={item.descricaoFornecedor || ''} 
                          onChange={(e) => handleAtualizarItem(item.id, 'descricaoFornecedor', e.target.value)} 
                          style={{ 
                            minWidth: '200px', 
                            color: item.descricaoFornecedor === 'NOVO CADASTRO' ? '#e74c3c' : 'inherit',
                            fontWeight: item.descricaoFornecedor === 'NOVO CADASTRO' ? 'bold' : 'normal'
                          }}
                        />
                      )}
                    </td>

                    {/* VALIDADE */}
                    <td>
                      {estaTravado ? (
                        <span style={{ fontWeight: '500', color: '#34495e', fontSize: '0.85rem' }}>{item.validade || '-'}</span>
                      ) : (
                        <input 
                          type="month" 
                          value={item.validade || ''} 
                          onChange={(e) => handleAtualizarItem(item.id, 'validade', e.target.value)} 
                          style={{ minWidth: '120px' }} 
                        />
                      )}
                    </td>

                    {/* QUANTIDADE LOTE */}
                    <td>
                      {estaTravado ? (
                        <span style={{ fontWeight: '500', color: '#34495e', fontSize: '0.85rem' }}>{item.quantidade || '0'}</span>
                      ) : (
                        <input 
                          type="number" 
                          placeholder="0" 
                          style={{ width: '80px' }} 
                          value={item.quantidade || ''} 
                          onChange={(e) => handleAtualizarItem(item.id, 'quantidade', e.target.value)} 
                        />
                      )}
                    </td>

                    {/* CONFERIDO */}
                    <td>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                        {estaTravado ? (
                          <span style={{ fontWeight: 'bold', color: '#000', fontSize: '0.85rem' }}>
                            {item.quantidadeBipada} / {item.quantidade}
                          </span>
                        ) : (
                          <span className="contador-bip" style={{ color: Number(item.quantidadeBipada) >= Number(item.quantidade) ? '#27ae60' : '#e74c3c' }}>
                            {item.quantidadeBipada} / {item.quantidade} un
                          </span>
                        )}

                        {!estaTravado && Number(item.quantidadeBipada) < Number(item.quantidade) && (
                          <div style={{ display: 'flex', gap: '5px', flexWrap: 'wrap' }}>
                            <button 
                              type="button" 
                              className="btn-bip-rapido no-print" 
                              onClick={() => abrirModalScanner(item, 'contagem')}
                              title="Ler com Câmera"
                            >
                              📷 Bip
                            </button>

                            {/* BOTÕES DE BIP MANUAL / AUTORIZAÇÃO */}
                            {statusBip === 'aprovado' ? (
                              <div style={{ display: 'flex', gap: '4px', width: '100%', marginTop: '4px' }}>
                                <input 
                                  type="text" 
                                  className="input-bip-manual" 
                                  placeholder="Cód. barras manual..." 
                                  value={codigoManual[chaveItem] || ''} 
                                  onChange={(e) => setCodigoManual({...codigoManual, [chaveItem]: e.target.value})} 
                                  style={{ padding: '4px', fontSize: '0.85rem', flex: 1, border: '1px solid #27ae60', borderRadius: '4px' }}
                                />
                                <button 
                                  type="button" 
                                  onClick={() => {
                                    const val = codigoManual[chaveItem];
                                    if (val && val.trim()) {
                                      const meta = Number(item.quantidade);
                                      const qtdAtual = Number(item.quantidadeBipada);
                                      
                                      if (meta > 0 && qtdAtual >= meta) {
                                        if (exibirPopup) exibirPopup('aviso', 'Limite Atingido!', `Atenção: Você já conferiu todas as ${meta} unidades deste produto.`);
                                        setCodigoManual({...codigoManual, [chaveItem]: ''});
                                        return;
                                      }

                                      handleAtualizarItem(item.id, 'quantidadeBipada', qtdAtual + 1);
                                      setCodigoManual({...codigoManual, [chaveItem]: ''});
                                    }
                                  }}
                                  style={{ background: '#27ae60', color: 'white', border: 'none', padding: '4px 8px', borderRadius: '4px', cursor: 'pointer', fontSize: '0.8rem' }}
                                >
                                  OK
                                </button>
                              </div>
                            ) : statusBip === 'pendente' ? (
                              <span style={{ fontSize: '0.75rem', color: '#d35400', fontWeight: 'bold' }}>⏳ Aguardando...</span>
                            ) : statusBip === 'recusado' ? (
                              <button 
                                type="button" 
                                onClick={() => solicitarBipManual(item)}
                                style={{ background: '#c0392b', color: 'white', border: 'none', padding: '4px 8px', borderRadius: '4px', cursor: 'pointer', fontSize: '0.75rem' }}
                              >
                                ❌ Recusado (Pedir)
                              </button>
                            ) : (
                              <button 
                                type="button" 
                                onClick={() => solicitarBipManual(item)}
                                style={{ background: '#8e44ad', color: 'white', border: 'none', padding: '4px 8px', borderRadius: '4px', cursor: 'pointer', fontSize: '0.75rem' }}
                                title="Solicitar autorização ao encarregado"
                              >
                                🔑 Pedir Bip Manual
                              </button>
                            )}

                            {/* TRAVA DO LÁPIS MANUAL */}
                            <button 
                              type="button" 
                              className="btn-bip-rapido no-print" 
                              style={{ backgroundColor: '#f39c12', padding: '6px 8px' }} 
                              onClick={() => {
                                const novaQtd = window.prompt(`Digite a quantidade conferida manualmente para:\n${item.descricaoFornecedor || 'Este Produto'}`, item.quantidadeBipada);
                                if (novaQtd !== null && novaQtd.trim() !== '') {
                                  const num = parseInt(novaQtd, 10);
                                  const meta = Number(item.quantidade);

                                  if (!isNaN(num) && num >= 0) {
                                    if (meta > 0 && num > meta) {
                                      if (exibirPopup) exibirPopup('aviso', 'Limite Atingido!', `Você informou ${num} unidades, mas a nota indica apenas ${meta}. Não é possível registrar além da quantidade da NF.`);
                                      return;
                                    }
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
                      {estaTravado ? (
                        <span style={{ fontWeight: 'bold', color: item.avarias > 0 ? '#e74c3c' : '#34495e', fontSize: '0.85rem' }}>{item.avarias || '0'}</span>
                      ) : (
                        <input 
                          type="number" 
                          placeholder="0" 
                          style={{ width: '60px', borderColor: item.avarias > 0 ? '#e74c3c' : '#bdc3c7' }} 
                          value={item.avarias || ''} 
                          onChange={(e) => handleAtualizarItem(item.id, 'avarias', e.target.value)} 
                        />
                      )}
                    </td>

                    {/* CUSTO E VENDA */}
                    {mostrarPrecos && (
                      <>
                        <td>
                          {estaTravadoPrecos ? (
                            <span style={{ fontWeight: 'bold', color: '#27ae60', fontSize: '0.85rem' }}>{item.precoCusto ? `R$ ${item.precoCusto}` : '-'}</span>
                          ) : (
                            <input 
                              type="text"
                              inputMode="decimal"
                              placeholder="0,00" 
                              style={{ width: '80px', borderColor: '#27ae60' }} 
                              value={item.precoCusto || ''} 
                              onChange={(e) => handleAtualizarItem(item.id, 'precoCusto', e.target.value)} 
                            />
                          )}
                        </td>
                        <td>
                          {estaTravadoPrecos ? (
                            <span style={{ fontWeight: 'bold', color: '#2980b9', fontSize: '0.85rem' }}>{item.precoVenda ? `R$ ${item.precoVenda}` : '-'}</span>
                          ) : (
                            <input 
                              type="text"
                              inputMode="decimal"
                              placeholder="0,00" 
                              style={{ width: '80px', borderColor: '#2980b9' }} 
                              value={item.precoVenda || ''} 
                              onChange={(e) => handleAtualizarItem(item.id, 'precoVenda', e.target.value)} 
                            />
                          )}
                        </td>
                      </>
                    )}

                    {/* AÇÕES DE LOTE E REMOVER */}
                    {!estaTravado && (
                      <td className="no-print" style={{ display: 'flex', gap: '5px' }}>
                        <button type="button" onClick={() => handleDuplicarParaNovoLote(item)} title="Quebrar em Lote" style={{ background: '#3498db', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', padding: '5px' }}>➕ Lote</button>
                        <button type="button" onClick={() => handleRemoverItem(item.id)} title="Remover" style={{ background: '#e74c3c', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', padding: '5px' }}>🗑️</button>
                      </td>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}