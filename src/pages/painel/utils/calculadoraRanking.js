export const calcularRanking = (requisicoes, dataInicioRanking, dataFimRanking) => {
  const reqsValidas = requisicoes.filter(req => {
    if (!req.metricasSeparacao) return false;
    
    // Se houver filtro de data, aplica a regra
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
    // Se não houver filtro, traz TODAS as requisições finalizadas
    return true;
  });

  const pontuacoes = {};
  
  reqsValidas.forEach(req => {
    const resp = req.metricasSeparacao.responsavel;
    if (!resp) return;

    const tempoSeg = req.metricasSeparacao.tempoTotalSegundos || 1; 
    const itensFisicos = req.metricasSeparacao.totalItensFisicos || (req.listaItens ? req.listaItens.reduce((acc, item) => acc + Number(item.quantidade), 0) : 0);
    
    // 1. Calcula a Velocidade (UPM) DESTA requisição
    const upmReq = (itensFisicos / tempoSeg) * 60;
    const upmReqFormatado = Number(upmReq.toFixed(1));
    
    // 2. Calcula os pontos exatos DESTA requisição
    let ptsDestaReq = Math.round(itensFisicos * upmReqFormatado);

    // 3. Aplica o multiplicador x2 se for Reposição Interna
    const isReposicaoInterna = req.motivo === 'Reposição Interna' || (req.origem && req.destino && req.origem === req.destino);
    if (isReposicaoInterna) {
      ptsDestaReq *= 2;
    }

    // 4. Acumula os pontos e salva o EXTRATO para o colaborador
    const nomes = resp.split('+').map(n => n.trim());
    nomes.forEach(nome => {
      if (!nome) return;
      if (!pontuacoes[nome]) {
        pontuacoes[nome] = { 
          nome, 
          totalItens: 0, 
          totalSegundos: 0, 
          qtdSeparacoes: 0, 
          pontuacaoAcumulada: 0,
          historicoReqs: [] // Array para guardar os detalhes de cada pedido
        };
      }
      pontuacoes[nome].totalItens += itensFisicos;
      pontuacoes[nome].totalSegundos += tempoSeg;
      pontuacoes[nome].qtdSeparacoes += 1;
      pontuacoes[nome].pontuacaoAcumulada += ptsDestaReq; 

      // Adicionando a requisição atual no "extrato" dele
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

  const rankingFinal = Object.values(pontuacoes).map(p => {
    // Calcula o UPM Global do colaborador baseado no tempo total dele
    const upmGlobal = p.totalSegundos > 0 ? ((p.totalItens / p.totalSegundos) * 60) : 0;
    const upmFormatado = Number(upmGlobal.toFixed(1));

    return {
      nome: p.nome,
      upm: upmFormatado,
      totalItens: p.totalItens,
      qtdSeparacoes: p.qtdSeparacoes,
      pontuacao: p.pontuacaoAcumulada,
      // Ordena o extrato para mostrar os que deram mais pontos no topo
      historicoReqs: p.historicoReqs.sort((a, b) => b.pontos - a.pontos)
    };
  });

  // Ordena o ranking final do maior pontuador para o menor
  rankingFinal.sort((a, b) => b.pontuacao - a.pontuacao); 
  return rankingFinal;
};