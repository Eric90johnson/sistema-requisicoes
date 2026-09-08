import React from 'react';

export default function EdicaoRecebimento({
  status, isEditing, modoNomeEdicao, setModoNomeEdicao,
  nomeEditor, setNomeEditor, confirmarModoEdicao,
  responsavelRecebedor, setResponsavelRecebedor,
  processando, handleIniciarConferencia
}) {
  if (status !== 'Pendente' || isEditing) return null;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', marginBottom: '20px' }} className="no-print">
      
      {/* CAIXA DE EDIÇÃO PONTILHADA */}
      <div style={{ backgroundColor: '#f9f2fa', border: '1px dashed #9b59b6', borderRadius: '8px', padding: '15px 20px' }}>
        <p style={{ margin: '0 0 15px 0', color: '#555', fontSize: '0.95rem' }}>
          <strong style={{ color: '#2c3e50' }}>Modo de Edição:</strong> Altere quantidades, adicione novos produtos, remova itens ou cancele o recebimento. O recebimento ficará oculto do painel durante a edição.
        </p>
        
        {!modoNomeEdicao ? (
          <button type="button" onClick={() => setModoNomeEdicao(true)} style={{ backgroundColor: '#a569bd', color: 'white', border: 'none', padding: '10px 20px', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
            ✏️ Editar Recebimento Completo
          </button>
        ) : (
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginTop: '10px', flexWrap: 'wrap' }}>
            <input 
              type="text" 
              placeholder="Seu nome para registrar a edição..." 
              value={nomeEditor} 
              onChange={(e) => setNomeEditor(e.target.value)} 
              style={{ flex: 1, minWidth: '250px', padding: '10px 12px', border: '1px solid #bdc3c7', borderRadius: '6px', outline: 'none', fontSize: '0.95rem' }}
            />
            <button type="button" onClick={confirmarModoEdicao} style={{ backgroundColor: '#8e44ad', color: 'white', border: 'none', padding: '10px 20px', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer' }}>
              Confirmar
            </button>
            <button type="button" onClick={() => { setModoNomeEdicao(false); setNomeEditor(''); }} style={{ backgroundColor: '#95a5a6', color: 'white', border: 'none', padding: '10px 20px', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer' }}>
              Cancelar
            </button>
          </div>
        )}
      </div>

      {/* CAIXA INICIAR CONFERÊNCIA (ETAPA 0) */}
      <div style={{ backgroundColor: '#fcfcfc', borderLeft: '4px solid #f39c12', borderRadius: '0 8px 8px 0', padding: '20px', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
        <h4 style={{ color: '#d35400', margin: '0 0 10px 0', fontSize: '1.1rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
          ▶️ Etapa 0: Iniciar Conferência
        </h4>
        <p style={{ color: '#95a5a6', margin: '0 0 15px 0', fontSize: '0.95rem' }}>
          Informe seu nome para assumir a conferência física e mudar o status para "Em Conferência".
        </p>
        
        <div style={{ display: 'flex', flexDirection: 'column', gap: '5px', maxWidth: '600px' }}>
          <label style={{ fontSize: '0.85rem', fontWeight: 'bold', color: '#7f8c8d' }}>Seu Nome (Recebedor)</label>
          <div style={{ display: 'flex', gap: '10px' }}>
            <input 
              type="text" 
              placeholder="Ex: Carlos" 
              value={responsavelRecebedor} 
              onChange={(e) => setResponsavelRecebedor(e.target.value)} 
              style={{ flex: 1, padding: '10px 12px', border: '1px solid #dcdde1', borderRadius: '6px', outline: 'none', fontSize: '1rem', backgroundColor: '#fdfdfd' }} 
              disabled={processando}
            />
            <button type="button" onClick={handleIniciarConferencia} disabled={processando} style={{ background: '#2ecc71', color: 'white', border: 'none', padding: '0 25px', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer', fontSize: '1rem' }}>
              {processando ? '⏳ Aguarde...' : 'Começar Conferência ➔'}
            </button>
          </div>
        </div>
      </div>

    </div>
  );
}