import React from 'react';

export default function ModalPopup({ popup, setPopup }) {
  if (!popup.visivel) return null;

  const handleConfirm = () => {
    setPopup({ ...popup, visivel: false });
    if (popup.onConfirm) popup.onConfirm();
  };

  return (
    <div className="no-print" style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 999999 }}>
      <div style={{ backgroundColor: 'white', padding: '30px', borderRadius: '12px', width: '90%', maxWidth: '420px', textAlign: 'center', boxShadow: '0 10px 30px rgba(0,0,0,0.3)' }}>
        <div style={{ fontSize: '3.5rem', marginBottom: '10px' }}>
          {popup.tipo === 'sucesso' ? '✅' : popup.tipo === 'aviso' ? '⚠️' : '❌'}
        </div>
        <h3 style={{ color: '#2c3e50', fontSize: '1.4rem', marginBottom: '12px' }}>{popup.titulo}</h3>
        <p style={{ color: '#7f8c8d', fontSize: '1rem', lineHeight: '1.5', marginBottom: '25px', whiteSpace: 'pre-wrap' }}>{popup.mensagem}</p>
        <button 
          onClick={handleConfirm} 
          style={{ backgroundColor: popup.tipo === 'sucesso' ? '#27ae60' : popup.tipo === 'aviso' ? '#f39c12' : '#e74c3c', color: 'white', border: 'none', padding: '12px 0', width: '100%', borderRadius: '8px', fontSize: '1.1rem', fontWeight: 'bold', cursor: 'pointer' }}
        >
          Entendi
        </button>
      </div>
    </div>
  );
}