import { useState, useRef, useEffect } from 'react';
import '../../../styles/pages/painel/nova-requisicao/novaRequisicao.css';
import FormularioCabecalho from './FormularioCabecalho';
import TabelaProdutosForm from './TabelaProdutosForm';
import CronometroCheckout from './CronometroCheckout';
import ModalAlerta from './ModalAlerta';
import { parseValorMoeda, gerarIdSequencial } from './requisicaoUtils';

export default function NovaRequisicao({ 
  aoVoltar, 
  baseProdutos, 
  aoSalvar, 
  aoCancelarReq, 
  requisicoes = [], 
  produtosPreSelecionados = null, 
  reqEmEdicao = null,
  usuarioLogado,
  recordesGlobais = {},
  tipoReposicaoGlobal = 'interna',
  inicioCronometroGlobal = null
}) {
  
  const lojas = ['Araturi', 'Conjunto Ceará', 'Messejana', 'Mulungu'];

  const [lojaDe, setLojaDe] = useState(lojas[0]);
  const [lojaPara, setLojaPara] = useState(lojas[1]);
  const [solicitante, setSolicitante] = useState(usuarioLogado?.nome_completo || '');
  
  const [motivo, setMotivo] = useState('');
  const [motivoOutro, setMotivoOutro] = useState('');
  const [prioridadeOutro, setPrioridadeOutro] = useState('3'); 
  
  const [listaObservacoes, setListaObservacoes] = useState([]); 
  const [novaObs, setNovaObs] = useState(''); 

  const [codigo, setCodigo] = useState('');
  const [descricao, setDescricao] = useState('');
  const [quantidade, setQuantidade] = useState('');
  const [itensAdicionados, setItensAdicionados] = useState([]);
  
  const [editandoIndex, setEditandoIndex] = useState(null);
  const [novaQuantidadeEdit, setNovaQuantidadeEdit] = useState('');

  const [alerta, setAlerta] = useState({ 
    visivel: false, tipo: '', titulo: '', mensagem: '', onConfirm: null, onCancel: null, textoConfirmar: 'Entendi', textoCancelar: 'Cancelar'
  });

  const inputCodigoRef = useRef(null);
  const inputArquivoRef = useRef(null);
  const alertaPreenchimentoExibido = useRef(false);

  const isModoVitrine = produtosPreSelecionados && produtosPreSelecionados.length > 0;

  const [tempoAtual, setTempoAtual] = useState(Date.now());

  useEffect(() => {
    let interval;
    if (tipoReposicaoGlobal === 'externa' && inicioCronometroGlobal) {
      interval = setInterval(() => {
        setTempoAtual(Date.now());
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [tipoReposicaoGlobal, inicioCronometroGlobal]);

  const segundosDecorridos = inicioCronometroGlobal ? Math.floor((tempoAtual - inicioCronometroGlobal) / 1000) : 0;

  const formatarTempo = (totalSegundos) => {
    const h = Math.floor(totalSegundos / 3600).toString().padStart(2, '0');
    const m = Math.floor((totalSegundos % 3600) / 60).toString().padStart(2, '0');
    const s = (totalSegundos % 60).toString().padStart(2, '0');
    return `${h}:${m}:${s}`;
  };

  useEffect(() => {
    if (reqEmEdicao) {
      setLojaDe(reqEmEdicao.origem);
      setLojaPara(reqEmEdicao.destino);
      setSolicitante(reqEmEdicao.solicitante);
      
      const isMotivoPadrao = ['Cliente', 'Rota para clientes', 'Reposição de estoque', 'Produtos para provadores', 'Reposição Interna'].includes(reqEmEdicao.motivo);
      if (isMotivoPadrao) {
        setMotivo(reqEmEdicao.motivo);
      } else {
        setMotivo('Outros');
        setMotivoOutro(reqEmEdicao.motivo);
        setPrioridadeOutro(reqEmEdicao.prioridade?.toString() || '3');
      }
      
      setItensAdicionados(reqEmEdicao.listaItens || []);
      
      let obsExistentes = [];
      if (Array.isArray(reqEmEdicao.historico?.observacoesGerais)) {
        obsExistentes = reqEmEdicao.historico.observacoesGerais;
      } else if (typeof reqEmEdicao.historico?.observacoesGerais === 'string' && reqEmEdicao.historico.observacoesGerais.trim() !== '') {
        obsExistentes = [{
          id_obs: Date.now() + Math.random(),
          texto: reqEmEdicao.historico.observacoesGerais,
          autor: 'Sistema (Nota Antiga)',
          data: reqEmEdicao.data
        }];
      }
      setListaObservacoes(obsExistentes);
      setNovaObs('');
    }
  }, [reqEmEdicao]);

  const mostrarAlerta = (tipo, titulo, mensagem, onConfirm = null, onCancel = null, textoConfirmar = 'Entendi', textoCancelar = 'Cancelar') => {
    setAlerta({ visivel: true, tipo, titulo, mensagem, onConfirm, onCancel, textoConfirmar, textoCancelar });
  };

  const fecharAlerta = () => {
    setAlerta({ ...alerta, visivel: false });
  };

  const handleAdicionarObservacao = () => {
    if (!novaObs.trim()) {
      mostrarAlerta('aviso', 'Atenção', 'Digite alguma instrução ou observação antes de adicionar.');
      return;
    }

    const nomeAutor = solicitante.trim() ? solicitante.trim() : 'Solicitante (Não preenchido)';
    const dataAtualString = new Date().toLocaleString('pt-BR');

    const novaObsObj = {
      id_obs: Date.now() + Math.random(),
      texto: novaObs,
      autor: reqEmEdicao ? `[Edição] ${nomeAutor}` : nomeAutor,
      data: dataAtualString
    };

    setListaObservacoes([...listaObservacoes, novaObsObj]);
    setNovaObs('');
  };

  const handleRemoverObservacao = (id_obs) => {
    setListaObservacoes(listaObservacoes.filter(obs => obs.id_obs !== id_obs));
  };

  useEffect(() => {
    if (isModoVitrine && !alertaPreenchimentoExibido.current && baseProdutos.length > 0) {
      alertaPreenchimentoExibido.current = true;
      
      const nomeSalvo = localStorage.getItem('nd_separador_gamificado');
      if (nomeSalvo && tipoReposicaoGlobal === 'externa') {
        setSolicitante(nomeSalvo);
      }

      const itensAuto = produtosPreSelecionados.map(prod => {
        const baseProd = baseProdutos.find(p => p.codigo === prod.codigo) || prod;
        const temEstoqueDefinido = baseProd.quantidade !== undefined && baseProd.quantidade !== null;
        const estoqueAtual = temEstoqueDefinido ? Number(baseProd.quantidade.toString().replace(',', '.')) : null;

        const qtdSolicitada = prod.quantidadeDesejada ? Number(prod.quantidadeDesejada) : 1;
        const isInsuficiente = temEstoqueDefinido && (qtdSolicitada > estoqueAtual);

        let custoUnit = 0;
        const campoCustoTotal = baseProd.custo || baseProd.precoCusto || baseProd.preco_custo;
        if (campoCustoTotal && estoqueAtual > 0) {
          const custoTotalLimpo = parseValorMoeda(campoCustoTotal);
          custoUnit = custoTotalLimpo / estoqueAtual;
        }

        return {
          cod: baseProd.codigo,
          descricao: baseProd.descricao || 'Produto não encontrado',
          quantidade: qtdSolicitada, 
          estoque: estoqueAtual,
          custoUnitario: custoUnit,
          insuficiente: isInsuficiente
        };
      });

      setItensAdicionados(itensAuto);
      setMotivo(''); 

      mostrarAlerta(
        'sucesso',
        '🛒 Produtos Importados!',
        'Sua lista de pré-requisição foi carregada com sucesso!\n\nAntes de gravar a transferência, lembre-se de:\n\n1️⃣ Escolher a Loja Solicitante (Para)\n2️⃣ Selecionar o Motivo (Prioridade)\n3️⃣ Adicionar Observações (Se necessário)',
        () => fecharAlerta(),
        null,
        'Entendi, vou revisar',
        ''
      );
    }
  }, [produtosPreSelecionados, baseProdutos, isModoVitrine, tipoReposicaoGlobal]);

  const handleMudancaCodigo = (valorDigitado) => {
    setCodigo(valorDigitado);
    const produtoEncontrado = baseProdutos.find((prod) => String(prod.codigo) === String(valorDigitado));
    if (produtoEncontrado) {
      setDescricao(`${produtoEncontrado.descricao}`);
    } else {
      setDescricao('');
    }
  };

  const adicionarNaLista = () => {
    if (!codigo || !quantidade) { 
      mostrarAlerta('erro', 'Campos Obrigatórios', 'Preencha o código do produto e a quantidade desejada!');
      return; 
    }
    
    const produto = baseProdutos.find((p) => String(p.codigo) === String(codigo));
    const temEstoqueDefinido = produto && produto.quantidade !== undefined && produto.quantidade !== null;
    const estoqueAtual = temEstoqueDefinido ? Number(produto.quantidade.toString().replace(',', '.')) : null;
    const qtdSolicitada = Number(quantidade);
    const isInsuficiente = temEstoqueDefinido && (qtdSolicitada > estoqueAtual);

    let custoUnit = 0;
    const campoCustoTotal = produto ? (produto.custo || produto.precoCusto || produto.preco_custo) : null;
    
    if (campoCustoTotal && estoqueAtual > 0) {
      const custoTotalLimpo = parseValorMoeda(campoCustoTotal);
      custoUnit = custoTotalLimpo / estoqueAtual;
    }

    const itemNovo = { 
      cod: codigo, 
      descricao: descricao || 'Produto não encontrado', 
      quantidade: qtdSolicitada,
      estoque: estoqueAtual,
      custoUnitario: custoUnit,
      insuficiente: isInsuficiente
    };

    if (isInsuficiente) {
      mostrarAlerta(
        'aviso', 
        'Estoque Insuficiente', 
        `Você está solicitando ${qtdSolicitada} un, mas o estoque atual na base é de apenas ${estoqueAtual} un!\n\nDeseja adicionar este produto mesmo assim?`,
        () => { 
          setItensAdicionados([...itensAdicionados, itemNovo]);
          setCodigo(''); setDescricao(''); setQuantidade('');
          if (inputCodigoRef.current) inputCodigoRef.current.focus();
          fecharAlerta();
        },
        () => { 
          fecharAlerta();
          if (inputCodigoRef.current) inputCodigoRef.current.focus();
        },
        'Sim, Adicionar',
        'Não, Inserir Novo'
      );
      return; 
    }

    setItensAdicionados([...itensAdicionados, itemNovo]);
    setCodigo(''); setDescricao(''); setQuantidade('');
    if (inputCodigoRef.current) inputCodigoRef.current.focus();
  };

  const iniciarEdicao = (index, qtdAtual) => {
    setEditandoIndex(index);
    setNovaQuantidadeEdit(qtdAtual);
  };

  const cancelarEdicao = () => {
    setEditandoIndex(null);
    setNovaQuantidadeEdit('');
  };

  const salvarEdicao = (index) => {
    if (!novaQuantidadeEdit || Number(novaQuantidadeEdit) <= 0) {
      mostrarAlerta('erro', 'Quantidade Inválida', 'Insira uma quantidade maior que zero para o produto!');
      return;
    }

    const itensAtualizados = [...itensAdicionados];
    const itemAtual = itensAtualizados[index];
    const novaQtd = Number(novaQuantidadeEdit);
    const isInsuficiente = itemAtual.estoque !== null && novaQtd > itemAtual.estoque;

    if (isInsuficiente) {
      mostrarAlerta(
        'aviso', 
        'Estoque Insuficiente', 
        `A nova quantidade solicitada (${novaQtd} un) ultrapassa o estoque atual (${itemAtual.estoque} un)!\n\nDeseja salvar a edição mesmo assim?`,
        () => { 
          itensAtualizados[index] = { ...itemAtual, quantidade: novaQtd, insuficiente: true };
          setItensAdicionados(itensAtualizados);
          cancelarEdicao();
          fecharAlerta();
        },
        () => fecharAlerta(),
        'Sim, Salvar',
        'Cancelar'
      );
      return; 
    }

    itensAtualizados[index] = { ...itemAtual, quantidade: novaQtd, insuficiente: false };
    setItensAdicionados(itensAtualizados);
    cancelarEdicao();
  };

  const removerDaLista = (index) => {
    mostrarAlerta(
      'aviso',
      'Remover Produto',
      'Tem certeza que deseja excluir este item da requisição?',
      () => {
        const novaLista = [...itensAdicionados];
        novaLista.splice(index, 1);
        setItensAdicionados(novaLista);
        fecharAlerta();
      },
      () => fecharAlerta(),
      'Sim, Excluir',
      'Cancelar'
    );
  };

  const handleImportarCSV = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evento) => {
      const texto = evento.target.result;
      const linhas = texto.split('\n');
      const novosItens = [];

      linhas.forEach((linha, index) => {
        if (!linha.trim()) return;
        const colunas = linha.split(/,|;/); 
        if (colunas.length >= 2) {
          const codFormatado = colunas[0].trim();
          const qtdFormatada = colunas[1].trim();

          if (index === 0 && isNaN(Number(qtdFormatada))) return;

          const produto = baseProdutos.find((p) => p.codigo === codFormatado);
          const descFinal = produto ? produto.descricao : 'Produto não encontrado';
          const temEstoqueDefinido = produto && produto.quantidade !== undefined && produto.quantidade !== null;
          const estoqueAtual = temEstoqueDefinido ? Number(produto.quantidade.toString().replace(',', '.')) : null;
          const qtdSolicitada = Number(qtdFormatada);
          const isInsuficiente = temEstoqueDefinido && (qtdSolicitada > estoqueAtual);

          let custoUnit = 0;
          const campoCustoTotal = produto ? (produto.custo || produto.precoCusto || produto.preco_custo) : null;
          if (campoCustoTotal && estoqueAtual > 0) {
            const custoTotalLimpo = parseValorMoeda(campoCustoTotal);
            custoUnit = custoTotalLimpo / estoqueAtual;
          }

          novosItens.push({
            cod: codFormatado,
            descricao: descFinal,
            quantidade: qtdSolicitada,
            estoque: estoqueAtual,
            custoUnitario: custoUnit,
            insuficiente: isInsuficiente
          });
        }
      });

      if (novosItens.length > 0) {
        setItensAdicionados(prev => [...prev, ...novosItens]);
        const qtdAlertas = novosItens.filter(item => item.insuficiente).length;
        if (qtdAlertas > 0) {
          mostrarAlerta('aviso', 'Importação Parcial', `${novosItens.length} produtos importados.\n\nATENÇÃO: ${qtdAlertas} produto(s) excedem o estoque atual e foram markedos em vermelho na lista.`);
        } else {
          mostrarAlerta('sucesso', 'Importação Concluída', `${novosItens.length} produtos importados com sucesso!`);
        }
      } else {
        mostrarAlerta('erro', 'Falha na Importação', 'Nenhum produto válido encontrado no arquivo.\n\nLembre-se: O formato do CSV deve ser:\nCódigo;Quantidade');
      }
      e.target.value = null; 
    };
    reader.readAsText(file);
  };

  const finalizarRequisicao = () => {
    if (!solicitante.trim()) { 
      mostrarAlerta('erro', 'Campo Obrigatório', 'Preencha o nome do Solicitante antes de prosseguir.'); 
      return; 
    }

    if (!motivo) { 
      mostrarAlerta('erro', 'Campo Obrigatório', 'Selecione o motivo da transferência antes de prosseguir.'); 
      return; 
    }

    let motivoFinal = motivo;
    let grauPrioridade = 3; 

    if (motivo === 'Cliente' || motivo === 'Rota para clientes') {
      grauPrioridade = 1;
    } else if (motivo === 'Reposição de estoque') {
      grauPrioridade = 2;
    } else if (motivo === 'Produtos para provadores') {
      grauPrioridade = 3;
    } else if (motivo === 'Outros') {
      if (!motivoOutro.trim()) {
        mostrarAlerta('erro', 'Campo Obrigatório', 'Você selecionou "Outros". Por favor, especifique o motivo escrevendo na caixa abaixo.'); 
        return; 
      }
      motivoFinal = motivoOutro;
      grauPrioridade = Number(prioridadeOutro);
    }

    if (lojaDe === lojaPara) {
      motivoFinal = 'Reposição Interna';
    }

    if (itensAdicionados.length === 0) { 
      mostrarAlerta('erro', 'Lista Vazia', 'Adicione pelo menos um produto na lista antes de gravar a requisição.'); 
      return; 
    }

    if (novaObs.trim() !== '') {
      mostrarAlerta('aviso', 'Observação Pendente', 'Você digitou uma instrução no campo de observação, mas esqueceu de clicar em "Adicionar Observação".\n\nPor favor, adicione-a à lista ou apague o texto antes de gravar.');
      return;
    }

    const itensZerados = itensAdicionados.filter(item => Number(item.quantidade) <= 0);
    if (itensZerados.length > 0) {
      mostrarAlerta(
        'erro', 
        'Quantidade Inválida', 
        `Existem ${itensZerados.length} produto(s) na lista com quantidade zero (0 un).\n\nPara prosseguir, ajuste a quantidade correta pelo botão de editar (✏️) ou remova o produto da lista (🗑️).`
      );
      return;
    }

    const itensComProblema = itensAdicionados.filter(item => item.insuficiente);
    if (itensComProblema.length > 0) {
      mostrarAlerta(
        'erro', 
        'Estoque Insuficiente', 
        `Você não pode salvar a requisição com produtos excedendo o estoque disponível.\n\nExistem ${itensComProblema.length} item(ns) destacado(s) em vermelho. Por favor, clique no ícone do lápis (✏️) para ajustar ou na lixeira (🗑️) para remover o item.`
      );
      return; 
    }

    const dataAtualString = new Date().toLocaleString('pt-BR');
    const nomeEditorFinal = reqEmEdicao ? reqEmEdicao.editorTemporario : solicitante;
    
    const novoHistorico = reqEmEdicao 
      ? { ...reqEmEdicao.historico, observacoesGerais: listaObservacoes, 'Última Edição': `Por ${nomeEditorFinal} em ${dataAtualString}` }
      : { observacoesGerais: listaObservacoes };

    let statusFinal = 'Pendente';
    let metricas = null;

    if (tipoReposicaoGlobal === 'externa' && inicioCronometroGlobal) {
      statusFinal = 'Separado'; 
      
      const tempoTotalSegundos = Math.floor((Date.now() - inicioCronometroGlobal) / 1000);
      const totalItensFisicos = itensAdicionados.reduce((acc, item) => acc + Number(item.quantidade), 0);
      
      const chaveRecorde = `qtd_${totalItensFisicos}`;
      const recordeAtual = recordesGlobais[chaveRecorde];
      const bateu = !recordeAtual || tempoTotalSegundos < recordeAtual.tempoSegundos;

      metricas = {
        tempoTotalSegundos: tempoTotalSegundos,
        totalItensFisicos: totalItensFisicos,
        bateuRecorde: bateu,
        responsavel: solicitante, 
        finalizadoEm: new Date().toISOString()
      };

      novoHistorico['Em Separação'] = solicitante;
      novoHistorico['inicio_separacao'] = inicioCronometroGlobal;
      novoHistorico['Separado'] = solicitante;
      
      localStorage.removeItem('nd_separador_gamificado');
    }

    const novaRequisicao = {
      id: reqEmEdicao ? reqEmEdicao.id : gerarIdSequencial(lojaPara, requisicoes),
      data: reqEmEdicao ? reqEmEdicao.data : new Date().toLocaleDateString('pt-BR'),
      timestampCriacao: reqEmEdicao ? reqEmEdicao.timestampCriacao : Date.now(), 
      origem: lojaDe, 
      destino: lojaPara,
      solicitante: solicitante,
      motivo: motivoFinal,
      prioridade: grauPrioridade, 
      itens: itensAdicionados.length,
      status: statusFinal, 
      listaItens: itensAdicionados,
      historico: novoHistorico,
      metricasSeparacao: metricas 
    };

    mostrarAlerta('sucesso', reqEmEdicao ? 'Edição Concluída!' : 'Separação e Gravação Concluídas!', `A requisição ${novaRequisicao.id} foi salva com sucesso e já está pronta para a próxima etapa!`, () => {
      fecharAlerta();
      aoSalvar(novaRequisicao, !!reqEmEdicao);
    });
  };

  const handleBotaoCancelar = () => {
    mostrarAlerta(
      'aviso',
      'Cancelar Requisição',
      `Tem certeza que deseja CANCELAR definitivamente a requisição ${reqEmEdicao.id}?\n\nEsta ação mudará o status dela para "Cancelada", ela sairá da fila de trabalho, e seu nome ficará registrado no histórico de cancelamento.`,
      () => {
        fecharAlerta();
        const nomeCancelador = reqEmEdicao.editorTemporario || solicitante || 'Usuário Não Identificado';
        aoCancelarReq(reqEmEdicao.id, nomeCancelador);
      },
      () => fecharAlerta(),
      'Sim, Cancelar',
      'Não, Voltar'
    );
  };

  const valorTotalRequisicao = itensAdicionados.reduce((total, item) => {
    return total + ((item.custoUnitario || 0) * item.quantidade);
  }, 0);

  return (
    <div className="nova-req-container">
      
      {tipoReposicaoGlobal === 'externa' && inicioCronometroGlobal && (
        <CronometroCheckout 
          segundosDecorridos={segundosDecorridos} 
          formatarTempo={formatarTempo} 
        />
      )}

      <div className="nova-req-header">
        <h2>{reqEmEdicao ? `✏️ Editar Requisição ${reqEmEdicao.id}` : 'Criar Nova Requisição'}</h2>
        <button className="btn-voltar" onClick={aoVoltar}>← Cancelar</button>
      </div>

      <div className="card-formulario">
        
        <FormularioCabecalho
          solicitante={solicitante}
          setSolicitante={setSolicitante}
          lojaDe={lojaDe}
          setLojaDe={setLojaDe}
          lojaPara={lojaPara}
          setLojaPara={setLojaPara}
          lojas={lojas}
          motivo={motivo}
          setMotivo={setMotivo}
          motivoOutro={motivoOutro}
          setMotivoOutro={setMotivoOutro}
          prioridadeOutro={prioridadeOutro}
          setPrioridadeOutro={setPrioridadeOutro}
          listaObservacoes={listaObservacoes}
          novaObs={novaObs}
          setNovaObs={setNovaObs}
          handleAdicionarObservacao={handleAdicionarObservacao}
          handleRemoverObservacao={handleRemoverObservacao}
          reqEmEdicao={reqEmEdicao}
        />

        <TabelaProdutosForm
          codigo={codigo}
          setCodigo={setCodigo}
          descricao={descricao}
          quantidade={quantidade}
          setQuantidade={setQuantidade}
          handleMudancaCodigo={handleMudancaCodigo}
          adicionarNaLista={adicionarNaLista}
          inputCodigoRef={inputCodigoRef}
          inputArquivoRef={inputArquivoRef}
          handleImportarCSV={handleImportarCSV}
          itensAdicionados={itensAdicionados}
          isModoVitrine={isModoVitrine}
          editandoIndex={editandoIndex}
          novaQuantidadeEdit={novaQuantidadeEdit}
          setNovaQuantidadeEdit={setNovaQuantidadeEdit}
          salvarEdicao={salvarEdicao}
          cancelarEdicao={cancelarEdicao}
          iniciarEdicao={iniciarEdicao}
          removerDaLista={removerDaLista}
          valorTotalRequisicao={valorTotalRequisicao}
        />
        
        <div className="rodape-formulario">
          {reqEmEdicao && (
            <button className="btn-cancelar-req" onClick={handleBotaoCancelar}>
              🗑️ Cancelar Requisição
            </button>
          )}

          <button className="btn-salvar" onClick={finalizarRequisicao}>
            {reqEmEdicao ? 'Salvar Alterações' : 'Gravar Requisição'}
          </button>
        </div>
      </div>

      <ModalAlerta alerta={alerta} fecharAlerta={fecharAlerta} />

    </div>
  );
}