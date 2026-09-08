import React from 'react';

export default function CabecalhoRecebimento({
  isEditing, lojaRecebedora, setLojaRecebedora, nomeFornecedor, setNomeFornecedor,
  marca, setMarca, numeroNF, setNumeroNF, volumes, setVolumes,
  numeroPedido, setNumeroPedido, status
}) {
  if (isEditing) {
    return (
      <div className="recebimento-card" style={{ backgroundColor: 'white', border: '1px solid #e0e0e0', borderRadius: '12px', padding: '25px', marginBottom: '10px', boxShadow: '0 2px 8px rgba(0,0,0,0.03)' }}>
        <h3 style={{ margin: '0 0 15px 0', color: '#2c3e50', borderBottom: '1px solid #ecf0f1', paddingBottom: '10px' }}>Edição de Cabeçalho</h3>
        <div className="form-grid-4">
          <div className="input-group">
            <label>Loja Recebedora *</label>
            <select value={lojaRecebedora} onChange={(e) => setLojaRecebedora(e.target.value)}>
              <option value="Matriz">Matriz</option><option value="Araturi">Araturi</option><option value="Conjunto Ceará">Conjunto Ceará</option><option value="Messejana">Messejana</option><option value="Mulungu">Mulungu</option>
            </select>
          </div>
          <div className="input-group"><label>Fornecedor *</label><input type="text" value={nomeFornecedor} onChange={(e) => setNomeFornecedor(e.target.value)} required /></div>
          <div className="input-group"><label>Marca *</label><input type="text" value={marca} onChange={(e) => setMarca(e.target.value)} required /></div>
          <div className="input-group"><label>Número da NF *</label><input type="text" value={numeroNF} onChange={(e) => setNumeroNF(e.target.value)} required /></div>
          <div className="input-group"><label>Volumes *</label><input type="number" value={volumes} onChange={(e) => setVolumes(e.target.value)} required /></div>
          <div className="input-group"><label>Número do Pedido</label><input type="text" value={numeroPedido} onChange={(e) => setNumeroPedido(e.target.value)} /></div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ padding: '10px 0 20px 0' }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '25px' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
          <span style={{ fontSize: '0.8rem', color: '#95a5a6', textTransform: 'uppercase', fontWeight: 'bold' }}>FORNECEDOR</span>
          <span style={{ fontSize: '1.1rem', color: '#2c3e50' }}>{nomeFornecedor || '-'}</span>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
          <span style={{ fontSize: '0.8rem', color: '#95a5a6', textTransform: 'uppercase', fontWeight: 'bold' }}>NOTA FISCAL</span>
          <span style={{ fontSize: '1.1rem', color: '#2c3e50', fontWeight: 'bold' }}>{numeroNF || '-'}</span>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
          <span style={{ fontSize: '0.8rem', color: '#95a5a6', textTransform: 'uppercase', fontWeight: 'bold' }}>MARCA</span>
          <span style={{ fontSize: '1.1rem', color: '#2c3e50' }}>{marca || '-'}</span>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
          <span style={{ fontSize: '0.8rem', color: '#95a5a6', textTransform: 'uppercase', fontWeight: 'bold' }}>VOLUMES</span>
          <span style={{ fontSize: '1.1rem', color: '#2c3e50' }}>{volumes ? `${volumes} cx` : '-'}</span>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
          <span style={{ fontSize: '0.8rem', color: '#95a5a6', textTransform: 'uppercase', fontWeight: 'bold' }}>LOJA DESTINO</span>
          <span style={{ fontSize: '1.1rem', color: '#2c3e50' }}>{lojaRecebedora}</span>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
          <span style={{ fontSize: '0.8rem', color: '#95a5a6', textTransform: 'uppercase', fontWeight: 'bold' }}>STATUS ATUAL</span>
          <span style={{ fontSize: '1.1rem', color: status === 'Cancelada' ? '#e74c3c' : '#27ae60', fontWeight: 'bold' }}>{status}</span>
        </div>
      </div>
    </div>
  );
}