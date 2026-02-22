/**
 * ============================================================================
 * 🤖 PROJETO NEXUS AI - V5.3 (Eisenhower Matrix - Financial & Vision Edition)
 * ============================================================================
 */

const CONFIG = {
  TOKEN: "SEU_TELEGRAM_TOKEN_AQUI", 
  GEMINI_KEY: "SUA_API_KEY_AQUI", 
  // ... resto do código
  ID_ADMIN: "8134192211", 
  TIMEZONE: "GMT-3",
  PLANILHA: {
    MEMORIA: "Telegram",
    INSIGHTS: "Insights",
    PERFIL: "Perfil",
    FINANCAS: "Financas"
  },
  LISTAS_TASKS: {
    Q1: "Importante e Urgente",
    Q2: "Importante Mas Não Urgente",
    Q3: "Urgente Mas Não Importante",
    Q4: "Não Importante e Não Urgente"
  },
  MENSAGENS: {
    ERRO_ACESSO: "⛔ Acesso Negado.",
    PROCESSANDO: "<i>Processando...</i> ⏳",
    SALVO: "✅ Salvo!"
  }
};
// ============================================================================
// 1. CÉREBRO (Prompt do Sistema - ATUALIZADO COM GATILHOS)
// ============================================================================

function gerarPromptSistema(historico, agenda, tarefas, perfil) {
  const dataHoje = new Date().toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' });
  
  return `
  ATUAR COMO: Nexus, Mentor de Performance e Assistente Executivo.
  PERFIL DO USUÁRIO: ${perfil}
  
  CONTEXTO TEMPORAL:
  - Data/Hora Atual: ${dataHoje}
  
  CONTEXTO DE DADOS:
  - Agenda: ${agenda}
  - Tarefas: ${tarefas}
  - Histórico Recente: ${historico}
  
  DIRETRIZES:
  1. Seja direto, minimalista e profissional.
  2. Se for apenas conversa, responda normalmente.
  
  ⚠️ SISTEMA DE GATILHOS (CRÍTICO) ⚠️
  Se o usuário pedir para realizar alguma das ações abaixo, você está PROIBIDO de responder com texto normal. Você DEVE responder APENAS com a tag exata abaixo:

  1. REGISTRAR FINANÇA (Gasto/Receita):
  Responda APENAS: [CRIAR_FINANCA] | DATA (yyyy-MM-dd) | DESCRIÇÃO | CATEGORIA | VALOR

  2. MARCAR EVENTO NA AGENDA:
  Responda APENAS: [AGENDAR] | Título do Evento | Data e Hora (yyyy-MM-ddTHH:mm:00)
  (Exemplo: [AGENDAR] | Reunião com Vitor Dutra | 2026-02-24T20:00:00)

  3. CRIAR TAREFA RÁPIDA:
  Responda APENAS: [CRIAR_TAREFA] | Título da Tarefa
  `;
}

// ============================================================================
// 2. CONTROLADOR (Cérebro Central - Versão v4.9 Multimodal)
// ============================================================================

function doPost(e) {
  try {
    const data = JSON.parse(e.postData.contents);

    if (data.callback_query) {
      processarBotao(data);
      return;
    }

    const chatId = data.message.chat.id;
    if (chatId.toString() !== CONFIG.ID_ADMIN.toString()) return;

    let textoUsuario = "";
    
    // 📸 TRATAMENTO DE FOTO
    if (data.message.photo) {
      enviarMensagemTelegram(chatId, "📸 <i>Analisando imagem...</i>");
      const fotoId = data.message.photo[data.message.photo.length - 1].file_id;
      const resultado = processarImagemMultimodal(fotoId);
      enviarMensagemTelegram(chatId, resultado);
      return; 
    } 
    // 🎙️ TRATAMENTO DE ÁUDIO
    else if (data.message.voice) {
      enviarMensagemTelegram(chatId, "🎙️ <i>Ouvindo áudio...</i>");
      const audioBase64 = baixarArquivoTelegram(data.message.voice.file_id); // Usando a nova função!
      textoUsuario = transcreverAudioGemini(audioBase64);
      enviarMensagemTelegram(chatId, `🗣️ "${textoUsuario}"`);
    } 
    else if (data.message.text) {
      textoUsuario = data.message.text;
    } else {
      return; 
    }

    // --- FLUXO DE INTELIGÊNCIA ---
    const cache = CacheService.getScriptCache();
    const estadoAtual = cache.get("estado_" + chatId);
    if (estadoAtual) {
      enviarMensagemTelegram(chatId, criarTarefaEmListaEspecifica(textoUsuario, estadoAtual));
      cache.remove("estado_" + chatId); 
      return; 
    }

    if (textoUsuario === "/limpar") { limparMemoria(chatId, true); return; }
    if (textoUsuario === "/tarefa") { enviarBotoesMatrix(chatId); return; }
    if (textoUsuario === "/financeiro") { enviarMensagemTelegram(chatId, gerarResumoFinanceiro()); return; }

    enviarMensagemTelegram(chatId, CONFIG.MENSAGENS.PROCESSANDO);

    const historico = obterHistorico(chatId);
    const agenda = listarEventosProximos();
    const tarefas = listarTarefasPendentes();
    const perfil = lerPerfilUsuario();
    
    const prompt = gerarPromptSistema(historico, agenda, tarefas, perfil);
    const respostaIA = GEMINI(prompt + "\nUsuário: " + textoUsuario);

    // Roteamento de Ações
    if (respostaIA.includes("[AGENDAR]")) {
      const p = respostaIA.split("|");
      enviarMensagemTelegram(chatId, criarEventoAgenda(p[1].trim(), p[2].trim()));
    } else if (respostaIA.includes("[CRIAR_TAREFA]")) {
      const p = respostaIA.split("|");
      enviarMensagemTelegram(chatId, criarTarefaGoogle(p[1].trim()));
    } else if (respostaIA.includes("[CRIAR_FINANCA]")) {
      const p = respostaIA.split("|");
      enviarMensagemTelegram(chatId, salvarFinancaManual(p[1].trim(), p[2].trim(), p[3].trim(), p[4].trim()));
    } else {
      salvarMensagemPlanilha(chatId, textoUsuario, respostaIA);
      enviarMensagemTelegram(chatId, respostaIA);
    }

  } catch (err) {
    enviarMensagemTelegram(CONFIG.ID_ADMIN, `☠️ Erro: ${err.toString()}`);
  }
}

// --- Processamento dos Botões da Matriz ---
function processarBotao(data) {
  const acao = data.callback_query.data;
  const chatId = data.callback_query.message.chat.id;
  
  // Se for botão de salvar/limpar normal
  if (acao === "acao_limpar") {
    limparMemoria(chatId, true);
    return;
  }
  if (acao === "acao_salvar") {
    salvarInsight(data.callback_query.message.text);
    enviarMensagemTelegram(chatId, "✅ Salvo!");
    return;
  }

  // Se for botão da MATRIZ (Q1, Q2, Q3, Q4)
  if (acao.startsWith("task_")) {
    const listaCodigo = acao.replace("task_", ""); // Ex: Q1
    
    // 1. Salva no Cache que estamos esperando uma tarefa para esta lista
    CacheService.getScriptCache().put("estado_" + chatId, listaCodigo, 300); // 300s = 5 minutos
    
    // 2. Pede ao usuário para digitar
    let nomeLista = "Lista Selecionada";
    if (listaCodigo === "Q1") nomeLista = "🟢 Importante e Urgente";
    if (listaCodigo === "Q2") nomeLista = "🟠 Importante mas N/Urgente";
    if (listaCodigo === "Q3") nomeLista = "🔵 Urgente mas N/Importante";
    if (listaCodigo === "Q4") nomeLista = "🔴 Não Importante";

    enviarMensagemTelegram(chatId, `📝 Digite agora a tarefa para:\n<b>${nomeLista}</b>`);
  }
}

// ============================================================================
// 3. INTERFACE (Botões e Menus)
// ============================================================================

function enviarBotoesMatrix(chatId) {
  const teclado = {
    inline_keyboard: [
      [
        { text: "🟢 Imp & Urg", callback_data: "task_Q1" }
      ],
      [
        { text: "🟠 Imp. mas N/Urg", callback_data: "task_Q2" },
        { text: "🔵 Urg. mas N/Imp", callback_data: "task_Q3" }
      ],
      [
        { text: "🔴 N/Imp & N/Urg", callback_data: "task_Q4" }
      ]
    ]
  };
  enviarMensagemTelegram(chatId, "🧠 <b>Matriz de Eisenhower</b>\nSelecione onde essa tarefa se encaixa:", teclado);
}

// ============================================================================
// 4.INTEGRAÇÃO GOOGLE TASKS (Versão Master - Título + Detalhes)
// ============================================================================

function criarTarefaEmListaEspecifica(textoUsuario, codigoLista) {
  try {
    // 1. Identifica a lista correta
    const termoBusca = CONFIG.LISTAS_TASKS[codigoLista]; 
    if (!termoBusca) return "❌ Configuração de lista não encontrada.";

    const listas = Tasks.Tasklists.list();
    if (!listas.items) return "❌ Nenhuma lista encontrada no Google Tasks.";

    let listaAlvo = null;
    for (let i = 0; i < listas.items.length; i++) {
      if (listas.items[i].title.includes(termoBusca)) {
        listaAlvo = listas.items[i];
        break;
      }
    }
    if (!listaAlvo) return `❌ Lista "${termoBusca}" não encontrada.`;

    // 2. PARSER INTELIGENTE (Título vs Detalhes)
    const linhas = textoUsuario.split("\n");
    const tarefasParaCriar = [];
    let tarefaAtual = null;

    // Verifica se o usuário usou marcadores (-, *, 1.)
    const usaMarcadores = linhas.some(l => l.match(/^([-*•]|\d+[\).])\s+/));

    if (usaMarcadores) {
      // MODO ESTRUTURADO (Com detalhes)
      for (let linha of linhas) {
        const linhaLimpa = linha.trim();
        if (!linhaLimpa) continue;

        // É um Título? (Começa com -, *, • ou 1.)
        if (linhaLimpa.match(/^([-*•]|\d+[\).])\s+/)) {
          // Se já tinha uma sendo montada, salva ela
          if (tarefaAtual) tarefasParaCriar.push(tarefaAtual);
          
          // Começa a nova
          tarefaAtual = {
            title: linhaLimpa.replace(/^([-*•]|\d+[\).])\s+/, "").replace(/['"]/g, "").trim(), // Limpa o marcador
            notes: ""
          };
        } else {
          // É Detalhe (não tem marcador)
          if (tarefaAtual) {
            tarefaAtual.notes += (tarefaAtual.notes ? "\n" : "") + linhaLimpa;
          } else {
            // Caso a primeira linha não tenha marcador, trata como tarefa simples
            tarefaAtual = { title: linhaLimpa, notes: "" };
          }
        }
      }
      // Empurra a última tarefa processada
      if (tarefaAtual) tarefasParaCriar.push(tarefaAtual);

    } else {
      // MODO SIMPLES (Lista Rápida - Batch)
      // Se não usar marcadores, cada linha é um título (sem detalhes)
      for (let linha of linhas) {
        if (linha.trim()) tarefasParaCriar.push({ title: linha.trim(), notes: "" });
      }
    }

    // 3. EXECUÇÃO (Cria no Google Tasks)
    let criadas = 0;
    for (let t of tarefasParaCriar) {
      // A mágica acontece aqui: inserimos title E notes
      Tasks.Tasks.insert({ title: t.title, notes: t.notes }, listaAlvo.id);
      criadas++;
    }

    return `✅ <b>${criadas} Tarefas</b> com detalhes adicionadas em <b>${listaAlvo.title}</b>!`;

  } catch (e) {
    return "❌ Erro ao criar tarefas: " + e.toString();
  }
}

function listarTarefasPendentes() {
  try {
    // Tenta pegar a lista "Importante e Urgente" (Q1) como prioridade
    const listas = Tasks.Tasklists.list();
    let listaId = listas.items[0].id; // Default
    
    // Tenta achar a Q1 pelo nome
    if (listas.items) {
      const q1 = listas.items.find(l => l.title.includes(CONFIG.LISTAS_TASKS.Q1));
      if (q1) listaId = q1.id;
    }

    const tarefas = Tasks.Tasks.list(listaId, { showCompleted: false, maxResults: 10 });
    
    if (!tarefas.items) return "Nada pendente na lista prioritária.";
    
    return tarefas.items.map(t => `☐ ${t.title}`).join("\n");
  } catch (e) {
    return "Erro Tasks.";
  }
}

function criarTarefaGoogle(titulo) {
  // Cria na lista padrão (primeira que achar)
  try {
    const listaId = Tasks.Tasklists.list().items[0].id;
    Tasks.Tasks.insert({ title: titulo }, listaId);
    return `📝 Tarefa criada (Lista Padrão): ${titulo}`;
  } catch (e) {
    return "Erro Tasks.";
  }
}

// ============================================================================
// 5. FUNÇÕES AUXILIARES (IA, Audio, etc)
// ============================================================================

function GEMINI(prompt) {
  const apiKey = PropertiesService.getScriptProperties().getProperty('GEMINI_KEY');
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;
  
  const options = {
    method: 'post',
    contentType: 'application/json',
    payload: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] }),
    muteHttpExceptions: true
  };

  try {
    let response = UrlFetchApp.fetch(url, options);
    // Retry logic simples
    if (response.getResponseCode() !== 200) {
      Utilities.sleep(2000);
      response = UrlFetchApp.fetch(url, options);
    }
    return JSON.parse(response.getContentText()).candidates[0].content.parts[0].text;
  } catch (e) {
    return "Erro IA";
  }
}

function baixarAudioTelegram(fileId) {
  const token = PropertiesService.getScriptProperties().getProperty('TELEGRAM_TOKEN');
  const resFile = UrlFetchApp.fetch(`https://api.telegram.org/bot${token}/getFile?file_id=${fileId}`);
  const filePath = JSON.parse(resFile.getContentText()).result.file_path;
  const resDownload = UrlFetchApp.fetch(`https://api.telegram.org/file/bot${token}/${filePath}`);
  return Utilities.base64Encode(resDownload.getBlob().getBytes());
}

function transcreverAudioGemini(base64Audio) {
  const apiKey = PropertiesService.getScriptProperties().getProperty('GEMINI_KEY');
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;
  
  const payload = {
    contents: [{
      parts: [
        { text: "Transcreva:" },
        { inlineData: { mimeType: "audio/ogg", data: base64Audio } }
      ]
    }]
  };
  
  const response = UrlFetchApp.fetch(url, {
    method: 'post',
    contentType: 'application/json',
    payload: JSON.stringify(payload),
    muteHttpExceptions: true
  });
  
  return JSON.parse(response.getContentText()).candidates[0].content.parts[0].text.trim();
}

function lerPerfilUsuario() {
  try {
    const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(CONFIG.PLANILHA.PERFIL);
    if (!sheet) return "Sem perfil.";
    
    const dados = sheet.getDataRange().getValues();
    return dados.slice(1).map(linha => `• ${linha[0]}: ${linha[1]}`).join("\n");
  } catch (e) {
    return "Erro Perfil";
  }
}

function listarEventosProximos() {
  const hoje = new Date();
  const amanha = new Date(hoje);
  amanha.setDate(hoje.getDate() + 1);
  
  const todosCalendarios = CalendarApp.getAllCalendars();
  let eventos = [];
  
  todosCalendarios.forEach(cal => {
    if (!cal.getName().match(/holiday|feriado/i)) {
      eventos = eventos.concat(cal.getEventsForDay(hoje), cal.getEventsForDay(amanha));
    }
  });
  
  if (eventos.length === 0) return "Sem agenda.";
  
  return eventos
    .sort((a, b) => a.getStartTime() - b.getStartTime())
    .map(ev => `- ${ev.getTitle()} (${Utilities.formatDate(ev.getStartTime(), CONFIG.TIMEZONE, "HH:mm")})`)
    .join("\n");
}

function criarEventoAgenda(titulo, dataISO) {
  try {
    const agenda = CalendarApp.getDefaultCalendar();
    const inicio = new Date(dataISO);
    const fim = new Date(inicio.getTime() + 3600000); // 1 hora
    agenda.createEvent(titulo, inicio, fim);
    return `✅ Agendado: ${titulo}`;
  } catch (e) {
    return "Erro Agenda";
  }
}

function buscarAgendaEspecifca(dataString) {
  const partes = dataString.split("-");
  const dataAlvo = new Date(partes[0], partes[1] - 1, partes[2]);
  
  const todosCalendarios = CalendarApp.getAllCalendars();
  let eventos = [];
  
  todosCalendarios.forEach(cal => {
    if (!cal.getName().match(/holiday|feriado/i)) {
      eventos = eventos.concat(cal.getEventsForDay(dataAlvo));
    }
  });
  
  if (eventos.length === 0) return "Livre.";
  
  return eventos
    .map(ev => `${ev.getTitle()} (${Utilities.formatDate(ev.getStartTime(), CONFIG.TIMEZONE, "HH:mm")})`)
    .join("\n");
}

function buscarEmailsNaoLidos() {
  try {
    const threads = GmailApp.getInboxThreads(0, 5);
    if (threads.length === 0) return "Sem e-mails novos.";
    
    return threads.map(t => {
      const msg = t.getMessages()[0];
      return `📩 ${msg.getSubject()}`;
    }).join("\n");
  } catch (e) {
    return "Erro Gmail";
  }
}

function obterDataFormatada() {
  return Utilities.formatDate(new Date(), CONFIG.TIMEZONE, "yyyy-MM-dd HH:mm");
}

function salvarMensagemPlanilha(chatId, usuario, bot) {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(CONFIG.PLANILHA.MEMORIA);
  if (sheet) {
    sheet.appendRow([obterDataFormatada(), chatId, usuario, bot]);
  }
}

function salvarInsight(texto) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName(CONFIG.PLANILHA.INSIGHTS);
  if (!sheet) {
    sheet = ss.insertSheet(CONFIG.PLANILHA.INSIGHTS);
    sheet.appendRow(['Data', 'Insight']);
  }
  sheet.appendRow([obterDataFormatada(), texto]);
}

function obterHistorico(chatId) {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(CONFIG.PLANILHA.MEMORIA);
  if (!sheet || sheet.getLastRow() <= 2) return "";
  
  const ultimasLinhas = sheet.getRange(Math.max(2, sheet.getLastRow() - 4), 3, 5, 2).getValues();
  return ultimasLinhas.map(r => `U:${r[0]}\nB:${r[1]}`).join("\n");
}

function limparMemoria(chatId, avisar = false) {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(CONFIG.PLANILHA.MEMORIA);
  if (sheet && sheet.getLastRow() > 1) {
    sheet.deleteRows(2, sheet.getLastRow() - 1);
  }
  if (avisar) enviarMensagemTelegram(chatId, "🧹 Limpo.");
}

function enviarMensagemTelegram(chatId, texto, teclado = null) {
  const token = PropertiesService.getScriptProperties().getProperty('TELEGRAM_TOKEN');
  const payload = {
    chat_id: chatId,
    text: texto,
    parse_mode: "HTML"
  };
  
  if (teclado) payload.reply_markup = teclado;
  
  UrlFetchApp.fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: 'post',
    contentType: 'application/json',
    payload: JSON.stringify(payload)
  });
}

// ============================================================================
// 6. TRIGGER (Relatório Matinal - v2.4 Anti-Erro HTML)
// ============================================================================

function enviarRelatorioMatinal() {
  if (!CONFIG.ID_ADMIN) return;
  
  // 1. Coleta Inteligência
  const agenda = listarEventosProximos();
  const tarefas = listarTarefasPendentes();
  const emails = buscarEmailsNaoLidos();
  const perfil = lerPerfilUsuario();
  
  // 2. O Prompt Blindado
  const prompt = `
  ATUAR COMO: Nexus, Mentor de Performance.
  
  DADOS:
  [PERFIL]: ${perfil}
  [AGENDA]: ${agenda}
  [TAREFAS]: ${tarefas}
  [EMAILS]: ${emails}
  
  MISSÃO: Gerar o Briefing Matinal.
  
  ESTRUTURA:
  1. 🦁 <b>MINDSET</b>: Uma mensagem de Coach para o dia de impacto baseada no perfil.
  2. 🗓️ <b>AGENDA</b>: Liste horários e eventos.
  3. 🔥 <b>PRIORIDADES</b>: Liste as tarefas urgentes.
  4. 📧 <b>EMAILS</b>: Top 3 assuntos urgentes.
  
  ⚠️ REGRAS DE SEGURANÇA (CRÍTICO):
  - O Telegram NÃO aceita tags HTML de lista.
  - PROIBIDO usar: <ul>, <ol>, <li>.
  - Use APENAS: <b> (negrito) e <i> (itálico).
  - Para listar itens, use hífens (-) ou emojis (◻️) manualmente no início da linha.
  - Não use Markdown (**).
  `;
  
  // 3. Envia
  const briefing = GEMINI(prompt);
  enviarMensagemTelegram(CONFIG.ID_ADMIN, briefing);
}
// ============================================================================
// 7. MÓDULO SECRETÁRIO (Auto-Responder Rascunhos)
// ============================================================================

function autoResponderEmails() {
  if (!CONFIG.ID_ADMIN) return;

  // 1. CONFIGURAÇÃO DE ALVOS (Quem o Nexus deve responder?)
  const ALVOS = {
    // Coloque aqui os e-mails ou palavras-chave que ativam o Nexus
    REMETENTES_VIP: ["gustavo.luanaraujo2022@gmail.com", "acesso.atendimento22@gmail.com"], 
    ASSUNTOS_CHAVE: ["Orçamento", "Dúvida", "Agendar Reunião", "Parceria"]
  };

  // 2. Busca e-mails não lidos na caixa de entrada
  const threads = GmailApp.search("is:unread in:inbox newer_than:1d");
  let respondidos = 0;

  for (let thread of threads) {
    const msg = thread.getMessages()[0]; // Pega a última mensagem
    const assunto = msg.getSubject();
    const remetente = msg.getFrom();
    const corpo = msg.getPlainBody();

    // 3. Verifica se deve responder (Filtro)
    let deveResponder = false;
    
    // Checa remetente
    if (ALVOS.REMETENTES_VIP.some(email => remetente.includes(email))) deveResponder = true;
    // Checa assunto
    if (ALVOS.ASSUNTOS_CHAVE.some(keyword => assunto.toLowerCase().includes(keyword.toLowerCase()))) deveResponder = true;

    if (deveResponder) {
      // 4. Gera a resposta com IA
      const prompt = `
      Você é o Nexus, assistente pessoal do Gustavo.
      CONTEXTO: Recebi um e-mail de: ${remetente}
      ASSUNTO: ${assunto}
      MENSAGEM: "${corpo.substring(0, 500)}..." (resumo)
      
      TAREFA: Escreva uma resposta profissional, direta e educada.
      - Se for pedido de reunião, sugira verificar a agenda.
      - Se for orçamento, diga que o Gustavo vai analisar em breve.
      - Não invente dados. Deixe espaços [ASSIM] para o Gustavo preencher se precisar.
      - Assine como: "Nexus (Assistente Virtual do Gustavo)"
      `;

      const respostaIA = GEMINI(prompt);

      // 5. CRIA O RASCUNHO (Não envia!)
      thread.createDraftReply(respostaIA);
      
      // Opcional: Marca com uma estrela para você ver que o Nexus agiu
      msg.star(); 
      respondidos++;
      console.log(`Rascunho criado para: ${assunto}`);
    }
  }
  
  if (respondidos > 0) {
    enviarMensagemTelegram(CONFIG.ID_ADMIN, `✍️ <b>Nexus Secretário:</b> Criei rascunhos de resposta para ${respondidos} e-mails. Verifique seu Gmail!`);
  }
}
// ============================================================================
// 8. MÓDULO FINANCEIRO (Visão Computacional)
// ============================================================================

function processarImagemFinanceira(fileId) {
  try {
    // 1. Baixa a imagem do Telegram
    const token = PropertiesService.getScriptProperties().getProperty('TELEGRAM_TOKEN');
    const resFile = UrlFetchApp.fetch(`https://api.telegram.org/bot${token}/getFile?file_id=${fileId}`);
    const filePath = JSON.parse(resFile.getContentText()).result.file_path;
    const blob = UrlFetchApp.fetch(`https://api.telegram.org/file/bot${token}/${filePath}`).getBlob();
    const base64Image = Utilities.base64Encode(blob.getBytes());

    // 2. Manda pro Gemini Analisar
    const prompt = `
    Analise esta imagem (nota fiscal, recibo ou comprovante).
    Extraia os dados para uma planilha financeira.
    Responda EXATAMENTE neste formato (separado por pipes |):
    DATA (yyyy-MM-dd) | LOCAL/DESCRIÇÃO | CATEGORIA (Alimentação, Transporte, Lazer, Contas, Outros) | VALOR NUMERICO (Use ponto para decimais, ex: 10.50)
    
    Exemplo: 2026-02-16 | Restaurante Madeiro | Alimentação | 120.00
    Se não for um recibo legível, responda apenas: ERRO
    `;

    const apiKey = PropertiesService.getScriptProperties().getProperty('GEMINI_KEY');
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;
    
    const payload = {
      contents: [{
        parts: [
          { text: prompt },
          { inlineData: { mimeType: "image/jpeg", data: base64Image } }
        ]
      }]
    };

    const response = UrlFetchApp.fetch(url, {
      method: 'post', contentType: 'application/json', payload: JSON.stringify(payload), muteHttpExceptions: true
    });
    
    const textoIA = JSON.parse(response.getContentText()).candidates[0].content.parts[0].text.trim();

    if (textoIA.includes("ERRO")) return "⚠️ Não consegui ler essa imagem como um recibo.";

    // 3. Salva na Planilha
    const dados = textoIA.split("|").map(d => d.trim());
    const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(CONFIG.PLANILHA.FINANCAS);
    
    if (sheet) {
      // Data, Descrição, Categoria, Valor, Obs
      sheet.appendRow([dados[0], dados[1], dados[2], dados[3].replace('.', ','), "Via Nexus Cam"]);
      return `💸 <b>Gasto Registrado!</b>\n\n🏢 ${dados[1]}\n💰 R$ ${dados[3]}\n📂 ${dados[2]}`;
    } else {
      return "❌ Erro: Aba 'Financas' não encontrada na planilha.";
    }

  } catch (e) {
    return "❌ Erro ao processar imagem: " + e.toString();
  }
}
// ============================================================================
// 9. MÓDULO DASHBOARD FINANCEIRO (Versão 4.0 - Fluxo de Caixa e Mentoria)
// ============================================================================

function gerarResumoFinanceiro() {
  try {
    const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(CONFIG.PLANILHA.FINANCAS);
    if (!sheet) return "❌ Aba 'Financas' não encontrada.";

    const dados = sheet.getDataRange().getValues();
    const hoje = new Date();
    const mesAtual = hoje.getMonth();
    const anoAtual = hoje.getFullYear();

    let totalReceitas = 0;
    let totalFixas = 0;
    let totalVariaveis = 0;
    let totalAportes = 0;

    dados.slice(1).forEach(linha => {
      if (!linha[0] || !(linha[0] instanceof Date)) return;

      const dataGasto = linha[0];
      
      // FILTRO DE MÊS ATUAL (O Nexus ignora janeiro para não poluir seu fevereiro)
      if (dataGasto.getMonth() === mesAtual && dataGasto.getFullYear() === anoAtual) {
        
        // Tratamento de Valor
        let valorFinal = 0;
        let celulaValor = linha[3];
        if (typeof celulaValor === 'number') {
          valorFinal = celulaValor;
        } else {
          let limpo = celulaValor.toString().replace(/[R$\s]/g, '').replace(/\./g, '').replace(',', '.');
          valorFinal = parseFloat(limpo) || 0;
        }

        const categoria = linha[2] ? linha[2].toString().toLowerCase() : "";

        // --- NOVA LÓGICA DE DICIONÁRIO ---
        if (categoria.includes("receita") || categoria.includes("salario") || categoria.includes("bolsa")) {
          totalReceitas += valorFinal;
        } 
        else if (categoria.includes("fixa") || categoria.includes("internet") || 
                 categoria.includes("fatura") || categoria.includes("agua") || 
                 categoria.includes("luz") || categoria.includes("aluguel") || 
                 categoria.includes("supermercado")) { // Supermercado você trata como fixa/essencial? Coloquei aqui.
          totalFixas += valorFinal;
        } 
        else if (categoria.includes("aporte") || categoria.includes("invest")) {
          totalAportes += valorFinal;
        } 
        else {
          // Itens como "Cigarro", "Corte de Cabelo", "Compra", "Variável"
          totalVariaveis += valorFinal;
        }
      }
    });

    const totalDespesas = totalFixas + totalVariaveis + totalAportes;
    const saldoFinal = totalReceitas - totalDespesas;
    const formatar = (v) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

    // Feedback Inteligente
    let feedback = saldoFinal < 0 ? "⚠️ Atenção: Gastos superando receitas!" : "✅ Saldo positivo. Mantenha o foco!";

    return `
📊 <b>RESUMO FINANCEIRO - ${hoje.toLocaleDateString('pt-BR', {month: 'long', year: 'numeric'}).toUpperCase()}</b>

💰 <b>Receitas:</b> ${formatar(totalReceitas)}
🏠 <b>Fixas:</b> ${formatar(totalFixas)}
🛒 <b>Variáveis:</b> ${formatar(totalVariaveis)}
📈 <b>Aportes:</b> ${formatar(totalAportes)}
-------------------------
💵 <b>SALDO ATUAL: ${formatar(saldoFinal)}</b>

💡 ${feedback}
    `;

  } catch (e) {
    return "❌ Erro: " + e.toString();
  }
}

function salvarFinancaManual(dataString, desc, cat, valor, subcategoria) {
  try {
    const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(CONFIG.PLANILHA.FINANCAS);
    if (!sheet) return "❌ Erro: Aba 'Financas' não encontrada.";

    // 1. Tratamento de Data Seguro
    const partes = dataString.split('-');
    const dataFormatada = (partes.length === 3) 
      ? new Date(partes[0], partes[1] - 1, partes[2]) 
      : new Date();

    // 2. Extração de Valor
    const extrairNumero = valor.toString().match(/\d+([.,]\d+)?/);
    const valorLimpo = extrairNumero ? extrairNumero[0].replace(',', '.') : "0";

    // 3. Normalização de Categoria
    let catLimpa = cat.toLowerCase();
    let categoriaFinal = cat.trim(); // Aceita o que a IA mandar como base
    if (catLimpa.includes("fixa") || catLimpa.includes("conta")) categoriaFinal = "Fixa";
    else if (catLimpa.includes("receita") || catLimpa.includes("salario") || catLimpa.includes("bolsa")) categoriaFinal = "Receita";
    else if (catLimpa.includes("aporte") || catLimpa.includes("invest")) categoriaFinal = "Aporte";

    // 4. Inserção
    const dataParaPlanilha = Utilities.formatDate(dataFormatada, "GMT-3", "dd/MM/yyyy");
    
    sheet.appendRow([
      dataParaPlanilha, 
      desc, 
      categoriaFinal, 
      parseFloat(valorLimpo), 
      "🤖 IA Vision", 
      subcategoria || "Geral" // <--- A MÁGICA DA COLUNA F AQUI
    ]);

    return `✅ <b>Registro:</b> ${subcategoria || "Geral"}\n💰 R$ ${parseFloat(valorLimpo).toFixed(2)}`;
    
  } catch (e) {
    return "❌ Erro ao salvar: " + e.toString();
  }
}
function processarImagemMultimodal(fileId) {
  try {
    const b64 = baixarArquivoTelegram(fileId);
    
    const prompt = `Analise este recibo/comprovante.
    1. Agrupe os itens por subcategorias (Ex: Mercearia, Limpeza, Hortifruti, Açougue).
    2. Para cada grupo, gere uma linha EXATAMENTE assim:
    [FINANCA] | yyyy-MM-dd | Nome do Local (resumo dos itens) | Supermercado | Valor da Soma | Subcategoria

    Exemplo:
    [FINANCA] | 2026-02-22 | Condor (Arroz, Feijão) | Supermercado | 25.50 | Mercearia
    [FINANCA] | 2026-02-22 | Condor (Sabão) | Supermercado | 15.00 | Limpeza

    Se não for recibo financeiro, responda: [INSIGHT] | Título | Resumo.`;

    const resposta = GEMINI_VISAO(prompt, b64);
    const linhas = resposta.split('\n');
    let logs = [];

    // Processa linha por linha e envia para a planilha
    linhas.forEach(linha => {
      if (linha.includes("[FINANCA]")) {
        const p = linha.split("|");
        if (p.length >= 6) {
          // Passa: Data, Descricao, Categoria, Valor, Subcategoria
          logs.push(salvarFinancaManual(p[1].trim(), p[2].trim(), p[3].trim(), p[4].trim(), p[5].trim()));
        }
      } 
      else if (linha.includes("[INSIGHT]")) {
        const p = linha.split("|");
        if (p.length >= 3) {
          logs.push(salvarInsight(p[1].trim(), p[2].trim()));
        }
      }
    });

    if (logs.length > 0) return "📊 <b>Processamento Concluído:</b>\n" + logs.join("\n");
    return "🤖 " + resposta;

  } catch (e) {
    return "❌ Erro na visão: " + e.toString();
  }
}
function salvarInsight(titulo, conteudo) {
  try {
    // Usando o nome da aba que você confirmou que já existe
    const nomeAba = "INSIGHTS"; 
    const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(nomeAba);
    
    if (!sheet) return "❌ Erro: Não encontrei a aba '" + nomeAba + "'. Verifique o nome exato.";

    const dataHoje = Utilities.formatDate(new Date(), "GMT-3", "dd/MM/yyyy HH:mm");
    
    // Adiciona na sua aba existente: Data, Título, Conteúdo
    sheet.appendRow([dataHoje, titulo, conteudo]);

    return `💡 <b>Novo Insight Salvo!</b>\n\n📖 <b>${titulo}</b>\n\n${conteudo}`;
  } catch (e) {
    return "❌ Erro ao salvar insight: " + e.toString();
  }
}
function baixarArquivoTelegram(fileId) {
  try {
    const token = CONFIG.TOKEN;
    if (!token) throw new Error("Token do Bot não encontrado no objeto CONFIG!");

    // 1. Solicita o caminho do arquivo ao Telegram
    const getFileUrl = "https://api.telegram.org/bot" + token + "/getFile?file_id=" + fileId;
    const response = UrlFetchApp.fetch(getFileUrl, { muteHttpExceptions: true });
    const resJson = JSON.parse(response.getContentText());

    if (!resJson.ok) {
      throw new Error("Telegram negou o acesso ao arquivo: " + resJson.description);
    }

    const filePath = resJson.result.file_path;

    // 2. Faz o download do arquivo real usando o caminho recebido
    const downloadUrl = "https://api.telegram.org/file/bot" + token + "/" + filePath;
    const fileResponse = UrlFetchApp.fetch(downloadUrl, { muteHttpExceptions: true });

    if (fileResponse.getResponseCode() !== 200) {
      throw new Error("Erro ao baixar o conteúdo do arquivo: " + fileResponse.getContentText());
    }

    // 3. Converte para o formato que a IA entende
    const blob = fileResponse.getBlob();
    return Utilities.base64Encode(blob.getBytes());
    
  } catch (e) {
    // Esse erro vai aparecer no seu Telegram para sabermos onde ajustar
    throw new Error("Falha técnica no download: " + e.message);
  }
}
function GEMINI_VISAO(prompt, base64) {
  try {
    // Voltando para o seu motor confiável: 2.5-flash
    const url = "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=" + CONFIG.GEMINI_KEY;
    
    const payload = {
      contents: [{
        parts: [
          { text: prompt },
          { inlineData: { mimeType: "image/jpeg", data: base64 } }
        ]
      }]
    };

    const options = {
      method: "post",
      contentType: "application/json",
      payload: JSON.stringify(payload),
      muteHttpExceptions: true
    };

    const response = UrlFetchApp.fetch(url, options);
    const json = JSON.parse(response.getContentText());

    if (json.candidates && json.candidates[0].content.parts[0].text) {
      return json.candidates[0].content.parts[0].text;
    } else {
      throw new Error("Resposta da IA vazia ou inválida: " + response.getContentText());
    }
  } catch (e) {
    throw new Error("Erro na comunicação com Gemini Vision: " + e.message);
  }
}
