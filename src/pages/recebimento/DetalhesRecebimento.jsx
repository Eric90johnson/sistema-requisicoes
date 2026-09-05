import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../../services/supabase';
import '../../styles/pages/recebimento/recebimento.css';

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
    { id: 1, codigoFornecedor: '', descricaoFornecedor: '', quantidade: '', validade: '', quantidadeBipada: 0, avarias: 0, obsItem: '' }
  ]);

  const [processando, setProcessando] = useState(false);
  const [popup, setPopup] = useState({ visivel: false, tipo: '', titulo: '', mensagem: '', onConfirm: null });

  // ==========================================
  // ESTADOS E REFS DA CÂMERA (LEITOR REAL)
  // ==========================================
  const [scannerAtivo, setScannerAtivo] = useState(null); 
  const videoRef = useRef(null);
  const mediaStreamRef = useRef(null);

  const exibirPopup = (tipo, titulo, mensagem, onConfirm = null) => {
    setPopup({ visivel: true, tipo, titulo, mensagem, onConfirm });
  };

  const [status, setStatus] = useState('Pendente'); 
  const [inicioConferencia, setInicioConferencia] = useState(null);
  const [tempoDecorrido, setTempoDecorrido] = useState(0);
  const [metricasRecebimento, setMetricasRecebimento] = useState(null);

  const [pausaPendente, setPausaPendente] = useState(false);
  const [pausaAtivaInicio, setPausaAtivaInicio] = useState(null);
  const [pausaAtivaId, setPausaAtivaId] = useState(null);
  const [tipoPausaAtiva, setTipoPausaAtiva] = useState(null);
  const [tempoPausadoTotal, setTempoPausadoTotal] = useState(0);

  useEffect(() => {
    let siglaLoja = 'X';
    if (lojaRecebedora === 'Araturi') siglaLoja = 'A';
    else if (lojaRecebedora === 'Conjunto Ceará') siglaLoja = 'C';
    else if (lojaRecebedora === 'Messejana') siglaLoja = 'M';
    else if (lojaRecebedora === 'Mulungu') siglaLoja = 'MU';
    else if (lojaRecebedora === 'Matriz') siglaLoja = 'MT';

    const buscarProximoNumero = async () => {
      try {
        const { data, error } = await supabase
          .from('recebimento_mercadorias')
          .select('numero_relatorio')
          .ilike('numero_relatorio', `REC.${siglaLoja}.%`)
          .order('id', { ascending: false })
          .limit(1);

        let proximoSeq = 1;
        if (!error && data && data.length > 0) {
          const ultimoRel = data[0].numero_relatorio;
          const partes = ultimoRel.split('.');
          if (partes.length === 3) {
            const seq = parseInt(partes[2], 10);
            if (!isNaN(seq)) proximoSeq = seq + 1;
          }
        }
        setNumeroRelatorio(`REC.${siglaLoja}.${String(proximoSeq).padStart(3, '0')}`);
      } catch (e) {
        setNumeroRelatorio(`REC.${siglaLoja}.001`);
      }
    };
    buscarProximoNumero();
  }, [lojaRecebedora]);

  useEffect(() => {
    let intervalo;
    if (status === 'Em Conferência' && !metricasRecebimento) {
      if (pausaAtivaInicio) {
        const diferenca = (Number(pausaAtivaInicio) - Number(inicioConferencia)) - tempoPausadoTotal;
        setTempoDecorrido(Math.max(0, Math.floor(diferenca / 1000)));
      } else if (inicioConferencia) {
        intervalo = setInterval(() => {
          const diferenca = (Date.now() - Number(inicioConferencia)) - tempoPausadoTotal;
          setTempoDecorrido(Math.max(0, Math.floor(diferenca / 1000)));
        }, 1000);
      }
    }
    return () => clearInterval(intervalo);
  }, [status, inicioConferencia, pausaAtivaInicio, tempoPausadoTotal, metricasRecebimento]);

  useEffect(() => {
    if (status !== 'Em Conferência' || !usuarioLogado) return;
    const fetchPausa = async () => {
      const { data } = await supabase.from('pausas_separacao')
        .select('*').eq('requisicao_id', numeroRelatorio).eq('solicitante_nome', usuarioLogado.nome_completo).order('timestamp_criacao', { ascending: false }).limit(1);
      
      if (data && data.length > 0) {
        const p = data[0];
        if (p.status === 'pendente') {
          setPausaPendente(true);
        } else if (p.status === 'aprovada' && !pausaAtivaInicio) {
          setPausaPendente(false);
          setPausaAtivaInicio(p.inicio_pausa);
          setPausaAtivaId(p.id);
          setTipoPausaAtiva(p.tipo_pausa);
        } else if (p.status === 'recusada') {
          setPausaPendente(false);
        }
      }
    };
    fetchPausa();
    const intId = setInterval(fetchPausa, 5000);
    return () => clearInterval(intId);
  }, [numeroRelatorio, usuarioLogado, status, pausaAtivaInicio]);

  const formatarTempo = (segundos) => {
    const h = Math.floor(segundos / 3600).toString().padStart(2, '0');
    const m = Math.floor((segundos % 3600) / 60).toString().padStart(2, '0');
    const s = (segundos % 60).toString().padStart(2, '0');
    return `${h}:${m}:${s}`;
  };

  const handleIniciarConferencia = () => {
    if (!responsavelRecebedor.trim()) {
      exibirPopup('aviso', 'Atenção', "Digite o Nome do Responsável Recebedor antes de iniciar!");
      return;
    }
    setStatus('Em Conferência');
    setInicioConferencia(Date.now());
  };

  const solicitarPausaAoLider = async (tipoPausa) => {
    if (!usuarioLogado?.encarregado_responsavel) {
      exibirPopup('erro', 'Ação Negada', 'Você não tem um Encarregado vinculado ao seu perfil para aprovar a pausa.');
      return;
    }
    setPausaPendente(true);
    const { error } = await supabase.from('pausas_separacao').insert([{
      requisicao_id: numeroRelatorio,
      solicitante_nome: usuarioLogado.nome_completo,
      encarregado_destino: usuarioLogado.encarregado_responsavel,
      tipo_pausa: tipoPausa,
      timestamp_criacao: Date.now()
    }]);
    if (error) {
      setPausaPendente(false);
      exibirPopup('erro', 'Erro de Conexão', "Erro ao pedir pausa: " + error.message);
    } else {
      exibirPopup('sucesso', 'Pausa Solicitada!', `Sua pausa para ${tipoPausa} foi enviada.\n\nAguarde a aprovação do encarregado para o cronômetro parar.`);
    }
  };

  const handleRetomarConferencia = async () => {
    const horaRetorno = Date.now();
    const tempoPausadoAgora = horaRetorno - Number(pausaAtivaInicio);
    setTempoPausadoTotal(prev => prev + tempoPausadoAgora);
    setPausaAtivaInicio(null);
    setTipoPausaAtiva(null);
    if (pausaAtivaId) {
      await supabase.from('pausas_separacao').update({ status: 'finalizada' }).eq('id', pausaAtivaId);
    }
    exibirPopup('sucesso', 'Conferência Retomada', 'Bem-vindo de volta!\nO cronômetro voltou a correr.');
  };

  const handleAdicionarItemVazio = () => setItens(prev => [...prev, { id: Date.now(), codigoFornecedor: '', descricaoFornecedor: '', quantidade: '', validade: '', quantidadeBipada: 0, avarias: 0, obsItem: '' }]);
  
  const handleDuplicarParaNovoLote = (itemOriginal) => {
    const novoLote = {
      id: Date.now(),
      codigoFornecedor: itemOriginal.codigoFornecedor,
      descricaoFornecedor: itemOriginal.descricaoFornecedor,
      quantidade: '', 
      validade: '', 
      quantidadeBipada: 0,
      avarias: 0,
      obsItem: ''
    };
    setItens(prev => {
      const index = prev.findIndex(i => i.id === itemOriginal.id);
      const novaLista = [...prev];
      novaLista.splice(index + 1, 0, novoLote); 
      return novaLista;
    });
  };

  const handleRemoverItem = (id) => {
    if (itens.length === 1) {
      exibirPopup('aviso', 'Mínimo de Itens', "O recebimento precisa ter pelo menos um item registrado.");
      return;
    }
    setItens(prev => prev.filter(item => item.id !== id));
  };

  const handleAtualizarItem = (id, campo, valor) => setItens(prev => prev.map(item => item.id === id ? { ...item, [campo]: valor } : item));

  // ==========================================
  // LÓGICA DA CÂMERA / LEITOR DE CÓDIGO DE BARRAS
  // ==========================================
  const fecharModalScanner = () => {
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach(track => track.stop());
      mediaStreamRef.current = null;
    }
    setScannerAtivo(null);
  };

  const abrirModalScanner = async (item) => {
    if (!item.quantidade || Number(item.quantidade) <= 0) {
      exibirPopup('aviso', 'Quantidade Ausente', 'Informe a quantidade na NF antes de iniciar a leitura.');
      return;
    }
    setScannerAtivo(item);

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' }
      });
      mediaStreamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
      }
      iniciarDeteccaoCodigo(stream, item);
    } catch (err) {
      console.error("Erro ao acessar a câmera:", err);
      exibirPopup('erro', 'Acesso à Câmera', 'Não foi possível abrir a câmera. Verifique as permissões do navegador.');
      setScannerAtivo(null);
    }
  };

  const iniciarDeteccaoCodigo = (stream, itemAlvo) => {
    if (!('BarcodeDetector' in window)) {
      console.warn('BarcodeDetector nativo não suportado neste navegador.');
      return;
    }

    const barcodeDetector = new window.BarcodeDetector({
      formats: ['code_128', 'ean_13', 'ean_8', 'upc_a', 'upc_e', 'qr_code', 'code_39']
    });

    const verificarFrame = async () => {
      if (!videoRef.current || !mediaStreamRef.current) return;
      
      try {
        const barcodes = await barcodeDetector.detect(videoRef.current);
        if (barcodes.length > 0) {
          const codigoLido = barcodes[0].rawValue;
          incrementarBipPorLeitura(itemAlvo.id, codigoLido);
        }
      } catch (e) {
        // Ignora erros de frame individual
      }

      if (mediaStreamRef.current) {
        requestAnimationFrame(verificarFrame);
      }
    };

    requestAnimationFrame(verificarFrame);
  };

  const incrementarBipPorLeitura = (itemId, codigoLido) => {
    setItens(prev => prev.map(item => {
      if (item.id === itemId) {
        // Opcional: validar se o código lido corresponde ao código do fornecedor cadastrado
        const novaQtd = Number(item.quantidadeBipada) + 1;
        if (novaQtd >= Number(item.quantidade)) {
          setTimeout(() => fecharModalScanner(), 400); // Fecha automaticamente ao bater a meta
        }
        return { ...item, quantidadeBipada: novaQtd };
      }
      return item;
    }));
  };

  const handleSalvarPendencia = async () => {
    if (!nomeFornecedor.trim() || !marca.trim() || !numeroNF.trim() || !volumes) {
      exibirPopup('aviso', 'Campos Incompletos', "Para registrar a carga pendente, preencha pelo menos:\n\n• Fornecedor\n• Marca\n• Número da NF\n• Volumes");
      return;
    }

    setProcessando(true);

    try {
      const dadosPendentes = {
        numero_relatorio: numeroRelatorio,
        loja_recebedora: lojaRecebedora,
        nome_fornecedor: nomeFornecedor,
        marca: marca,
        numero_nf: numeroNF,
        volumes: Number(volumes),
        numero_pedido: numeroPedido || null,
        responsavel_recebedor: null, 
        observacoes: observacoes || 'Carga recebida. Aguardando conferência física.',
        itens: [], 
        responsavel_sistema: usuarioLogado?.nome_completo || 'Sistema',
        status: 'Pendente' 
      };

      const { error } = await supabase.from('recebimento_mercadorias').insert([dadosPendentes]);
      if (error) throw error;
      
      exibirPopup(
        'sucesso', 
        'Carga Pendente Salva!', 
        `A carga da NF ${numeroNF} foi registrada com sucesso.\n\nEla ficará visível no painel aguardando a conferência física detalhada.`, 
        () => { if (aoVoltar) aoVoltar(); }
      );

    } catch (error) {
      console.error("Erro ao salvar pendência:", error);
      exibirPopup('erro', 'Falha ao Registrar', `Ocorreu um erro ao registrar a carga pendente no banco de dados:\n\n${error.message}`);
    } finally {
      setProcessando(false);
    }
  };

  const handleSalvarRecebimento = async (e) => {
    e.preventDefault();

    if (!nomeFornecedor.trim() || !marca.trim() || !numeroNF.trim() || !volumes.trim() || !responsavelRecebedor.trim()) {
      exibirPopup('aviso', 'Dados do Cabeçalho', "Por favor, preencha todos os campos obrigatórios do cabeçalho da nota.");
      return;
    }

    if (itens.some(i => !i.codigoFornecedor.trim() || !i.descricaoFornecedor.trim() || !i.quantidade || !i.validade.trim())) {
      exibirPopup('aviso', 'Dados dos Produtos', "Todos os produtos precisam ter Código, Descrição, Validade (Mês/Ano) e Quantidade NF.");
      return;
    }

    setProcessando(true);

    try {
      const totalItens = itens.reduce((acc, item) => acc + Number(item.quantidade), 0);
      const upm = tempoDecorrido > 0 ? (totalItens / tempoDecorrido) * 60 : 0;
      const upmFormatado = Number(upm.toFixed(1));
      const pontosCalculados = Math.round(totalItens * upmFormatado * 1.5);

      const metricasFinais = {
        tempoTotalSegundos: tempoDecorrido,
        totalItensFisicos: totalItens,
        upm: upmFormatado,
        pontosGanhos: pontosCalculados,
        responsavel: responsavelRecebedor,
        finalizadoEm: new Date().toISOString()
      };

      const itensComLote = itens.map((item, index) => {
        const indexFormatado = String(index + 1).padStart(2, '0');
        return {
          ...item,
          loteInterno: `LT-${numeroRelatorio}-${indexFormatado}`
        };
      });

      const dadosRecebimento = {
        numero_relatorio: numeroRelatorio,
        loja_recebedora: lojaRecebedora,
        nome_fornecedor: nomeFornecedor,
        marca: marca,
        numero_nf: numeroNF,
        volumes: Number(volumes),
        numero_pedido: numeroPedido || null,
        responsavel_recebedor: responsavelRecebedor,
        observacoes: observacoes,
        itens: itensComLote, 
        responsavel_sistema: usuarioLogado?.nome_completo || 'Sistema',
        metricas_recebimento: metricasFinais,
        status: 'Concluída' 
      };

      const { error } = await supabase.from('recebimento_mercadorias').insert([dadosRecebimento]);
      if (error) throw error;
      
      setMetricasRecebimento(metricasFinais);
      setStatus('Concluída');

      exibirPopup(
        'sucesso', 
        'Recebimento Finalizado! 🏆', 
        `Relatório ${numeroRelatorio} salvo com sucesso.\n\nLotes registrados com FEFO habilitado.\n\n⚡ Velocidade: ${upmFormatado} UPM\n🎯 Pontos: +${pontosCalculados} pts (x1.5)`,
        () => { if (aoVoltar) aoVoltar(); }
      );

    } catch (error) {
      console.error("Erro ao salvar recebimento:", error);
      exibirPopup('erro', 'Falha ao Finalizar', `Ocorreu um erro ao salvar o recebimento concluído no banco de dados:\n\n${error.message}`);
    } finally {
      setProcessando(false);
    }
  };

  return (
    <div className="recebimento-container" style={{ position: 'relative' }}>
      
      {/* MODAL CUSTOMIZADO (POPUP) */}
      {popup.visivel && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 999999 }}>
          <div style={{ backgroundColor: 'white', padding: '30px', borderRadius: '12px', width: '90%', maxWidth: '420px', textAlign: 'center', boxShadow: '0 10px 30px rgba(0,0,0,0.3)' }}>
            <div style={{ fontSize: '3.5rem', marginBottom: '10px' }}>
              {popup.tipo === 'sucesso' ? '✅' : popup.tipo === 'aviso' ? '⚠️' : '❌'}
            </div>
            <h3 style={{ color: '#2c3e50', fontSize: '1.4rem', marginBottom: '12px' }}>{popup.titulo}</h3>
            <p style={{ color: '#7f8c8d', fontSize: '1rem', lineHeight: '1.5', marginBottom: '25px', whiteSpace: 'pre-wrap' }}>
              {popup.mensagem}
            </p>
            <button 
              onClick={() => {
                setPopup({ ...popup, visivel: false });
                if (popup.onConfirm) popup.onConfirm();
              }}
              style={{ 
                backgroundColor: popup.tipo === 'sucesso' ? '#27ae60' : popup.tipo === 'aviso' ? '#f39c12' : '#e74c3c', 
                color: 'white', border: 'none', padding: '12px 0', width: '100%', borderRadius: '8px', fontSize: '1.1rem', fontWeight: 'bold', cursor: 'pointer' 
              }}
            >
              Entendi
            </button>
          </div>
        </div>
      )}

      {/* MODAL DE CÂMERA (LEITOR REAL DE CÓDIGO DE BARRAS) */}
      {scannerAtivo && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.9)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', zIndex: 999999, padding: '15px' }}>
          <div style={{ width: '100%', maxWidth: '450px', backgroundColor: 'white', borderRadius: '12px', overflow: 'hidden', textAlign: 'center', position: 'relative' }}>
            <div style={{ padding: '15px', backgroundColor: '#2c3e50', color: 'white', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ margin: 0, fontSize: '1.1rem' }}>📷 Leitor de Câmera (Bip)</h3>
              <button onClick={fecharModalScanner} style={{ background: 'none', border: 'none', color: 'white', fontSize: '1.4rem', cursor: 'pointer' }}>✖</button>
            </div>
            
            <div style={{ padding: '15px' }}>
              <p style={{ margin: '0 0 10px 0', color: '#34495e', fontWeight: 'bold' }}>{scannerAtivo.descricaoFornecedor}</p>
              
              {/* Elemento de vídeo onde a câmera é transmitida */}
              <div style={{ position: 'relative', width: '100%', height: '260px', backgroundColor: '#000', borderRadius: '8px', overflow: 'hidden' }}>
                <video ref={videoRef} style={{ width: '100%', height: '100%', objectFit: 'cover' }} muted playsInline />
                <div style={{ position: 'absolute', top: '50%', left: '10%', right: '10%', height: '2px', backgroundColor: '#e74c3c', boxShadow: '0 0 8px #e74c3c' }}></div>
              </div>

              <div style={{ marginTop: '15px', fontSize: '1.1rem', color: '#2c3e50' }}>
                Conferidos: <strong style={{ color: '#27ae60' }}>{itens.find(i => i.id === scannerAtivo.id)?.quantidadeBipada}</strong> / {scannerAtivo.quantidade} un
              </div>

              <button 
                type="button" 
                onClick={() => incrementarBipPorLeitura(scannerAtivo.id, 'MANUAL')} 
                style={{ marginTop: '15px', backgroundColor: '#3498db', color: 'white', border: 'none', padding: '12px', width: '100%', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer' }}
              >
                + Registrar 1 Unidade Manualmente
              </button>
            </div>
          </div>
        </div>
      )}
      
      <div className="recebimento-header no-print">
        <div>
          <h2>📦 Registro de Recebimento de Mercadorias</h2>
          <p>Conferência física, controle FEFO e entrada de notas fiscais.</p>
        </div>
        <div style={{ display: 'flex', gap: '10px' }}>
          <button type="button" className="btn-imprimir-topo" onClick={() => window.print()}>
            🖨️ Imprimir
          </button>
          <button className="btn-voltar-recebimento" onClick={aoVoltar}>
            ← Voltar
          </button>
        </div>
      </div>

      <form className="recebimento-form" onSubmit={handleSalvarRecebimento}>
        
        <div className="recebimento-card">
          <div className="card-titulo-flex">
            <h3>📑 Dados da Nota Fiscal / Carga</h3>
            <span className="badge-relatorio-id">Nº Relatório: <strong>{numeroRelatorio}</strong></span>
          </div>

          <div className="form-grid-4">
            <div className="input-group">
              <label>Loja Recebedora *</label>
              <select value={lojaRecebedora} onChange={(e) => setLojaRecebedora(e.target.value)} disabled={status !== 'Pendente'}>
                <option value="Matriz">Matriz</option>
                <option value="Araturi">Araturi</option>
                <option value="Conjunto Ceará">Conjunto Ceará</option>
                <option value="Messejana">Messejana</option>
                <option value="Mulungu">Mulungu</option>
              </select>
            </div>
            <div className="input-group">
              <label>Nome do Fornecedor *</label>
              <input type="text" placeholder="Ex: Distribuidora X" value={nomeFornecedor} onChange={(e) => setNomeFornecedor(e.target.value)} required disabled={status !== 'Pendente'} />
            </div>
            <div className="input-group">
              <label>Marca *</label>
              <input type="text" placeholder="Ex: Marca Y" value={marca} onChange={(e) => setMarca(e.target.value)} required disabled={status !== 'Pendente'} />
            </div>
            <div className="input-group">
              <label>Número da NF *</label>
              <input type="text" placeholder="Ex: 00045892" value={numeroNF} onChange={(e) => setNumeroNF(e.target.value)} required disabled={status !== 'Pendente'} />
            </div>
            <div className="input-group">
              <label>Qtd. de Caixas / Volumes *</label>
              <input type="number" placeholder="Ex: 12" value={volumes} onChange={(e) => setVolumes(e.target.value)} required disabled={status !== 'Pendente'} />
            </div>
            <div className="input-group">
              <label>Número do Pedido (Opcional)</label>
              <input type="text" placeholder="Ex: PED-9988" value={numeroPedido} onChange={(e) => setNumeroPedido(e.target.value)} disabled={status !== 'Pendente'} />
            </div>
          </div>
        </div>

        {status === 'Pendente' && (
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '-5px', marginBottom: '20px' }} className="no-print">
            <button 
              type="button" 
              onClick={handleSalvarPendencia} 
              disabled={processando} 
              style={{ background: '#f39c12', color: 'white', border: 'none', padding: '12px 25px', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer', fontSize: '1rem', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}
            >
              {processando ? '⏳ Salvando...' : '📥 Salvar Carga Pendente (Conferência de Volumes)'}
            </button>
          </div>
        )}

        <div className="recebimento-card">
          <div className="card-titulo-flex">
            <h3>🛒 Produtos da Nota / Conferência de Lote</h3>
            {status === 'Em Conferência' && !pausaAtivaInicio && (
              <div style={{ display: 'flex', gap: '10px' }} className="no-print">
                <button type="button" onClick={() => solicitarPausaAoLider('Pausa para Almoço')} disabled={pausaPendente} style={{ padding: '8px 12px', backgroundColor: pausaPendente ? '#ecf0f1' : '#f1c40f', color: pausaPendente ? '#bdc3c7' : '#856404', border: 'none', borderRadius: '6px', fontWeight: 'bold', cursor: pausaPendente ? 'not-allowed' : 'pointer' }}>
                  🍔 {pausaPendente ? 'Aguardando...' : 'Pausa Almoço'}
                </button>
                <button type="button" onClick={() => solicitarPausaAoLider('Fim de Expediente')} disabled={pausaPendente} style={{ padding: '8px 12px', backgroundColor: pausaPendente ? '#ecf0f1' : '#34495e', color: pausaPendente ? '#bdc3c7' : 'white', border: 'none', borderRadius: '6px', fontWeight: 'bold', cursor: pausaPendente ? 'not-allowed' : 'pointer' }}>
                  🌙 {pausaPendente ? 'Aguardando...' : 'Fim de Expediente'}
                </button>
              </div>
            )}
          </div>

          <div className="input-group" style={{ marginBottom: '20px' }}>
            <label>Nome do Responsável Recebedor *</label>
            <div style={{ display: 'flex', gap: '10px' }}>
              <input type="text" placeholder="Ex: Nome do estoquista" value={responsavelRecebedor} onChange={(e) => setResponsavelRecebedor(e.target.value)} disabled={status !== 'Pendente'} style={{ flex: 1 }} />
              {status === 'Pendente' && (
                <button type="button" onClick={handleIniciarConferencia} style={{ background: '#27ae60', color: 'white', border: 'none', padding: '0 20px', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer' }}>
                  ▶️ Iniciar Conferência
                </button>
              )}
            </div>
          </div>

          {status !== 'Pendente' && (
            <div style={{ backgroundColor: '#2c3e50', color: 'white', padding: '15px', borderRadius: '8px', textAlign: 'center', marginBottom: '20px' }}>
              <div style={{ fontSize: '0.9rem', textTransform: 'uppercase', letterSpacing: '1px', opacity: 0.8 }}>
                {status === 'Concluída' ? '⏱️ Tempo Final' : (pausaAtivaInicio ? '⏸️ Tempo Congelado (Pausa)' : '⏱️ Tempo em Andamento')}
              </div>
              <div style={{ fontSize: '2.5rem', fontWeight: 'bold', margin: '10px 0' }}>
                {formatarTempo(tempoDecorrido)}
              </div>
              {metricasRecebimento && (
                <div style={{ color: '#2ecc71', fontWeight: 'bold', fontSize: '1.1rem' }}>
                  ⚡ {metricasRecebimento.upm} UPM | 🏆 +{metricasRecebimento.pontosGanhos} pts (x1.5)
                </div>
              )}
            </div>
          )}

          {pausaAtivaInicio && (
            <div style={{ textAlign: 'center', padding: '30px', backgroundColor: '#fff3cd', border: '3px dashed #f39c12', borderRadius: '8px', marginBottom: '20px' }}>
              <h2 style={{ color: '#d35400', marginBottom: '10px' }}>⏸️ RECEBIMENTO CONGELADO</h2>
              <p style={{ color: '#856404', marginBottom: '20px' }}>Motivo da Pausa: <strong>{tipoPausaAtiva}</strong></p>
              <button type="button" onClick={handleRetomarConferencia} style={{ backgroundColor: '#27ae60', color: 'white', padding: '15px 30px', fontSize: '1.1rem', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold' }}>
                ▶️ ESTOU DE VOLTA! (Retomar Conferência)
              </button>
            </div>
          )}

          {status !== 'Pendente' && !pausaAtivaInicio && (
            <div className="tabela-recebimento-wrapper">
              <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '10px' }}>
                <button type="button" className="btn-adicionar-linha no-print" onClick={handleAdicionarItemVazio}>+ Novo Produto Vazio</button>
              </div>
              <table className="tabela-recebimento">
                <thead>
                  <tr>
                    <th>Cód. Fornecedor *</th>
                    <th>Descrição do Produto *</th>
                    <th>Validade (Mês/Ano) *</th>
                    <th>Qtd Lote *</th>
                    <th>Conferido (Bip)</th>
                    <th>Avarias</th>
                    <th className="no-print">Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {itens.map((item) => (
                    <tr key={item.id}>
                      <td><input type="text" placeholder="Cód." value={item.codigoFornecedor} onChange={(e) => handleAtualizarItem(item.id, 'codigoFornecedor', e.target.value)} required disabled={status === 'Concluída'} /></td>
                      <td><input type="text" placeholder="Descrição" value={item.descricaoFornecedor} onChange={(e) => handleAtualizarItem(item.id, 'descricaoFornecedor', e.target.value)} required disabled={status === 'Concluída'} /></td>
                      <td><input type="month" value={item.validade} onChange={(e) => handleAtualizarItem(item.id, 'validade', e.target.value)} required disabled={status === 'Concluída'} style={{ minWidth: '120px' }} /></td>
                      <td><input type="number" placeholder="0" style={{ width: '80px' }} value={item.quantidade} onChange={(e) => handleAtualizarItem(item.id, 'quantidade', e.target.value)} required disabled={status === 'Concluída'} /></td>
                      <td>
                        <div className="bip-conferencia-grupo">
                          <span className="contador-bip" style={{ color: Number(item.quantidadeBipada) >= Number(item.quantidade) ? '#27ae60' : '#e74c3c' }}>
                            {item.quantidadeBipada} un
                          </span>
                          {status !== 'Concluída' && Number(item.quantidadeBipada) < Number(item.quantidade) && (
                            <button type="button" className="btn-bip-rapido no-print" onClick={() => abrirModalScanner(item)}>📷 Bip</button>
                          )}
                        </div>
                      </td>
                      <td><input type="number" placeholder="0" style={{ width: '80px', borderColor: item.avarias > 0 ? '#e74c3c' : '#bdc3c7' }} value={item.avarias} onChange={(e) => handleAtualizarItem(item.id, 'avarias', e.target.value)} disabled={status === 'Concluída'} /></td>
                      <td className="no-print" style={{ display: 'flex', gap: '5px' }}>
                        {status !== 'Concluída' && (
                          <>
                            <button type="button" onClick={() => handleDuplicarParaNovoLote(item)} title="Criar outro lote para este produto" style={{ background: '#3498db', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', padding: '5px' }}>➕ Lote</button>
                            <button type="button" onClick={() => handleRemoverItem(item.id)} title="Remover" style={{ background: '#e74c3c', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', padding: '5px' }}>🗑️</button>
                          </>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div className="recebimento-card">
          <h3>💬 Observações Gerais / Condição da Carga *</h3>
          <div className="input-group" style={{ marginTop: '10px' }}>
            <textarea rows="3" placeholder="Ex: Carga recebida com lacre rompido..." value={observacoes} onChange={(e) => setObservacoes(e.target.value)} disabled={status === 'Concluída'}></textarea>
          </div>
        </div>

        {status === 'Em Conferência' && !pausaAtivaInicio && (
          <div className="recebimento-footer-acoes no-print">
            <button type="button" className="btn-cancelar-rec" onClick={aoVoltar}>Cancelar</button>
            <button type="submit" className="btn-salvar-rec" disabled={processando}>{processando ? '⏳ Processando...' : '💾 Finalizar e Salvar Lotes'}</button>
          </div>
        )}

      </form>
    </div>
  );
}