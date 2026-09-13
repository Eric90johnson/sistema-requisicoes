import { useState, useCallback } from 'react';
import { supabase } from '../../../services/supabase';

export function useRankingData() {
  const [dadosRankingReq, setDadosRankingReq] = useState([]);
  const [dadosRankingRec, setDadosRankingRec] = useState([]);
  const [carregandoRanking, setCarregandoRanking] = useState(false);
  const [rankingCarregado, setRankingCarregado] = useState(false);

  const buscarDadosRankingCompleto = useCallback(async () => {
    setCarregandoRanking(true);
    try {
      // 1. Busca Histórico Completo de Requisições (Leve, sem lista_itens)
      let todosReqs = [];
      let buscouTodosReqs = false;
      let indexReq = 0;
      
      while (!buscouTodosReqs) {
        const { data, error } = await supabase
          .from('requisicoes')
          .select('id, motivo, origem, destino, metricas_separacao, timestamp_criacao')
          .not('metricas_separacao', 'is', null)
          .range(indexReq, indexReq + 999);
          
        if (error) break;
        if (data && data.length > 0) {
          // 🚀 AQUI ESTÁ A CORREÇÃO: Traduzindo as chaves (snake_case do banco para camelCase do React)
          const formatados = data.map(r => ({
            ...r,
            metricasSeparacao: r.metricas_separacao,
            timestampCriacao: r.timestamp_criacao
          }));
          
          todosReqs = [...todosReqs, ...formatados];
          indexReq += 1000;
        }
        if (!data || data.length < 1000) buscouTodosReqs = true;
      }

      // 2. Busca Histórico Completo de Recebimentos
      let todosRecs = [];
      let buscouTodosRecs = false;
      let indexRec = 0;

      while (!buscouTodosRecs) {
        const { data, error } = await supabase
          .from('recebimento_mercadorias')
          .select('numero_relatorio, metricas_recebimento, data_criacao')
          .not('metricas_recebimento', 'is', null)
          .range(indexRec, indexRec + 999);
          
        if (error) break;
        if (data && data.length > 0) {
          todosRecs = [...todosRecs, ...data];
          indexRec += 1000;
        }
        if (!data || data.length < 1000) buscouTodosRecs = true;
      }

      setDadosRankingReq(todosReqs);
      setDadosRankingRec(todosRecs);
      setRankingCarregado(true);
    } catch (error) {
      console.error("Erro ao buscar histórico do ranking:", error);
    } finally {
      setCarregandoRanking(false);
    }
  }, []);

  return {
    dadosRankingReq,
    dadosRankingRec,
    carregandoRanking,
    rankingCarregado,
    buscarDadosRankingCompleto
  };
}