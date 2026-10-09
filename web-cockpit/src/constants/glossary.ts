export interface GlossaryItem {
  sigla: string;
  nome: string;
  categoria: 'Meta Ads' | 'Mercado Livre' | 'Arbitragem' | 'Comunidade';
  formula?: string;
  descricao: string;
  referenciaIdeal?: string;
}

export const GLOSSARY_TERMS: Record<string, GlossaryItem> = {
  CPL: {
    sigla: 'CPL',
    nome: 'Custo por Lead (Entrada no Grupo VIP)',
    categoria: 'Meta Ads',
    formula: 'Investimento Meta Ads ÷ Total de Cadastros/Entradas',
    descricao: 'Indica o valor médio em reais gasto em anúncios para colocar uma pessoa real dentro do seu grupo do WhatsApp.',
    referenciaIdeal: 'Meta de Operação: Manter abaixo de R$ 5,00 por membro.'
  },
  EPC: {
    sigla: 'EPC',
    nome: 'Earnings Per Click (Ganho por Clique)',
    categoria: 'Mercado Livre',
    formula: 'Comissões Faturadas Meli ÷ Total de Cliques nos Links',
    descricao: 'Mostra quanto dinheiro em comissão você ganha em média toda vez que alguém clica em um link de afiliado seu.',
    referenciaIdeal: 'Quanto maior, melhor. O EPC deve ser sempre maior que o CPC da Meta.'
  },
  'Net EPC': {
    sigla: 'Net EPC',
    nome: 'EPC Líquido (Margem de Arbitragem de Tráfego)',
    categoria: 'Arbitragem',
    formula: 'EPC do Mercado Livre - CPC do Meta Ads',
    descricao: 'É o indicador supremo da sua arbitragem: mede o lucro líquido imediato deixado por cada clique nos anúncios.',
    referenciaIdeal: 'Positivo (> R$ 0,00) = Cada clique pago se paga e dá lucro no ato.'
  },
  AOV: {
    sigla: 'AOV / Ticket Médio',
    nome: 'Ticket Médio de Venda (Average Order Value)',
    categoria: 'Mercado Livre',
    formula: 'Faturamento Bruto em Vendas ÷ Número de Pedidos',
    descricao: 'Valor médio que os clientes gastam nas compras de Pokémon TCG geradas através das suas indicações.',
    referenciaIdeal: 'Em TCG: R$ 80 a R$ 180 (combos de blisters, bundles e ETBs).'
  },
  'Ticket Médio': {
    sigla: 'Ticket Médio',
    nome: 'Ticket Médio de Venda (AOV)',
    categoria: 'Mercado Livre',
    formula: 'Faturamento Bruto em Vendas ÷ Número de Pedidos',
    descricao: 'Valor médio que os clientes gastam nas compras de Pokémon TCG geradas através das suas indicações.',
    referenciaIdeal: 'Em TCG: R$ 80 a R$ 180 (combos de blisters, bundles e ETBs).'
  },
  CPC: {
    sigla: 'CPC',
    nome: 'Custo por Clique',
    categoria: 'Meta Ads',
    formula: 'Investimento em Anúncios ÷ Cliques no Link',
    descricao: 'Quanto você paga ao Meta Ads a cada vez que uma pessoa clica no seu anúncio do Facebook/Instagram.',
    referenciaIdeal: 'TCG Promo: Manter entre R$ 0,40 e R$ 0,90.'
  },
  CTR: {
    sigla: 'CTR',
    nome: 'Click-Through Rate (Taxa de Cliques)',
    categoria: 'Meta Ads',
    formula: '(Cliques no Link ÷ Impressões do Anúncio) × 100',
    descricao: 'Percentual de pessoas que viram a arte/vídeo do anúncio e se interessaram o suficiente para clicar.',
    referenciaIdeal: 'Acima de 1,5% é saudável. Acima de 2,5% indica criativo de alta tração.'
  },
  ROAS: {
    sigla: 'ROAS',
    nome: 'Return on Ad Spend (Retorno sobre Investimento)',
    categoria: 'Arbitragem',
    formula: 'Faturamento Bruto de Vendas ÷ Investimento em Anúncios',
    descricao: 'Multiplicador financeiro: indica quantos reais de vendas brutas voltaram para cada R$ 1,00 colocado no Meta Ads.',
    referenciaIdeal: 'Acima de 4.0x a 6.0x em campanhas de afiliados e e-commerce.'
  },
  'Blended ROAS': {
    sigla: 'Blended ROAS',
    nome: 'ROAS Combinado (Vendas Totais ÷ Tráfego)',
    categoria: 'Arbitragem',
    formula: 'Vendas Totais (Orgânico + Tráfego) ÷ Investimento Meta Ads',
    descricao: 'Avalia a força total do ecossistema: mede o faturamento gerado pela comunidade completa em relação ao gasto com tráfego.',
    referenciaIdeal: 'Ideal acima de 8.0x.'
  },
  CVR: {
    sigla: 'CVR',
    nome: 'Conversion Rate (Taxa de Conversão)',
    categoria: 'Mercado Livre',
    formula: '(Pedidos Confirmados ÷ Cliques Totais) × 100',
    descricao: 'Porcentagem de pessoas que clicaram nas ofertas do grupo e realmente finalizaram a compra no Mercado Livre.',
    referenciaIdeal: 'Em promoções de TCG: entre 3,5% e 6,5% é uma ótima taxa.'
  },
  Frequencia: {
    sigla: 'Frequência',
    nome: 'Frequência de Exibição do Anúncio',
    categoria: 'Meta Ads',
    formula: 'Total de Impressões ÷ Alcance Único (Pessoas)',
    descricao: 'Quantas vezes, em média, a mesma pessoa já viu o seu anúncio no feed ou stories.',
    referenciaIdeal: 'Abaixo de 1.8x = Ótimo. Acima de 2.2x = Fadiga de criativo (necessário trocar o vídeo/imagem).'
  },
  'Fadiga de Criativo': {
    sigla: 'Fadiga',
    nome: 'Fadiga / Saturação de Criativo',
    categoria: 'Meta Ads',
    formula: 'Métrica baseada na Frequência acumulada e no CTR',
    descricao: 'Alerta quando o público da campanha já se acostumou com o anúncio e ele começa a perder eficácia, encarecendo o CPL.',
    referenciaIdeal: 'Status "Saudável": Frequência < 1.8x.'
  },
  'Cesta Média': {
    sigla: 'Cesta Média',
    nome: 'Multiplicador de Cesta (Basket Multiplier)',
    categoria: 'Mercado Livre',
    formula: 'Produtos Vendidos Estimados ÷ Total de Pedidos',
    descricao: 'Quantidade média de itens colocados no mesmo carrinho pelo comprador (ex: 1 Box + 2 Blisters).',
    referenciaIdeal: 'Acima de 1,2 itens por pedido impulsiona a comissão recebida.'
  },
  'Comissão Efetiva': {
    sigla: 'Comissão Efetiva',
    nome: 'Taxa Real de Comissão Recebida',
    categoria: 'Mercado Livre',
    formula: '(Comissões Faturadas ÷ Faturamento Bruto) × 100',
    descricao: 'Porcentagem real que sobrou como comissão líquida de afiliado em relação ao total vendido no Mercado Livre.',
    referenciaIdeal: 'Normalmente entre 8% e 13% na categoria de Brinquedos & TCG.'
  },
  'Burn Rate': {
    sigla: 'Burn Rate',
    nome: 'Consumo Diário do Orçamento de Anúncios',
    categoria: 'Meta Ads',
    formula: 'Gasto Real do Dia (Spend Today) da Conta de Anúncios',
    descricao: 'Velocidade com que o saldo pré-pago ou limite da conta de anúncios está sendo consumido por dia.',
    referenciaIdeal: 'Utilizado para calcular quantos dias o saldo atual ainda vai durar.'
  },
  'Lookalike 1%': {
    sigla: 'Lookalike 1%',
    nome: 'Público Semelhante (1% mais próximo)',
    categoria: 'Meta Ads',
    formula: 'Algoritmo de Inteligência Artificial da Meta',
    descricao: 'Público de alta afinidade gerado pela IA da Meta, encontrando as pessoas no Brasil mais parecidas com o perfil dos seus membros do WhatsApp.',
    referenciaIdeal: 'O segmento de 1% é o mais qualificado e com menor custo por lead.'
  },
  CAC: {
    sigla: 'CAC',
    nome: 'Custo de Aquisição de Cliente',
    categoria: 'Arbitragem',
    formula: 'Investimento Meta Ads ÷ Compradores Únicos Convertidos',
    descricao: 'Quanto custa trazer uma pessoa que efetivamente compra uma carta ou produto através dos seus links.',
    referenciaIdeal: 'Deve ser menor que a margem de lucro gerada pelas compras desse cliente.'
  }
};
