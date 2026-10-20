import React, { useState, useEffect, useRef } from 'react';
import { Html5Qrcode, Html5QrcodeSupportedFormats } from 'html5-qrcode';

export default function ModalScanner({ 
  scannerAtivo, fecharModalScanner, itens, 
  buscarProdutoPorCodigo, incrementarBip, tocarBipSucesso, exibirPopup 
}) {
  const html5QrCodeRef = useRef(null);
  const ultimoBipTempo = useRef(0);
  const ultimoBipTexto = useRef("");

  const isMobile = window.innerWidth <= 768;
  const [modoLeitura, setModoLeitura] = useState(isMobile ? 'camera' : 'laser');

  const bufferLeitor = useRef("");
  const timeoutLeitor = useRef(null);

  // 🚀 NOVO ESTADO: Armazena os códigos bipados nesta sessão
  const [listaCodigosLidos, setListaCodigosLidos] = useState([]);

  const funcoesRef = useRef({ buscarProdutoPorCodigo, fecharModalScanner, incrementarBip, tocarBipSucesso, exibirPopup });
  
  useEffect(() => {
    funcoesRef.current = { buscarProdutoPorCodigo, fecharModalScanner, incrementarBip, tocarBipSucesso, exibirPopup };
  });

  const scannerId = scannerAtivo?.item?.id;
  const scannerTipo = scannerAtivo?.tipo;

  // ==============================================================
  // 📸 LÓGICA DA CÂMERA DO CELULAR
  // ==============================================================
  useEffect(() => {
    if (!scannerId || modoLeitura !== 'camera') return; 

    let isComponentMounted = true;
    
    setTimeout(() => {
      if (!isComponentMounted) return;
      
      const scanner = new Html5Qrcode('leitor-camera-modal', {
        formatsToSupport: [ Html5QrcodeSupportedFormats.EAN_13, Html5QrcodeSupportedFormats.EAN_8, Html5QrcodeSupportedFormats.CODE_128, Html5QrcodeSupportedFormats.UPC_A, Html5QrcodeSupportedFormats.CODE_39 ]
      });
      html5QrCodeRef.current = scanner;

      scanner.start({ facingMode: "environment" }, { fps: 10, qrbox: { width: 250, height: 100 } },
        (decodedText) => {
          const agora = Date.now();
          if (decodedText === ultimoBipTexto.current && (agora - ultimoBipTempo.current < 1500)) return;
          ultimoBipTexto.current = decodedText;
          ultimoBipTempo.current = agora;

          if (scannerTipo === 'identificacao') {
            funcoesRef.current.tocarBipSucesso();
            try { if (html5QrCodeRef.current) html5QrCodeRef.current.pause(); } catch(e) {}
            funcoesRef.current.buscarProdutoPorCodigo(scannerId, decodedText);
            funcoesRef.current.fecharModalScanner();
          } else {
            funcoesRef.current.incrementarBip(scannerId);
            // 🚀 Adiciona o código lido à lista para exibição
            setListaCodigosLidos(prev => [decodedText, ...prev]);
          }
        },
        (err) => { }
      ).catch(err => {
        funcoesRef.current.exibirPopup('erro', 'Erro de Câmera', 'Não foi possível iniciar a câmera. Verifique as permissões do navegador.');
        setModoLeitura('laser');
      });
    }, 150);

    return () => {
      isComponentMounted = false;
      if (html5QrCodeRef.current) {
        try {
          html5QrCodeRef.current.stop().then(() => { html5QrCodeRef.current.clear(); }).catch(() => {});
        } catch (error) {
          console.warn("Parada forçada do scanner interceptada.");
        }
      }
    };
  }, [scannerId, scannerTipo, modoLeitura]); 


  // ==============================================================
  // 🔫 LÓGICA DO LEITOR A LASER / BLUETOOTH
  // ==============================================================
  useEffect(() => {
    if (!scannerId || modoLeitura !== 'laser') return;

    const handleKeyDown = (e) => {
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;

      if (e.key === 'Enter') {
        e.preventDefault();
        const codigoLido = bufferLeitor.current.trim();
        bufferLeitor.current = ""; 

        if (codigoLido.length > 2) {
          const agora = Date.now();
          if (codigoLido === ultimoBipTexto.current && (agora - ultimoBipTempo.current < 1000)) return;
          
          ultimoBipTexto.current = codigoLido;
          ultimoBipTempo.current = agora;

          if (scannerTipo === 'identificacao') {
            funcoesRef.current.tocarBipSucesso();
            funcoesRef.current.buscarProdutoPorCodigo(scannerId, codigoLido);
            funcoesRef.current.fecharModalScanner();
          } else {
            funcoesRef.current.incrementarBip(scannerId);
            // 🚀 Adiciona o código lido à lista para exibição
            setListaCodigosLidos(prev => [codigoLido, ...prev]);
          }
        }
        return;
      }

      if (e.key.length === 1 && /^[a-zA-Z0-9-]$/.test(e.key)) {
        bufferLeitor.current += e.key;
        
        if (timeoutLeitor.current) clearTimeout(timeoutLeitor.current);
        timeoutLeitor.current = setTimeout(() => { bufferLeitor.current = ""; }, 100);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      if (timeoutLeitor.current) clearTimeout(timeoutLeitor.current);
    };
  }, [scannerId, scannerTipo, modoLeitura]);


  if (!scannerAtivo) return null;

  return (
    <div className="no-print" style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.9)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', zIndex: 999999, padding: '15px' }}>
      
      <div style={{ width: '100%', maxWidth: '450px', backgroundColor: 'white', borderRadius: '12px', overflow: 'hidden', textAlign: 'center', position: 'relative' }}>
        
        {/* CABEÇALHO */}
        <div style={{ padding: '15px', backgroundColor: '#2c3e50', color: 'white', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h3 style={{ margin: 0, fontSize: '1.1rem' }}>{scannerAtivo.tipo === 'identificacao' ? 'Bipar Cód. Barras' : 'Bip de Contagem'}</h3>
          <button onClick={fecharModalScanner} style={{ background: 'none', border: 'none', color: 'white', fontSize: '1.4rem', cursor: 'pointer' }}>✖</button>
        </div>

        <div style={{ display: 'flex', borderBottom: '1px solid #bdc3c7', backgroundColor: '#f8f9fa' }}>
          <button 
            type="button"
            onClick={() => setModoLeitura('laser')}
            style={{ flex: 1, padding: '12px', border: 'none', background: modoLeitura === 'laser' ? 'white' : 'transparent', fontWeight: 'bold', color: modoLeitura === 'laser' ? '#2980b9' : '#7f8c8d', borderBottom: modoLeitura === 'laser' ? '3px solid #2980b9' : '3px solid transparent', cursor: 'pointer', transition: 'all 0.2s' }}
          >
            🔫 Leitor a Laser
          </button>
          <button 
            type="button"
            onClick={() => setModoLeitura('camera')}
            style={{ flex: 1, padding: '12px', border: 'none', background: modoLeitura === 'camera' ? 'white' : 'transparent', fontWeight: 'bold', color: modoLeitura === 'camera' ? '#2980b9' : '#7f8c8d', borderBottom: modoLeitura === 'camera' ? '3px solid #2980b9' : '3px solid transparent', cursor: 'pointer', transition: 'all 0.2s' }}
          >
            📷 Câmera do Celular
          </button>
        </div>

        <div style={{ padding: '20px' }}>
          {scannerAtivo.tipo === 'contagem' && (
            <p style={{ margin: '0 0 15px 0', color: '#34495e', fontWeight: 'bold', fontSize: '1.1rem' }}>{scannerAtivo.item.descricaoFornecedor}</p>
          )}
          
          {/* MODO CÂMERA */}
          {modoLeitura === 'camera' && (
            <>
              <div id="leitor-camera-modal" style={{ width: '100%', borderRadius: '8px', overflow: 'hidden', backgroundColor: '#000', minHeight: '220px', border: '2px solid #bdc3c7' }}></div>
              <p style={{ marginTop: '10px', fontSize: '0.9rem', color: '#7f8c8d' }}>Aponte a câmera para os traços do código de barras.</p>
            </>
          )}

          {/* MODO LASER BLUETOOTH */}
          {modoLeitura === 'laser' && (
            <div style={{ width: '100%', minHeight: '220px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', backgroundColor: '#f1f2f6', borderRadius: '8px', border: '2px dashed #95a5a6', padding: '20px' }}>
               {/* 🚀 LÓGICA DE EXIBIÇÃO DA LISTA DE CÓDIGOS */}
               {listaCodigosLidos.length > 0 && scannerAtivo.tipo === 'contagem' ? (
                 <div style={{ width: '100%', maxHeight: '180px', overflowY: 'auto', textAlign: 'left' }}>
                   <p style={{ margin: '0 0 10px 0', color: '#7f8c8d', fontSize: '0.9rem', fontWeight: 'bold', borderBottom: '1px solid #bdc3c7', paddingBottom: '5px' }}>
                     Últimos códigos lidos:
                   </p>
                   {listaCodigosLidos.map((codigo, index) => (
                     <div key={index} style={{ padding: '5px 0', color: '#2c3e50', fontSize: '1.1rem', borderBottom: '1px solid #ecf0f1', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ color: '#27ae60' }}>✔️</span> {codigo}
                     </div>
                   ))}
                 </div>
               ) : (
                 <>
                   <span style={{ fontSize: '4rem', marginBottom: '10px' }}>🔫</span>
                   <h4 style={{ color: '#2c3e50', margin: '0 0 10px 0', fontSize: '1.2rem' }}>Aguardando Leitor Bluetooth...</h4>
                   <p style={{ color: '#7f8c8d', fontSize: '0.95rem', margin: 0, lineHeight: '1.4' }}>
                     Não é necessário clicar em nada.<br/>Apenas aponte o leitor para o produto e aperte o gatilho.
                   </p>
                 </>
               )}
            </div>
          )}
          
          {/* PAINEL DE CONTAGEM INFERIOR */}
          {scannerAtivo.tipo === 'contagem' ? (
            <>
              <div style={{ marginTop: '20px', fontSize: '1.2rem', color: '#2c3e50', backgroundColor: '#eafaf1', padding: '10px', borderRadius: '8px', border: '1px solid #2ecc71' }}>
                Conferidos: <strong style={{ color: '#27ae60', fontSize: '1.4rem' }}>{itens.find(i => i.id === scannerAtivo.item.id)?.quantidadeBipada}</strong> / {scannerAtivo.item.quantidade} un
              </div>
              <button type="button" onClick={() => {
                incrementarBip(scannerAtivo.item.id);
                // 🚀 Adiciona "Manual" na lista se for clicado no botão
                setListaCodigosLidos(prev => ["(Entrada Manual)", ...prev]);
              }} style={{ marginTop: '15px', backgroundColor: '#3498db', color: 'white', border: 'none', padding: '15px', width: '100%', borderRadius: '8px', fontWeight: 'bold', fontSize: '1.1rem', cursor: 'pointer', boxShadow: '0 4px 6px rgba(52, 152, 219, 0.2)' }}>
                👆 Registrar +1 Manualmente
              </button>
            </>
          ) : (
            <div style={{ marginTop: '15px', fontSize: '1.1rem', color: '#e67e22', fontWeight: 'bold' }}>
              Identificação de Cadastro
            </div>
          )}
        </div>

      </div>
    </div>
  );
}