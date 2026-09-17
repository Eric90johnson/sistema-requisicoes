import React, { useState } from 'react';

export default function TabelaProdutosRecebimento({
  itens, status, isEditing, isViewer, responsavelRecebedor,
  pausaAtivaInicio, pausaPendente, solicitarPausaAoLider,
  handleAtualizarItem, handleAdicionarItemVazio,
  handleDuplicarParaNovoLote, handleRemoverItem, abrirModalScanner,
  buscarProdutoPorCodigo, pedidosBip, codigoManual, setCodigoManual,
  solicitarBipManual, isEncarregado, exibirPopup,
  // 🚀 NOVAS PROPS DO CARRINHO
  itensPreRequisicao = [], aoAdicionarPreRequisicao, aoRemoverPreRequisicao
}) {

  // 🚀 NOVO MODO: REPOSIÇÃO
  const isModoReposicao = status === 'Cadastrado';

  const estaTravado = status === 'Concluída' || status === 'Cancelada' || status === 'Aguardando Cadastro' || status === 'Cadastrado' || (status === 'Aguardando Precificação' && !isEditing) || (status === 'Pendente' && !isEditing) || isViewer;
  const estaTravadoPrecos = status === 'Concluída' || status === 'Cancelada' || status === 'Aguardando Cadastro' || status === 'Cadastrado' || (status === 'Pendente' && !isEditing) || isViewer;
  const mostrarPrecos = status === 'Aguardando Precificação' || status === 'Aguardando Cadastro' || status === 'Cadastrado' || status === 'Concluída';

  // 🚀 ESTADOS DA LINHA EXPANDIDA (Igual BaseDados)
  const [linhaExpandida, setLinhaExpandida] = useState(null);
  const [qtdsReposicao, setQtdsReposicao] = useState({});

  const toggleExpandirLinha = (id) => {
    if (isModoReposicao) setLinhaExpandida(prev => (prev === id ? null : id));
  };

  const isProdutoNoCarrinho = (item) => {
    const codVerificacao = item.codigoSistema || item.codigoBarras || item.codigoFornecedor;
    return itensPreRequisicao.some(i => String(i.codigo) === String(codVerificacao));
  };

  const handleAdicionarAoCarrinho = (e, item) => {
    e.stopPropagation();
    const qtdDigitada = qtdsReposicao[item.id] || 1;
    const codSistemaSeguro = item.codigoSistema && item.codigoSistema !== '-' ? item.codigoSistema : (item.codigoBarras || item.codigoFornecedor);
    
    // Formata o produto no mesmo padrão que a tela NovaRequisicao espera
    const produtoFormatado = {
      codigo: codSistemaSeguro,
      descricao: item.descricaoFornecedor,
      codigoBarra: item.codigoBarras,
      quantidadeDesejada: qtdDigitada,
      origemLoja: 'Recebimento NF' 
    };

    aoAdicionarPreRequisicao(produtoFormatado);
    setLinhaExpandida(null); 
  };

  const tocarSom = (tipo) => {
    try {
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      const osc = ctx.createOscillator();
      osc.type = tipo === 'erro' ? 'sawtooth' : 'sine';
      osc.frequency.setValueAtTime(tipo === 'erro' ? 250 : 900, ctx.currentTime);
      if (tipo === 'erro') osc.frequency.exponentialRampToValueAtTime(100, ctx.currentTime + 0.5);
      osc.connect(ctx.destination); osc.start(); osc.stop(ctx.currentTime + (tipo === 'erro' ? 0.6 : 0.2));
    } catch (e) {}
  };

  return (
    <div className="recebimento-card">
      <div className="card-titulo-flex">
        <div>
          <h3 style={{ margin: '0 0 5px 0', color: '#2c3e50', fontSize: '1.2rem' }}>
            Lista de Produtos ({itens.length} itens)
          </h3>
          <p style={{ margin: '0', color: '#7f8c8d', fontSize: '0.9rem', fontWeight: 'normal' }}>
            {isModoReposicao 
              ? '📦 Modo Reposição: Clique na linha do produto para enviar ao carrinho de requisição.'
              : isViewer 
                ? `Visualizando em Tempo Real. (${responsavelRecebedor} está conferindo agora)` 
                : 'Conferência física, controle de lotes, identificação por código de barras e precificação.'}
          </p>
        </div>
        
        {status === 'Em Conferência' && !pausaAtivaInicio && !isViewer && (
          <div style={{ display: 'flex', gap: '10px' }} className="no-print">
            <button type="button" onClick={() => solicitarPausaAoLider('Pausa para Almoço')} disabled={pausaPendente} style={{ padding: '8px 12px', backgroundColor: pausaPendente ? '#ecf0f1' : '#f1c40f', color: pausaPendente ? '#bdc3c7' : '#856404', border: 'none', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer' }}>🍔 Pausa Almoço</button>
            <button type="button" onClick={() => solicitarPausaAoLider('Fim de Expediente')} disabled={pausaPendente} style={{ padding: '8px 12px', backgroundColor: pausaPendente ? '#ecf0f1' : '#34495e', color: pausaPendente ? '#bdc3c7' : 'white', border: 'none', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer' }}>🌙 Fim de Expediente</button>
          </div>
        )}
      </div>

      {!pausaAtivaInicio && (
        <div className="tabela-recebimento-wrapper">
          {(status === 'Em Conferência' || isEditing) && !isViewer && (
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '10px' }}>
              <button type="button" className="btn-adicionar-linha no-print" onClick={handleAdicionarItemVazio}>+ Novo Produto Vazio</button>
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
                <th>Qtd NF *</th>
                <th>Conferido (Bip)</th>
                <th>Avarias</th>
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
                
                const estaExpandido = linhaExpandida === item.id;
                const jaAdicionado = isProdutoNoCarrinho(item);

                return (
                  <React.Fragment key={item.id}>
                    <tr 
                      onClick={() => toggleExpandirLinha(item.id)}
                      style={{ 
                        cursor: isModoReposicao ? 'pointer' : 'default', 
                        backgroundColor: estaExpandido ? '#f0f8ff' : (jaAdicionado && isModoReposicao ? '#eafaf1' : 'inherit'),
                        transition: 'background 0.2s'
                      }}
                      title={isModoReposicao ? "Clique para repor este produto" : ""}
                    >
                      <td>
                        {estaTravado ? (
                          <span style={{ fontWeight: '500', color: '#34495e', fontSize: '0.85rem' }}>{item.codigoFornecedor || '-'}</span>
                        ) : (
                          <input type="text" placeholder="Ex: REF123" value={item.codigoFornecedor || ''} onChange={(e) => handleAtualizarItem(item.id, 'codigoFornecedor', e.target.value)} style={{ minWidth: '90px' }} />
                        )}
                      </td>

                      <td>
                        {estaTravado ? (
                          <span style={{ fontWeight: '500', color: '#34495e', fontSize: '0.85rem' }}>{item.codigoBarras || '-'}</span>
                        ) : (
                          <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                            <input type="text" placeholder="Bipar..." value={item.codigoBarras || ''} onChange={(e) => handleAtualizarItem(item.id, 'codigoBarras', e.target.value)} onBlur={(e) => buscarProdutoPorCodigo(item.id, e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); buscarProdutoPorCodigo(item.id, e.target.value); } }} style={{ paddingRight: '35px', minWidth: '130px', fontWeight: 'bold', color: '#2c3e50' }} />
                            <button type="button" onClick={() => abrirModalScanner(item, 'identificacao')} className="no-print" style={{ position: 'absolute', right: '5px', background: 'none', border: 'none', cursor: 'pointer', fontSize: '1.2rem', padding: '0', color: '#2980b9' }} title="Bipar Código de Barras">📷</button>
                          </div>
                        )}
                      </td>

                      <td><span style={{ fontWeight: 'bold', color: '#7f8c8d', fontSize: '0.85rem' }}>{item.codigoSistema || '-'}</span></td>

                      <td>
                        {estaTravado ? (
                          <span style={{ fontWeight: item.descricaoFornecedor === 'NOVO CADASTRO' ? 'bold' : '500', color: item.descricaoFornecedor === 'NOVO CADASTRO' ? '#e74c3c' : '#34495e', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '5px' }}>
                            {item.descricaoFornecedor || '-'}
                            {jaAdicionado && isModoReposicao && <span style={{ fontSize: '0.9rem' }} title="No carrinho">🛒✅</span>}
                          </span>
                        ) : (
                          <input type="text" placeholder="Descrição" value={item.descricaoFornecedor || ''} onChange={(e) => handleAtualizarItem(item.id, 'descricaoFornecedor', e.target.value)} style={{ minWidth: '200px', color: item.descricaoFornecedor === 'NOVO CADASTRO' ? '#e74c3c' : 'inherit', fontWeight: item.descricaoFornecedor === 'NOVO CADASTRO' ? 'bold' : 'normal' }} />
                        )}
                      </td>

                      <td>
                        {estaTravado ? (
                          <span style={{ fontWeight: '500', color: '#34495e', fontSize: '0.85rem' }}>{item.validade || '-'}</span>
                        ) : (
                          <input type="month" value={item.validade || ''} onChange={(e) => handleAtualizarItem(item.id, 'validade', e.target.value)} style={{ minWidth: '120px' }} />
                        )}
                      </td>

                      <td>
                        {estaTravado ? (
                          <span style={{ fontWeight: '500', color: '#34495e', fontSize: '0.85rem' }}>{item.quantidade || '0'}</span>
                        ) : (
                          <input type="number" placeholder="0" style={{ width: '80px' }} value={item.quantidade || ''} onChange={(e) => handleAtualizarItem(item.id, 'quantidade', e.target.value)} />
                        )}
                      </td>

                      <td>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                          {estaTravado ? (
                            <span style={{ fontWeight: 'bold', color: '#000', fontSize: '0.85rem' }}>{item.quantidadeBipada} / {item.quantidade}</span>
                          ) : (
                            <span className="contador-bip" style={{ color: Number(item.quantidadeBipada) >= Number(item.quantidade) ? '#27ae60' : '#e74c3c' }}>{item.quantidadeBipada} / {item.quantidade} un</span>
                          )}

                          {!estaTravado && Number(item.quantidadeBipada) < Number(item.quantidade) && (
                            <div style={{ display: 'flex', gap: '5px', flexWrap: 'wrap' }}>
                              <button type="button" className="btn-bip-rapido no-print" onClick={() => abrirModalScanner(item, 'contagem')} title="Ler com Câmera">📷 Bip</button>

                              {statusBip === 'aprovado' ? (
                                <div style={{ display: 'flex', gap: '4px', width: '100%', marginTop: '4px' }}>
                                  <input 
                                    type="text" className="input-bip-manual" placeholder="Cód..." 
                                    value={codigoManual[chaveItem] || ''} 
                                    onChange={(e) => setCodigoManual({...codigoManual, [chaveItem]: e.target.value})} 
                                    onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); document.getElementById(`btn-ok-${chaveItem}`).click(); } }}
                                    style={{ padding: '4px', fontSize: '0.85rem', flex: 1, border: '1px solid #27ae60', borderRadius: '4px' }}
                                  />
                                  <button 
                                    id={`btn-ok-${chaveItem}`} type="button" 
                                    onClick={() => {
                                      const val = codigoManual[chaveItem]?.trim();
                                      if (val) {
                                        const meta = Number(item.quantidade);
                                        const qtdAtual = Number(item.quantidadeBipada);
                                        if (meta > 0 && qtdAtual >= meta) { if (exibirPopup) exibirPopup('aviso', 'Limite Atingido!', `Você já conferiu todas as ${meta} unidades.`); setCodigoManual({...codigoManual, [chaveItem]: ''}); return; }
                                        const mestre = item.codigoBarras?.trim();
                                        if (!mestre) { handleAtualizarItem(item.id, 'codigoBarras', val); handleAtualizarItem(item.id, 'quantidadeBipada', qtdAtual + 1); tocarSom('sucesso'); } 
                                        else if (mestre === val) { handleAtualizarItem(item.id, 'quantidadeBipada', qtdAtual + 1); tocarSom('sucesso'); } 
                                        else { tocarSom('erro'); if (exibirPopup) exibirPopup('erro', 'Código Inválido! ❌', `Esperado: ${mestre}\nLido: ${val}`); }
                                        setCodigoManual({...codigoManual, [chaveItem]: ''});
                                      }
                                    }}
                                    style={{ background: '#27ae60', color: 'white', border: 'none', padding: '4px 8px', borderRadius: '4px', cursor: 'pointer', fontSize: '0.8rem', fontWeight: 'bold' }}
                                  >OK</button>
                                </div>
                              ) : statusBip === 'pendente' ? (
                                <span style={{ fontSize: '0.75rem', color: '#d35400', fontWeight: 'bold' }}>⏳ Ag...</span>
                              ) : (
                                <button type="button" onClick={() => solicitarBipManual(item)} style={{ background: '#8e44ad', color: 'white', border: 'none', padding: '4px 8px', borderRadius: '4px', cursor: 'pointer', fontSize: '0.75rem' }}>🔑 Pedir Bip</button>
                              )}

                              {isEncarregado && (
                                <button type="button" className="btn-bip-rapido no-print" style={{ backgroundColor: '#f39c12', padding: '6px 8px' }} 
                                  onClick={() => {
                                    const novaQtd = window.prompt(`Qtd manual para:\n${item.descricaoFornecedor}`, item.quantidadeBipada);
                                    if (novaQtd !== null && novaQtd.trim() !== '') {
                                      const num = parseInt(novaQtd, 10);
                                      if (!isNaN(num) && num >= 0) { handleAtualizarItem(item.id, 'quantidadeBipada', num); }
                                    }
                                  }}
                                >✏️</button>
                              )}
                            </div>
                          )}
                        </div>
                      </td>

                      <td>
                        {estaTravado ? (
                          <span style={{ fontWeight: 'bold', color: item.avarias > 0 ? '#e74c3c' : '#34495e', fontSize: '0.85rem' }}>{item.avarias || '0'}</span>
                        ) : (
                          <input type="number" placeholder="0" style={{ width: '60px', borderColor: item.avarias > 0 ? '#e74c3c' : '#bdc3c7' }} value={item.avarias || ''} onChange={(e) => handleAtualizarItem(item.id, 'avarias', e.target.value)} />
                        )}
                      </td>

                      {mostrarPrecos && (
                        <>
                          <td>
                            {estaTravadoPrecos ? (
                              <span style={{ fontWeight: 'bold', color: '#27ae60', fontSize: '0.85rem' }}>{item.precoCusto ? `R$ ${item.precoCusto}` : '-'}</span>
                            ) : (
                              <input type="text" inputMode="decimal" placeholder="0,00" style={{ width: '80px', borderColor: '#27ae60' }} value={item.precoCusto || ''} onChange={(e) => handleAtualizarItem(item.id, 'precoCusto', e.target.value)} />
                            )}
                          </td>
                          <td>
                            {estaTravadoPrecos ? (
                              <span style={{ fontWeight: 'bold', color: '#2980b9', fontSize: '0.85rem' }}>{item.precoVenda ? `R$ ${item.precoVenda}` : '-'}</span>
                            ) : (
                              <input type="text" inputMode="decimal" placeholder="0,00" style={{ width: '80px', borderColor: '#2980b9' }} value={item.precoVenda || ''} onChange={(e) => handleAtualizarItem(item.id, 'precoVenda', e.target.value)} />
                            )}
                          </td>
                        </>
                      )}

                      {!estaTravado && (
                        <td className="no-print" style={{ display: 'flex', gap: '5px' }}>
                          <button type="button" onClick={() => handleDuplicarParaNovoLote(item)} style={{ background: '#3498db', color: 'white', border: 'none', borderRadius: '4px', padding: '5px' }}>➕</button>
                          <button type="button" onClick={() => handleRemoverItem(item.id)} style={{ background: '#e74c3c', color: 'white', border: 'none', borderRadius: '4px', padding: '5px' }}>🗑️</button>
                        </td>
                      )}
                    </tr>

                    {/* 🚀 LINHA EXPANDIDA (CARRINHO DE REPOSIÇÃO) */}
                    {estaExpandido && isModoReposicao && (
                      <tr style={{ backgroundColor: '#f9fafd' }}>
                        <td colSpan={mostrarPrecos ? "10" : "8"} style={{ padding: '15px', borderBottom: '2px solid #3498db', textAlign: 'center' }}>
                          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '15px', background: 'white', padding: '15px 25px', borderRadius: '8px', boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }}>
                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
                              <label style={{ fontSize: '0.85rem', fontWeight: 'bold', color: '#7f8c8d', marginBottom: '5px' }}>Qtd. para Repor:</label>
                              <input 
                                type="number" 
                                min="1" 
                                placeholder="Ex: 5" 
                                value={qtdsReposicao[item.id] || ''} 
                                onChange={(e) => setQtdsReposicao({...qtdsReposicao, [item.id]: e.target.value})} 
                                onClick={(e) => e.stopPropagation()} 
                                style={{ padding: '10px', width: '100px', borderRadius: '6px', border: '1px solid #bdc3c7', fontSize: '1rem', outline: 'none' }}
                              />
                            </div>
                            
                            {jaAdicionado ? (
                              <button 
                                onClick={(e) => { e.stopPropagation(); aoRemoverPreRequisicao(item.codigoSistema || item.codigoBarras || item.codigoFornecedor); setLinhaExpandida(null); }} 
                                style={{ background: '#e74c3c', color: 'white', border: 'none', padding: '12px 20px', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}
                              >
                                ❌ Remover do Carrinho
                              </button>
                            ) : (
                              <button 
                                onClick={(e) => handleAdicionarAoCarrinho(e, item)} 
                                style={{ background: '#27ae60', color: 'white', border: 'none', padding: '12px 20px', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}
                              >
                                ➕ Enviar para Carrinho
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}