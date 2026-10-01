import type { RelatorioMensalExecutivo } from '../types/index.ts';

function formatarMoeda(val?: number): string {
  if (typeof val !== 'number' || isNaN(val)) return '0,00';
  return val.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export function imprimirRelatorioExecutivo(relatorio: RelatorioMensalExecutivo): void {
  const printWindow = window.open('', '_blank', 'width=900,height=800');
  if (!printWindow) {
    alert('Por favor, permita popups neste site para visualizar a folha de impressão do relatório.');
    return;
  }

  const kpis = relatorio.kpis;
  const diagnostico = relatorio.diagnostico;
  const dias = relatorio.detalhamentoDiario || [];

  const html = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <title>Relatório Executivo · ${relatorio.rotuloMes} · Promo Pokémon TCG</title>
  <style>
    @page {
      size: A4 portrait;
      margin: 12mm 10mm 15mm 10mm;
    }
    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
    }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      color: #0f172a;
      background: #ffffff;
      padding: 24px;
      font-size: 12px;
      line-height: 1.4;
    }
    .header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      border-bottom: 2px solid #0284c7;
      padding-bottom: 16px;
      margin-bottom: 20px;
    }
    .brand-title {
      font-size: 20px;
      font-weight: 800;
      color: #0f172a;
      letter-spacing: -0.5px;
    }
    .brand-sub {
      font-size: 11px;
      color: #0284c7;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    .brand-desc {
      font-size: 11px;
      color: #64748b;
      margin-top: 4px;
    }
    .meta-box {
      text-align: right;
    }
    .badge-status {
      display: inline-block;
      padding: 4px 10px;
      border-radius: 9999px;
      font-size: 10px;
      font-weight: 700;
      text-transform: uppercase;
      background: ${relatorio.statusCompetencia === 'em_andamento' ? '#e0f2fe' : '#dcfce7'};
      color: ${relatorio.statusCompetencia === 'em_andamento' ? '#0369a1' : '#15803d'};
      border: 1px solid ${relatorio.statusCompetencia === 'em_andamento' ? '#bae6fd' : '#bbf7d0'};
    }
    .meta-date {
      font-size: 10px;
      color: #64748b;
      margin-top: 4px;
    }
    .kpi-grid {
      display: grid;
      grid-template-columns: repeat(6, 1fr);
      gap: 10px;
      margin-bottom: 20px;
    }
    .kpi-card {
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 8px;
      padding: 10px;
    }
    .kpi-label {
      font-size: 9px;
      font-weight: 700;
      text-transform: uppercase;
      color: #64748b;
      letter-spacing: 0.5px;
    }
    .kpi-value {
      font-size: 15px;
      font-weight: 800;
      color: #0f172a;
      margin-top: 4px;
    }
    .kpi-sub {
      font-size: 9px;
      color: #64748b;
      margin-top: 2px;
    }
    .split-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 14px;
      margin-bottom: 20px;
    }
    .rule-box {
      background: #f8fafc;
      border: 1px solid #cbd5e1;
      border-radius: 8px;
      padding: 12px;
    }
    .rule-title {
      font-size: 11px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      color: #334155;
    }
    .rule-val {
      font-size: 18px;
      font-weight: 800;
      color: #0f172a;
      margin-top: 4px;
    }
    .rule-desc {
      font-size: 10px;
      color: #64748b;
      margin-top: 2px;
    }
    .diag-box {
      background: #f1f5f9;
      border-left: 4px solid #0284c7;
      border-radius: 4px;
      padding: 12px;
      margin-bottom: 20px;
    }
    .diag-title {
      font-size: 11px;
      font-weight: 700;
      color: #0f172a;
      display: flex;
      justify-content: space-between;
    }
    .diag-badge {
      font-size: 10px;
      font-weight: 700;
      color: #0284c7;
    }
    .diag-text {
      font-size: 11px;
      color: #334155;
      margin-top: 6px;
      line-height: 1.5;
    }
    .section-title {
      font-size: 12px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      color: #0f172a;
      margin-bottom: 8px;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      font-size: 10px;
      margin-bottom: 24px;
    }
    th {
      background: #f1f5f9;
      color: #334155;
      font-weight: 700;
      text-transform: uppercase;
      padding: 6px 8px;
      border-top: 1px solid #cbd5e1;
      border-bottom: 2px solid #cbd5e1;
      text-align: right;
    }
    th:first-child {
      text-align: left;
    }
    td {
      padding: 6px 8px;
      border-bottom: 1px solid #e2e8f0;
      text-align: right;
      color: #1e293b;
    }
    td:first-child {
      text-align: left;
      font-weight: 600;
    }
    tr:nth-child(even) td {
      background: #f8fafc;
    }
    .text-green { color: #16a34a; font-weight: 700; }
    .text-red { color: #dc2626; font-weight: 700; }
    .footer {
      border-top: 1px solid #e2e8f0;
      padding-top: 12px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      font-size: 10px;
      color: #64748b;
    }
    .no-print-bar {
      background: #0f172a;
      color: #ffffff;
      padding: 10px 16px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      border-radius: 8px;
      margin-bottom: 16px;
    }
    .btn-print {
      background: #0284c7;
      color: #ffffff;
      border: none;
      padding: 6px 14px;
      border-radius: 6px;
      font-weight: 700;
      font-size: 11px;
      cursor: pointer;
    }
    @media print {
      .no-print-bar {
        display: none !important;
      }
      body {
        padding: 0;
      }
    }
  </style>
</head>
<body>
  <div class="no-print-bar">
    <span>Visualização de Impressão Oficial A4 (Documento Limpo em Fundo Branco)</span>
    <button class="btn-print" onclick="window.print()">Imprimir / Salvar como PDF</button>
  </div>

  <div class="header">
    <div>
      <div class="brand-sub">Promo Pokémon TCG • Dashboard Pro</div>
      <h1 class="brand-title">Relatório Executivo de Auditoria & Performance</h1>
      <p class="brand-desc">Competência: <strong>${relatorio.rotuloMes}</strong> • Conciliação Integrada Meta Ads + Mercado Livre Afiliados</p>
    </div>
    <div class="meta-box">
      <span class="badge-status">${relatorio.statusCompetencia === 'em_andamento' ? 'Competência em Andamento' : 'Competência Fechada'}</span>
      <div class="meta-date">Emitido em: ${new Date().toLocaleDateString('pt-BR')} às ${new Date().toLocaleTimeString('pt-BR')}</div>
    </div>
  </div>

  <div class="kpi-grid">
    <div class="kpi-card">
      <div class="kpi-label">Faturamento Meli</div>
      <div class="kpi-value">R$ ${formatarMoeda(kpis.faturamentoMeli)}</div>
      <div class="kpi-sub">Total de Vendas</div>
    </div>
    <div class="kpi-card">
      <div class="kpi-label">Comissões Meli</div>
      <div class="kpi-value text-green">R$ ${formatarMoeda(kpis.comissoesConfirmadasMeli)}</div>
      <div class="kpi-sub">Receita Confirmada</div>
    </div>
    <div class="kpi-card">
      <div class="kpi-label">Gasto Meta Ads</div>
      <div class="kpi-value text-red">R$ ${formatarMoeda(kpis.investimentoMetaAds)}</div>
      <div class="kpi-sub">Tráfego Injetado</div>
    </div>
    <div class="kpi-card">
      <div class="kpi-label">Lucro Líquido Real</div>
      <div class="kpi-value" style="color: #0284c7;">R$ ${formatarMoeda(kpis.lucroOperacionalLiquido)}</div>
      <div class="kpi-sub">Margem: ${kpis.margemLucroPercentual.toFixed(1)}%</div>
    </div>
    <div class="kpi-card">
      <div class="kpi-label">Blended ROAS</div>
      <div class="kpi-value">${kpis.blendedRoas.toFixed(2)}x</div>
      <div class="kpi-sub">Retorno sobre Mídia</div>
    </div>
    <div class="kpi-card">
      <div class="kpi-label">Tráfego & Cliques</div>
      <div class="kpi-value">${kpis.cliquesMeta.toLocaleString('pt-BR')}</div>
      <div class="kpi-sub">CPC: R$ ${formatarMoeda(kpis.cpcMedio)}</div>
    </div>
  </div>

  <div class="split-grid">
    <div class="rule-box" style="border-left: 4px solid #7c3aed;">
      <div class="rule-title">Reinvestimento em Tráfego (70%)</div>
      <div class="rule-val">R$ ${formatarMoeda(kpis.reservaReinvestimento70)}</div>
      <div class="rule-desc">Capital protegido destinado para escala de anúncios e captação de leads.</div>
    </div>
    <div class="rule-box" style="border-left: 4px solid #16a34a;">
      <div class="rule-title">Lucro Livre para Retirada (30%)</div>
      <div class="rule-val text-green">R$ ${formatarMoeda(kpis.lucroDisponivel30)}</div>
      <div class="rule-desc">Lucro disponível para saque e distribuição de dividendos aos sócios.</div>
    </div>
  </div>

  <div class="diag-box">
    <div class="diag-title">
      <span>Parecer & Diagnóstico Gerencial da Operação</span>
      <span class="diag-badge">${diagnostico.statusRoas}</span>
    </div>
    <div class="diag-text">${diagnostico.recomendacaoRoas}</div>
  </div>

  <div class="section-title">
    <span>Histórico Diário Auditado (${dias.length} dias registrados)</span>
    <span style="font-size: 10px; font-weight: 600; color: #64748b;">Valores conciliados via API</span>
  </div>

  <table>
    <thead>
      <tr>
        <th>Data</th>
        <th>Gasto Meta</th>
        <th>Cliques</th>
        <th>Impressões</th>
        <th>Vendas Meli</th>
        <th>Comissão</th>
        <th>Saldo Líquido</th>
        <th>ROAS</th>
      </tr>
    </thead>
    <tbody>
      ${dias.map(d => `
        <tr>
          <td>${d.dataLancamento}</td>
          <td class="${d.gastoCampanhas > 0 ? 'text-red' : ''}">${d.gastoCampanhas > 0 ? 'R$ ' + formatarMoeda(d.gastoCampanhas) : '—'}</td>
          <td>${d.cliquesMeta > 0 ? d.cliquesMeta.toLocaleString('pt-BR') : '—'}</td>
          <td>${d.impressoesMeta > 0 ? d.impressoesMeta.toLocaleString('pt-BR') : '—'}</td>
          <td>${d.vendasBrutas > 0 ? 'R$ ' + formatarMoeda(d.vendasBrutas) : '—'}</td>
          <td class="text-green">${d.lucroBruto > 0 ? 'R$ ' + formatarMoeda(d.lucroBruto) : '—'}</td>
          <td class="${d.saldoDia >= 0 ? 'text-green' : 'text-red'}">${d.saldoDia >= 0 ? '+' : ''} R$ ${formatarMoeda(d.saldoDia)}</td>
          <td><strong>${d.blendedRoas > 0 ? d.blendedRoas.toFixed(2) + 'x' : '—'}</strong></td>
        </tr>
      `).join('')}
    </tbody>
  </table>

  <div class="footer">
    <span>Promo Pokémon TCG • Dashboard Pro de Automação & Tráfego</span>
    <span>Certificação Digital de Conciliação Contábil • Auditoria Automatizada</span>
  </div>

  <script>
    window.onload = function() {
      // Dispara diálogo nativo de impressão após carregamento completo
      setTimeout(function() { window.print(); }, 400);
    };
  </script>
</body>
</html>`;

  printWindow.document.open();
  printWindow.document.write(html);
  printWindow.document.close();
}
