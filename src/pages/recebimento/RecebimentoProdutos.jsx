import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../../services/supabase';
import '../../styles/pages/recebimento/recebimento.css';

export default function RecebimentoProdutos({ aoVoltar, usuarioLogado }) {
  const [lojaRecebedora, setLojaRecebedora] = useState('Matriz');
  const [numeroRelatorio, setNumeroRelatorio] = useState('REC.X.001');
  const [nomeFornecedor, setNomeFornecedor] = useState('');
  const [marca, setMarca] = useState('');
  const [numeroNF, setNumeroNF] = useState('');
  const [volumes, setVolumes] = useState('');
  const [numeroPedido, setNumeroPedido] = useState(''); 
  const [responsavelRecebedor, setResponsavelRecebedor] = useState(''); 
  const [observacoes, setObservacoes] = useState('');

  const [itens, setItens] = useState([
    { id: 1, codigoFornecedor: '', descricaoFornecedor: '', quantidade: '', validade: '', quantidadeBipada: 0, avarias: 0, obsItem: '' }
  ]);

  const [processando, setProcessando] = useState(false);
  const [popup, setPopup] = useState({ visivel: false, tipo: '', titulo: '', mensagem: '', onConfirm: null });

  // ==========================================
  // ESTADO DO MODAL DE BIP (LEITOR DE CÓDIGO)
  // ==========================================
  const [scannerAtivo, setScannerAtivo] = useState(null); 
  const inputBipRef = useRef(null); 

  const exibirPopup = (tipo, titulo, mensagem, onConfirm = null) => {
    setPopup({ visivel: true, tipo, titulo, mensagem, onConfirm });
  };

  const [status, setStatus] = useState('Pendente'); 
  const [inicioConferencia, setInicioConferencia] = useState(null);
  const [tempoDecorrido, setTempoDecorrido] = useState(0);
  const [metricasRecebimento, setMetricasRecebimento] = useState(null);

  const [pausaPendente, setPausaPendente] = useState(false);
  const [pausaAtivaInicio, setPausaAtivaInicio] = useState(null);
  const [pausaAtivaId, setPausaAtivaId] = useState(null);
  const [tipoPausaAtiva, setTipoPausaAtiva] = useState(null);
  const [tempoPausadoTotal, setTempoPausadoTotal] = useState(0);

  useEffect(() => {
    let siglaLoja = 'X';
    if (lojaRecebedora === 'Araturi') siglaLoja = 'A';
    else if (lojaRecebedora === 'Conjunto Ceará') siglaLoja = 'C';
    else if (lojaRecebedora === 'Messejana') siglaLoja = 'M';
    else if (lojaRecebedora === 'Mulungu') siglaLoja = 'MU';
    else if (lojaRecebedora === 'Matriz') siglaLoja = 'MT';

    const buscarProximoNumero = async () => {
      try {
        const { data, error } = await supabase
          .from('recebimento_mercadorias')
          .select('numero_relatorio')
          .ilike('numero_relatorio', `REC.${siglaLoja}.%`)
          .order('id', { ascending: false })
          .limit(1);

        let proximoSeq = 1;
        if (!error && data && data.length > 0) {
          const ultimoRel = data[0].numero_relatorio;
          const partes = ultimoRel.split('.');
          if (partes.length === 3) {
            const seq = parseInt(partes[2], 10);
            if (!isNaN(seq)) proximoSeq = seq + 1;
          }
        }
        setNumeroRelatorio(`REC.${siglaLoja}.${String(proximoSeq).padStart(3, '0')}`);
      } catch (e) {
        setNumeroRelatorio(`REC.${siglaLoja}.001`);
      }
    };
    buscarProximoNumero();
  }, [lojaRecebedora]);

  useEffect(() => {
    let intervalo;
    if (status === 'Em Conferência' && !metricasRecebimento) {
      if (pausaAtivaInicio) {
        const diferenca = (Number(pausaAtivaInicio) - Number(inicioConferencia)) - tempoPausadoTotal;
        setTempoDecorrido(Math.max(0, Math.floor(diferenca / 1000)));
      } else if (inicioConferencia) {
        intervalo = setInterval(() => {
          const diferenca = (Date.now() - Number(inicioConferencia)) - tempoPausadoTotal;
          setTempoDecorrido(Math.max(0, Math.floor(diferenca / 1000)));
        }, 1000);
      }
    }
    return () => clearInterval(intervalo);
  }, [status, inicioConferencia, pausaAtivaInicio, tempoPausadoTotal, metricasRecebimento]);

  useEffect(() => {
    if (status !== 'Em Conferência' || !usuarioLogado) return;
    const fetchPausa = async () => {
      const { data } = await supabase.from('pausas_separacao')
        .select('*').eq('requisicao_id', numeroRelatorio).eq('solicitante_nome', usuarioLogado.nome_completo).order('timestamp_criacao', { ascending: false }).limit(1);
      
      if (data && data.length > 0) {
        const p = data[0];
        if (p.status === 'pendente') {
          setPausaPendente(true);
        } else if (p.status === 'aprovada' && !pausaAtivaInicio) {
          setPausaPendente(false);
          setPausaAtivaInicio(p.inicio_pausa);
          setPausaAtivaId(p.id);
          setTipoPausaAtiva(p.tipo_pausa);
        } else if (p.status === 'recusada') {
          setPausaPendente(false);
        }
      }
    };
    fetchPausa();
    const intId = setInterval(fetchPausa, 5000);
    return () => clearInterval(intId);
  }, [numeroRelatorio, usuarioLogado, status, pausaAtivaInicio]);

  const formatarTempo = (segundos) => {
    const h = Math.floor(segundos / 3600).toString().padStart(2, '0');
    const m = Math.floor((segundos % 3600) / 60).toString().padStart(2, '0');
    const s = (segundos % 60).toString().padStart(2, '0');
    return `${h}:${m}:${s}`;
  };

  const handleIniciarConferencia = () => {
    if (!responsavelRecebedor.trim()) {
      exibirPopup('aviso', 'Atenção', "Digite o Nome do Responsável Recebedor antes de iniciar!");
      return;
    }
    setStatus('Em Conferência');
    setInicioConferencia(Date.now());
  };

  const solicitarPausaAoLider = async (tipoPausa) => {
    if (!usuarioLogado?.encarregado_responsavel) {
      exibirPopup('erro', 'Ação Negada', 'Você não tem um Encarregado vinculado ao seu perfil para aprovar a pausa.');
      return;
    }
    setPausaPendente(true);
    const { error } = await supabase.from('pausas_separacao').insert([{
      requisicao_id: numeroRelatorio,
      solicitante_nome: usuarioLogado.nome_completo,
      encarregado_destino: usuarioLogado.encarregado_responsavel,
      tipo_pausa: tipoPausa,
      timestamp_criacao: Date.now()
    }]);
    if (error) {
      setPausaPendente(false);
      exibirPopup('erro', 'Erro de Conexão', "Erro ao pedir pausa: " + error.message);
    } else {
      exibirPopup('sucesso', 'Pausa Solicitada!', `Sua pausa para ${tipoPausa} foi enviada.\n\nAguarde a aprovação do encarregado para o cronômetro parar.`);
    }
  };

  const handleRetomarConferencia = async () => {
    const horaRetorno = Date.now();
    const tempoPausadoAgora = horaRetorno - Number(pausaAtivaInicio);
    setTempoPausadoTotal(prev => prev + tempoPausadoAgora);
    setPausaAtivaInicio(null);
    setTipoPausaAtiva(null);
    if (pausaAtivaId) {
      await supabase.from('pausas_separacao').update({ status: 'finalizada' }).eq('id', pausaAtivaId);
    }
    exibirPopup('sucesso', 'Conferência Retomada', 'Bem-vindo de volta!\nO cronômetro voltou a correr.');
  };

  // ==========================================
  // FUNÇÕES DE TABELA E LOTES
  // ==========================================
  const handleAdicionarItemVazio = () => setItens(prev => [...prev, { id: Date.now(), codigoFornecedor: '', descricaoFornecedor: '', quantidade: '', validade: '', quantidadeBipada: 0, avarias: 0, obsItem: '' }]);
  
  const handleDuplicarParaNovoLote = (itemOriginal) => {
    const novoLote = {
      id: Date.now(),
      codigoFornecedor: itemOriginal.codigoFornecedor,
      descricaoFornecedor: itemOriginal.descricaoFornecedor,
      quantidade: '', 
      validade: '', 
      quantidadeBipada: 0,
      avarias: 0,
      obsItem: ''
    };
    setItens(prev => {
      const index = prev.findIndex(i => i.id === itemOriginal.id);
      const novaLista = [...prev];
      novaLista.splice(index + 1, 0, novoLote); 
      return novaLista;
    });
  };

  const handleRemoverItem = (id) => {
    if (itens.length === 1) return exibirPopup('aviso', 'Atenção', "O recebimento precisa ter pelo menos um item.");
    setItens(prev => prev.filter(item => item.id !== id));
  };

  const handleAtualizarItem = (id, campo, valor) => setItens(prev => prev.map(item => item.id === id ? { ...item, [campo]: valor } : item));

  // ==========================================
  // LÓGICA DE BIPAGEM / SCANNER
  // ==========================================
  const abrirModalScanner = (item) => {
    if (!item.quantidade || Number(item.quantidade) <= 0) {
      exibirPopup('aviso', 'Quantidade Ausente', 'Informe a quantidade na NF antes de iniciar a bipagem.');
      return;
    }
    setScannerAtivo(item);
    setTimeout(() => { if(inputBipRef.current) inputBipRef.current.focus(); }, 100);
  };

  const processarLeitura = () => {
    setItens(prev => prev.map(item => {
      if (item.id === scannerAtivo.id) {
        const novaQtd = Number(item.quantidadeBipada) + 1;
        if (novaQtd >= Number(item.quantidade)) {
          setTimeout(() => setScannerAtivo(null), 300); // Fecha automaticamente
        }
        return { ...item, quantidadeBipada: novaQtd };
      }
      return item;
    }));
    if(inputBipRef.current) inputBipRef.current.value = ''; 
  };

  const handleSalvarPendencia = async () => {
    if (!nomeFornecedor.trim() || !marca.trim() || !numeroNF.trim() || !volumes) {
      return exibirPopup('aviso', 'Incompleto', "Preencha Fornecedor, Marca, NF e Volumes.");
    }
    setProcessando(true);
    try {
      await supabase.from('recebimento_mercadorias').insert([{
        numero_relatorio: numeroRelatorio, loja_recebedora: lojaRecebedora, nome_fornecedor: nomeFornecedor, marca: marca, numero_nf: numeroNF, volumes: Number(volumes), numero_pedido: numeroPedido || null, responsavel_recebedor: null, observacoes: observacoes || 'Aguardando conferência física.', itens: [], responsavel_sistema: usuarioLogado?.nome_completo || 'Sistema', status: 'Pendente' 
      }]);
      exibirPopup('sucesso', 'Carga Salva!', `A carga NF ${numeroNF} foi registrada.`, () => { if (aoVoltar) aoVoltar(); });
    } catch (error) {
      exibirPopup('erro', 'Falha', `Erro ao registrar: ${error.message}`);
    } finally {
      setProcessando(false);
    }
  };

  const handleSalvarRecebimento = async (e) => {
    e.preventDefault();
    if (!nomeFornecedor.trim() || !marca.trim() || !numeroNF.trim() || !volumes.trim() || !responsavelRecebedor.trim()) {
      return exibirPopup('aviso', 'Dados do Cabeçalho', "Por favor, preencha todos os campos obrigatórios do cabeçalho da nota.");
    }

    if (itens.some(i => !i.codigoFornecedor.trim() || !i.descricaoFornecedor.trim() || !i.quantidade || !i.validade.trim())) {
      return exibirPopup('aviso', 'Dados dos Produtos', "Todos os produtos precisam ter Código, Descrição, Validade e Quantidade.");
    }
    setProcessando(true);
    try {
      const totalItens = itens.reduce((acc, item) => acc + Number(item.quantidade), 0);
      const upm = tempoDecorrido > 0 ? (totalItens / tempoDecorrido) * 60 : 0;
      const pts = Math.round(totalItens * Number(upm.toFixed(1)) * 1.5);
      const metricas = { tempoTotalSegundos: tempoDecorrido, totalItensFisicos: totalItens, upm: Number(upm.toFixed(1)), pontosGanhos: pts, responsavel: responsavelRecebedor, finalizadoEm: new Date().toISOString() };
      
      const itensComLote = itens.map((item, index) => ({ ...item, loteInterno: `LT-${numeroRelatorio}-${String(index + 1).padStart(2, '0')}` }));

      await supabase.from('recebimento_mercadorias').insert([{
        numero_relatorio: numeroRelatorio, loja_recebedora: lojaRecebedora, nome_fornecedor: nomeFornecedor, marca: marca, numero_nf: numeroNF, volumes: Number(volumes), numero_pedido: numeroPedido || null, responsavel_recebedor: responsavelRecebedor, observacoes: observacoes, itens: itensComLote, responsavel_sistema: usuarioLogado?.nome_completo || 'Sistema', metricas_recebimento: metricas, status: 'Concluída' 
      }]);
      setStatus('Concluída');
      exibirPopup('sucesso', 'Concluído! 🏆', `Lotes com FEFO registrados.\n\nVelocidade: ${metricas.upm} UPM\nPontos: +${pts}`, () => { if (aoVoltar) aoVoltar(); });
    } catch (error) {
      exibirPopup('erro', 'Falha', error.message);
    } finally {
      setProcessando(false);
    }
  };

  return (
    <div className="recebimento-container" style={{ position: 'relative' }}>
      
      {/* MODAL CUSTOMIZADO (POPUP) */}
      {popup.visivel && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 999999 }}>
          <div style={{ backgroundColor: 'white', padding: '30px', borderRadius: '12px', width: '90%', maxWidth: '420px', textAlign: 'center', boxShadow: '0 10px 30px rgba(0,0,0,0.3)' }}>
            <div style={{ fontSize: '3.5rem', marginBottom: '10px' }}>{popup.tipo === 'sucesso' ? '✅' : popup.tipo === 'aviso' ? '⚠️' : '❌'}</div>
            <h3 style={{ color: '#2c3e50', fontSize: '1.4rem', marginBottom: '12px' }}>{popup.titulo}</h3>
            <p style={{ color: '#7f8c8d', fontSize: '1rem', lineHeight: '1.5', marginBottom: '25px', whiteSpace: 'pre-wrap' }}>{popup.mensagem}</p>
            <button onClick={() => { setPopup({ ...popup, visivel: false }); if (popup.onConfirm) popup.onConfirm(); }} style={{ backgroundColor: popup.tipo === 'sucesso' ? '#27ae60' : popup.tipo === 'aviso' ? '#f39c12' : '#e74c3c', color: 'white', border: 'none', padding: '12px 0', width: '100%', borderRadius: '8px', fontSize: '1.1rem', fontWeight: 'bold', cursor: 'pointer' }}>Entendi</button>
          </div>
        </div>
      )}

      {/* MODAL DO SCANNER DE CÓDIGO DE BARRAS */}
      {scannerAtivo && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.85)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 999999, padding: '20px' }}>
          <div style={{ backgroundColor: 'white', padding: '30px', borderRadius: '12px', width: '100%', maxWidth: '500px', textAlign: 'center', position: 'relative' }}>
            <button onClick={() => setScannerAtivo(null)} style={{ position: 'absolute', top: '10px', right: '15px', background: 'none', border: 'none', fontSize: '1.5rem', cursor: 'pointer' }}>✖</button>
            <h3 style={{ color: '#2c3e50', marginBottom: '10px' }}>📷 Modo Scanner</h3>
            <p style={{ color: '#7f8c8d', fontSize: '1.1rem', marginBottom: '20px' }}><strong>{scannerAtivo.descricaoFornecedor || 'Produto sem descrição'}</strong></p>
            
            <div style={{ width: '120px', height: '120px', borderRadius: '50%', backgroundColor: '#f4f6f8', border: '6px solid #3498db', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px', flexDirection: 'column' }}>
              <span style={{ fontSize: '2rem', fontWeight: 'bold', color: '#2c3e50' }}>{itens.find(i => i.id === scannerAtivo.id)?.quantidadeBipada}</span>
              <span style={{ fontSize: '0.9rem', color: '#7f8c8d' }}>de {scannerAtivo.quantidade}</span>
            </div>

            <input 
              type="text" 
              ref={inputBipRef}
              style={{ width: '1px', height: '1px', opacity: 0, position: 'absolute' }} 
              onBlur={() => inputBipRef.current && inputBipRef.current.focus()} 
              onKeyDown={(e) => { if (e.key === 'Enter') processarLeitura(); }}
            />
            
            <p style={{ fontSize: '0.9rem', color: '#e67e22', marginBottom: '15px' }}>Aguardando leitura do código de barras...</p>
            <button type="button" onClick={processarLeitura} style={{ background: '#3498db', color: 'white', border: 'none', padding: '12px 20px', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer', width: '100%' }}>Simular Leitura Manual</button>
          </div>
        </div>
      )}
      
      <div className="recebimento-header no-print">
        <div>
          <h2>📦 Registro de Recebimento de Mercadorias</h2>
          <p>Conferência física, controle FEFO e entrada de notas fiscais.</p>
        </div>
        <div style={{ display: 'flex', gap: '10px' }}>
          <button type="button" className="btn-voltar-recebimento" onClick={aoVoltar}>← Voltar</button>
        </div>
      </div>

      <form className="recebimento-form" onSubmit={handleSalvarRecebimento}>
        <div className="recebimento-card">
          <div className="card-titulo-flex">
            <h3>📑 Dados da Nota Fiscal / Carga</h3>
            <span className="badge-relatorio-id">Nº Relatório: <strong>{numeroRelatorio}</strong></span>
          </div>

          <div className="form-grid-4">
            <div className="input-group"><label>Loja Recebedora *</label><select value={lojaRecebedora} onChange={(e) => setLojaRecebedora(e.target.value)} disabled={status !== 'Pendente'}><option value="Matriz">Matriz</option><option value="Araturi">Araturi</option><option value="Conjunto Ceará">Conjunto Ceará</option><option value="Messejana">Messejana</option><option value="Mulungu">Mulungu</option></select></div>
            <div className="input-group"><label>Nome do Fornecedor *</label><input type="text" value={nomeFornecedor} onChange={(e) => setNomeFornecedor(e.target.value)} required disabled={status !== 'Pendente'} /></div>
            <div className="input-group"><label>Marca *</label><input type="text" value={marca} onChange={(e) => setMarca(e.target.value)} required disabled={status !== 'Pendente'} /></div>
            <div className="input-group"><label>Número da NF *</label><input type="text" value={numeroNF} onChange={(e) => setNumeroNF(e.target.value)} required disabled={status !== 'Pendente'} /></div>
            <div className="input-group"><label>Qtd. de Caixas / Volumes *</label><input type="number" value={volumes} onChange={(e) => setVolumes(e.target.value)} required disabled={status !== 'Pendente'} /></div>
            <div className="input-group"><label>Número do Pedido (Opcional)</label><input type="text" value={numeroPedido} onChange={(e) => setNumeroPedido(e.target.value)} disabled={status !== 'Pendente'} /></div>
          </div>
        </div>

        {status === 'Pendente' && (
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '-5px', marginBottom: '20px' }} className="no-print">
            <button type="button" onClick={handleSalvarPendencia} disabled={processando} style={{ background: '#f39c12', color: 'white', border: 'none', padding: '12px 25px', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer' }}>
              {processando ? '⏳...' : '📥 Salvar Carga Pendente'}
            </button>
          </div>
        )}

        <div className="recebimento-card">
          <div className="card-titulo-flex">
            <h3>🛒 Produtos da Nota / Conferência de Lote</h3>
            {status === 'Em Conferência' && !pausaAtivaInicio && (
              <div style={{ display: 'flex', gap: '10px' }} className="no-print">
                <button type="button" onClick={() => solicitarPausaAoLider('Pausa para Almoço')} style={{ padding: '8px 12px', backgroundColor: '#f1c40f', color: '#856404', border: 'none', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer' }}>🍔 Pausa Almoço</button>
                <button type="button" onClick={() => solicitarPausaAoLider('Fim de Expediente')} style={{ padding: '8px 12px', backgroundColor: '#34495e', color: 'white', border: 'none', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer' }}>🌙 Fim de Expediente</button>
              </div>
            )}
          </div>

          <div className="input-group" style={{ marginBottom: '20px' }}>
            <label>Nome do Responsável Recebedor *</label>
            <div style={{ display: 'flex', gap: '10px' }}>
              <input type="text" value={responsavelRecebedor} onChange={(e) => setResponsavelRecebedor(e.target.value)} disabled={status !== 'Pendente'} style={{ flex: 1 }} />
              {status === 'Pendente' && (
                <button type="button" onClick={handleIniciarConferencia} style={{ background: '#27ae60', color: 'white', border: 'none', padding: '0 20px', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer' }}>▶️ Iniciar Conferência</button>
              )}
            </div>
          </div>

          {status !== 'Pendente' && (
            <div style={{ backgroundColor: '#2c3e50', color: 'white', padding: '15px', borderRadius: '8px', textAlign: 'center', marginBottom: '20px' }}>
              <div style={{ fontSize: '2.5rem', fontWeight: 'bold' }}>{formatarTempo(tempoDecorrido)}</div>
            </div>
          )}

          {status !== 'Pendente' && !pausaAtivaInicio && (
            <div className="tabela-recebimento-wrapper">
              <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '10px' }}>
                <button type="button" className="btn-adicionar-linha no-print" onClick={handleAdicionarItemVazio}>+ Novo Produto Vazio</button>
              </div>
              <table className="tabela-recebimento">
                <thead>
                  <tr>
                    <th>Cód. Fornecedor *</th>
                    <th>Descrição *</th>
                    <th>Validade *</th>
                    <th>Qtd Lote *</th>
                    <th>Conferido (Bip)</th>
                    <th>Avarias</th>
                    <th className="no-print">Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {itens.map((item) => (
                    <tr key={item.id}>
                      <td><input type="text" value={item.codigoFornecedor} onChange={(e) => handleAtualizarItem(item.id, 'codigoFornecedor', e.target.value)} required disabled={status === 'Concluída'} /></td>
                      <td><input type="text" value={item.descricaoFornecedor} onChange={(e) => handleAtualizarItem(item.id, 'descricaoFornecedor', e.target.value)} required disabled={status === 'Concluída'} /></td>
                      <td><input type="month" value={item.validade} onChange={(e) => handleAtualizarItem(item.id, 'validade', e.target.value)} required disabled={status === 'Concluída'} /></td>
                      <td><input type="number" style={{ width: '80px' }} value={item.quantidade} onChange={(e) => handleAtualizarItem(item.id, 'quantidade', e.target.value)} required disabled={status === 'Concluída'} /></td>
                      <td>
                        <div className="bip-conferencia-grupo">
                          <span className="contador-bip" style={{ color: Number(item.quantidadeBipada) >= Number(item.quantidade) ? '#27ae60' : '#e74c3c' }}>
                            {item.quantidadeBipada} un
                          </span>
                          {status !== 'Concluída' && Number(item.quantidadeBipada) < Number(item.quantidade) && (
                            <button type="button" className="btn-bip-rapido no-print" onClick={() => abrirModalScanner(item)}>📷 Bip</button>
                          )}
                        </div>
                      </td>
                      <td><input type="number" style={{ width: '80px' }} value={item.avarias} onChange={(e) => handleAtualizarItem(item.id, 'avarias', e.target.value)} disabled={status === 'Concluída'} /></td>
                      <td className="no-print" style={{ display: 'flex', gap: '5px' }}>
                        {status !== 'Concluída' && (
                          <>
                            <button type="button" onClick={() => handleDuplicarParaNovoLote(item)} title="Criar novo lote (outra validade)" style={{ background: '#3498db', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', padding: '5px' }}>➕ Lote</button>
                            <button type="button" onClick={() => handleRemoverItem(item.id)} title="Remover" style={{ background: '#e74c3c', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', padding: '5px' }}>🗑️</button>
                          </>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div className="recebimento-card">
          <h3>💬 Observações Gerais / Condição da Carga *</h3>
          <div className="input-group" style={{ marginTop: '10px' }}>
            <textarea rows="3" value={observacoes} onChange={(e) => setObservacoes(e.target.value)} disabled={status === 'Concluída'}></textarea>
          </div>
        </div>

        {status === 'Em Conferência' && !pausaAtivaInicio && (
          <div className="recebimento-footer-acoes no-print">
            <button type="submit" className="btn-salvar-rec" disabled={processando}>{processando ? '⏳...' : '💾 Finalizar e Salvar Lotes'}</button>
          </div>
        )}
      </form>
    </div>
  );
}