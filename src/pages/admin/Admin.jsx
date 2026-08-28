import '../../styles/admin/admin.css';
import AdminBaseDados from './base-dados/AdminBaseDados';
import AdminUsuarios from './usuarios/AdminUsuarios';
import AdminNovidades from './novidades/AdminNovidades'; // IMPORTAÇÃO DA NOVA ABA

export default function Admin({ setProdutos, abaAtiva }) {
  
  return (
    <div className="admin-container">
      <div className="admin-header">
        <h2>⚙️ Painel de Controle</h2>
        <p>Área restrita para gestão do sistema Neta Dantas.</p>
      </div>

      <div className="admin-content">
        
        {abaAtiva === 'base-dados' && (
          <AdminBaseDados setProdutos={setProdutos} />
        )}

        {abaAtiva === 'usuarios' && (
          <AdminUsuarios />
        )}

        {/* CHAMADA DA NOVA TELA */}
        {abaAtiva === 'novidades' && (
          <AdminNovidades />
        )}

      </div>
    </div>
  );
}