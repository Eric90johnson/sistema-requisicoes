import React, { useState } from 'react';

export default function CalculadoraDiluicao({ item, aoAplicar }) {
  // 🚀 Tenta puxar do histórico salvo no banco, se não existir, puxa o padrão
  const dadosSalvos = item.dadosDiluicao || {};

  const [qtdNf, setQtdNf] = useState(dadosSalvos.qtdNf !== undefined ? dadosSalvos.qtdNf : (item.quantidade || ''));
  const [valorNf, setValorNf] = useState(dadosSalvos.valorNf || '');
  
  const [qtdMatriz, setQtdMatriz] = useState(dadosSalvos.qtdMatriz || '');
  const [valorMatriz, setValorMatriz] = useState(dadosSalvos.valorMatriz || '');
  
  const [qtdCc, setQtdCc] = useState(dadosSalvos.qtdCc || '');
  const [valorCc, setValorCc] = useState(dadosSalvos.valorCc || '');
  
  const [qtdMess, setQtdMess] = useState(dadosSalvos.qtdMess || '');
  const [valorMess, setValorMess] = useState(dadosSalvos.valorMess || '');

  // Lógica de Cálculo Ponderado
  const qNF = parseFloat(qtdNf) || 0;
  const vNF = parseFloat(valorNf) || 0;
  const qMat = parseFloat(qtdMatriz) || 0;
  const vMat = parseFloat(valorMatriz) || 0;
  const qCC = parseFloat(qtdCc) || 0;
  const vCC = parseFloat(valorCc) || 0;
  const qMess = parseFloat(qtdMess) || 0;
  const vMess = parseFloat(valorMess) || 0;

  const totalQtd = qNF + qMat + qCC + qMess;
  const totalValor = vNF + vMat + vCC + vMess;
  
  const custoMedio = totalQtd > 0 ? (totalValor / totalQtd) : 0;

  const formatCurrency = (val) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);
  };

  const inputStyle = {
    width: '100%', padding: '8px 10px', border: '1px solid #bdc3c7', 
    borderRadius: '6px', outline: 'none', fontSize: '0.9rem'
  };

  const labelStyle = {
    fontSize: '0.8rem', fontWeight: 'bold', color: '#34495e', marginBottom: '4px', display: 'block'
  };

  // 🚀 Manda o Preço Final E o Histórico da Matemática para salvar no Supabase!
  const handleAplicar = () => {
    const dadosDiluicao = {
      qtdNf: qNF, valorNf: vNF,
      qtdMatriz: qMat, valorMatriz: vMat,
      qtdCc: qCC, valorCc: vCC,
      qtdMess: qMess, valorMess: vMess,
      totalQtd, totalValor, custoMedio
    };
    aoAplicar(custoMedio.toFixed(2), dadosDiluicao);
  };

  return (
    <div style={{ backgroundColor: 'white', padding: '20px', borderRadius: '8px', border: '1px solid #e0e0e0', boxShadow: '0 4px 15px rgba(0,0,0,0.05)' }}>
      
      {/* PAINEL DE INFORMAÇÕES */}
      <div style={{ backgroundColor: '#f8fafc', borderLeft: '4px solid #3498db', padding: '15px', borderRadius: '4px', marginBottom: '20px' }}>
        <h4 style={{ color: '#2980b9', margin: '0 0 5px 0', fontSize: '0.95rem' }}>ℹ️ Como Funciona o Cálculo Ponderado:</h4>
        <p style={{ margin: 0, fontSize: '0.85rem', color: '#7f8c8d' }}>
          <strong>Fórmula:</strong> Preço de Custo = (Valor Total NF + Valor Matriz + Valor CC + Valor Messejana) ÷ (Qtd NF + Qtd Matriz + Qtd CC + Qtd Messejana)
        </p>
      </div>

      {/* FORMULÁRIO (FORM CARD) */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '15px', marginBottom: '25px' }}>
        
        <div style={{ backgroundColor: '#fef9e7', padding: '10px', borderRadius: '6px', border: '1px solid #f1c40f' }}>
          <label style={labelStyle}>Qtd na NF</label>
          <input type="number" step="any" value={qtdNf} onChange={e => setQtdNf(e.target.value)} style={inputStyle} />
          <label style={{...labelStyle, marginTop: '10px'}}>Valor Total NF (R$)</label>
          <input type="number" step="any" placeholder="Ex: 1050.50" value={valorNf} onChange={e => setValorNf(e.target.value)} style={inputStyle} />
        </div>

        <div>
          <label style={labelStyle}>Qtd Matriz</label>
          <input type="number" step="any" placeholder="0" value={qtdMatriz} onChange={e => setQtdMatriz(e.target.value)} style={inputStyle} />
          <label style={{...labelStyle, marginTop: '10px'}}>Valor Matriz (R$)</label>
          <input type="number" step="any" placeholder="0.00" value={valorMatriz} onChange={e => setValorMatriz(e.target.value)} style={inputStyle} />
        </div>

        <div>
          <label style={labelStyle}>Qtd Conj. Ceará</label>
          <input type="number" step="any" placeholder="0" value={qtdCc} onChange={e => setQtdCc(e.target.value)} style={inputStyle} />
          <label style={{...labelStyle, marginTop: '10px'}}>Valor CC (R$)</label>
          <input type="number" step="any" placeholder="0.00" value={valorCc} onChange={e => setValorCc(e.target.value)} style={inputStyle} />
        </div>

        <div>
          <label style={labelStyle}>Qtd Messejana</label>
          <input type="number" step="any" placeholder="0" value={qtdMess} onChange={e => setQtdMess(e.target.value)} style={inputStyle} />
          <label style={{...labelStyle, marginTop: '10px'}}>Valor Messejana (R$)</label>
          <input type="number" step="any" placeholder="0.00" value={valorMess} onChange={e => setValorMess(e.target.value)} style={inputStyle} />
        </div>

      </div>

      {/* KPI RESULTADO */}
      <div style={{ backgroundColor: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: '8px', padding: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '15px' }}>
        <div>
          <span style={{ fontSize: '0.85rem', color: '#64748b', textTransform: 'uppercase', fontWeight: 'bold' }}>Novo Custo Médio Ponderado</span>
          <div style={{ fontSize: '2rem', fontWeight: 'bold', color: '#1e3a8a', marginTop: '5px' }}>
            {formatCurrency(custoMedio)}
          </div>
          <span style={{ fontSize: '0.8rem', color: '#7f8c8d' }}>Baseado em {totalQtd} unidades totais</span>
        </div>

        <button 
          type="button"
          onClick={handleAplicar}
          style={{ backgroundColor: '#27ae60', color: 'white', border: 'none', padding: '15px 30px', borderRadius: '8px', fontWeight: 'bold', fontSize: '1.1rem', cursor: 'pointer', boxShadow: '0 4px 6px rgba(39, 174, 96, 0.2)' }}
        >
          ✔️ Aplicar Preço de Custo
        </button>
      </div>

    </div>
  );
}