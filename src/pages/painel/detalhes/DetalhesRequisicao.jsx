import React, { useState, useEffect, useRef } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import '../../../styles/pages/painel/detalhes/detalhes.css';

export default function DetalhesRequisicao({ req, aoVoltar, aoMudarStatus, aoAtualizarItens }) {
  if (!req) return null;

  const [novoStatus, setNovoStatus] = useState(req.status);
  const [responsavel, setResponsavel] = useState('');
  const [numReqExterna, setNumReqExterna] = useState('');
  const [notaFiscal, setNotaFiscal] = useState('');

  const [itens, setItens] = useState(req.listaItens || []);
  const [editandoIndex, setEditandoIndex] = useState(null);
  const [novaQuantidade, setNovaQuantidade] = useState('');
  const [motivoAlteracao, setMotivoAlteracao] = useState('');

  // ESTADOS DO LEITOR DE CÓDIGO DE BARRAS
  const [linhaExpandida, setLinhaExpandida] = useState(null);
  const [bips, setBips] = useState({}); // Ex: { 0: { contagem: 2, referencia: '78910' } }
  
  // Controle de tempo para o leitor não dar bips repetidos no mesmo milissegundo
  const ultimoBipTempo = useRef(0);
  const ultimoBipTexto = useRef("");

  // FUNÇÕES DE ÁUDIO NATIVO (Beep)
  const tocarBipSucesso = () => {
    try {
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      const osc = ctx.createOscillator();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(800, ctx.currentTime);
      osc.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.1); 
    } catch(e) {}
  };

  const tocarBipErro = () => {
    try {
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      const osc = ctx.createOscillator();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(150, ctx.currentTime); // Som grave
      osc.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.5); 
    } catch(e) {}
  };

  // INICIALIZAÇÃO DA CÂMERA
  useEffect(() => {
    let scanner = null;

    if (linhaExpandida !== null) {
      scanner = new Html5Qrcode(`leitor-camera-${linhaExpandida}`);
      
      scanner.start(
        { facingMode: "environment" }, // Usa a câmera traseira do celular
        { fps: 5, qrbox: { width: 250, height: 100 } },
        (decodedText) => {
          const agora = Date.now();
          // Debounce: Impede ler o mesmo código seguidamente em menos de 1.5s
          if (decodedText === ultimoBipTexto.current && (agora - ultimoBipTempo.current < 1500)) {
            return;
          }
          ultimoBipTexto.current = decodedText;
          ultimoBipTempo.current = agora;

          processarBipagem(linhaExpandida, decodedText);
        },
        (err) => { /* ignora os erros frame a frame se não achar código */ }
      ).catch(err => {
        console.error("Erro na câmera", err);
        alert("Não foi possível acessar a câmera do dispositivo.");
      });
    }

    return () => {
      if (scanner && scanner.isScanning) {
        scanner.stop().catch(console.error);
      }
    };
  }, [linhaExpandida]);

  // PROCESSA A REGRA DE NEGÓCIO DA SEPARAÇÃO
  const processarBipagem = (index, decodedText) => {
    const qtdDesejada = Number(itens[index].quantidade);

    setBips((prevBips) => {
      const atual = prevBips[index] || { contagem: 0, referencia: null };

      // Se já bateu a cota, não faz nada
      if (atual.contagem >= qtdDesejada) {
        return prevBips;
      }

      // Primeiro Bip (Seta a Referência)
      if (atual.contagem === 0) {
        tocarBipSucesso();
        return { ...prevBips, [index]: { contagem: 1, referencia: decodedText } };
      } 
      // Bips Subsequentes
      else {
        if (atual.referencia === decodedText) {
          tocarBipSucesso();
          return { ...prevBips, [index]: { ...atual, contagem: atual.contagem + 1 } };
        } else {
          tocarBipErro();
          alert(`PRODUTO INCORRETO!\nVocê escaneou o código: ${decodedText}\nMas o código de referência deste lote é: ${atual.referencia}`);
          return prevBips;
        }
      }
    });
  };

  const getStatusClass = (status) => {
    switch (status) {
      case 'Pendente': return 'status-pendente';
      case 'Em Separação': return 'status-separacao';
      case 'Separado': return 'status-separado';
      case 'Faturado': return 'status-faturado';
      case 'Enviado': return 'status-enviado';
      case 'Recebido': return 'status-recebido';
      default: return 'status-pendente';
    }
  };

  const confirmarMudanca = () => {
    if (!responsavel.trim()) {
      alert("Por favor, insira seu nome para assumir a responsabilidade!");
      return;
    }
    
    // TRAVA DE SEGURANÇA: Exige bipagem total para Separar
    if (novoStatus === 'Separado') {
      const todosBipados = itens.every((item, i) => {
        const bipItem = bips[i] || { contagem: 0 };
        return bipItem.contagem >= Number(item.quantidade);
      });

      if (!todosBipados) {
        alert("TRAVA DE SEGURANÇA:\nVocê não pode finalizar a separação sem bipar a quantidade exata de TODOS os produtos solicitados!");
        return;
      }

      if (!numReqExterna.trim()) {
        alert("Por favor, insira o Número da Requisição gerado pelo sistema da loja!");
        return;
      }
    }
    
    if (novoStatus === 'Faturado' && !notaFiscal.trim()) {
      alert("Por favor, insira o Número da Nota Fiscal de transferência!");
      return;
    }

    const dadosExtras = {};
    if (novoStatus === 'Separado') dadosExtras.numeroRequisicaoExterna = numReqExterna;
    if (novoStatus === 'Faturado') dadosExtras.notaFiscal = notaFiscal;
    
    dadosExtras.listaItensAtualizada = itens; 

    aoMudarStatus(req.id, novoStatus, responsavel, dadosExtras);
    
    setResponsavel('');
    setNumReqExterna('');
    setNotaFiscal('');
  };

  const iniciarEdicao = (index, qtdAtual, obsAtual) => {
    // Se for editar manualmente, fecha a câmera
    if (linhaExpandida === index) setLinhaExpandida(null); 
    setEditandoIndex(index);
    setNovaQuantidade(qtdAtual);
    setMotivoAlteracao(obsAtual || '');
  };

  const cancelarEdicao = () => {
    setEditandoIndex(null);
    setNovaQuantidade('');
    setMotivoAlteracao('');
  };

  const salvarEdicao = (index) => {
    if (motivoAlteracao.trim().length < 10) {
      alert('Atenção: O motivo da alteração deve conter no mínimo 10 caracteres para justificar a mudança.');
      return;
    }

    const itensAtualizados = [...itens];
    itensAtualizados[index] = {
      ...itensAtualizados[index],
      quantidade: novaQuantidade,
      observacao: motivoAlteracao
    };

    setItens(itensAtualizados); 
    if (aoAtualizarItens) {
      aoAtualizarItens(req.id, itensAtualizados);
    }
    cancelarEdicao();
  };

  const alternarCamera = (index) => {
    if (linhaExpandida === index) {
      setLinhaExpandida(null);
    } else {
      setLinhaExpandida(index);
    }
  };

  return (
    <div className="detalhes-container">
      <div className="detalhes-header">
        <h2>Detalhes da Requisição {req.id}</h2>
        <button className="btn-voltar" onClick={aoVoltar}>← Voltar ao Painel</button>
      </div>

      <div className="card-info">
        <div className="info-grid">
          <div className="info-item"><label>Solicitante</label><span>{req.solicitante}</span></div>
          <div className="info-item"><label>Data da Solicitação</label><span>{req.data}</span></div>
          <div className="info-item"><label>Loja Destino (Para)</label><span>{req.destino}</span></div>
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

        <div className="controle-status" style={{ display: 'flex', gap: '15px', alignItems: 'center', flexWrap: 'wrap' }}>
          <strong>Atualizar Status:</strong>
          <select className="select-status" value={novoStatus} onChange={(e) => setNovoStatus(e.target.value)}>
            <option value="Pendente">Pendente</option>
            <option value="Em Separação">Em Separação</option>
            <option value="Separado">Separado</option>
            <option value="Faturado">Faturado</option>
            <option value="Enviado">Enviado</option>
            <option value="Recebido">Recebido</option>
          </select>
          
          <input 
            type="text" 
            placeholder="Nome do Responsável" 
            style={{ padding: '10px', borderRadius: '6px', border: '1px solid #ccc', flex: '1', minWidth: '150px' }}
            value={responsavel}
            onChange={(e) => setResponsavel(e.target.value)}
          />

          {novoStatus === 'Separado' && (
            <input 
              type="text" 
              placeholder="Nº da Req. no Sistema" 
              style={{ padding: '10px', borderRadius: '6px', border: '2px solid #3498db', flex: '1', minWidth: '180px' }}
              value={numReqExterna}
              onChange={(e) => setNumReqExterna(e.target.value)}
            />
          )}

          {novoStatus === 'Faturado' && (
            <input 
              type="text" 
              placeholder="Nº da Nota Fiscal" 
              style={{ padding: '10px', borderRadius: '6px', border: '2px solid #e67e22', flex: '1', minWidth: '180px' }}
              value={notaFiscal}
              onChange={(e) => setNotaFiscal(e.target.value)}
            />
          )}
          
          <button 
            style={{ padding: '10px 20px', backgroundColor: '#27ae60', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' }}
            onClick={confirmarMudanca}
          >
            Confirmar
          </button>
        </div>
      </div>

      <div className="card-info">
        <h3>Lista de Produtos ({req.itens} itens)</h3>
        <table className="tabela-itens" style={{ marginTop: '15px', width: '100%', textAlign: 'left', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ borderBottom: '2px solid #eee' }}>
              <th style={{ padding: '10px' }}>Código</th>
              <th style={{ padding: '10px' }}>Descrição</th>
              <th style={{ padding: '10px', textAlign: 'center' }}>Qtd. Solicitada / Separada</th>
            </tr>
          </thead>
          <tbody>
            {itens.map((item, index) => {
              const infoBip = bips[index] || { contagem: 0, referencia: null };
              const porcentagem = Math.min((infoBip.contagem / Number(item.quantidade)) * 100, 100);
              const completo = infoBip.contagem >= Number(item.quantidade);

              return (
                <React.Fragment key={index}>
                  <tr style={{ borderBottom: '1px solid #eee', backgroundColor: completo ? '#e8f8f5' : 'transparent' }}>
                    <td style={{ padding: '10px' }}><strong>{item.cod}</strong></td>
                    <td style={{ padding: '10px' }}>{item.descricao}</td>
                    <td style={{ padding: '10px', textAlign: 'center' }}>
                      {editandoIndex === index ? (
                        <div className="edicao-container">
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
                            <button className="btn-acao-edit" onClick={cancelarEdicao} title="Cancelar">❌</button>
                          </div>
                        </div>
                      ) : (
                        <div>
                          <div className="quantidade-container">
                            <span style={{ 
                              color: completo ? '#27ae60' : 'inherit', 
                              fontWeight: completo ? 'bold' : 'normal' 
                            }}>
                              {infoBip.contagem} / {item.quantidade} un
                            </span>
                            
                            {req.status === 'Em Separação' && (
                              <>
                                {/* Botão do Câmera (Bipagem) */}
                                {!completo && (
                                  <button 
                                    className="btn-camera" 
                                    onClick={() => alternarCamera(index)}
                                    title="Escanear Código de Barras"
                                  >
                                    📷
                                  </button>
                                )}

                                {/* Botão de Edição Manual (Lápis) */}
                                <button 
                                  className="btn-editar-item" 
                                  onClick={() => iniciarEdicao(index, item.quantidade, item.observacao)}
                                  title="Falta de produto (Ajustar qtd)"
                                >
                                  ✏️
                                </button>
                              </>
                            )}
                          </div>

                          {item.observacao && (
                            <span className="texto-observacao">
                              Obs: {item.observacao}
                            </span>
                          )}
                        </div>
                      )}
                    </td>
                  </tr>

                  {/* BLOCO EXPANSÍVEL DA CÂMERA */}
                  {linhaExpandida === index && (
                    <tr className="linha-expandida">
                      <td colSpan="3">
                        <div className="leitor-container">
                          <div id={`leitor-camera-${index}`} className="camera-box"></div>
                          
                          <div className="info-bipagem">
                            <div className="progresso-texto">
                              Bipados: {infoBip.contagem} de {item.quantidade}
                            </div>
                            
                            <div className="barra-progresso-bg">
                              <div className="barra-progresso-fill" style={{ width: `${porcentagem}%` }}></div>
                            </div>
                            
                            {infoBip.referencia && (
                              <span className="codigo-referencia">
                                Cód. Referência Lote: <strong>{infoBip.referencia}</strong>
                              </span>
                            )}

                            <button className="btn-fechar-camera" onClick={() => setLinhaExpandida(null)}>
                              Ocultar Câmera
                            </button>
                          </div>
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
  );
}