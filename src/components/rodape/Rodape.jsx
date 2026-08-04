import '../../styles/components/rodape/rodape.css';

export default function Rodape() {
  // ----------------------------------------------------
  // ATUALIZE A VERSÃO AQUI (Refletirá em todo o sistema)
  const VERSAO_SISTEMA = "1.0.0"; 
  // ----------------------------------------------------

  return (
    <footer className="rodape-container">
      <div className="rodape-conteudo">
        
        {/* Sessão 1: Informações da Loja */}
        <div className="rodape-secao">
          <h3>Neta Dantas Cosméticos e Presentes</h3>
          <p style={{ color: '#bdc3c7', fontSize: '0.9rem' }}>
            Sistema Integrado de Gestão de Estoque e Requisições.
          </p>
        </div>
        
        {/* Sessão 2: Contatos WhatsApp */}
        <div className="rodape-secao">
          <h4>📞 WhatsApp das Lojas</h4>
          <ul>
            {/* Substitua pelos números reais da loja */}
            <li><strong>Araturi:</strong> (85) 9XXXX-XXXX</li>
            <li><strong>Conj. Ceará:</strong> (85) 9XXXX-XXXX</li>
            <li><strong>Messejana:</strong> (85) 9XXXX-XXXX</li>
          </ul>
        </div>

        {/* Sessão 3: Redes Sociais */}
        <div className="rodape-secao">
          <h4>📱 Redes Sociais</h4>
          <ul>
            <li>
              📷 Instagram: <br/>
              {/* Se quiser que o link abra o insta, só colocar o @ correto abaixo */}
              <a href="https://instagram.com/netadantas" target="_blank" rel="noopener noreferrer">
                <strong>@netadantas</strong>
              </a>
            </li>
          </ul>
        </div>
        
      </div>
      
      {/* Barra Inferior com a Versão */}
      <div className="rodape-bottom">
        <p>&copy; {new Date().getFullYear()} Neta Dantas. Todos os direitos reservados.</p>
        
        {/* A versão que você altera lá em cima aparece aqui */}
        <span className="versao-app">
          Versão {VERSAO_SISTEMA}
        </span>
      </div>
    </footer>
  );
}