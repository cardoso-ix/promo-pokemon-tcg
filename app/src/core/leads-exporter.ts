export interface ParticipanteRaw {
  id: string;
  admin?: 'admin' | 'superadmin' | null;
  phoneNumber?: string;
}

export interface GrupoComParticipantes {
  id: string;
  name: string;
  participants: ParticipanteRaw[];
}

export interface ContatoLeadProcessado {
  phone: string;
  formattedPhone: string;
  country: string;
  groups: string[];
  isAdmin: boolean;
}

export interface StatsLeadsProcessados {
  totalGrupos: number;
  totalMembrosBrutos: number;
  totalUnicos: number;
  totalDuplicadosRemovidos: number;
  taxaAproveitamento: number;
}

export interface ResultadoProcessamentoLeads {
  stats: StatsLeadsProcessados;
  contatos: ContatoLeadProcessado[];
}

/**
 * Normaliza um identificador do WhatsApp para o formato internacional aceito pelo Meta Ads (ex: 5511999998888).
 * Suporta JIDs (@s.whatsapp.net), números brutos, sufixos de dispositivo (:0) e preenchimento de DDI 55 para o Brasil.
 */
export function normalizarTelefoneMeta(rawIdOrPhone: string): string | null {
  if (!rawIdOrPhone || typeof rawIdOrPhone !== 'string') {
    return null;
  }

  // Remove sufixos de domínio do WhatsApp se presentes
  let clean = rawIdOrPhone.split('@')[0];
  // Remove sufixo de dispositivo (ex: :0, :1)
  clean = clean.split(':')[0];
  // Mantém apenas dígitos numéricos
  clean = clean.replace(/\D/g, '');

  if (!clean || clean.length < 8) {
    return null;
  }

  // Se tem 10 ou 11 dígitos, é um número brasileiro sem DDI (DDD + 8 ou 9 dígitos)
  if (clean.length === 10 || clean.length === 11) {
    clean = '55' + clean;
  }

  // Validação: telefones válidos para o Meta costumam ter entre 10 e 15 dígitos
  if (clean.length < 10 || clean.length > 15) {
    return null;
  }

  return clean;
}

/**
 * Formata um telefone com padrão visual amigável (+55 (11) 99999-8888).
 */
export function formatarTelefoneExibicao(phone: string): string {
  const digits = phone.replace(/\D/g, '');
  if (digits.startsWith('55')) {
    const semDdi = digits.slice(2);
    if (semDdi.length === 11) {
      // DDD + 9 dígitos
      const ddd = semDdi.slice(0, 2);
      const parte1 = semDdi.slice(2, 7);
      const parte2 = semDdi.slice(7);
      return `+55 (${ddd}) ${parte1}-${parte2}`;
    } else if (semDdi.length === 10) {
      // DDD + 8 dígitos
      const ddd = semDdi.slice(0, 2);
      const parte1 = semDdi.slice(2, 6);
      const parte2 = semDdi.slice(6);
      return `+55 (${ddd}) ${parte1}-${parte2}`;
    }
  }
  return `+${digits}`;
}

/**
 * Processa a lista de grupos, normaliza, remove duplicidades entre grupos e calcula métricas.
 */
export function processarLeadsGrupos(
  grupos: GrupoComParticipantes[],
  botPhone?: string | null
): ResultadoProcessamentoLeads {
  const botNormalized = botPhone ? normalizarTelefoneMeta(botPhone) : null;
  const mapaContatos = new Map<string, ContatoLeadProcessado>();
  let totalMembrosBrutos = 0;

  for (const grupo of grupos) {
    const nomeGrupo = (grupo.name || 'Grupo Sem Nome').trim();
    const participantes = Array.isArray(grupo.participants) ? grupo.participants : [];

    for (const part of participantes) {
      totalMembrosBrutos++;
      const rawTarget = part.phoneNumber || part.id;
      const phoneNorm = normalizarTelefoneMeta(rawTarget);

      if (!phoneNorm) {
        continue;
      }

      // Ignora o próprio bot se identificado
      if (botNormalized && phoneNorm === botNormalized) {
        continue;
      }

      const ehAdmin = part.admin === 'admin' || part.admin === 'superadmin';

      if (!mapaContatos.has(phoneNorm)) {
        mapaContatos.set(phoneNorm, {
          phone: phoneNorm,
          formattedPhone: formatarTelefoneExibicao(phoneNorm),
          country: phoneNorm.startsWith('55') ? 'BR' : 'BR',
          groups: [nomeGrupo],
          isAdmin: ehAdmin
        });
      } else {
        const existente = mapaContatos.get(phoneNorm)!;
        if (!existente.groups.includes(nomeGrupo)) {
          existente.groups.push(nomeGrupo);
        }
        if (ehAdmin) {
          existente.isAdmin = true;
        }
      }
    }
  }

  const contatos = Array.from(mapaContatos.values());
  const totalUnicos = contatos.length;
  const totalDuplicadosRemovidos = Math.max(0, totalMembrosBrutos - totalUnicos);
  const taxaAproveitamento = totalMembrosBrutos > 0 ? (totalUnicos / totalMembrosBrutos) * 100 : 0;

  return {
    stats: {
      totalGrupos: grupos.length,
      totalMembrosBrutos,
      totalUnicos,
      totalDuplicadosRemovidos,
      taxaAproveitamento: Number(taxaAproveitamento.toFixed(1))
    },
    contatos
  };
}

/**
 * Gera CSV exatamente no padrão esperado pelo Meta Ads para Lista de Clientes (Customer List).
 * Cabeçalhos: phone,country
 */
export function gerarCsvMetaAds(contatos: ContatoLeadProcessado[]): string {
  const header = 'phone,country';
  const rows = contatos.map(c => `${c.phone},${c.country}`);
  return [header, ...rows].join('\n');
}

/**
 * Gera CSV enriquecido com BOM UTF-8 e separador ';' para abertura nativa no Microsoft Excel sem corrupção de acentuação.
 * Cabeçalhos: Telefone_Meta;Telefone_Formatado;Pais;Qtd_Grupos;Grupos;Admin
 */
export function gerarCsvExcelCompleto(contatos: ContatoLeadProcessado[]): string {
  const bom = '\uFEFF';
  const header = 'Telefone_Meta;Telefone_Formatado;Pais;Qtd_Grupos;Grupos;Admin';
  const rows = contatos.map(c => {
    const gruposEscaped = `"${c.groups.join(', ').replace(/"/g, '""')}"`;
    const adminTexto = c.isAdmin ? 'Sim' : 'Não';
    return `${c.phone};${c.formattedPhone};${c.country};${c.groups.length};${gruposEscaped};${adminTexto}`;
  });

  return bom + [header, ...rows].join('\r\n');
}
