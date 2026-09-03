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
  const [encarregadosSelecionados, setEncarregadosSelecionados] = useState([]); 
  const [acessoAdmin, setAcessoAdmin] = useState(false); 

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

  const listaEncarregados = usuarios.filter(u => u.hierarquia === 'Encarregado' || u.username === 'admin');

  const resetarFormulario = () => {
    setEditandoId(null);
    setNome('');
    setUsername('');
    setSenha('');
    setLoja('Matriz');
    setHierarquia('Subordinado');
    setEncarregadosSelecionados([]);
    setAcessoAdmin(false);
  };

  const iniciarEdicao = (user) => {
    setEditandoId(user.id);
    setNome(user.nome_completo || '');
    setUsername(user.username || '');
    setSenha(user.senha || '');
    setLoja(user.loja || 'Matriz');
    setHierarquia(user.hierarquia || 'Subordinado');
    setAcessoAdmin(user.acesso_admin || false);
    
    if (user.encarregado_responsavel) {
      setEncarregadosSelecionados(user.encarregado_responsavel.split(', '));
    } else {
      setEncarregadosSelecionados([]);
    }
    
    window.scrollTo({ top: 0, behavior: 'smooth' }); 
  };

  const handleToggleEncarregado = (nomeEncarregado) => {
    setEncarregadosSelecionados(prev => 
      prev.includes(nomeEncarregado) 
        ? prev.filter(n => n !== nomeEncarregado) 
        : [...prev, nomeEncarregado] 
    );
  };

  const handleSalvarUsuario = async (e) => {
    e.preventDefault();
    setProcessando(true);

    try {
      const responsavelFinal = hierarquia === 'Subordinado' ? encarregadosSelecionados.join(', ') : null;

      if (hierarquia === 'Subordinado' && encarregadosSelecionados.length === 0) {
        alert("Por favor, selecione pelo menos um encarregado ao qual este usuário é subordinado.");
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

        // O .select() no final força o banco a devolver a linha confirmada
        const { data, error } = await supabase.from('usuarios_sistema').insert([{
          nome_completo: nome,
          username: username,
          senha: senha,
          loja: loja,
          hierarquia: hierarquia,
          encarregado_responsavel: responsavelFinal,
          acesso_admin: acessoAdmin
        }]).select();

        if (error) throw error;
        
        alert("✅ Usuário criado com sucesso!");
        // Atualiza a tela em tempo real com o dado devolvido pelo banco
        if (data && data.length > 0) {
          setUsuarios([...usuarios, data[0]]);
        } else {
          buscarUsuarios();
        }

      } else {
        // --- MODO EDIÇÃO ---
        // O .select() no final força o banco a devolver a linha editada e evita a falha silenciosa
        const { data, error } = await supabase.from('usuarios_sistema').update({
          nome_completo: nome,
          username: username,
          senha: senha,
          loja: loja,
          hierarquia: hierarquia,
          encarregado_responsavel: responsavelFinal,
          acesso_admin: acessoAdmin
        }).eq('id', editandoId).select();

        if (error) throw error;

        // Se o banco não devolveu a linha, o Supabase bloqueou a edição silenciosamente
        if (!data || data.length === 0) {
           alert("⚠️ O banco de dados falhou silenciosamente ao alterar o registro. Isso pode indicar uma restrição ativa no Supabase (RLS).");
           setProcessando(false);
           return;
        }

        alert("✅ Usuário atualizado com sucesso!");
        // Atualiza a tabela na tela instantaneamente!
        setUsuarios(usuarios.map(u => u.id === editandoId ? data[0] : u));
      }

      resetarFormulario();

    } catch (erro) {
      console.error("Erro detalhado do Supabase:", erro);
      alert(`🚨 Erro bloqueado pelo Banco de Dados:\n\n${erro.message || erro.details || "Erro desconhecido"}`);
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
      // Atualiza o estado removendo o item instantaneamente
      setUsuarios(usuarios.filter(u => u.id !== id));
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
              disabled={editandoId && username === 'admin'} 
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

          {/* ÁREA DE MÚLTIPLOS ENCARREGADOS */}
          {hierarquia === 'Subordinado' && (
            <div className="input-group-admin">
              <label>Subordinado a quem? (Pode selecionar mais de um)</label>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', padding: '10px', background: '#f8f9fa', border: '1px solid #dcdde1', borderRadius: '6px' }}>
                {listaEncarregados.length === 0 ? (
                  <span style={{ fontSize: '0.85rem', color: '#7f8c8d' }}>Nenhum encarregado cadastrado ainda.</span>
                ) : (
                  listaEncarregados.map(enc => (
                    <label key={enc.id} style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '0.9rem' }}>
                      <input
                        type="checkbox"
                        checked={encarregadosSelecionados.includes(enc.nome_completo)}
                        onChange={() => handleToggleEncarregado(enc.nome_completo)}
                        style={{ width: '16px', height: '16px', cursor: 'pointer' }}
                      />
                      {enc.nome_completo}
                    </label>
                  ))
                )}
              </div>
            </div>
          )}

          {/* CHECKBOX DE ACESSO ADMIN */}
          <div className="input-group-admin" style={{ marginTop: '15px' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', background: '#fcf3cf', padding: '12px', border: '1px solid #f1c40f', borderRadius: '6px', color: '#d35400', fontWeight: 'bold' }}>
              <input
                type="checkbox"
                checked={username === 'admin' ? true : acessoAdmin}
                onChange={(e) => setAcessoAdmin(e.target.checked)}
                disabled={username === 'admin'} 
                style={{ width: '18px', height: '18px', cursor: 'pointer' }}
              />
              🔑 Conceder privilégios de Administrador a este usuário
            </label>
          </div>

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
                      {user.acesso_admin && <span style={{ marginLeft: '8px', background: '#f39c12', color: 'white', padding: '2px 6px', borderRadius: '4px', fontSize: '0.7rem', fontWeight: 'bold' }}>ADMIN</span>}
                      
                      {user.encarregado_responsavel && user.hierarquia === 'Subordinado' && (
                        <div style={{ fontSize: '0.8rem', color: '#7f8c8d', marginTop: '4px' }}>
                          ↪ Líderes: {user.encarregado_responsavel}
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