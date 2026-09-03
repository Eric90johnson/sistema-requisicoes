import React, { useRef, useState, useEffect } from 'react';
import { Html5QrcodeScanner, Html5Qrcode, Html5QrcodeSupportedFormats } from 'html5-qrcode';
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

export default function BaseDados({ 
  aoVoltar, 
  produtos, 
  itensPreRequisicao = [], 
  aoAdicionarPreRequisicao, 
  aoRemoverPreRequisicao, 
  aoIrParaPreRequisicao,
  tipoReposicaoGlobal,
  setTipoReposicaoGlobal,
  inicioCronometroGlobal,
  setInicioCronometroGlobal
}) {
  const [buscaCodigo, setBuscaCodigo] = useState('');
  const [buscaDescricao, setBuscaDescricao] = useState('');
  const [buscaCodigoBarra, setBuscaCodigoBarra] = useState('');
  const [buscaMarca, setBuscaMarca] = useState('');

  const [linhaExpandida, setLinhaExpandida] = useState(null);
  
  const [qtds, setQtds] = useState({}); 

  const [bipState, setBipState] = useState({}); 
  const [bipInputVal, setBipInputVal] = useState({}); 
  const [alertaExterna, setAlertaExterna] = useState(false); 
  const [cameraAtiva, setCameraAtiva] = useState(null); 
  const [cameraBuscaAtiva, setCameraBuscaAtiva] = useState(false); // NOVO: Estado para a câmera de pesquisa

  const [nomeSeparador, setNomeSeparador] = useState('');

  const [tempoAtual, setTempoAtual] = useState(Date.now());

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
    quantidade: 110,
    codigoBarra: 160,
    ncm: 110,
    fornecedor: 200,
    marca: 160,
    precoVenda: 140,
    precoCusto: 140
  });

  const larguraTotalTabela = Object.values(larguras).reduce((acc, curr) => acc + curr, 0);
  const arrastandoCol = useRef(null);
  const startX = useRef(0);
  const startLargura = useRef(0);

  useEffect(() => {
    let interval;
    if (inicioCronometroGlobal) {
      interval = setInterval(() => {
        setTempoAtual(Date.now());
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [inicioCronometroGlobal]);

  const segundosDecorridos = inicioCronometroGlobal ? Math.floor((tempoAtual - inicioCronometroGlobal) / 1000) : 0;

  const formatarTempo = (totalSegundos) => {
    const h = Math.floor(totalSegundos / 3600).toString().padStart(2, '0');
    const m = Math.floor((totalSegundos % 3600) / 60).toString().padStart(2, '0');
    const s = (totalSegundos % 60).toString().padStart(2, '0');
    return `${h}:${m}:${s}`;
  };

  // --- EFEITO DA CÂMERA DE BIPAGEM PARA ADICIONAR (Gamificação) ---
  useEffect(() => {
    let scanner = null;
    if (cameraAtiva) {
      scanner = new Html5QrcodeScanner(
        "reader-base-dados",
        { fps: 10, qrbox: { width: 250, height: 250 } },
        false
      );
      
      scanner.render(
        (decodedText) => {
          const prod = produtos.find(p => p.codigo === cameraAtiva);
          if (prod && (decodedText === prod.codigoBarra || decodedText === prod.codigo)) {
            setBipState(prev => ({ ...prev, [prod.codigo]: { ...prev[prod.codigo], bipada: prev[prod.codigo].bipada + 1 } }));
            
            try {
              const ctx = new (window.AudioContext || window.webkitAudioContext)();
              const osc = ctx.createOscillator();
              osc.type = 'sine'; osc.frequency.setValueAtTime(900, ctx.currentTime);
              osc.connect(ctx.destination); osc.start(); osc.stop(ctx.currentTime + 0.1);
            } catch(e) {}
            
            scanner.clear();
            setCameraAtiva(null);
          } else {
            alert("❌ Código lido não corresponde a este produto!");
          }
        },
        (error) => { }
      );
    }
    return () => {
      if (scanner) {
        scanner.clear().catch(e => console.error(e));
      }
    };
  }, [cameraAtiva, produtos]);

  // --- EFEITO DA CÂMERA DE PESQUISA GERAL (NOVO) ---
  useEffect(() => {
    let scanner = null;
    let isMounted = true;

    if (cameraBuscaAtiva) {
      setTimeout(() => {
        if (!isMounted) return;
        scanner = new Html5Qrcode('leitor-camera-busca', {
          formatsToSupport: [Html5QrcodeSupportedFormats.EAN_13, Html5QrcodeSupportedFormats.EAN_8, Html5QrcodeSupportedFormats.CODE_128, Html5QrcodeSupportedFormats.UPC_A, Html5QrcodeSupportedFormats.CODE_39]
        });
        const configCamera = { fps: 10, qrbox: { width: 250, height: 100 } };

        scanner.start({ facingMode: "environment" }, configCamera,
          (decodedText) => {
            if (!decodedText || !decodedText.trim()) return;
            
            // Emite som de sucesso
            try {
              const ctx = new (window.AudioContext || window.webkitAudioContext)();
              const osc = ctx.createOscillator();
              osc.type = 'sine'; osc.frequency.setValueAtTime(800, ctx.currentTime);
              osc.connect(ctx.destination); osc.start(); osc.stop(ctx.currentTime + 0.1); 
            } catch(e) {}
            
            // Aplica a busca e fecha a câmera
            setBuscaCodigoBarra(decodedText);
            setItensVisiveis(50);
            setCameraBuscaAtiva(false);
          },
          (err) => { }
        ).catch(err => {
          console.error("Erro ao iniciar câmera de busca:", err);
          alert('Erro ao iniciar a câmera. Verifique as permissões do seu navegador.');
          setCameraBuscaAtiva(false);
        });
      }, 150);
    }
    
    return () => { 
      isMounted = false;
      if (scanner) { scanner.stop().then(() => { scanner.clear(); }).catch(err => console.error(err)); }
    };
  }, [cameraBuscaAtiva]);


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
        if (!isNaN(larguraFinal)) setLarguras(prev => ({ ...prev, [arrastandoCol.current]: larguraFinal }));
      }
    }
    arrastandoCol.current = null;
    document.removeEventListener('mousemove', moverRedimensionamento);
    document.removeEventListener('mouseup', pararRedimensionamento);
  };

  const abrirMenu = (coluna) => {
    let tempProdutos = produtos;
    Object.keys(filtrosAtivos).forEach(col => {
      if (col !== coluna && filtrosAtivos[col]) {
        tempProdutos = tempProdutos.filter(p => filtrosAtivos[col].includes(p[col]));
      }
    });
    
    const unicos = [...new Set(tempProdutos.map(p => p[coluna] !== undefined && p[coluna] !== null ? String(p[coluna]) : ''))].filter(Boolean).sort();
    
    setValoresUnicosMenu(unicos);
    if (filtrosAtivos[coluna]) setFiltroTemporario(filtrosAtivos[coluna]);
    else setFiltroTemporario(unicos);
    setBuscaMenu('');
    setMenuAberto(coluna);
  };

  const fecharMenu = () => setMenuAberto(null);

  const aplicarOrdem = (coluna, direcao) => { setOrdenacao({ coluna, direcao }); setItensVisiveis(50); fecharMenu(); };
  
  const aplicarFiltro = (coluna) => {
    if (filtroTemporario.length === valoresUnicosMenu.length) {
      const novosFiltros = { ...filtrosAtivos }; delete novosFiltros[coluna]; setFiltrosAtivos(novosFiltros);
    } else {
      setFiltrosAtivos({ ...filtrosAtivos, [coluna]: filtroTemporario });
    }
    setItensVisiveis(50); fecharMenu();
  };

  const limparFiltro = (coluna) => {
    const novosFiltros = { ...filtrosAtivos }; delete novosFiltros[coluna]; setFiltrosAtivos(novosFiltros); setItensVisiveis(50); fecharMenu();
  };

  const valoresExibidos = valoresUnicosMenu.filter(v => String(v).toLowerCase().includes(buscaMenu.toLowerCase()));
  const todasExibidasMarcadas = valoresExibidos.length > 0 && valoresExibidos.every(v => filtroTemporario.includes(v));

  const handleToggleTodas = () => {
    if (todasExibidasMarcadas) setFiltroTemporario(filtroTemporario.filter(v => !valoresExibidos.includes(v)));
    else setFiltroTemporario([...new Set([...filtroTemporario, ...valoresExibidos])]);
  };

  const handleToggleItem = (valor) => {
    if (filtroTemporario.includes(valor)) setFiltroTemporario(filtroTemporario.filter(v => v !== valor));
    else setFiltroTemporario([...filtroTemporario, valor]);
  };

  let produtosFiltrados = [...produtos];
  if (buscaCodigo.trim() !== '') produtosFiltrados = produtosFiltrados.filter(p => p.codigo && p.codigo.toLowerCase().includes(buscaCodigo.toLowerCase()));
  if (buscaDescricao.trim() !== '') produtosFiltrados = produtosFiltrados.filter(p => p.descricao && p.descricao.toLowerCase().includes(buscaDescricao.toLowerCase()));
  if (buscaCodigoBarra.trim() !== '') produtosFiltrados = produtosFiltrados.filter(p => p.codigoBarra && p.codigoBarra.toLowerCase().includes(buscaCodigoBarra.toLowerCase()));
  if (buscaMarca.trim() !== '') produtosFiltrados = produtosFiltrados.filter(p => p.marca && p.marca.toLowerCase().includes(buscaMarca.toLowerCase()));
  
  Object.keys(filtrosAtivos).forEach(col => { if (filtrosAtivos[col]) produtosFiltrados = produtosFiltrados.filter(p => filtrosAtivos[col].includes(p[col])); });

  if (ordenacao.coluna) {
    produtosFiltrados.sort((a, b) => {
      let valA = a[ordenacao.coluna]; let valB = b[ordenacao.coluna];
      const isNumA = parseFloat(valA?.toString().replace(',', '.')); const isNumB = parseFloat(valB?.toString().replace(',', '.'));
      if (!isNaN(isNumA) && !isNaN(isNumB)) return ordenacao.direcao === 'asc' ? isNumA - isNumB : isNumB - isNumA;
      let strA = valA?.toString().toLowerCase() || ''; let strB = valB?.toString().toLowerCase() || '';
      if (strA < strB) return ordenacao.direcao === 'asc' ? -1 : 1;
      if (strA > strB) return ordenacao.direcao === 'asc' ? 1 : -1;
      return 0;
    });
  }

  const produtosParaExibir = produtosFiltrados.slice(0, itensVisiveis);

  const handleScroll = (e) => {
    const { scrollTop, clientHeight, scrollHeight } = e.target;
    if (scrollHeight - scrollTop <= clientHeight + 150) setItensVisiveis(prev => prev + 50);
  };

  const limparTodasAsBuscas = () => {
    setBuscaCodigo(''); setBuscaDescricao(''); setBuscaCodigoBarra(''); setBuscaMarca(''); setItensVisiveis(50);
  };

  const renderCabecalho = (titulo, chave) => {
    const isFiltrado = filtrosAtivos[chave] !== undefined;
    return (
      <th id={`th-${chave}`} key={chave} style={{ width: `${larguras[chave]}px`, minWidth: `${larguras[chave]}px` }}>
        <div className="th-excel">
          <span className="th-titulo-texto" title={titulo}>{titulo}</span>
          <button 
            className="btn-filtro-excel" onClick={() => abrirMenu(chave)}
            style={{ backgroundColor: isFiltrado ? '#2980b9' : 'transparent', color: isFiltrado ? 'white' : 'inherit' }} title="Filtrar ou Ordenar"
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
                  {valoresExibidos.map(v => <label key={v}><input type="checkbox" checked={filtroTemporario.includes(v)} onChange={() => handleToggleItem(v)} />{v}</label>)}
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

  const estiloInputBusca = { flex: '1 1 200px', padding: '10px 12px', borderRadius: '6px', border: '1px solid #bdc3c7', fontSize: '0.95rem', outline: 'none', minWidth: '150px' };
  const temBuscaAtiva = buscaCodigo || buscaDescricao || buscaCodigoBarra || buscaMarca;

  const toggleExpandirLinha = (codigoProd) => setLinhaExpandida(prev => (prev === codigoProd ? null : codigoProd));
  const isProdutoNaPreRequisicao = (codigoProd) => itensPreRequisicao.some(item => String(item.codigo) === String(codigoProd));

  const handleAdicionarInterno = (e, prod) => {
    e.stopPropagation();
    const qtdDigitada = qtds[prod.codigo] || 1;
    const produtoComQtd = { ...prod, quantidadeDesejada: qtdDigitada };
    aoAdicionarPreRequisicao(produtoComQtd);
    setLinhaExpandida(null); 
  };

  const handleSelecionarModo = (modo) => {
    if (modo === 'externa' && !inicioCronometroGlobal) {
      setAlertaExterna(true); 
    } else {
      setTipoReposicaoGlobal(modo);
    }
  };

  const confirmarInicioExterna = () => {
    if (!nomeSeparador.trim()) {
      alert('Por favor, informe quem está separando para validar os pontos no Ranking!');
      return;
    }

    localStorage.setItem('nd_separador_gamificado', nomeSeparador.trim());

    setTipoReposicaoGlobal('externa');
    setInicioCronometroGlobal(Date.now()); 
    setAlertaExterna(false);
  };

  const confirmarChaveExterna = (e, prod) => {
    e.stopPropagation();
    const val = parseInt(qtds[prod.codigo], 10) || 1;
    setBipState(prev => ({ ...prev, [prod.codigo]: { desejada: val, bipada: 0 } }));
  };

  const editarBipManual = (e, prod) => {
    e.stopPropagation();
    setBipState(prev => ({ ...prev, [prod.codigo]: { ...prev[prod.codigo], bipada: prev[prod.codigo].desejada } }));
  };

  const checkBip = (e, prod) => {
    if (e.key === 'Enter') {
      const typed = bipInputVal[prod.codigo] || '';
      if (typed === prod.codigoBarra || typed === prod.codigo) {
        setBipState(prev => ({ ...prev, [prod.codigo]: { ...prev[prod.codigo], bipada: prev[prod.codigo].bipada + 1 } }));
        
        try {
          const ctx = new (window.AudioContext || window.webkitAudioContext)();
          const osc = ctx.createOscillator();
          osc.type = 'sine'; osc.frequency.setValueAtTime(900, ctx.currentTime);
          osc.connect(ctx.destination); osc.start(); osc.stop(ctx.currentTime + 0.1);
        } catch(err) {}

        setBipInputVal(prev => ({ ...prev, [prod.codigo]: '' })); 
      } else {
        alert("Código de barras incorreto!");
      }
    }
  };

  const handleAdicionarExterno = (e, prod) => {
    e.stopPropagation();
    const estadoLocal = bipState[prod.codigo];
    if (!estadoLocal || estadoLocal.bipada < estadoLocal.desejada) {
      alert(`Você bipou ${estadoLocal ? estadoLocal.bipada : 0} de ${estadoLocal ? estadoLocal.desejada : '?'}. Conclua a separação antes de adicionar!`);
      return;
    }
    const produtoComQtd = { ...prod, quantidadeDesejada: estadoLocal.desejada };
    aoAdicionarPreRequisicao(produtoComQtd);
    setLinhaExpandida(null); 
  };

  return (
    <div className="base-dados-container">
      
      {/* MODAL CÂMERA DE BUSCA GLOBAL (NOVO) */}
      {cameraBuscaAtiva && (
        <div className="camera-modal-overlay">
          <div className="camera-modal-content">
            <div className="camera-modal-header">📷 Escanear Cód. de Barras</div>
            <div className="camera-modal-body">
              <div id="leitor-camera-busca" className="camera-box-modal"></div>
              <button className="btn-fechar-camera" onClick={() => setCameraBuscaAtiva(false)}>Fechar Câmera</button>
            </div>
          </div>
        </div>
      )}

      {alertaExterna && (
        <div className="popup-overlay">
          <div className="popup-content" style={{ maxWidth: '500px', width: '95%', padding: '30px' }}>
            <span className="popup-icone">🏆</span>
            <div className="popup-mensagem">
              <strong>Modo Gamificado Ativado!</strong>
              <p style={{ fontSize: '0.95rem', marginBottom: '15px' }}>
                Agora suas pré-requisições valem pontos no ranking! O cronômetro vai começar a contar.
              </p>

              <div style={{
                backgroundColor: '#fdedec', color: '#c0392b', padding: '15px', borderRadius: '8px',
                borderLeft: '5px solid #e74c3c', fontSize: '0.9rem', textAlign: 'left', marginBottom: '20px', lineHeight: '1.4'
              }}>
                <strong>⚠️ ATENÇÃO E CUIDADO:</strong><br/>
                Não recarregue a página (F5), não volte ao menu anterior e não feche o navegador! 
                Caso contrário, <u>você perderá todo o seu progresso</u> e a gestão perderá a rastreabilidade dos produtos. Vamos evitar retrabalho!
              </div>

              <div style={{ textAlign: 'left', marginBottom: '25px' }}>
                <label style={{ fontWeight: 'bold', color: '#2c3e50', display: 'block', marginBottom: '8px' }}>👤 Quem está separando?</label>
                <input 
                  type="text" 
                  placeholder="Digite seu nome (Ex: João Silva)..."
                  value={nomeSeparador}
                  onChange={(e) => setNomeSeparador(e.target.value)}
                  style={{ width: '100%', padding: '12px', borderRadius: '6px', border: '1px solid #bdc3c7', fontSize: '1rem', outline: 'none' }}
                />
              </div>

            </div>
            <div style={{ display: 'flex', gap: '10px', justifyContent: 'center' }}>
              <button className="popup-btn" style={{ backgroundColor: '#95a5a6' }} onClick={() => setAlertaExterna(false)}>Cancelar</button>
              <button className="popup-btn" style={{ backgroundColor: '#27ae60' }} onClick={confirmarInicioExterna}>Tudo Certo, Começar!</button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL CÂMERA DE SEPARAÇÃO INTERNA/EXTERNA */}
      {cameraAtiva && (
        <div className="camera-modal-overlay">
          <div className="camera-modal-content">
            <div className="camera-modal-header">📷 Bipar Produto: {cameraAtiva}</div>
            <div className="camera-modal-body">
              <div id="reader-base-dados" className="camera-box-modal"></div>
              <button className="btn-fechar-camera" onClick={() => setCameraAtiva(null)}>Fechar Câmera</button>
            </div>
          </div>
        </div>
      )}

      <div className="base-dados-header">
        <h2>Consulta de Estoque e Produtos</h2>
        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
          {itensPreRequisicao.length > 0 && (
            <button className="btn-ir-pre-requisicao" onClick={aoIrParaPreRequisicao}>
              🛒 Ir para Pré-requisição ({itensPreRequisicao.length})
            </button>
          )}
          <button className="btn-voltar" onClick={aoVoltar}>← Voltar ao Painel</button>
        </div>
      </div>

      <div className="modo-reposicao-container">
        <button 
          className={`btn-modo-reposicao ${tipoReposicaoGlobal === 'interna' ? 'ativo' : ''}`}
          onClick={() => handleSelecionarModo('interna')}
        >
          🏢 Reposição Interna
        </button>
        <button 
          className={`btn-modo-reposicao externa ${tipoReposicaoGlobal === 'externa' ? 'ativo' : ''}`}
          onClick={() => handleSelecionarModo('externa')}
        >
          🚚 Reposição Externa 🏆
        </button>
      </div>

      {tipoReposicaoGlobal === 'externa' && inicioCronometroGlobal && (
        <div className="painel-cronometro-global">
          <span className="cronometro-titulo">⏱️ Tempo de Separação:</span>
          <span className="cronometro-relogio">{formatarTempo(segundosDecorridos)}</span>
        </div>
      )}

      {produtos.length > 0 ? (
        <>
          <div className="filtros-topo-container" style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', marginBottom: '20px' }}>
            <input type="text" placeholder="🔍 Código..." value={buscaCodigo} onChange={(e) => { setBuscaCodigo(e.target.value); setItensVisiveis(50); }} style={estiloInputBusca} />
            <input type="text" placeholder="🔍 Descrição..." value={buscaDescricao} onChange={(e) => { setBuscaDescricao(e.target.value); setItensVisiveis(50); }} style={estiloInputBusca} />
            
            {/* NOVO: CAMPO DE CÓDIGO DE BARRAS COM BOTÃO DE CÂMERA EMBUTIDO */}
            <div style={{ display: 'flex', flex: '1 1 200px', minWidth: '150px' }}>
              <input 
                type="text" 
                placeholder="🔍 Cód. Barras..." 
                value={buscaCodigoBarra} 
                onChange={(e) => { setBuscaCodigoBarra(e.target.value); setItensVisiveis(50); }} 
                style={{ ...estiloInputBusca, flex: 1, borderTopRightRadius: '0', borderBottomRightRadius: '0', borderRight: 'none' }} 
              />
              <button 
                onClick={() => setCameraBuscaAtiva(true)}
                title="Escanear Código de Barras"
                style={{ 
                  backgroundColor: '#3498db', color: 'white', border: '1px solid #2980b9', 
                  borderTopRightRadius: '6px', borderBottomRightRadius: '6px', 
                  padding: '0 15px', cursor: 'pointer', fontSize: '1.2rem',
                  display: 'flex', alignItems: 'center', justifyContent: 'center'
                }}
              >
                📷
              </button>
            </div>

            <input type="text" placeholder="🔍 Marca..." value={buscaMarca} onChange={(e) => { setBuscaMarca(e.target.value); setItensVisiveis(50); }} style={estiloInputBusca} />
            
            {temBuscaAtiva && (
              <button onClick={limparTodasAsBuscas} className="btn-limpar-buscas">Limpar Buscas</button>
            )}
          </div>

          <div className="tabela-responsiva" onScroll={handleScroll}>
            <table id="tabela-dados" className="tabela-produtos" style={{ width: `${larguraTotalTabela}px` }}>
              <thead>
                <tr>
                  {renderCabecalho("CÓD.", "codigo")}
                  {renderCabecalho("DESCRIÇÃO", "descricao")}
                  {renderCabecalho("ESTOQUE", "quantidade")}
                  {renderCabecalho("CÓDIGO BARRA", "codigoBarra")}
                  {renderCabecalho("NCM", "ncm")}
                  {renderCabecalho("FORNECEDOR", "fornecedor")}
                  {renderCabecalho("MARCA", "marca")}
                  {renderCabecalho("PREÇO VENDA", "precoVenda")}
                  {renderCabecalho("PREÇO CUSTO", "precoCusto")}
                </tr>
              </thead>
              <tbody>
                {produtosParaExibir.length > 0 ? (
                  produtosParaExibir.map((prod, index) => {
                    const estaExpandido = linhaExpandida === prod.codigo;
                    const jaAdicionado = isProdutoNaPreRequisicao(prod.codigo);
                    const estadoBip = bipState[prod.codigo]; 

                    return (
                      <React.Fragment key={prod.codigo || index}>
                        <tr 
                          onClick={() => toggleExpandirLinha(prod.codigo)}
                          style={{ cursor: 'pointer', backgroundColor: estaExpandido ? '#f0f8ff' : (jaAdicionado ? '#f4fcf5' : 'inherit') }}
                          title="Clique para expandir e adicionar à pré-requisição"
                        >
                          <td title={prod.codigo}><strong>{prod.codigo}</strong> {jaAdicionado && '✅'}</td>
                          <td title={prod.descricao}>{prod.descricao}</td> 
                          <td style={{ color: '#27ae60', fontWeight: 'bold' }}>{prod.quantidade}</td>
                          <td title={prod.codigoBarra}>{prod.codigoBarra}</td>
                          <td title={prod.ncm}>{prod.ncm}</td>
                          <td title={prod.fornecedor}>{prod.fornecedor}</td>
                          <td title={prod.marca}>{prod.marca}</td>
                          <td>R$ {prod.precoVenda}</td>
                          <td>R$ {prod.precoCusto}</td>
                        </tr>

                        {estaExpandido && (
                          <tr style={{ backgroundColor: '#f9fafd' }}>
                            <td colSpan="9" style={{ padding: 0, borderBottom: '2px solid #3498db' }}>
                              
                              {tipoReposicaoGlobal === 'interna' && (
                                <div className="painel-acao-expandido">
                                  <div className="info-estoque-mobile">Quant. em estoque = <strong>{prod.quantidade}</strong></div>
                                  <div className="painel-acao-controles">
                                    <div className="input-qtd-container">
                                      <label>Qtd a Separar:</label>
                                      <input type="number" min="1" placeholder="Ex: 5" value={qtds[prod.codigo] || ''} onChange={(e) => setQtds({...qtds, [prod.codigo]: e.target.value})} onClick={(e) => e.stopPropagation()} />
                                    </div>
                                    {jaAdicionado ? (
                                      <button onClick={(e) => { e.stopPropagation(); aoRemoverPreRequisicao(prod.codigo); }} className="btn-acao-remover">❌ Remover</button>
                                    ) : (
                                      <button onClick={(e) => handleAdicionarInterno(e, prod)} className="btn-acao-adicionar">➕ Adicionar</button>
                                    )}
                                  </div>
                                </div>
                              )}

                              {tipoReposicaoGlobal === 'externa' && (
                                <div className="painel-acao-expandido modo-externa">
                                  <div className="info-estoque-mobile">Quant. em estoque = <strong>{prod.quantidade}</strong></div>
                                  
                                  <div className="bipagem-flow-container">
                                    
                                    <div className="bipagem-linha-1">
                                      <div className="input-qtd-container">
                                        <label>Qtd a Separar:</label>
                                        <div style={{ display: 'flex', gap: '8px' }}>
                                          <input type="number" min="1" placeholder="Ex: 5" value={qtds[prod.codigo] || ''} onChange={(e) => setQtds({...qtds, [prod.codigo]: e.target.value})} onClick={(e) => e.stopPropagation()} />
                                          <button className="btn-chave-confirmar" onClick={(e) => confirmarChaveExterna(e, prod)} title="Confirmar quantidade e abrir leitor">🔑 Confirmar</button>
                                        </div>
                                      </div>
                                    </div>

                                    {estadoBip && (
                                      <div className="bipagem-linha-2">
                                        <input 
                                          type="text" className="input-leitor-bip" placeholder="Bipe o código..." 
                                          value={bipInputVal[prod.codigo] || ''} 
                                          onChange={(e) => setBipInputVal({...bipInputVal, [prod.codigo]: e.target.value})}
                                          onKeyDown={(e) => checkBip(e, prod)}
                                          onClick={(e) => e.stopPropagation()}
                                        />
                                        <div className={`contador-bip ${estadoBip.bipada >= estadoBip.desejada ? 'completo' : ''}`}>
                                          {estadoBip.bipada}/{estadoBip.desejada}
                                        </div>
                                        <button className="btn-icon-bip" onClick={(e) => { e.stopPropagation(); setCameraAtiva(prod.codigo); }} title="Abrir Câmera">📷</button>
                                        <button className="btn-icon-bip" onClick={(e) => editarBipManual(e, prod)} title="Aprovar manualmente">✏️</button>
                                      </div>
                                    )}

                                    <div className="bipagem-linha-3">
                                      {jaAdicionado ? (
                                        <button onClick={(e) => { e.stopPropagation(); aoRemoverPreRequisicao(prod.codigo); }} className="btn-acao-remover">❌ Remover da Lista</button>
                                      ) : (
                                        <button onClick={(e) => handleAdicionarExterno(e, prod)} className={`btn-acao-adicionar ${(!estadoBip || estadoBip.bipada < estadoBip.desejada) ? 'btn-desativado' : ''}`}>➕ Adicionar à Lista</button>
                                      )}
                                    </div>

                                  </div>
                                </div>
                              )}

                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    );
                  })
                ) : (
                  <tr><td colSpan="9" style={{ textAlign: 'center', padding: '50px', color: '#888' }}>Nenhum produto encontrado.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </>
      ) : (
        <div className="mensagem-vazia">A base de dados de produtos ainda não foi sincronizada.</div>
      )}
    </div>
  );
}