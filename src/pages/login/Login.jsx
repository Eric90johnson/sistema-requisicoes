import { useState } from 'react';
import '../../styles/pages/login/login.css';
import logo from '../../assets/logo.jpeg'; 

// Importação da conexão com o Supabase
import { supabase } from '../../services/supabase';

export default function Login({ aoLogar }) {
  const [usuario, setUsuario] = useState('');
  const [senha, setSenha] = useState('');
  const [erro, setErro] = useState('');
  const [carregando, setCarregando] = useState(false);

  const handleEntrar = async (e) => {
    e.preventDefault();
    setErro('');
    setCarregando(true);

    try {
      // Busca o usuário correspondente no banco de dados
      const { data, error } = await supabase
        .from('usuarios_sistema')
        .select('*')
        .eq('username', usuario.trim())
        .eq('senha', senha.trim())
        .single();

      if (error || !data) {
        setErro('Usuário ou senha inválidos.');
      } else {
        aoLogar(data); // Passa os dados do usuário autenticado para o App
      }
    } catch (err) {
      console.error('Erro na autenticação:', err);
      setErro('Erro ao conectar ao servidor. Tente novamente.');
    } finally {
      setCarregando(false);
    }
  };

  return (
    <div className="login-container">
      <div className="login-box">
        <img src={logo} alt="Neta Dantas Logo" className="login-logo" />
        
        <h2>Acesso ao Sistema</h2>
        <p>Insira suas credenciais para continuar</p>

        {erro && <div className="mensagem-erro-login">{erro}</div>}

        <form className="form-login" onSubmit={handleEntrar}>
          <div className="input-login-group">
            <label>Usuário</label>
            <input 
              type="text" 
              placeholder="Digite seu usuário" 
              value={usuario}
              onChange={(e) => setUsuario(e.target.value)}
              disabled={carregando}
              required
            />
          </div>

          <div className="input-login-group">
            <label>Senha</label>
            <input 
              type="password" 
              placeholder="Digite sua senha" 
              value={senha}
              onChange={(e) => setSenha(e.target.value)}
              disabled={carregando}
              required
            />
          </div>

          <button type="submit" className="btn-entrar" disabled={carregando}>
            {carregando ? 'Validando...' : 'Entrar'}
          </button>
        </form>
      </div>
    </div>
  );
}