import { useState, useEffect } from 'react';
import '../../styles/pages/login/login.css';
import logo from '../../assets/logo.jpeg'; 

// Importação da conexão com o Supabase
import { supabase } from '../../services/supabase';

export default function Login({ aoLogar }) {
  const [usuario, setUsuario] = useState('');
  const [senha, setSenha] = useState('');
  const [erro, setErro] = useState('');
  const [carregando, setCarregando] = useState(false);
  
  // Controle do novo Modal de Inatividade
  const [mostrarModalInatividade, setMostrarModalInatividade] = useState(false);

  useEffect(() => {
    // Checa se o usuário foi deslogado pelo cronômetro do App.jsx
    const expirou = localStorage.getItem('sessao_expirada');
    if (expirou === 'true') {
      setMostrarModalInatividade(true);
      localStorage.removeItem('sessao_expirada'); // Limpa para não aparecer de novo
    }
  }, []);

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
      const usuarioSanitizado = usuario.trim().toLowerCase().replace(/[^a-z0-9]/g, '');
      const emailInvisivel = `${usuarioSanitizado}@netadantas.interno`;
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
      
      {/* NOVO MODAL ESTILOSO DE INATIVIDADE */}
      {mostrarModalInatividade && (
        <div style={{
          position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh',
          backgroundColor: 'rgba(0, 0, 0, 0.75)', display: 'flex',
          alignItems: 'center', justifyContent: 'center', zIndex: 999999,
          backdropFilter: 'blur(5px)' // Efeito de vidro (blur) no fundo
        }}>
          <div style={{
            backgroundColor: '#ffffff', padding: '40px 30px', borderRadius: '12px',
            boxShadow: '0 15px 40px rgba(0,0,0,0.4)', textAlign: 'center', maxWidth: '380px', width: '90%',
            animation: 'scaleUpModal 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275)'
          }}>
            <div style={{ fontSize: '4rem', marginBottom: '15px' }}>⏱️</div>
            <h3 style={{ color: '#2c1938', marginBottom: '10px', fontSize: '1.5rem', fontWeight: 'bold' }}>Sessão Expirada</h3>
            <p style={{ color: '#7f8c8d', marginBottom: '25px', lineHeight: '1.5', fontSize: '0.95rem' }}>
              Por medidas de segurança, sua sessão foi encerrada automaticamente após 10 minutos de inatividade.
            </p>
            <button 
              onClick={() => setMostrarModalInatividade(false)}
              style={{
                backgroundColor: '#8e44ad', color: 'white', border: 'none', padding: '12px 0',
                borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer', fontSize: '1rem', width: '100%',
                transition: 'background-color 0.2s'
              }}
              onMouseOver={(e) => e.target.style.backgroundColor = '#6a2a85'}
              onMouseOut={(e) => e.target.style.backgroundColor = '#8e44ad'}
            >
              Fazer Login Novamente
            </button>
          </div>
          <style>
            {`
              @keyframes scaleUpModal {
                from { transform: scale(0.8); opacity: 0; }
                to { transform: scale(1); opacity: 1; }
              }
            `}
          </style>
        </div>
      )}

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