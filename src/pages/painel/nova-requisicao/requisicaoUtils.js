export const parseValorMoeda = (valorStr) => {
  if (!valorStr) return 0;
  if (typeof valorStr === 'number') return valorStr;
  
  let limpo = valorStr.toString().replace(/[^\d.,-]/g, '');
  
  if (limpo.includes('.') && limpo.includes(',')) {
    limpo = limpo.replace(/\./g, '');
  }
  
  limpo = limpo.replace(',', '.');
  return Number(limpo) || 0;
};

export const gerarIdSequencial = (destino, requisicoes) => {
  let prefixo = 'REQ'; 
  if (destino === 'Araturi') prefixo = 'A';
  else if (destino === 'Conjunto Ceará') prefixo = 'C';
  else if (destino === 'Messejana') prefixo = 'M';
  else if (destino === 'Mulungu') prefixo = 'MU';
  
  let maxNum = 0;
  
  requisicoes.forEach(req => {
    if (req.id && req.id.startsWith(prefixo)) {
      const resto = req.id.substring(prefixo.length);
      if (/^\d+$/.test(resto)) {
        const num = parseInt(resto, 10);
        if (num > maxNum) maxNum = num;
      }
    }
  });

  const proxNumFormatado = String(maxNum + 1).padStart(4, '0');
  return `${prefixo}${proxNumFormatado}`;
};