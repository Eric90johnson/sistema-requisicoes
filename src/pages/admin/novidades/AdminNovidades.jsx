import React, { useState, useEffect } from 'react';
import { supabase } from '../../../services/supabase';

export default function AdminNovidades() {
  const [versao, setVersao] = useState('');
  const [mensagem, setMensagem] = useState('');
  const [salvando, setSalvando] = useState(false);
  const [feedback, setFeedback] = useState({ tipo: '', texto: '' });
  const [historico, setHistorico] = useState([]);

  useEffect(() => {
    carregarHistorico();
  }, []);

  const carregarHistorico = async () => {
    const { data, error } = await supabase
      .from('notificacoes_sistema')
      .select('*')
      .order('data_publicacao', { ascending: false });

    if (data) setHistorico(data);
  };

  const handleSalvar = async () => {
    if (!versao.trim() || !mensagem.trim()) {
      setFeedback({ tipo: 'erro', texto: '⚠️ Preencha a versão e a mensagem antes de salvar.' });
      return;
    }

    setSalvando(true);
    setFeedback({ tipo: '', texto: '' });

    const { error } = await supabase
      .from('notificacoes_sistema')
      .insert([{
        versao: versao,
        mensagem: mensagem,
        data_publicacao: new Date().toISOString()
      }]);

    setSalvando(false);

    if (!error) {
      setFeedback({ tipo: 'sucesso', texto: '✅ Nova versão publicada com sucesso!' });
      setVersao('');
      setMensagem('');
      carregarHistorico();
      setTimeout(() => setFeedback({ tipo: '', texto: '' }), 5000);
    } else {
      setFeedback({ tipo: 'erro', texto: '❌ Erro ao salvar: ' + error.message });
    }
  };

  const formatarData = (dataIso) => {
    if (!dataIso) return '';
    return new Date(dataIso).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div style={{ padding: '25px', backgroundColor: '#fff', borderRadius: '8px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', maxWidth: '900px' }}>
      <h3 style={{ color: '#2c3e50', borderBottom: '2px solid #ecf0f1', paddingBottom: '10px', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '10px' }}>
        📢 Publicar Novidades do Sistema
      </h3>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', marginBottom: '40px' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <label style={{ fontWeight: 'bold', color: '#34495e' }}>Nova Versão (Ex: 1.5.0)</label>
          <input 
            type="text" value={versao} onChange={(e) => setVersao(e.target.value)} placeholder="Digite o número da versão..."
            style={{ padding: '12px', borderRadius: '6px', border: '1px solid #bdc3c7', fontSize: '1rem', width: '200px' }}
          />
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <label style={{ fontWeight: 'bold', color: '#34495e' }}>Mensagem para a Equipe</label>
          <textarea 
            value={mensagem} onChange={(e) => setMensagem(e.target.value)} placeholder="Digite as novidades..."
            style={{ padding: '15px', borderRadius: '6px', border: '1px solid #bdc3c7', minHeight: '150px', fontSize: '1rem', fontFamily: 'inherit', resize: 'vertical' }}
          />
        </div>

        {feedback.texto && (
          <div style={{ padding: '12px 15px', borderRadius: '6px', fontWeight: 'bold', backgroundColor: feedback.tipo === 'sucesso' ? '#e8f8f5' : '#fdedec', color: feedback.tipo === 'sucesso' ? '#27ae60' : '#e74c3c', borderLeft: `4px solid ${feedback.tipo === 'sucesso' ? '#27ae60' : '#e74c3c'}` }}>
            {feedback.texto}
          </div>
        )}

        <button 
          onClick={handleSalvar} disabled={salvando}
          style={{ backgroundColor: salvando ? '#95a5a6' : '#9b59b6', color: 'white', border: 'none', padding: '15px', borderRadius: '6px', fontSize: '1.1rem', fontWeight: 'bold', cursor: salvando ? 'not-allowed' : 'pointer', alignSelf: 'flex-start' }}
        >
          {salvando ? '⏳ Publicando...' : '🚀 Lançar Nova Versão'}
        </button>
      </div>

      <h3 style={{ color: '#2c3e50', borderBottom: '2px solid #ecf0f1', paddingBottom: '10px', marginBottom: '20px' }}>
        ⏳ Histórico de Lançamentos
      </h3>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
        {historico.length === 0 ? (
          <p style={{ color: '#7f8c8d', fontStyle: 'italic' }}>Nenhuma atualização registrada ainda.</p>
        ) : (
          historico.map((item, index) => (
            <div key={item.id} style={{ border: '1px solid #eee', borderRadius: '8px', padding: '15px', backgroundColor: index === 0 ? '#f4faff' : '#fafafa', borderLeft: index === 0 ? '4px solid #3498db' : '4px solid #bdc3c7' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}>
                <strong style={{ fontSize: '1.1rem', color: index === 0 ? '#2980b9' : '#34495e' }}>Versão {item.versao} {index === 0 && ' (Atual)'}</strong>
                <span style={{ fontSize: '0.85rem', color: '#7f8c8d' }}>{formatarData(item.data_publicacao)}</span>
              </div>
              <div style={{ color: '#555', fontSize: '0.95rem', lineHeight: '1.5' }}>
                {item.mensagem.split('\n').map((linha, i) => <div key={i}>{linha}</div>)}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}