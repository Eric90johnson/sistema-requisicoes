import React, { useState, useEffect, useRef } from 'react';
import { Html5Qrcode, Html5QrcodeSupportedFormats } from 'html5-qrcode';
import { supabase } from '../../../services/supabase';
import '../../../styles/pages/painel/detalhes/separacaoReq.css';

export default function SeparacaoReq({ req, usuarioLogado, aoAtualizarItens, aoFinalizarSeparacao, tempoDecorrido, exibirPopup, fecharPopupCustom, aoAtualizarHistorico, baseProdutos }) {
  const [itens, setItens] = useState(req.listaItens || []);
  const itensRef = useRef(itens);
  
  useEffect(() => {
    setItens(req.listaItens || []);
    itensRef.current = req.listaItens || [];
  }, [req.listaItens]);

  const [linhaExpandida, setLinhaExpandida] = useState(null);
  const [modoExpansao, setModoExpansao] = useState('resumo'); 
  const [itemCameraAtiva, setItemCameraAtiva] = useState(null);
  const [novaQuantidade, setNovaQuantidade] = useState('');
  const [motivoAlteracao, setMotivoAlteracao] = useState('');
  const [mostrarFesta, setMostrarFesta] = useState(false);

  const isEncarregado = usuarioLogado?.hierarquia === 'Encarregado' || usuarioLogado?.username === 'admin' || usuarioLogado?.acesso_admin;
  const [pedidosBip, setPedidosBip] = useState({}); 
  const [codigoManual, setCodigoManual] = useState({}); 
  
  const [pausaPendente, setPausaPendente] = useState(false); 
  const isPausado = !!req.historico?.pausa_ativa_inicio;

  const ultimoBipTempo = useRef(0);
  const ultimoBipTexto = useRef("");
  const pedidosBipAntigoRef = useRef({});

  const isMobile = window.innerWidth <= 768;
  const [modoLeitura, setModoLeitura] = useState(isMobile ? 'camera' : 'laser');
  const bufferLeitor = useRef("");
  const timeoutLeitor = useRef(null);
  const [listaCodigosLidos, setListaCodigosLidos] = useState([]);

  const exibirCodigoMatriz = req.origem === 'Conjunto Ceará';

  const todosBipados = itens.length > 0 && itens.every(item => {
    const meta = item.quantidadeEditada !== undefined ? Number(item.quantidadeEditada) : Number(item.quantidade);
    return (item.bipContagem || 0) >= meta;
  });

  const tocarBipSucesso = () => {
    try {
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      const osc = ctx.createOscillator();
      osc.type = 'sine'; osc.frequency.setValueAtTime(800, ctx.currentTime);
      osc.connect(ctx.destination); osc.start(); osc.stop(ctx.currentTime + 0.1); 
    } catch(e) {}
  };
  
  const tocarBipErro = () => {
    try {
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      const osc = ctx.createOscillator();
      osc.type = 'sawtooth'; osc.frequency.setValueAtTime(150, ctx.currentTime); 
      osc.connect(ctx.destination); osc.start(); osc.stop(ctx.currentTime + 0.5); 
    } catch(e) {}
  };

  useEffect(() => {
    setPedidosBip({});
    setCodigoManual({});
    pedidosBipAntigoRef.current = {};

    if (!usuarioLogado || isEncarregado) return;

    const fetchAuths = async () => {
      const { data, error } = await supabase.from('autorizacoes_bip')
        .select('*').eq('requisicao_id', req.id).eq('solicitante_nome', usuarioLogado.nome_completo).order('timestamp_criacao', { ascending: true });
        
      if (!error && data) {
        const mapNovo = {};
        data.forEach(d => {
          mapNovo[d.produto_codigo] = d.status;
          const statusAntigo = pedidosBipAntigoRef.current[d.produto_codigo];
          if (statusAntigo && statusAntigo !== d.status) {
            if (d.status === 'aprovado') {
              tocarBipSucesso();
              exibirPopup('sucesso', 'Bip Manual Liberado!', `O encarregado liberou a digitação manual para o produto:\n\n${d.produto_descricao}`);
            } else if (d.status === 'recusado') {
              tocarBipErro();
              exibirPopup('erro', 'Liberação Recusada', `Atenção, o encarregado recusou a liberação para:\n\n${d.produto_descricao}`);
            }
          }
        });
        pedidosBipAntigoRef.current = mapNovo;
        setPedidosBip(mapNovo);
      }

      const { data: dataPausa } = await supabase.from('pausas_separacao')
        .select('*').eq('requisicao_id', req.id).eq('solicitante_nome', usuarioLogado.nome_completo).order('timestamp_criacao', { ascending: false }).limit(1);
      
      if (dataPausa && dataPausa.length > 0) {
        if (dataPausa[0].status === 'pendente') {
          setPausaPendente(true);
        } else {
          setPausaPendente(false);
        }
      }
    };

    fetchAuths();
    const intervaloAuth = setInterval(fetchAuths, 5000);
    return () => clearInterval(intervaloAuth);
  }, [req.id, usuarioLogado, isEncarregado]);

  const solicitarPausaAoLider = async (tipoPausa) => {
    if (!usuarioLogado?.encarregado_responsavel) {
      exibirPopup('erro', 'Sem Encarregado', 'Você não tem um Encarregado vinculado ao seu perfil.\nPeça ao administrador para atualizar o seu perfil primeiro.');
      return;
    }
    
    setPausaPendente(true);
    
    const { error } = await supabase.from('pausas_separacao').insert([{
      requisicao_id: req.id,
      solicitante_nome: usuarioLogado.nome_completo,
      encarregado_destino: usuarioLogado.encarregado_responsavel,
      tipo_pausa: tipoPausa,
      timestamp_criacao: Date.now()
    }]).select();

    if (error) {
      setPausaPendente(false);
      exibirPopup('erro', 'Erro ao Solicitar', `Ocorreu um erro no banco de dados. Você criou a tabela de pausas?\n\nDetalhe técnico: ${error.message}`);
      return;
    }

    exibirPopup('info', 'Pausa Solicitada', `Seu pedido de pausa para "${tipoPausa}" foi enviado.\n\nAguarde a aprovação do encarregado. O cronômetro só vai parar quando ele autorizar!`);
  };

  const handleRetomarSeparacao = async () => {
    const horaRetorno = Date.now();
    const horaQuePausou = req.historico.pausa_ativa_inicio;
    
    const tempoPausadoAgora = horaRetorno - Number(horaQuePausou);
    const tempoPausadoAnterior = req.historico.tempo_pausado_total || 0;

    const novoHistorico = {
      ...req.historico,
      tempo_pausado_total: tempoPausadoAnterior + tempoPausadoAgora
    };
    
    delete novoHistorico.pausa_ativa_inicio;
    const pausaIdAtiva = novoHistorico.pausa_ativa_id;
    delete novoHistorico.pausa_ativa_id;
    delete novoHistorico.tipo_pausa_ativa;

    if (pausaIdAtiva) {
      await supabase.from('pausas_separacao').update({ status: 'finalizada' }).eq('id', pausaIdAtiva);
    }
    
    await aoAtualizarHistorico(req.id, novoHistorico);
    exibirPopup('sucesso', 'Bem-vindo(a) de volta!', 'Sua separação foi retomada e o cronômetro voltou a correr. Bom trabalho!');
  };

  const solicitarBipManual = async (item) => {
    if (!usuarioLogado?.encarregado_responsavel) {
      exibirPopup('erro', 'Sem Encarregado', 'Você não tem um Encarregado vinculado.');
      return;
    }
    setPedidosBip(prev => ({ ...prev, [item.cod]: 'pendente' }));
    
    const { error } = await supabase.from('autorizacoes_bip').insert([{
      requisicao_id: req.id, produto_codigo: item.cod, produto_descricao: item.descricao,
      solicitante_nome: usuarioLogado.nome_completo, encarregado_destino: usuarioLogado.encarregado_responsavel,
      status: 'pendente', timestamp_criacao: Date.now()
    }]).select();

    if (error) {
       exibirPopup('erro', 'Erro ao Solicitar', `Ocorreu um erro no banco de dados.\n\nDetalhe técnico: ${error.message}`);
    }
  };

  useEffect(() => {
    let scanner = null;
    let isComponentMounted = true;

    if (itemCameraAtiva !== null && !isPausado && modoLeitura === 'camera') { 
      setTimeout(() => {
        if (!isComponentMounted) return;
        scanner = new Html5Qrcode('leitor-camera-modal', {
          formatsToSupport: [Html5QrcodeSupportedFormats.EAN_13, Html5QrcodeSupportedFormats.EAN_8, Html5QrcodeSupportedFormats.CODE_128, Html5QrcodeSupportedFormats.UPC_A, Html5QrcodeSupportedFormats.CODE_39]
        });
        const configCamera = { fps: 10, qrbox: { width: 250, height: 100 } };

        scanner.start({ facingMode: "environment" }, configCamera,
          (decodedText) => {
            const agora = Date.now();
            if (decodedText === ultimoBipTexto.current && (agora - ultimoBipTempo.current < 1500)) return;
            ultimoBipTexto.current = decodedText;
            ultimoBipTempo.current = agora;
            processarBipagem(itemCameraAtiva, decodedText);
          },
          (err) => { }
        ).catch(err => {
          console.error("Erro ao iniciar câmera:", err);
          exibirPopup('erro', 'Erro de Câmera', 'Não foi possível iniciar a câmera. Verifique as permissões.');
          setModoLeitura('laser');
        });
      }, 150);
    }
    
    return () => { 
      isComponentMounted = false;
      if (scanner) { scanner.stop().then(() => { scanner.clear(); }).catch(err => console.error(err)); }
    };
  }, [itemCameraAtiva, isPausado, modoLeitura]); 

  useEffect(() => {
    if (itemCameraAtiva === null || isPausado || modoLeitura !== 'laser') return;

    const handleKeyDown = (e) => {
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;

      if (e.key === 'Enter') {
        e.preventDefault();
        const codigoLido = bufferLeitor.current.trim();
        bufferLeitor.current = ""; 

        if (codigoLido.length > 2) {
          const agora = Date.now();
          if (codigoLido === ultimoBipTexto.current && (agora - ultimoBipTempo.current < 1000)) return; 
          
          ultimoBipTexto.current = codigoLido;
          ultimoBipTempo.current = agora;
          
          processarBipagem(itemCameraAtiva, codigoLido);
        }
        return;
      }

      if (e.key.length === 1 && /^[a-zA-Z0-9-]$/.test(e.key)) {
        bufferLeitor.current += e.key;
        if (timeoutLeitor.current) clearTimeout(timeoutLeitor.current);
        timeoutLeitor.current = setTimeout(() => { bufferLeitor.current = ""; }, 100); 
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      if (timeoutLeitor.current) clearTimeout(timeoutLeitor.current);
    };
  }, [itemCameraAtiva, isPausado, modoLeitura, itensRef]);

  // 🚀 AQUI: O coração da validação e do Diário de Bips
  const processarBipagem = (index, decodedText) => {
    if (!decodedText || !decodedText.trim() || isPausado) return;
    const itensAtuais = itensRef.current; 
    const itemAtual = itensAtuais[index];
    
    const qtdBipada = itemAtual.bipContagem || 0;
    const qtdDesejada = itemAtual.quantidadeEditada !== undefined ? Number(itemAtual.quantidadeEditada) : Number(itemAtual.quantidade);
    
    // 🚀 NOVA TRAVA DE SEGURANÇA (Cruza com o Banco de Dados)
    const produtoCatalogo = baseProdutos ? baseProdutos.find(p => String(p.codigo) === String(itemAtual.cod)) : null;
    const codigoBarrasEsperado = String(itemAtual.codigoBarra || itemAtual.codigo_barra || itemAtual.codigoBarras || produtoCatalogo?.codigoBarra || produtoCatalogo?.codigo_barra || '').trim();

    // Valida se o código lido é igual ao código que consta no sistema
    if (codigoBarrasEsperado && codigoBarrasEsperado !== '-' && codigoBarrasEsperado !== 'undefined' && codigoBarrasEsperado !== 'null') {
      if (codigoBarrasEsperado !== String(decodedText).trim()) {
        tocarBipErro();
        exibirPopup('erro', 'PRODUTO INCORRETO (Trava de Segurança)', `Você bipou o código:\n❌ ${decodedText}\n\nO sistema exige o código do produto solicitado:\n✅ ${codigoBarrasEsperado}\n👉 (${itemAtual.descricao})\n\nVocê pegou o produto errado na prateleira!`);
        return;
      }
    } else {
      // Fallback seguro: se não tiver cadastro no banco, ele checa se já existe uma leitura anterior travada
      const refBipadaFallback = itemAtual.bipReferencia || null;
      if (refBipadaFallback && refBipadaFallback !== decodedText) {
        tocarBipErro();
        exibirPopup('erro', 'Produto Diferente!', `Você escaneou o código: ${decodedText}\nMas a referência anterior bipada era: ${refBipadaFallback}`);
        return;
      }
    }

    // Trava de segurança para impedir bipagem no card errado (quando tem 2 itens parecidos na lista)
    const itemConflitoIndex = itensAtuais.findIndex((it, i) => it.bipReferencia === decodedText && i !== index);
    if (itemConflitoIndex !== -1) {
      tocarBipErro();
      exibirPopup('erro', 'Trava de Segurança', `Este código de barras já pertence a outro item nesta mesma nota:\n\n👉 ${itensAtuais[itemConflitoIndex].descricao}\n\nVocê está bipando na linha errada!`);
      return; 
    }
    
    // Trava de limite de contagem
    if (qtdBipada >= qtdDesejada) {
      tocarBipErro();
      exibirPopup('aviso', 'Limite Atingido!', `Você já separou a quantidade meta (${qtdDesejada} un) para este produto.`);
      return;
    }

    // 🚀 Cria o objeto do bip atual
    const novoBip = { codigo: decodedText, timestamp: Date.now() };

    tocarBipSucesso();
    const novosItens = [...itensAtuais];
    const historicoAntigo = itemAtual.historicoBips || [];
    
    novosItens[index] = { 
      ...itemAtual, 
      bipContagem: qtdBipada + 1,
      bipReferencia: decodedText, // Sempre crava o lido, mesmo que venha do banco
      historicoBips: [...historicoAntigo, novoBip] // 🚀 Adiciona à lista de histórico no diário
    };
    
    aoAtualizarItens(req.id, novosItens); 
    setListaCodigosLidos(prev => [decodedText, ...prev]);
  };

  const resetarBipagem = (index) => {
    exibirPopup('aviso', 'Zerar Leitura?', 'Tem certeza que deseja ZERAR a leitura deste item?\nO histórico de bipagem será apagado.',
      () => {
        const novosItens = [...itensRef.current];
        novosItens[index] = { 
          ...novosItens[index], 
          bipContagem: 0, 
          bipReferencia: null,
          historicoBips: [] // 🚀 Limpa o diário também
        };
        aoAtualizarItens(req.id, novosItens); 
        ultimoBipTexto.current = ""; 
        setListaCodigosLidos([]); 
        fecharPopupCustom();
      }, () => fecharPopupCustom()
    );
  };

  const salvarProgressoParcial = () => {
    exibirPopup('info', 'Progresso Salvo', 'As quantidades bipadas já estão gravadas na nuvem de forma segura.\n\nAtenção: O cronômetro CONTINUA CORRENDO. Você pode sair desta tela e voltar mais tarde para finalizar a separação.');
  };

  const isReposicaoInterna = req.motivo === 'Reposição Interna' || (req.origem && req.destino && req.origem === req.destino);

  const formatarTempo = (segundos) => {
    const h = Math.floor(segundos / 3600).toString().padStart(2, '0');
    const m = Math.floor((segundos % 3600) / 60).toString().padStart(2, '0');
    const s = (segundos % 60).toString().padStart(2, '0');
    return `${h}:${m}:${s}`;
  };

  const finalizarSeparacaoValidada = async () => {
    if (todosBipados) {
      const respAtual = req.historico['Em Separação'] || 'Equipe Desconhecida';
      const metricasFinais = await aoFinalizarSeparacao(req.id, tempoDecorrido, respAtual);
      if (!metricasFinais) return; 

      const tempoSegundos = metricasFinais.tempoTotalSegundos || 1;
      const itensFisicos = metricasFinais.totalItensFisicos || 0;
      const upm = (itensFisicos / tempoSegundos) * 60;
      const upmFormatado = Number(upm.toFixed(1));
      let pontosGanhos = Math.round(itensFisicos * upmFormatado);

      if (isReposicaoInterna) { pontosGanhos *= 2; }

      let msgFinal = `Separação Concluída!\n\n📦 Total Bipado: ${itensFisicos} un\n⏱️ Tempo Gasto: ${formatarTempo(tempoSegundos)}\n⚡ Velocidade Média: ${upmFormatado} UPM\n\n🏆 PONTOS CONQUISTADOS: +${pontosGanhos} pts`;
      
      if (metricasFinais.bateuRecorde) {
        setMostrarFesta(true);
        setTimeout(() => setMostrarFesta(false), 5000); 
        msgFinal += `\n\n🎉 NOVO RECORDE DA LOJA! Você superou todas as expectativas!`;
        exibirPopup('sucesso', '🏆 LINHA DE CHEGADA!', msgFinal);
      } else {
        msgFinal += `\n\nMuito bem! A requisição está pronta para faturamento/saída.`;
        exibirPopup('sucesso', '🏁 Missão Cumprida', msgFinal);
      }
    } else {
      exibirPopup('aviso', 'Separação Incompleta', 'Você ainda precisa finalizar a leitura (bipar) todos os itens da requisição.');
    }
  };

  const alternarExpansao = (index) => {
    if (linhaExpandida === index) { 
      setLinhaExpandida(null); 
      setModoExpansao('resumo'); 
    } else { 
      setLinhaExpandida(index); 
      setModoExpansao('resumo'); 
      const metaAtual = itens[index].quantidadeEditada !== undefined ? itens[index].quantidadeEditada : itens[index].quantidade;
      setNovaQuantidade(metaAtual); 
      setMotivoAlteracao(itens[index].observacao || ''); 
    }
  };

  const salvarEdicao = (index) => {
    if (motivoAlteracao.trim().length < 10) { exibirPopup('aviso', 'Atenção', 'O motivo da alteração deve conter no mínimo 10 caracteres para justify a mudança.'); return; }
    const itensAtualizados = [...itens];
    itensAtualizados[index] = { ...itensAtualizados[index], quantidadeEditada: novaQuantidade, observacao: motivoAlteracao };
    aoAtualizarItens(req.id, itensAtualizados);
    setModoExpansao('resumo'); 
  };

  if (isPausado) {
    return (
      <div style={{ textAlign: 'center', padding: '50px 20px', backgroundColor: '#fff3cd', border: '3px dashed #f39c12', borderRadius: '12px', marginTop: '20px' }}>
        <h2 style={{ color: '#d35400', marginBottom: '15px', fontSize: '2rem' }}>⏸️ SEPARAÇÃO CONGELADA</h2>
        <p style={{ fontSize: '1.2rem', color: '#856404', marginBottom: '30px' }}>
          Motivo da Pausa: <strong>{req.historico.tipo_pausa_ativa}</strong><br/><br/>
          <span style={{ fontSize: '1rem' }}>O cronômetro está parado e os produtos foram ocultados por segurança.</span>
        </p>
        <button onClick={handleRetomarSeparacao} style={{ backgroundColor: '#27ae60', color: 'white', padding: '18px 40px', fontSize: '1.2rem', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold', boxShadow: '0 4px 6px rgba(0,0,0,0.1)' }}>
          ▶️ ESTOU DE VOLTA! (Retomar Separação)
        </button>
      </div>
    );
  }

  return (
    <>
      {mostrarFesta && <div className="festa-confete">🎉🏆🎉</div>}
      
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '15px', marginBottom: '15px' }}>
        <div>
          <h3 className="titulo-lista-produtos" style={{ margin: 0 }}>Lista de Produtos ({req.itens} itens)</h3>
          <p className="subtitulo-lista-produtos" style={{ margin: 0 }}>Clique na linha do produto para expandir as opções.</p>
        </div>

        {req.status === 'Em Separação' && !req.metricasSeparacao && !isEncarregado && (
          <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
            <button 
              onClick={() => solicitarPausaAoLider('Pausa para Almoço')} 
              disabled={pausaPendente}
              style={{ padding: '10px 15px', backgroundColor: pausaPendente ? '#ecf0f1' : '#f1c40f', color: pausaPendente ? '#bdc3c7' : '#856404', border: 'none', borderRadius: '6px', fontWeight: 'bold', cursor: pausaPendente ? 'not-allowed' : 'pointer' }}
            >
              🍔 {pausaPendente ? 'Aguardando Aprovação...' : 'Pausa para Almoço'}
            </button>
            <button 
              onClick={() => solicitarPausaAoLider('Fim de Expediente')} 
              disabled={pausaPendente}
              style={{ padding: '10px 15px', backgroundColor: pausaPendente ? '#ecf0f1' : '#34495e', color: pausaPendente ? '#bdc3c7' : 'white', border: 'none', borderRadius: '6px', fontWeight: 'bold', cursor: pausaPendente ? 'not-allowed' : 'pointer' }}
            >
              🌙 {pausaPendente ? 'Aguardando Aprovação...' : 'Fim de Expediente'}
            </button>
          </div>
        )}
      </div>
      
      <div className="tabela-wrapper">
        <table className="tabela-itens">
          <thead>
            <tr className="tabela-itens-header-tr">
              {exibirCodigoMatriz && <th className="th-tabela-itens" style={{ color: '#8e44ad' }}>Cód. Araturi</th>}
              <th className="th-tabela-itens">Código</th>
              <th className="th-tabela-itens">Cód. Barras</th>
              <th className="th-tabela-itens">Descrição</th>
              <th className="th-tabela-itens td-tabela-itens-centro">Quantidade</th>
            </tr>
          </thead>
          <tbody>
            {itens.map((item, index) => {
              const meta = item.quantidadeEditada !== undefined ? Number(item.quantidadeEditada) : Number(item.quantidade);
              const jaPassouSeparacao = req.status !== 'Pendente' && req.status !== 'Em Separação';
              const contagemBipada = item.bipContagem !== undefined ? item.bipContagem : (jaPassouSeparacao ? meta : 0);
              const completo = contagemBipada >= meta;
              const teveEdicao = item.quantidadeEditada !== undefined && Number(item.quantidadeEditada) !== Number(item.quantidade);
              const estaExpandido = linhaExpandida === index;
              const statusBip = isEncarregado ? 'aprovado' : pedidosBip[item.cod];

              const produtoCatalogo = baseProdutos ? baseProdutos.find(p => String(p.codigo) === String(item.cod)) : null;
              const codigoBarrasExibicao = item.codigoBarra || item.codigo_barra || item.codigoBarras || produtoCatalogo?.codigoBarra || produtoCatalogo?.codigo_barra || '-';

              return (
                <React.Fragment key={index}>
                  <tr className={`tr-clicavel ${estaExpandido ? 'linha-expandida-ativa' : ''} ${completo ? 'linha-item-completo' : 'linha-item-normal'}`} onClick={() => alternarExpansao(index)}>
                    
                    {exibirCodigoMatriz && (
                      <td className="td-tabela-itens">
                        <strong style={{ color: '#8e44ad', backgroundColor: '#fcf8ff', padding: '2px 6px', borderRadius: '4px' }}>
                          {item.codigoMatriz || '-'}
                        </strong>
                      </td>
                    )}

                    <td className="td-tabela-itens"><strong>{item.cod}</strong></td>
                    <td className="td-tabela-itens">{codigoBarrasExibicao}</td>
                    <td className="td-tabela-itens">{item.descricao}</td>
                    <td className={`td-tabela-itens td-tabela-itens-centro ${completo ? 'texto-verde-sucesso' : ''}`}>
                      {teveEdicao ? (
                        <><span style={{ color: '#e74c3c', textDecoration: 'line-through', marginRight: '6px' }}>{item.quantidade}</span><strong>{meta}</strong> un</>
                      ) : (
                        `${item.quantidade} un`
                      )}
                    </td>
                  </tr>
                  
                  {estaExpandido && (
                    <tr className="linha-expandida">
                      <td colSpan={exibirCodigoMatriz ? "5" : "4"}>
                        <div className="detalhes-produto-expandido">
                          {modoExpansao === 'resumo' && (
                            <div className="info-bipagem-resumo">
                              <span className={`qtd-destaque ${completo ? 'qtd-destaque-completo' : 'qtd-destaque-pendente'}`}>
                                Separado: {contagemBipada} / <span style={{ color: teveEdicao ? '#e74c3c' : 'inherit' }}>{item.quantidade}</span> un
                                {teveEdicao && <span style={{ fontSize: '0.85rem', color: '#7f8c8d', marginLeft: '8px' }}>(Ajustado para {meta})</span>}
                              </span>
                              
                              {item.observacao && ( <span className="texto-observacao">Obs: {item.observacao}</span> )}
                              
                              {req.status === 'Em Separação' && !req.metricasSeparacao && !completo && (
                                <div className="acoes-linha-expandida">
                                  <button className="btn-acao-expandida btn-acao-camera" onClick={() => { setItemCameraAtiva(index); setListaCodigosLidos([]); }}>📷 Bipar Código</button>
                                  {statusBip === 'aprovado' ? (
                                    <div className="container-bip-manual">
                                      <input type="text" className="input-bip-manual" placeholder="Digite o cód. barras..." value={codigoManual[item.cod] || ''} onChange={(e) => setCodigoManual({...codigoManual, [item.cod]: e.target.value})} />
                                      <button className="btn-confirmar-bip-manual" onClick={() => { processarBipagem(index, codigoManual[item.cod]); setListaCodigosLidos(prev => [codigoManual[item.cod], ...prev]); setCodigoManual({...codigoManual, [item.cod]: ''}); }}>Validar</button>
                                    </div>
                                  ) : statusBip === 'pendente' ? (
                                    <span className="badge-status-bip pendente">⏳ Aguardando Encarregado...</span>
                                  ) : statusBip === 'recusado' ? (
                                    <>
                                      <span className="badge-status-bip recusado">❌ Recusado</span>
                                      <button className="btn-acao-expandida btn-acao-chave" onClick={() => solicitarBipManual(item)}>🔑 Solicitar Novamente</button>
                                    </>
                                  ) : (
                                    <button className="btn-acao-expandida btn-acao-chave" onClick={() => solicitarBipManual(item)}>🔑 Digitação Manual</button>
                                  )}
                                  <button className="btn-acao-expandida btn-acao-editar" onClick={() => setModoExpansao('edicao')}>✏️ Editar Qtd</button>
                                </div>
                              )}
                              {req.status === 'Em Separação' && !req.metricasSeparacao && contagemBipada > 0 && (
                                <button className="btn-resetar-bip btn-resetar-margin" onClick={() => resetarBipagem(index)}>Zerar Leitura Deste Item</button>
                              )}
                            </div>
                          )}

                          {modoExpansao === 'edicao' && (
                            <div className="edicao-container">
                              <p className="titulo-ajuste-qtd">Ajuste de Quantidade Física</p>
                              <div className="edicao-linha">
                                <input type="number" className="input-qtd-edit" value={novaQuantidade} onChange={(e) => setNovaQuantidade(e.target.value)} />
                                <input type="text" className="input-obs-edit" placeholder="Motivo da alteração..." value={motivoAlteracao} onChange={(e) => setMotivoAlteracao(e.target.value)} />
                                <button className="btn-acao-edit" onClick={() => salvarEdicao(index)} title="Salvar">✔️</button>
                                <button className="btn-acao-edit" onClick={() => setModoExpansao('resumo')} title="Cancelar">❌</button>
                              </div>
                            </div>
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

      {req.status === 'Em Separação' && !req.metricasSeparacao && (
        todosBipados ? (
          <button className="btn-salvar-progresso" onClick={finalizarSeparacaoValidada}>✅ Concluir Separação</button>
        ) : (
          <button className="btn-salvar-progresso" onClick={salvarProgressoParcial} style={{ backgroundColor: '#f39c12' }}>💾 Salvar Progresso Físico</button>
        )
      )}

      {itemCameraAtiva !== null && (() => {
        const itemAtivo = itens[itemCameraAtiva];
        const contagemBipada = itemAtivo?.bipContagem || 0;
        const metaCamera = itemAtivo?.quantidadeEditada !== undefined ? Number(itemAtivo.quantidadeEditada) : Number(itemAtivo?.quantidade);
        const porcentagemAtiva = itemAtivo ? Math.min((contagemBipada / metaCamera) * 100, 100) : 0;

        return (
          <div className="camera-modal-overlay">
            <div className="camera-modal-content" style={{ maxWidth: '450px', width: '100%', borderRadius: '12px', overflow: 'hidden', padding: 0 }}>
              
              <div className="camera-modal-header" style={{ padding: '15px', backgroundColor: '#2c3e50', color: 'white', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <h3 style={{ margin: 0, fontSize: '1rem' }}>Bipar: {itemAtivo?.cod} {itemAtivo?.codigoMatriz ? `(Araturi: ${itemAtivo.codigoMatriz})` : ''}</h3>
                  <span style={{ fontSize: '0.85rem', color: '#bdc3c7' }}>{itemAtivo?.descricao}</span>
                </div>
                <button onClick={() => setItemCameraAtiva(null)} style={{ background: 'none', border: 'none', color: 'white', fontSize: '1.4rem', cursor: 'pointer' }}>✖</button>
              </div>

              {/* 🚀 ABAS DE SELEÇÃO: CÂMERA vs LASER */}
              <div style={{ display: 'flex', borderBottom: '1px solid #bdc3c7', backgroundColor: '#f8f9fa' }}>
                <button 
                  type="button" onClick={() => setModoLeitura('laser')}
                  style={{ flex: 1, padding: '12px', border: 'none', background: modoLeitura === 'laser' ? 'white' : 'transparent', fontWeight: 'bold', color: modoLeitura === 'laser' ? '#2980b9' : '#7f8c8d', borderBottom: modoLeitura === 'laser' ? '3px solid #2980b9' : '3px solid transparent', cursor: 'pointer', transition: 'all 0.2s' }}
                >
                  🔫 Leitor a Laser
                </button>
                <button 
                  type="button" onClick={() => setModoLeitura('camera')}
                  style={{ flex: 1, padding: '12px', border: 'none', background: modoLeitura === 'camera' ? 'white' : 'transparent', fontWeight: 'bold', color: modoLeitura === 'camera' ? '#2980b9' : '#7f8c8d', borderBottom: modoLeitura === 'camera' ? '3px solid #2980b9' : '3px solid transparent', cursor: 'pointer', transition: 'all 0.2s' }}
                >
                  📷 Câmera do Celular
                </button>
              </div>

              <div className="camera-modal-body" style={{ padding: '20px', backgroundColor: 'white' }}>
                
                {/* MODO CÂMERA */}
                {modoLeitura === 'camera' && (
                  <>
                    <div id="leitor-camera-modal" className="camera-box-modal" style={{ width: '100%', borderRadius: '8px', overflow: 'hidden', backgroundColor: '#000', minHeight: '220px', border: '2px solid #bdc3c7' }}></div>
                    <p style={{ marginTop: '10px', fontSize: '0.9rem', color: '#7f8c8d', textAlign: 'center' }}>Aponte a câmera para os traços do código de barras.</p>
                  </>
                )}

                {/* MODO LASER BLUETOOTH */}
                {modoLeitura === 'laser' && (
                  <div style={{ width: '100%', minHeight: '220px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', backgroundColor: '#f1f2f6', borderRadius: '8px', border: '2px dashed #95a5a6', padding: '20px' }}>
                    {listaCodigosLidos.length > 0 ? (
                      <div style={{ width: '100%', maxHeight: '180px', overflowY: 'auto', textAlign: 'left' }}>
                        <p style={{ margin: '0 0 10px 0', color: '#7f8c8d', fontSize: '0.9rem', fontWeight: 'bold', borderBottom: '1px solid #bdc3c7', paddingBottom: '5px' }}>Últimos códigos lidos:</p>
                        {listaCodigosLidos.map((codigo, idx) => (
                          <div key={idx} style={{ padding: '5px 0', color: '#2c3e50', fontSize: '1.1rem', borderBottom: '1px solid #ecf0f1', display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <span style={{ color: '#27ae60' }}>✔️</span> {codigo}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <>
                        <span style={{ fontSize: '4rem', marginBottom: '10px' }}>🔫</span>
                        <h4 style={{ color: '#2c3e50', margin: '0 0 10px 0', fontSize: '1.2rem', textAlign: 'center' }}>Aguardando Leitor Bluetooth...</h4>
                        <p style={{ color: '#7f8c8d', fontSize: '0.95rem', margin: 0, lineHeight: '1.4', textAlign: 'center' }}>Não é necessário clicar em nada.<br/>Apenas aponte o leitor e aperte o gatilho.</p>
                      </>
                    )}
                  </div>
                )}

                <div className="info-bipagem" style={{ marginTop: '20px' }}>
                  <div className="progresso-texto" style={{ fontSize: '1.1rem', fontWeight: 'bold', color: '#2c3e50' }}>Bipados: <span style={{ color: '#27ae60' }}>{contagemBipada}</span> de {metaCamera}</div>
                  <div className="barra-progresso-bg" style={{ marginTop: '10px', height: '10px', backgroundColor: '#ecf0f1', borderRadius: '5px', overflow: 'hidden' }}><div className="barra-progresso-fill" style={{ width: `${porcentagemAtiva}%`, backgroundColor: '#27ae60', height: '100%', transition: 'width 0.3s ease' }}></div></div>
                  {itemAtivo?.bipReferencia && (<span className="codigo-referencia" style={{ display: 'block', marginTop: '10px', fontSize: '0.85rem', color: '#7f8c8d' }}>Cód. Referência: <strong>{itemAtivo.bipReferencia}</strong></span>)}
                  
                  <div className="botoes-camera" style={{ display: 'flex', gap: '10px', marginTop: '20px' }}>
                    <button className="btn-resetar-bip" onClick={() => resetarBipagem(itemCameraAtiva)} style={{ flex: 1, padding: '12px', backgroundColor: '#e74c3c', color: 'white', border: 'none', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer' }}>Zerar Leitura</button>
                    <button className="btn-fechar-camera" onClick={() => setItemCameraAtiva(null)} style={{ flex: 1, padding: '12px', backgroundColor: '#95a5a6', color: 'white', border: 'none', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer' }}>Fechar</button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        );
      })()}
    </>
  );
}