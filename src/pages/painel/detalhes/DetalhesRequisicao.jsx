import React, { useState, useEffect } from 'react';
import '../../../styles/pages/painel/detalhes/detalhes.css';
import Romaneio from '../romaneio/Romaneio';

// Importação dos Nossos Novos Módulos
import ObservacoesReq from './ObservacoesReq';
import EdicaoReq from './EdicaoReq';
import SeparacaoReq from './SeparacaoReq';

export default function DetalhesRequisicao({ req, usuarioLogado, baseProdutos, aoVoltar, aoMudarStatus, aoAtualizarItens, aoAdicionarResponsavel, aoFinalizarSeparacao, aoIniciarEdicao, aoAtualizarObservacoes, recordesGlobais }) {
  if (!req) return null;

  const [novoStatus, setNovoStatus] = useState(req.status);
  const [responsavel, setResponsavel] = useState('');
  const [numReqExterna, setNumReqExterna] = useState('');
  const [notaFiscal, setNotaFiscal] = useState('');

  const [nomeAssumir, setNomeAssumir] = useState('');
  const [modoAssumir, setModoAssumir] = useState(false);

  const [tempoDecorrido, setTempoDecorrido] = useState(0);
  const [cronometroRodando, setCronometroRodando] = useState(false);

  const [popupCustom, setPopupCustom] = useState({
    visivel: false, tipo: 'info', titulo: '', mensagem: '', onConfirm: null, onCancel: null
  });

  const exibirPopup = (tipo, titulo, mensagem, onConfirm = null, onCancel = null) => {
    setPopupCustom({ visivel: true, tipo, titulo, mensagem, onConfirm, onCancel });
  };
  
  const fecharPopupCustom = () => setPopupCustom({ ...popupCustom, visivel: false });

  // Recalcula todosBipados usando os dados oficais do pai (segurança extra)
  const todosBipadosStatus = req.listaItens && req.listaItens.length > 0 && req.listaItens.every(item => {
    const meta = item.quantidadeEditada !== undefined ? Number(item.quantidadeEditada) : Number(item.quantidade);
    return (item.bipContagem || 0) >= meta;
  });

  const dispararDesafioDeProdutividade = () => {
    const totalItensFisicos = req.listaItens.reduce((acc, item) => {
      const meta = item.quantidadeEditada !== undefined ? Number(item.quantidadeEditada) : Number(item.quantidade);
      return acc + meta;
    }, 0);
    const chaveRecorde = `qtd_${totalItensFisicos}`;
    const recordeAtual = recordesGlobais ? recordesGlobais[chaveRecorde] : null;

    let msgDesafio = `Esta requisição possui ${totalItensFisicos} unidades físicas a separar.\n\n`;
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
      if (!todosBipadosStatus) { exibirPopup('erro', 'Trava de Segurança', 'Você não pode finalizar a saída sem bipar a quantidade exata de TODOS os produtos solicitados (ou justificar o corte editando a quantidade)!'); return; }
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

  const isReposicaoInterna = req.motivo === 'Reposição Interna' || (req.origem && req.destino && req.origem === req.destino);

  return (
    <div className="detalhes-container">
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

          {/* MÓDULO DE OBSERVAÇÕES */}
          <ObservacoesReq 
            req={req} 
            usuarioLogado={usuarioLogado} 
            aoAtualizarObservacoes={aoAtualizarObservacoes} 
            exibirPopup={exibirPopup} 
          />
        </div>

        {/* MÓDULO DE EDIÇÃO DA REQUISIÇÃO */}
        <EdicaoReq req={req} aoIniciarEdicao={aoIniciarEdicao} exibirPopup={exibirPopup} />

        {req.status === 'Em Separação' && (
          <div className="box-assumir-tarefa">
            <div className="assumir-info">
              <span><strong>Separador(es) Atual(is):</strong> {req.historico['Em Separação'] || 'Não informado'}</span>
            </div>
            {!modoAssumir ? (
              <button className="btn-assumir" onClick={() => setModoAssumir(true)}>🙋 Assumir / Ajudar na Separação</button>
            ) : (
              <div className="linha-assumir">
                <input type="text" placeholder="Digite o seu nome..." value={nomeAssumir} onChange={(e) => setNomeAssumir(e.target.value)} />
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
              let pts = Math.round(itensFisicos * upmFormat);
              if (isReposicaoInterna) { pts *= 2; }
              return (
                <div className="cronometro-eficiencia" style={{ color: '#27ae60' }}>
                  ⚡ {upmFormat} UPM | 🏆 +{pts} pts
                  {req.metricasSeparacao.bateuRecorde && ' (RECORDE)'}
                </div>
              );
            })()}
          </div>
        )}

        {/* MÓDULO DE SEPARAÇÃO E BIPAGEM */}
        <SeparacaoReq 
          req={req} 
          usuarioLogado={usuarioLogado} 
          aoAtualizarItens={aoAtualizarItens} 
          aoFinalizarSeparacao={aoFinalizarSeparacao} 
          tempoDecorrido={tempoDecorrido} 
          exibirPopup={exibirPopup} 
          setNovoStatus={setNovoStatus}
        />
      </div>

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