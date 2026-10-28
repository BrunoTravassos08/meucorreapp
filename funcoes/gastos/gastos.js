/*
 * Meu Corre · Controle de gastos
 * Lógica pura, sem DOM. Funciona no navegador (window.Gastos) e no Node (module.exports).
 *
 * Dois tipos de gasto:
 *   gastos do dia  (combustível, manutenção, lavagem, pedágio, comida, pessoais) -> saem do lucro do dia
 *   contas do mês  (aluguel, financiamento, seguro, documentação) -> são as despesas fixas do plano
 *                  da meta diária (meta-diaria.js); a meta já soma essas contas, então elas não
 *                  descontam de novo no lucro do dia.
 *   lucro do dia = faturamento (ganhos-dia.js) − gastos do dia
 */
(function (root) {
  'use strict';

  var CATEGORIAS = [
    { id: 'combustivel', nome: 'Combustível' },
    { id: 'manutencao', nome: 'Manutenção' },     // óleo, pneus, revisões
    { id: 'lavagem', nome: 'Lavagem e estacionamento' },
    { id: 'pedagio', nome: 'Pedágio' },           // só os não reembolsados
    { id: 'alimentacao', nome: 'Alimentação' },
    { id: 'pessoal', nome: 'Pessoais e outras' }
  ];

  var SEMANAS_POR_MES = 52 / 12;

  function valor(v) {
    var n = Number(v);
    return isFinite(n) && n > 0 ? n : 0;
  }

  function arred(v) {
    return Math.round(v * 100) / 100;
  }

  /**
   * @param {Object} dia
   * @param {Array<{categoria:string, valor:number, litros?:number}>} dia.gastos
   * @param {number} [dia.faturamento]  faturamento do dia (ganhos-dia.js), para a fatia e o lucro
   * @param {number} [dia.km]           km rodados no turno, para o custo por km
   * @param {Object} [dia.plano]        custos variáveis do plano: { percentual: 0.18, porDia: 20 }
   */
  function resumirDia(dia) {
    dia = dia || {};
    var erros = [];
    var porCat = {};
    CATEGORIAS.forEach(function (c) { porCat[c.id] = { categoria: c.id, nome: c.nome, total: 0, qtd: 0 }; });

    var total = 0, litros = 0, gastoComLitros = 0;
    (dia.gastos || []).forEach(function (g) {
      var c = porCat[g.categoria];
      if (!c) return;
      var v = valor(g.valor);
      if (v <= 0) { erros.push('Um gasto de ' + c.nome + ' está sem valor.'); return; }
      c.total += v; c.qtd += 1; total += v;
      if (g.categoria === 'combustivel' && valor(g.litros) > 0) { litros += valor(g.litros); gastoComLitros += v; }
    });

    var fat = dia.faturamento == null ? null : valor(dia.faturamento);
    var km = valor(dia.km);
    var comb = porCat.combustivel.total;
    var plano = dia.plano;
    var previsto = plano && fat !== null ? valor(plano.percentual) * fat + valor(plano.porDia) : null;

    return {
      ok: erros.length === 0,
      erros: erros,
      total: arred(total),
      porCategoria: CATEGORIAS.map(function (c) {
        var p = porCat[c.id];
        return { categoria: p.categoria, nome: p.nome, qtd: p.qtd, total: arred(p.total), fatia: total > 0 ? p.total / total : 0 };
      }).filter(function (p) { return p.qtd > 0; }),
      combustivel: {
        total: arred(comb),
        litros: arred(litros),
        precoLitro: litros > 0 ? arred(gastoComLitros / litros) : null,
        porKm: km > 0 ? arred(comb / km) : null
      },
      porKm: km > 0 ? arred(total / km) : null,
      // quanto de cada R$ 1 faturado foi para gastos
      fatia: fat ? total / fat : null,
      lucro: fat === null ? null : arred(fat - total),
      previsto: previsto === null ? null : { valor: arred(previsto), diferenca: arred(total - previsto) }
    };
  }

  /**
   * Contas do mês = despesas fixas do plano da meta. pagas: nomes das contas já pagas no mês.
   * @param {Array<{nome:string, valor:number}>} fixas
   * @param {Array<string>} pagas
   * @param {number} diasPorSemana  do plano, para o peso por dia trabalhado
   */
  function resumirContas(fixas, pagas, diasPorSemana) {
    pagas = pagas || [];
    var total = 0, pago = 0;
    var lista = (fixas || []).map(function (f) {
      var v = valor(f.valor);
      var ok = pagas.indexOf(f.nome) >= 0;
      total += v; if (ok) pago += v;
      return { nome: f.nome, valor: arred(v), paga: ok };
    });
    var diasMes = valor(diasPorSemana) * SEMANAS_POR_MES;
    return {
      contas: lista,
      total: arred(total),
      pago: arred(pago),
      falta: arred(total - pago),
      porDiaTrabalhado: diasMes > 0 ? arred(total / diasMes) : null
    };
  }

  var api = { resumirDia: resumirDia, resumirContas: resumirContas, CATEGORIAS: CATEGORIAS };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.Gastos = api;
})(typeof self !== 'undefined' ? self : this);
