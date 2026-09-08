import React from 'react';

export default function ObservacoesRecebimento({
  observacoes, status, isEditing, novaObservacao, setNovaObservacao, handleAdicionarObservacao, processando
}) {
  return (
    <div style={{ marginBottom: '25px', marginTop: '10px' }} className="no-print">
      <h4 style={{ color: '#7f8c8d', fontSize: '0.85rem', textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px', fontWeight: 'bold' }}>
        📝 Histórico de Observações / Instruções
      </h4>
      
      <div style={{ backgroundColor: '#f8f9fa', borderLeft: '4px solid #bdc3c7', padding: '15px', borderRadius: '4px', marginBottom: '15px', whiteSpace: 'pre-wrap', color: '#2c3e50', fontSize: '0.95rem', minHeight: '50px' }}>
        {observacoes ? observacoes : <span style={{ fontStyle: 'italic', color: '#95a5a6', display: 'block', textAlign: 'center' }}>Nenhuma instrução adicional registrada nesta carga.</span>}
      </div>

      {status !== 'Concluída' && status !== 'Cancelada' && !isEditing && (
         <div style={{ border: '1px dashed #bdc3c7', borderRadius: '8px', padding: '15px', backgroundColor: '#fdfdfd' }}>
           <textarea 
             rows="2" 
             placeholder="Escreva uma nova observação ou instrução para esta carga..." 
             value={novaObservacao} 
             onChange={(e) => setNovaObservacao(e.target.value)} 
             style={{ width: '100%', border: '1px solid #3498db', borderRadius: '6px', padding: '12px', outline: 'none', resize: 'vertical', fontSize: '0.95rem' }}
           />
           <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '10px' }}>
             <button type="button" onClick={handleAdicionarObservacao} disabled={processando} style={{ backgroundColor: '#2ecc71', color: 'white', border: 'none', padding: '10px 20px', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '5px' }}>
               {processando ? '⏳ Salvando...' : '➕ Adicionar Observação'}
             </button>
           </div>
         </div>
      )}
    </div>
  );
}