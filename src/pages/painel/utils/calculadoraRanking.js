export const calcularRanking = (requisicoes, recebimentos = [], dataInicioRanking, dataFimRanking) => {
  const pontuacoes = {};

  // ===============================================
  // 1. PROCESSAR REQUISIÇÕES (SEPARAÇÃO INTERNA)
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
    const itensFisicos = req.metricasSeparacao.totalItensFisicos || (req.listaItens ? req.listaItens.reduce((acc, item) => acc + Number(item.quantidade), 0) : 0);
    
    const upmReq = (itensFisicos / tempoSeg) * 60;
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
    const upmReqFormatado = rec.metricas_recebimento.upm || 0;
    const ptsDestaReq = rec.metricas_recebimento.pontosGanhos || 0; // Já foi multiplicado por 1.5 no componente

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