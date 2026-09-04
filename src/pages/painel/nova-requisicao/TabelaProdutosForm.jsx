import React from 'react';

export default function TabelaProdutosForm({
  lojaDe, // NOVO: Propriedade para saber qual loja está selecionada
  codigoMatriz, // NOVO: Estado para a caixa de código do Araturi
  setCodigoMatriz, // NOVO: Função para atualizar a caixa do Araturi
  codigo,
  setCodigo,
  descricao,
  quantidade,
  setQuantidade,
  handleMudancaCodigo,
  adicionarNaLista,
  inputCodigoRef,
  inputArquivoRef,
  handleImportarCSV,
  itensAdicionados,
  isModoVitrine,
  editandoIndex,
  novaQuantidadeEdit,
  setNovaQuantidadeEdit,
  salvarEdicao,
  cancelarEdicao,
  iniciarEdicao,
  removerDaLista,
  valorTotalRequisicao
}) {
  return (
    <>
      <div className="cabecalho-insercao">
        <h3 className="titulo-insercao">Inserir Produtos</h3>
        
        <div>
          <input type="file" accept=".csv" ref={inputArquivoRef} className="input-arquivo-oculto" onChange={handleImportarCSV} />
          <button className="btn-importar" onClick={() => inputArquivoRef.current.click()} title="Importe um arquivo contendo apenas 'Código' e 'Quantidade' separados por vírgula">
            📁 Importar Planilha CSV
          </button>
        </div>
      </div>
      
      <div className="linha-insercao">
        
        {/* CAIXA EXTRA DINÂMICA: Aparece apenas se a Loja Atendente for Conjunto Ceará */}
        {lojaDe === 'Conjunto Ceará' && (
          <div className="col-curta">
            <input 
              type="text" 
              className="input-item input-destaque-matriz" 
              placeholder="Cód. Araturi" 
              value={codigoMatriz} 
              onChange={(e) => setCodigoMatriz(e.target.value)} 
              title="Insira o código correspondente na matriz Araturi"
            />
          </div>
        )}

        <div className="col-curta">
          <input 
            type="text" 
            className="input-item" 
            placeholder={lojaDe === 'Conjunto Ceará' ? "Cód. Conj. Ceará" : "Cód. Produto"} 
            value={codigo} 
            onChange={(e) => handleMudancaCodigo(e.target.value)} 
            ref={inputCodigoRef} 
          />
        </div>
        <div className="col-longa">
          <input type="text" className="input-item" placeholder="Descrição..." value={descricao} disabled />
        </div>
        <div className="col-curta">
          <input type="number" className="input-item" placeholder="Qtd" value={quantidade} onChange={(e) => setQuantidade(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && adicionarNaLista()} />
        </div>
        <button className="btn-adicionar" onClick={adicionarNaLista}>Adicionar ↓</button>
      </div>

      {itensAdicionados.length > 0 && (
        <>
          <div className="tabela-wrapper">
            <table className="tabela-itens">
              <thead>
                <tr>
                  {/* COLUNA EXTRA DINÂMICA NO CABEÇALHO */}
                  {lojaDe === 'Conjunto Ceará' && <th>Cód. Araturi</th>}
                  <th>Cód. Produto</th>
                  <th>Descrição</th>
                  {isModoVitrine && <th className="td-centro">Qtd. no CD</th>}
                  <th>Qtd. Solicitada</th>
                </tr>
              </thead>
              <tbody>
                {itensAdicionados.map((item, index) => (
                  <tr key={index} className={item.insuficiente ? 'linha-alerta-estoque' : ''}>
                    
                    {/* CÉLULA EXTRA DINÂMICA NA TABELA */}
                    {lojaDe === 'Conjunto Ceará' && (
                      <td>
                        <strong style={{ color: '#8e44ad' }}>{item.codigoMatriz || '-'}</strong>
                      </td>
                    )}

                    <td><strong>{item.cod}</strong></td>
                    <td className={item.descricao === 'Produto não encontrado' ? 'texto-erro' : ''}>
                      {item.descricao}
                      {item.insuficiente && item.descricao !== 'Produto não encontrado' && !isModoVitrine && (
                        <div><span className="badge-estoque">Estoque atual: {item.estoque} un</span></div>
                      )}
                    </td>
                    
                    {isModoVitrine && (
                      <td className="td-centro">
                        <span className="badge-estoque-vitrine">{item.estoque !== null ? item.estoque : 0} un</span>
                      </td>
                    )}

                    <td>
                      {editandoIndex === index ? (
                        <div className="edicao-container-nova">
                          <input type="number" className="input-qtd-edit-nova" value={novaQuantidadeEdit} onChange={(e) => setNovaQuantidadeEdit(e.target.value)} />
                          <button className="btn-acao-edit-nova" onClick={() => salvarEdicao(index)} title="Salvar">✔️</button>
                          <button className="btn-acao-edit-nova" onClick={cancelarEdicao} title="Cancelar">❌</button>
                        </div>
                      ) : (
                        <div className="quantidade-container-nova">
                          <strong className={item.quantidade === 0 ? 'texto-qtd-zerada' : ''}>{item.quantidade} un</strong>
                          <button className="btn-editar-item-nova" onClick={() => iniciarEdicao(index, item.quantidade)} title="Editar quantidade">✏️</button>
                          <button className="btn-remover-item-nova" onClick={() => removerDaLista(index)} title="Remover item">🗑️</button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="resumo-valores">
            <div className="resumo-valores-texto">
              <strong>Atenção:</strong> Esta transferência movimenta produtos físicos. 
              O valor total estimado (a preço de custo) desta operação é de:
            </div>
            <div className="resumo-valores-total">
              {valorTotalRequisicao.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
            </div>
          </div>
        </>
      )}
    </>
  );
}