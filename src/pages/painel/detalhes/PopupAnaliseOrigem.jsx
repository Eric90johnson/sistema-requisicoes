import React, { useState } from 'react';

export default function PopupAnaliseOrigem({ divergencia, onClose, onSubmitAnalise }) {
  const [procedente, setProcedente] = useState(null);
  const [justificativa, setJustificativa] = useState('');

  const handleEnviar = () => {
    if (procedente === null) {
      alert('Você deve classificar a divergência como PROCEDENTE (Sim) ou IMPROCEDENTE (Não).');
      return;
    }
    if (justificativa.trim().length < 20) {
      alert('Justifique sua resposta com pelo menos 20 caracteres.');
      return;
    }

    onSubmitAnalise(procedente, justificativa);
  };

  if (!divergencia) return null;

  return (
    <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 999999 }}>
      <div style={{ backgroundColor: 'white', padding: '25px', borderRadius: '12px', width: '95%', maxWidth: '700px', maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 10px 30px rgba(0,0,0,0.5)' }}>
        
        <div style={{ borderBottom: '2px solid #e67e22', paddingBottom: '10px', marginBottom: '20px' }}>
          <h2 style={{ color: '#d35400', margin: 0, display: 'flex', alignItems: 'center', gap: '10px' }}>
            🔍 Análise de Qualidade: Divergência Relatada
          </h2>
          <p style={{ color: '#7f8c8d', margin: '5px 0 0 0' }}>
            A loja de destino reportou falhas na conferência deste envio. Revise as observações e julgue o caso.
          </p>
        </div>

        <div style={{ backgroundColor: '#fdf3e7', padding: '15px', borderRadius: '8px', marginBottom: '20px' }}>
          <strong>Recebedor (Destino):</strong> {divergencia.recebedor_destino}
        </div>

        <h4 style={{ color: '#2c3e50', marginBottom: '10px' }}>Itens Reportados:</h4>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '15px', marginBottom: '25px' }}>
          {divergencia.itens_divergentes && divergencia.itens_divergentes.map((item, idx) => (
            <div key={idx} style={{ border: '1px solid #ddd', padding: '15px', borderRadius: '8px', backgroundColor: '#f9f9f9' }}>
              <strong style={{ color: '#2c3e50', fontSize: '1.05rem', display: 'block' }}>{item.descricao}</strong>
              <span style={{ color: '#7f8c8d', fontSize: '0.9rem', display: 'block', marginBottom: '10px' }}>
                Cód: {item.codigo} | Qtd: {item.quantidade_esperada}
              </span>
              <div style={{ backgroundColor: '#fff', borderLeft: '4px solid #e74c3c', padding: '10px', borderRadius: '0 4px 4px 0', fontSize: '0.95rem' }}>
                <strong>Relato do Destino:</strong> {item.observacao_recebedor}
              </div>
            </div>
          ))}
        </div>

        <div style={{ borderTop: '2px solid #ecf0f1', paddingTop: '20px' }}>
          <h4 style={{ color: '#2c3e50', marginBottom: '15px' }}>Seu Veredito (Loja de Origem):</h4>
          
          <div style={{ display: 'flex', gap: '15px', marginBottom: '20px' }}>
            <label style={{ flex: 1, padding: '15px', border: `2px solid ${procedente === true ? '#27ae60' : '#ddd'}`, borderRadius: '8px', cursor: 'pointer', backgroundColor: procedente === true ? '#eafaf1' : '#fff', textAlign: 'center', fontWeight: 'bold', color: procedente === true ? '#27ae60' : '#7f8c8d', transition: 'all 0.2s' }}>
              <input type="radio" name="veredicto" onChange={() => setProcedente(true)} style={{ display: 'none' }} />
              ✅ PROCEDENTE (O erro foi nosso)
            </label>
            <label style={{ flex: 1, padding: '15px', border: `2px solid ${procedente === false ? '#e74c3c' : '#ddd'}`, borderRadius: '8px', cursor: 'pointer', backgroundColor: procedente === false ? '#fdf2f1' : '#fff', textAlign: 'center', fontWeight: 'bold', color: procedente === false ? '#e74c3c' : '#7f8c8d', transition: 'all 0.2s' }}>
              <input type="radio" name="veredicto" onChange={() => setProcedente(false)} style={{ display: 'none' }} />
              ❌ IMPROCEDENTE (O recebedor errou)
            </label>
          </div>

          <div style={{ marginBottom: '20px' }}>
            <label style={{ display: 'block', fontSize: '0.9rem', fontWeight: 'bold', color: '#2c3e50', marginBottom: '5px' }}>
              Justificativa da Análise (Obrigatório):
            </label>
            <textarea 
              value={justificativa}
              onChange={(e) => setJustificativa(e.target.value)}
              placeholder="Descreva o que ocorreu (ex: verificamos as câmeras e os produtos foram bipados corretamente...)"
              style={{ width: '100%', height: '80px', padding: '10px', borderRadius: '6px', border: '1px solid #bdc3c7', outline: 'none', resize: 'vertical', fontFamily: 'inherit' }}
            />
          </div>
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
          <button onClick={onClose} style={{ padding: '12px 20px', borderRadius: '8px', border: 'none', backgroundColor: '#95a5a6', color: '#fff', fontWeight: 'bold', cursor: 'pointer' }}>
            Cancelar Análise
          </button>
          <button onClick={handleEnviar} style={{ padding: '12px 20px', borderRadius: '8px', border: 'none', backgroundColor: '#d35400', color: '#fff', fontWeight: 'bold', cursor: 'pointer' }}>
            Salvar Veredito e Concluir 🔨
          </button>
        </div>
      </div>
    </div>
  );
}