import React from 'react';

export default function CronometroCheckout({ segundosDecorridos, formatarTempo }) {
  return (
    <div className="painel-cronometro-global-checkout">
      <span className="cronometro-titulo-checkout">⏱️ Finalize para gravar seu tempo:</span>
      <span className="cronometro-relogio-checkout">{formatarTempo(segundosDecorridos)}</span>
    </div>
  );
}