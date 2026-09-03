import React, { useState, useEffect, useRef } from 'react';
import { Html5Qrcode, Html5QrcodeSupportedFormats } from 'html5-qrcode';
import { supabase } from '../../../services/supabase';
import '../../../styles/pages/painel/detalhes/separacaoReq.css';

export default function SeparacaoReq({ req, usuarioLogado, aoAtualizarItens, aoFinalizarSeparacao, tempoDecorrido, exibirPopup, fecharPopupCustom, aoAtualizarHistorico }) {
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
  
  // ESTADO DA PAUSA
  const [pausaPendente, setPausaPendente] = useState(false); 
  const isPausado = !!req.historico?.pausa_ativa_inicio;

  const ultimoBipTempo = useRef(0);
  const ultimoBipTexto = useRef("");
  const pedidosBipAntigoRef = useRef({});

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
      // 1. Busca os bips
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

      // 2. Busca o status da solicitação de pausa do banco
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

  // --- FUNÇÕES DA PAUSA (COM BLINDAGEM DE ERRO) ---
  const solicitarPausaAoLider = async (tipoPausa) => {
    if (!usuarioLogado?.encarregado_responsavel) {
      exibirPopup('erro', 'Sem Encarregado', 'Você não tem um Encarregado vinculado ao seu perfil.\nPeça ao administrador para atualizar o seu perfil primeiro.');
      return;
    }
    
    setPausaPendente(true);
    
    // O '.select()' no final garante que, se der erro no Supabase, a mensagem apareça!
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

  // --- FUNÇÕES DE BIP MANUAL ---
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

    if (itemCameraAtiva !== null && !isPausado) { // Trava a câmera se estiver pausado
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
          setItemCameraAtiva(null);
        });
      }, 150);
    }
    
    return () => { 
      isComponentMounted = false;
      if (scanner) { scanner.stop().then(() => { scanner.clear(); }).catch(err => console.error(err)); }
    };
  }, [itemCameraAtiva, isPausado]); 

  const processarBipagem = (index, decodedText) => {
    if (!decodedText || !decodedText.trim() || isPausado) return;
    const itensAtuais = itensRef.current; 
    const itemAtual = itensAtuais[index];
    
    const qtdBipada = itemAtual.bipContagem || 0;
    const refBipada = itemAtual.bipReferencia || null;
    const qtdDesejada = itemAtual.quantidadeEditada !== undefined ? Number(itemAtual.quantidadeEditada) : Number(itemAtual.quantidade);
    
    const itemConflitoIndex = itensAtuais.findIndex((it, i) => it.bipReferencia === decodedText && i !== index);
    
    if (itemConflitoIndex !== -1) {
      tocarBipErro();
      exibirPopup('erro', 'Trava de Segurança', `Este código de barras já pertence a outro item:\n\n👉 ${itensAtuais[itemConflitoIndex].descricao}\n\nVocê está tentando bipar no produto errado!`);
      return; 
    }
    if (qtdBipada >= qtdDesejada) {
      tocarBipErro();
      exibirPopup('aviso', 'Limite Atingido!', `Você já separou a quantidade meta (${qtdDesejada} un) para este produto.`);
      return;
    }
    if (qtdBipada === 0) {
      tocarBipSucesso();
      const novosItens = [...itensAtuais];
      novosItens[index] = { ...itemAtual, bipContagem: 1, bipReferencia: decodedText };
      aoAtualizarItens(req.id, novosItens); 
    } else {
      if (refBipada === decodedText) {
        tocarBipSucesso();
        const novosItens = [...itensAtuais];
        novosItens[index] = { ...itemAtual, bipContagem: qtdBipada + 1 };
        aoAtualizarItens(req.id, novosItens); 
      } else {
        tocarBipErro();
        exibirPopup('erro', 'Produto Incorreto!', `Você escaneou o código: ${decodedText}\nMas a referência esperada é: ${refBipada}`);
      }
    }
  };

  const resetarBipagem = (index) => {
    exibirPopup('aviso', 'Zerar Leitura?', 'Tem certeza que deseja ZERAR a leitura deste item?\nO código de referência atual será apagado.',
      () => {
        const novosItens = [...itensRef.current];
        novosItens[index] = { ...novosItens[index], bipContagem: 0, bipReferencia: null };
        aoAtualizarItens(req.id, novosItens); 
        ultimoBipTexto.current = ""; 
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

  // --- NOVA INTERFACE DE SEPARAÇÃO PAUSADA ---
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

  // --- INTERFACE NORMAL DE SEPARAÇÃO ---
  return (
    <>
      {mostrarFesta && <div className="festa-confete">🎉🏆🎉</div>}
      
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '15px', marginBottom: '15px' }}>
        <div>
          <h3 className="titulo-lista-produtos" style={{ margin: 0 }}>Lista de Produtos ({req.itens} itens)</h3>
          <p className="subtitulo-lista-produtos" style={{ margin: 0 }}>Clique na linha do produto para expandir as opções.</p>
        </div>

        {/* BOTÕES PARA SOLICITAR PAUSA - Aparecem apenas se estiver na etapa de separação e não logado como líder principal */}
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
              <th className="th-tabela-itens">Código</th>
              <th className="th-tabela-itens">Descrição</th>
              <th className="th-tabela-itens td-tabela-itens-centro">Quantidade</th>
            </tr>
          </thead>
          <tbody>
            {itens.map((item, index) => {
              const meta = item.quantidadeEditada !== undefined ? Number(item.quantidadeEditada) : Number(item.quantidade);
              
              // Lógica inteligente para preservar a visualização após a etapa de separação
              const jaPassouSeparacao = req.status !== 'Pendente' && req.status !== 'Em Separação';
              const contagemBipada = item.bipContagem !== undefined ? item.bipContagem : (jaPassouSeparacao ? meta : 0);
              
              const completo = contagemBipada >= meta;
              const teveEdicao = item.quantidadeEditada !== undefined && Number(item.quantidadeEditada) !== Number(item.quantidade);
              const estaExpandido = linhaExpandida === index;
              const statusBip = isEncarregado ? 'aprovado' : pedidosBip[item.cod];

              return (
                <React.Fragment key={index}>
                  <tr className={`tr-clicavel ${estaExpandido ? 'linha-expandida-ativa' : ''} ${completo ? 'linha-item-completo' : 'linha-item-normal'}`} onClick={() => alternarExpansao(index)}>
                    <td className="td-tabela-itens"><strong>{item.cod}</strong></td>
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
                      <td colSpan="3">
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
                                  <button className="btn-acao-expandida btn-acao-camera" onClick={() => setItemCameraAtiva(index)}>📷 Bipar Código</button>
                                  {statusBip === 'aprovado' ? (
                                    <div className="container-bip-manual">
                                      <input type="text" className="input-bip-manual" placeholder="Digite o cód. barras..." value={codigoManual[item.cod] || ''} onChange={(e) => setCodigoManual({...codigoManual, [item.cod]: e.target.value})} />
                                      <button className="btn-confirmar-bip-manual" onClick={() => { processarBipagem(index, codigoManual[item.cod]); setCodigoManual({...codigoManual, [item.cod]: ''}); }}>Validar</button>
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
            <div className="camera-modal-content">
              <div className="camera-modal-header">Lendo: {itemAtivo?.cod} - {itemAtivo?.descricao}</div>
              <div className="camera-modal-body">
                <div id="leitor-camera-modal" className="camera-box-modal"></div>
                <div className="info-bipagem">
                  <div className="progresso-texto">Bipados: {contagemBipada} de {metaCamera}</div>
                  <div className="barra-progresso-bg"><div className="barra-progresso-fill" style={{ width: `${porcentagemAtiva}%` }}></div></div>
                  {itemAtivo?.bipReferencia && (<span className="codigo-referencia">Cód. Referência: <strong>{itemAtivo.bipReferencia}</strong></span>)}
                  <div className="botoes-camera">
                    <button className="btn-resetar-bip" onClick={() => resetarBipagem(itemCameraAtiva)}>Zerar Leitura</button>
                    <button className="btn-fechar-camera" onClick={() => setItemCameraAtiva(null)}>Fechar Câmera</button>
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