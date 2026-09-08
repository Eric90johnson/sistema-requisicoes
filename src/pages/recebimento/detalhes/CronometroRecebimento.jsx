import React from 'react';

export default function CronometroRecebimento({
  status, isViewer, responsavelRecebedor, pausaAtivaInicio,
  tempoDecorrido, metricasRecebimento, tipoPausaAtiva,
  handleRetomarConferencia, formatarTempo
}) {
  if (status === 'Pendente' || status === 'Cancelada') return null;

  return (
    <>
      <div style={{ backgroundColor: isViewer ? '#7f8c8d' : '#2c3e50', color: 'white', padding: '15px', borderRadius: '8px', textAlign: 'center', marginBottom: '20px' }}>
        <div style={{ fontSize: '0.9rem', textTransform: 'uppercase', letterSpacing: '1px', opacity: 0.8 }}>
          {status === 'Concluída' ? '⏱️ Tempo Final' : (pausaAtivaInicio ? '⏸️ Tempo Congelado (Pausa)' : (isViewer ? '👁️ Modo Espectador (Tempo em Andamento)' : '⏱️ Tempo em Andamento'))}
        </div>
        <div style={{ fontSize: '2.5rem', fontWeight: 'bold', margin: '10px 0' }}>{formatarTempo(tempoDecorrido)}</div>
        {metricasRecebimento && (
          <div style={{ color: '#2ecc71', fontWeight: 'bold', fontSize: '1.1rem' }}>⚡ {metricasRecebimento.upm} UPM | 🏆 +{metricasRecebimento.pontosGanhos} pts (x1.5)</div>
        )}
      </div>

      {pausaAtivaInicio && (
        <div style={{ textAlign: 'center', padding: '30px', backgroundColor: '#fff3cd', border: '3px dashed #f39c12', borderRadius: '8px', marginBottom: '20px' }}>
          <h2 style={{ color: '#d35400', marginBottom: '10px' }}>⏸️ RECEBIMENTO CONGELADO</h2>
          <p style={{ color: '#856404', marginBottom: '20px' }}>Motivo da Pausa: <strong>{tipoPausaAtiva}</strong></p>
          {!isViewer && (
            <button type="button" onClick={handleRetomarConferencia} style={{ backgroundColor: '#27ae60', color: 'white', padding: '15px 30px', fontSize: '1.1rem', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold' }}>
              ▶️ ESTOU DE VOLTA! (Retomar Conferência)
            </button>
          )}
        </div>
      )}
    </>
  );
}