import React, { useState, useEffect, useRef } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import '../../../styles/pages/painel/detalhes/detalhes.css';

export default function DetalhesRequisicao({ req, aoVoltar, aoMudarStatus, aoAtualizarItens }) {
  if (!req) return null;

  const [novoStatus, setNovoStatus] = useState(req.status);
  const [responsavel, setResponsavel] = useState('');
  const [numReqExterna, setNumReqExterna] = useState('');
  const [notaFiscal, setNotaFiscal] = useState('');

  // INICIALIZA OS ITENS E OS BIPS BUSCANDO DA MEMÓRIA LOCAL (Simulando Banco de Dados)
  const [itens, setItens] = useState(() => {
    const itensSalvos = localStorage.getItem(`itens_req_${req.id}`);
    return itensSalvos ? JSON.parse(itensSalvos) : (req.listaItens || []);
  });
  
  const [bips, setBips] = useState(() => {
    const bipsSalvos = localStorage.getItem(`bips_req_${req.id}`);
    return bipsSalvos ? JSON.parse(bipsSalvos) : {};
  }); 

  // ESTADOS DE INTERAÇÃO DA LINHA
  const [linhaExpandida, setLinhaExpandida] = useState(null);
  const [modoExpansao, setModoExpansao] = useState('resumo'); // Pode ser: 'resumo', 'camera', 'edicao'
  
  // ESTADOS DE EDIÇÃO MANUAL
  const [novaQuantidade, setNovaQuantidade] = useState('');
  const [motivoAlteracao, setMotivoAlteracao] = useState('');

  // REFERÊNCIAS
  const ultimoBipTempo = useRef(0);
  const ultimoBipTexto = useRef("");
  const cameraRef = useRef(null); // Ref para fazer o scroll automático

  // EFEITO PARA CENTRALIZAR A CÂMERA AUTOMATICAMENTE
  useEffect(() => {
    if (modoExpansao === 'camera' && cameraRef.current) {
      // Pequeno atraso para dar tempo da câmera abrir e ocupar espaço na tela
      setTimeout(() => {
        cameraRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }, 300);
    }
  }, [modoExpansao]);

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
      osc.frequency.setValueAtTime(150, ctx.currentTime); 
      osc.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.5); 
    } catch(e) {}
  };

  // INICIALIZAÇÃO DA CÂMERA
  useEffect(() => {
    let scanner = null;

    if (linhaExpandida !== null && modoExpansao === 'camera') {
      scanner = new Html5Qrcode(`leitor-camera-${linhaExpandida}`);
      
      scanner.start(
        { facingMode: "environment" }, 
        { fps: 5, qrbox: { width: 250, height: 100 } },
        (decodedText) => {
          const agora = Date.now();
          if (decodedText === ultimoBipTexto.current && (agora - ultimoBipTempo.current < 1500)) {
            return;
          }
          ultimoBipTexto.current = decodedText;
          ultimoBipTempo.current = agora;

          processarBipagem(linhaExpandida, decodedText);
        },
        (err) => { /* Ignora erros de frame vazio */ }
      ).catch(err => {
        console.error("Erro na câmera", err);
        alert("Não foi possível acessar a câmera do dispositivo.");
        setModoExpansao('resumo'); 
      });
    }

    return () => {
      if (scanner && scanner.isScanning) {
        scanner.stop().catch(console.error);
      }
    };
  }, [linhaExpandida, modoExpansao]);

  // PROCESSA A REGRA DE NEGÓCIO DA SEPARAÇÃO
  const processarBipagem = (index, decodedText) => {
    const qtdDesejada = Number(itens[index].quantidade);

    setBips((prevBips) => {
      const atual = prevBips[index] || { contagem: 0, referencia: null };

      if (atual.contagem >= qtdDesejada) return prevBips;

      if (atual.contagem === 0) {
        tocarBipSucesso();
        return { ...prevBips, [index]: { contagem: 1, referencia: decodedText } };
      } 
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

  const resetarBipagem = (index) => {
    const confirmacao = window.confirm("Tem certeza que deseja ZERAR a leitura deste item?\nO código de referência atual será apagado.");
    
    if (confirmacao) {
      setBips((prevBips) => {
        const novosBips = { ...prevBips };
        delete novosBips[index]; 
        return novosBips;
      });
      ultimoBipTexto.current = ""; 
    }
  };

  // SALVA TUDO NO LOCALSTORAGE (Simula o Banco de Dados)
  const salvarProgresso = () => {
    localStorage.setItem(`bips_req_${req.id}`, JSON.stringify(bips));
    localStorage.setItem(`itens_req_${req.id}`, JSON.stringify(itens));
    alert("Progresso salvo com sucesso!\nOs dados da separação foram registrados no sistema (Memória Local).");
  };

  const confirmarMudanca = () => {
    if (!responsavel.trim()) {
      alert("Por favor, insira seu nome para assumir a responsabilidade!");
      return;
    }
    
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
    dadosExtras.progressoBips = bips; 

    // Salva automaticamente o progresso ao confirmar
    localStorage.setItem(`bips_req_${req.id}`, JSON.stringify(bips));
    localStorage.setItem(`itens_req_${req.id}`, JSON.stringify(itens));

    aoMudarStatus(req.id, novoStatus, responsavel, dadosExtras);
    
    setResponsavel('');
    setNumReqExterna('');
    setNotaFiscal('');
  };

  const alternarExpansao = (index) => {
    if (linhaExpandida === index) {
      setLinhaExpandida(null);
      setModoExpansao('resumo');
    } else {
      setLinhaExpandida(index);
      setModoExpansao('resumo'); 
      setNovaQuantidade(itens[index].quantidade);
      setMotivoAlteracao(itens[index].observacao || '');
    }
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
    
    setModoExpansao('resumo'); 
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
                const infoBip = bips[index] || { contagem: 0, referencia: null };
                const porcentagem = Math.min((infoBip.contagem / Number(item.quantidade)) * 100, 100);
                const completo = infoBip.contagem >= Number(item.quantidade);
                const estaExpandido = linhaExpandida === index;

                return (
                  <React.Fragment key={index}>
                    <tr 
                      className="tr-clicavel"
                      onClick={() => alternarExpansao(index)}
                      style={{ 
                        borderBottom: estaExpandido ? 'none' : '1px solid #eee', 
                        backgroundColor: completo ? '#e8f8f5' : 'transparent',
                        fontWeight: completo ? 'bold' : 'normal'
                      }}
                    >
                      <td style={{ padding: '15px 10px' }}><strong>{item.cod}</strong></td>
                      <td style={{ padding: '15px 10px' }}>{item.descricao}</td>
                      <td style={{ padding: '15px 10px', textAlign: 'center', color: completo ? '#27ae60' : 'inherit' }}>
                        {item.quantidade} un
                      </td>
                    </tr>

                    {estaExpandido && (
                      <tr className="linha-expandida">
                        <td colSpan="3">
                          <div className="detalhes-produto-expandido">

                            {modoExpansao === 'resumo' && (
                              <div className="info-bipagem-resumo">
                                <span className="qtd-destaque" style={{ color: completo ? '#27ae60' : '#333' }}>
                                  Separado: {infoBip.contagem} / {item.quantidade} un
                                </span>
                                
                                {item.observacao && (
                                  <span className="texto-observacao">Obs: {item.observacao}</span>
                                )}

                                {req.status === 'Em Separação' && !completo && (
                                  <div className="acoes-linha-expandida">
                                    <button className="btn-acao-expandida btn-acao-camera" onClick={() => setModoExpansao('camera')}>
                                      📷 Bipar Código
                                    </button>
                                    <button className="btn-acao-expandida btn-acao-editar" onClick={() => setModoExpansao('edicao')}>
                                      ✏️ Editar Qtd
                                    </button>
                                  </div>
                                )}

                                {req.status === 'Em Separação' && infoBip.contagem > 0 && (
                                  <button className="btn-resetar-bip" onClick={() => resetarBipagem(index)} style={{ marginTop: '10px' }}>
                                    Zerar Leitura Deste Item
                                  </button>
                                )}
                              </div>
                            )}

                            {modoExpansao === 'camera' && (
                              // O RECURSO DE AUTO-SCROLL É ANCORADO AQUI NA div "leitor-container"
                              <div className="leitor-container" ref={cameraRef}>
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
                                      Cód. Referência: <strong>{infoBip.referencia}</strong>
                                    </span>
                                  )}

                                  <div className="botoes-camera">
                                    <button className="btn-resetar-bip" onClick={() => resetarBipagem(index)}>
                                      Zerar
                                    </button>
                                    <button className="btn-fechar-camera" onClick={() => setModoExpansao('resumo')}>
                                      Ocultar Câmera
                                    </button>
                                  </div>
                                </div>
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

      <button className="btn-salvar-progresso" onClick={salvarProgresso}>
        💾 Salvar Progresso
      </button>

    </div>
  );
}