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
      // 1. Busca o usuário correspondente na SUA tabela customizada
      const { data, error } = await supabase
        .from('usuarios_sistema')
        .select('*')
        .eq('username', usuario.trim())
        .eq('senha', senha.trim())
        .single();

      if (error || !data) {
        setErro('Usuário ou senha inválidos.');
        setCarregando(false);
        return;
      }

      // 2. OPERAÇÃO E-MAIL INVISÍVEL: Integração com a Segurança do Supabase
      // Removemos espaços e caracteres especiais para formar um e-mail válido
      const usuarioSanitizado = usuario.trim().toLowerCase().replace(/[^a-z0-9]/g, '');
      const emailInvisivel = `${usuarioSanitizado}@netadantas.interno`;
      
      // Adicionamos um "sal" à senha para garantir que ela sempre tenha mais de 6 caracteres 
      // (exigência padrão do Supabase Auth), mesmo que a sua senha no banco seja curta.
      const senhaInvisivel = `${senha.trim()}-NdAuth2026!`;

      let { error: authError } = await supabase.auth.signInWithPassword({
        email: emailInvisivel,
        password: senhaInvisivel
      });

      // Se o usuário não existir no Supabase Auth, nós o criamos silenciosamente
      if (authError && (authError.message.includes('Invalid login credentials') || authError.status === 400)) {
         const { error: signUpError } = await supabase.auth.signUp({
            email: emailInvisivel,
            password: senhaInvisivel
         });
         
         if (!signUpError) {
            // Após criar, faz o login oficial para pegar o "crachá"
            await supabase.auth.signInWithPassword({
              email: emailInvisivel,
              password: senhaInvisivel
            });
         } else {
            console.error('Erro ao criar usuário invisível:', signUpError);
         }
      }

      // 3. Tudo certo! Passa os dados para o sistema principal
      aoLogar(data); 

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