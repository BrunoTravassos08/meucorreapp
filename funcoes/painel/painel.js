/*
 * Meu Corre · Painel de desempenho
 * Lógica pura, sem DOM. Funciona no navegador (window.Painel) e no Node (module.exports).
 *
 * Histórico de dias (localStorage meucorre.historico = { exemplo: false, dias: [Dia] }):
 *   cada "Começar um dia novo" (telas Ganhos do dia e Gastos) fecha o dia com fecharDia e zera as duas telas.
 *   Dia = { data:'AAAA-MM-DD', faturamento, bruto, taxas, gastos, combustivel, km, minutos, corridas, meta,
 *           inicio, fim, itensGanhos, itensGastos }  (dias de exemplo trazem apps e categorias já somados)
 *   Sem histórico salvo, o painel usa exemplo(): dias simulados, marcados como exemplo na tela.
 *   O primeiro dia de verdade substitui o exemplo. Dois fechamentos no mesmo dia somam.
 *
 * Lucro líquido estimado = faturamento − gastos do dia − contas do mês × (dias trabalhados / dias do mês do plano).
 * Meta do período = meta diária × dias de trabalho do plano dentro do período.
 */
(function (root) {
  'use strict';

  var SEMANAS_POR_MES = 52 / 12;

  function num(s) {
    if (typeof s === 'number') return isFinite(s) ? s : 0;
    s = String(s || '').replace(/[^\d.,]/g, '');
    if (!s) return 0;
    if (s.indexOf(',') >= 0) s = s.replace(/\./g, '').replace(',', '.');
    else if (/^\d{1,3}(\.\d{3})+$/.test(s)) s = s.replace(/\./g, '');
    var n = Number(s);
    return isFinite(n) ? n : 0;
  }
  function arred(v) { return Math.round(v * 100) / 100; }
  function minutos(hhmm) {
    var m = /^(\d{1,2}):(\d{2})$/.exec(String(hhmm || ''));
    return m ? Number(m[1]) * 60 + Number(m[2]) : null;
  }
  function iso(d) { return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); }
  function somaDias(d, n) { return new Date(d.getFullYear(), d.getMonth(), d.getDate() + n); }

  /** Meta do dia (mesma conta de meta-diaria.js) e parte das contas do mês por dia trabalhado. plano = meucorre.plano */
  function metas(plano) {
    var diasSemana = plano.dias.reduce(function (a, b) { return a + (b ? 1 : 0); }, 0);
    var diasMes = diasSemana * SEMANAS_POR_MES;
    var fixas = plano.fixas.reduce(function (t, f) { return t + num(f.valor); }, 0);
    var pct = 0, porDia = 0;
    plano.variaveis.forEach(function (c) { if (c.tipo === 'percentual') pct += num(c.valor); else porDia += num(c.valor); });
    pct = pct / 100;
    return {
      dia: diasMes > 0 && pct < 1 ? (num(plano.lucro) + fixas + porDia * diasMes) / (1 - pct) / diasMes : 0,
      contasDia: diasMes > 0 ? fixas / diasMes : 0,
      // plano.dias vai de segunda (0) a domingo (6)
      trabalha: function (d) { return !!plano.dias[(d.getDay() + 6) % 7]; }
    };
  }

  /**
   * Resume o dia para o histórico. ganhos = meucorre.ganhos; gastos = meucorre.gastos.lancamentos.
   * Dia vazio (sem ganho nem gasto) devolve null.
   */
  function fecharDia(ganhos, gastos, plano, data) {
    var bruto = 0, taxas = 0, corridas = 0, total = 0, comb = 0;
    (ganhos.lancamentos || []).forEach(function (l) {
      var b = num(l.bruto);
      var t = l.app === 'particular' || l.tipo === 'bonus' ? 0 : Math.min(b, num(l.taxa));
      bruto += b; taxas += t;
      if (l.tipo !== 'bonus') corridas += Math.round(num(l.corridas));
    });
    (gastos || []).forEach(function (x) { var v = num(x.valor); total += v; if (x.categoria === 'combustivel') comb += v; });
    if (bruto === 0 && total === 0) return null;
    var t0 = ganhos.turno || {}, ini = minutos(t0.inicio), fim = minutos(t0.fim);
    var k0 = num(t0.kmInicial), k1 = num(t0.kmFinal);
    return {
      data: iso(data || new Date()),
      faturamento: arred(bruto - taxas), bruto: arred(bruto), taxas: arred(taxas),
      gastos: arred(total), combustivel: arred(comb),
      km: String(t0.kmInicial || '').trim() && String(t0.kmFinal || '').trim() && k1 >= k0 ? k1 - k0 : null,
      minutos: ini !== null && fim !== null ? (fim >= ini ? fim - ini : fim + 1440 - ini) : null,
      corridas: corridas,
      inicio: t0.inicio || '', fim: t0.fim || '',
      itensGanhos: ganhos.lancamentos || [], itensGastos: gastos || [],   // a tela Dias anteriores mostra os lançamentos
      meta: arred(metas(plano).dia)
    };
  }

  /** Grava o dia no histórico; um histórico de exemplo é descartado. */
  function registrar(historico, dia) {
    var h = historico && historico.exemplo === false && Array.isArray(historico.dias) ? historico : { exemplo: false, dias: [] };
    return { exemplo: false, dias: h.dias.concat(dia ? [dia] : []) };
  }

  /** Resume uma lista de dias. contasDia vem de metas(plano). */
  function resumir(dias, contasDia) {
    var r = { n: 0, fat: 0, gastos: 0, comb: 0, km: 0, fatKm: 0, min: 0, fatMin: 0, corridas: 0, bateu: 0 };
    dias.forEach(function (d) {
      r.n++; r.fat += d.faturamento; r.gastos += d.gastos; r.comb += d.combustivel; r.corridas += d.corridas;
      if (d.km) { r.km += d.km; r.fatKm += d.faturamento; }
      if (d.minutos) { r.min += d.minutos; r.fatMin += d.faturamento; }
      if (d.meta > 0 && d.faturamento >= d.meta) r.bateu++;
    });
    r.contas = contasDia * r.n;
    r.lucro = r.fat - r.gastos - r.contas;
    r.porHora = r.min ? r.fatMin / (r.min / 60) : null;   // só dias com horário de turno
    r.porKm = r.km ? r.fatKm / r.km : null;               // só dias com km do turno
    return r;
  }

  /** Período 'dia' | 'semana' (segunda a domingo) | 'mes', offset 0 = atual, 1 = anterior... */
  function faixa(periodo, offset, hoje) {
    if (periodo === 'dia') { var d = somaDias(hoje, -offset); return { ini: d, fim: d }; }
    if (periodo === 'semana') {
      var seg = somaDias(hoje, -((hoje.getDay() + 6) % 7) - 7 * offset);
      return { ini: seg, fim: somaDias(seg, 6) };
    }
    var ini = new Date(hoje.getFullYear(), hoje.getMonth() - offset, 1);
    return { ini: ini, fim: new Date(ini.getFullYear(), ini.getMonth() + 1, 0) };
  }

  /** Lucro líquido médio por dia da semana (0 = domingo). */
  function porDiaDaSemana(dias, contasDia) {
    var w = [0, 1, 2, 3, 4, 5, 6].map(function (i) { return { diaSemana: i, n: 0, lucro: 0 }; });
    dias.forEach(function (d) {
      var p = d.data.split('-'), x = w[new Date(+p[0], +p[1] - 1, +p[2]).getDay()];
      x.n++; x.lucro += d.faturamento - d.gastos - contasDia;
    });
    return w.map(function (x) { return { diaSemana: x.diaSemana, dias: x.n, media: x.n ? x.lucro / x.n : null }; });
  }

  // Gerador fixo (mulberry32): o exemplo é sempre o mesmo para a mesma data
  function sorteio(semente) {
    var a = semente >>> 0;
    return function () {
      a = (a + 0x6D2B79F5) >>> 0;
      var t = a;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  /** Seis meses de exemplo até ontem: moto, segunda a sábado, sexta e sábado rendem mais, leve melhora mês a mês. */
  function exemplo(hoje, metaDia) {
    var dias = [], MULT = [0, 0.93, 0.88, 0.95, 1, 1.14, 1.22];
    for (var i = 182; i >= 1; i--) {
      var d = somaDias(hoje, -i), wd = d.getDay();
      var r = sorteio(d.getFullYear() * 10000 + (d.getMonth() + 1) * 100 + d.getDate());
      if (wd === 0 || r() < 0.05) continue;
      var tend = 0.8 + 0.2 * (1 - i / 182);
      var horas = 6.2 + r() * 2.4 + (wd === 6 ? 0.5 : 0);
      var fat = horas * 26.5 * MULT[wd] * tend * (0.9 + r() * 0.2);
      var taxa = 0.17 + r() * 0.06;
      var km = Math.round(fat / (1.5 + r() * 0.35));
      var comb = km / (32 + r() * 6) * (6.05 + 0.24 * (1 - i / 182));
      var gastos = comb;
      if (r() < 0.85) gastos += 14 + r() * 10;   // comida
      if (r() < 0.06) gastos += 45 + r() * 115;  // óleo, relação, pneu
      if (r() < 0.08) gastos += 15 + r() * 10;   // lavagem
      dias.push({
        data: iso(d), faturamento: arred(fat), bruto: arred(fat / (1 - taxa)), taxas: arred(fat / (1 - taxa) - fat),
        gastos: arred(gastos), combustivel: arred(comb), km: km, minutos: Math.round(horas * 60),
        corridas: Math.round(fat / 14), meta: arred(metaDia)
      });
    }
    return dias;
  }

  var api = { metas: metas, fecharDia: fecharDia, registrar: registrar, resumir: resumir, faixa: faixa, porDiaDaSemana: porDiaDaSemana, exemplo: exemplo };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.Painel = api;
})(typeof self !== 'undefined' ? self : this);
