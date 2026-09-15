import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../../services/supabase';
import { Html5QrcodeScanner } from 'html5-qrcode';
import '../../styles/pages/recebimento/recebimento.css';

// Importando a tabela da pasta correta conforme sua arquitetura
import TabelaProdutosRecebimento from './detalhes/TabelaProdutosRecebimento'; 

const CACHE_KEY = 'netadantas_recebimento_draft';

export default function RecebimentoProdutos({ aoVoltar, usuarioLogado }) {
  const [lojaRecebedora, setLojaRecebedora] = useState('Matriz');
  const [numeroRelatorio, setNumeroRelatorio] = useState('REC.X.001');
  const [nomeFornecedor, setNomeFornecedor] = useState('');
  const [marca, setMarca] = useState('');
  const [numeroNF, setNumeroNF] = useState('');
  const [volumes, setVolumes] = useState('');
  const [numeroPedido, setNumeroPedido] = useState(''); 
  const [responsavelRecebedor, setResponsavelRecebedor] = useState(''); 
  const [observacoes, setObservacoes] = useState('');

  const [itens, setItens] = useState([
    { id: 1, codigoFornecedor: '', codigoBarras: '', codigoSistema: '', descricaoFornecedor: '', quantidade: '', validade: '', quantidadeBipada: 0, codigoBarrasMestre: '', avarias: 0, obsItem: '' }
  ]);

  const [processando, setProcessando] = useState(false);
  const [popup, setPopup] = useState({ visivel: false, tipo: '', titulo: '', mensagem: '', onConfirm: null, onCancel: null, txtConfirma: 'Entendi', txtCancela: '' });

  const [scannerAtivo, setScannerAtivo] = useState(null); 
  const [scannerErro, setScannerErro] = useState(''); 
  const inputBipRef = useRef(null); 

  const podeDigitarManual = usuarioLogado?.username === 'admin' || usuarioLogado?.acesso_admin || usuarioLogado?.hierarquia === 'Encarregado';
  
  const [pedidosBip, setPedidosBip] = useState({});
  const [codigoManual, setCodigoManual] = useState({});
  const [solicitacaoBipEnviada, setSolicitacaoBipEnviada] = useState(false);
  const [digitacaoLiberadaTemporaria, setDigitacaoLiberadaTemporaria] = useState(false);

  const [status, setStatus] = useState('Pendente'); 
  const [inicioConferencia, setInicioConferencia] = useState(null);
  const [tempoDecorrido, setTempoDecorrido] = useState(0);
  const [metricasRecebimento, setMetricasRecebimento] = useState(null);

  const [pausaPendente, setPausaPendente] = useState(false);
  const [pausaAtivaInicio, setPausaAtivaInicio] = useState(null);
  const [pausaAtivaId, setPausaAtivaId] = useState(null);
  const [tipoPausaAtiva, setTipoPausaAtiva] = useState(null);
  const [tempoPausadoTotal, setTempoPausadoTotal] = useState(0);

  const [aguardandoRestauracao, setAguardandoRestauracao] = useState(true);

  // ==========================================
  // AUTO-SAVE BLINDADO (NOVO MOTOR)
  // ==========================================
  useEffect(() => {
    const draft = localStorage.getItem(CACHE_KEY);
    if (draft) {
      setAguardandoRestauracao(true);
      exibirPopup('aviso', 'Rascunho Encontrado', 'Você tem um recebimento em andamento que foi interrompido. Deseja recuperar os dados e o progresso da bipagem?', 
      () => {
        try {
          const dados = JSON.parse(draft);
          setLojaRecebedora(dados.lojaRecebedora || 'Matriz');
          setNumeroRelatorio(dados.numeroRelatorio || 'REC.X.001');
          setNomeFornecedor(dados.nomeFornecedor || '');
          setMarca(dados.marca || '');
          setNumeroNF(dados.numeroNF || '');
          setVolumes(dados.volumes || '');
          setNumeroPedido(dados.numeroPedido || '');
          setResponsavelRecebedor(dados.responsavelRecebedor || '');
          setObservacoes(dados.observacoes || '');
          setItens(dados.itens && dados.itens.length > 0 ? dados.itens : itens);
          setStatus(dados.status || 'Pendente');
          
          // 🚀 SEM PAUSA FANTASMA: Se o cronômetro estava rodando, ele vai calcular o tempo total desde o início real
          setInicioConferencia(dados.inicioConferencia || null);
          setTempoDecorrido(dados.tempoDecorrido || 0); // Atualiza no próximo tick do setInterval
          
          setPausaAtivaInicio(dados.pausaAtivaInicio || null);
          setPausaAtivaId(dados.pausaAtivaId || null);
          setTipoPausaAtiva(dados.tipoPausaAtiva || null);
          setTempoPausadoTotal(dados.tempoPausadoTotal || 0);
        } catch (e) { localStorage.removeItem(CACHE_KEY); }
        setAguardandoRestauracao(false);
      }, 
      () => { 
        localStorage.removeItem(CACHE_KEY); 
        setAguardandoRestauracao(false);
      }, 'Sim, Recuperar', 'Não, Limpar');
    } else {
      setAguardandoRestauracao(false);
    }
  }, []);

  // Cria uma "Foto" dos dados atuais em tempo real sem afetar as renderizações do React
  const stateRef = useRef();
  useEffect(() => {
    stateRef.current = { lojaRecebedora, numeroRelatorio, nomeFornecedor, marca, numeroNF, volumes, numeroPedido, responsavelRecebedor, observacoes, itens, status, inicioConferencia, tempoDecorrido, pausaAtivaInicio, pausaAtivaId, tipoPausaAtiva, tempoPausadoTotal };
  });

  // Salva no banco local a cada 2 segundos independente de qualquer coisa!
  useEffect(() => {
    const interval = setInterval(() => {
      if (!aguardandoRestauracao && stateRef.current && stateRef.current.status !== 'Concluída') {
        localStorage.setItem(CACHE_KEY, JSON.stringify(stateRef.current));
      }
    }, 2000); 
    return () => clearInterval(interval);
  }, [aguardandoRestauracao]);

  // Função para garantir salvamento imediato se o usuário clicar em "Voltar"
  const handleVoltar = () => {
    if (!aguardandoRestauracao && stateRef.current && stateRef.current.status !== 'Concluída') {
      localStorage.setItem(CACHE_KEY, JSON.stringify(stateRef.current));
    }
    if (aoVoltar) aoVoltar();
  };

  const exibirPopup = (tipo, titulo, mensagem, onConfirm = null, onCancel = null, txtConfirma = 'Entendi', txtCancela = 'Cancelar') => {
    setPopup({ visivel: true, tipo, titulo, mensagem, onConfirm, onCancel, txtConfirma, txtCancela });
  };

  useEffect(() => {
    let siglaLoja = 'X';
    if (lojaRecebedora === 'Araturi') siglaLoja = 'A';
    else if (lojaRecebedora === 'Conjunto Ceará') siglaLoja = 'C';
    else if (lojaRecebedora === 'Messejana') siglaLoja = 'M';
    else if (lojaRecebedora === 'Mulungu') siglaLoja = 'MU';
    else if (lojaRecebedora === 'Matriz') siglaLoja = 'MT';

    const buscarProximoNumero = async () => {
      try {
        const { data, error } = await supabase.from('recebimento_mercadorias').select('numero_relatorio').ilike('numero_relatorio', `REC.${siglaLoja}.%`).order('id', { ascending: false }).limit(1);
        let proximoSeq = 1;
        if (!error && data && data.length > 0) {
          const partes = data[0].numero_relatorio.split('.');
          if (partes.length === 3) proximoSeq = (parseInt(partes[2], 10) || 0) + 1;
        }
        setNumeroRelatorio(`REC.${siglaLoja}.${String(proximoSeq).padStart(3, '0')}`);
      } catch (e) {
        setNumeroRelatorio(`REC.${siglaLoja}.001`);
      }
    };
    if (numeroRelatorio === 'REC.X.001' || numeroRelatorio.split('.')[1] !== siglaLoja) buscarProximoNumero();
  }, [lojaRecebedora, numeroRelatorio]);

  useEffect(() => {
    let intervalo;
    if (status === 'Em Conferência' && !metricasRecebimento) {
      if (pausaAtivaInicio) {
        setTempoDecorrido(Math.max(0, Math.floor(((Number(pausaAtivaInicio) - Number(inicioConferencia)) - tempoPausadoTotal) / 1000)));
      } else if (inicioConferencia) {
        intervalo = setInterval(() => {
          setTempoDecorrido(Math.max(0, Math.floor(((Date.now() - Number(inicioConferencia)) - tempoPausadoTotal) / 1000)));
        }, 1000);
      }
    }
    return () => clearInterval(intervalo);
  }, [status, inicioConferencia, pausaAtivaInicio, tempoPausadoTotal, metricasRecebimento]);

  useEffect(() => {
    if (status !== 'Em Conferência' || !usuarioLogado) return;
    const fetchPausa = async () => {
      const { data } = await supabase.from('pausas_separacao').select('*').eq('requisicao_id', numeroRelatorio).eq('solicitante_nome', usuarioLogado.nome_completo).order('timestamp_criacao', { ascending: false }).limit(1);
      if (data && data.length > 0) {
        const p = data[0];
        if (p.status === 'pendente') { setPausaPendente(true); } 
        else if (p.status === 'aprovada' && !pausaAtivaInicio) {
          setPausaPendente(false); setPausaAtivaInicio(p.inicio_pausa); setPausaAtivaId(p.id); setTipoPausaAtiva(p.tipo_pausa);
        } else if (p.status === 'recusada') { setPausaPendente(false); }
      }
    };
    fetchPausa();
    const intId = setInterval(fetchPausa, 5000);
    return () => clearInterval(intId);
  }, [numeroRelatorio, usuarioLogado, status, pausaAtivaInicio]);

  useEffect(() => {
    const checkBips = async () => {
      const pendentesIds = Object.keys(pedidosBip).filter(id => pedidosBip[id] === 'pendente');
      if (pendentesIds.length === 0) return;

      const { data } = await supabase.from('autorizacoes_bip')
        .select('id, produto_descricao, status')
        .eq('solicitante_nome', usuarioLogado?.nome_completo)
        .eq('status', 'aprovado');

      if (data && data.length > 0) {
        setPedidosBip(prev => {
          const novo = { ...prev };
          let changed = false;
          data.forEach(auth => {
            const item = itens.find(i => i.descricaoFornecedor === auth.produto_descricao);
            if (item && novo[item.id] === 'pendente') {
              novo[item.id] = 'aprovado';
              changed = true;
              tocarSom('sucesso');
              supabase.from('autorizacoes_bip').update({ status: 'usado' }).eq('id', auth.id).then();
            }
          });
          return changed ? novo : prev;
        });
      }
    };
    const interval = setInterval(checkBips, 3000);
    return () => clearInterval(interval);
  }, [pedidosBip, itens, usuarioLogado]);

  const formatarTempo = (segundos) => {
    const h = Math.floor(segundos / 3600).toString().padStart(2, '0');
    const m = Math.floor((segundos % 3600) / 60).toString().padStart(2, '0');
    const s = (segundos % 60).toString().padStart(2, '0');
    return `${h}:${m}:${s}`;
  };

  const handleIniciarConferencia = () => {
    if (!responsavelRecebedor.trim()) return exibirPopup('aviso', 'Atenção', "Digite o Nome do Responsável Recebedor antes de iniciar!");
    setStatus('Em Conferência');
    if (!inicioConferencia) setInicioConferencia(Date.now());
  };

  const solicitarPausaAoLider = async (tipoPausa) => {
    if (!usuarioLogado?.encarregado_responsavel) return exibirPopup('erro', 'Ação Negada', 'Você não tem um Encarregado vinculado.');
    setPausaPendente(true);
    const { error } = await supabase.from('pausas_separacao').insert([{ requisicao_id: numeroRelatorio, solicitante_nome: usuarioLogado.nome_completo, encarregado_destino: usuarioLogado.encarregado_responsavel, tipo_pausa: tipoPausa, timestamp_criacao: Date.now() }]);
    if (error) { setPausaPendente(false); exibirPopup('erro', 'Erro', error.message); } 
    else { exibirPopup('sucesso', 'Pausa Solicitada!', `Sua pausa foi enviada ao encarregado.`); }
  };

  const handleAdicionarItemVazio = () => setItens(prev => [...prev, { id: Date.now(), codigoFornecedor: '', codigoBarras: '', codigoSistema: '', descricaoFornecedor: '', quantidade: '', validade: '', quantidadeBipada: 0, codigoBarrasMestre: '', avarias: 0, obsItem: '' }]);
  
  const handleDuplicarParaNovoLote = (itemOriginal) => {
    const novoLote = { ...itemOriginal, id: Date.now(), quantidade: '', validade: '', quantidadeBipada: 0, avarias: 0, obsItem: '' };
    setItens(prev => { const nova = [...prev]; nova.splice(prev.findIndex(i => i.id === itemOriginal.id) + 1, 0, novoLote); return nova; });
  };
  const handleRemoverItem = (id) => {
    if (itens.length === 1) return exibirPopup('aviso', 'Atenção', "A nota precisa de pelo menos um item.");
    setItens(prev => prev.filter(item => item.id !== id));
  };
  const handleAtualizarItem = (id, campo, valor) => setItens(prev => prev.map(item => item.id === id ? { ...item, [campo]: valor } : item));

  const handleSolicitarBipManual = async (item) => {
    if (!usuarioLogado?.encarregado_responsavel) return exibirPopup('erro', 'Ação Negada', 'Sem Encarregado vinculado.');
    await supabase.from('autorizacoes_bip').insert([{ solicitante_nome: usuarioLogado.nome_completo, encarregado_destino: usuarioLogado.encarregado_responsavel, produto_descricao: item.descricaoFornecedor || 'Produto', status: 'pendente', timestamp_criacao: Date.now() }]);
    setPedidosBip(prev => ({ ...prev, [item.id]: 'pendente' }));
  };

  const buscarProdutoPorCodigo = async (id, codigo) => {
    if (!codigo) return;
    try {
      const { data } = await supabase.from('base_produtos').select('*').eq('codigo_barra', codigo).single();
      if (data) {
        handleAtualizarItem(id, 'codigoSistema', data.codigo_sistema);
        handleAtualizarItem(id, 'descricaoFornecedor', data.descricao);
        handleAtualizarItem(id, 'codigoFornecedor', data.codigo_fornecedor);
      }
    } catch (e) {}
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

  const abrirModalScanner = (item, tipo) => {
    setScannerErro('');
    setScannerAtivo({ item, tipo: tipo || 'contagem' });
  };

  const processarLeitura = (e = null, codigoCamera = null) => {
    const codigoLido = codigoCamera || inputBipRef.current?.value?.trim();
    if (e && e.key !== 'Enter') return;
    if (!codigoLido) return;

    if (scannerAtivo.tipo === 'identificacao') {
      handleAtualizarItem(scannerAtivo.item.id, 'codigoBarras', codigoLido);
      buscarProdutoPorCodigo(scannerAtivo.item.id, codigoLido);
      tocarSom('sucesso');
      setTimeout(() => setScannerAtivo(null), 400);
    } else {
      setItens(prev => prev.map(item => {
        if (item.id === scannerAtivo.item.id) {
          const mestre = item.codigoBarras?.trim();
          if (!mestre) {
            tocarSom('sucesso'); setScannerErro('');
            const novaQtd = Number(item.quantidadeBipada) + 1;
            if (novaQtd >= Number(item.quantidade)) setTimeout(() => setScannerAtivo(null), 600); 
            return { ...item, codigoBarras: codigoLido, quantidadeBipada: novaQtd };
          } else if (mestre === codigoLido) {
            tocarSom('sucesso'); setScannerErro('');
            const novaQtd = Number(item.quantidadeBipada) + 1;
            if (novaQtd >= Number(item.quantidade)) setTimeout(() => setScannerAtivo(null), 600); 
            return { ...item, quantidadeBipada: novaQtd };
          } else {
            tocarSom('erro');
            setScannerErro(`❌ CÓDIGO INVÁLIDO!\n\nEsperado: ${mestre}\nLido: ${codigoLido}`);
            return item; 
          }
        }
        return item;
      }));
    }
    if(inputBipRef.current) inputBipRef.current.value = ''; 
  };

  const handleSalvarPendencia = async () => {
    if (!nomeFornecedor.trim() || !marca.trim() || !numeroNF.trim() || !volumes) return exibirPopup('aviso', 'Incompleto', "Preencha Fornecedor, Marca, NF e Volumes.");
    setProcessando(true);
    try {
      await supabase.from('recebimento_mercadorias').insert([{ numero_relatorio: numeroRelatorio, loja_recebedora: lojaRecebedora, nome_fornecedor: nomeFornecedor, marca: marca, numero_nf: numeroNF, volumes: Number(volumes), numero_pedido: numeroPedido || null, responsavel_recebedor: null, observacoes: observacoes, itens: itens, responsavel_sistema: usuarioLogado?.nome_completo || 'Sistema', status: 'Pendente' }]);
      localStorage.removeItem(CACHE_KEY); 
      exibirPopup('sucesso', 'Carga Salva!', `A carga foi registrada.`, () => { if (aoVoltar) aoVoltar(); });
    } catch (error) { exibirPopup('erro', 'Falha', error.message); } finally { setProcessando(false); }
  };

  const handleSalvarRecebimento = async (e) => {
    e.preventDefault();
    if (!nomeFornecedor.trim() || !marca.trim() || !numeroNF.trim() || !volumes.trim() || !responsavelRecebedor.trim()) return exibirPopup('aviso', 'Incompleto', "Preencha todos os campos obrigatórios.");
    if (itens.some(i => !i.codigoFornecedor.trim() || !i.descricaoFornecedor.trim() || !i.quantidade || !i.validade.trim())) return exibirPopup('aviso', 'Produtos', "Produtos precisam de Código, Descrição, Validade e Qtd.");
    setProcessando(true);
    try {
      const totalItens = itens.reduce((acc, item) => acc + Number(item.quantidade), 0);
      const upm = tempoDecorrido > 0 ? (totalItens / tempoDecorrido) * 60 : 0;
      const pts = Math.round(totalItens * Number(upm.toFixed(1)) * 1.5);
      const metricas = { tempoTotalSegundos: tempoDecorrido, totalItensFisicos: totalItens, upm: Number(upm.toFixed(1)), pontosGanhos: pts, responsavel: responsavelRecebedor, finalizadoEm: new Date().toISOString() };
      const itensComLote = itens.map((item, index) => ({ ...item, loteInterno: `LT-${numeroRelatorio}-${String(index + 1).padStart(2, '0')}` }));

      await supabase.from('recebimento_mercadorias').insert([{ numero_relatorio: numeroRelatorio, loja_recebedora: lojaRecebedora, nome_fornecedor: nomeFornecedor, marca: marca, numero_nf: numeroNF, volumes: Number(volumes), numero_pedido: numeroPedido || null, responsavel_recebedor: responsavelRecebedor, observacoes: observacoes, itens: itensComLote, responsavel_sistema: usuarioLogado?.nome_completo || 'Sistema', metricas_recebimento: metricas, status: 'Concluída' }]);
      setStatus('Concluída');
      localStorage.removeItem(CACHE_KEY); 
      exibirPopup('sucesso', 'Concluído! 🏆', `Lotes com FEFO registrados.\nVelocidade: ${metricas.upm} UPM\nPontos: +${pts}`, () => { if (aoVoltar) aoVoltar(); });
    } catch (error) { exibirPopup('erro', 'Falha', error.message); } finally { setProcessando(false); }
  };

  return (
    <div className="recebimento-container">
      
      {popup.visivel && (
        <div className="modal-overlay-custom">
          <div className="modal-content-custom">
            <div className="modal-icon-custom">{popup.tipo === 'sucesso' ? '✅' : popup.tipo === 'aviso' ? '⚠️' : '❌'}</div>
            <h3>{popup.titulo}</h3><p>{popup.mensagem}</p>
            <div className="modal-actions-custom">
              <button onClick={() => { setPopup({ ...popup, visivel: false }); if (popup.onConfirm) popup.onConfirm(); }} className={`btn-modal-confirm ${popup.tipo}`}>{popup.txtConfirma}</button>
              {popup.onCancel && <button onClick={() => { setPopup({ ...popup, visivel: false }); popup.onCancel(); }} className="btn-modal-cancel">{popup.txtCancela}</button>}
            </div>
          </div>
        </div>
      )}

      {scannerAtivo && (
        <div className="modal-overlay-custom scanner-overlay">
          <div className="modal-content-custom scanner-content">
            <button onClick={() => setScannerAtivo(null)} className="btn-close-scanner">✖</button>
            
            <h3>📷 {scannerAtivo.tipo === 'identificacao' ? 'Identificar Produto' : 'Bip de Conferência'}</h3>
            
            {scannerAtivo.tipo === 'contagem' && (
              scannerAtivo.item.codigoBarras ? (
                <div className="bip-mestre-info">Trava Mestre: {scannerAtivo.item.codigoBarras}</div>
              ) : (
                <div className="bip-livre-info">1º Bip Livre: O primeiro código será a Trava Oficial!</div>
              )
            )}

            <p className="scanner-produto-nome"><strong>{scannerAtivo.item.descricaoFornecedor || 'Produto sem descrição'}</strong></p>
            
            {(podeDigitarManual || digitacaoLiberadaTemporaria) ? (
              <CameraScanner onScan={(codigoLido) => processarLeitura(null, codigoLido)} />
            ) : (
              <div style={{ width: '100%', height: '180px', backgroundColor: '#000', borderRadius: '8px', marginBottom: '20px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                 <span style={{ color: 'white', textAlign: 'center', padding: '20px' }}>🔒 Câmera Bloqueada.<br/>Solicite liberação para bipar.</span>
              </div>
            )}

            {scannerAtivo.tipo === 'contagem' && (
              <div className={`scanner-circle-counter ${scannerErro ? 'error' : ''}`}>
                <span className="scanner-contador-atual">{itens.find(i => i.id === scannerAtivo.item.id)?.quantidadeBipada}</span>
                <span className="scanner-contador-total">de {scannerAtivo.item.quantidade}</span>
              </div>
            )}

            {scannerErro && <div className="scanner-error-msg">{scannerErro}</div>}

            {(podeDigitarManual || digitacaoLiberadaTemporaria) ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <p style={{ fontSize: '0.85rem', color: '#7f8c8d' }}>Ou digite o código manualmente:</p>
                <input 
                  type="text" 
                  ref={inputBipRef}
                  placeholder="Bipe ou digite o código de barras..."
                  style={{ padding: '12px', borderRadius: '6px', border: '1px solid #ccc', fontSize: '1.1rem', width: '100%', textAlign: 'center' }}
                  onKeyDown={(e) => processarLeitura(e)}
                />
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <p style={{ fontSize: '0.85rem', color: '#e67e22', fontWeight: 'bold' }}>⚠️ Acesso Bloqueado para o seu perfil.</p>
                <button 
                  onClick={() => handleSolicitarBipManual(scannerAtivo.item)} 
                  disabled={solicitacaoBipEnviada}
                  style={{ background: solicitacaoBipEnviada ? '#f39c12' : '#3498db', color: '#fff', border: 'none', padding: '14px', borderRadius: '8px', fontWeight: 'bold', fontSize: '1rem' }}
                >
                  {solicitacaoBipEnviada ? '⏳ Aguardando Aprovação...' : '🔑 Solicitar Liberação do Líder'}
                </button>
              </div>
            )}
          </div>
        </div>
      )}
      
      <div className="recebimento-header-clean no-print">
        <div><h2>Registro de Nova Carga</h2></div>
        <button className="btn-voltar-clean" onClick={handleVoltar}>← Voltar</button>
      </div>

      <form className="recebimento-form" onSubmit={handleSalvarRecebimento}>
        <div className="recebimento-card">
          <div className="card-titulo-flex">
            <h3>📑 Dados da Nota Fiscal / Carga</h3>
            <span className="relatorio-destaque-txt">Nº Relatório: <strong>{numeroRelatorio}</strong></span>
          </div>

          <div className="form-grid-4">
            <div className="input-group"><label>Loja Recebedora *</label><select value={lojaRecebedora} onChange={(e) => setLojaRecebedora(e.target.value)} disabled={status !== 'Pendente'}><option value="Matriz">Matriz</option><option value="Araturi">Araturi</option></select></div>
            <div className="input-group"><label>Nome do Fornecedor *</label><input type="text" value={nomeFornecedor} onChange={(e) => setNomeFornecedor(e.target.value)} required disabled={status !== 'Pendente'} /></div>
            <div className="input-group"><label>Marca *</label><input type="text" value={marca} onChange={(e) => setMarca(e.target.value)} required disabled={status !== 'Pendente'} /></div>
            <div className="input-group"><label>Número da NF *</label><input type="text" value={numeroNF} onChange={(e) => setNumeroNF(e.target.value)} required disabled={status !== 'Pendente'} /></div>
            <div className="input-group"><label>Qtd. Volumes *</label><input type="number" value={volumes} onChange={(e) => setVolumes(e.target.value)} required disabled={status !== 'Pendente'} /></div>
          </div>
        </div>

        {status === 'Pendente' && (
          <div className="acoes-pendente-wrapper no-print">
            <button type="button" onClick={handleSalvarPendencia} disabled={processando} className="btn-salvar-pendente">
              {processando ? '⏳...' : '📥 Salvar Carga Pendente'}
            </button>
          </div>
        )}

        <div className="recebimento-card">
          <div className="card-titulo-flex">
            <h3>🛒 Produtos da Nota / Conferência de Lote</h3>
            {status === 'Em Conferência' && !pausaAtivaInicio && (
              <div className="pausas-container no-print">
                <button type="button" onClick={() => solicitarPausaAoLider('Pausa para Almoço')} className="btn-pausa-almoco">🍔 Pausa Almoço</button>
                <button type="button" onClick={() => solicitarPausaAoLider('Fim de Expediente')} className="btn-pausa-fim">🌙 Fim de Expediente</button>
              </div>
            )}
          </div>

          <div className="input-group responsavel-group">
            <label>Nome do Responsável Recebedor *</label>
            <div className="input-btn-flex">
              <input type="text" value={responsavelRecebedor} onChange={(e) => setResponsavelRecebedor(e.target.value)} disabled={status !== 'Pendente'} />
              {status === 'Pendente' && (
                <button type="button" onClick={handleIniciarConferencia} className="btn-iniciar-conferencia">▶️ Iniciar Conferência</button>
              )}
            </div>
          </div>

          {status !== 'Pendente' && (
            <div className="cronometro-recebimento"><div>{formatarTempo(tempoDecorrido)}</div></div>
          )}
        </div>

        {status !== 'Pendente' && (
          <TabelaProdutosRecebimento
            itens={itens}
            status={status}
            isEditing={true}
            isViewer={false}
            responsavelRecebedor={responsavelRecebedor}
            pausaAtivaInicio={pausaAtivaInicio}
            pausaPendente={pausaPendente}
            solicitarPausaAoLider={solicitarPausaAoLider}
            handleAtualizarItem={handleAtualizarItem}
            handleAdicionarItemVazio={handleAdicionarItemVazio}
            handleDuplicarParaNovoLote={handleDuplicarParaNovoLote}
            handleRemoverItem={handleRemoverItem}
            abrirModalScanner={abrirModalScanner}
            buscarProdutoPorCodigo={buscarProdutoPorCodigo}
            pedidosBip={pedidosBip}
            codigoManual={codigoManual}
            setCodigoManual={setCodigoManual}
            solicitarBipManual={handleSolicitarBipManual}
            isEncarregado={podeDigitarManual}
            exibirPopup={exibirPopup}
          />
        )}

        <div className="recebimento-card">
          <h3>💬 Observações Gerais / Condição da Carga *</h3>
          <div className="input-group" style={{ marginTop: '10px' }}>
            <textarea rows="3" value={observacoes} onChange={(e) => setObservacoes(e.target.value)} disabled={status === 'Concluída'}></textarea>
          </div>
        </div>

        {status === 'Em Conferência' && !pausaAtivaInicio && (
          <div className="recebimento-footer-acoes no-print">
            <button type="submit" className="btn-salvar-rec" disabled={processando}>{processando ? '⏳...' : '💾 Finalizar e Salvar Lotes'}</button>
          </div>
        )}
      </form>
    </div>
  );
}

// ==========================================
// COMPONENTE DA CÂMERA DE CÓDIGO DE BARRAS
// ==========================================
function CameraScanner({ onScan }) {
  useEffect(() => {
    const scanner = new Html5QrcodeScanner("reader-barcode", { 
      fps: 10, 
      qrbox: { width: 250, height: 100 },
      aspectRatio: 1.0,
      disableFlip: false 
    }, false);

    scanner.render(
      (decodedText) => {
        onScan(decodedText);
        scanner.pause(true);
        setTimeout(() => scanner.resume(), 1500);
      },
      (error) => { /* Ignora erros de frame vazio */ }
    );

    return () => {
      scanner.clear().catch(e => console.error("Erro ao limpar câmera.", e));
    };
  }, [onScan]);

  return <div id="reader-barcode" style={{ width: '100%', marginBottom: '20px', borderRadius: '8px', overflow: 'hidden', border: '2px solid #ecf0f1' }}></div>;
}