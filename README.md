# Meu Corre

**Seu corre, suas contas.** App de gastos e ganhos para motoristas e motoboys de aplicativo (Uber, Uber Moto, 99, iFood, Lalamove). Mostra quanto sobra de verdade depois da gasolina, da manutenção e da taxa do app.

Este repositório guarda os protótipos do app: a identidade visual, as telas e a lógica de cada função.

## Estrutura

```
identidade/
  identidade.html        Identidade visual v1 (logo, cores, tipografia, ícone, tom de voz)
telas/
  canvas.json            Índice das telas (ordem e posição de cada uma)
  Main.dc.html           Login: Google, e-mail e criar conta (com a animação de abertura)
  Senha.dc.html          Senha de quem já tem conta (mostra o e-mail digitado)
  Cadastro.dc.html       Criar conta em 5 passos: dados, apps, veículo, dias e meta
  Dashboard.dc.html      Início
  MetaDiaria.dc.html     Meta diária
  GanhosDia.dc.html      Ganhos do dia
  Gastos.dc.html         Gastos
  Painel.dc.html         Painel de desempenho
  Dias.dc.html           Dias anteriores (lista ou calendário)
  Perfil.dc.html         Perfil e configurações
  Notificacoes.dc.html   Notificações
funcoes/
  calculadora-meta/      01 · Calculadora de meta diária (meta-diaria.js + página de teste)
  ganhos-dia/            02 · Controle de ganhos diários (ganhos-dia.js)
  gastos/                03 · Controle de gastos (gastos.js)
  painel/                05 · Painel de desempenho (painel.js)
```

## Funções

Cada arquivo em `funcoes/` é lógica pura, sem tela: funciona no navegador (como `window.MetaDiaria`, `window.GanhosDia`, `window.Gastos`, `window.Painel`) e no Node (`require`).

| Nº | Função | Arquivo | O que faz |
|----|--------|---------|-----------|
| 01 | Meta diária | `funcoes/calculadora-meta/meta-diaria.js` | Calcula quanto faturar por dia para chegar no lucro desejado, somando contas fixas e custos variáveis. |
| 02 | Ganhos do dia | `funcoes/ganhos-dia/ganhos-dia.js` | Soma as corridas por app, separa bruto, taxas e o que caiu na conta, e mede o progresso da meta. |
| 03 | Gastos | `funcoes/gastos/gastos.js` | Separa gastos do dia (combustível, manutenção, comida…) das contas do mês (aluguel, seguro…) e calcula o lucro do dia. |
| 05 | Painel | `funcoes/painel/painel.js` | Guarda o histórico de dias fechados e mostra lucro líquido, metas por período e melhores dias da semana. |

Os dados ficam no `localStorage` do navegador: `meucorre.ganhos`, `meucorre.gastos` e `meucorre.historico`.

Para testar uma função no Node:

```bash
node -e "console.log(require('./funcoes/calculadora-meta/meta-diaria.js').calcular)"
```

## Como abrir

- `identidade/identidade.html` e `funcoes/calculadora-meta/calculadora-meta.html` abrem direto no navegador.
- As telas em `telas/` são arquivos do editor de design do Claude (`.dc.html`). Elas dependem do `support.js` do editor e não abrem sozinhas no navegador; servem como referência do layout e da lógica de cada tela até o app ganhar sua versão de produção.

## Cores e fontes

| Nome | Cor | Uso |
|------|-----|-----|
| Asfalto | `#1A1E26` | Fundo principal |
| Faixa | `#FFC629` | Destaques e botão principal |
| Neblina | `#EEF0F3` | Fundo claro, campos |
| Lucro | `#17A673` | Dinheiro que entrou |
| Gasto | `#E5484D` | Dinheiro que saiu |

Fontes (Google Fonts): Archivo Expanded nos títulos e valores, Figtree no texto, DM Mono nos números.
