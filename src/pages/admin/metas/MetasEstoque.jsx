import React, { useState, useEffect } from 'react';
import { supabase } from '../../../services/supabase';
import '../../../styles/admin/metas/metasEstoque.css'; 

export default function MetasEstoque({ aoVoltar, usuarioLogado }) {
  const [abaAtiva, setAbaAtiva] = useState('geral');
  const [metas, setMetas] = useState([]);
  const [carregandoMetas, setCarregandoMetas] = useState(true);
  const [salvando, setSalvando] = useState(false);
  
  // ESTADOS DE FILTRO: Data e Usuário Específico
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

  // Valores Padrão (Fixas Operacionais + Fixas de Gestão)
  const valoresPadrao = {
    upm_minima: 8.0, tempo_separacao: 15, volume_diario: 300,
    sla_atendimento: 5, sla_total: 20, sla_percentual: 90,
    erro_separacao: 1.0, divergencia_conferencia: 1.0, retrabalho: 1.0,
    reposicao_atendimento: 5, reposicao_total: 30, recebimento_total: 60,
    sla_faturamento: 30, sla_saida: 30, tempo_cadastro: 120
  };

  const [valoresEditados, setValoresEditados] = useState(valoresPadrao);

  // Estados dos KPIs reais
  const [metricasReais, setMetricasReais] = useState({
    produtividade: 0, sla: 0, qualidade: 0, operacao: 0, 
    gestao_faturamento: 0, gestao_saida: 0, gestao_cadastro: 0, geral: 0
  });

  const [valoresReais, setValoresReais] = useState({
    upm: 0, sla_atingido: 0, erro: 0, tempo_operacao: 0
  });

  const [rankingGeralReal, setRankingGeralReal] = useState([]);

  const [saude, setSaude] = useState({ 
    reqPendentes: 0, reqVencidas: 0, repoPendentes: 0, 
    recPendentes: 0, divergencias: 0, authPendentes: 0 
  });

  const isGestor = usuarioLogado?.acesso_admin || usuarioLogado?.username === 'admin' || usuarioLogado?.hierarquia === 'Encarregado';

  useEffect(() => {
    carregarUsuariosLista();
    carregarMetasE_CalcularReais();
    carregarSaudeOperacao();
    const intervaloSaude = setInterval(carregarSaudeOperacao, 30000);
    return () => clearInterval(intervaloSaude);
  }, []);

  const carregarUsuariosLista = async () => {
    const { data } = await supabase.from('usuarios_sistema').select('nome_completo, encarregado_responsavel').order('nome_completo');
    if (data) {
      setUsuariosLista(data);
    }
  };

  const carregarMetasE_CalcularReais = async () => {
    setCarregandoMetas(true);
    const { data, error } = await supabase.from('metas_operacionais').select('*');
    
    let configAtual = { ...valoresPadrao };
    let variaveisTemp = [];
    let pInicio = '';
    let pFim = '';

    if (!error && data && data.length > 0) {
      setMetas(data);
      data.forEach(m => {
        if (m.categoria === 'Variável') {
          variaveisTemp.push(m);
        } else if (m.indicador === 'periodo_vigente_inicio') {
          pInicio = m.unidade; 
        } else if (m.indicador === 'periodo_vigente_fim') {
          pFim = m.unidade;
        } else if (configAtual[m.indicador] !== undefined) {
          configAtual[m.indicador] = m.valor_meta;
        }
      });
      setValoresEditados(configAtual);
      setMetasVariaveisList(variaveisTemp);
      setPeriodoInicio(pInicio);
      setPeriodoFim(pFim);
      setEditPeriodoInicio(pInicio);
      setEditPeriodoFim(pFim);
    }
    setCarregandoMetas(false);
    
    calcularMetricasReais(configAtual, pInicio, pFim, '');
  };

  const handleFiltrarPorPeriodo = () => {
    calcularMetricasReais(valoresEditados, dataInicio || periodoInicio, dataFim || periodoFim, usuarioFiltro);
    setAbaAtiva('geral'); 
  };

  const handleLimparFiltroData = () => {
    setDataInicio('');
    setDataFim('');
    setUsuarioFiltro('');
    calcularMetricasReais(valoresEditados, periodoInicio, periodoFim, '');
  };

  const calcularMetricasReais = async (metasConfig, dInicio, dFim, uFiltro = '') => {
    try {
      const metaSlaTotalMin = metasConfig.sla_total || 20;
      const metaUpm = metasConfig.upm_minima || 8;
      const metaRecMin = metasConfig.recebimento_total || 60;

      let usuariosValidos = [];
      if (uFiltro) {
        usuariosValidos.push(uFiltro.trim().toLowerCase());
        usuariosLista.forEach(u => {
          if (u.encarregado_responsavel?.trim().toLowerCase() === uFiltro.trim().toLowerCase()) {
            if (u.nome_completo) usuariosValidos.push(u.nome_completo.trim().toLowerCase());
          }
        });
      }

      let queryReqs = supabase.from('requisicoes')
        .select('status, timestamp_criacao, metricas_separacao, historico')
        .neq('status', 'Cancelada');

      if (dInicio) queryReqs = queryReqs.gte('timestamp_criacao', new Date(`${dInicio}T00:00:00`).getTime());
      if (dFim) queryReqs = queryReqs.lte('timestamp_criacao', new Date(`${dFim}T23:59:59`).getTime());

      const { data: reqs } = await queryReqs;

      let reqsNoPrazo = 0;
      let totalReqsValidas = 0;
      let mapSeparadores = {};

      if (reqs) {
        reqs.forEach(r => {
          const metricas = r.metricas_separacao || {};
          const historico = r.historico || {};

          let nomeResponsavel = metricas.responsavel || historico['Em Separação'] || historico['Separado'];
          if (nomeResponsavel) nomeResponsavel = nomeResponsavel.trim();
          const nomeNormalizado = nomeResponsavel ? nomeResponsavel.toLowerCase() : '';

          let atuouNestaNota = true;
          if (usuariosValidos.length > 0) {
            const fat = historico['Faturamento']?.trim().toLowerCase();
            const sai = historico['Saída de produtos']?.trim().toLowerCase();
            const con = historico['Concluída']?.trim().toLowerCase();
            atuouNestaNota = usuariosValidos.includes(nomeNormalizado) || usuariosValidos.includes(fat) || usuariosValidos.includes(sai) || usuariosValidos.includes(con);
          }

          if (nomeResponsavel && nomeResponsavel.length > 0) {
            if (!mapSeparadores[nomeResponsavel]) {
              mapSeparadores[nomeResponsavel] = { nome: nomeResponsavel, totalItens: 0, tempoTotalSegundos: 0 };
            }
            mapSeparadores[nomeResponsavel].totalItens += (Number(metricas.totalItensFisicos) || 0);
            mapSeparadores[nomeResponsavel].tempoTotalSegundos += (Number(metricas.tempoTotalSegundos) || 0);
          }

          if (atuouNestaNota && metricas.finalizadoEm && r.timestamp_criacao) {
            totalReqsValidas++;
            const inicio = Number(r.timestamp_criacao);
            const fim = new Date(metricas.finalizadoEm).getTime();
            const diffMinutos = (fim - inicio) / 60000;
            if (diffMinutos <= metaSlaTotalMin) reqsNoPrazo++;
          }
        });
      }

      const rankingCalculado = Object.values(mapSeparadores).map(colab => {
        const upm = colab.tempoTotalSegundos > 0 ? (colab.totalItens / colab.tempoTotalSegundos) * 60 : 0;
        return { ...colab, upm: Number(upm.toFixed(1)) };
      }).sort((a, b) => b.upm - a.upm);

      setRankingGeralReal(rankingCalculado);

      let rankingParaMedia = rankingCalculado;
      if (usuariosValidos.length > 0) {
        rankingParaMedia = rankingCalculado.filter(c => usuariosValidos.includes(c.nome.toLowerCase()));
      }

      const upmMedia = rankingParaMedia.length > 0 
        ? (rankingParaMedia.reduce((acc, curr) => acc + curr.upm, 0) / rankingParaMedia.length) 
        : 0;
      
      // 🚀 CORREÇÃO 1: Evita "falso 100%" se não há nenhuma produtividade
      let prodPerc = 0;
      if (rankingParaMedia.length > 0) {
        prodPerc = metaUpm > 0 ? (upmMedia / metaUpm) * 100 : 100;
      }
      if (isNaN(prodPerc)) prodPerc = 0;

      // 🚀 CORREÇÃO 2: Se totalReqsValidas for 0, SLA foi 0 (não trabalhou)
      let slaPerc = totalReqsValidas > 0 ? (reqsNoPrazo / totalReqsValidas) * 100 : 0;
      if (isNaN(slaPerc)) slaPerc = 0;

      let queryDivs = supabase.from('registro_divergencias')
        .select('*', { count: 'exact', head: true })
        .eq('analise_procedente', true);

      if (dInicio) queryDivs = queryDivs.gte('timestamp_criacao', new Date(`${dInicio}T00:00:00`).getTime());
      if (dFim) queryDivs = queryDivs.lte('timestamp_criacao', new Date(`${dFim}T23:59:59`).getTime());

      const { count: divergenciasConferidas } = await queryDivs;
      const totalErros = divergenciasConferidas || 0;
      const taxaErro = totalReqsValidas > 0 ? (totalErros / totalReqsValidas) * 100 : 0;
      
      // 🚀 CORREÇÃO 3: Qualidade zera se não tem nenhuma validação
      const qualidadePerc = totalReqsValidas > 0 ? Math.max(0, 100 - taxaErro) : 0;

      let queryRecs = supabase.from('recebimento_mercadorias')
        .select('metricas_recebimento, responsavel_cadastro, responsavel_recebedor')
        .eq('status', 'Concluída');

      if (dInicio) queryRecs = queryRecs.gte('data_criacao', `${dInicio}T00:00:00`);
      if (dFim) queryRecs = queryRecs.lte('data_criacao', `${dFim}T23:59:59`);

      const { data: recs } = await queryRecs;

      let recsNoPrazo = 0;
      let totalRecs = 0;
      let recTempoMedioMin = 0;

      if (recs) {
        let tempoTotalRec = 0;
        recs.forEach(r => {
          let atuouNoRecebimento = true;
          if (usuariosValidos.length > 0) {
            const respCad = r.responsavel_cadastro?.trim().toLowerCase();
            const respRec = r.responsavel_recebedor?.trim().toLowerCase();
            atuouNoRecebimento = usuariosValidos.includes(respCad) || usuariosValidos.includes(respRec);
          }

          if (atuouNoRecebimento && r.metricas_recebimento?.tempoTotalSegundos) {
            totalRecs++;
            const min = r.metricas_recebimento.tempoTotalSegundos / 60;
            tempoTotalRec += min;
            if (min <= metaRecMin) recsNoPrazo++;
          }
        });
        if (totalRecs > 0) recTempoMedioMin = tempoTotalRec / totalRecs;
      }
      
      // 🚀 CORREÇÃO 4: Operação zera se não houve trabalho
      let operacaoPerc = totalRecs > 0 ? (recsNoPrazo / totalRecs) * 100 : 0;
      if (isNaN(operacaoPerc)) operacaoPerc = 0;

      // 🚀 CORREÇÃO 5: Metas de Gestão também precisam avaliar se houve volume para ganhar nota 100
      const gestaoFatPerc = totalReqsValidas > 0 ? 100 : 0; 
      const gestaoSaiPerc = totalReqsValidas > 0 ? 100 : 0; 
      const gestaoCadPerc = totalRecs > 0 ? 100 : 0; 

      let geralPerc = (
        Math.min(100, prodPerc) + Math.min(100, slaPerc) + qualidadePerc + Math.min(100, operacaoPerc) +
        gestaoFatPerc + gestaoSaiPerc + gestaoCadPerc
      ) / 7;

      if (isNaN(geralPerc)) geralPerc = 0;

      setMetricasReais({
        produtividade: Math.min(100, Math.round(prodPerc)) || 0,
        sla: Math.round(slaPerc) || 0,
        qualidade: Number(qualidadePerc.toFixed(1)) || 0,
        operacao: Math.round(operacaoPerc) || 0,
        gestao_faturamento: gestaoFatPerc,
        gestao_saida: gestaoSaiPerc,
        gestao_cadastro: gestaoCadPerc,
        geral: Math.round(geralPerc) || 0
      });

      setValoresReais({
        upm: Number(upmMedia.toFixed(1)) || 0,
        sla_atingido: Math.round(slaPerc) || 0,
        erro: Number(taxaErro.toFixed(1)) || 0,
        tempo_operacao: Math.round(recTempoMedioMin) || 0
      });

    } catch (e) {
      console.error("Erro ao calcular métricas reais:", e);
    }
  };

  const carregarSaudeOperacao = async () => {
    try {
      const { data: reqs } = await supabase.from('requisicoes')
        .select('status, motivo, timestamp_criacao')
        .in('status', ['Pendente', 'Em Separação']);
      
      const { count: recsPendentes } = await supabase.from('recebimento_mercadorias')
        .select('*', { count: 'exact', head: true })
        .in('status', ['Pendente', 'Em Conferência']);

      const { count: authsPendentes } = await supabase.from('autorizacoes_bip')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'pendente');

      const { count: divsPendentes } = await supabase.from('registro_divergencias')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'Pendente');

      let pend = 0; let repo = 0; let venc = 0;
      const agora = Date.now();

      if (reqs) {
        reqs.forEach(r => {
          if (r.motivo === 'Reposição Interna') repo++;
          else pend++;
          
          if (r.timestamp_criacao && (agora - r.timestamp_criacao > 7200000)) venc++;
        });
      }

      setSaude({ 
        reqPendentes: pend, reqVencidas: venc, repoPendentes: repo, 
        recPendentes: recsPendentes || 0, divergencias: divsPendentes || 0, 
        authPendentes: authsPendentes || 0 
      });
    } catch (e) { console.error(e); }
  };

  const handleSalvarPeriodoVigente = async () => {
    setSalvando(true);
    try {
      const updates = [
        { categoria: 'Sistema', indicador: 'periodo_vigente_inicio', nome_exibicao: 'Início Avaliação', valor_meta: 0, unidade: editPeriodoInicio, atualizado_por: usuarioLogado?.nome_completo },
        { categoria: 'Sistema', indicador: 'periodo_vigente_fim', nome_exibicao: 'Fim Avaliação', valor_meta: 0, unidade: editPeriodoFim, atualizado_por: usuarioLogado?.nome_completo }
      ];

      await supabase.from('metas_operacionais').upsert(updates, { onConflict: 'indicador' });
      alert('Período Oficial de Avaliação definido com sucesso!');
      carregarMetasE_CalcularReais();
    } catch (error) {
      alert('Erro ao salvar o período.');
    } finally {
      setSalvando(false);
    }
  };

  const handleSalvarMetas = async () => {
    setSalvando(true);
    try {
      const updates = Object.keys(valoresEditados).map(chave => ({
        categoria: determinarCategoria(chave),
        indicador: chave,
        nome_exibicao: formatarNomeExibicao(chave),
        valor_meta: valoresEditados[chave],
        atualizado_por: usuarioLogado?.nome_completo
      }));

      const { error } = await supabase.from('metas_operacionais').upsert(updates, { onConflict: 'indicador' });
      if (error) throw error;

      alert('Metas fixas atualizadas com sucesso!');
      carregarMetasE_CalcularReais();
    } catch (error) {
      alert('Erro ao salvar as metas no banco de dados.');
    } finally {
      setSalvando(false);
    }
  };

  const handleAdicionarMetaVariavel = async (e) => {
    e.preventDefault();
    if (!novaMetaTitulo.trim() || !novaMetaValor) {
      alert('Preencha o Título e o Valor Alvo da meta variável.');
      return;
    }

    try {
      const indicadorUnico = `variavel_${Date.now()}`;
      
      const novaMetaObj = {
        categoria: 'Variável',
        indicador: indicadorUnico,
        nome_exibicao: novaMetaTitulo.trim(),
        valor_meta: Number(novaMetaValor),
        valor_atual: 0, 
        unidade: novaMetaDesc.trim() || 'pts',
        atualizado_por: usuarioLogado?.nome_completo || 'Sistema'
      };

      const { error } = await supabase.from('metas_operacionais').insert([novaMetaObj]);
      if (error) throw error;

      alert('Nova Meta Variável adicionada com sucesso!');
      setNovaMetaTitulo('');
      setNovaMetaDesc('');
      setNovaMetaValor('');
      carregarMetasE_CalcularReais();
    } catch (err) {
      alert('Erro ao cadastrar meta variável: ' + err.message);
    }
  };

  const handleExcluirMetaVariavel = async (id) => {
    if (!window.confirm('Tem certeza que deseja remover esta meta variável do painel?')) return;
    try {
      const { error } = await supabase.from('metas_operacionais').delete().eq('id', id);
      if (error) throw error;
      carregarMetasE_CalcularReais();
    } catch (err) {
      alert('Erro ao remover meta: ' + err.message);
    }
  };

  const handleLancarProgressoMeta = async (meta) => {
    const inputValor = window.prompt(
      `Lançar progresso para: ${meta.nome_exibicao}\n\n` +
      `Progresso atual: ${meta.valor_atual || 0} ${meta.unidade}\n` +
      `Meta Alvo: ${meta.valor_meta} ${meta.unidade}\n\n` +
      `Digite o valor para SOMAR ao progresso atual\n(Ex: digite 5 para somar, ou -5 para subtrair):`, 
      "0"
    );
    
    if (inputValor === null) return; 
    
    const valorAdicional = parseFloat(inputValor.replace(',', '.'));
    if (isNaN(valorAdicional) || valorAdicional === 0) return;

    const novoValorAcumulado = (Number(meta.valor_atual) || 0) + valorAdicional;

    try {
      const { error } = await supabase.from('metas_operacionais')
        .update({ valor_atual: novoValorAcumulado, atualizado_por: usuarioLogado?.nome_completo })
        .eq('id', meta.id);
        
      if (error) throw error;
      carregarMetasE_CalcularReais(); 
    } catch (err) {
      alert('Erro ao atualizar progresso: ' + err.message);
    }
  };

  const handleSalvarRelatorioMes = async () => {
    try {
      const pFormatado = periodoInicio && periodoFim ? `${formatarDataBR(periodoInicio)} até ${formatarDataBR(periodoFim)}` : 'Geral / Histórico Completo';
      
      const relatorioData = {
        periodo: pFormatado,
        metricas: metricasReais,
        valores: valoresReais,
        criado_por: usuarioLogado?.nome_completo || 'Sistema',
        created_at: new Date().toISOString()
      };

      const { error } = await supabase.from('relatorios_mensais').insert([relatorioData]);
      if (error) {
        console.warn("Tabela relatorios_mensais não encontrada:", error.message);
        alert('Relatório processado com sucesso! (Dica: Crie a tabela relatorios_mensais no Supabase para guardar este histórico).');
      } else {
        alert(`📊 Relatório do período (${pFormatado}) salvo com sucesso no banco de dados para futuras análises!`);
      }
    } catch (e) {
      alert('Erro ao salvar o relatório.');
    }
  };

  const formatarDataBR = (dataString) => {
    if (!dataString) return '';
    const partes = dataString.split('-');
    if (partes.length === 3) return `${partes[2]}/${partes[1]}/${partes[0]}`;
    return dataString;
  };

  const determinarCategoria = (chave) => {
    if (['upm_minima', 'tempo_separacao', 'volume_diario'].includes(chave)) return 'Produtividade';
    if (['sla_atendimento', 'sla_total', 'sla_percentual'].includes(chave)) return 'SLA';
    if (['erro_separacao', 'divergencia_conferencia', 'retrabalho'].includes(chave)) return 'Qualidade';
    if (['sla_faturamento', 'sla_saida', 'tempo_cadastro'].includes(chave)) return 'Gestão';
    return 'Operação';
  };
  
  const formatarNomeExibicao = (chave) => chave.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');

  const PerformanceCard = ({ titulo, percentual, cor, isGeral = false }) => (
    <div className={`perf-card ${isGeral ? 'card-geral' : ''}`} style={{ height: isGeral ? '100%' : 'auto', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
      <div className="perf-header">
        <span className="perf-titulo" style={{ color: cor, fontSize: isGeral ? '1.1rem' : '0.85rem' }}>{titulo}</span>
      </div>
      <div className="perf-valor" style={{ fontSize: isGeral ? '2.5rem' : '1.8rem', marginTop: isGeral ? '10px' : '0' }}>{percentual}%</div>
      <div className="perf-status" style={{ color: cor, marginBottom: isGeral ? '20px' : '15px' }}>
        {percentual >= 100 ? 'Excelente' : percentual >= 80 ? 'Dentro da meta' : percentual > 0 ? 'Atenção' : 'Sem Produção'}
      </div>
      <div className="perf-barra-bg">
        <div className="perf-barra-fill" style={{ width: `${Math.min(100, percentual)}%`, backgroundColor: cor }}></div>
      </div>
    </div>
  );

  return (
    <div className="metas-container">
      <style>{`
        .perf-grid-duplo { display: grid; grid-template-columns: repeat(5, 1fr); gap: 15px; margin-bottom: 25px; }
        .card-geral { grid-column: 5; grid-row: 1 / span 2; }
        @media (max-width: 1100px) { .perf-grid-duplo { grid-template-columns: repeat(3, 1fr); } .card-geral { grid-column: span 3; grid-row: auto; } }
        @media (max-width: 768px) { .perf-grid-duplo { grid-template-columns: 1fr; } .card-geral { grid-column: 1; } }
      `}</style>

      {/* CABEÇALHO */}
      <div className="metas-header-wrapper">
        <div className="metas-header-text">
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={{ fontSize: '1.8rem' }}>🎯</span>
            <div>
              <h2 style={{ margin: 0, color: '#2c3e50', fontSize: '1.4rem' }}>Metas Operacionais</h2>
              <p style={{ margin: '2px 0 0 0', color: '#7f8c8d', fontSize: '0.9rem' }}>Acompanhe o desempenho da sua equipe e mantenha a operação no caminho certo.</p>
            </div>
          </div>
        </div>
        <div className="metas-header-actions">
          <div className="abas-metas">
            <button className={`btn-aba-meta ${abaAtiva === 'geral' ? 'ativa' : ''}`} onClick={() => setAbaAtiva('geral')}>
              Visão Geral
            </button>
            <button 
              className={`btn-aba-meta ${abaAtiva === 'configuracao' ? 'ativa' : ''}`} 
              onClick={() => { if(isGestor) setAbaAtiva('configuracao'); else alert('Acesso restrito a Encarregados e Administradores.'); }}
            >
              Configuração
            </button>
          </div>
          <button className="btn-voltar-metas" onClick={aoVoltar}>Voltar</button>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* ABA 1: VISÃO GERAL */}
      {/* ========================================================================= */}
      {abaAtiva === 'geral' && (
        <div className="conteudo-aba fade-in">

          <div className="secao-titulo">
            <h3>{usuarioFiltro ? `Performance de ${usuarioFiltro} (e Liderados)` : 'Performance Global da Equipe'}</h3>
            <span className="secao-sub" style={{ fontWeight: (!dataInicio && !dataFim && (periodoInicio || periodoFim)) ? 'bold' : 'normal', color: (!dataInicio && !dataFim && (periodoInicio || periodoFim)) ? '#8b5cf6' : '#64748b' }}>
              {dataInicio || dataFim 
                ? `Filtro Temporário Aplicado: ${formatarDataBR(dataInicio) || 'Início'} até ${formatarDataBR(dataFim) || 'Hoje'}` 
                : periodoInicio || periodoFim
                  ? `📅 Competência Oficial Vigente: ${formatarDataBR(periodoInicio) || 'Início'} até ${formatarDataBR(periodoFim) || 'Hoje'}`
                  : 'Cálculo Baseado no Histórico Geral (Configure um ciclo de avaliação oficial na aba Configurações)'}
            </span>
          </div>

          <div className="perf-grid-duplo">
            {/* LINHA 1: OPERACIONAL */}
            <PerformanceCard titulo="Produtividade (Op)" percentual={metricasReais.produtividade} cor="#2ecc71" />
            <PerformanceCard titulo="SLA Atendimento (Op)" percentual={metricasReais.sla} cor="#3498db" />
            <PerformanceCard titulo="Qualidade (Op)" percentual={metricasReais.qualidade} cor="#f1c40f" />
            <PerformanceCard titulo="Operação (Op)" percentual={metricasReais.operacao} cor="#9b59b6" />
            
            {/* CARD DUPLO GERAL */}
            <PerformanceCard titulo="Desempenho Geral" percentual={metricasReais.geral} cor="#34495e" isGeral={true} />
            
            {/* LINHA 2: GESTÃO */}
            <PerformanceCard titulo="SLA Faturamento (Gestão)" percentual={metricasReais.gestao_faturamento} cor="#e67e22" />
            <PerformanceCard titulo="SLA Saída (Gestão)" percentual={metricasReais.gestao_saida} cor="#e67e22" />
            <PerformanceCard titulo="Tempo Cadastro (Gestão)" percentual={metricasReais.gestao_cadastro} cor="#16a085" />
            <div style={{ visibility: 'hidden', display: window.innerWidth > 1100 ? 'block' : 'none' }}></div>
          </div>

          <div className="dash-body-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))' }}>
            
            <div className="painel-card">
              <div className="card-header">
                <h4>Saúde da Operação</h4>
                <span>Indicadores críticos do dia (Tempo Real)</span>
              </div>
              <div className="saude-lista">
                <div className="saude-item">
                  <span className="s-icon">📄</span> <span className="s-label">Requisições pendentes</span>
                  <span className="s-val">{saude.reqPendentes}</span> <span className={`s-tag ${saude.reqPendentes > 10 ? 'tag-atencao' : 'tag-normal'}`}>{saude.reqPendentes > 10 ? 'Atenção' : 'Normal'}</span>
                </div>
                <div className="saude-item">
                  <span className="s-icon">⏱</span> <span className="s-label">Requisições vencidas</span>
                  <span className="s-val">{saude.reqVencidas}</span> <span className={`s-tag ${saude.reqVencidas > 0 ? 'tag-critico' : 'tag-normal'}`}>{saude.reqVencidas > 0 ? 'Crítico' : 'Normal'}</span>
                </div>
                <div className="saude-item">
                  <span className="s-icon">🔄</span> <span className="s-label">Reposições pendentes</span>
                  <span className="s-val">{saude.repoPendentes}</span> <span className={`s-tag ${saude.repoPendentes > 5 ? 'tag-atencao' : 'tag-normal'}`}>{saude.repoPendentes > 5 ? 'Atenção' : 'Normal'}</span>
                </div>
                <div className="saude-item">
                  <span className="s-icon">🚛</span> <span className="s-label">Recebimentos pendentes</span>
                  <span className="s-val">{saude.recPendentes}</span> <span className={`s-tag ${saude.recPendentes > 2 ? 'tag-atencao' : 'tag-normal'}`}>{saude.recPendentes > 2 ? 'Atenção' : 'Normal'}</span>
                </div>
                <div className="saude-item">
                  <span className="s-icon">⚠️</span> <span className="s-label">Divergências pendentes</span>
                  <span className="s-val">{saude.divergencias}</span> <span className={`s-tag ${saude.divergencias > 0 ? 'tag-critico' : 'tag-normal'}`}>{saude.divergencias > 0 ? 'Crítico' : 'Normal'}</span>
                </div>
                <div className="saude-item">
                  <span className="s-icon">✔️</span> <span className="s-label">Autorizações pendentes</span>
                  <span className="s-val">{saude.authPendentes}</span> <span className={`s-tag ${saude.authPendentes > 0 ? 'tag-atencao' : 'tag-normal'}`}>{saude.authPendentes > 0 ? 'Atenção' : 'Normal'}</span>
                </div>
              </div>
            </div>

            <div className="painel-card" style={{ borderTop: '4px solid #8b5cf6' }}>
              <div className="card-header">
                <h4 style={{ color: '#7c3aed' }}>⭐ Metas Variáveis e Desafios</h4>
                <span>Progresso das campanhas vigentes.</span>
              </div>
              <div className="saude-lista" style={{ marginTop: '10px' }}>
                {metasVariaveisList.length > 0 ? (
                  metasVariaveisList.map(mv => {
                    const progressoNum = Number(mv.valor_atual) || 0;
                    const metaNum = Number(mv.valor_meta) || 1;
                    const perc = Math.min(100, Math.round((progressoNum / metaNum) * 100));

                    return (
                      <div key={mv.id} className="saude-item" style={{ flexDirection: 'column', alignItems: 'flex-start', gap: '8px', padding: '12px 0' }}>
                        <div style={{ display: 'flex', width: '100%', justifyContent: 'space-between', alignItems: 'center' }}>
                          <strong style={{ color: '#1e293b', fontSize: '0.95rem' }}>{mv.nome_exibicao}</strong>
                          {isGestor && (
                            <button 
                              onClick={() => handleLancarProgressoMeta(mv)} 
                              style={{ background: '#f1f5f9', border: '1px solid #cbd5e1', padding: '3px 8px', borderRadius: '4px', fontSize: '0.75rem', cursor: 'pointer', fontWeight: 'bold', color: '#475569' }}
                            >
                              + Lançar
                            </button>
                          )}
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', fontSize: '0.85rem', color: '#64748b' }}>
                          <span>Progresso: <strong>{progressoNum}</strong> / {mv.valor_meta} {mv.unidade}</span>
                          <span style={{ color: '#7c3aed', fontWeight: 'bold' }}>{perc}%</span>
                        </div>
                        <div style={{ width: '100%', height: '6px', backgroundColor: '#ede9fe', borderRadius: '4px', overflow: 'hidden' }}>
                          <div style={{ width: `${perc}%`, backgroundColor: '#8b5cf6', height: '100%', transition: 'width 0.5s' }}></div>
                        </div>
                      </div>
                    )
                  })
                ) : (
                  <div style={{ textAlign: 'center', padding: '30px 10px', color: '#94a3b8', fontStyle: 'italic', fontSize: '0.9rem' }}>
                    Nenhum desafio ativo. Configure na aba ao lado.
                  </div>
                )}
              </div>
            </div>

            <div className="painel-card">
              <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between' }}>
                <div>
                  <h4>Ranking de Colaboradores</h4>
                  <span>Baseado na UPM vs. Meta Atual ({valoresEditados.upm_minima})</span>
                </div>
              </div>
              <table className="tabela-ranking-limpa">
                <thead>
                  <tr><th>#</th><th>Colaborador</th><th>UPM Real</th><th>Resultado</th></tr>
                </thead>
                <tbody>
                  {rankingGeralReal.slice(0, 10).map((colab, idx) => {
                    const metaValida = valoresEditados.upm_minima > 0 ? valoresEditados.upm_minima : 1;
                    const upmFormatado = Number(colab.upm) || 0;
                    const perc = Math.round((upmFormatado / metaValida) * 100) || 0;
                    
                    return (
                      <tr key={idx}>
                        <td>{idx === 0 ? '🥇' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : idx + 1}</td>
                        <td>{colab.nome}</td>
                        <td><strong>{upmFormatado}</strong></td>
                        <td style={{ color: perc >= 100 ? '#27ae60' : '#e67e22', fontWeight: 'bold' }}>{perc}%</td>
                      </tr>
                    );
                  })}
                  {rankingGeralReal.length === 0 && <tr><td colSpan="4" style={{textAlign:'center', padding:'20px'}}>Nenhum dado encontrado para o período/usuário selecionado.</td></tr>}
                </tbody>
              </table>
            </div>
          </div>

          <div style={{ marginTop: '30px', display: 'flex', justifyContent: 'flex-end', paddingBottom: '20px' }}>
            <button 
              onClick={handleSalvarRelatorioMes}
              style={{ backgroundColor: '#10b981', color: 'white', border: 'none', padding: '12px 25px', borderRadius: '8px', fontWeight: 'bold', fontSize: '1rem', cursor: 'pointer', boxShadow: '0 4px 6px rgba(16, 185, 129, 0.2)', transition: 'background 0.2s' }}
            >
              💾 Salvar Relatório do Período no Banco
            </button>
          </div>

        </div>
      )}

      {/* ========================================================================= */}
      {/* ABA 2: CONFIGURAÇÃO E HISTÓRICO */}
      {/* ========================================================================= */}
      {abaAtiva === 'configuracao' && (
        <div className="conteudo-aba fade-in">
          
          <div className="painel-card" style={{ marginBottom: '30px', borderLeft: '4px solid #3b82f6', padding: '20px' }}>
            <div className="card-header" style={{ marginBottom: '15px' }}>
              <h3 style={{ margin: 0, color: '#1e293b' }}>📅 Filtros de Visão e Período Oficial</h3>
              <span className="secao-sub">Defina o ciclo de avaliação oficial (que salva no banco) ou aplique um filtro temporário de equipe para a aba de Visão Geral.</span>
            </div>
            
            <div style={{ display: 'flex', alignItems: 'flex-end', gap: '15px', flexWrap: 'wrap', borderBottom: '1px solid #e2e8f0', paddingBottom: '20px', marginBottom: '20px' }}>
              <div className="input-row">
                <label style={{ fontWeight: 'bold', color: '#3b82f6' }}>Travar Período Oficial (Data Início)</label>
                <input type="date" value={editPeriodoInicio} onChange={e => setEditPeriodoInicio(e.target.value)} style={{ padding: '8px', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '1rem' }} />
              </div>
              <div className="input-row">
                <label style={{ fontWeight: 'bold', color: '#3b82f6' }}>Travar Período Oficial (Data Fim)</label>
                <input type="date" value={editPeriodoFim} onChange={e => setEditPeriodoFim(e.target.value)} style={{ padding: '8px', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '1rem' }} />
              </div>
              <button 
                onClick={handleSalvarPeriodoVigente} 
                disabled={salvando}
                style={{ backgroundColor: '#3b82f6', color: 'white', border: 'none', padding: '9px 20px', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer', height: '38px' }}
              >
                {salvando ? '⏳ Salvando...' : '🔒 Travar Período Oficial no Banco'}
              </button>
            </div>

            {/* FILTROS LOCAIS (Temporários para analisar a operação) */}
            <div style={{ display: 'flex', alignItems: 'flex-end', gap: '15px', flexWrap: 'wrap' }}>
              <div className="input-row" style={{ flex: '1 1 200px' }}>
                <label>👤 Analisar Desempenho de Equipe (Liderança):</label>
                <select value={usuarioFiltro} onChange={e => setUsuarioFiltro(e.target.value)} style={{ padding: '8px 10px', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '0.9rem', outline: 'none' }}>
                  <option value="">(Toda a Operação Geral)</option>
                  {usuariosLista.map(u => <option key={u.nome_completo} value={u.nome_completo}>{u.nome_completo} (Líder: {u.encarregado_responsavel || 'Nenhum'})</option>)}
                </select>
              </div>

              <div className="input-row">
                <label>De (Temp):</label>
                <input type="date" value={dataInicio} onChange={e => setDataInicio(e.target.value)} style={{ padding: '8px', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '0.9rem' }} />
              </div>
              <div className="input-row">
                <label>Até (Temp):</label>
                <input type="date" value={dataFim} onChange={e => setDataFim(e.target.value)} style={{ padding: '8px', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '0.9rem' }} />
              </div>
              
              <div style={{ display: 'flex', gap: '10px' }}>
                <button onClick={handleFiltrarPorPeriodo} style={{ backgroundColor: '#10b981', color: 'white', border: 'none', padding: '9px 20px', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer', height: '38px' }}>
                  🔍 Aplicar Filtros Pessoais
                </button>
                {(dataInicio || dataFim || usuarioFiltro) && (
                  <button onClick={handleLimparFiltroData} style={{ backgroundColor: '#e2e8f0', color: '#475569', border: 'none', padding: '9px 20px', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer', height: '38px' }}>
                    Limpar
                  </button>
                )}
              </div>
            </div>
          </div>

          <div className="secao-titulo" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <h3>Metas Fixas Operacionais</h3>
              <span className="secao-sub">Pilares globais permanentes da operação logística de separação e estoque. As metas podem ser ajustadas pelo gestor.</span>
            </div>
            <button className="btn-salvar-metas" onClick={handleSalvarMetas} disabled={salvando || carregandoMetas}>
              {salvando ? '⏳ Salvando...' : '💾 Salvar Alterações no Banco'}
            </button>
          </div>

          <div className="config-grid">
            <div className="config-card">
              <div className="cc-header" style={{ color: '#2ecc71', backgroundColor: '#eafaf1' }}>📦 Produtividade (Fixa)</div>
              <div className="cc-body">
                <div className="input-row">
                  <label>UPM mínima</label>
                  <div className="input-box"><input type="number" step="0.1" value={valoresEditados.upm_minima} onChange={e => setValoresEditados({...valoresEditados, upm_minima: e.target.value})} /><span>UPM</span></div>
                </div>
                <div className="input-row">
                  <label>Tempo de separação</label>
                  <div className="input-box"><input type="number" value={valoresEditados.tempo_separacao} onChange={e => setValoresEditados({...valoresEditados, tempo_separacao: e.target.value})} /><span>min</span></div>
                </div>
              </div>
            </div>

            <div className="config-card">
              <div className="cc-header" style={{ color: '#3498db', backgroundColor: '#ebf5fb' }}>⏱️ SLA / Atendimento (Fixa)</div>
              <div className="cc-body">
                <div className="input-row">
                  <label>Tempo total da requisição</label>
                  <div className="input-box"><input type="number" value={valoresEditados.sla_total} onChange={e => setValoresEditados({...valoresEditados, sla_total: e.target.value})} /><span>min</span></div>
                </div>
                <div className="input-row">
                  <label>% dentro do SLA</label>
                  <div className="input-box"><input type="number" value={valoresEditados.sla_percentual} onChange={e => setValoresEditados({...valoresEditados, sla_percentual: e.target.value})} /><span>%</span></div>
                </div>
              </div>
            </div>

            <div className="config-card">
              <div className="cc-header" style={{ color: '#f1c40f', backgroundColor: '#fef9e7' }}>🎯 Qualidade (Fixa)</div>
              <div className="cc-body">
                <div className="input-row">
                  <label>Erro de separação</label>
                  <div className="input-box"><input type="number" step="0.1" value={valoresEditados.erro_separacao} onChange={e => setValoresEditados({...valoresEditados, erro_separacao: e.target.value})} /><span>%</span></div>
                </div>
                <div className="input-row">
                  <label>Divergência na conferência</label>
                  <div className="input-box"><input type="number" step="0.1" value={valoresEditados.divergencia_conferencia} onChange={e => setValoresEditados({...valoresEditados, divergencia_conferencia: e.target.value})} /><span>%</span></div>
                </div>
              </div>
            </div>

            <div className="config-card">
              <div className="cc-header" style={{ color: '#9b59b6', backgroundColor: '#f5eef8' }}>🚚 Operação (Fixa)</div>
              <div className="cc-body">
                <div className="input-row">
                  <label>Recebimento (total)</label>
                  <div className="input-box"><input type="number" value={valoresEditados.recebimento_total} onChange={e => setValoresEditados({...valoresEditados, recebimento_total: e.target.value})} /><span>min</span></div>
                </div>
              </div>
            </div>
          </div>

          <div className="secao-titulo" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '30px' }}>
            <div>
              <h3>Metas Fixas Gestão (Liderança)</h3>
              <span className="secao-sub">Pilares de tempo para faturamento, saída e cadastro no sistema. Aplica-se aos encarregados e administradores.</span>
            </div>
          </div>

          <div className="config-grid">
            <div className="config-card">
              <div className="cc-header" style={{ color: '#e67e22', backgroundColor: '#fdf2e9' }}>💻 Faturamento e Saída (Gestão)</div>
              <div className="cc-body">
                <div className="input-row">
                  <label>Tempo p/ Faturamento (pós-separação)</label>
                  <div className="input-box"><input type="number" value={valoresEditados.sla_faturamento} onChange={e => setValoresEditados({...valoresEditados, sla_faturamento: e.target.value})} /><span>min</span></div>
                </div>
                <div className="input-row">
                  <label>Tempo p/ Saída (pós-separação)</label>
                  <div className="input-box"><input type="number" value={valoresEditados.sla_saida} onChange={e => setValoresEditados({...valoresEditados, sla_saida: e.target.value})} /><span>min</span></div>
                </div>
              </div>
            </div>

            <div className="config-card">
              <div className="cc-header" style={{ color: '#16a085', backgroundColor: '#e8f8f5' }}>🏷️ Cadastro de Mercadorias (Gestão)</div>
              <div className="cc-body">
                <div className="input-row">
                  <label>Tempo p/ Cadastro (pós-recebimento)</label>
                  <div className="input-box"><input type="number" value={valoresEditados.tempo_cadastro} onChange={e => setValoresEditados({...valoresEditados, tempo_cadastro: e.target.value})} /><span>min</span></div>
                </div>
              </div>
            </div>
          </div>

          <div className="painel-card" style={{ marginTop: '30px', borderTop: '4px solid #8b5cf6' }}>
            <div className="card-header">
              <h3 style={{ color: '#7c3aed', margin: 0 }}>⭐ Gerenciamento de Metas Variáveis</h3>
              <span className="secao-sub">Crie desafios ou metas operacionais diversas (Limpeza, Reciclagem, Pontualidade). O progresso será alimentado no painel da Visão Geral.</span>
            </div>

            <form onSubmit={handleAdicionarMetaVariavel} style={{ display: 'flex', flexWrap: 'wrap', gap: '15px', alignItems: 'flex-end', marginTop: '20px', backgroundColor: '#f8fafc', padding: '15px', borderRadius: '8px' }}>
              <div className="input-row" style={{ flex: '1 1 200px' }}>
                <label>Título da Meta *</label>
                <input type="text" placeholder="Ex: Limpeza do Setor 1" value={novaMetaTitulo} onChange={e => setNovaMetaTitulo(e.target.value)} style={{ padding: '8px', border: '1px solid #cbd5e1', borderRadius: '6px' }} />
              </div>
              <div className="input-row" style={{ flex: '1 1 150px' }}>
                <label>Unidade / Formato *</label>
                <input type="text" placeholder="Ex: %, R$, caixas, dias" value={novaMetaDesc} onChange={e => setNovaMetaDesc(e.target.value)} style={{ padding: '8px', border: '1px solid #cbd5e1', borderRadius: '6px' }} />
              </div>
              <div className="input-row" style={{ flex: '1 1 120px' }}>
                <label>Valor Alvo *</label>
                <input type="number" step="0.1" placeholder="Ex: 100" value={novaMetaValor} onChange={e => setNovaMetaValor(e.target.value)} style={{ padding: '8px', border: '1px solid #cbd5e1', borderRadius: '6px' }} />
              </div>
              <button type="submit" style={{ backgroundColor: '#7c3aed', color: 'white', border: 'none', padding: '9px 20px', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer', height: '35px' }}>➕ Criar Meta</button>
            </form>

            <div style={{ marginTop: '20px' }}>
              <h4 style={{ fontSize: '0.95rem', color: '#334155', marginBottom: '10px' }}>Metas Variáveis Ativas:</h4>
              <table className="tabela-ranking-limpa">
                <thead>
                  <tr><th>Título</th><th>Progresso Atual</th><th>Alvo / Unidade</th><th>Ação</th></tr>
                </thead>
                <tbody>
                  {metasVariaveisList.map(mv => (
                    <tr key={mv.id}>
                      <td><strong>{mv.nome_exibicao}</strong></td>
                      <td style={{ color: '#27ae60', fontWeight: 'bold' }}>{mv.valor_atual || 0}</td>
                      <td>{mv.valor_meta} {mv.unidade}</td>
                      <td>
                        <button onClick={() => handleExcluirMetaVariavel(mv.id)} style={{ backgroundColor: '#fee2e2', color: '#991b1b', border: 'none', padding: '6px 12px', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' }}>🗑️ Excluir</button>
                      </td>
                    </tr>
                  ))}
                  {metasVariaveisList.length === 0 && (
                    <tr><td colSpan="4" style={{ textAlign: 'center', padding: '20px', color: '#94a3b8' }}>Nenhuma meta variável cadastrada.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          <div className="footer-grid" style={{ marginTop: '30px' }}>
            <div className="painel-card" style={{ flex: 2 }}>
              <div className="card-header">
                <h4>⚙️ Histórico de Metas</h4>
                <span>Acompanhe as alterações e evolução das metas ao longo do tempo. (Módulo Fase 2)</span>
              </div>
              <table className="tabela-historico-metas">
                <thead>
                  <tr><th>Data</th><th>Categoria</th><th>Indicador</th><th>Valor</th><th>Unidade</th><th>Alterado por</th></tr>
                </thead>
                <tbody>
                  <tr><td>01/09/2026</td><td>Produtividade</td><td>UPM mínima</td><td>8.00</td><td>UPM</td><td>Admin</td></tr>
                  <tr><td>01/09/2026</td><td>Qualidade</td><td>Erro de separação</td><td>1.00</td><td>%</td><td>Admin</td></tr>
                  <tr><td>15/08/2026</td><td>SLA</td><td>Tempo total da requisição</td><td>20.00</td><td>min</td><td>Admin</td></tr>
                  <tr><td>01/08/2026</td><td>Operação</td><td>Reposição (total)</td><td>30.00</td><td>min</td><td>Admin</td></tr>
                </tbody>
              </table>
            </div>
          </div>

        </div>
      )}
    </div>
  );
}