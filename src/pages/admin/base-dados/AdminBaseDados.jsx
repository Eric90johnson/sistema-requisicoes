import { useRef, useState } from 'react';
import '../../../styles/admin/base-dados/adminBaseDados.css';
import { supabase } from '../../../services/supabase';

export default function AdminBaseDados({ setProdutos, lojaAtiva }) {
  const inputFileRef = useRef(null);
  const [popup, setPopup] = useState({ visivel: false, quantidade: 0, novidades: 0 });
  const [carregando, setCarregando] = useState(false);

  // Mapeamento exato das tabelas por loja escolhida na aba superior[cite: 18]
  const tabelasPorLoja = {
    'ARATURI': 'base_produtos',
    'CONJUNTO CEARA': 'base_produtos_conjunto_ceara',
    'MESSEJANA': 'base_produtos_messejana',
    'MULUNGU': 'base_produtos_mulungu'
  };

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
          
          const codigoExtraido = colunas[0] ? colunas[0].trim() : '';
          if (codigoExtraido && codigoExtraido !== '-') {
            novosProdutos.push({
              codigo: codigoExtraido,
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
      }

      if (novosProdutos.length === 0) {
        setCarregando(false);
        alert("Nenhum produto válido encontrado na planilha. Verifique se o arquivo está no formato correto (separado por vírgula ou ponto e vírgula).");
        evento.target.value = null;
        return;
      }

      const produtosFormatadosFrontend = novosProdutos.map(p => ({
        ...p,
        codigoBarra: p.codigo_barra,
        precoVenda: p.preco_venda,
        precoCusto: p.preco_custo
      }));

      const tabelaDestino = tabelasPorLoja[lojaAtiva] || 'base_produtos';

      try {
        let deltaProdutos = [];

        // O motor de Delta e Alertas de Reposição fica restrito exclusivamente à Matriz (ARATURI)
        if (lojaAtiva === 'ARATURI') {
          let produtosAntigos = [];
          let buscouTodos = false;
          let indexAtual = 0;
          const tamanhoPagina = 1000;

          while (!buscouTodos) {
            const { data, error } = await supabase
              .from(tabelaDestino)
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

          const mapaAntigo = new Map(produtosAntigos.map(p => [p.codigo, Number(p.quantidade)]));

          for (const novo of novosProdutos) {
            const qtdAntiga = mapaAntigo.get(novo.codigo);
            if (qtdAntiga === undefined || Number(novo.quantidade) > qtdAntiga) {
              deltaProdutos.push(novo);
            }
          }

          if (deltaProdutos.length > 0) {
            const { error: erroAlerta } = await supabase.from('alertas_reposicao').insert([{
              data_criacao: Date.now(),
              lista_produtos: deltaProdutos,
              lojas_visualizadas: []
            }]);
            
            if (erroAlerta) console.error("Erro ao gerar alerta de reposição:", erroAlerta);
          }
        }

        // Insere/Atualiza os produtos usando UPSERT na tabela correspondente da loja ativa[cite: 18]
        const tamanhoLote = 500;
        for (let i = 0; i < novosProdutos.length; i += tamanhoLote) {
          const lote = novosProdutos.slice(i, i + tamanhoLote);
          const { error } = await supabase.from(tabelaDestino).upsert(lote, { onConflict: 'codigo' });
          if (error) {
            console.error(`Erro ao atualizar lote no Supabase (${lojaAtiva}):`, error);
          }
        }

        if (lojaAtiva === 'ARATURI') {
          setProdutos(produtosFormatadosFrontend);
        }
        
        setPopup({ visivel: true, quantidade: novosProdutos.length, novidades: deltaProdutos.length });

      } catch (err) {
        console.error("Erro ao sincronizar base de produtos com a nuvem:", err);
        alert(`Ocorreu um erro ao atualizar o banco de dados da loja ${lojaAtiva}.`);
      } finally {
        setCarregando(false);
        evento.target.value = null; 
      }
    };
    
    leitor.readAsText(arquivo);
  };

  const fecharPopup = () => setPopup({ visivel: false, quantidade: 0, novidades: 0 });

  return (
    <div className="admin-bd-container">
      <div className="admin-bd-header">
        <h3>Atualização de Estoque ({lojaAtiva})</h3>
        <p>Faça o upload da planilha atualizada do ERP para sincronizar a base da loja <strong>{lojaAtiva}</strong>[cite: 18].</p>
      </div>

      <div className="alerta-perigo" style={{ borderLeftColor: '#3498db', backgroundColor: '#eaf2f8', color: '#2980b9' }}>
        <strong>ℹ️ Atualização Inteligente (Upsert):</strong> Ao importar o arquivo para a base <strong>{lojaAtiva}</strong>, o sistema fará a leitura. Produtos existentes terão preço e saldo atualizados, novos produtos serão criados, e <strong>nenhum</strong> produto anterior será apagado[cite: 18].
      </div>

      <div className="area-upload">
        <p className="area-upload-icone">📄</p>
        <h4>Selecione o arquivo POSICAODEESTOQUE.CSV para {lojaAtiva}</h4>
        <p className="area-upload-descricao">O sistema processará o arquivo e enviará os dados para a nuvem[cite: 18].</p>
        
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
          {carregando ? `⏳ Sincronizando ${lojaAtiva}...` : `📥 Procurar Arquivo ERP (${lojaAtiva})`}
        </button>
      </div>

      {popup.visivel && (
        <div className="popup-overlay-admin" onClick={fecharPopup}>
          <div className="popup-content-admin" onClick={(e) => e.stopPropagation()}>
            <span className="popup-icone-admin">✅</span>
            <h3 className="popup-titulo-sucesso">Sucesso!</h3>
            <p>
              A base de dados de <strong>{lojaAtiva}</strong> foi atualizada com <strong>{popup.quantidade}</strong> produtos processados[cite: 18].
            </p>
            {lojaAtiva === 'ARATURI' && (
              <p style={{ marginTop: '10px', color: '#e67e22', fontWeight: 'bold' }}>
                📦 {popup.novidades} itens geraram alertas de reposição para as filiais!
              </p>
            )}
            <button className="popup-btn-admin" onClick={fecharPopup}>
              Concluir
            </button>
          </div>
        </div>
      )}
    </div>
  );
}