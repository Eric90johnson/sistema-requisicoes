import { useRef, useState } from 'react';
import '../../../styles/admin/base-dados/adminBaseDados.css';
import { supabase } from '../../../services/supabase';

export default function AdminBaseDados({ setProdutos }) {
  const inputFileRef = useRef(null);
  const [popup, setPopup] = useState({ visivel: false, quantidade: 0, novidades: 0 });
  const [carregando, setCarregando] = useState(false);

  const handleProcessarArquivo = async (evento) => {
    const arquivo = evento.target.files[0];
    if (!arquivo) return;
    
    setCarregando(true);
    const leitor = new FileReader();
    
    leitor.onload = async (e) => {
      const texto = e.target.result;
      const linhas = texto.split('\n');
      const novosProdutos = [];

      for (let i = 1; i < linhas.length; i++) {
        const linhaAtual = linhas[i].trim();
        if (linhaAtual) {
          const separador = linhaAtual.includes(';') ? ';' : ',';
          const colunas = linhaAtual.split(separador);
          novosProdutos.push({
            codigo: colunas[0] ? colunas[0].trim() : '-',
            descricao: colunas[1] ? colunas[1].trim() : 'Sem descrição',
            codigo_barra: colunas[2] ? colunas[2].trim() : '-',
            ncm: colunas[3] ? colunas[3].trim() : '-',
            fornecedor: colunas[4] ? colunas[4].trim() : '-',
            marca: colunas[5] ? colunas[5].trim() : '-',
            quantidade: parseFloat((colunas[6] ? colunas[6].trim() : '0').replace(',', '.')) || 0, 
            preco_venda: colunas[7] ? colunas[7].trim() : '0,00',
            preco_custo: colunas[8] ? colunas[8].trim() : '0,00'
          });
        }
      }

      const produtosFormatadosFrontend = novosProdutos.map(p => ({
        ...p,
        codigoBarra: p.codigo_barra,
        precoVenda: p.preco_venda,
        precoCusto: p.preco_custo
      }));

      // --- SUPABASE: ATUALIZAÇÃO INTELIGENTE (UPSERT) E MOTOR DE DELTA ---
      try {
        // 1. Baixa o estoque antigo rapidamente para comparar
        let produtosAntigos = [];
        let buscouTodos = false;
        let indexAtual = 0;
        const tamanhoPagina = 1000;

        while (!buscouTodos) {
          const { data, error } = await supabase
            .from('base_produtos')
            .select('codigo, quantidade')
            .range(indexAtual, indexAtual + tamanhoPagina - 1);

          if (error) throw error;
          if (data && data.length > 0) {
            produtosAntigos = [...produtosAntigos, ...data];
            indexAtual += tamanhoPagina;
          }
          if (!data || data.length < tamanhoPagina) {
            buscouTodos = true;
          }
        }

        // 2. MOTOR DE DELTA: Identifica itens novos ou com saldo acrescido
        const mapaAntigo = new Map(produtosAntigos.map(p => [p.codigo, Number(p.quantidade)]));
        const deltaProdutos = [];

        for (const novo of novosProdutos) {
          const qtdAntiga = mapaAntigo.get(novo.codigo);
          // Adiciona ao alerta se for SKU novo ou se a quantidade aumentou (ignorando vendas que reduziram o saldo)
          if (qtdAntiga === undefined || Number(novo.quantidade) > qtdAntiga) {
            deltaProdutos.push(novo);
          }
        }

        // 3. Registra o Alerta de Reposição para a vitrine das filiais
        if (deltaProdutos.length > 0) {
          const { error: erroAlerta } = await supabase.from('alertas_reposicao').insert([{
            data_criacao: Date.now(),
            lista_produtos: deltaProdutos,
            lojas_visualizadas: []
          }]);
          
          if (erroAlerta) console.error("Erro ao gerar alerta de reposição:", erroAlerta);
        }

        // 4. Insere/Atualiza os produtos usando UPSERT (Não apaga o que já existe no banco!)
        const tamanhoLote = 500;
        for (let i = 0; i < novosProdutos.length; i += tamanhoLote) {
          const lote = novosProdutos.slice(i, i + tamanhoLote);
          // O upsert verifica a chave primária 'codigo'
          const { error } = await supabase.from('base_produtos').upsert(lote, { onConflict: 'codigo' });
          if (error) {
            console.error("Erro ao atualizar lote no Supabase:", error);
          }
        }

        // 5. Atualiza a tela do sistema
        setProdutos(produtosFormatadosFrontend);
        setPopup({ visivel: true, quantidade: novosProdutos.length, novidades: deltaProdutos.length });

      } catch (err) {
        console.error("Erro ao sincronizar base de produtos com a nuvem:", err);
        alert("Ocorreu um erro ao atualizar o banco de dados.");
      } finally {
        setCarregando(false);
        evento.target.value = null; // Limpa o input
      }
    };
    
    leitor.readAsText(arquivo);
  };

  const fecharPopup = () => setPopup({ visivel: false, quantidade: 0, novidades: 0 });

  return (
    <div className="admin-bd-container">
      <div className="admin-bd-header">
        <h3>Atualização de Estoque</h3>
        <p>Faça o upload da planilha atualizada do ERP para sincronizar todas as lojas.</p>
      </div>

      <div className="alerta-perigo" style={{ borderLeftColor: '#3498db', backgroundColor: '#eaf2f8', color: '#2980b9' }}>
        <strong>ℹ️ Atualização Inteligente (Upsert):</strong> Ao importar o arquivo, o sistema fará a leitura da base. Produtos existentes terão preço e saldo atualizados, novos produtos serão criados, e <strong>nenhum</strong> produto anterior será apagado.
      </div>

      <div className="area-upload">
        <p className="area-upload-icone">📄</p>
        <h4>Selecione o arquivo POSICAODEESTOQUE.CSV</h4>
        <p className="area-upload-descricao">O sistema processará o arquivo e enviará os dados para a nuvem.</p>
        
        <input 
          type="file" 
          accept=".csv" 
          ref={inputFileRef} 
          className="input-file-oculto" 
          onChange={handleProcessarArquivo} 
          disabled={carregando}
        />
        
        <button 
          className="btn-importar-admin" 
          onClick={() => inputFileRef.current.click()}
          disabled={carregando}
        >
          {carregando ? '⏳ Sincronizando com a Nuvem...' : '📥 Procurar Arquivo ERP'}
        </button>
      </div>

      {popup.visivel && (
        <div className="popup-overlay-admin" onClick={fecharPopup}>
          <div className="popup-content-admin" onClick={(e) => e.stopPropagation()}>
            <span className="popup-icone-admin">✅</span>
            <h3 className="popup-titulo-sucesso">Sucesso!</h3>
            <p>
              A base de dados foi atualizada com <strong>{popup.quantidade}</strong> produtos processados.
            </p>
            <p style={{ marginTop: '10px', color: '#e67e22', fontWeight: 'bold' }}>
              📦 {popup.novidades} itens geraram alertas de reposição para as filiais!
            </p>
            <button className="popup-btn-admin" onClick={fecharPopup}>
              Concluir
            </button>
          </div>
        </div>
      )}
    </div>
  );
}