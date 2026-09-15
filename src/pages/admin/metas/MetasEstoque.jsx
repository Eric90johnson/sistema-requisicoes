import React, { useState } from 'react';
import '../../../styles/admin/metas/metasEstoque.css'; // 🚀 Caminho corrigido para o padrão admin do seu projeto!
import { useRankingData } from '../../painel/hooks/useRankingData'; 

export default function MetasEstoque({ aoVoltar, usuarioLogado }) {
  const { buscarDadosRankingCompleto, carregandoRanking } = useRankingData();

  // Dados Simulados para Visualização do Layout (Mock)
  const metricasGlobais = {
    assertividade: 98.2, // Meta 95%
    upmGeral: 3.4,       // Meta 3.0
    slaSeparacao: 91,    // Pedidos separados em < 2h (Meta 90%)
    slaFaturamento: 85   // Faturados em < 1h após separação
  };

  const metasDoMes = [
    { id: 1, titulo: "Zerar Caixa de Avarias", desc: "Resolver todas as devoluções até dia 10", concluido: true },
    { id: 2, titulo: "Auditoria 100%", desc: "Manter precisão de entrega nas filiais sem faltas", concluido: false },
    { id: 3, titulo: "Corte de Horário", desc: "Garantir que pedidos até 15h saiam às 17h", concluido: false }
  ];

  const KpiCard = ({ titulo, valor, metaTexto, icon, cor, atingiuMeta }) => (
    <div className="kpi-card" style={{ borderLeftColor: cor }}>
      <div className="kpi-icon" style={{ color: cor }}>{icon}</div>
      <div className="kpi-info">
        <span className="kpi-titulo">{titulo}</span>
        <span className="kpi-valor">{valor}</span>
        <span className="kpi-meta">
          <span className={atingiuMeta ? 'badge-meta-ok' : 'badge-meta-atencao'}>
            {atingiuMeta ? '✔️ Meta Batida' : '⚠️ Atenção'}
          </span>
          {metaTexto}
        </span>
      </div>
    </div>
  );

  return (
    <div className="metas-container">
      {/* CABEÇALHO */}
      <div className="metas-header">
        <div>
          <h2>🎯 Gestão de Metas e Desempenho</h2>
          <p>Visão estratégica da logística Neta Dantas baseada em dados e SLAs.</p>
        </div>
        <button className="btn-voltar" onClick={aoVoltar}>
          ← Voltar ao Painel
        </button>
      </div>

      {/* LINHA 1: KPIs GLOBAIS (OS PILARES) */}
      <div className="kpi-grid">
        <KpiCard 
          titulo="Assertividade de Bipagem" 
          valor={`${metricasGlobais.assertividade}%`} 
          metaTexto="Meta: 95%" 
          icon="🎯" 
          cor="#27ae60" 
          atingiuMeta={metricasGlobais.assertividade >= 95} 
        />
        <KpiCard 
          titulo="Velocidade da Equipe (UPM)" 
          valor={`${metricasGlobais.upmGeral} un/m`} 
          metaTexto="Meta: 3.0 un/m" 
          icon="⚡" 
          cor="#8e44ad" 
          atingiuMeta={metricasGlobais.upmGeral >= 3.0} 
        />
        <KpiCard 
          titulo="SLA: Saída Rápida (< 2h)" 
          valor={`${metricasGlobais.slaSeparacao}%`} 
          metaTexto="Meta: 90% dentro do prazo" 
          icon="⏱️" 
          cor="#2980b9" 
          atingiuMeta={metricasGlobais.slaSeparacao >= 90} 
        />
      </div>

      {/* LINHA 2: CONTEÚDO DETALHADO */}
      <div className="metas-body-grid">
        
        {/* COLUNA ESQUERDA: Gráficos de SLA */}
        <div className="painel-secao">
          <h3>📊 Acordos de Nível de Serviço (SLA) - Visão Mensal</h3>
          
          <div className="sla-item">
            <div className="sla-header">
              <span>Pedidos Separados em até 2 Horas</span>
              <span style={{ color: '#2980b9' }}>{metricasGlobais.slaSeparacao}%</span>
            </div>
            <div className="sla-track">
              <div className="sla-fill" style={{ width: `${metricasGlobais.slaSeparacao}%`, backgroundColor: '#3498db' }}></div>
            </div>
            <small style={{ color: '#7f8c8d', display: 'block', marginTop: '5px' }}>
              Baseado no horário de corte das 15h.
            </small>
          </div>

          <div className="sla-item" style={{ marginTop: '25px' }}>
            <div className="sla-header">
              <span>Faturamento e Expedição em até 1 Hora</span>
              <span style={{ color: '#e67e22' }}>{metricasGlobais.slaFaturamento}%</span>
            </div>
            <div className="sla-track">
              <div className="sla-fill" style={{ width: `${metricasGlobais.slaFaturamento}%`, backgroundColor: '#e67e22' }}></div>
            </div>
            <small style={{ color: '#7f8c8d', display: 'block', marginTop: '5px' }}>
              Tempo entre a finalização da separação e a saída física. (Meta da Gestão)
            </small>
          </div>
          
          <div style={{ marginTop: '30px', padding: '15px', backgroundColor: '#f8f9fa', borderRadius: '8px', border: '1px dashed #bdc3c7' }}>
            <h4 style={{ margin: '0 0 10px 0', color: '#34495e' }}>🛡️ Qualidade de Entrega nas Filiais</h4>
            <p style={{ margin: 0, fontSize: '0.9rem', color: '#7f8c8d' }}>
              <em>Módulo de Trava de Auditoria de Recebimento nas filiais será implementado na Fase 2. Isso garantirá o índice de 100% de assertividade e fim das perdas de trajeto.</em>
            </p>
          </div>
        </div>

        {/* COLUNA DIREITA: Metas de Organização e Pessoais */}
        <div className="painel-secao">
          <h3>📋 Desafios Operacionais</h3>
          <p style={{ fontSize: '0.85rem', color: '#7f8c8d', marginBottom: '20px' }}>
            Metas ativas para organização do CD no mês atual.
          </p>

          <div className="lista-metas">
            {metasDoMes.map(meta => (
              <div key={meta.id} className="meta-tarefa-item" style={{ opacity: meta.concluido ? 0.7 : 1 }}>
                <div className={`meta-status-circle ${meta.concluido ? 'meta-status-concluida' : 'meta-status-pendente'}`}>
                  {meta.concluido ? '✓' : '•'}
                </div>
                <div className="meta-texto">
                  <h4 style={{ textDecoration: meta.concluido ? 'line-through' : 'none' }}>{meta.titulo}</h4>
                  <p>{meta.desc}</p>
                </div>
              </div>
            ))}
          </div>

          <div style={{ marginTop: '20px', textAlign: 'center' }}>
            <img 
              src={`https://ui-avatars.com/api/?name=${usuarioLogado?.nome_completo || 'Usuario'}&background=8e44ad&color=fff&rounded=true`} 
              alt="Avatar" 
              style={{ width: '50px', height: '50px', marginBottom: '10px' }} 
            />
            <h4 style={{ margin: '0 0 5px 0' }}>Olá, {usuarioLogado?.nome_completo?.split(' ')[0] || 'Gestor'}</h4>
            <p style={{ fontSize: '0.85rem', color: '#7f8c8d', margin: 0 }}>
              Sua equipe conta com sua liderança para bater as metas de SLA desta semana!
            </p>
          </div>
        </div>

      </div>
    </div>
  );
}