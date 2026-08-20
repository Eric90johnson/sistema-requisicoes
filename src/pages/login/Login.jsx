import { useState } from 'react';
import '../../styles/pages/login/login.css';
import logo from '../../assets/logo.jpeg'; 

export default function Login({ aoLogar }) {
  const [usuario, setUsuario] = useState('');
  const [senha, setSenha] = useState('');
  const [erro, setErro] = useState('');

  const handleEntrar = (e) => {
    e.preventDefault(); 
    
    // --- LOGIN FALSO (Apenas para bloquear a tela provisoriamente) ---
    if (usuario === 'admin' && senha === '123') {
      setErro('');
      aoLogar(); // Avisa o App.jsx que deu certo
    } else {
      setErro('Usuário ou senha incorretos. Tente novamente.');
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
              required
            />
          </div>

          <button type="submit" className="btn-entrar">
            Entrar
          </button>
        </form>
      </div>
    </div>
  );
}