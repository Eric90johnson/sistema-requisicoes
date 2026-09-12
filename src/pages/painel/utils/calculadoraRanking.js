export const calcularRanking = (requisicoes, recebimentos = [], dataInicioRanking, dataFimRanking) => {
  const pontuacoes = {};

  // ===============================================
  // 1. PROCESSAR REQUISIÇÕES (SEPARAÇÃO INTERNA E EXTERNA)
  // ===============================================
  const reqsValidas = requisicoes.filter(req => {
    if (!req.metricasSeparacao) return false;
    
    if (dataInicioRanking || dataFimRanking) {
      const dataFimReal = req.metricasSeparacao.finalizadoEm ? new Date(req.metricasSeparacao.finalizadoEm) : null;
      if (!dataFimReal) return false;
      
      if (dataInicioRanking) {
        const inicio = new Date(`${dataInicioRanking}T00:00:00`);
        if (dataFimReal < inicio) return false;
      }
      if (dataFimRanking) {
        const fim = new Date(`${dataFimRanking}T23:59:59`);
        if (dataFimReal > fim) return false;
      }
    }
    return true;
  });

  reqsValidas.forEach(req => {
    const resp = req.metricasSeparacao.responsavel;
    if (!resp) return;

    const tempoSeg = req.metricasSeparacao.tempoTotalSegundos || 1; 
    
    // Tenta puxar o total físico salvo no banco (notas novas)
    // Se não tiver (notas velhas), tenta contar pela lista de itens (se estiver na memória)
    // Se a lista não estiver devido à economia de banda, usa a quantidade de SKUs (req.itens) como fallback temporário
    const itensFisicos = req.metricasSeparacao.totalItensFisicos || (req.listaItens ? req.listaItens.reduce((acc, item) => acc + Number(item.quantidade), 0) : req.itens || 0);
    
    const upmReq = tempoSeg > 0 ? ((itensFisicos / tempoSeg) * 60) : 0;
    const upmReqFormatado = Number(upmReq.toFixed(1));
    let ptsDestaReq = Math.round(itensFisicos * upmReqFormatado);

    const isReposicaoInterna = req.motivo === 'Reposição Interna' || (req.origem && req.destino && req.origem === req.destino);
    if (isReposicaoInterna) {
      ptsDestaReq *= 2;
    }

    const nomes = resp.split('+').map(n => n.trim());
    nomes.forEach(nome => {
      if (!nome) return;
      if (!pontuacoes[nome]) {
        pontuacoes[nome] = { nome, totalItens: 0, totalSegundos: 0, qtdSeparacoes: 0, pontuacaoAcumulada: 0, historicoReqs: [] };
      }
      pontuacoes[nome].totalItens += itensFisicos;
      pontuacoes[nome].totalSegundos += tempoSeg;
      pontuacoes[nome].qtdSeparacoes += 1;
      pontuacoes[nome].pontuacaoAcumulada += ptsDestaReq; 

      pontuacoes[nome].historicoReqs.push({
        id: req.id,
        tempoSegundos: tempoSeg,
        itensFisicos: itensFisicos,
        upm: upmReqFormatado,
        pontos: ptsDestaReq,
        motivo: req.motivo || '-',
        isReposicaoInterna: isReposicaoInterna
      });
    });
  });

  // ===============================================
  // 2. PROCESSAR RECEBIMENTOS (CONFERÊNCIA DE NOTA - PESO 1.5x)
  // ===============================================
  const recsValidos = recebimentos.filter(rec => {
    if (!rec.metricas_recebimento) return false;
    
    if (dataInicioRanking || dataFimRanking) {
      const dataFimReal = rec.metricas_recebimento.finalizadoEm ? new Date(rec.metricas_recebimento.finalizadoEm) : null;
      if (!dataFimReal) return false;
      
      if (dataInicioRanking) {
        const inicio = new Date(`${dataInicioRanking}T00:00:00`);
        if (dataFimReal < inicio) return false;
      }
      if (dataFimRanking) {
        const fim = new Date(`${dataFimRanking}T23:59:59`);
        if (dataFimReal > fim) return false;
      }
    }
    return true;
  });

  recsValidos.forEach(rec => {
    const resp = rec.metricas_recebimento.responsavel;
    if (!resp) return;

    const tempoSeg = rec.metricas_recebimento.tempoTotalSegundos || 1;
    const itensFisicos = rec.metricas_recebimento.totalItensFisicos || 0;
    
    const upmCalc = tempoSeg > 0 ? ((itensFisicos / tempoSeg) * 60) : 0;
    const upmReqFormatado = rec.metricas_recebimento.upm || Number(upmCalc.toFixed(1));
    
    // 🚀 CORREÇÃO RETROATIVA DE PONTOS:
    // Se o recebimento foi feito antes de hoje, ele não tem 'pontosGanhos' no banco.
    // Nós calculamos retroativamente para o usuário não perder a pontuação!
    let ptsDestaReq = rec.metricas_recebimento.pontosGanhos;
    if (ptsDestaReq === undefined) {
      ptsDestaReq = Math.round(itensFisicos * upmReqFormatado * 1.5);
    }

    const nomes = resp.split('+').map(n => n.trim());
    nomes.forEach(nome => {
      if (!nome) return;
      if (!pontuacoes[nome]) {
        pontuacoes[nome] = { nome, totalItens: 0, totalSegundos: 0, qtdSeparacoes: 0, pontuacaoAcumulada: 0, historicoReqs: [] };
      }
      pontuacoes[nome].totalItens += itensFisicos;
      pontuacoes[nome].totalSegundos += tempoSeg;
      pontuacoes[nome].qtdSeparacoes += 1;
      pontuacoes[nome].pontuacaoAcumulada += ptsDestaReq;

      pontuacoes[nome].historicoReqs.push({
        id: rec.numero_relatorio,
        tempoSegundos: tempoSeg,
        itensFisicos: itensFisicos,
        upm: upmReqFormatado,
        pontos: ptsDestaReq,
        motivo: '📦 Recebimento Matriz (x1.5)',
        isReposicaoInterna: false
      });
    });
  });

  // ===============================================
  // 3. CONSOLIDAÇÃO DO RANKING
  // ===============================================
  const rankingFinal = Object.values(pontuacoes).map(p => {
    const upmGlobal = p.totalSegundos > 0 ? ((p.totalItens / p.totalSegundos) * 60) : 0;
    const upmFormatado = Number(upmGlobal.toFixed(1));

    return {
      nome: p.nome,
      upm: upmFormatado,
      totalItens: p.totalItens,
      qtdSeparacoes: p.qtdSeparacoes,
      pontuacao: p.pontuacaoAcumulada,
      historicoReqs: p.historicoReqs.sort((a, b) => b.pontos - a.pontos)
    };
  });

  rankingFinal.sort((a, b) => b.pontuacao - a.pontuacao); 
  return rankingFinal;
};