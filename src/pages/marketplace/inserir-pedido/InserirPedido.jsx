import { useState, useRef } from 'react';
import '../../../styles/pages/marketplace/inserir-pedido/inserirPedido.css';

export default function InserirPedido({ aoVoltar, baseProdutos, aoSalvar }) {
  const [pedidosImportados, setPedidosImportados] = useState([]);
  const [pedidoSelecionado, setPedidoSelecionado] = useState(null);
  const [alerta, setAlerta] = useState({ visivel: false, tipo: '', titulo: '', mensagem: '', onConfirm: null });
  
  const inputArquivoRef = useRef(null);

  const mostrarAlerta = (tipo, titulo, mensagem, onConfirm = null) => {
    setAlerta({ visivel: true, tipo, titulo, mensagem, onConfirm });
  };

  // --- MOTOR DE BUSCA UNIVERSAL NA BASE DE DADOS ---
  const buscarProdutoNaBase = (skuTarget) => {
    if (!skuTarget) return null;
    return baseProdutos.find(p => {
      // Varre todos os valores dentro do cadastro do produto procurando o código de barras
      return Object.values(p).some(val => String(val).trim() === String(skuTarget).trim());
    });
  };

  const extrairEstoqueNaBase = (produto) => {
    if (!produto) return 0;
    // Procura na base qualquer coluna que lembre "estoque" ou "quantidade", ignorando maiúsculas
    const chaveEstoque = Object.keys(produto).find(k => 
      k.toLowerCase() === 'estoque' || 
      k.toLowerCase().includes('quant') || 
      k.toLowerCase().includes('qtd')
    );
    return chaveEstoque && produto[chaveEstoque] != null 
      ? Number(produto[chaveEstoque].toString().replace(',', '.')) 
      : 0;
  };

  const extrairDescricaoNaBase = (produto) => {
    if (!produto) return null;
    // Procura na base a coluna de descrição ou nome do produto
    const chaveDesc = Object.keys(produto).find(k => 
      k.toLowerCase().includes('desc') || 
      k.toLowerCase().includes('nome') || 
      k.toLowerCase().includes('produto')
    );
    return chaveDesc ? produto[chaveDesc] : null;
  };

  // --- LEITOR INTELIGENTE DE CSV (Evita quebra de colunas se houver vírgula na descrição) ---
  const parseLinhaCSV = (linha, delimitador) => {
    let colunas = [];
    let controleAspas = false;
    let valorAtual = '';
    for (let i = 0; i < linha.length; i++) {
      const char = linha[i];
      if (char === '"') controleAspas = !controleAspas;
      else if (char === delimitador && !controleAspas) {
        colunas.push(valorAtual.trim());
        valorAtual = '';
      } else {
        valorAtual += char;
      }
    }
    colunas.push(valorAtual.trim());
    return colunas;
  };

  const handleImportarArquivo = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (file.name.endsWith('.xlsx') || file.name.endsWith('.xls')) {
      mostrarAlerta('erro', 'Formato Incompatível', 'Por favor, abra esta planilha no Excel e clique em "Salvar Como -> CSV (Separado por vírgulas)" antes de importar.\n\nOu exporte diretamente como CSV no UpSeller.');
      e.target.value = null;
      return;
    }

    const reader = new FileReader();
    reader.onload = (evento) => {
      const texto = evento.target.result;
      const linhas = texto.split('\n');
      if (linhas.length < 2) {
        mostrarAlerta('erro', 'Planilha Vazia', 'A planilha não contém dados suficientes.');
        return;
      }

      const delimitador = linhas[0].includes(';') ? ';' : ',';
      // Lê o cabeçalho usando o parser inteligente
      const cabecalhos = parseLinhaCSV(linhas[0], delimitador).map(c => c.replace(/^"|"$/g, ''));

      const findIndexStrict = (arr, options) => {
        for (const opt of options) {
          const idx = arr.findIndex(c => c.toLowerCase() === opt.toLowerCase());
          if (idx !== -1) return idx;
        }
        return -1;
      };

      const idxId = findIndexStrict(cabecalhos, ['Nº de Pedido da Plataforma', 'Nº de Pedido']);
      const idxPlataforma = findIndexStrict(cabecalhos, ['Plataformas', 'Plataforma']);
      const idxPrazo = findIndexStrict(cabecalhos, ['Prazo de Envio']);
      const idxSKU = findIndexStrict(cabecalhos, ['SKU']);
      const idxQtd = findIndexStrict(cabecalhos, ['Qtd. do Produto', 'Quantidade']);
      const idxNomeAnuncio = findIndexStrict(cabecalhos, ['Nome do Anúncio']);

      if (idxId === -1 || idxSKU === -1 || idxQtd === -1) {
        mostrarAlerta('erro', 'Colunas Faltando', 'Não encontramos as colunas necessárias na planilha.\nCertifique-se de que exportou o "Nº de Pedido", "SKU" e a "Qtd. do Produto".');
        return;
      }

      const pedidosAgrupados = {};
      let qtdComAlerta = 0;

      for (let i = 1; i < linhas.length; i++) {
        if (!linhas[i].trim()) continue;
        
        // Lê a linha usando o parser inteligente
        const colunas = parseLinhaCSV(linhas[i], delimitador).map(c => c.replace(/^"|"$/g, ''));
        
        const idPedido = colunas[idxId];
        const sku = colunas[idxSKU];
        const qtdVendida = parseInt(colunas[idxQtd], 10);
        
        if (!idPedido || !sku || isNaN(qtdVendida)) continue;

        const nomeAnuncioPlanilha = idxNomeAnuncio !== -1 ? colunas[idxNomeAnuncio] : 'Produto Desconhecido';

        // 1. Busca Universal do Produto na Base
        const produtoBase = buscarProdutoNaBase(sku);
        
        // 2. Extração Universal do Nome (Base vs Planilha)
        const descricaoFinal = produtoBase ? extrairDescricaoNaBase(produtoBase) : `⚠️ ${nomeAnuncioPlanilha}`;
        
        // 3. Extração Universal do Estoque
        const estoqueAtual = extrairEstoqueNaBase(produtoBase);
        
        // Só dispara o alerta se a quantidade vendida estourar o estoque da base
        const alertaEstoque = qtdVendida > estoqueAtual;

        if (!pedidosAgrupados[idPedido]) {
          pedidosAgrupados[idPedido] = {
            id: idPedido,
            status: 'Pendente',
            data: new Date().toLocaleDateString('pt-BR'),
            plataforma: idxPlataforma !== -1 ? colunas[idxPlataforma] : 'Marketplace',
            prazo: idxPrazo !== -1 ? colunas[idxPrazo] : 'Sem Prazo',
            cliente: 'Cliente Marketplace',
            itens: 0,
            listaItens: [],
            historico: {},
            temAlertaEstoque: false
          };
        }

        pedidosAgrupados[idPedido].listaItens.push({
          cod: sku,
          descricao: descricaoFinal,
          quantidade: qtdVendida,
          estoque: estoqueAtual,
          insuficiente: alertaEstoque
        });

        pedidosAgrupados[idPedido].itens += qtdVendida;
        
        if (alertaEstoque) {
          pedidosAgrupados[idPedido].temAlertaEstoque = true;
        }
      }

      const arrayPedidos = Object.values(pedidosAgrupados);
      qtdComAlerta = arrayPedidos.filter(p => p.temAlertaEstoque).length;

      setPedidosImportados(arrayPedidos);
      
      if (qtdComAlerta > 0) {
        mostrarAlerta('aviso', 'Atenção ao Estoque', `${arrayPedidos.length} pedidos importados!\n\nPorém, identificamos que ${qtdComAlerta} pedido(s) possuem produtos com estoque insuficiente ou não estão cadastrados na sua base. Verifique os destaques em amarelo.`);
      } else {
        mostrarAlerta('sucesso', 'Importação Concluída', `${arrayPedidos.length} pedidos encontrados e agrupados com sucesso! Todos possuem saldo no estoque.`);
      }
      
      e.target.value = null; 
    };
    
    // Mantém a acentuação correta da tabela exportada
    reader.readAsText(file, 'ISO-8859-1'); 
  };

  const finalizarImportacao = () => {
    if (pedidosImportados.length === 0) {
      mostrarAlerta('erro', 'Lista Vazia', 'Importe uma planilha com pedidos antes de salvar.');
      return;
    }

    mostrarAlerta('sucesso', 'Pedidos Lançados!', 'Os pedidos foram enviados para a fila de separação do Marketplace.', () => {
      setAlerta({ ...alerta, visivel: false });
      aoSalvar(pedidosImportados);
    });
  };

  return (
    <div className="inserir-pedido-container">
      <div className="nova-req-header">
        <h2>📥 Inserir Pedidos - Marketplace</h2>
        <button className="btn-voltar" onClick={aoVoltar}>← Voltar ao Painel</button>
      </div>

      <div className="card-formulario">
        
        {pedidosImportados.length === 0 && (
          <div className="area-importacao">
            <h3>Importação Automática via UpSeller</h3>
            <p>Faça o upload do arquivo <strong>.CSV</strong> gerado pelo ERP. O sistema irá agrupar os itens automaticamente.</p>
            
            <input 
              type="file" 
              accept=".csv" 
              ref={inputArquivoRef} 
              style={{ display: 'none' }} 
              onChange={handleImportarArquivo} 
            />
            <button className="btn-selecionar-arquivo" onClick={() => inputArquivoRef.current.click()}>
              📁 Selecionar Arquivo CSV
            </button>
          </div>
        )}

        {pedidosImportados.length > 0 && (
          <>
            <div className="cabecalho-insercao">
              <h3 style={{ margin: 0 }}>Pré-visualização dos Pedidos</h3>
              <button className="btn-selecionar-arquivo" style={{ padding: '8px 15px', fontSize: '0.9rem' }} onClick={() => setPedidosImportados([])}>
                🗑️ Limpar e Importar Novamente
              </button>
            </div>

            <div className="tabela-wrapper">
              <table className="tabela-importados">
                <thead>
                  <tr>
                    <th>Nº do Pedido</th>
                    <th>Plataforma</th>
                    <th>SLA (Prazo)</th>
                    <th>Itens Totais</th>
                    <th>Status do Estoque</th>
                  </tr>
                </thead>
                <tbody>
                  {pedidosImportados.map((pedido) => (
                    <tr 
                      key={pedido.id} 
                      className={`linha-tabela-hover ${pedido.temAlertaEstoque ? 'linha-com-alerta' : ''}`}
                      onClick={() => setPedidoSelecionado(pedido)}
                      title="Clique para ver os itens deste pedido"
                    >
                      <td><strong>{pedido.id}</strong></td>
                      <td>{pedido.plataforma}</td>
                      <td>{pedido.prazo}</td>
                      <td>{pedido.itens} un</td>
                      <td>
                        {pedido.temAlertaEstoque ? (
                          <span className="alerta-estoque-badge">⚠️ Estoque Crítico</span>
                        ) : (
                          <span style={{ color: '#27ae60', fontWeight: 'bold' }}>✅ OK</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <p style={{ fontSize: '0.85rem', color: '#7f8c8d', marginTop: '10px' }}>
                * Clique em qualquer linha acima para ver os detalhes dos produtos antes de salvar.
              </p>
            </div>

            <div className="rodape-formulario">
              <button className="btn-salvar" onClick={finalizarImportacao}>Gravar {pedidosImportados.length} Pedidos</button>
            </div>
          </>
        )}
      </div>

      {pedidoSelecionado && (
        <div className="alerta-modal-overlay" onClick={() => setPedidoSelecionado(null)}>
          <div className="detalhes-pedido-box" onClick={(e) => e.stopPropagation()}>
            <div className="detalhes-pedido-header">
              <span>📦 Itens do Pedido: {pedidoSelecionado.id}</span>
              <button className="btn-fechar-mini" onClick={() => setPedidoSelecionado(null)}>×</button>
            </div>
            <div className="detalhes-pedido-body">
              <table className="tabela-importados">
                <thead>
                  <tr>
                    <th>SKU (Cód)</th>
                    <th>Descrição</th>
                    <th>Qtd Comprada</th>
                    <th>Na Sua Base</th>
                  </tr>
                </thead>
                <tbody>
                  {pedidoSelecionado.listaItens.map((item, index) => (
                    <tr key={index}>
                      <td>{item.cod}</td>
                      <td>{item.descricao}</td>
                      <td><strong>{item.quantidade}</strong></td>
                      <td className={item.insuficiente ? 'item-critico' : ''}>
                        {item.estoque} {item.insuficiente && '⚠️'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {alerta.visivel && (
        <div className="alerta-modal-overlay">
          <div className="alerta-modal-box">
            <div className={`alerta-modal-header tipo-${alerta.tipo}`}>
              {alerta.titulo}
            </div>
            <div className="alerta-modal-body">
              {alerta.mensagem.split('\n').map((linha, i) => (
                <span key={i}>{linha}<br/></span>
              ))}
            </div>
            <div className="alerta-modal-footer">
              <button className="btn-fechar-alerta" onClick={() => {
                if (alerta.onConfirm) alerta.onConfirm();
                else setAlerta({ ...alerta, visivel: false });
              }}>
                Entendi
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}