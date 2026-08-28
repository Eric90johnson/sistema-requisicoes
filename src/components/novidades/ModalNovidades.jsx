import React, { useState, useEffect } from 'react';
import { supabase } from '../../services/supabase';

export default function ModalNovidades() {
  const [mostrar, setMostrar] = useState(false);
  const [historicoNovidades, setHistoricoNovidades] = useState([]);

  useEffect(() => {
    const buscarNovidadesDaNuvem = async () => {
      const { data, error } = await supabase
        .from('notificacoes_sistema')
        .select('*')
        .order('data_publicacao', { ascending: false });

      if (!error && data && data.length > 0) {
        setHistoricoNovidades(data);
        
        const versaoMaisRecente = data[0].versao;
        const versaoLida = localStorage.getItem('nd_versao_lida');
        
        if (versaoLida !== versaoMaisRecente) {
          setMostrar(true);
        }
      }
    };

    buscarNovidadesDaNuvem();
  }, []);

  const handleEntendi = () => {
    if (historicoNovidades.length > 0) {
      localStorage.setItem('nd_versao_lida', historicoNovidades[0].versao);
    }
    setMostrar(false); 
  };

  if (!mostrar || historicoNovidades.length === 0) return null;

  const versaoAtual = historicoNovidades[0];
  const versoesAnteriores = historicoNovidades.slice(1);

  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh',
      backgroundColor: 'rgba(0, 0, 0, 0.7)', zIndex: 9999999,
      display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '20px',
      animation: 'fadeIn 0.3s ease-out'
    }}>
      <div style={{
        backgroundColor: '#fff', borderRadius: '12px', width: '100%', maxWidth: '550px',
        overflow: 'hidden', boxShadow: '0 20px 50px rgba(0,0,0,0.5)',
        animation: 'popInModal 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275)',
        display: 'flex', flexDirection: 'column', maxHeight: '90vh'
      }}>
        
        <div style={{ backgroundColor: '#9b59b6', color: '#fff', padding: '20px', textAlign: 'center', flexShrink: 0 }}>
          <h2 style={{ margin: 0, fontSize: '1.5rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px' }}>
            🚀 Atualização Liberada!
          </h2>
          <p style={{ margin: '5px 0 0 0', opacity: 0.9, fontSize: '0.9rem' }}>Conheça a Versão {versaoAtual.versao}</p>
        </div>

        <div style={{ padding: '25px', color: '#2c3e50', lineHeight: '1.6', overflowY: 'auto' }}>
          
          <div style={{ marginBottom: '30px' }}>
            <h3 style={{ margin: '0 0 15px 0', color: '#8e44ad' }}>✨ O que há de novo:</h3>
            <div style={{ fontSize: '1.05rem' }}>
              {versaoAtual.mensagem.split('\n').map((linha, index) => (
                <p key={index} style={{ margin: '0 0 8px 0' }}>{linha}</p>
              ))}
            </div>
          </div>

          {versoesAnteriores.length > 0 && (
            <div>
              <h4 style={{ borderBottom: '1px solid #eee', paddingBottom: '10px', color: '#7f8c8d', margin: '0 0 15px 0' }}>
                ⏳ Histórico de Versões
              </h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                {versoesAnteriores.map(antiga => (
                  <div key={antiga.id} style={{ borderLeft: '3px solid #bdc3c7', paddingLeft: '15px', opacity: 0.8 }}>
                    <strong style={{ display: 'block', color: '#34495e', marginBottom: '5px' }}>Versão {antiga.versao}</strong>
                    <div style={{ fontSize: '0.9rem', color: '#555' }}>
                      {antiga.mensagem.split('\n').map((linha, index) => (
                        <div key={index}>{linha}</div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
          
        </div>

        <div style={{ padding: '20px', backgroundColor: '#f9f9f9', display: 'flex', justifyContent: 'center', borderTop: '1px solid #eee', flexShrink: 0 }}>
          <button 
            onClick={handleEntendi}
            style={{
              backgroundColor: '#27ae60', color: '#fff', border: 'none', padding: '12px 30px',
              borderRadius: '30px', fontSize: '1.1rem', fontWeight: 'bold', cursor: 'pointer',
              boxShadow: '0 4px 6px rgba(39, 174, 96, 0.3)', transition: 'transform 0.1s'
            }}
            onMouseDown={(e) => e.currentTarget.style.transform = 'scale(0.95)'}
            onMouseUp={(e) => e.currentTarget.style.transform = 'scale(1)'}
          >
            Entendi! Bora trabalhar 💪
          </button>
        </div>
        
      </div>
    </div>
  );
}