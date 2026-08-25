import { useState, useEffect } from 'react';
import '../../../styles/admin/usuarios/adminUsuarios.css';
import { supabase } from '../../../services/supabase';

export default function AdminUsuarios() {
  const [usuarios, setUsuarios] = useState([]);
  const [carregando, setCarregando] = useState(false);
  const [processando, setProcessando] = useState(false);

  // Estados do Formulário
  const [editandoId, setEditandoId] = useState(null);
  const [nome, setNome] = useState('');
  const [username, setUsername] = useState('');
  const [senha, setSenha] = useState('');
  const [loja, setLoja] = useState('Matriz');
  const [hierarquia, setHierarquia] = useState('Subordinado');
  const [encarregadoResponsavel, setEncarregadoResponsavel] = useState('');

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

  // Lista dinâmica de encarregados para alimentar o campo "Subordinado a quem?"
  const listaEncarregados = usuarios.filter(u => u.hierarquia === 'Encarregado' || u.username === 'admin');

  const resetarFormulario = () => {
    setEditandoId(null);
    setNome('');
    setUsername('');
    setSenha('');
    setLoja('Matriz');
    setHierarquia('Subordinado');
    setEncarregadoResponsavel('');
  };

  const iniciarEdicao = (user) => {
    setEditandoId(user.id);
    setNome(user.nome_completo || '');
    setUsername(user.username || '');
    setSenha(user.senha || '');
    setLoja(user.loja || 'Matriz');
    setHierarquia(user.hierarquia || 'Subordinado');
    setEncarregadoResponsavel(user.encarregado_responsavel || '');
    window.scrollTo({ top: 0, behavior: 'smooth' }); // Sobe a tela suavemente para o formulário
  };

  const handleSalvarUsuario = async (e) => {
    e.preventDefault();
    setProcessando(true);

    try {
      // Regra da Hierarquia
      const responsavelFinal = hierarquia === 'Subordinado' ? encarregadoResponsavel : null;

      if (hierarquia === 'Subordinado' && !responsavelFinal) {
        alert("Por favor, selecione a qual encarregado este usuário é subordinado.");
        setProcessando(false);
        return;
      }

      if (!editandoId) {
        // --- MODO CRIAÇÃO ---
        const existe = usuarios.find(u => u.username.toLowerCase() === username.toLowerCase());
        if (existe) {
          alert("Este 'Usuário (Login)' já está em uso. Escolha outro.");
          setProcessando(false);
          return;
        }

        const { error } = await supabase.from('usuarios_sistema').insert([{
          nome_completo: nome,
          username: username,
          senha: senha,
          loja: loja,
          hierarquia: hierarquia,
          encarregado_responsavel: responsavelFinal
        }]);

        if (error) throw error;
        alert("✅ Usuário criado com sucesso!");

      } else {
        // --- MODO EDIÇÃO ---
        const { error } = await supabase.from('usuarios_sistema').update({
          nome_completo: nome,
          username: username,
          senha: senha,
          loja: loja,
          hierarquia: hierarquia,
          encarregado_responsavel: responsavelFinal
        }).eq('id', editandoId);

        if (error) throw error;
        alert("✅ Usuário atualizado com sucesso!");
      }

      resetarFormulario();
      buscarUsuarios();

    } catch (erro) {
      console.error("Erro ao salvar usuário:", erro);
      alert("Ocorreu um erro ao salvar os dados do usuário.");
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
      
      {/* SEÇÃO 1: FORMULÁRIO DE CRIAÇÃO / EDIÇÃO */}
      <div className="card-novo-usuario">
        <h3><span>{editandoId ? '✏️' : '➕'}</span> {editandoId ? 'Editar Usuário' : 'Adicionar Novo Usuário'}</h3>
        <form className="form-usuarios" onSubmit={handleSalvarUsuario}>
          
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
              onChange={(e) => setUsername(e.target.value.replace(/\s+/g, '').toLowerCase())}
              disabled={editandoId && username === 'admin'} // Admin original não pode mudar o login
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

          <div className="input-group-admin">
            <label>Hierarquia no Sistema</label>
            <select value={hierarquia} onChange={(e) => setHierarquia(e.target.value)}>
              <option value="Subordinado">Subordinado (Padrão)</option>
              <option value="Encarregado">Encarregado (Líder/Aprovador)</option>
            </select>
          </div>

          {hierarquia === 'Subordinado' && (
            <div className="input-group-admin">
              <label>Subordinado a quem?</label>
              <select 
                value={encarregadoResponsavel} 
                onChange={(e) => setEncarregadoResponsavel(e.target.value)} 
                required={hierarquia === 'Subordinado'}
              >
                <option value="">Selecione o Encarregado...</option>
                {listaEncarregados.map(enc => (
                  <option key={enc.id} value={enc.nome_completo}>{enc.nome_completo}</option>
                ))}
              </select>
            </div>
          )}

          <div className="botoes-form-acoes">
            {editandoId && (
              <button type="button" className="btn-cancelar-edicao" onClick={resetarFormulario}>
                Cancelar
              </button>
            )}
            <button type="submit" className="btn-salvar-usuario" disabled={processando}>
              {processando ? '⏳ Salvando...' : (editandoId ? '💾 Atualizar Usuário' : '💾 Gravar Novo Usuário')}
            </button>
          </div>
        </form>
      </div>

      {/* SEÇÃO 2: LISTAGEM DE USUÁRIOS */}
      <div className="lista-usuarios-section">
        <h3>Contas Ativas</h3>
        
        {carregando ? (
          <p>Carregando usuários...</p>
        ) : (
          <div className="tabela-wrapper-admin">
            <table className="tabela-usuarios">
              <thead>
                <tr>
                  <th>Nome</th>
                  <th>Login</th>
                  <th>Loja</th>
                  <th>Hierarquia</th>
                  <th>Ações</th>
                </tr>
              </thead>
              <tbody>
                {usuarios.map(user => (
                  <tr key={user.id}>
                    <td>
                      <strong>{user.nome_completo}</strong>
                      {user.encarregado_responsavel && user.hierarquia === 'Subordinado' && (
                        <div style={{ fontSize: '0.8rem', color: '#7f8c8d', marginTop: '3px' }}>
                          ↪ Líder: {user.encarregado_responsavel}
                        </div>
                      )}
                    </td>
                    <td>{user.username}</td>
                    <td><span className="tag-loja">{user.loja}</span></td>
                    <td>
                      <span style={{ 
                        color: user.hierarquia === 'Encarregado' ? '#27ae60' : '#34495e',
                        fontWeight: user.hierarquia === 'Encarregado' ? 'bold' : 'normal'
                      }}>
                        {user.hierarquia || 'Subordinado'}
                      </span>
                    </td>
                    <td>
                      <div className="acoes-tabela-container">
                        <button 
                          className="btn-editar-usuario"
                          onClick={() => iniciarEdicao(user)}
                        >
                          ✏️ Editar
                        </button>
                        
                        {user.username !== 'admin' ? (
                          <button 
                            className="btn-excluir-usuario"
                            onClick={() => handleExcluirUsuario(user.id, user.username)}
                          >
                            🗑️ Excluir
                          </button>
                        ) : (
                          <span className="texto-protegido">Protegido</span>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
                {usuarios.length === 0 && (
                  <tr>
                    <td colSpan="5" className="td-vazio-centro">Nenhum usuário encontrado.</td>
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