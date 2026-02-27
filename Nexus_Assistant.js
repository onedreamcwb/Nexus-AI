/**
 * NEXUS AI - PERFORMANCE & STRATEGY
 * Foco Exclusivo: Alta Performance, Matriz de Eisenhower (Q1-Q4) e Inteligência Pessoal.
 */

const CONFIG = {
  TOKEN: "", 
  GEMINI_KEY: "", 
  ID_ADMIN: "8134192211", 
  TIMEZONE: "GMT-3",
  
  ID_PLANILHA_NEXUS: "18Wt_HYJruLarg8d5uLU0nS7aNNCuvSbAVguEIiC6wLQ", 

  PLANILHA: {
    MEMORIA: "Telegram",
    INSIGHTS: "Insights",
    PERFIL: "Perfil",
    TAREFAS: "Tarefas"
  },

  MENSAGENS: {
    ERRO_ACESSO: "<b>⛔ Acesso Negado.</b>",
    PROCESSANDO: "<i>Processando...</i> ⏳"
  }
};

// ============================================================================
// CORE: ROTEADOR DE INTELIGÊNCIA
// ============================================================================

function doPost(e) {
  try {
    const data = JSON.parse(e.postData.contents);
    if (!data.message || !data.message.text) return;

    const chatId = data.message.chat.id.toString();
    const text = data.message.text;

    if (chatId !== CONFIG.ID_ADMIN) {
      enviarMensagemTelegram(chatId, CONFIG.MENSAGENS.ERRO_ACESSO);
      return;
    }

    if (text === "/start") {
      enviarMensagemTelegram(chatId, "<b>NEXUS Online.</b> Focado em Performance e Estratégia (Q1-Q4). O que vamos conquistar hoje?");
      return;
    }

    const prompt = gerarPromptSistema() + "\n\nUsuário: " + text;
    const respostaIA = GEMINI(prompt);

    // ROTEADOR DE GATILHOS
    if (respostaIA.includes("[NOVA_TAREFA]")) {
      const p = respostaIA.split("|").map(item => item.trim());
      enviarMensagemTelegram(chatId, salvarTarefa(p[1], p[2], p[3]));

    } else if (respostaIA.includes("[NOVO_INSIGHT]")) {
      const p = respostaIA.split("|").map(item => item.trim());
      enviarMensagemTelegram(chatId, salvarInsight(p[1]));

    } else {
      enviarMensagemTelegram(chatId, respostaIA);
    }

  } catch (error) {
    console.error("Erro no doPost: " + error);
  }
}

// ============================================================================
// GESTÃO DE PERFORMANCE E TAREFAS (Q1-Q4)
// ============================================================================

function salvarTarefa(titulo, prazo, quadrante) {
  try {
    const ss = SpreadsheetApp.openById(CONFIG.ID_PLANILHA_NEXUS);
    const sheet = ss.getSheetByName(CONFIG.PLANILHA.TAREFAS);
    if (!sheet) return "❌ Aba de Tarefas não encontrada.";
    
    const infoQuadrante = {
      "Q1": "🔥 <b>Urgente & Importante</b>",
      "Q2": "🚀 <b>Estratégico / Desenvolvimento</b>",
      "Q3": "⚖️ <b>Urgente, Não Importante</b>",
      "Q4": "💤 <b>Lazer / Eliminar</b>"
    };

    const descQ = infoQuadrante[quadrante] || "Não Classificado";
    sheet.appendRow([new Date(), titulo, prazo, quadrante, "Pendente"]);
    
    return `✅ <b>Tarefa Estratégica Salva!</b>\n\n📌 <b>${titulo}</b>\n📅 Prazo: <u>${prazo}</u>\n⚡ Prioridade: ${descQ}`;
    
  } catch (e) { return "❌ Erro ao salvar tarefa: " + e.toString(); }
}

function salvarInsight(resumo) {
  try {
    const ss = SpreadsheetApp.openById(CONFIG.ID_PLANILHA_NEXUS);
    const sheet = ss.getSheetByName(CONFIG.PLANILHA.INSIGHTS);
    sheet.appendRow([new Date(), resumo]);
    return `💡 <b>Insight Registrado!</b>\n\n<blockquote>${resumo}</blockquote>`;
  } catch (e) { return "❌ Erro ao salvar insight: " + e.toString(); }
}

function buscarPerfil() {
  try {
    const ss = SpreadsheetApp.openById(CONFIG.ID_PLANILHA_NEXUS);
    const sheet = ss.getSheetByName(CONFIG.PLANILHA.PERFIL);
    return sheet.getRange("A2").getValue() || "Perfil focado em transição de carreira.";
  } catch (e) { return "Perfil Padrão."; }
}

// ============================================================================
// IA E FORMATAÇÃO HTML TELEGRAM
// ============================================================================

function gerarPromptSistema() {
  const perfil = buscarPerfil();
  return `Tu és o NEXUS, o Segundo Cérebro do Gustavo. Foco total em PERFORMANCE e ESTRATÉGIA.

  CONTEXTO: ${perfil}

  SISTEMA DE TAREFAS (Matriz de Eisenhower):
  - Q1: Urgente & Importante (Fazer agora).
  - Q2: Estratégico (Estudos de JavaScript, APIs, Planejamento). PRIORIDADE MÁXIMA.
  - Q3: Urgente, Não Importante (Interrupções).
  - Q4: Não Urgente/Importante (Distrações).

  GATILHOS OBRIGATÓRIOS:
  - [NOVA_TAREFA] | Título | Prazo | Quadrante (Q1, Q2, Q3 ou Q4)
  - [NOVO_INSIGHT] | Resumo

  ESTILO DE RESPOSTA E FORMATAÇÃO:
  - Use <b>negrito</b> para destaques importantes.
  - Use <i>itálico</i> para termos técnicos ou ênfase.
  - Use <u>sublinhado</u> para prazos.
  - Use <s>riscado</s> para comportamentos a evitar.
  - Use <code>código inline</code> para referências rápidas.
  - Use <pre>bloco de código</pre> para trechos de código JS ou logs.
  - Use <tg-spoiler>spoiler</tg-spoiler> para informações extras ou dicas bónus.
  - Use <blockquote>citação</blockquote> para conselhos de mentoria.
  - Use <a href="URL">links</a> para documentação ou cursos.

  REGRAS:
  - Seja motivador, inteligente e direto.
  - Foque 100% em produtividade e aprendizado técnico.`;
}

function GEMINI(prompt) {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${CONFIG.GEMINI_KEY}`;
  const options = {
    method: 'post', contentType: 'application/json',
    payload: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] }),
    muteHttpExceptions: true
  };
  try {
    const response = UrlFetchApp.fetch(url, options);
    const json = JSON.parse(response.getContentText());
    return json.candidates[0].content.parts[0].text;
  } catch (e) { return "ERRO IA: " + e.toString(); }
}

function enviarMensagemTelegram(chatId, text) {
  const url = `https://api.telegram.org/bot${CONFIG.TOKEN}/sendMessage`;
  UrlFetchApp.fetch(url, {
    method: 'post', contentType: 'application/json',
    payload: JSON.stringify({ chat_id: chatId, text: text, parse_mode: 'HTML' })
  });
}
