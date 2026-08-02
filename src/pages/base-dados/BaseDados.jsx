import { useRef, useState, useEffect } from 'react';
import '../../styles/pages/base-dados/baseDados.css';

export default function BaseDados({ aoVoltar, produtos, setProdutos }) {
  const inputFileRef = useRef(null);

  // Estados dos Filtros Avançados
  const [menuAberto, setMenuAberto] = useState(null);
  const [filtrosAtivos, setFiltrosAtivos] = useState({});
  const [ordenacao, setOrdenacao] = useState({ coluna: null, direcao: null });
  
  // Estados temporários do menu
  const [filtroTemporario, setFiltroTemporario] = useState([]);
  const [valoresUnicosMenu, setValoresUnicosMenu] = useState([]);
  const [buscaMenu, setBuscaMenu] = useState('');

  // Estado do Popup
  const [popup, setPopup] = useState({ visivel: false, quantidade: 0 });

  // Estado para a Renderização Progressiva (Lazy Load)
  const [itensVisiveis, setItensVisiveis] = useState(50);

  // Estado para armazenar a largura individual de cada coluna
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

  // 1. Funções de Redimensionamento das Colunas
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
          setLarguras(prev => ({
            ...prev,
            [arrastandoCol.current]: larguraFinal
          }));
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

  // 2. Processamento da Importação
  const handleProcessarArquivo = (evento) => {
    const arquivo = evento.target.files[0];
    if (!arquivo) return;
    const leitor = new FileReader();
    leitor.onload = (e) => {
      const texto = e.target.result;
      const linhas = texto.split('\n');
      const novosProdutos = [];
      for (let i = 1; i < linhas.length; i++) {
        const linhaAtual = linhas[i].trim();
        if (linhaAtual) {
          const separador = linhaAtual.includes(';') ? ';' : ',';
          const colunas = linhaAtual.split(separador);
          novosProdutos.push({
            codigo: colunas[0] ? colunas[0].trim() : '-',
            descricao: colunas[1] ? colunas[1].trim() : 'Sem descrição',
            codigoBarra: colunas[2] ? colunas[2].trim() : '-',
            ncm: colunas[3] ? colunas[3].trim() : '-',
            fornecedor: colunas[4] ? colunas[4].trim() : '-',
            marca: colunas[5] ? colunas[5].trim() : '-',
            quantidade: colunas[6] ? colunas[6].trim() : '0', 
            precoVenda: colunas[7] ? colunas[7].trim() : '0,00',
            precoCusto: colunas[8] ? colunas[8].trim() : '0,00'
          });
        }
      }
      setProdutos(novosProdutos);
      setFiltrosAtivos({}); 
      setItensVisiveis(50); 
      setPopup({ visivel: true, quantidade: novosProdutos.length });
      evento.target.value = null; 
    };
    leitor.readAsText(arquivo);
  };

  const fecharPopup = () => setPopup({ visivel: false, quantidade: 0 });

  // 3. Funções do Menu Excel
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

  // 4. LÓGICA FINAL: Cruzamento de Filtros e Ordenação
  let produtosFiltrados = [...produtos];
  
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

  // Criação do array final cortado para a Rolagem Infinita
  const produtosParaExibir = produtosFiltrados.slice(0, itensVisiveis);

  // Função que detecta se o usuário rolou a tabela até o final
  const handleScroll = (e) => {
    const { scrollTop, clientHeight, scrollHeight } = e.target;
    if (scrollHeight - scrollTop <= clientHeight + 150) {
      setItensVisiveis(prev => prev + 50);
    }
  };

  // Componente do Cabeçalho Excel com Resizer
  const renderCabecalho = (titulo, chave) => {
    const isFiltrado = filtrosAtivos[chave] !== undefined;
    
    return (
      <th 
        id={`th-${chave}`} 
        key={chave} 
        style={{ width: `${larguras[chave]}px`, minWidth: `${larguras[chave]}px` }} 
      >
        <div className="th-excel">
          
          <span className="th-titulo-texto" title={titulo}>
            {titulo}
          </span>
          
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

  return (
    <div className="base-dados-container">
      <div className="base-dados-header">
        <h2>Base de Dados de Produtos</h2>
        <button className="btn-voltar" onClick={aoVoltar}>← Voltar ao Painel</button>
      </div>

      <div className="acoes-base">
        <p>Importe a planilha de posição de estoque gerada pelo ERP. O sistema espera o formato CSV padrão com as 9 colunas.</p>
        <input type="file" accept=".csv" ref={inputFileRef} className="input-file-oculto" onChange={handleProcessarArquivo} />
        <button className="btn-importar" onClick={() => inputFileRef.current.click()}>
          <span>📥</span> Importar Arquivo ERP (.CSV)
        </button>
      </div>

      {produtos.length > 0 ? (
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
                produtosParaExibir.map((prod, index) => (
                  <tr key={index}>
                    <td title={prod.codigo}><strong>{prod.codigo}</strong></td>
                    <td title={prod.descricao}>{prod.descricao}</td> 
                    <td title={prod.codigoBarra}>{prod.codigoBarra}</td>
                    <td title={prod.ncm}>{prod.ncm}</td>
                    <td title={prod.fornecedor}>{prod.fornecedor}</td>
                    <td title={prod.marca}>{prod.marca}</td>
                    <td style={{ color: '#27ae60', fontWeight: 'bold' }}>{prod.quantidade}</td>
                    <td>R$ {prod.precoVenda}</td>
                    <td>R$ {prod.precoCusto}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="9" style={{ textAlign: 'center', padding: '50px', color: '#888' }}>
                    Nenhum produto encontrado com as combinações de filtro atuais.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="mensagem-vazia">
          Nenhum produto carregado. Importe o arquivo "POSICAODEESTOQUE.CSV" para visualizar.
        </div>
      )}

      {popup.visivel && (
        <div className="popup-overlay" onClick={fecharPopup}>
          <div className="popup-content" onClick={(e) => e.stopPropagation()}>
            <span className="popup-icone">✅</span>
            <p className="popup-mensagem">
              <strong>Sucesso!</strong>
              Base de dados atualizada. <br/>
              {popup.quantidade} produtos foram importados.
            </p>
            <button className="popup-btn" onClick={fecharPopup}>
              Entendi
            </button>
          </div>
        </div>
      )}
    </div>
  );
}