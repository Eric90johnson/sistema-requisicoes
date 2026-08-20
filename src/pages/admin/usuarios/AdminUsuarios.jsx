import { useState, useEffect } from 'react';
import '../../../styles/admin/usuarios/adminUsuarios.css';
import { supabase } from '../../../services/supabase';

export default function AdminUsuarios() {
  const [usuarios, setUsuarios] = useState([]);
  const [carregando, setCarregando] = useState(false);
  const [processando, setProcessando] = useState(false);

  // Estados do Formulário
  const [nome, setNome] = useState('');
  const [username, setUsername] = useState('');
  const [senha, setSenha] = useState('');
  const [loja, setLoja] = useState('Matriz');

  // Carrega a lista de usuários assim que a aba é aberta
  useEffect(() => {
    buscarUsuarios();
  }, []);

  const buscarUsuarios = async () => {
    setCarregando(true);
    try {
      const { data, error } = await supabase
        .from('usuarios_sistema')
        .select('*')
        .order('id', { ascending: true });

      if (error) throw error;
      if (data) setUsuarios(data);
    } catch (erro) {
      console.error("Erro ao buscar usuários:", erro);
    } finally {
      setCarregando(false);
    }
  };

  const handleCriarUsuario = async (e) => {
    e.preventDefault();
    setProcessando(true);

    try {
      // 1. Verifica se o username já existe para não dar erro de duplicidade
      const existe = usuarios.find(u => u.username.toLowerCase() === username.toLowerCase());
      if (existe) {
        alert("Este 'Usuário (Login)' já está em uso. Escolha outro.");
        setProcessando(false);
        return;
      }

      // 2. Insere no Supabase
      const { error } = await supabase.from('usuarios_sistema').insert([{
        nome_completo: nome,
        username: username,
        senha: senha,
        loja: loja
      }]);

      if (error) throw error;

      // 3. Limpa o formulário e atualiza a lista
      setNome('');
      setUsername('');
      setSenha('');
      setLoja('Matriz');
      alert("✅ Usuário criado com sucesso!");
      buscarUsuarios();

    } catch (erro) {
      console.error("Erro ao criar usuário:", erro);
      alert("Ocorreu um erro ao criar o usuário.");
    } finally {
      setProcessando(false);
    }
  };

  const handleExcluirUsuario = async (id, usernameExcluido) => {
    if (usernameExcluido === 'admin') {
      alert("⚠️ O administrador principal não pode ser excluído!");
      return;
    }

    const confirmacao = window.confirm(`Tem certeza que deseja EXCLUIR o acesso de '${usernameExcluido}'?`);
    if (!confirmacao) return;

    try {
      const { error } = await supabase
        .from('usuarios_sistema')
        .delete()
        .eq('id', id);

      if (error) throw error;
      buscarUsuarios();
    } catch (erro) {
      console.error("Erro ao excluir:", erro);
      alert("Erro ao tentar excluir o usuário.");
    }
  };

  return (
    <div className="admin-usuarios-container">
      
      {/* SEÇÃO 1: FORMULÁRIO DE CRIAÇÃO */}
      <div className="card-novo-usuario">
        <h3><span>➕</span> Adicionar Novo Usuário</h3>
        <form className="form-usuarios" onSubmit={handleCriarUsuario}>
          
          <div className="input-group-admin">
            <label>Nome Completo (ou Nome da Loja)</label>
            <input 
              type="text" 
              placeholder="Ex: João da Silva" 
              value={nome} 
              onChange={(e) => setNome(e.target.value)} 
              required 
            />
          </div>

          <div className="input-group-admin">
            <label>Usuário (Usado para fazer Login)</label>
            <input 
              type="text" 
              placeholder="Ex: joao.araturi" 
              value={username} 
              onChange={(e) => setUsername(e.target.value.replace(/\s+/g, '').toLowerCase())} // Remove espaços
              required 
            />
          </div>

          <div className="input-group-admin">
            <label>Senha de Acesso</label>
            <input 
              type="text" 
              placeholder="Digite uma senha" 
              value={senha} 
              onChange={(e) => setSenha(e.target.value)} 
              required 
            />
          </div>

          <div className="input-group-admin">
            <label>Loja / Setor</label>
            <select value={loja} onChange={(e) => setLoja(e.target.value)}>
              <option value="Matriz">Matriz</option>
              <option value="Araturi">Araturi</option>
              <option value="Conjunto Ceará">Conjunto Ceará</option>
              <option value="Messejana">Messejana</option>
              <option value="Mulungu">Mulungu</option>
            </select>
          </div>

          <button type="submit" className="btn-salvar-usuario" disabled={processando}>
            {processando ? 'Salvando...' : 'Gravar Novo Usuário'}
          </button>
        </form>
      </div>

      {/* SEÇÃO 2: LISTAGEM DE USUÁRIOS */}
      <div className="lista-usuarios-section">
        <h3>Contas Ativas</h3>
        
        {carregando ? (
          <p>Carregando usuários...</p>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table className="tabela-usuarios">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Nome</th>
                  <th>Login</th>
                  <th>Loja</th>
                  <th>Ações</th>
                </tr>
              </thead>
              <tbody>
                {usuarios.map(user => (
                  <tr key={user.id}>
                    <td>#{user.id}</td>
                    <td><strong>{user.nome_completo}</strong></td>
                    <td>{user.username}</td>
                    <td><span className="tag-loja">{user.loja}</span></td>
                    <td>
                      {user.username !== 'admin' ? (
                        <button 
                          className="btn-excluir-usuario"
                          onClick={() => handleExcluirUsuario(user.id, user.username)}
                        >
                          Excluir Acesso
                        </button>
                      ) : (
                        <span style={{ color: '#7f8c8d', fontSize: '0.9rem' }}>Protegido</span>
                      )}
                    </td>
                  </tr>
                ))}
                {usuarios.length === 0 && (
                  <tr>
                    <td colSpan="5" style={{ textAlign: 'center' }}>Nenhum usuário encontrado.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

    </div>
  );
}