import React, { useState, useEffect, useRef } from 'react';
import { Html5Qrcode, Html5QrcodeSupportedFormats } from 'html5-qrcode';
import '../../../styles/pages/painel/detalhes/detalhes.css';
import { supabase } from '../../../services/supabase';
import Romaneio from '../romaneio/Romaneio';

export default function DetalhesRequisicao({ req, usuarioLogado, baseProdutos, aoVoltar, aoMudarStatus, aoAtualizarItens, aoAdicionarResponsavel, aoFinalizarSeparacao, aoIniciarEdicao, aoAtualizarObservacoes, recordesGlobais }) {
  if (!req) return null;

  const [novoStatus, setNovoStatus] = useState(req.status);
  const [responsavel, setResponsavel] = useState('');
  const [numReqExterna, setNumReqExterna] = useState('');
  const [notaFiscal, setNotaFiscal] = useState('');

  const [nomeAssumir, setNomeAssumir] = useState('');
  const [modoAssumir, setModoAssumir] = useState(false);

  const [nomeEditorEdicao, setNomeEditorEdicao] = useState('');
  const [modoEditarReq, setModoEditarReq] = useState(false);

  const [novaObs, setNovaObs] = useState('');

  const [tempoDecorrido, setTempoDecorrido] = useState(0);
  const [cronometroRodando, setCronometroRodando] = useState(false);
  const [mostrarFesta, setMostrarFesta] = useState(false);

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

  const isEncarregado = usuarioLogado?.hierarquia === 'Encarregado' || usuarioLogado?.username === 'admin';
  const [pedidosBip, setPedidosBip] = useState({}); 
  const [codigoManual, setCodigoManual] = useState({}); 

  const [popupCustom, setPopupCustom] = useState({
    visivel: false, tipo: 'info', titulo: '', mensagem: '', onConfirm: null, onCancel: null
  });

  const ultimoBipTempo = useRef(0);
  const ultimoBipTexto = useRef("");

  const todosBipados = itens.length > 0 && itens.every(item => (item.bipContagem || 0) >= Number(item.quantidade));

  const exibirPopup = (tipo, titulo, mensagem, onConfirm = null, onCancel = null) => {
    setPopupCustom({ visivel: true, tipo, titulo, mensagem, onConfirm, onCancel });
  };
  const fecharPopupCustom = () => setPopupCustom({ ...popupCustom, visivel: false });
  
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

  const pedidosBipAntigoRef = useRef({});

  useEffect(() => {
    setPedidosBip({});
    setCodigoManual({});
    pedidosBipAntigoRef.current = {};

    if (!usuarioLogado || isEncarregado) return;

    const fetchAuths = async () => {
      const { data, error } = await supabase.from('autorizacoes_bip')
        .select('*')
        .eq('requisicao_id', req.id)
        .eq('solicitante_nome', usuarioLogado.nome_completo);

      if (!error && data) {
        const mapNovo = {};
        
        data.forEach(d => {
          mapNovo[d.produto_codigo] = d.status;
          const statusAntigo = pedidosBipAntigoRef.current[d.produto_codigo];
          
          if (statusAntigo && statusAntigo !== d.status) {
            if (d.status === 'aprovado') {
              tocarBipSucesso();
              exibirPopup('sucesso', 'Bip Manual Liberado!', `O encarregado liberou a digitação manual para o produto:\n\n${d.produto_descricao}\n\nO teclado do sistema já foi destravado.`);
            } else if (d.status === 'recusado') {
              tocarBipErro();
              exibirPopup('erro', 'Liberação Recusada', `Atenção, o encarregado recusou a liberação de digitação manual para:\n\n${d.produto_descricao}`);
            }
          }
        });

        pedidosBipAntigoRef.current = mapNovo;
        setPedidosBip(mapNovo);
      }
    };

    fetchAuths();

    const intervaloAuth = setInterval(() => {
      fetchAuths();
    }, 5000);

    return () => clearInterval(intervaloAuth);
  }, [req.id, usuarioLogado, isEncarregado]);

  const solicitarBipManual = async (item) => {
    if (!usuarioLogado?.encarregado_responsavel) {
      exibirPopup('erro', 'Sem Encarregado', 'Você não tem um Encarregado vinculado ao seu perfil.\nPeça ao administrador para atualizar o seu perfil.');
      return;
    }
    setPedidosBip(prev => ({ ...prev, [item.cod]: 'pendente' }));
    await supabase.from('autorizacoes_bip').insert([{
      requisicao_id: req.id, produto_codigo: item.cod, produto_descricao: item.descricao,
      solicitante_nome: usuarioLogado.nome_completo, encarregado_destino: usuarioLogado.encarregado_responsavel,
      status: 'pendente', timestamp_criacao: Date.now()
    }]);
  };

  const dispararDesafioDeProdutividade = () => {
    const totalItensFisicos = itens.reduce((acc, item) => acc + Number(item.quantidade), 0);
    const chaveRecorde = `qtd_${totalItensFisicos}`;
    const recordeAtual = recordesGlobais ? recordesGlobais[chaveRecorde] : null;

    let msgDesafio = `Esta requisição possui ${totalItensFisicos} unidades físicas.\n\n`;
    if (recordeAtual) {
      const minRec = Math.floor(recordeAtual.tempoSegundos / 60);
      const segRec = recordeAtual.tempoSegundos % 60;
      msgDesafio += `🏆 O RECORDE ATUAL É DE:\n${minRec}m ${segRec}s\nEstabelecido por: ${recordeAtual.responsavel}\n\nO cronômetro começou. Valendo!`;
    } else {
      msgDesafio += `Seja o pioneiro! Estabeleça o primeiro recorde de tempo para esta quantidade. Valendo!`;
    }
    exibirPopup('info', '🔥 Desafio de Agilidade', msgDesafio);
  };

  useEffect(() => {
    let intervalo;
    if (req.status === 'Em Separação' && !req.metricasSeparacao) {
      const horaInicioBanco = req.historico?.inicio_separacao;
      if (horaInicioBanco) {
        setCronometroRodando(true);
        intervalo = setInterval(() => {
          const diferencaSegundos = Math.floor((Date.now() - Number(horaInicioBanco)) / 1000);
          setTempoDecorrido(diferencaSegundos);
        }, 1000);
      }
    } else {
      setCronometroRodando(false);
      if (req.metricasSeparacao) {
        setTempoDecorrido(req.metricasSeparacao.tempoTotalSegundos);
      }
    }
    return () => clearInterval(intervalo);
  }, [req.status, req.historico, req.metricasSeparacao]);

  const formatarTempo = (segundos) => {
    const h = Math.floor(segundos / 3600).toString().padStart(2, '0');
    const m = Math.floor((segundos % 3600) / 60).toString().padStart(2, '0');
    const s = (segundos % 60).toString().padStart(2, '0');
    return `${h}:${m}:${s}`;
  };

  useEffect(() => {
    let scanner = null;
    let isComponentMounted = true;

    if (itemCameraAtiva !== null) {
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
          exibirPopup('erro', 'Erro de Câmera', 'Não foi possível iniciar a câmera. Verifique as permissões do navegador.');
          setItemCameraAtiva(null);
        });
      }, 150);
    }
    
    return () => { 
      isComponentMounted = false;
      if (scanner) { scanner.stop().then(() => { scanner.clear(); }).catch(err => console.error("Erro ao parar a câmera:", err)); }
    };
  }, [itemCameraAtiva]); 

  const processarBipagem = (index, decodedText) => {
    if (!decodedText || !decodedText.trim()) return;
    const itensAtuais = itensRef.current; 
    const itemAtual = itensAtuais[index];
    
    const qtdBipada = itemAtual.bipContagem || 0;
    const refBipada = itemAtual.bipReferencia || null;
    const qtdDesejada = Number(itemAtual.quantidade);
    
    const itemConflitoIndex = itensAtuais.findIndex((it, i) => it.bipReferencia === decodedText && i !== index);
    
    if (itemConflitoIndex !== -1) {
      tocarBipErro();
      exibirPopup('erro', 'Trava de Segurança', `Este código de barras já pertence a outro item:\n\n👉 ${itensAtuais[itemConflitoIndex].descricao}\n\nVocê está tentando bipar no produto errado!`);
      return; 
    }
    if (qtdBipada >= qtdDesejada) {
      tocarBipErro();
      exibirPopup('aviso', 'Limite Atingido!', `Você já separou a quantidade total (${qtdDesejada} un) para este produto.`);
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
        ultimoBipTexto.current = ""; fecharPopupCustom();
      }, () => fecharPopupCustom()
    );
  };

  const salvarProgressoParcial = () => {
    exibirPopup('info', 'Progresso Salvo', 'As quantidades bipadas já estão gravadas na nuvem de forma segura.\n\nAtenção: O cronômetro CONTINUA CORRENDO. Você pode sair desta tela e voltar mais tarde para finalizar a separação.');
  };

  const finalizarSeparacaoValidada = async () => {
    if (todosBipados) {
      const respAtual = req.historico['Em Separação'] || 'Equipe Desconhecida';
      const metricasFinais = await aoFinalizarSeparacao(req.id, tempoDecorrido, respAtual);
      
      if (!metricasFinais) return; 

      setNovoStatus('Separado');
      
      const tempoSegundos = metricasFinais.tempoTotalSegundos || 1;
      const itensFisicos = metricasFinais.totalItensFisicos || 0;
      const upm = (itensFisicos / tempoSegundos) * 60;
      const upmFormatado = Number(upm.toFixed(1));
      const pontosGanhos = Math.round(itensFisicos * upmFormatado);

      let msgFinal = `Separação Concluída!\n\n`;
      msgFinal += `📦 Total Bipado: ${itensFisicos} un\n`;
      msgFinal += `⏱️ Tempo Gasto: ${formatarTempo(tempoSegundos)}\n`;
      msgFinal += `⚡ Velocidade Média: ${upmFormatado} UPM\n\n`;
      msgFinal += `🏆 PONTOS CONQUISTADOS: +${pontosGanhos} pts`;
      
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

  const confirmarAssumirTarefa = () => {
    if (!nomeAssumir.trim()) { exibirPopup('aviso', 'Atenção', 'Digite seu nome para assumir a separação!'); return; }
    if (aoAdicionarResponsavel) {
      aoAdicionarResponsavel(req.id, nomeAssumir);
      exibirPopup('sucesso', 'Tarefa Assumida!', `${nomeAssumir} foi adicionado(a) à equipe de separação desta requisição!`);
      setNomeAssumir(''); setModoAssumir(false);
    }
  };

  const confirmarMudanca = () => {
    if (!responsavel.trim()) { exibirPopup('aviso', 'Atenção', 'Por favor, insira seu nome para assumir a responsabilidade!'); return; }
    
    if (novoStatus === 'Em Separação' && req.status !== 'Em Separação') {
       dispararDesafioDeProdutividade();
    }

    if (novoStatus === 'Saída de produtos') {
      if (!todosBipados) { exibirPopup('erro', 'Trava de Segurança', 'Você não pode finalizar a saída sem bipar a quantidade exata de TODOS os produtos solicitados!'); return; }
      if (!numReqExterna.trim()) { exibirPopup('aviso', 'Atenção', 'Por favor, insira o Número da Requisição gerado pelo sistema da loja!'); return; }
      if (!req.metricasSeparacao) { exibirPopup('erro', 'Atenção', 'Você deve clicar no botão "Concluir Separação" na parte de baixo da tela para travar o seu tempo antes de passar para a próxima etapa!'); return; }
    }
    
    if (novoStatus === 'Faturamento' && !notaFiscal.trim()) { exibirPopup('aviso', 'Atenção', 'Por favor, insira o Número da Nota Fiscal de transferência!'); return; }

    const dadosExtras = {};
    if (novoStatus === 'Saída de produtos') dadosExtras.numeroRequisicaoExterna = numReqExterna;
    if (novoStatus === 'Faturamento') dadosExtras.notaFiscal = notaFiscal;
    
    aoMudarStatus(req.id, novoStatus, responsavel, dadosExtras);
    
    setResponsavel(''); setNumReqExterna(''); setNotaFiscal('');
    if (novoStatus !== 'Em Separação') {
       exibirPopup('sucesso', 'Status Atualizado', 'O status da requisição foi alterado com sucesso!');
    }
  };

  const alternarExpansao = (index) => {
    if (linhaExpandida === index) { setLinhaExpandida(null); setModoExpansao('resumo'); } 
    else { setLinhaExpandida(index); setModoExpansao('resumo'); setNovaQuantidade(itens[index].quantidade); setMotivoAlteracao(itens[index].observacao || ''); }
  };

  const salvarEdicao = (index) => {
    if (motivoAlteracao.trim().length < 10) { exibirPopup('aviso', 'Atenção', 'O motivo da alteração deve conter no mínimo 10 caracteres para justify a mudança.'); return; }
    const itensAtualizados = [...itens];
    itensAtualizados[index] = { ...itensAtualizados[index], quantidade: novaQuantidade, observacao: motivoAlteracao };
    aoAtualizarItens(req.id, itensAtualizados);
    setModoExpansao('resumo'); 
  };

  const getStatusClass = (status) => {
    switch (status) { 
      case 'Pendente': return 'status-pendente'; 
      case 'Em Separação': return 'status-separacao'; 
      case 'Separado': return 'status-separado';
      case 'Saída de produtos': return 'status-separado'; 
      case 'Faturamento': return 'status-faturado'; 
      case 'Transporte': return 'status-enviado'; 
      case 'Recebimento': return 'status-recebido'; 
      case 'Cancelada': return 'status-pendente'; 
      default: return 'status-pendente'; 
    }
  };

  const obsBrutas = req.historico?.observacoesGerais;
  let listaObservacoes = [];

  if (Array.isArray(obsBrutas)) {
    listaObservacoes = obsBrutas;
  } 
  else if (typeof obsBrutas === 'string' && obsBrutas.trim() !== '') {
    listaObservacoes = [{
      id_obs: 'legado',
      texto: obsBrutas,
      autor: 'Sistema (Nota Antiga)',
      data: req.data || 'Data anterior'
    }];
  }

  const handleAdicionarObservacaoLista = () => {
    if (!novaObs.trim()) { 
      exibirPopup('aviso', 'Atenção', 'Digite alguma instrução ou observação antes de adicionar.'); 
      return; 
    }
    const autorAtual = usuarioLogado?.nome_completo || usuarioLogado?.username || 'Usuário Não Identificado';
    
    aoAtualizarObservacoes(req.id, novaObs, autorAtual);
    setNovaObs('');
    exibirPopup('sucesso', 'Salvo', 'A observação foi registrada no histórico!');
  };

  // --- BLINDAGEN DUPLA: Identifica se é Reposição Interna pelo motivo OU se origem == destino ---
  const isReposicaoInterna = req.motivo === 'Reposição Interna' || req.origem === req.destino;

  return (
    <div className="detalhes-container">
      {mostrarFesta && <div className="festa-confete">🎉🏆🎉</div>} 

      <div className="detalhes-header">
        <h2>Detalhes da Requisição {req.id}</h2>
        <div className="botoes-header-container">
          <button className="btn-imprimir-romaneio" onClick={() => window.print()} title="Imprimir Lista de Separação">
            🖨️ Imprimir Romaneio
          </button>
          <button className="btn-voltar" onClick={aoVoltar}>← Voltar ao Painel</button>
        </div>
      </div>

      <div className="card-info">
        <div className="info-grid">
          <div className="info-item">
            <label>Solicitante</label>
            <span>{req.solicitante}</span>
          </div>
          <div className="info-item">
            <label>Data da Solicitação</label>
            <span>{req.data}</span>
          </div>
          <div className="info-item">
            <label>Loja Atendente (Saída)</label>
            <span>{req.origem || 'Não informada'}</span>
          </div>
          <div className="info-item">
            <label>Loja Destino (Para)</label>
            <span>{req.destino}</span>
          </div>
          <div className="info-item">
            <label>Status Atual</label>
            <div><span className={`status-badge ${getStatusClass(req.status)}`}>{req.status}</span></div>
          </div>
          
          {req.numeroRequisicaoExterna && (
            <div className="info-item">
              <label>Nº Req. Sistema</label>
              <span style={{ color: '#2980b9' }}>{req.numeroRequisicaoExterna}</span>
            </div>
          )}
          {req.notaFiscal && (
            <div className="info-item">
              <label>Nota Fiscal</label>
              <span style={{ color: '#e67e22' }}>{req.notaFiscal}</span>
            </div>
          )}

          <div className="info-item obs-geral-box">
            <label>📝 Histórico de Observações / Instruções</label>
            
            <div className="lista-observacoes-wrapper">
              {listaObservacoes.length > 0 ? (
                <ul className="lista-obs-ul">
                  {listaObservacoes.map((obs, i) => (
                    <li key={obs.id_obs || i} className="item-obs-li">
                      <div className="obs-meta">
                        <strong>{obs.autor}</strong> em {obs.data}
                      </div>
                      <div className="obs-conteudo">{obs.texto}</div>
                    </li>
                  ))}
                </ul>
              ) : (
                <div className="obs-readonly">
                  <span className="obs-vazia">Nenhuma instrução adicional registrada nesta requisição.</span>
                </div>
              )}
            </div>

            {(req.status === 'Pendente' || req.status === 'Em Separação') && (
              <div className="obs-add-mode">
                <textarea 
                  className="obs-textarea-nova" 
                  value={novaObs} 
                  onChange={e => setNovaObs(e.target.value)} 
                  placeholder="Escreva uma nova observação ou instrução para esta requisição..." 
                />
                <button className="btn-adicionar-obs-lista" onClick={handleAdicionarObservacaoLista}>
                  ➕ Adicionar Observação
                </button>
              </div>
            )}
          </div>
        </div>

        {req.status === 'Pendente' && (
          <div className="box-assumir-tarefa box-editar-req">
            <div className="assumir-info">
              <span><strong>Modo de Edição:</strong> Altere quantidades, adicione novos produtos, remova itens ou cancele a requisição. A requisição ficará oculta do painel durante a edição.</span>
              {req.historico?.['Última Edição'] && (
                <div style={{fontSize: '0.8rem', marginTop: '5px', color: '#8e44ad'}}>
                  Última edição: {req.historico['Última Edição']}
                </div>
              )}
            </div>
            
            {!modoEditarReq ? (
              <button className="btn-assumir btn-editar-roxo" onClick={() => setModoEditarReq(true)}>
                ✏️ Editar Requisição Completa
              </button>
            ) : (
              <div className="linha-assumir">
                <input 
                  type="text" 
                  placeholder="Digite seu nome para auditar..." 
                  value={nomeEditorEdicao} 
                  onChange={(e) => setNomeEditorEdicao(e.target.value)} 
                />
                <button className="btn-confirmar-assumir btn-roxo-escuro" onClick={() => {
                  if (!nomeEditorEdicao.trim()) { exibirPopup('aviso', 'Atenção', 'Digite seu nome obrigatoriamente para registrar a edição!'); return; }
                  aoIniciarEdicao(req.id, nomeEditorEdicao);
                }}>Prosseguir para Edição</button>
                <button className="btn-cancelar-assumir" onClick={() => { setModoEditarReq(false); setNomeEditorEdicao(''); }}>Cancelar</button>
              </div>
            )}
          </div>
        )}

        {req.status === 'Em Separação' && (
          <div className="box-assumir-tarefa">
            <div className="assumir-info">
              <span><strong>Separador(es) Atual(is):</strong> {req.historico['Em Separação'] || 'Não informado'}</span>
            </div>
            
            {!modoAssumir ? (
              <button className="btn-assumir" onClick={() => setModoAssumir(true)}>
                🙋 Assumir / Ajudar na Separação
              </button>
            ) : (
              <div className="linha-assumir">
                <input 
                  type="text" 
                  placeholder="Digite o seu nome..." 
                  value={nomeAssumir} 
                  onChange={(e) => setNomeAssumir(e.target.value)} 
                />
                <button className="btn-confirmar-assumir" onClick={confirmarAssumirTarefa}>Confirmar</button>
                <button className="btn-cancelar-assumir" onClick={() => { setModoAssumir(false); setNomeAssumir(''); }}>Cancelar</button>
              </div>
            )}
          </div>
        )}

        <div className="controle-status controle-status-container">
          <strong>Atualizar Status:</strong>
          
          <select className="select-status" value={novoStatus} onChange={(e) => setNovoStatus(e.target.value)}>
            <option value="Pendente">Pendente</option>
            <option value="Em Separação">Em Separação</option>
            <option value="Separado">Separado</option>
            
            {/* BLINDAGEN DUPLA: Oculta etapas se for Reposição Interna OU se origem == destino */}
            {!isReposicaoInterna && (
              <>
                <option value="Saída de produtos">Saída de produtos</option>
                <option value="Faturamento">Faturamento</option>
                <option value="Transporte">Transporte</option>
              </>
            )}
            
            <option value="Recebimento">Recebimento</option>
          </select>
          
          <input type="text" placeholder="Nome do Responsável" className="input-responsavel" value={responsavel} onChange={(e) => setResponsavel(e.target.value)} />

          {novoStatus === 'Saída de produtos' && (
            <input type="text" placeholder="Nº da Req. no Sistema" className="input-req-externa" value={numReqExterna} onChange={(e) => setNumReqExterna(e.target.value)} />
          )}

          {novoStatus === 'Faturamento' && (
            <input type="text" placeholder="Nº da Nota Fiscal" className="input-nota-fiscal" value={notaFiscal} onChange={(e) => setNotaFiscal(e.target.value)} />
          )}
          
          <button className="btn-confirmar-status" onClick={confirmarMudanca}>
            Confirmar Status
          </button>
        </div>
      </div>

      <div className="card-info" style={{ position: 'relative' }}>
        
        {(req.status === 'Em Separação' || req.metricasSeparacao) && (
          <div className="painel-cronometro">
            <div className="cronometro-titulo">
              {req.metricasSeparacao ? '⏱️ TEMPO FINAL DA SEPARAÇÃO' : '⏱️ TEMPO EM ANDAMENTO'}
            </div>
            <div className={`cronometro-relogio ${req.metricasSeparacao ? 'tempo-travado' : ''}`}>
              {formatarTempo(tempoDecorrido)}
            </div>
            {req.metricasSeparacao && (() => {
              const tempoSeg = req.metricasSeparacao.tempoTotalSegundos || 1;
              const itensFisicos = req.metricasSeparacao.totalItensFisicos || 0;
              const upm = (itensFisicos / tempoSeg) * 60;
              const upmFormat = Number(upm.toFixed(1));
              const pts = Math.round(itensFisicos * upmFormat);

              return (
                <div className="cronometro-eficiencia" style={{ color: '#27ae60' }}>
                  ⚡ {upmFormat} UPM | 🏆 +{pts} pts
                  {req.metricasSeparacao.bateuRecorde && ' (RECORDE)'}
                </div>
              );
            })()}
          </div>
        )}

        <h3 className="titulo-lista-produtos">Lista de Produtos ({req.itens} itens)</h3>
        <p className="subtitulo-lista-produtos">Clique na linha do produto para expandir as opções de leitura e edição.</p>
        
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
                const contagemBipada = item.bipContagem || 0;
                const completo = contagemBipada >= Number(item.quantidade);
                const estaExpandido = linhaExpandida === index;

                const statusBip = isEncarregado ? 'aprovado' : pedidosBip[item.cod];

                return (
                  <React.Fragment key={index}>
                    <tr className={`tr-clicavel ${estaExpandido ? 'linha-expandida-ativa' : ''} ${completo ? 'linha-item-completo' : 'linha-item-normal'}`} onClick={() => alternarExpansao(index)}>
                      <td className="td-tabela-itens"><strong>{item.cod}</strong></td>
                      <td className="td-tabela-itens">{item.descricao}</td>
                      <td className={`td-tabela-itens td-tabela-itens-centro ${completo ? 'texto-verde-sucesso' : ''}`}>{item.quantidade} un</td>
                    </tr>
                    
                    {estaExpandido && (
                      <tr className="linha-expandida">
                        <td colSpan="3">
                          <div className="detalhes-produto-expandido">
                            
                            {modoExpansao === 'resumo' && (
                              <div className="info-bipagem-resumo">
                                <span className={`qtd-destaque ${completo ? 'qtd-destaque-completo' : 'qtd-destaque-pendente'}`}>
                                  Separado: {contagemBipada} / {item.quantidade} un
                                </span>
                                
                                {item.observacao && (
                                  <span className="texto-observacao">Obs: {item.observacao}</span>
                                )}
                                
                                {req.status === 'Em Separação' && !req.metricasSeparacao && !completo && (
                                  <div className="acoes-linha-expandida">
                                    <button className="btn-acao-expandida btn-acao-camera" onClick={() => setItemCameraAtiva(index)}>
                                      📷 Bipar Código
                                    </button>
                                    
                                    {statusBip === 'aprovado' ? (
                                      <div className="container-bip-manual">
                                        <input 
                                          type="text" 
                                          className="input-bip-manual" 
                                          placeholder="Digite o cód. barras..."
                                          value={codigoManual[item.cod] || ''}
                                          onChange={(e) => setCodigoManual({...codigoManual, [item.cod]: e.target.value})}
                                        />
                                        <button className="btn-confirmar-bip-manual" onClick={() => {
                                          processarBipagem(index, codigoManual[item.cod]);
                                          setCodigoManual({...codigoManual, [item.cod]: ''});
                                        }}>Validar</button>
                                      </div>
                                    ) : statusBip === 'pendente' ? (
                                      <span className="badge-status-bip pendente">⏳ Aguardando Encarregado...</span>
                                    ) : statusBip === 'recusado' ? (
                                      <>
                                        <span className="badge-status-bip recusado">❌ Recusado</span>
                                        <button className="btn-acao-expandida btn-acao-chave" onClick={() => solicitarBipManual(item)}>🔑 Solicitar Novamente</button>
                                      </>
                                    ) : (
                                      <button className="btn-acao-expandida btn-acao-chave" onClick={() => solicitarBipManual(item)}>
                                        🔑 Digitação Manual
                                      </button>
                                    )}

                                    <button className="btn-acao-expandida btn-acao-editar" onClick={() => setModoExpansao('edicao')}>
                                      ✏️ Editar Qtd
                                    </button>
                                  </div>
                                )}
                                
                                {req.status === 'Em Separação' && !req.metricasSeparacao && contagemBipada > 0 && (
                                  <button className="btn-resetar-bip btn-resetar-margin" onClick={() => resetarBipagem(index)}>
                                    Zerar Leitura Deste Item
                                  </button>
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
      </div>

      {req.status === 'Em Separação' && !req.metricasSeparacao && (
        todosBipados ? (
          <button className="btn-salvar-progresso" onClick={finalizarSeparacaoValidada}>
            ✅ Concluir Separação
          </button>
        ) : (
          <button className="btn-salvar-progresso" onClick={salvarProgressoParcial} style={{ backgroundColor: '#f39c12' }}>
            💾 Salvar Progresso Físico
          </button>
        )
      )}

      {itemCameraAtiva !== null && (() => {
        const itemAtivo = itens[itemCameraAtiva];
        const contagemBipada = itemAtivo?.bipContagem || 0;
        const porcentagemAtiva = itemAtivo ? Math.min((contagemBipada / Number(itemAtivo.quantidade)) * 100, 100) : 0;

        return (
          <div className="camera-modal-overlay">
            <div className="camera-modal-content">
              <div className="camera-modal-header">Lendo: {itemAtivo?.cod} - {itemAtivo?.descricao}</div>
              <div className="camera-modal-body">
                <div id="leitor-camera-modal" className="camera-box-modal"></div>
                <div className="info-bipagem">
                  <div className="progresso-texto">Bipados: {contagemBipada} de {itemAtivo?.quantidade}</div>
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

      {popupCustom.visivel && (
        <div className="popup-custom-overlay">
          <div className={`popup-custom-content ${popupCustom.tipo}`}>
            <div className="popup-custom-header">
              {popupCustom.tipo === 'sucesso' && '✅ '} 
              {popupCustom.tipo === 'erro' && '🚨 '} 
              {popupCustom.tipo === 'info' && '🔥 '} 
              {popupCustom.tipo === 'aviso' && '⚠️ '}
              {popupCustom.titulo}
            </div>
            <div className="popup-custom-body">
              {popupCustom.mensagem.split('\n').map((linha, i) => (<p key={i}>{linha}</p>))}
            </div>
            <div className="popup-custom-footer">
              {popupCustom.onCancel && (
                <button className="btn-popup btn-popup-cancelar" onClick={popupCustom.onCancel}>Cancelar</button>
              )}
              <button className="btn-popup btn-popup-confirmar" onClick={() => { if (popupCustom.onConfirm) popupCustom.onConfirm(); else fecharPopupCustom(); }}>
                Confirmar
              </button>
            </div>
          </div>
        </div>
      )}

      <Romaneio req={req} baseProdutos={baseProdutos} />
    </div>
  );
}