import React, { useState, useEffect } from 'react';
import '../../../styles/pages/painel/detalhes/detalhes.css';
import Romaneio from '../romaneio/Romaneio';
import { supabase } from '../../../services/supabase'; // 🚀 Conexão injetada para as metas/OTIF

import ObservacoesReq from './ObservacoesReq';
import EdicaoReq from './EdicaoReq';
import SeparacaoReq from './SeparacaoReq';
import EsteiraInterna from './EsteiraInterna';
import EsteiraExterna from './EsteiraExterna';

// 🚀 Nossos novos módulos isolados de OTIF
import PopupDivergenciaRecebedor from './PopupDivergenciaRecebedor';
import PopupAnaliseOrigem from './PopupAnaliseOrigem';

export default function DetalhesRequisicao({ 
  req, usuarioLogado, baseProdutos, aoVoltar, aoMudarStatus, 
  aoAtualizarItens, aoAdicionarResponsavel, aoFinalizarSeparacao, 
  aoIniciarEdicao, aoAtualizarObservacoes, aoAtualizarHistorico, recordesGlobais 
}) {
  if (!req) return null;

  const [nomeAssumir, setNomeAssumir] = useState('');
  const [modoAssumir, setModoAssumir] = useState(false);
  const [tempoDecorrido, setTempoDecorrido] = useState(0);
  const [cronometroRodando, setCronometroRodando] = useState(false);

  // 🚀 ESTADOS DO MOTOR DE QUALIDADE (OTIF)
  const [divergenciaAtiva, setDivergenciaAtiva] = useState(false);
  const [recebedorAtual, setRecebedorAtual] = useState('');
  const [analiseAtiva, setAnaliseAtiva] = useState(false);
  const [dadosDivergencia, setDadosDivergencia] = useState(null);

  const [popupCustom, setPopupCustom] = useState({
    visivel: false, tipo: 'info', titulo: '', mensagem: '', onConfirm: null, onCancel: null
  });

  const exibirPopup = (tipo, titulo, mensagem, onConfirm = null, onCancel = null) => {
    setPopupCustom({ visivel: true, tipo, titulo, mensagem, onConfirm, onCancel });
  };
  
  const fecharPopupCustom = () => setPopupCustom({ ...popupCustom, visivel: false });

  // 🚀 BUSCADOR AUTOMÁTICO DE DIVERGÊNCIA PENDENTE (Para a Loja de Origem)
  useEffect(() => {
    if (req?.status === 'Divergência') {
      const fetchDivergencia = async () => {
        const { data, error } = await supabase
          .from('registro_divergencias')
          .select('*')
          .eq('requisicao_id', String(req.id))
          .eq('status', 'Pendente')
          .single();
        if (data && !error) setDadosDivergencia(data);
      };
      fetchDivergencia();
    }
  }, [req?.status, req?.id]);

  // TRAVA DE SEGURANÇA: Garante que req.listaItens é um array antes de usar o .every()
  const isGamificada = req.metricasSeparacao && Array.isArray(req.listaItens) && req.listaItens.length > 0 && req.listaItens.every(i => i.bipContagem === undefined);
  
  const todosBipadosStatus = isGamificada || (Array.isArray(req.listaItens) && req.listaItens.length > 0 && req.listaItens.every(item => {
    const meta = item.quantidadeEditada !== undefined ? Number(item.quantidadeEditada) : Number(item.quantidade);
    return (item.bipContagem || 0) >= meta;
  }));

  const dispararDesafioDeProdutividade = () => {
    const listaItensSegura = Array.isArray(req.listaItens) ? req.listaItens : [];
    const totalItensFisicos = listaItensSegura.reduce((acc, item) => {
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
      const tempoPausadoTotal = req.historico?.tempo_pausado_total || 0;
      const pausaAtivaInicio = req.historico?.pausa_ativa_inicio;

      if (horaInicioBanco) {
        if (pausaAtivaInicio) {
          setCronometroRodando(false);
          const diferenca = (Number(pausaAtivaInicio) - Number(horaInicioBanco)) - tempoPausadoTotal;
          setTempoDecorrido(Math.max(0, Math.floor(diferenca / 1000)));
        } else {
          setCronometroRodando(true);
          intervalo = setInterval(() => {
            const diferenca = (Date.now() - Number(horaInicioBanco)) - tempoPausadoTotal;
            setTempoDecorrido(Math.max(0, Math.floor(diferenca / 1000)));
          }, 1000);
        }
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

  // 🚀 LÓGICA DE DIVERGÊNCIA E ANÁLISE
  const handleAbrirDivergencia = (nomeRecebedor) => {
    setRecebedorAtual(nomeRecebedor);
    setDivergenciaAtiva(true);
  };

  const handleSubmitDivergencia = async (itensDivergentes) => {
    try {
      const { error } = await supabase.from('registro_divergencias').insert([{
        requisicao_id: String(req.id),
        loja_origem: req.origem || 'Matriz',
        loja_destino: req.destino,
        recebedor_destino: recebedorAtual,
        itens_divergentes: itensDivergentes,
        status: 'Pendente',
        timestamp_criacao: Date.now()
      }]);
      
      if (error) throw error;
      
      // Crava no histórico a falha de qualidade
      if (aoAtualizarObservacoes) {
        const obsErro = `\n\n[ALERTA DE QUALIDADE] O recebedor ${recebedorAtual} relatou divergências e bloqueou o recebimento. Analisar via Painel de Transferência.`;
        aoAtualizarObservacoes(req.id, obsErro);
      }
      
      aoMudarStatus(req.id, 'Divergência', recebedorAtual);
      setDivergenciaAtiva(false);
      
      exibirPopup('aviso', 'Divergência Registrada', 'A equipe de origem foi notificada (Prioridade Alta) e deverá analisar o caso.', () => {
        fecharPopupCustom();
        aoVoltar();
      });
    } catch (error) {
      exibirPopup('erro', 'Erro de Conexão', 'Falha ao registrar a divergência: ' + error.message);
    }
  };

  const handleSubmitAnalise = async (procedente, justificativa) => {
    try {
      const nomeAnalista = usuarioLogado?.nome_completo || 'Equipe Origem';
      
      const { error } = await supabase.from('registro_divergencias')
        .update({
          status: 'Analisado',
          analise_procedente: procedente,
          justificativa_origem: justificativa,
          responsavel_analise: nomeAnalista
        })
        .eq('id', dadosDivergencia.id);
        
      if (error) throw error;
      
      const textoVeredito = procedente ? 'PROCEDENTE (Falha na Origem)' : 'IMPROCEDENTE (Erro do Recebedor)';
      
      if (aoAtualizarObservacoes) {
        const obsVeredito = `\n\n[ANÁLISE DE QUALIDADE CONCLUÍDA]\nAnalista: ${nomeAnalista}\nVeredito: ${textoVeredito}\nJustificativa: ${justificativa}`;
        aoAtualizarObservacoes(req.id, obsVeredito);
      }
      
      aoMudarStatus(req.id, 'Concluída', nomeAnalista);
      setAnaliseAtiva(false);
      
      exibirPopup('sucesso', 'Análise Finalizada e Arquivada', 'O indicador de qualidade (OTIF) foi atualizado e a nota foi finalizada.', () => {
        fecharPopupCustom();
        aoVoltar();
      });
    } catch (error) {
      exibirPopup('erro', 'Erro de Conexão', 'Falha ao salvar análise: ' + error.message);
    }
  };

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
    if (req.status === 'Saída de produtos' && !isReposicaoInterna) {
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
       exibirPopup('sucesso', 'Recebimento e Conclusão!', `A mercadoria foi recebida e a requisição finalizada no sistema com sucesso!\n\nLembrete: Arquive a nota/romaneio fisicamente após o abastecimento das prateleiras.`, () => {
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
      case 'Concluída': return 'status-recebido'; 
      case 'Divergência': return 'status-divergencia'; // 🚀 Nova tag visual para alertas
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

        {req.status === 'Em Separação' && !req.historico?.pausa_ativa_inicio && (
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

        {/* 🚀 CAIXA DE ALERTA PARA A EQUIPE DA ORIGEM RESPONDER À DIVERGÊNCIA */}
        {req.status === 'Divergência' && (
          <div style={{ backgroundColor: '#fdf2f1', border: '2px solid #e74c3c', padding: '20px', borderRadius: '8px', marginBottom: '20px' }}>
            <h3 style={{ color: '#c0392b', margin: '0 0 10px 0' }}>🚨 ATENÇÃO: DIVERGÊNCIA NO RECEBIMENTO (OTIF REPROVADO)</h3>
            <p style={{ color: '#c0392b', margin: '0 0 15px 0' }}>
              A loja <strong>{req.destino}</strong> relatou problemas (produtos faltantes ou trocados) ao conferir fisicamente a carga.
            </p>
            <button 
              onClick={() => setAnaliseAtiva(true)}
              disabled={!dadosDivergencia}
              style={{ backgroundColor: dadosDivergencia ? '#e74c3c' : '#bdc3c7', color: 'white', padding: '12px 20px', borderRadius: '8px', border: 'none', fontWeight: 'bold', cursor: dadosDivergencia ? 'pointer' : 'not-allowed' }}
            >
              {dadosDivergencia ? '🔍 Analisar Divergência (Responder)' : '⏳ Carregando dados da divergência...'}
            </button>
          </div>
        )}

        {isReposicaoInterna ? (
          <EsteiraInterna req={req} onProcessar={processarEsteira} />
        ) : (
          <EsteiraExterna req={req} onProcessar={processarEsteira} onAbrirDivergencia={handleAbrirDivergencia} />
        )}
      </div>

      <div className="card-info" style={{ position: 'relative' }}>
        {(req.status === 'Em Separação' || req.metricasSeparacao) && (
          <div className="painel-cronometro">
            <div className="cronometro-titulo">
              {req.metricasSeparacao ? '⏱️ TEMPO FINAL DA SEPARAÇÃO' : (req.historico?.pausa_ativa_inicio ? '⏸️ TEMPO CONGELADO (EM PAUSA)' : '⏱️ TEMPO EM ANDAMENTO')}
            </div>
            <div className={`cronometro-relogio ${req.metricasSeparacao || req.historico?.pausa_ativa_inicio ? 'tempo-travado' : ''}`}>
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

        <SeparacaoReq 
          req={req} 
          usuarioLogado={usuarioLogado} 
          aoAtualizarItens={aoAtualizarItens} 
          aoFinalizarSeparacao={aoFinalizarSeparacao} 
          tempoDecorrido={tempoDecorrido} 
          exibirPopup={exibirPopup} 
          fecharPopupCustom={fecharPopupCustom} 
          aoAtualizarHistorico={aoAtualizarHistorico}
          baseProdutos={baseProdutos} 
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

      {/* 🚀 INJEÇÃO DOS MODAIS ISOLADOS */}
      {divergenciaAtiva && (
        <PopupDivergenciaRecebedor 
          req={req} 
          onClose={() => setDivergenciaAtiva(false)} 
          onSubmitDivergencia={handleSubmitDivergencia} 
        />
      )}

      {analiseAtiva && dadosDivergencia && (
        <PopupAnaliseOrigem 
          divergencia={dadosDivergencia} 
          onClose={() => setAnaliseAtiva(false)} 
          onSubmitAnalise={handleSubmitAnalise} 
        />
      )}

      <Romaneio req={req} baseProdutos={baseProdutos} />
    </div>
  );
}