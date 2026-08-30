import React from 'react';

export default function ModalAlerta({ alerta, fecharAlerta }) {
  if (!alerta.visivel) return null;

  return (
    <div className="alerta-modal-overlay">
      <div className="alerta-modal-box">
        
        <div className={`alerta-modal-header tipo-${alerta.tipo}`}>
          {alerta.tipo === 'erro' && '🚨 '}
          {alerta.tipo === 'sucesso' && '✅ '}
          {alerta.tipo === 'aviso' && '⚠️ '}
          {alerta.titulo}
        </div>

        <div className="alerta-modal-body">
          {alerta.mensagem.split('\n').map((linha, i) => (<span key={i}>{linha}<br/></span>))}
        </div>

        <div className="alerta-modal-footer">
          {alerta.onCancel && (
            <button className="btn-alerta btn-alerta-cancelar" onClick={alerta.onCancel}>{alerta.textoCancelar}</button>
          )}
          <button 
            className={`btn-alerta btn-alerta-confirmar tipo-${alerta.tipo}`} 
            onClick={() => { if (alerta.onConfirm) alerta.onConfirm(); else fecharAlerta(); }}
          >
            {alerta.textoConfirmar}
          </button>
        </div>
        
      </div>
    </div>
  );
}