import { calcularRanking } from '../../../painel/utils/calculadoraRanking';

const parseSafeDate = (value) => {
  if (!value) return 0;
  if (typeof value === 'number') return value;
  if (typeof value === 'string') {
    const ts = Number(value);
    if (!isNaN(ts) && ts > 1000000000) return ts;
    const d = new Date(value).getTime();
    if (!isNaN(d)) return d;
  }
  return 0;
};

export const processarMetricasReais = (metasConfig, dInicio, dFim, uFiltro = '', usuariosLista = [], reqsRaw = [], recsRaw = [], divsRaw = []) => {
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

  const tsInicioFiltro = dInicio ? new Date(`${dInicio}T00:00:00`).getTime() : 0;
  const tsFimFiltro = dFim ? new Date(`${dFim}T23:59:59`).getTime() : Infinity;

  const reqsNormalizadas = (reqsRaw || [])
    .map(r => ({ ...r, metricasSeparacao: r.metricas_separacao, listaItens: r.lista_itens }))
    .filter(r => {
      if (!r.metricasSeparacao) return false;
      let ts = parseSafeDate(r.metricasSeparacao.finalizadoEm);
      if (ts === 0 || (tsInicioFiltro && ts < tsInicioFiltro) || (tsFimFiltro && ts > tsFimFiltro)) return false;
      return true;
    });

  const recsFiltrados = (recsRaw || []).filter(r => {
    if (!r.metricas_recebimento) return false;
    let ts = parseSafeDate(r.metricas_recebimento.finalizadoEm);
    if (ts === 0 || (tsInicioFiltro && ts < tsInicioFiltro) || (tsFimFiltro && ts > tsFimFiltro)) return false;
    return true;
  });

  const rankingCompletoGlobal = calcularRanking(reqsNormalizadas, recsFiltrados, null, null, uFiltro, usuariosLista);

  const upmMedia = rankingCompletoGlobal.length > 0 ? (rankingCompletoGlobal.reduce((acc, curr) => acc + curr.upm, 0) / rankingCompletoGlobal.length) : 0;
  let prodPerc = rankingCompletoGlobal.length > 0 ? (metaUpm > 0 ? (upmMedia / metaUpm) * 100 : 100) : 0;
  if (isNaN(prodPerc)) prodPerc = 0;

  let reqsNoPrazo = 0; let totalReqsValidas = 0;
  let fatNoPrazo = 0; let totalFat = 0;
  let saiNoPrazo = 0; let totalSai = 0;

  reqsNormalizadas.forEach(r => {
    const metricas = r.metricasSeparacao || {};
    const historico = r.historico || {};

    let nomeResponsavel = metricas.responsavel || historico['Em Separação'] || historico['Separado'] || '';
    const nomeNormalizado = nomeResponsavel.trim().toLowerCase();
    const fatName = (historico['Faturamento'] || '').trim().toLowerCase();
    const saiName = (historico['Saída de produtos'] || '').trim().toLowerCase();
    const conName = (historico['Concluída'] || '').trim().toLowerCase();

    let atuouNestaNota = true;
    if (usuariosValidos.length > 0) {
      atuouNestaNota = usuariosValidos.includes(nomeNormalizado) || usuariosValidos.includes(fatName) || usuariosValidos.includes(saiName) || usuariosValidos.includes(conName);
    }

    let tsCriacao = parseSafeDate(r.timestamp_criacao);
    const tsFinalizado = parseSafeDate(metricas.finalizadoEm);

    // SLA OPERAÇÃO (Atendimento)
    if (atuouNestaNota && tsFinalizado > 0 && tsCriacao > 0) {
      totalReqsValidas++;
      if (((tsFinalizado - tsCriacao) / 60000) <= metaSlaTotalMin) reqsNoPrazo++;
    }

    // SLA GESTÃO: FATURAMENTO
    const isFatUser = uFiltro ? usuariosValidos.includes(fatName) : true;
    if (isFatUser && fatName) { 
      totalFat++;
      if (historico.timestamp_faturamento && tsFinalizado > 0) {
        let tsFat = parseSafeDate(historico.timestamp_faturamento);
        // Exige o dado real para aprovar o SLA
        if (tsFat > 0 && ((tsFat - tsFinalizado) / 60000) <= (metasConfig.sla_faturamento || 30)) fatNoPrazo++;
      }
    }

    // SLA GESTÃO: SAÍDA
    const isSaiUser = uFiltro ? usuariosValidos.includes(saiName) : true;
    if (isSaiUser && saiName) { 
      totalSai++;
      if (historico.timestamp_saida) {
        let tsBaseSaida = parseSafeDate(historico.timestamp_faturamento) || tsFinalizado;
        let tsSaida = parseSafeDate(historico.timestamp_saida);
        // Exige o dado real para aprovar o SLA
        if (tsBaseSaida > 0 && tsSaida > 0 && ((tsSaida - tsBaseSaida) / 60000) <= (metasConfig.sla_saida || 30)) saiNoPrazo++;
      }
    }
  });

  let slaPerc = totalReqsValidas > 0 ? (reqsNoPrazo / totalReqsValidas) * 100 : 0;

  let divergenciasConferidas = divsRaw ? divsRaw.filter(d => {
    let ts = parseSafeDate(d.timestamp_criacao);
    if (ts === 0 || (tsInicioFiltro && ts < tsInicioFiltro) || (tsFimFiltro && ts > tsFimFiltro)) return false;
    return true;
  }).length : 0;
  
  const taxaErro = totalReqsValidas > 0 ? (divergenciasConferidas / totalReqsValidas) * 100 : 0;
  const qualidadePerc = totalReqsValidas > 0 ? Math.max(0, 100 - taxaErro) : 0;

  let recsNoPrazo = 0; let totalRecs = 0; let recTempoMedioMin = 0; let tempoTotalRec = 0;
  let cadNoPrazo = 0; let totalCad = 0;

  recsFiltrados.forEach(r => {
    const respCad = (r.responsavel_cadastro || '').trim().toLowerCase();
    const respRec = (r.responsavel_recebedor || '').trim().toLowerCase();
    let atuouNoRecebimento = true;
    if (usuariosValidos.length > 0) {
      atuouNoRecebimento = usuariosValidos.includes(respCad) || usuariosValidos.includes(respRec);
    }

    const metricas = r.metricas_recebimento || {};
    const tsFinalizado = parseSafeDate(metricas.finalizadoEm);

    // SLA OPERAÇÃO (Recebimento)
    if (atuouNoRecebimento && metricas.tempoTotalSegundos > 0) {
      totalRecs++;
      const min = metricas.tempoTotalSegundos / 60;
      tempoTotalRec += min;
      if (min <= metaRecMin) recsNoPrazo++;
    }

    // SLA GESTÃO: CADASTRO
    if (respCad) { 
      if (uFiltro ? usuariosValidos.includes(respCad) : true) {
        totalCad++;
        if (metricas.timestamp_cadastro && tsFinalizado > 0) {
           let tsCadastroBase = parseSafeDate(metricas.timestamp_cadastro);
           // Exige o dado real para aprovar o SLA
           if (tsCadastroBase > 0 && ((tsCadastroBase - tsFinalizado) / 60000) <= (metasConfig.tempo_cadastro || 120)) cadNoPrazo++;
        }
      }
    }
  });

  if (totalRecs > 0) recTempoMedioMin = tempoTotalRec / totalRecs;
  
  let operacaoPerc = totalRecs > 0 ? (recsNoPrazo / totalRecs) * 100 : 0;
  const gestaoFatPerc = totalFat > 0 ? Math.round((fatNoPrazo / totalFat) * 100) : 0;
  const gestaoSaiPerc = totalSai > 0 ? Math.round((saiNoPrazo / totalSai) * 100) : 0;
  const gestaoCadPerc = totalCad > 0 ? Math.round((cadNoPrazo / totalCad) * 100) : 0;

  let geralPerc = (Math.min(100, prodPerc) + Math.min(100, slaPerc) + qualidadePerc + Math.min(100, operacaoPerc) + gestaoFatPerc + gestaoSaiPerc + gestaoCadPerc) / 7;

  return {
    metricasReais: {
      produtividade: Math.min(100, Math.round(prodPerc)) || 0,
      sla: Math.round(slaPerc) || 0,
      qualidade: Number(qualidadePerc.toFixed(1)) || 0,
      operacao: Math.round(operacaoPerc) || 0,
      gestao_faturamento: gestaoFatPerc,
      gestao_saida: gestaoSaiPerc,
      gestao_cadastro: gestaoCadPerc,
      geral: Math.round(geralPerc) || 0
    },
    valoresReais: {
      upm: Number(upmMedia.toFixed(1)) || 0,
      sla_atingido: Math.round(slaPerc) || 0,
      erro: Number(taxaErro.toFixed(1)) || 0,
      tempo_operacao: Math.round(recTempoMedioMin) || 0
    },
    rankingGeralReal: rankingCompletoGlobal
  };
};