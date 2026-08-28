import React, { useState, useEffect, useRef } from 'react';
import { Html5Qrcode, Html5QrcodeSupportedFormats } from 'html5-qrcode';
import { supabase } from '../../../services/supabase';
import '../../../styles/pages/painel/detalhes/separacaoReq.css';

export default function SeparacaoReq({ req, usuarioLogado, aoAtualizarItens, aoFinalizarSeparacao, tempoDecorrido, exibirPopup, setNovoStatus }) {
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

  const isEncarregado = usuarioLogado?.hierarquia === 'Encarregado' || usuarioLogado?.username === 'admin';
  const [pedidosBip, setPedidosBip] = useState({}); 
  const [codigoManual, setCodigoManual] = useState({}); 

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
      const { data, error } = await supabase.from('autorizacoes_bip').select('*').eq('requisicao_id', req.id).eq('solicitante_nome', usuarioLogado.nome_completo);
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
    const intervaloAuth = setInterval(fetchAuths, 5000);
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
        ultimoBipTexto.current = ""; fecharPopupCustom();
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

      setNovoStatus('Separado');
      
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

  return (
    <>
      {mostrarFesta && <div className="festa-confete">🎉🏆🎉</div>}
      
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
              const meta = item.quantidadeEditada !== undefined ? Number(item.quantidadeEditada) : Number(item.quantidade);
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