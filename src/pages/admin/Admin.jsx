// src/pages/admin/Admin.jsx
import '../../styles/admin/admin.css';
import AdminBaseDados from './base-dados/AdminBaseDados';
import AdminUsuarios from './usuarios/AdminUsuarios'; // A importação foi liberada!

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

      </div>
    </div>
  );
}