import React, { useState } from 'react';

export default function PopupDivergenciaRecebedor({ req, onClose, onSubmitDivergencia }) {
  // Guarda o estado de quais itens foram marcados e suas respectivas observações
  const [itensMarcados, setItensMarcados] = useState({});

  const handleToggleCheck = (itemId) => {
    setItensMarcados((prev) => {
      const novoEstado = { ...prev };
      if (novoEstado[itemId]) {
        delete novoEstado[itemId]; // Desmarca e remove a observação
      } else {
        novoEstado[itemId] = { observacao: '' }; // Marca e inicializa a observação vazia
      }
      return novoEstado;
    });
  };

  const handleObsChange = (itemId, texto) => {
    setItensMarcados((prev) => ({
      ...prev,
      [itemId]: { ...prev[itemId], observacao: texto }
    }));
  };

  const handleEnviar = () => {
    const idsMarcados = Object.keys(itensMarcados);
    
    if (idsMarcados.length === 0) {
      alert('Marque pelo menos um produto com divergência para enviar a análise.');
      return;
    }

    // Trava de Qualidade: Exige 50 caracteres para cada item marcado
    for (const id of idsMarcados) {
      const obs = itensMarcados[id].observacao.trim();
      if (obs.length < 50) {
        alert(`A observação do produto marcado deve ter pelo menos 50 caracteres. (Atual: ${obs.length})`);
        return;
      }
    }

    // Monta o array de divergências para salvar no banco
    const payloadDivergencias = idsMarcados.map((id) => {
      // 🚀 Usa a mesma lógica do UID para mapear corretamente os dados para o banco
      const item = req.listaItens.find((i, idx) => String(i.id || i.codigo || idx) === String(id));
      return {
        id_item: item?.id || id,
        codigo: item?.codigoSistema || item?.codigoBarras || item?.codigo,
        descricao: item?.descricaoFornecedor || item?.descricao,
        quantidade_esperada: item?.quantidade,
        observacao_recebedor: itensMarcados[id].observacao
      };
    });

    onSubmitDivergencia(payloadDivergencias);
  };

  return (
    <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 999999 }}>
      <div style={{ backgroundColor: 'white', padding: '25px', borderRadius: '12px', width: '95%', maxWidth: '800px', maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 10px 30px rgba(0,0,0,0.5)' }}>
        
        <div style={{ borderBottom: '2px solid #e74c3c', paddingBottom: '10px', marginBottom: '20px' }}>
          <h2 style={{ color: '#c0392b', margin: 0, display: 'flex', alignItems: 'center', gap: '10px' }}>
            ⚠️ Registrar Divergência de Envio (OTIF)
          </h2>
          <p style={{ color: '#7f8c8d', margin: '5px 0 0 0' }}>
            Marque os produtos que vieram faltando, a mais ou trocados. Descreva detalhadamente o problema (mín. 50 caracteres).
          </p>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '15px', marginBottom: '25px' }}>
          {req.listaItens && req.listaItens.map((item, idx) => {
            // 🚀 CORREÇÃO: Cria uma chave única robusta caso os itens da requisição não tenham 'id' explícito
            const uid = item.id || item.codigo || String(idx);
            const isMarcado = !!itensMarcados[uid];
            
            return (
              <div key={uid} style={{ border: `1px solid ${isMarcado ? '#e74c3c' : '#ddd'}`, borderRadius: '8px', padding: '15px', backgroundColor: isMarcado ? '#fdf2f1' : '#fff', transition: 'all 0.2s' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                  <input 
                    type="checkbox" 
                    checked={isMarcado}
                    onChange={() => handleToggleCheck(uid)}
                    style={{ width: '22px', height: '22px', cursor: 'pointer' }}
                  />
                  <div style={{ flex: 1 }}>
                    <strong style={{ color: '#2c3e50', fontSize: '1.1rem' }}>
                      {item.descricaoFornecedor || item.descricao}
                    </strong>
                    <div style={{ color: '#7f8c8d', fontSize: '0.9rem' }}>
                      Cód: {item.codigoSistema || item.codigoBarras || item.codigo} | Qtd Esperada: <strong style={{color: '#34495e'}}>{item.quantidade}</strong>
                    </div>
                  </div>
                </div>

                {isMarcado && (
                  <div style={{ marginTop: '15px' }}>
                    <label style={{ display: 'block', fontSize: '0.9rem', fontWeight: 'bold', color: '#c0392b', marginBottom: '5px' }}>
                      Descrição do Problema (Obrigatório, mín 50 caracteres):
                    </label>
                    <textarea 
                      value={itensMarcados[uid].observacao}
                      onChange={(e) => handleObsChange(uid, e.target.value)}
                      placeholder="Ex: O produto foi faturado com 10 unidades na nota, mas fisicamente chegaram apenas 8. A caixa estava lacrada, indicando erro na separação da origem..."
                      style={{ width: '100%', height: '80px', padding: '10px', borderRadius: '6px', border: '1px solid #c0392b', outline: 'none', resize: 'vertical', fontFamily: 'inherit' }}
                    />
                    <div style={{ textAlign: 'right', fontSize: '0.8rem', color: itensMarcados[uid].observacao.length < 50 ? '#e74c3c' : '#27ae60', marginTop: '3px' }}>
                      {itensMarcados[uid].observacao.length} / 50 mín.
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
          <button onClick={onClose} style={{ padding: '12px 20px', borderRadius: '8px', border: 'none', backgroundColor: '#95a5a6', color: '#fff', fontWeight: 'bold', cursor: 'pointer' }}>
            Cancelar
          </button>
          <button onClick={handleEnviar} style={{ padding: '12px 20px', borderRadius: '8px', border: 'none', backgroundColor: '#e74c3c', color: '#fff', fontWeight: 'bold', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}>
            Enviar para Análise de Qualidade 🚨
          </button>
        </div>
      </div>
    </div>
  );
}