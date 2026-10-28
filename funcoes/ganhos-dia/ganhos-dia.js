/*
 * Meu Corre · Controle de ganhos diários
 * Lógica pura, sem DOM. Funciona no navegador (window.GanhosDia) e no Node (module.exports).
 *
 * Faturamento não é lucro:
 *   bruto (o que o passageiro pagou) − taxas do app = recebido (o que caiu pra você)
 *   recebido − gastos do dia = lucro
 * A meta diária (meta-diaria.js) é de faturamento recebido, então o progresso usa o recebido.
 */
(function (root) {
  'use strict';

  var APPS = [
    { id: 'uber', nome: 'Uber' },
    { id: '99', nome: '99' },
    { id: 'indrive', nome: 'InDrive' },
    { id: 'particular', nome: 'Particular' }
  ];

  function valor(v) {
    var n = Number(v);
    return isFinite(n) && n > 0 ? n : 0;
  }

  function arred(v) {
    return Math.round(v * 100) / 100;
  }

  // "07:30" -> 450 minutos; inválido -> null
  function minutos(hhmm) {
    var m = /^(\d{1,2}):(\d{2})$/.exec(String(hhmm || ''));
    if (!m || Number(m[1]) > 23 || Number(m[2]) > 59) return null;
    return Number(m[1]) * 60 + Number(m[2]);
  }

  /**
   * @param {Object} turno  { inicio:'07:30', fim:'16:42', kmInicial:12340, kmFinal:12488 }
   *        Término antes do início conta como turno que virou a noite.
   */
  function resumirTurno(turno) {
    turno = turno || {};
    var erros = [];
    var ini = minutos(turno.inicio), fim = minutos(turno.fim);
    var minutosTurno = null;
    if (ini !== null && fim !== null) minutosTurno = fim >= ini ? fim - ini : fim + 24 * 60 - ini;

    var kmIni = Number(turno.kmInicial), kmFim = Number(turno.kmFinal);
    var km = null;
    if (turno.kmInicial !== '' && turno.kmFinal !== '' && turno.kmInicial != null && turno.kmFinal != null &&
        isFinite(kmIni) && isFinite(kmFim)) {
      if (kmFim < kmIni) erros.push('A quilometragem final está menor que a inicial.');
      else km = kmFim - kmIni;
    }
    return { minutos: minutosTurno, horas: minutosTurno === null ? null : minutosTurno / 60, km: km, erros: erros };
  }

  /**
   * @param {Object} dia
   * @param {Object} dia.turno  ver resumirTurno
   * @param {Array<{app:string, tipo:'corrida'|'bonus', corridas:number, bruto:number, taxa:number}>} dia.lancamentos
   *        bruto: valor cobrado do passageiro (ou o bônus); taxa: o que o app descontou (R$)
   * @param {number} [dia.gastos]   gastos do dia (R$), para chegar no lucro
   * @param {number} [dia.metaDia]  faturamento recebido que a meta pede para o dia (R$)
   */
  function resumir(dia) {
    dia = dia || {};
    var erros = [];
    var t = resumirTurno(dia.turno);
    erros = erros.concat(t.erros);

    var porApp = {};
    APPS.forEach(function (a) { porApp[a.id] = { app: a.id, nome: a.nome, corridas: 0, bruto: 0, taxas: 0, bonus: 0 }; });

    var bruto = 0, taxas = 0, bonus = 0, corridas = 0;
    (dia.lancamentos || []).forEach(function (l) {
      var a = porApp[l.app];
      if (!a) return;
      var b = valor(l.bruto);
      // particular não tem app no meio; bônus chega sem taxa
      var tx = l.app === 'particular' || l.tipo === 'bonus' ? 0 : valor(l.taxa);
      if (tx > b) {
        erros.push('Um lançamento de ' + a.nome + ' tem taxa maior que o valor bruto.');
        tx = b;
      }
      var qtd = l.tipo === 'bonus' ? 0 : Math.max(0, Math.round(Number(l.corridas) || 0));
      a.bruto += b; a.taxas += tx; a.corridas += qtd;
      if (l.tipo === 'bonus') { a.bonus += b; bonus += b; }
      bruto += b; taxas += tx; corridas += qtd;
    });

    var recebido = bruto - taxas;
    var lista = APPS.map(function (a) {
      var p = porApp[a.id];
      var rec = p.bruto - p.taxas;
      return {
        app: p.app, nome: p.nome, corridas: p.corridas,
        bruto: arred(p.bruto), taxas: arred(p.taxas), bonus: arred(p.bonus), recebido: arred(rec),
        taxaPct: p.bruto > 0 ? p.taxas / p.bruto : 0,
        fatia: recebido > 0 ? rec / recebido : 0
      };
    }).filter(function (p) { return p.bruto > 0; });

    var gastos = dia.gastos == null ? null : valor(dia.gastos);
    var metaDia = valor(dia.metaDia);

    return {
      ok: erros.length === 0,
      erros: erros,
      faturamento: {
        bruto: arred(bruto),
        brutoCorridas: arred(bruto - bonus),
        taxas: arred(taxas),
        recebido: arred(recebido),
        bonus: arred(bonus),
        // quanto do bruto ficou com os apps
        taxaMedia: bruto > 0 ? taxas / bruto : 0
      },
      corridas: corridas,
      porApp: lista,
      turno: { minutos: t.minutos, km: t.km },
      porKm: t.km ? arred(recebido / t.km) : null,
      porHora: t.horas ? arred(recebido / t.horas) : null,
      lucro: gastos === null ? null : { gastos: arred(gastos), valor: arred(recebido - gastos) },
      meta: metaDia > 0 ? {
        dia: arred(metaDia),
        pct: recebido / metaDia,
        falta: arred(Math.max(0, metaDia - recebido)),
        passou: arred(Math.max(0, recebido - metaDia))
      } : null
    };
  }

  var api = { resumir: resumir, resumirTurno: resumirTurno, APPS: APPS };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.GanhosDia = api;
})(typeof self !== 'undefined' ? self : this);
