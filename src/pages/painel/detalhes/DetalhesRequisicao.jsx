import React, { useState, useEffect } from 'react';
import '../../../styles/pages/painel/detalhes/detalhes.css';
import Romaneio from '../romaneio/Romaneio';

import ObservacoesReq from './ObservacoesReq';
import EdicaoReq from './EdicaoReq';
import SeparacaoReq from './SeparacaoReq';
import EsteiraInterna from './EsteiraInterna';
import EsteiraExterna from './EsteiraExterna';

export default function DetalhesRequisicao({ 
  req, usuarioLogado, baseProdutos, aoVoltar, aoMudarStatus, 
  aoAtualizarItens, aoAdicionarResponsavel, aoFinalizarSeparacao, 
  aoIniciarEdicao, aoAtualizarObservacoes, recordesGlobais 
}) {
  if (!req) return null;

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

  const isGamificada = req.metricasSeparacao && req.listaItens.every(i => i.bipContagem === undefined);
  const todosBipadosStatus = isGamificada || (req.listaItens && req.listaItens.length > 0 && req.listaItens.every(item => {
    const meta = item.quantidadeEditada !== undefined ? Number(item.quantidadeEditada) : Number(item.quantidade);
    return (item.bipContagem || 0) >= meta;
  }));

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
          setTempoDecorrido(diferencaSegundos > 0 ? diferencaSegundos : 0);
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

  const isReposicaoInterna = req.motivo === 'Reposição Interna' || (req.origem && req.destino && req.origem === req.destino);

  // A função processarEsteira agora recebe os dados diretamente dos componentes filhos
  const processarEsteira = (proximoStatus, responsavelDigitado, dadosDaEsteira = {}) => {
    if (!responsavelDigitado.trim()) { 
      exibirPopup('aviso', 'Atenção', 'Por favor, insira o nome do responsável pela etapa!'); 
      return; 
    }
    
    const dadosExtras = {};

    if (proximoStatus === 'Em Separação' && req.status !== 'Em Separação') {
       dispararDesafioDeProdutividade();
       dadosExtras.inicio_separacao = Date.now(); 
    }

    if (req.status === 'Separado' && !isReposicaoInterna) {
      if (!todosBipadosStatus) { 
        exibirPopup('erro', 'Trava de Segurança', 'Você não pode dar saída sem bipar a quantidade exata de TODOS os produtos solicitados (ou ajustar a quantidade)!'); 
        return; 
      }
      if (!dadosDaEsteira.numReqExterna?.trim()) { 
        exibirPopup('aviso', 'Atenção', 'Por favor, insira o Número da Ordem Interna (Req. Sistema)!'); 
        return; 
      }
      if (!req.metricasSeparacao) { 
        exibirPopup('erro', 'Atenção', 'Você deve clicar no botão "Concluir Separação" na parte de baixo da tela para travar o seu tempo antes de passar para a saída!'); 
        return; 
      }
      dadosExtras.numeroRequisicaoExterna = dadosDaEsteira.numReqExterna;
    }
    
    if ((req.status === 'Faturamento' || req.status === 'Saída de produtos') && !isReposicaoInterna) {
      if (!dadosDaEsteira.notaFiscal?.trim()) { 
        exibirPopup('aviso', 'Atenção', 'Por favor, insira o Número da Nota Fiscal de transferência!'); 
        return; 
      }
      dadosExtras.notaFiscal = dadosDaEsteira.notaFiscal;
    }
    
    aoMudarStatus(req.id, proximoStatus, responsavelDigitado, dadosExtras);

    if (proximoStatus !== 'Concluída' && proximoStatus !== 'Em Separação') {
       exibirPopup('sucesso', 'Avançou na Esteira!', `O status foi atualizado para: ${proximoStatus}`, () => {
         fecharPopupCustom();
         aoVoltar(); 
       });
    } else if (proximoStatus === 'Concluída') {
       exibirPopup('sucesso', 'Requisição Concluída!', `A requisição foi recebida e finalizada com sucesso!\n\nLembrete: Arquive a nota/romaneio após o abastecimento das prateleiras.`, () => {
         fecharPopupCustom();
         aoVoltar(); 
       });
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

          <ObservacoesReq req={req} usuarioLogado={usuarioLogado} aoAtualizarObservacoes={aoAtualizarObservacoes} exibirPopup={exibirPopup} />
        </div>

        <EdicaoReq req={req} aoIniciarEdicao={aoIniciarEdicao} exibirPopup={exibirPopup} />

        {req.status === 'Em Separação' && (
          <div className="box-assumir-tarefa">
            <div className="assumir-info">
              <span><strong>Separador(es) Atual(is):</strong> {req.historico?.['Em Separação'] || 'Não informado'}</span>
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

        {isReposicaoInterna ? (
          <EsteiraInterna req={req} onProcessar={processarEsteira} />
        ) : (
          <EsteiraExterna req={req} onProcessar={processarEsteira} />
        )}
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

        <SeparacaoReq req={req} usuarioLogado={usuarioLogado} aoAtualizarItens={aoAtualizarItens} aoFinalizarSeparacao={aoFinalizarSeparacao} tempoDecorrido={tempoDecorrido} exibirPopup={exibirPopup} />
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