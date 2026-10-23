import React, { useState, useEffect } from 'react';
import { supabase } from '../../../services/supabase';
import '../../../styles/admin/metas/metasEstoque.css'; 

// 🚀 IMPORTAMOS O CALCULADOR MATEMÁTICO EXTERNO
import { processarMetricasReais } from './utils/calculadoraMetricas';

// 🚀 IMPORTAMOS OS COMPONENTES VISUAIS SEPARADOS
import PerformanceCard from './visao-geral/PerformanceCard';
import SaudeOperacao from './visao-geral/SaudeOperacao';
import MetasVariaveisDesafios from './visao-geral/MetasVariaveisDesafios';
import RankingColaboradores from './visao-geral/RankingColaboradores';

import FiltrosEPeriodo from './configuracao/FiltrosEPeriodo';
import MetasFixasOperacionais from './configuracao/MetasFixasOperacionais';
import MetasFixasGestao from './configuracao/MetasFixasGestao';
import GerenciamentoMetasVariaveis from './configuracao/GerenciamentoMetasVariaveis';
import HistoricoAlteracoesMetas from './configuracao/HistoricoAlteracoesMetas';

export default function MetasEstoque({ aoVoltar, usuarioLogado }) {
  const [abaAtiva, setAbaAtiva] = useState('geral');
  const [metas, setMetas] = useState([]);
  const [carregandoMetas, setCarregandoMetas] = useState(true);
  const [salvando, setSalvando] = useState(false);
  
  const [dataInicio, setDataInicio] = useState('');
  const [dataFim, setDataFim] = useState('');
  const [usuarioFiltro, setUsuarioFiltro] = useState('');
  const [usuariosLista, setUsuariosLista] = useState([]); 
  
  const [periodoInicio, setPeriodoInicio] = useState('');
  const [periodoFim, setPeriodoFim] = useState('');
  const [editPeriodoInicio, setEditPeriodoInicio] = useState('');
  const [editPeriodoFim, setEditPeriodoFim] = useState('');

  const [metasVariaveisList, setMetasVariaveisList] = useState([]);
  const [novaMetaTitulo, setNovaMetaTitulo] = useState('');
  const [novaMetaDesc, setNovaMetaDesc] = useState('');
  const [novaMetaValor, setNovaMetaValor] = useState('');
  const [historicoMetasDb, setHistoricoMetasDb] = useState([]);

  const valoresPadrao = {
    upm_minima: 8.0, tempo_separacao: 15, volume_diario: 300,
    sla_atendimento: 5, sla_total: 20, sla_percentual: 90,
    erro_separacao: 1.0, divergencia_conferencia: 1.0, retrabalho: 1.0,
    reposicao_atendimento: 5, reposicao_total: 30, recebimento_total: 60,
    sla_faturamento: 30, sla_saida: 30, tempo_cadastro: 120
  };

  const [valoresEditados, setValoresEditados] = useState(valoresPadrao);

  const [metricasReais, setMetricasReais] = useState({ produtividade: 0, sla: 0, qualidade: 0, operacao: 0, gestao_faturamento: 0, gestao_saida: 0, gestao_cadastro: 0, geral: 0 });
  const [valoresReais, setValoresReais] = useState({ upm: 0, sla_atingido: 0, erro: 0, tempo_operacao: 0 });
  const [rankingGeralReal, setRankingGeralReal] = useState([]);
  const [saude, setSaude] = useState({ reqPendentes: 0, reqVencidas: 0, repoPendentes: 0, recPendentes: 0, divergencias: 0, authPendentes: 0 });

  const isGestor = usuarioLogado?.acesso_admin || usuarioLogado?.username === 'admin' || usuarioLogado?.hierarquia === 'Encarregado';

  useEffect(() => {
    carregarUsuariosLista();
    carregarMetasE_CalcularReais();
    carregarHistoricoMetas();
    carregarSaudeOperacao();
    const intervaloSaude = setInterval(carregarSaudeOperacao, 30000);
    return () => clearInterval(intervaloSaude);
  }, []);

  const carregarUsuariosLista = async () => {
    const { data } = await supabase.from('usuarios_sistema').select('nome_completo, encarregado_responsavel').order('nome_completo');
    if (data) setUsuariosLista(data);
  };

  const carregarHistoricoMetas = async () => {
    const { data } = await supabase.from('historico_metas').select('*').order('data_alteracao', { ascending: false }).limit(10);
    if (data) setHistoricoMetasDb(data);
  };

  const carregarMetasE_CalcularReais = async () => {
    setCarregandoMetas(true);
    const { data } = await supabase.from('metas_operacionais').select('*');
    
    let configAtual = { ...valoresPadrao };
    let variaveisTemp = [];
    let pInicio = ''; let pFim = '';

    if (data && data.length > 0) {
      setMetas(data);
      data.forEach(m => {
        if (m.categoria === 'Variável') variaveisTemp.push(m);
        else if (m.indicador === 'periodo_vigente_inicio') pInicio = m.unidade; 
        else if (m.indicador === 'periodo_vigente_fim') pFim = m.unidade;
        else if (configAtual[m.indicador] !== undefined) configAtual[m.indicador] = m.valor_meta;
      });
      setValoresEditados(configAtual); setMetasVariaveisList(variaveisTemp);
      setPeriodoInicio(pInicio); setPeriodoFim(pFim);
      setEditPeriodoInicio(pInicio); setEditPeriodoFim(pFim);
    }
    setCarregandoMetas(false);
    calcularMetricasReais(configAtual, pInicio, pFim, '');
  };

  const handleFiltrarPorPeriodo = () => { calcularMetricasReais(valoresEditados, dataInicio || periodoInicio, dataFim || periodoFim, usuarioFiltro); setAbaAtiva('geral'); };
  const handleLimparFiltroData = () => { setDataInicio(''); setDataFim(''); setUsuarioFiltro(''); calcularMetricasReais(valoresEditados, periodoInicio, periodoFim, ''); setAbaAtiva('geral'); };

  const calcularMetricasReais = async (metasConfig, dInicio, dFim, uFiltro = '') => {
    try {
      let queryReqs = supabase.from('requisicoes').select('id, status, motivo, origem, destino, timestamp_criacao, metricas_separacao, historico, itens, lista_itens, data').neq('status', 'Cancelada');
      if (dInicio) queryReqs = queryReqs.gte('timestamp_criacao', new Date(`${dInicio}T00:00:00`).getTime() - (30 * 24 * 60 * 60 * 1000));
      const { data: reqsRaw } = await queryReqs;

      const { data: recsRaw } = await supabase.from('recebimento_mercadorias').select('id, status, numero_relatorio, metricas_recebimento, responsavel_cadastro, responsavel_recebedor, data_criacao').eq('status', 'Concluída'); 
      const { data: divsRaw } = await supabase.from('registro_divergencias').select('timestamp_criacao').eq('analise_procedente', true);

      // 🚀 Passa tudo para o utilitário limpo
      const { metricasReais, valoresReais, rankingGeralReal } = processarMetricasReais(metasConfig, dInicio, dFim, uFiltro, usuariosLista, reqsRaw, recsRaw, divsRaw);

      setMetricasReais(metricasReais); setValoresReais(valoresReais); setRankingGeralReal(rankingGeralReal);
    } catch (e) { console.error("Erro ao calcular métricas reais:", e); }
  };

  const carregarSaudeOperacao = async () => {
    try {
      const { data: reqs } = await supabase.from('requisicoes').select('status, motivo, timestamp_criacao').in('status', ['Pendente', 'Em Separação']);
      const { count: recsPendentes } = await supabase.from('recebimento_mercadorias').select('*', { count: 'exact', head: true }).in('status', ['Pendente', 'Em Conferência']);
      const { count: authsPendentes } = await supabase.from('autorizacoes_bip').select('*', { count: 'exact', head: true }).eq('status', 'pendente');
      const { count: divsPendentes } = await supabase.from('registro_divergencias').select('*', { count: 'exact', head: true }).eq('status', 'Pendente');

      let pend = 0; let repo = 0; let venc = 0; const agora = Date.now();
      if (reqs) { reqs.forEach(r => { if (r.motivo === 'Reposição Interna') repo++; else pend++; if (r.timestamp_criacao && (agora - r.timestamp_criacao > 7200000)) venc++; }); }
      setSaude({ reqPendentes: pend, reqVencidas: venc, repoPendentes: repo, recPendentes: recsPendentes || 0, divergencias: divsPendentes || 0, authPendentes: authsPendentes || 0 });
    } catch (e) { console.error(e); }
  };

  const handleSalvarPeriodoVigente = async () => {
    setSalvando(true);
    try {
      const updates = [ { categoria: 'Sistema', indicador: 'periodo_vigente_inicio', nome_exibicao: 'Início Avaliação', valor_meta: 0, unidade: editPeriodoInicio, atualizado_por: usuarioLogado?.nome_completo }, { categoria: 'Sistema', indicador: 'periodo_vigente_fim', nome_exibicao: 'Fim Avaliação', valor_meta: 0, unidade: editPeriodoFim, atualizado_por: usuarioLogado?.nome_completo } ];
      await supabase.from('metas_operacionais').upsert(updates, { onConflict: 'indicador' });
      alert('Período Oficial de Avaliação definido com sucesso!'); carregarMetasE_CalcularReais();
    } catch (error) { alert('Erro ao salvar o período.'); } finally { setSalvando(false); }
  };

  const handleSalvarMetas = async () => {
    setSalvando(true);
    try {
      const updates = []; const historicoLogs = [];
      Object.keys(valoresEditados).forEach(chave => {
        const valorNovo = valoresEditados[chave]; const metaOriginal = metas.find(m => m.indicador === chave); const valorAntigo = metaOriginal ? metaOriginal.valor_meta : valoresPadrao[chave];
        if (Number(valorNovo) !== Number(valorAntigo)) {
          const nomeExibicao = chave.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
          updates.push({ categoria: 'Operação', indicador: chave, nome_exibicao: nomeExibicao, valor_meta: valorNovo, atualizado_por: usuarioLogado?.nome_completo });
          historicoLogs.push({ categoria: 'Operação', indicador: nomeExibicao, valor_antigo: valorAntigo, valor_novo: valorNovo, unidade: 'und', alterado_por: usuarioLogado?.nome_completo || 'Sistema' });
        }
      });
      if (updates.length > 0) {
        await supabase.from('metas_operacionais').upsert(updates, { onConflict: 'indicador' });
        if (historicoLogs.length > 0) await supabase.from('historico_metas').insert(historicoLogs);
      }
      alert('Metas atualizadas!'); carregarMetasE_CalcularReais(); carregarHistoricoMetas(); 
    } catch (error) { alert('Erro ao salvar as metas no banco.'); } finally { setSalvando(false); }
  };

  const handleAdicionarMetaVariavel = async (e) => {
    e.preventDefault();
    if (!novaMetaTitulo.trim() || !novaMetaValor) return alert('Preencha o Título e Valor Alvo.');
    try {
      await supabase.from('metas_operacionais').insert([{ categoria: 'Variável', indicador: `variavel_${Date.now()}`, nome_exibicao: novaMetaTitulo.trim(), valor_meta: Number(novaMetaValor), valor_atual: 0, unidade: novaMetaDesc.trim() || 'pts', atualizado_por: usuarioLogado?.nome_completo || 'Sistema' }]);
      alert('Nova Meta Adicionada!'); setNovaMetaTitulo(''); setNovaMetaDesc(''); setNovaMetaValor(''); carregarMetasE_CalcularReais();
    } catch (err) { alert('Erro: ' + err.message); }
  };

  const handleExcluirMetaVariavel = async (id) => {
    if (!window.confirm('Excluir meta variável?')) return;
    await supabase.from('metas_operacionais').delete().eq('id', id); carregarMetasE_CalcularReais();
  };

  const handleLancarProgressoMeta = async (meta) => {
    const inputValor = window.prompt(`Lançar progresso para: ${meta.nome_exibicao}\nAtual: ${meta.valor_atual || 0}\nMeta: ${meta.valor_meta}\nDigite o valor para SOMAR:`, "0");
    if (!inputValor) return; 
    const valorAdicional = parseFloat(inputValor.replace(',', '.')); if (isNaN(valorAdicional) || valorAdicional === 0) return;
    await supabase.from('metas_operacionais').update({ valor_atual: (Number(meta.valor_atual) || 0) + valorAdicional, atualizado_por: usuarioLogado?.nome_completo }).eq('id', meta.id);
    carregarMetasE_CalcularReais(); 
  };

  const handleSalvarRelatorioMes = async () => {
    try {
      const pFormatado = periodoInicio && periodoFim ? `${periodoInicio} até ${periodoFim}` : 'Geral';
      await supabase.from('relatorios_mensais').insert([{ periodo: pFormatado, metricas: metricasReais, valores: valoresReais, criado_por: usuarioLogado?.nome_completo || 'Sistema', created_at: new Date().toISOString() }]);
      alert('Relatório salvo com sucesso!');
    } catch (e) { alert('Erro ao salvar o relatório.'); }
  };

  return (
    <div className="metas-container">
      <div className="metas-header-wrapper">
        <div className="metas-header-text">
          <div className="flex-center">
            <span className="emoji-title">🎯</span>
            <div>
              <h2>Metas Operacionais</h2>
              <p>Acompanhe o desempenho da sua equipe e mantenha a operação no caminho certo.</p>
            </div>
          </div>
        </div>
        <div className="metas-header-actions">
          <div className="abas-metas">
            <button className={`btn-aba-meta ${abaAtiva === 'geral' ? 'ativa' : ''}`} onClick={() => setAbaAtiva('geral')}>Visão Geral</button>
            <button className={`btn-aba-meta ${abaAtiva === 'configuracao' ? 'ativa' : ''}`} onClick={() => { if(isGestor) setAbaAtiva('configuracao'); else alert('Acesso restrito.'); }}>Configuração</button>
          </div>
          <button className="btn-voltar-metas" onClick={aoVoltar}>Voltar</button>
        </div>
      </div>

      {abaAtiva === 'geral' && (
        <div className="conteudo-aba fade-in">
          <div className="secao-titulo">
            <h3>{usuarioFiltro ? `Performance de ${usuarioFiltro}` : 'Performance Global da Equipe'}</h3>
            <span className={`secao-sub ${(!dataInicio && !dataFim && (periodoInicio || periodoFim)) ? 'oficial' : ''}`}>
              {dataInicio || dataFim ? `Filtro Temporário Aplicado` : 'Cálculo Baseado no Histórico Oficial'}
            </span>
          </div>

          <div className="perf-grid-duplo">
            <PerformanceCard titulo="Produtividade (Op)" percentual={metricasReais.produtividade} cor="#2ecc71" />
            <PerformanceCard titulo="SLA Atendimento (Op)" percentual={metricasReais.sla} cor="#3498db" />
            <PerformanceCard titulo="Qualidade (Op)" percentual={metricasReais.qualidade} cor="#f1c40f" />
            <PerformanceCard titulo="Operação (Op)" percentual={metricasReais.operacao} cor="#9b59b6" />
            <PerformanceCard titulo="Desempenho Geral" percentual={metricasReais.geral} cor="#34495e" isGeral={true} />
            <PerformanceCard titulo="SLA Faturamento (Gestão)" percentual={metricasReais.gestao_faturamento} cor="#e67e22" />
            <PerformanceCard titulo="SLA Saída (Gestão)" percentual={metricasReais.gestao_saida} cor="#e67e22" />
            <PerformanceCard titulo="Tempo Cadastro (Gestão)" percentual={metricasReais.gestao_cadastro} cor="#16a085" />
            <div className="filler-card"></div>
          </div>

          <div className="dash-body-grid">
            <SaudeOperacao saude={saude} />
            <MetasVariaveisDesafios metasVariaveisList={metasVariaveisList} isGestor={isGestor} handleLancarProgressoMeta={handleLancarProgressoMeta} />
            <RankingColaboradores rankingGeralReal={rankingGeralReal} metaUpmAtual={valoresEditados.upm_minima} />
          </div>

          <div className="action-footer">
            <button onClick={handleSalvarRelatorioMes} className="btn-save-report">💾 Salvar Relatório no Banco</button>
          </div>
        </div>
      )}

      {abaAtiva === 'configuracao' && (
        <div className="conteudo-aba fade-in">
          <FiltrosEPeriodo editPeriodoInicio={editPeriodoInicio} setEditPeriodoInicio={setEditPeriodoInicio} editPeriodoFim={editPeriodoFim} setEditPeriodoFim={setEditPeriodoFim} handleSalvarPeriodoVigente={handleSalvarPeriodoVigente} salvando={salvando} usuarioFiltro={usuarioFiltro} setUsuarioFiltro={setUsuarioFiltro} usuariosLista={usuariosLista} dataInicio={dataInicio} setDataInicio={setDataInicio} dataFim={dataFim} setDataFim={setDataFim} handleFiltrarPorPeriodo={handleFiltrarPorPeriodo} handleLimparFiltroData={handleLimparFiltroData} />
          <MetasFixasOperacionais valoresEditados={valoresEditados} setValoresEditados={setValoresEditados} handleSalvarMetas={handleSalvarMetas} salvando={salvando} carregandoMetas={carregandoMetas} />
          <MetasFixasGestao valoresEditados={valoresEditados} setValoresEditados={setValoresEditados} />
          <GerenciamentoMetasVariaveis novaMetaTitulo={novaMetaTitulo} setNovaMetaTitulo={setNovaMetaTitulo} novaMetaDesc={novaMetaDesc} setNovaMetaDesc={setNovaMetaDesc} novaMetaValor={novaMetaValor} setNovaMetaValor={setNovaMetaValor} handleAdicionarMetaVariavel={handleAdicionarMetaVariavel} metasVariaveisList={metasVariaveisList} handleExcluirMetaVariavel={handleExcluirMetaVariavel} />
          <HistoricoAlteracoesMetas historicoMetasDb={historicoMetasDb} />
        </div>
      )}
    </div>
  );
}