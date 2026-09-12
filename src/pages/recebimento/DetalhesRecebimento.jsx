import React, { useState, useEffect, useRef } from 'react';
import { Html5Qrcode, Html5QrcodeSupportedFormats } from 'html5-qrcode';
import { supabase } from '../../services/supabase';
import '../../styles/pages/recebimento/recebimento.css';

// Importando os módulos fatiados
import CabecalhoRecebimento from './detalhes/CabecalhoRecebimento';
import ObservacoesRecebimento from './detalhes/ObservacoesRecebimento';
import EdicaoRecebimento from './detalhes/EdicaoRecebimento';
import CronometroRecebimento from './detalhes/CronometroRecebimento';
import TabelaProdutosRecebimento from './detalhes/TabelaProdutosRecebimento';
import ImpressaoRecebimento from './detalhes/ImpressaoRecebimento';

export default function DetalhesRecebimento({ recebimento, aoVoltar, usuarioLogado }) {
  // ==========================================
  // 1. ESTADOS GERAIS E CABEÇALHO
  // ==========================================
  const [lojaRecebedora, setLojaRecebedora] = useState(recebimento?.loja_recebedora || 'Matriz');
  const [numeroRelatorio, setNumeroRelatorio] = useState(recebimento?.numero_relatorio || 'REC.X.000');
  const [nomeFornecedor, setNomeFornecedor] = useState(recebimento?.nome_fornecedor || '');
  const [marca, setMarca] = useState(recebimento?.marca || '');
  const [numeroNF, setNumeroNF] = useState(recebimento?.numero_nf || '');
  const [volumes, setVolumes] = useState(recebimento?.volumes || '');
  const [numeroPedido, setNumeroPedido] = useState(recebimento?.numero_pedido || '');
  
  const [responsavelRecebedor, setResponsavelRecebedor] = useState(recebimento?.responsavel_recebedor || usuarioLogado?.nome_completo || '');
  
  const [responsavelCadastro, setResponsavelCadastro] = useState(recebimento?.responsavel_cadastro || usuarioLogado?.nome_completo || '');
  const [observacoes, setObservacoes] = useState(recebimento?.observacoes || '');

  const [itens, setItens] = useState(
    recebimento?.itens && recebimento.itens.length > 0 
      ? recebimento.itens 
      : [{ id: Date.now(), codigoFornecedor: '', codigoBarras: '', codigoSistema: '', descricaoFornecedor: '', quantidade: '', validade: '', quantidadeBipada: 0, avarias: 0, obsItem: '', precoCusto: '', precoVenda: '' }]
  );

  const [status, setStatus] = useState(recebimento?.status || 'Pendente');
  const [inicioConferencia, setInicioConferencia] = useState(recebimento?.metricas_recebimento?.inicioConferencia || null);
  const [tempoDecorrido, setTempoDecorrido] = useState(recebimento?.metricas_recebimento?.tempoTotalSegundos || 0);
  const [metricasRecebimento, setMetricasRecebimento] = useState(recebimento?.metricas_recebimento || null);

  const [processando, setProcessando] = useState(false);
  const [popup, setPopup] = useState({ visivel: false, tipo: '', titulo: '', mensagem: '', onConfirm: null });

  // ==========================================
  // 2. ESTADOS DE EDIÇÃO E OBSERVAÇÕES
  // ==========================================
  const [isEditing, setIsEditing] = useState(false);
  const [modoNomeEdicao, setModoNomeEdicao] = useState(false);
  const [nomeEditor, setNomeEditor] = useState('');
  const [novaObservacao, setNovaObservacao] = useState('');

  // ==========================================
  // 3. ESTADOS DA CÂMERA, PAUSAS E BIP MANUAL
  // ==========================================
  const [scannerAtivo, setScannerAtivo] = useState(null); 
  const html5QrCodeRef = useRef(null);
  const ultimoBipTempo = useRef(0);
  const ultimoBipTexto = useRef("");

  const [pausaPendente, setPausaPendente] = useState(false);
  const [pausaAtivaInicio, setPausaAtivaInicio] = useState(null);
  const [pausaAtivaId, setPausaAtivaId] = useState(null);
  const [tipoPausaAtiva, setTipoPausaAtiva] = useState(null);
  const [tempoPausadoTotal, setTempoPausadoTotal] = useState(0);

  const isEncarregado = usuarioLogado?.hierarquia === 'Encarregado' || usuarioLogado?.username === 'admin' || usuarioLogado?.acesso_admin;
  const [pedidosBip, setPedidosBip] = useState({});
  const [codigoManual, setCodigoManual] = useState({});
  const pedidosBipAntigoRef = useRef({});

  // ==========================================
  // 4. MODO ESPECTADOR (LOCKING GLOBAL)
  // ==========================================
  const idConferente = metricasRecebimento?.id_conferente || recebimento?.metricas_recebimento?.id_conferente;
  const meuId = usuarioLogado?.username || usuarioLogado?.nome_completo;
  
  const isViewer = status === 'Em Conferência' && idConferente && idConferente !== meuId;
  const souOConferente = status === 'Em Conferência' && (!idConferente || idConferente === meuId);

  const exibirPopup = (tipo, titulo, mensagem, onConfirm = null) => {
    setPopup({ visivel: true, tipo, titulo, mensagem, onConfirm });
  };

  const tocarBipSucesso = () => {
    try {
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      const osc = ctx.createOscillator();
      osc.type = 'sine'; osc.frequency.setValueAtTime(800, ctx.currentTime);
      osc.connect(ctx.destination); osc.start(); osc.stop(ctx.currentTime + 0.1); 
    } catch(e) {}
  };

  const tocarBipErro = () => {
    try {
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      const osc = ctx.createOscillator();
      osc.type = 'sawtooth'; osc.frequency.setValueAtTime(150, ctx.currentTime); 
      osc.connect(ctx.destination); osc.start(); osc.stop(ctx.currentTime + 0.5); 
    } catch(e) {}
  };

  // ==========================================
  // 5. SINCRONIZAÇÃO COMPLETA DAS PROPS
  // ==========================================
  useEffect(() => {
    if (recebimento) {
      setLojaRecebedora(recebimento.loja_recebedora || 'Matriz');
      setNumeroRelatorio(recebimento.numero_relatorio || 'REC.X.000');
      setNomeFornecedor(recebimento.nome_fornecedor || '');
      setMarca(recebimento.marca || '');
      setNumeroNF(recebimento.numero_nf || '');
      setVolumes(recebimento.volumes || '');
      setNumeroPedido(recebimento.numero_pedido || '');
      setResponsavelRecebedor(recebimento.responsavel_recebedor || usuarioLogado?.nome_completo || '');
      setResponsavelCadastro(recebimento.responsavel_cadastro || usuarioLogado?.nome_completo || '');
      setObservacoes(recebimento.observacoes || '');
      setStatus(recebimento.status || 'Pendente');

      if (recebimento.metricas_recebimento) {
        setMetricasRecebimento(recebimento.metricas_recebimento);
        if (recebimento.metricas_recebimento.inicioConferencia) {
          const tsInicio = Number(recebimento.metricas_recebimento.inicioConferencia);
          setInicioConferencia(tsInicio);
          
          if (recebimento.status === 'Em Conferência') {
            const diferenca = Date.now() - tsInicio - tempoPausadoTotal;
            if (diferenca > 0) setTempoDecorrido(Math.floor(diferenca / 1000));
          }
        }
        if (recebimento.status === 'Concluída' || recebimento.status === 'Cancelada' || recebimento.status === 'Aguardando Cadastro' || recebimento.status === 'Aguardando Precificação') {
          setTempoDecorrido(recebimento.metricas_recebimento.tempoTotalSegundos || 0);
        }
      }

      // 🚀 CORREÇÃO DO BUG DE APAGAR PREÇOS: 
      // Agora o sistema SÓ subscreve a tabela do banco se NÃO estiver na etapa de precificação,
      // garantindo que o que você digita não seja apagado pelo recarregamento do painel.
      if (isViewer || (recebimento.status !== 'Em Conferência' && recebimento.status !== 'Aguardando Precificação')) {
        if (recebimento.itens && recebimento.itens.length > 0) {
          setItens(recebimento.itens);
        }
      }
    }
  }, [recebimento, isViewer, tempoPausadoTotal, usuarioLogado]);

  // Motor do Relógio
  useEffect(() => {
    let intervalo;
    if (status === 'Em Conferência' && !metricasRecebimento?.tempoTotalSegundos) {
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
        if (p.status === 'pendente') setPausaPendente(true);
        else if (p.status === 'aprovada' && !pausaAtivaInicio) { setPausaPendente(false); setPausaAtivaInicio(p.inicio_pausa); setPausaAtivaId(p.id); setTipoPausaAtiva(p.tipo_pausa); } 
        else if (p.status === 'recusada') setPausaPendente(false);
      }
    };
    fetchPausa();
    const intId = setInterval(fetchPausa, 5000);
    return () => clearInterval(intId);
  }, [numeroRelatorio, usuarioLogado, status, pausaAtivaInicio]);

  useEffect(() => {
    setPedidosBip({});
    setCodigoManual({});
    pedidosBipAntigoRef.current = {};

    if (!usuarioLogado || isEncarregado) return;

    const fetchAuths = async () => {
      const { data, error } = await supabase.from('autorizacoes_bip')
        .select('*').eq('requisicao_id', numeroRelatorio).eq('solicitante_nome', usuarioLogado.nome_completo).order('timestamp_criacao', { ascending: true });
        
      if (!error && data) {
        const mapNovo = {};
        data.forEach(d => {
          mapNovo[d.produto_codigo] = d.status;
          const statusAntigo = pedidosBipAntigoRef.current[d.produto_codigo];
          if (statusAntigo && statusAntigo !== d.status) {
            if (d.status === 'aprovado') {
              tocarBipSucesso();
              exibirPopup('sucesso', 'Bip Manual Liberado!', `O encarregado liberou a digitação manual para o produto:\n\n${d.produto_descricao}`);
            } else if (d.status === 'recusado') {
              tocarBipErro();
              exibirPopup('erro', 'Liberação Recusada', `Atenção, o encarregado recusou a liberação para:\n\n${d.produto_descricao}`);
            }
          }
        });
        pedidosBipAntigoRef.current = mapNovo;
        setPedidosBip(mapNovo);
      }
    };

    fetchAuths();
    const intervaloAuth = setInterval(fetchAuths, 5000);
    return () => clearInterval(intervaloAuth);
  }, [numeroRelatorio, usuarioLogado, isEncarregado]);

  const formatarTempo = (segundos) => {
    const h = Math.floor(segundos / 3600).toString().padStart(2, '0');
    const m = Math.floor((segundos % 3600) / 60).toString().padStart(2, '0');
    const s = (segundos % 60).toString().padStart(2, '0');
    return `${h}:${m}:${s}`;
  };

  const solicitarBipManual = async (item) => {
    if (!usuarioLogado?.encarregado_responsavel) {
      exibirPopup('erro', 'Sem Encarregado', 'Você não tem um Encarregado vinculado ao seu perfil.\nPeça ao administrador para atualizar o seu perfil primeiro.');
      return;
    }
    const chaveItem = String(item.id);
    setPedidosBip(prev => ({ ...prev, [chaveItem]: 'pendente' }));
    
    const { error } = await supabase.from('autorizacoes_bip').insert([{
      requisicao_id: numeroRelatorio, 
      produto_codigo: chaveItem, 
      produto_descricao: item.descricaoFornecedor || 'Produto sem descrição',
      solicitante_nome: usuarioLogado.nome_completo, 
      encarregado_destino: usuarioLogado.encarregado_responsavel,
      status: 'pendente', 
      timestamp_criacao: Date.now()
    }]).select();

    if (error) {
       exibirPopup('erro', 'Erro ao Solicitar', `Ocorreu um erro no banco de dados.\n\nDetalhe técnico: ${error.message}`);
    } else {
      exibirPopup('info', 'Solicitação Enviada', 'Pedido de autorização enviado ao encarregado. Aguarde a aprovação.');
    }
  };

  // ==========================================
  // INICIAR CONFERÊNCIA
  // ==========================================
  const handleIniciarConferencia = async () => {
    const nomeFinal = responsavelRecebedor.trim() || usuarioLogado?.nome_completo || 'Colaborador';
    if (!nomeFinal) return exibirPopup('aviso', 'Atenção', "Digite o seu nome para iniciar a conferência das unidades!");

    setProcessando(true);
    try {
      const tempoInicio = Date.now();
      const metricasIniciais = { ...(recebimento.metricas_recebimento || {}), inicioConferencia: tempoInicio, id_conferente: meuId };
      const { error } = await supabase.from('recebimento_mercadorias').update({ status: 'Em Conferência', responsavel_recebedor: nomeFinal, metricas_recebimento: metricasIniciais }).eq('id', recebimento.id);
      if (error) throw error;

      setStatus('Em Conferência');
      setResponsavelRecebedor(nomeFinal);
      setInicioConferencia(tempoInicio);
      setMetricasRecebimento(metricasIniciais);
    } catch (e) {
      exibirPopup('erro', 'Falha de Conexão', 'Não foi possível iniciar a conferência globalmente:\n\n' + e.message);
    } finally {
      setProcessando(false);
    }
  };

  const handleRetomarConferencia = async () => {
    const tempoPausadoAgora = Date.now() - Number(pausaAtivaInicio);
    setTempoPausadoTotal(prev => prev + tempoPausadoAgora);
    setPausaAtivaInicio(null); setTipoPausaAtiva(null);
    if (pausaAtivaId) await supabase.from('pausas_separacao').update({ status: 'finalizada' }).eq('id', pausaAtivaId);
    exibirPopup('sucesso', 'Conferência Retomada', 'O cronômetro voltou a correr.');
  };

  // ==========================================
  // FUNÇÕES DE AUTO-SAVE DA TABELA E MANIPULAÇÃO
  // ==========================================
  const atualizarItensE_SalvarGlobal = (novoEstadoOuFuncao) => {
    setItens(prev => {
      const novaLista = typeof novoEstadoOuFuncao === 'function' ? novoEstadoOuFuncao(prev) : novoEstadoOuFuncao;
      
      // 🚀 AGORA ELE SALVA AUTOMATICAMENTE OS PREÇOS NA ETAPA DE PRECIFICAÇÃO
      if (souOConferente || status === 'Aguardando Precificação') {
        supabase.from('recebimento_mercadorias').update({ itens: novaLista }).eq('id', recebimento.id);
      }
      return novaLista;
    });
  };

  const handleAtualizarItem = (id, campo, valor) => atualizarItensE_SalvarGlobal(prev => prev.map(item => item.id === id ? { ...item, [campo]: valor } : item));

  const handleAdicionarItemVazio = () => atualizarItensE_SalvarGlobal(prev => [
    { id: Date.now(), codigoFornecedor: '', codigoBarras: '', codigoSistema: '', descricaoFornecedor: '', quantidade: '', validade: '', quantidadeBipada: 0, avarias: 0, obsItem: '', precoCusto: '', precoVenda: '' },
    ...prev
  ]);
  
  const handleDuplicarParaNovoLote = (itemOriginal) => {
    const novoLote = { id: Date.now(), codigoFornecedor: itemOriginal.codigoFornecedor, codigoBarras: itemOriginal.codigoBarras, codigoSistema: itemOriginal.codigoSistema, descricaoFornecedor: itemOriginal.descricaoFornecedor, quantidade: '', validade: '', quantidadeBipada: 0, avarias: 0, obsItem: '', precoCusto: itemOriginal.precoCusto, precoVenda: itemOriginal.precoVenda };
    atualizarItensE_SalvarGlobal(prev => {
      const index = prev.findIndex(i => i.id === itemOriginal.id);
      const novaLista = [...prev];
      novaLista.splice(index + 1, 0, novoLote);
      return novaLista;
    });
  };

  const handleRemoverItem = (id) => {
    if (itens.length === 1) return exibirPopup('aviso', 'Mínimo de Itens', "O recebimento precisa ter pelo menos um item registrado.");
    atualizarItensE_SalvarGlobal(prev => prev.filter(item => item.id !== id));
  };

  // ==========================================
  // BUSCA INTELIGENTE DO PRODUTO
  // ==========================================
  const buscarProdutoPorCodigo = async (itemId, codigoBarras) => {
    handleAtualizarItem(itemId, 'codigoBarras', codigoBarras);
    if (!codigoBarras || codigoBarras.trim() === '') return;

    try {
      const { data, error } = await supabase
        .from('base_produtos')
        .select('codigo, descricao')
        .eq('codigo_barra', codigoBarras.trim())
        .single();

      if (data) {
        atualizarItensE_SalvarGlobal(prev => prev.map(item => item.id === itemId ? { 
          ...item, 
          codigoSistema: data.codigo, 
          descricaoFornecedor: data.descricao 
        } : item));
      } else {
        throw new Error('Não encontrado');
      }
    } catch (err) {
      atualizarItensE_SalvarGlobal(prev => prev.map(item => item.id === itemId ? { 
        ...item, 
        codigoSistema: '-', 
        descricaoFornecedor: 'NOVO CADASTRO' 
      } : item));
    }
  };

  const fecharModalScanner = () => {
    if (html5QrCodeRef.current) {
      html5QrCodeRef.current.stop().then(() => {
        html5QrCodeRef.current.clear();
        html5QrCodeRef.current = null;
        setScannerAtivo(null);
      }).catch(err => {
        html5QrCodeRef.current = null;
        setScannerAtivo(null);
      });
    } else {
      setScannerAtivo(null);
    }
  };

  const abrirModalScanner = async (item, tipo = 'contagem') => {
    if (tipo === 'contagem' && (!item.quantidade || Number(item.quantidade) <= 0)) {
      return exibirPopup('aviso', 'Atenção', 'Informe a quantidade na NF antes de iniciar a conferência.');
    }
    setScannerAtivo({ item, tipo });
  };

  useEffect(() => {
    let isComponentMounted = true;

    if (scannerAtivo !== null && !isViewer) {
      setTimeout(() => {
        if (!isComponentMounted) return;
        const scanner = new Html5Qrcode('leitor-camera-modal', {
          formatsToSupport: [
            Html5QrcodeSupportedFormats.EAN_13,
            Html5QrcodeSupportedFormats.EAN_8,
            Html5QrcodeSupportedFormats.CODE_128,
            Html5QrcodeSupportedFormats.UPC_A,
            Html5QrcodeSupportedFormats.CODE_39
          ]
        });
        html5QrCodeRef.current = scanner;
        const configCamera = { fps: 10, qrbox: { width: 250, height: 100 } };

        scanner.start({ facingMode: "environment" }, configCamera,
          (decodedText) => {
            const agora = Date.now();
            if (decodedText === ultimoBipTexto.current && (agora - ultimoBipTempo.current < 1500)) return;
            ultimoBipTexto.current = decodedText;
            ultimoBipTempo.current = agora;

            if (scannerAtivo.tipo === 'identificacao') {
              tocarBipSucesso();
              buscarProdutoPorCodigo(scannerAtivo.item.id, decodedText);
              fecharModalScanner();
            } else {
              incrementarBip(scannerAtivo.item.id);
            }
          },
          (err) => { }
        ).catch(err => {
          console.error("Erro ao iniciar câmera:", err);
          exibirPopup('erro', 'Erro de Câmera', 'Não foi possível iniciar a câmera. Verifique as permissões.');
          setScannerAtivo(null);
        });
      }, 150);
    }

    return () => {
      isComponentMounted = false;
      if (html5QrCodeRef.current) {
        html5QrCodeRef.current.stop().then(() => {
          html5QrCodeRef.current.clear();
          html5QrCodeRef.current = null;
        }).catch(err => {
          html5QrCodeRef.current = null;
        });
      }
    };
  }, [scannerAtivo, isViewer]);

  const incrementarBip = (itemId) => {
    atualizarItensE_SalvarGlobal(prev => {
      const itemAtual = prev.find(i => i.id === itemId);
      if (!itemAtual) return prev;

      const meta = Number(itemAtual.quantidade);
      
      if (meta > 0 && Number(itemAtual.quantidadeBipada) >= meta) {
        setTimeout(() => {
          tocarBipErro();
          exibirPopup('aviso', 'Limite Atingido!', `Atenção: Você já conferiu todas as ${meta} unidades deste produto.`);
          fecharModalScanner();
        }, 0);
        return prev; 
      }

      setTimeout(() => tocarBipSucesso(), 0);

      return prev.map(item => {
        if (item.id === itemId) {
          const novaQtd = Number(item.quantidadeBipada) + 1;
          if (novaQtd >= meta && meta > 0) {
            setTimeout(() => fecharModalScanner(), 400);
          }
          return { ...item, quantidadeBipada: novaQtd };
        }
        return item;
      });
    });
  };

  // ==========================================
  // FUNÇÕES DE EDIÇÃO E BANCO
  // ==========================================
  const handleAdicionarObservacao = async () => {
    if (!novaObservacao.trim()) return;
    setProcessando(true);
    const autor = usuarioLogado?.nome_completo || 'Usuário';
    const dataHora = new Date().toLocaleString('pt-BR');
    const textoAdicional = `[${dataHora}] ${autor}: ${novaObservacao}`;
    const observacaoAtualizada = observacoes ? `${observacoes}\n\n${textoAdicional}` : textoAdicional;
    try {
      await supabase.from('recebimento_mercadorias').update({ observacoes: observacaoAtualizada }).eq('id', recebimento.id);
      setObservacoes(observacaoAtualizada); setNovaObservacao('');
    } catch (e) { exibirPopup('erro', 'Erro', e.message); } finally { setProcessando(false); }
  };

  const confirmarModoEdicao = () => {
    if (!nomeEditor.trim()) return exibirPopup('aviso', 'Atenção', 'Informe o seu nome para habilitar a edição.');
    const msgEdicao = `[${new Date().toLocaleString('pt-BR')}] Sistema: Editado por ${nomeEditor.trim()}.`;
    setObservacoes(prev => prev ? `${prev}\n\n${msgEdicao}` : msgEdicao);
    setIsEditing(true); setModoNomeEdicao(false);
  };

  const salvarEdicao = async () => {
    if (!nomeFornecedor.trim() || !numeroNF.trim() || !volumes) return exibirPopup('aviso', 'Campos Incompletos', "Preencha Fornecedor, NF e Volumes.");
    setProcessando(true);
    try {
      await supabase.from('recebimento_mercadorias').update({ loja_recebedora: lojaRecebedora, nome_fornecedor: nomeFornecedor, marca: marca, numero_nf: numeroNF, volumes: Number(volumes), numero_pedido: numeroPedido || null, observacoes: observacoes, itens: itens }).eq('id', recebimento.id);
      setIsEditing(false); exibirPopup('sucesso', 'Salvo', 'Atualizado com sucesso.');
    } catch (e) { exibirPopup('erro', 'Erro', e.message); } finally { setProcessando(false); }
  };

  const cancelarRecebimento = async () => {
    if (!window.confirm("TEM CERTEZA que deseja excluir esta carga?")) return;
    setProcessando(true);
    try {
      await supabase.from('recebimento_mercadorias').update({ status: 'Cancelada', observacoes: observacoes }).eq('id', recebimento.id);
      exibirPopup('sucesso', 'Carga Cancelada', 'Inativado com sucesso.', () => { if(aoVoltar) aoVoltar(); });
    } catch (e) { exibirPopup('erro', 'Erro', e.message); } finally { setProcessando(false); }
  };

  const handleSalvarProgressoFisico = async () => {
    setProcessando(true);
    try {
      await supabase.from('recebimento_mercadorias').update({ itens: itens }).eq('id', recebimento.id);
      exibirPopup('sucesso', 'Progresso Salvo', 'A contagem dos produtos foi gravada com segurança no banco de dados. Você pode continuar a conferência sem medo de perder os dados.');
    } catch (error) {
      exibirPopup('erro', 'Erro ao Salvar', error.message);
    } finally {
      setProcessando(false);
    }
  };

  const solicitarPausaAoLider = async (tipoPausa) => {
    if (!usuarioLogado?.encarregado_responsavel) {
      exibirPopup('erro', 'Ação Negada', 'Você não tem um Encarregado vinculado ao seu perfil.');
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
      exibirPopup('sucesso', 'Pausa Solicitada!', `Sua pausa para ${tipoPausa} foi enviada.\n\nAguarde a aprovação do encarregado.`);
    }
  };

  // ==========================================
  // ETAPA 1: FINALIZA A CONFERÊNCIA FÍSICA E MUDA P/ "AGUARDANDO PRECIFICAÇÃO"
  // ==========================================
  const handleSalvarRecebimentoFinal = async (e) => {
    e.preventDefault();
    if (isViewer) return; 

    if (!responsavelRecebedor.trim()) return exibirPopup('aviso', 'Responsável', "Digite o nome de quem conferiu os produtos.");
    if (itens.some(i => !i.descricaoFornecedor.trim() || !i.quantidade || !i.validade.trim())) {
      return exibirPopup('aviso', 'Dados dos Produtos', "Todos os produtos precisam ter Descrição, Validade (Mês/Ano) e Quantidade NF.");
    }
    setProcessando(true);
    try {
      const totalItens = itens.reduce((acc, item) => acc + Number(item.quantidade), 0);
      const upm = tempoDecorrido > 0 ? (totalItens / tempoDecorrido) * 60 : 0;
      const pts = Math.round(totalItens * Number(upm.toFixed(1)) * 1.5);
      const metricasFinais = { inicioConferencia: inicioConferencia, id_conferente: meuId, tempoTotalSegundos: tempoDecorrido, totalItensFisicos: totalItens, upm: Number(upm.toFixed(1)), pontosGanhos: pts, responsavel: responsavelRecebedor, finalizadoEm: new Date().toISOString() };
      const itensComLote = itens.map((item, index) => ({ ...item, loteInterno: item.loteInterno || `LT-${numeroRelatorio}-${String(index + 1).padStart(2, '0')}` }));

      await supabase.from('recebimento_mercadorias').update({ 
        responsavel_recebedor: responsavelRecebedor, 
        observacoes: observacoes, 
        itens: itensComLote, 
        metricas_recebimento: metricasFinais, 
        status: 'Aguardando Precificação' 
      }).eq('id', recebimento.id);
      
      setStatus('Aguardando Precificação');
      exibirPopup('sucesso', 'Conferência Física Finalizada! 📦', `Os produtos do relatório ${numeroRelatorio} foram conferidos fisicamente.\n\nAgora a nota aguarda a precificação da gerência na próxima etapa.`);
    } catch (error) { 
      exibirPopup('erro', 'Falha ao Finalizar', error.message); 
    } finally { 
      setProcessando(false); 
    }
  };

  // ==========================================
  // ETAPA 2: APROVAR PRECIFICAÇÃO E MUDAR P/ "AGUARDANDO CADASTRO"
  // ==========================================
  const handleAprovarPrecificacao = async () => {
    setProcessando(true);
    try {
      await supabase.from('recebimento_mercadorias').update({
        status: 'Aguardando Cadastro',
        itens: itens
      }).eq('id', recebimento.id);

      setStatus('Aguardando Cadastro');
      exibirPopup('sucesso', 'Precificação Concluída! 💲', `Os preços foram registrados com sucesso.\n\nAgora a nota aguarda o lançamento final no sistema da loja.`);
    } catch (error) {
      exibirPopup('erro', 'Erro', error.message);
    } finally {
      setProcessando(false);
    }
  };

  // ==========================================
  // ETAPA 3: ASSINATURA DE QUEM FEZ O CADASTRO E CONCLUSÃO DEFINITIVA
  // ==========================================
  const handleConcluirCadastro = async () => {
    if (!responsavelCadastro.trim()) {
      return exibirPopup('aviso', 'Responsável do Cadastro', 'Informe o nome de quem lançou a nota no sistema da loja.');
    }
    setProcessando(true);
    try {
      await supabase.from('recebimento_mercadorias').update({
        status: 'Concluída',
        responsavel_cadastro: responsavelCadastro.trim()
      }).eq('id', recebimento.id);

      setStatus('Concluída');
      exibirPopup('sucesso', 'Recebimento 100% Concluído! 🏆', `A nota foi conferida e cadastrada no sistema com sucesso.`, () => { if (aoVoltar) aoVoltar(); });
    } catch (error) {
      exibirPopup('erro', 'Erro', error.message);
    } finally {
      setProcessando(false);
    }
  };

  return (
    <div className="recebimento-container" style={{ position: 'relative' }}>
      
      {/* POPUP E SCANNER DA TELA (INVISÍVEIS NA IMPRESSÃO) */}
      <div className="no-print">
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

        {scannerAtivo && !isViewer && (
          <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.9)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', zIndex: 999999, padding: '15px' }}>
            <div style={{ width: '100%', maxWidth: '450px', backgroundColor: 'white', borderRadius: '12px', overflow: 'hidden', textAlign: 'center', position: 'relative' }}>
              <div style={{ padding: '15px', backgroundColor: '#2c3e50', color: 'white', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h3 style={{ margin: 0, fontSize: '1.1rem' }}>📷 {scannerAtivo.tipo === 'identificacao' ? 'Bipar Cód. Barras' : 'Bip de Contagem'}</h3>
                <button onClick={fecharModalScanner} style={{ background: 'none', border: 'none', color: 'white', fontSize: '1.4rem', cursor: 'pointer' }}>✖</button>
              </div>
              <div style={{ padding: '15px' }}>
                {scannerAtivo.tipo === 'contagem' && <p style={{ margin: '0 0 10px 0', color: '#34495e', fontWeight: 'bold' }}>{scannerAtivo.item.descricaoFornecedor}</p>}
                
                <div id="leitor-camera-modal" style={{ width: '100%', borderRadius: '8px', overflow: 'hidden', backgroundColor: '#000', minHeight: '220px' }}></div>
                
                {scannerAtivo.tipo === 'contagem' ? (
                  <>
                    <div style={{ marginTop: '15px', fontSize: '1.1rem', color: '#2c3e50' }}>Conferidos: <strong style={{ color: '#27ae60' }}>{itens.find(i => i.id === scannerAtivo.item.id)?.quantidadeBipada}</strong> / {scannerAtivo.item.quantidade} un</div>
                    <button type="button" onClick={() => incrementarBip(scannerAtivo.item.id)} style={{ marginTop: '15px', backgroundColor: '#3498db', color: 'white', border: 'none', padding: '12px', width: '100%', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer' }}>+ Registrar 1 Unidade Manual</button>
                  </>
                ) : (
                  <div style={{ marginTop: '15px', fontSize: '1.1rem', color: '#2c3e50', fontWeight: 'bold' }}>Aponte para o código de barras (traços).</div>
                )}
              </div>
            </div>
          </div>
        )}
        
        <div className="recebimento-header no-print" style={{ backgroundColor: 'transparent', boxShadow: 'none', padding: '0 0 20px 0', alignItems: 'center', borderBottom: '2px solid #ecf0f1', borderRadius: '0' }}>
          <div><h2 style={{ fontSize: '1.6rem', color: '#2c3e50', margin: 0 }}>Detalhes do Recebimento {numeroRelatorio}</h2></div>
          <div style={{ display: 'flex', gap: '10px' }}>
            <button type="button" className="btn-imprimir-topo" onClick={() => window.print()} style={{ backgroundColor: '#34495e', color: 'white', border: 'none', padding: '10px 18px', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer' }}>🖨️ Imprimir Romaneio</button>
            <button className="btn-voltar-recebimento" onClick={aoVoltar} style={{ backgroundColor: 'transparent', color: '#8e44ad', border: '1px solid #8e44ad', padding: '10px 18px', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer' }}>← Voltar ao Painel</button>
          </div>
        </div>
      </div>

      <form className="recebimento-form" onSubmit={handleSalvarRecebimentoFinal}>
        
        <CabecalhoRecebimento 
          isEditing={isEditing} lojaRecebedora={lojaRecebedora} setLojaRecebedora={setLojaRecebedora}
          nomeFornecedor={nomeFornecedor} setNomeFornecedor={setNomeFornecedor} marca={marca}
          setMarca={setMarca} numeroNF={numeroNF} setNumeroNF={setNumeroNF} volumes={volumes}
          setVolumes={setVolumes} numeroPedido={numeroPedido} setNumeroPedido={setNumeroPedido}
          status={status}
        />

        <ObservacoesRecebimento 
          observacoes={observacoes} status={status} isEditing={isEditing}
          novaObservacao={novaObservacao} setNovaObservacao={setNovaObservacao}
          handleAdicionarObservacao={handleAdicionarObservacao} processando={processando}
        />

        <EdicaoRecebimento 
          status={status} isEditing={isEditing} modoNomeEdicao={modoNomeEdicao} 
          setModoNomeEdicao={setModoNomeEdicao} nomeEditor={nomeEditor} 
          setNomeEditor={setNomeEditor} confirmarModoEdicao={confirmarModoEdicao}
          responsavelRecebedor={responsavelRecebedor} setResponsavelRecebedor={setResponsavelRecebedor}
          processando={processando} handleIniciarConferencia={handleIniciarConferencia}
        />

        {status === 'Aguardando Precificação' && !isEditing && (
          <div style={{ backgroundColor: '#fcf3cf', borderLeft: '4px solid #f1c40f', borderRadius: '0 8px 8px 0', padding: '20px', boxShadow: '0 1px 3px rgba(0,0,0,0.05)', marginBottom: '20px' }} className="no-print">
            <h4 style={{ color: '#d35400', margin: '0 0 10px 0', fontSize: '1.1rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
              💲 Etapa Intermediária: Precificação (Opcional)
            </h4>
            <p style={{ color: '#34495e', margin: 0, fontSize: '0.95rem' }}>
              A conferência física foi finalizada por <strong>{responsavelRecebedor}</strong>. Preencha os preços de Custo e Venda diretamente na tabela abaixo (opcional) e confirme para liberar a nota para cadastro.
            </p>
          </div>
        )}

        {status === 'Aguardando Cadastro' && !isEditing && (
          <div style={{ backgroundColor: '#ebf5fb', borderLeft: '4px solid #3498db', borderRadius: '0 8px 8px 0', padding: '20px', boxShadow: '0 1px 3px rgba(0,0,0,0.05)', marginBottom: '20px' }} className="no-print">
            <h4 style={{ color: '#2980b9', margin: '0 0 10px 0', fontSize: '1.1rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
              💻 Última Etapa: Cadastro da NF no Sistema
            </h4>
            <p style={{ color: '#34495e', margin: '0 0 15px 0', fontSize: '0.95rem' }}>
              A precificação foi concluída. Informe quem realizou o lançamento da Nota Fiscal no sistema da loja para encerrar o processo.
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '5px', maxWidth: '600px' }}>
              <label style={{ fontSize: '0.85rem', fontWeight: 'bold', color: '#7f8c8d' }}>Resp. Cadastro da NF</label>
              <div style={{ display: 'flex', gap: '10px' }}>
                <input
                  type="text"
                  placeholder="Ex: Maria"
                  value={responsavelCadastro}
                  onChange={(e) => setResponsavelCadastro(e.target.value)}
                  style={{ flex: 1, padding: '10px 12px', border: '1px solid #dcdde1', borderRadius: '6px', outline: 'none', fontSize: '1rem', backgroundColor: '#fdfdfd' }}
                  disabled={processando}
                />
                <button type="button" onClick={handleConcluirCadastro} disabled={processando} style={{ background: '#3498db', color: 'white', border: 'none', padding: '0 25px', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer', fontSize: '1rem' }}>
                  {processando ? '⏳ Aguarde...' : 'Confirmar Cadastro ✔️'}
                </button>
              </div>
            </div>
          </div>
        )}

        {(status !== 'Pendente' || isEditing) && (
          <>
            <CronometroRecebimento 
              status={status} isViewer={isViewer} responsavelRecebedor={responsavelRecebedor}
              pausaAtivaInicio={pausaAtivaInicio} tempoDecorrido={tempoDecorrido}
              metricasRecebimento={metricasRecebimento} tipoPausaAtiva={tipoPausaAtiva}
              handleRetomarConferencia={handleRetomarConferencia} formatarTempo={formatarTempo}
            />

            <TabelaProdutosRecebimento 
              itens={itens} status={status} isEditing={isEditing} isViewer={isViewer}
              responsavelRecebedor={responsavelRecebedor} pausaAtivaInicio={pausaAtivaInicio}
              pausaPendente={pausaPendente} solicitarPausaAoLider={solicitarPausaAoLider}
              handleAtualizarItem={handleAtualizarItem} handleAdicionarItemVazio={handleAdicionarItemVazio}
              handleDuplicarParaNovoLote={handleDuplicarParaNovoLote} handleRemoverItem={handleRemoverItem}
              abrirModalScanner={abrirModalScanner} buscarProdutoPorCodigo={buscarProdutoPorCodigo}
              pedidosBip={pedidosBip} codigoManual={codigoManual} setCodigoManual={setCodigoManual}
              solicitarBipManual={solicitarBipManual} isEncarregado={isEncarregado}
              exibirPopup={exibirPopup} 
            />
          </>
        )}

        {isEditing && !isViewer && (
          <div className="recebimento-footer-acoes no-print">
            <button type="button" onClick={cancelarRecebimento} style={{ backgroundColor: '#e74c3c', color: 'white', border: 'none', padding: '12px 25px', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer' }}>🚫 Excluir / Cancelar Carga</button>
            <button type="button" onClick={() => setIsEditing(false)} className="btn-cancelar-rec">Cancelar Edição</button>
            <button type="button" onClick={salvarEdicao} className="btn-salvar-rec" disabled={processando}>{processando ? '⏳...' : '💾 Salvar Alterações'}</button>
          </div>
        )}

        {status === 'Em Conferência' && !pausaAtivaInicio && !isViewer && (
          <div className="recebimento-footer-acoes no-print">
            <button type="button" className="btn-cancelar-rec" onClick={aoVoltar}>Voltar</button>
            <button type="button" onClick={handleSalvarProgressoFisico} className="btn-salvar-rec" disabled={processando} style={{ backgroundColor: '#f39c12' }}>
              {processando ? '⏳ Salvando...' : '💾 Salvar Progresso Físico'}
            </button>
            <button type="submit" className="btn-salvar-rec" disabled={processando}>{processando ? '⏳ Processando...' : '📦 Finalizar Conferência Física'}</button>
          </div>
        )}

        {status === 'Aguardando Precificação' && !isEditing && !isViewer && (
          <div className="recebimento-footer-acoes no-print">
            <button type="button" className="btn-cancelar-rec" onClick={aoVoltar}>Voltar</button>
            <button type="button" onClick={handleAprovarPrecificacao} className="btn-salvar-rec" disabled={processando} style={{ backgroundColor: '#f39c12' }}>
              {processando ? '⏳ Salvando...' : 'Liberar para Cadastro ✔️'}
            </button>
          </div>
        )}

      </form>

      <ImpressaoRecebimento 
        numeroRelatorio={numeroRelatorio}
        lojaRecebedora={lojaRecebedora}
        nomeFornecedor={nomeFornecedor}
        marca={marca}
        numeroNF={numeroNF}
        volumes={volumes}
        numeroPedido={numeroPedido}
        responsavelRecebedor={responsavelRecebedor}
        observacoes={observacoes}
        itens={itens}
      />

    </div>
  );
}