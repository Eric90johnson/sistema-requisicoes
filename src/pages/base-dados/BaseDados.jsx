import React, { useRef, useState, useEffect } from 'react';
import '../../styles/pages/base-dados/baseDados.css';

const parseValorMoeda = (valorStr) => {
  if (!valorStr) return 0;
  if (typeof valorStr === 'number') return valorStr;
  let limpo = valorStr.toString().replace(/[^\d.,-]/g, '');
  if (limpo.includes('.') && limpo.includes(',')) {
    limpo = limpo.replace(/\./g, '');
  }
  limpo = limpo.replace(',', '.');
  return Number(limpo) || 0;
};

export default function BaseDados({ aoVoltar, produtos, itensPreRequisicao = [], aoAdicionarPreRequisicao, aoRemoverPreRequisicao, aoIrParaPreRequisicao }) {
  const [buscaCodigo, setBuscaCodigo] = useState('');
  const [buscaDescricao, setBuscaDescricao] = useState('');
  const [buscaCodigoBarra, setBuscaCodigoBarra] = useState('');
  const [buscaMarca, setBuscaMarca] = useState('');

  const [linhaExpandida, setLinhaExpandida] = useState(null);

  const [menuAberto, setMenuAberto] = useState(null);
  const [filtrosAtivos, setFiltrosAtivos] = useState({});
  const [ordenacao, setOrdenacao] = useState({ coluna: null, direcao: null });
  
  const [filtroTemporario, setFiltroTemporario] = useState([]);
  const [valoresUnicosMenu, setValoresUnicosMenu] = useState([]);
  const [buscaMenu, setBuscaMenu] = useState('');

  const [itensVisiveis, setItensVisiveis] = useState(50);

  const [larguras, setLarguras] = useState({
    codigo: 180,
    descricao: 350,
    codigoBarra: 160,
    ncm: 110,
    fornecedor: 200,
    marca: 160,
    quantidade: 110,
    precoVenda: 140,
    precoCusto: 140
  });

  const larguraTotalTabela = Object.values(larguras).reduce((acc, curr) => acc + curr, 0);
  const arrastandoCol = useRef(null);
  const startX = useRef(0);
  const startLargura = useRef(0);

  const iniciarRedimensionamento = (e, coluna) => {
    arrastandoCol.current = coluna;
    startX.current = e.pageX;
    startLargura.current = larguras[coluna];
    
    document.addEventListener('mousemove', moverRedimensionamento);
    document.addEventListener('mouseup', pararRedimensionamento);
  };

  const moverRedimensionamento = (e) => {
    if (!arrastandoCol.current) return;
    const delta = e.pageX - startX.current;
    const novaLargura = Math.max(45, startLargura.current + delta); 
    
    const thElement = document.getElementById(`th-${arrastandoCol.current}`);
    if (thElement) {
      thElement.style.width = `${novaLargura}px`;
      thElement.style.minWidth = `${novaLargura}px`;
    }

    const tabelaElement = document.getElementById('tabela-dados');
    if (tabelaElement) {
      let somaOutrasColunas = 0;
      Object.keys(larguras).forEach(k => {
        if (k !== arrastandoCol.current) somaOutrasColunas += larguras[k];
      });
      tabelaElement.style.width = `${somaOutrasColunas + novaLargura}px`;
    }
  };

  const pararRedimensionamento = () => {
    if (arrastandoCol.current) {
      const thElement = document.getElementById(`th-${arrastandoCol.current}`);
      if (thElement) {
        const larguraFinal = parseInt(thElement.style.width, 10);
        if (!isNaN(larguraFinal)) {
          setLarguras(prev => ({ ...prev, [arrastandoCol.current]: larguraFinal }));
        }
      }
    }
    arrastandoCol.current = null;
    document.removeEventListener('mousemove', moverRedimensionamento);
    document.removeEventListener('mouseup', pararRedimensionamento);
  };

  useEffect(() => {
    return () => {
      document.removeEventListener('mousemove', moverRedimensionamento);
      document.removeEventListener('mouseup', pararRedimensionamento);
    };
  }, []);

  const abrirMenu = (coluna) => {
    let tempProdutos = produtos;
    Object.keys(filtrosAtivos).forEach(col => {
      if (col !== coluna && filtrosAtivos[col]) {
        tempProdutos = tempProdutos.filter(p => filtrosAtivos[col].includes(p[col]));
      }
    });

    const unicos = [...new Set(tempProdutos.map(p => p[coluna]))].filter(Boolean).sort();
    setValoresUnicosMenu(unicos);

    if (filtrosAtivos[coluna]) {
      setFiltroTemporario(filtrosAtivos[coluna]);
    } else {
      setFiltroTemporario(unicos);
    }

    setBuscaMenu('');
    setMenuAberto(coluna);
  };

  const fecharMenu = () => setMenuAberto(null);

  const aplicarOrdem = (coluna, direcao) => {
    setOrdenacao({ coluna, direcao });
    setItensVisiveis(50); 
    fecharMenu();
  };

  const aplicarFiltro = (coluna) => {
    if (filtroTemporario.length === valoresUnicosMenu.length) {
      const novosFiltros = { ...filtrosAtivos };
      delete novosFiltros[coluna];
      setFiltrosAtivos(novosFiltros);
    } else {
      setFiltrosAtivos({ ...filtrosAtivos, [coluna]: filtroTemporario });
    }
    setItensVisiveis(50); 
    fecharMenu();
  };

  const limparFiltro = (coluna) => {
    const novosFiltros = { ...filtrosAtivos };
    delete novosFiltros[coluna];
    setFiltrosAtivos(novosFiltros);
    setItensVisiveis(50); 
    fecharMenu();
  };

  const valoresExibidos = valoresUnicosMenu.filter(v => v.toLowerCase().includes(buscaMenu.toLowerCase()));
  const todasExibidasMarcadas = valoresExibidos.length > 0 && valoresExibidos.every(v => filtroTemporario.includes(v));

  const handleToggleTodas = () => {
    if (todasExibidasMarcadas) {
      setFiltroTemporario(filtroTemporario.filter(v => !valoresExibidos.includes(v)));
    } else {
      const setUnico = new Set([...filtroTemporario, ...valoresExibidos]);
      setFiltroTemporario([...setUnico]);
    }
  };

  const handleToggleItem = (valor) => {
    if (filtroTemporario.includes(valor)) {
      setFiltroTemporario(filtroTemporario.filter(v => v !== valor));
    } else {
      setFiltroTemporario([...filtroTemporario, valor]);
    }
  };

  let produtosFiltrados = [...produtos];

  if (buscaCodigo.trim() !== '') {
    const termo = buscaCodigo.toLowerCase();
    produtosFiltrados = produtosFiltrados.filter(p => p.codigo && p.codigo.toLowerCase().includes(termo));
  }
  if (buscaDescricao.trim() !== '') {
    const termo = buscaDescricao.toLowerCase();
    produtosFiltrados = produtosFiltrados.filter(p => p.descricao && p.descricao.toLowerCase().includes(termo));
  }
  if (buscaCodigoBarra.trim() !== '') {
    const termo = buscaCodigoBarra.toLowerCase();
    produtosFiltrados = produtosFiltrados.filter(p => p.codigoBarra && p.codigoBarra.toLowerCase().includes(termo));
  }
  if (buscaMarca.trim() !== '') {
    const termo = buscaMarca.toLowerCase();
    produtosFiltrados = produtosFiltrados.filter(p => p.marca && p.marca.toLowerCase().includes(termo));
  }
  
  Object.keys(filtrosAtivos).forEach(col => {
    if (filtrosAtivos[col]) {
      produtosFiltrados = produtosFiltrados.filter(p => filtrosAtivos[col].includes(p[col]));
    }
  });

  if (ordenacao.coluna) {
    produtosFiltrados.sort((a, b) => {
      let valA = a[ordenacao.coluna];
      let valB = b[ordenacao.coluna];

      const isNumA = parseFloat(valA?.toString().replace(',', '.'));
      const isNumB = parseFloat(valB?.toString().replace(',', '.'));
      if (!isNaN(isNumA) && !isNaN(isNumB)) {
        return ordenacao.direcao === 'asc' ? isNumA - isNumB : isNumB - isNumA;
      }

      let strA = valA?.toString().toLowerCase() || '';
      let strB = valB?.toString().toLowerCase() || '';
      if (strA < strB) return ordenacao.direcao === 'asc' ? -1 : 1;
      if (strA > strB) return ordenacao.direcao === 'asc' ? 1 : -1;
      return 0;
    });
  }

  const produtosParaExibir = produtosFiltrados.slice(0, itensVisiveis);

  const handleScroll = (e) => {
    const { scrollTop, clientHeight, scrollHeight } = e.target;
    if (scrollHeight - scrollTop <= clientHeight + 150) {
      setItensVisiveis(prev => prev + 50);
    }
  };

  const limparTodasAsBuscas = () => {
    setBuscaCodigo('');
    setBuscaDescricao('');
    setBuscaCodigoBarra('');
    setBuscaMarca('');
    setItensVisiveis(50);
  };

  const renderCabecalho = (titulo, chave) => {
    const isFiltrado = filtrosAtivos[chave] !== undefined;
    
    return (
      <th 
        id={`th-${chave}`} 
        key={chave} 
        style={{ width: `${larguras[chave]}px`, minWidth: `${larguras[chave]}px` }} 
      >
        <div className="th-excel">
          <span className="th-titulo-texto" title={titulo}>{titulo}</span>
          <button 
            className="btn-filtro-excel" 
            onClick={() => abrirMenu(chave)}
            style={{ backgroundColor: isFiltrado ? '#2980b9' : 'transparent', color: isFiltrado ? 'white' : 'inherit' }}
            title="Filtrar ou Ordenar"
          >
            {isFiltrado ? '🔍' : '🔽'}
          </button>
          
          {menuAberto === chave && (
            <>
              <div className="backdrop-excel" onClick={fecharMenu}></div>
              <div className="menu-excel-dropdown">
                <button className="menu-excel-btn-ordem" onClick={() => aplicarOrdem(chave, 'asc')}>⬇️ Classificar A a Z</button>
                <button className="menu-excel-btn-ordem" onClick={() => aplicarOrdem(chave, 'desc')}>⬆️ Classificar Z a A</button>
                <div className="divisor-excel"></div>
                <input type="text" className="input-busca-excel" placeholder="Pesquisar..." value={buscaMenu} onChange={(e) => setBuscaMenu(e.target.value)} />
                <div className="menu-excel-lista">
                  <label><input type="checkbox" checked={todasExibidasMarcadas} onChange={handleToggleTodas} /><strong>(Selecionar Tudo)</strong></label>
                  {valoresExibidos.map(v => (
                    <label key={v}><input type="checkbox" checked={filtroTemporario.includes(v)} onChange={() => handleToggleItem(v)} />{v}</label>
                  ))}
                </div>
                <div className="menu-excel-acoes">
                  {isFiltrado ? <button className="btn-excel-limpar" onClick={() => limparFiltro(chave)}>Limpar Filtro</button> : <div></div>}
                  <button className="btn-excel-aplicar" onClick={() => aplicarFiltro(chave)}>Aplicar</button>
                </div>
              </div>
            </>
          )}
        </div>
        <div className="resizer" onMouseDown={(e) => iniciarRedimensionamento(e, chave)}></div>
      </th>
    );
  };

  const estiloInputBusca = {
    flex: '1 1 200px',
    padding: '10px 12px',
    borderRadius: '6px',
    border: '1px solid #bdc3c7',
    fontSize: '0.95rem',
    outline: 'none',
    minWidth: '150px'
  };

  const temBuscaAtiva = buscaCodigo || buscaDescricao || buscaCodigoBarra || buscaMarca;

  const toggleExpandirLinha = (codigoProd) => {
    setLinhaExpandida(prev => (prev === codigoProd ? null : codigoProd));
  };

  const isProdutoNaPreRequisicao = (codigoProd) => {
    return itensPreRequisicao.some(item => String(item.codigo) === String(codigoProd));
  };

  return (
    <div className="base-dados-container">
      <div className="base-dados-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h2>Consulta de Estoque e Produtos</h2>
        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
          {itensPreRequisicao.length > 0 && (
            <button 
              className="btn-ir-pre-requisicao"
              onClick={aoIrParaPreRequisicao}
              style={{
                backgroundColor: '#27ae60',
                color: 'white',
                border: 'none',
                padding: '10px 18px',
                borderRadius: '6px',
                fontWeight: 'bold',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                boxShadow: '0 2px 4px rgba(0,0,0,0.15)'
              }}
            >
              🛒 Ir para Pré-requisição ({itensPreRequisicao.length})
            </button>
          )}
          <button className="btn-voltar" onClick={aoVoltar}>← Voltar ao Painel</button>
        </div>
      </div>

      <div className="acoes-base" style={{ padding: '15px', backgroundColor: '#e8f4f8', borderLeft: '4px solid #3498db', marginBottom: '20px', borderRadius: '4px' }}>
        <p style={{ margin: 0, color: '#2c3e50' }}>
          <strong>Dica de Loja:</strong> Clique em qualquer linha do produto para selecioná-lo e adicioná-lo à sua pré-requisição de reposição interna.
        </p>
      </div>

      {produtos.length > 0 ? (
        <>
          <div style={{ marginBottom: '15px', display: 'flex', gap: '10px', flexWrap: 'wrap', alignItems: 'center' }}>
            <input 
              type="text" 
              placeholder="🔍 Código..." 
              value={buscaCodigo}
              onChange={(e) => { setBuscaCodigo(e.target.value); setItensVisiveis(50); }}
              style={estiloInputBusca}
            />
            <input 
              type="text" 
              placeholder="🔍 Descrição..." 
              value={buscaDescricao}
              onChange={(e) => { setBuscaDescricao(e.target.value); setItensVisiveis(50); }}
              style={estiloInputBusca}
            />
            <input 
              type="text" 
              placeholder="🔍 Cód. Barras..." 
              value={buscaCodigoBarra}
              onChange={(e) => { setBuscaCodigoBarra(e.target.value); setItensVisiveis(50); }}
              style={estiloInputBusca}
            />
            <input 
              type="text" 
              placeholder="🔍 Marca..." 
              value={buscaMarca}
              onChange={(e) => { setBuscaMarca(e.target.value); setItensVisiveis(50); }}
              style={estiloInputBusca}
            />
            
            {temBuscaAtiva && (
              <button 
                onClick={limparTodasAsBuscas}
                style={{
                  padding: '10px 15px',
                  backgroundColor: '#e74c3c',
                  color: 'white',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontWeight: 'bold',
                  flex: '0 0 auto'
                }}
              >
                Limpar Buscas
              </button>
            )}
          </div>

          <div className="tabela-responsiva" onScroll={handleScroll}>
            <table id="tabela-dados" className="tabela-produtos" style={{ width: `${larguraTotalTabela}px` }}>
              <thead>
                <tr>
                  {renderCabecalho("PRODUTO (Código)", "codigo")}
                  {renderCabecalho("DESCRIÇÃO", "descricao")}
                  {renderCabecalho("CÓDIGO BARRA", "codigoBarra")}
                  {renderCabecalho("NCM", "ncm")}
                  {renderCabecalho("FORNECEDOR", "fornecedor")}
                  {renderCabecalho("MARCA", "marca")}
                  {renderCabecalho("ESTOQUE", "quantidade")}
                  {renderCabecalho("PREÇO VENDA", "precoVenda")}
                  {renderCabecalho("PREÇO CUSTO", "precoCusto")}
                </tr>
              </thead>
              <tbody>
                {produtosParaExibir.length > 0 ? (
                  produtosParaExibir.map((prod, index) => {
                    const estaExpandido = linhaExpandida === prod.codigo;
                    const jaAdicionado = isProdutoNaPreRequisicao(prod.codigo);

                    return (
                      <React.Fragment key={prod.codigo || index}>
                        <tr 
                          onClick={() => toggleExpandirLinha(prod.codigo)}
                          style={{ cursor: 'pointer', backgroundColor: estaExpandido ? '#f0f8ff' : (jaAdicionado ? '#f4fcf5' : 'inherit') }}
                          title="Clique para expandir e adicionar à pré-requisição"
                        >
                          <td title={prod.codigo}><strong>{prod.codigo}</strong> {jaAdicionado && '✅'}</td>
                          <td title={prod.descricao}>{prod.descricao}</td> 
                          <td title={prod.codigoBarra}>{prod.codigoBarra}</td>
                          <td title={prod.ncm}>{prod.ncm}</td>
                          <td title={prod.fornecedor}>{prod.fornecedor}</td>
                          <td title={prod.marca}>{prod.marca}</td>
                          <td style={{ color: '#27ae60', fontWeight: 'bold' }}>{prod.quantidade}</td>
                          <td>R$ {prod.precoVenda}</td>
                          <td>R$ {prod.precoCusto}</td>
                        </tr>

                        {estaExpandido && (
                          <tr style={{ backgroundColor: '#f9fafd' }}>
                            <td colSpan="9" style={{ padding: '15px 20px', borderBottom: '2px solid #3498db', textAlign: 'center' }}>
                              <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', width: '100%' }}>
                                {jaAdicionado ? (
                                  <button 
                                    onClick={(e) => { e.stopPropagation(); aoRemoverPreRequisicao(prod.codigo); }}
                                    style={{
                                      backgroundColor: '#e74c3c',
                                      color: 'white',
                                      border: 'none',
                                      padding: '10px 20px',
                                      borderRadius: '6px',
                                      fontWeight: 'bold',
                                      cursor: 'pointer',
                                      fontSize: '0.95rem'
                                    }}
                                  >
                                    ❌ Remover da Pré-requisição
                                  </button>
                                ) : (
                                  <button 
                                    onClick={(e) => { e.stopPropagation(); aoAdicionarPreRequisicao(prod); }}
                                    style={{
                                      backgroundColor: '#2980b9',
                                      color: 'white',
                                      border: 'none',
                                      padding: '10px 24px',
                                      borderRadius: '6px',
                                      fontWeight: 'bold',
                                      cursor: 'pointer',
                                      boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
                                      fontSize: '0.95rem'
                                    }}
                                  >
                                    ➕ Adicionar à Pré-requisição
                                  </button>
                                )}
                              </div>
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan="9" style={{ textAlign: 'center', padding: '50px', color: '#888' }}>
                      Nenhum produto encontrado com a busca ou filtros atuais.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </>
      ) : (
        <div className="mensagem-vazia">
          A base de dados de produtos ainda não foi sincronizada.
        </div>
      )}
    </div>
  );
}