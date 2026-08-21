import React, { useState, useEffect, useRef } from 'react';
import { Html5Qrcode, Html5QrcodeSupportedFormats } from 'html5-qrcode';
import '../../../styles/pages/painel/detalhes/detalhes.css';

export default function DetalhesRequisicao({ req, aoVoltar, aoMudarStatus, aoAtualizarItens, aoAdicionarResponsavel, aoFinalizarSeparacao, recordesGlobais }) {
  if (!req) return null;

  const [novoStatus, setNovoStatus] = useState(req.status);
  const [responsavel, setResponsavel] = useState('');
  const [numReqExterna, setNumReqExterna] = useState('');
  const [notaFiscal, setNotaFiscal] = useState('');

  const [nomeAssumir, setNomeAssumir] = useState('');
  const [modoAssumir, setModoAssumir] = useState(false);

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

  const [popupCustom, setPopupCustom] = useState({
    visivel: false, tipo: 'info', titulo: '', mensagem: '', onConfirm: null, onCancel: null
  });

  const ultimoBipTempo = useRef(0);
  const ultimoBipTexto = useRef("");

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
    const m = Math.floor(segundos / 60).toString().padStart(2, '0');
    const s = (segundos % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  useEffect(() => {
    let scanner = null;
    let isComponentMounted = true;

    if (itemCameraAtiva !== null) {
      setTimeout(() => {
        if (!isComponentMounted) return;

        scanner = new Html5Qrcode('leitor-camera-modal', {
          formatsToSupport: [
            Html5QrcodeSupportedFormats.EAN_13,
            Html5QrcodeSupportedFormats.EAN_8,
            Html5QrcodeSupportedFormats.CODE_128,
            Html5QrcodeSupportedFormats.UPC_A,
            Html5QrcodeSupportedFormats.CODE_39
          ]
        });

        const configCamera = { 
          fps: 10, 
          qrbox: { width: 250, height: 100 }
        };

        scanner.start(
          { facingMode: "environment" }, 
          configCamera,
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
      if (scanner) {
        scanner.stop().then(() => {
          scanner.clear();
        }).catch(err => console.error("Erro ao parar a câmera:", err)); 
      }
    };
  }, [itemCameraAtiva]); 

  const processarBipagem = (index, decodedText) => {
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

  // CORREÇÃO: Função transformada em assíncrona (async/await) para aguardar o Supabase
  const finalizarSeparacaoValidada = async () => {
    const todosBipados = itens.every(item => (item.bipContagem || 0) >= Number(item.quantidade));

    if (todosBipados) {
      const respAtual = req.historico['Em Separação'] || 'Equipe Desconhecida';
      
      // AWAIT ADICIONADO AQUI: O código agora espera o banco devolver os números
      const metricasFinais = await aoFinalizarSeparacao(req.id, tempoDecorrido, respAtual);
      
      if (!metricasFinais) return; 
      
      let msgFinal = `Separação Concluída!\n\nTempo Total: ${formatarTempo(metricasFinais.tempoTotalSegundos)}\nNível de Eficiência: ${metricasFinais.eficienciaPercentual > 0 ? '+' : ''}${metricasFinais.eficienciaPercentual}%`;
      
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
      const todosBipados = itens.every(item => (item.bipContagem || 0) >= Number(item.quantidade));
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
      case 'Saída de produtos': return 'status-separado'; 
      case 'Faturamento': return 'status-faturado'; 
      case 'Transporte': return 'status-enviado'; 
      case 'Recebimento': return 'status-recebido'; 
      default: return 'status-pendente'; 
    }
  };

  return (
    <div className="detalhes-container">
      {mostrarFesta && <div className="festa-confete">🎉🏆🎉</div>} 

      <div className="detalhes-header">
        <h2>Detalhes da Requisição {req.id}</h2>
        <button className="btn-voltar" onClick={aoVoltar}>← Voltar ao Painel</button>
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
        </div>

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

        <div className="controle-status" style={{ display: 'flex', gap: '15px', alignItems: 'center', flexWrap: 'wrap' }}>
          <strong>Atualizar Status:</strong>
          
          <select className="select-status" value={novoStatus} onChange={(e) => setNovoStatus(e.target.value)}>
            <option value="Pendente">Pendente</option>
            <option value="Em Separação">Em Separação</option>
            <option value="Saída de produtos">Saída de produtos</option>
            <option value="Faturamento">Faturamento</option>
            <option value="Transporte">Transporte</option>
            <option value="Recebimento">Recebimento</option>
          </select>
          
          <input 
            type="text" 
            placeholder="Nome do Responsável" 
            style={{ padding: '10px', borderRadius: '6px', border: '1px solid #ccc', flex: '1', minWidth: '150px' }} 
            value={responsavel} 
            onChange={(e) => setResponsavel(e.target.value)} 
          />

          {novoStatus === 'Saída de produtos' && (
            <input 
              type="text" 
              placeholder="Nº da Req. no Sistema" 
              style={{ padding: '10px', borderRadius: '6px', border: '2px solid #3498db', flex: '1', minWidth: '180px' }} 
              value={numReqExterna} 
              onChange={(e) => setNumReqExterna(e.target.value)} 
            />
          )}

          {novoStatus === 'Faturamento' && (
            <input 
              type="text" 
              placeholder="Nº da Nota Fiscal" 
              style={{ padding: '10px', borderRadius: '6px', border: '2px solid #e67e22', flex: '1', minWidth: '180px' }} 
              value={notaFiscal} 
              onChange={(e) => setNotaFiscal(e.target.value)} 
            />
          )}
          
          <button style={{ padding: '10px 20px', backgroundColor: '#27ae60', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' }} onClick={confirmarMudanca}>
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
            {req.metricasSeparacao && (
              <div className="cronometro-eficiencia" style={{ color: req.metricasSeparacao.eficienciaPercentual >= 0 ? '#27ae60' : '#e74c3c' }}>
                Eficiência: {req.metricasSeparacao.eficienciaPercentual > 0 ? '+' : ''}{req.metricasSeparacao.eficienciaPercentual}% 
                {req.metricasSeparacao.bateuRecorde && ' 🏆 (RECORDE)'}
              </div>
            )}
          </div>
        )}

        <h3 style={{ marginTop: '20px' }}>Lista de Produtos ({req.itens} itens)</h3>
        <p style={{ fontSize: '0.9rem', color: '#7f8c8d', marginBottom: '15px' }}>
          Clique na linha do produto para expandir as opções de leitura e edição.
        </p>
        
        <div className="tabela-wrapper">
          <table className="tabela-itens">
            <thead>
              <tr style={{ borderBottom: '2px solid #eee' }}>
                <th style={{ padding: '10px' }}>Código</th>
                <th style={{ padding: '10px' }}>Descrição</th>
                <th style={{ padding: '10px', textAlign: 'center' }}>Quantidade</th>
              </tr>
            </thead>
            <tbody>
              {itens.map((item, index) => {
                const contagemBipada = item.bipContagem || 0;
                const completo = contagemBipada >= Number(item.quantidade);
                const estaExpandido = linhaExpandida === index;

                return (
                  <React.Fragment key={index}>
                    <tr className="tr-clicavel" onClick={() => alternarExpansao(index)} style={{ borderBottom: estaExpandido ? 'none' : '1px solid #eee', backgroundColor: completo ? '#e8f8f5' : 'transparent', fontWeight: completo ? 'bold' : 'normal' }}>
                      <td style={{ padding: '15px 10px' }}><strong>{item.cod}</strong></td>
                      <td style={{ padding: '15px 10px' }}>{item.descricao}</td>
                      <td style={{ padding: '15px 10px', textAlign: 'center', color: completo ? '#27ae60' : 'inherit' }}>{item.quantidade} un</td>
                    </tr>
                    
                    {estaExpandido && (
                      <tr className="linha-expandida">
                        <td colSpan="3">
                          <div className="detalhes-produto-expandido">
                            
                            {modoExpansao === 'resumo' && (
                              <div className="info-bipagem-resumo">
                                <span className="qtd-destaque" style={{ color: completo ? '#27ae60' : '#333' }}>
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
                                    <button className="btn-acao-expandida btn-acao-editar" onClick={() => setModoExpansao('edicao')}>
                                      ✏️ Editar Qtd
                                    </button>
                                  </div>
                                )}
                                
                                {req.status === 'Em Separação' && !req.metricasSeparacao && contagemBipada > 0 && (
                                  <button className="btn-resetar-bip" onClick={() => resetarBipagem(index)} style={{ marginTop: '10px' }}>
                                    Zerar Leitura Deste Item
                                  </button>
                                )}
                              </div>
                            )}

                            {modoExpansao === 'edicao' && (
                              <div className="edicao-container">
                                <p style={{ fontWeight: 'bold', marginBottom: '5px' }}>Ajuste de Quantidade Física</p>
                                <div className="edicao-linha">
                                  <input 
                                    type="number" 
                                    className="input-qtd-edit" 
                                    value={novaQuantidade} 
                                    onChange={(e) => setNovaQuantidade(e.target.value)} 
                                  />
                                  <input 
                                    type="text" 
                                    className="input-obs-edit" 
                                    placeholder="Motivo da alteração..." 
                                    value={motivoAlteracao} 
                                    onChange={(e) => setMotivoAlteracao(e.target.value)} 
                                  />
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
        <button className="btn-salvar-progresso" onClick={finalizarSeparacaoValidada}>
          ✅ Concluir Separação
        </button>
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

    </div>
  );
}