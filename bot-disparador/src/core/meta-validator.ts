/**
 * Meta Shield Template Validator
 * Motor heurístico de validação de diretrizes do WhatsApp / Meta para prevenção ativa de banimento.
 */

export type MetaRiskLevel = 'seguro' | 'moderado' | 'alto_risco';

export interface MetaInfraction {
  id: string;
  severidade: 'critico' | 'alerta' | 'info';
  titulo: string;
  descricao: string;
  sugestao: string;
}

export interface MetaValidationResult {
  score: number;
  nivelRisco: MetaRiskLevel;
  combinacoesSpintax: number;
  infracoes: MetaInfraction[];
  aprovado: boolean;
  dicas: string[];
}

export interface MetaValidationOptions {
  isColdContact?: boolean;
}

/**
 * Calcula a quantidade teórica de variações únicas geradas pelo Spintax
 */
export function calculateSpintaxCombinations(template: string): number {
  if (!template) return 1;

  // Regex para blocos de spintax {opcao1|opcao2|...}
  const spintaxRegex = /\{([^{}]*?\|[^{}]*?)\}/g;
  let totalCombinations = 1;
  let hasSpintax = false;
  let match;

  while ((match = spintaxRegex.exec(template)) !== null) {
    hasSpintax = true;
    const options = match[1].split('|');
    const count = options.length;
    if (count > 0) {
      totalCombinations *= count;
    }
  }

  return hasSpintax ? totalCombinations : 1;
}

/**
 * Lista de gatilhos e palavras proibidas/penalizadas severamente pelos filtros de spam da Meta
 */
const SPAM_TRIGGERS: { regex: RegExp; label: string }[] = [
  { regex: /\bcompre\s+j[aá]\b/i, label: 'compre já' },
  { regex: /\bclique\s+aqui\b/i, label: 'clique aqui' },
  { regex: /\brenda\s+extra\b/i, label: 'renda extra' },
  { regex: /\bganhe\s+dinheiro\b/i, label: 'ganhe dinheiro' },
  { regex: /\boferta\s+imperd[ií]vel\b/i, label: 'oferta imperdível' },
  { regex: /\bpromo[cç][aã]o\s+imperd[ií]vel\b/i, label: 'promoção imperdível' },
  { regex: /\b100%\s+gr[aá]tis\b/i, label: '100% grátis' },
  { regex: /\btrabalhe\s+em\s+casa\b/i, label: 'trabalhe em casa' },
  { regex: /\boportunidade\s+[uú]nica\b/i, label: 'oportunidade única' },
  { regex: /\bgaranta\s+j[aá]\b/i, label: 'garanta já' },
  { regex: /\baproveite\s+agora\b/i, label: 'aproveite agora' },
  { regex: /\bvagas\s+limitadas\b/i, label: 'vagas limitadas' },
  { regex: /\b[uú]ltimas\s+vagas\b/i, label: 'últimas vagas' },
  { regex: /\bdinheiro\s+f[aá]cil\b/i, label: 'dinheiro fácil' }
];

/**
 * Valida o template de mensagem contra as diretrizes e filtros anti-spam da Meta
 */
export function validateMetaTemplate(
  template: string,
  options: MetaValidationOptions = {}
): MetaValidationResult {
  const { isColdContact = true } = options;
  const infracoes: MetaInfraction[] = [];
  const dicas: string[] = [];

  if (!template || !template.trim()) {
    return {
      score: 0,
      nivelRisco: 'alto_risco',
      combinacoesSpintax: 0,
      infracoes: [
        {
          id: 'template_vazio',
          severidade: 'critico',
          titulo: 'Template vazio',
          descricao: 'O template da mensagem não pode ser vazio.',
          sugestao: 'Digite uma mensagem ou escolha um dos modelos de aquecimento aprovados.'
        }
      ],
      aprovado: false,
      dicas: ['Escolha um dos modelos prontos de Fã para Fã na aba de Aquecimento.']
    };
  }

  let score = 100;

  // 1. Detecção de Gatilhos de Spam / Palavras Perigosas
  const detectedSpamWords: string[] = [];
  for (const trigger of SPAM_TRIGGERS) {
    if (trigger.regex.test(template)) {
      detectedSpamWords.push(trigger.label);
    }
  }

  if (detectedSpamWords.length > 0) {
    const penalty = Math.min(45, detectedSpamWords.length * 20);
    score -= penalty;
    infracoes.push({
      id: 'spam_words',
      severidade: 'critico',
      titulo: 'Gatilhos agressivos de vendas detectados',
      descricao: `O texto contém expressões de alta fricção que levam os clientes a clicarem em "Denunciar e Bloquear": ${detectedSpamWords.map(w => `"${w}"`).join(', ')}.`,
      sugestao: 'Substitua termos de venda agressiva por uma abordagem conversacional suave (ex: em vez de "Compre já", use "Queria saber sua opinião sobre...").'
    });
  }

  // 2. Links em Primeiro Contato (Cold Contact)
  const linkRegex = /(https?:\/\/[^\s]+|www\.[^\s]+|bit\.ly\/[^\s]+|tinyurl\.com\/[^\s]+|t\.me\/[^\s]+|chat\.whatsapp\.com\/[^\s]+)/gi;
  const containsLinks = linkRegex.test(template);

  if (containsLinks && isColdContact) {
    score -= 25;
    infracoes.push({
      id: 'cold_link',
      severidade: 'alerta',
      titulo: 'Link direto em mensagem fria',
      descricao: 'Enviar links diretamente para quem nunca conversou com o seu número é o principal motivo de bloqueio pelo algoritmo de spam da Meta.',
      sugestao: 'Remova o link da primeira mensagem. Faça uma abordagem leve perguntando se o cliente gostaria de receber o link do grupo; envie o link somente após ele responder.'
    });
  }

  // 3. Ausência de Personalização ({nome} ou {saudacao})
  const hasNome = /\{nome\}/i.test(template);
  const hasSaudacao = /\{saudacao\}/i.test(template);

  if (!hasNome && !hasSaudacao) {
    score -= 20;
    infracoes.push({
      id: 'sem_personalizacao',
      severidade: 'critico',
      titulo: 'Ausência de personalização',
      descricao: 'Mensagens sem o nome do contato ou saudação personalizada são classificadas como robóticas e genéricas pelos filtros da Meta.',
      sugestao: 'Inclua a tag {nome} no início da mensagem (ex: "Oi {nome}!") e opcionalmente {saudacao}.'
    });
  }

  // 4. Verificação de Spintax e Cálculo de Entropia
  const combinacoesSpintax = calculateSpintaxCombinations(template);

  if (combinacoesSpintax <= 1) {
    score -= 25;
    infracoes.push({
      id: 'sem_spintax',
      severidade: 'critico',
      titulo: 'Sem variação de Spintax',
      descricao: 'Todas as mensagens disparadas terão o texto idêntico. A Meta detecta rajadas repetitivas e bloqueia o número rapidamente.',
      sugestao: 'Utilize variações de Spintax como {Olá|Oi|Fala} e {tudo bem|como vai} para que cada mensagem enviada tenha estrutura única.'
    });
  } else if (combinacoesSpintax < 12) {
    score -= 10;
    infracoes.push({
      id: 'baixo_spintax',
      severidade: 'alerta',
      titulo: 'Baixa diversidade de Spintax',
      descricao: `O template gera apenas ${combinacoesSpintax} variações possíveis. Para listas com mais de 30 contatos, haverá repetições frequentes.`,
      sugestao: 'Adicione mais sinônimos em outras frases do texto para atingir pelo menos 20 a 50+ combinações únicas.'
    });
  }

  // 5. CAIXA ALTA EXCESSIVA (ALL CAPS)
  // Detecta palavras em maiúsculas com 4 ou mais letras (exceto TCG, Copag, MTG, VIP, etc.)
  const words = template.replace(/\{[^}]+\}/g, '').split(/\s+/);
  const uppercaseWords = words.filter(
    (w) => w.length >= 4 && w === w.toUpperCase() && !/^[0-9\W]+$/.test(w) && !['POKÉMON', 'POKEMON', 'COPAG'].includes(w)
  );

  if (uppercaseWords.length >= 2) {
    score -= 15;
    infracoes.push({
      id: 'all_caps',
      severidade: 'alerta',
      titulo: 'Excesso de palavras em CAIXA ALTA',
      descricao: `Palavras em maiúsculas (${uppercaseWords.slice(0, 4).join(', ')}) acionam gatilhos de spam nos filtros da Meta.`,
      sugestao: 'Escreva em caixa normal (apenas a primeira letra maiúscula) para manter o tom de uma conversa entre amigos.'
    });
  }

  // 6. Excesso de Emojis Consecutivos
  // Regex para sequências de 3 ou mais emojis/símbolos sem espaço
  const emojiCluster = /[\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]{3,}/u;
  if (emojiCluster.test(template)) {
    score -= 10;
    infracoes.push({
      id: 'excess_emojis',
      severidade: 'alerta',
      titulo: 'Excesso de emojis consecutivos',
      descricao: 'Sequências densas de emojis (ex: 🔥🔥🔥🚀🚀🚀) são um dos principais padrões detectados por IA anti-spam.',
      sugestao: 'Use no máximo 1 ou 2 emojis bem distribuídos e espaçados ao longo do texto.'
    });
  }

  // 7. Chamada para Conversa / Pergunta no Final (Estimular Resposta)
  const endsWithQuestion = /\?[\s\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]*$/u.test(template.trim()) || template.includes('?');
  if (!endsWithQuestion) {
    score -= 10;
    infracoes.push({
      id: 'sem_pergunta',
      severidade: 'info',
      titulo: 'Mensagem sem pergunta aberta',
      descricao: 'A mensagem não termina com uma pergunta amigável para estimular o cliente a responder.',
      sugestao: 'Finalize com uma pergunta leve (ex: "posso te mandar o link?", "tudo bem com você?"). Quando o cliente responde, o WhatsApp classifica sua conta como confiável.'
    });
  }

  // Normalização do score entre 0 e 100
  score = Math.max(0, Math.min(100, score));

  // Classificação do nível de risco
  let nivelRisco: MetaRiskLevel = 'seguro';
  if (score < 60) {
    nivelRisco = 'alto_risco';
  } else if (score < 80) {
    nivelRisco = 'moderado';
  }

  // Dicas práticas baseadas na análise
  if (nivelRisco === 'seguro') {
    dicas.push('✅ Excelente! Template com tom humano, alta diversidade de Spintax e sem gatilhos de ban.');
  } else {
    dicas.push('💡 Dica Pro: Mensagens que parecem conversas naturais entre amigos possuem taxa de banimento próxima de zero.');
    if (combinacoesSpintax >= 20) {
      dicas.push(`✨ Ótima variabilidade: ${combinacoesSpintax} mensagens diferentes serão geradas aleatoriamente.`);
    }
  }

  const aprovado = score >= 70 && !infracoes.some((i) => i.severidade === 'critico');

  return {
    score,
    nivelRisco,
    combinacoesSpintax,
    infracoes,
    aprovado,
    dicas
  };
}
