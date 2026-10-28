/*
 * Meu Corre · Calculadora de meta diária
 * Lógica pura, sem DOM. Funciona no navegador (window.MetaDiaria) e no Node (module.exports).
 *
 * Modelo:
 *   faturamento − custos variáveis − despesas fixas = lucro desejado
 *   custos variáveis = (% do faturamento) + (R$ por dia × dias trabalhados)
 *   => faturamento = (lucro + fixas + porDia × dias) / (1 − percentual)
 */
(function (root) {
  'use strict';

  // Média de semanas por mês (52 semanas / 12 meses)
  var SEMANAS_POR_MES = 52 / 12;
  // A Uber pede 6h offline depois de 12h online
  var LIMITE_HORAS_DIA = 12;

  function soma(lista, campo) {
    return (lista || []).reduce(function (t, item) {
      var v = Number(item[campo]);
      return t + (isFinite(v) && v > 0 ? v : 0);
    }, 0);
  }

  function arred(v) {
    return Math.round(v * 100) / 100;
  }

  /**
   * @param {Object} entrada
   * @param {number} entrada.lucroDesejadoMes   quanto quer ganhar limpo no mês (R$)
   * @param {Array<{nome:string, valor:number}>} entrada.despesasFixas   valores mensais (R$)
   * @param {Array<{nome:string, valor:number, tipo:'percentual'|'porDia'}>} entrada.custosVariaveis
   *        percentual: % do faturamento (ex.: 25 = 25%); porDia: R$ por dia trabalhado
   * @param {number} entrada.diasPorSemana      1 a 7
   * @param {number} entrada.faturamentoPorHora média de faturamento por hora (R$)
   */
  function calcular(entrada) {
    var erros = [];
    var lucro = Math.max(0, Number(entrada.lucroDesejadoMes) || 0);
    var diasSemana = Math.round(Number(entrada.diasPorSemana) || 0);
    var porHora = Number(entrada.faturamentoPorHora) || 0;

    var variaveis = entrada.custosVariaveis || [];
    var fixasMes = soma(entrada.despesasFixas, 'valor');
    var percentual = soma(variaveis.filter(function (c) { return c.tipo === 'percentual'; }), 'valor') / 100;
    var porDia = soma(variaveis.filter(function (c) { return c.tipo === 'porDia'; }), 'valor');

    if (diasSemana < 1 || diasSemana > 7) erros.push('Escolha de 1 a 7 dias de trabalho por semana.');
    if (percentual >= 1) erros.push('Os custos em % somam 100% ou mais do faturamento. Assim não sobra lucro.');
    if (porHora <= 0) erros.push('Informe quanto você fatura, em média, por hora.');
    if (erros.length && (diasSemana < 1 || diasSemana > 7 || percentual >= 1)) {
      return { ok: false, erros: erros };
    }

    var diasMes = diasSemana * SEMANAS_POR_MES;
    var variaveisDiaMes = porDia * diasMes;
    var faturamentoMes = (lucro + fixasMes + variaveisDiaMes) / (1 - percentual);
    var variaveisPercMes = faturamentoMes * percentual;
    var variaveisMes = variaveisPercMes + variaveisDiaMes;
    var despesasMes = fixasMes + variaveisMes;

    var faturamentoDia = faturamentoMes / diasMes;
    var faturamentoSemana = faturamentoDia * diasSemana;

    var horasDia = porHora > 0 ? faturamentoDia / porHora : null;

    return {
      ok: erros.length === 0,
      erros: erros,
      diasPorSemana: diasSemana,
      diasMes: arred(diasMes),
      faturamento: {
        dia: arred(faturamentoDia),
        semana: arred(faturamentoSemana),
        mes: arred(faturamentoMes)
      },
      despesas: {
        mes: arred(despesasMes),
        dia: arred(despesasMes / diasMes),
        fixasMes: arred(fixasMes),
        variaveisMes: arred(variaveisMes),
        // quanto de cada R$ 1 faturado vai para despesas
        fatia: faturamentoMes > 0 ? despesasMes / faturamentoMes : 0
      },
      lucro: {
        mes: arred(lucro),
        semana: arred(lucro / diasMes * diasSemana),
        dia: arred(lucro / diasMes),
        fatia: faturamentoMes > 0 ? lucro / faturamentoMes : 0
      },
      horas: horasDia === null ? null : {
        dia: arred(horasDia),
        semana: arred(horasDia * diasSemana),
        mes: arred(horasDia * diasMes),
        lucroPorHora: horasDia > 0 ? arred(lucro / (horasDia * diasMes)) : 0,
        acimaDoLimite: horasDia > LIMITE_HORAS_DIA
      }
    };
  }

  var api = { calcular: calcular, SEMANAS_POR_MES: SEMANAS_POR_MES, LIMITE_HORAS_DIA: LIMITE_HORAS_DIA };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.MetaDiaria = api;
})(typeof self !== 'undefined' ? self : this);
