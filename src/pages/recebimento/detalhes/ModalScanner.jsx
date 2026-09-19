import React, { useEffect, useRef } from 'react';
import { Html5Qrcode, Html5QrcodeSupportedFormats } from 'html5-qrcode';

export default function ModalScanner({ 
  scannerAtivo, fecharModalScanner, itens, 
  buscarProdutoPorCodigo, incrementarBip, tocarBipSucesso, exibirPopup 
}) {
  const html5QrCodeRef = useRef(null);
  const ultimoBipTempo = useRef(0);
  const ultimoBipTexto = useRef("");

  // 🚀 PROTEÇÃO 3: Blindagem contra re-renders do cronômetro.
  // Salvamos as funções na memória para que a câmera não ache que elas mudaram a cada 1 segundo.
  const funcoesRef = useRef({ buscarProdutoPorCodigo, fecharModalScanner, incrementarBip, tocarBipSucesso, exibirPopup });
  
  useEffect(() => {
    funcoesRef.current = { buscarProdutoPorCodigo, fecharModalScanner, incrementarBip, tocarBipSucesso, exibirPopup };
  });

  const scannerId = scannerAtivo?.item?.id;
  const scannerTipo = scannerAtivo?.tipo;

  useEffect(() => {
    // Se não tiver ID válido (modal fechado), não faz nada
    if (!scannerId) return; 

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
          // Trava anti-duplo-bip: não lê o mesmo código se não passou 1,5 segundos
          if (decodedText === ultimoBipTexto.current && (agora - ultimoBipTempo.current < 1500)) return;
          ultimoBipTexto.current = decodedText;
          ultimoBipTempo.current = agora;

          if (scannerTipo === 'identificacao') {
            funcoesRef.current.tocarBipSucesso();
            
            try {
              if (html5QrCodeRef.current) {
                html5QrCodeRef.current.pause();
              }
            } catch(e) {}

            funcoesRef.current.buscarProdutoPorCodigo(scannerId, decodedText);
            funcoesRef.current.fecharModalScanner();
          } else {
            funcoesRef.current.incrementarBip(scannerId);
          }
        },
        (err) => { }
      ).catch(err => {
        funcoesRef.current.exibirPopup('erro', 'Erro de Câmera', 'Não foi possível iniciar a câmera. Verifique as permissões.');
        funcoesRef.current.fecharModalScanner();
      });
    }, 150);

    return () => {
      isComponentMounted = false;
      if (html5QrCodeRef.current) {
        try {
          html5QrCodeRef.current.stop().then(() => {
            html5QrCodeRef.current.clear();
          }).catch(() => {});
        } catch (error) {
          console.warn("Parada forçada do scanner interceptada com sucesso (Erro evitado).");
        }
      }
    };
  }, [scannerId, scannerTipo]); // 🚀 O SEGREDO ESTÁ AQUI: Agora a câmera SÓ reinicia se trocar o produto aberto!

  if (!scannerAtivo) return null;

  return (
    <div className="no-print" style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.9)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', zIndex: 999999, padding: '15px' }}>
      <div style={{ width: '100%', maxWidth: '450px', backgroundColor: 'white', borderRadius: '12px', overflow: 'hidden', textAlign: 'center', position: 'relative' }}>
        <div style={{ padding: '15px', backgroundColor: '#2c3e50', color: 'white', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h3 style={{ margin: 0, fontSize: '1.1rem' }}>📷 {scannerAtivo.tipo === 'identificacao' ? 'Bipar Cód. Barras' : 'Bip de Contagem'}</h3>
          <button onClick={fecharModalScanner} style={{ background: 'none', border: 'none', color: 'white', fontSize: '1.4rem', cursor: 'pointer' }}>✖</button>
        </div>
        <div style={{ padding: '15px' }}>
          {scannerAtivo.tipo === 'contagem' && <p style={{ margin: '0 0 10px 0', color: '#34495e', fontWeight: 'bold' }}>{scannerAtivo.item.descricaoFornecedor}</p>}
          
          <div id="leitor-camera-modal" style={{ width: '100%', borderRadius: '8px', overflow: 'hidden', backgroundColor: '#000', minHeight: '220px' }}></div>
          
          {scannerAtivo.tipo === 'contagem' ? (
            <>
              <div style={{ marginTop: '15px', fontSize: '1.1rem', color: '#2c3e50' }}>Conferidos: <strong style={{ color: '#27ae60' }}>{itens.find(i => i.id === scannerAtivo.item.id)?.quantidadeBipada}</strong> / {scannerAtivo.item.quantidade} un</div>
              <button type="button" onClick={() => incrementarBip(scannerAtivo.item.id)} style={{ marginTop: '15px', backgroundColor: '#3498db', color: 'white', border: 'none', padding: '12px', width: '100%', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer' }}>+ Registrar 1 Unidade Manual</button>
            </>
          ) : (
            <div style={{ marginTop: '15px', fontSize: '1.1rem', color: '#2c3e50', fontWeight: 'bold' }}>Aponte para o código de barras (traços).</div>
          )}
        </div>
      </div>
    </div>
  );
}