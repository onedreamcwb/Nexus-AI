/**
 * ============================================================================
 * 🤖 PROJETO NEXUS AI - V5.3 (Eisenhower Matrix - Financial & Vision Edition)
 * ============================================================================
 */
// --- CONFIGURAÇÕES GERAIS ---
// ============================================================================
const CONFIG = {
  TOKEN: "", 
  GEMINI_KEY: "", 
  ID_ADMIN: "8134192211", 
  TIMEZONE: "GMT-3",
  
  // 📂 IDs DAS PLANILHAS (O código que fica no link do navegador)
  ID_PLANILHA_NEXUS: "18Wt_HYJruLarg8d5uLU0nS7aNNCuvSbAVguEIiC6wLQ", 

  // 📑 NOMES DAS ABAS (Devem ser idênticos aos nomes nas planilhas)
  PLANILHA: {
    // Na Planilha Nexus:
    MEMORIA: "Telegram",
    INSIGHTS: "Insights",
    PERFIL: "Perfil",
  },
  
  // 🗒️ NOMES DAS LISTAS DE TAREFAS (Matriz de Eisenhower)
  LISTAS_TASKS: {
    Q1: "Importante e Urgente",
    Q2: "Importante Mas Não Urgente",
    Q3: "Urgente Mas Não Importante",
    Q4: "Não Importante e Não Urgente"
  },

  // 💬 MENSAGENS PADRÃO (O que estava faltando!)
  MENSAGENS: {
    ERRO_ACESSO: "⛔ Acesso Negado.",
    PROCESSANDO: "<i>Processando...</i> ⏳",
    SALVO: "✅ Salvo!"
  }
};
// ============================================================================
// 1. CÉREBRO (Prompt do Sistema)
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
  3. FORMATACÃO (CRÍTICO): NUNCA use asteriscos (**) para negrito. Para destacar palavras, use APENAS a tag HTML <b>palavra</b>, 
  - <i>Texto</i>; para itálico, 
  - <u>Texto</u>; para sublinhar, 
  - <s>Texto</s>; para adicionar riscado ao texto,
  - <code>Trecho de código</code>; para inserir um fragmento de código,
  - <pre>Trecho grande de código</pre>; usado para destacar um trecho maior de código,
  - <a Link </a>; Para criar um HyperLink,
  - <blockquote>texto</blockquote>; Para destacar o texto como uma citação,
  - <h2>Subtitulo 2</h2>, <h3>Subititulo 3</h3>; Cria subtitulo de nivel correspondente.
  - Pode inserir emotes quando viável
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
      
    // 👇 NOVOS ROTEADORES FINANCEIROS 👇
    } else if (respostaIA.includes("[NOVA_SAIDA]")) {
      const p = respostaIA.split("|").map(item => item.trim());
      
      // Mapeamento rigoroso para evitar erro de validação
      const data  = p[1] || new Date().toISOString().split('T')[0];
      const desc  = p[2] || "Gasto via Nexus";
      const dest  = p[3] || "Diverso";
      const cat   = p[4] || "Livre"; // Valor padrão seguro
      const tipo  = p[5] || "Variável";
      const pag   = p[6] || "Pix";
      const valor = p[7] || "0";

      enviarMensagemTelegram(chatId, salvarSaida(data, desc, dest, cat, tipo, pag, valor));
    } else if (respostaIA.includes("[NOVA_ENTRADA]")) {
      const p = respostaIA.split("|");
      enviarMensagemTelegram(chatId, salvarEntrada(p[1].trim(), p[2].trim(), p[3].trim(), p[4].trim(), p[5].trim()));
    } else if (respostaIA.includes("[NOVO_APORTE]")) {
      const p = respostaIA.split("|");
      enviarMensagemTelegram(chatId, salvarAporte(p[1].trim(), p[2].trim(), p[3].trim(), p[4].trim(), p[5].trim()));
    // 👆 FIM DOS NOVOS ROTEADORES 👆
    } else if (respostaIA.includes("[BUSCAR_INSIGHT]")) {
// ... (continua igual para baixo)
      const p = respostaIA.split("|");
      enviarMensagemTelegram(chatId, buscarInsightPlanilha(p[1].trim()));
    } else {
      // 💬 É UMA CONVERSA NORMAL (Ex: Resumo de livros, motivação)
      salvarMensagemPlanilha(chatId, textoUsuario, respostaIA);
      
      // 👇 Cria o botão mágico de Salvar Insight
      const teclado = {
        inline_keyboard: [[
          { text: "💡 Salvar como Insight", callback_data: "acao_salvar" }
        ]]
      };
      
      enviarMensagemTelegram(chatId, respostaIA, teclado);
    }

  } catch (err) {
    enviarMensagemTelegram(CONFIG.ID_ADMIN, `☠️ Erro: ${err.toString()}`);
  }
}

// --- Processamento dos Botões da Matriz e Insights ---
function processarBotao(data) {
  const acao = data.callback_query.data;
  const chatId = data.callback_query.message.chat.id;
  
  // Se for botão de limpar normal
  if (acao === "acao_limpar") {
    limparMemoria(chatId, true);
    return;
  }
  
  // 💡 SE FOR O BOTÃO DE SALVAR INSIGHT
  if (acao === "acao_salvar") {
    const textoDaMensagem = data.callback_query.message.text;
    
    // Cria um título automático usando as 4 primeiras palavras
    const tituloAutomatico = textoDaMensagem.split(' ').slice(0, 4).join(' ') + "...";
    
    // Chama a função de salvar e avisa o usuário
    const resposta = salvarInsight(tituloAutomatico, textoDaMensagem);
    enviarMensagemTelegram(chatId, resposta);
    return;
  }

  // Se for botão da MATRIZ (Q1, Q2, Q3, Q4)
  if (acao.startsWith("task_")) {
    const listaCodigo = acao.replace("task_", ""); // Ex: Q1
    
    // Salva no Cache que estamos esperando uma tarefa para esta lista
    CacheService.getScriptCache().put("estado_" + chatId, listaCodigo, 300); // 300s = 5 minutos
    
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
  const apiKey = CONFIG.GEMINI_KEY; // Puxa a chave do CONFIG global
  const modelo = "gemini-2.5-flash"; // Mantido conforme sua exigência
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${modelo}:generateContent?key=${apiKey}`;
  
  const options = {
    method: 'post',
    contentType: 'application/json',
    payload: JSON.stringify({ 
      contents: [{ parts: [{ text: prompt }] }],
      safetySettings: [
        { category: "HARM_CATEGORY_HARASSMENT", threshold: "BLOCK_NONE" },
        { category: "HARM_CATEGORY_DANGEROUS_CONTENT", threshold: "BLOCK_NONE" }
      ]
    }),
    muteHttpExceptions: true // Permite capturar a mensagem de erro real do Google
  };

  try {
    const response = UrlFetchApp.fetch(url, options);
    const responseCode = response.getResponseCode();
    const responseText = response.getContentText();
    const json = JSON.parse(responseText);

    if (responseCode !== 200) {
      // Se der erro de limite (429), ele avisa você claramente
      if (responseCode === 429) return "⚠️ Limite de requisições atingido. Tente em 10 segundos.";
      return "⚠️ Erro API (" + responseCode + "): " + responseText;
    }
    
    if (json.candidates && json.candidates[0].content) {
      return json.candidates[0].content.parts[0].text;
    }
    return "IA retornou resposta vazia.";
    
  } catch (e) {
    return "❌ Falha crítica na conexão: " + e.toString();
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
  // 🛡️ Filtro Anti-Bug: Converte o Markdown da IA para o HTML do Telegram
  // Transforma **texto** em <b>texto</b>
  let textoCorrigido = texto.replace(/\*\*(.*?)\*\*/g, '<b>$1</b>');

  // Pega o token direto do CONFIG
  const token = CONFIG.TOKEN; 
  const payload = {
    chat_id: chatId,
    text: textoCorrigido,
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
    hoje.setHours(23, 59, 59, 999); 
    
    const mesAtual = hoje.getMonth();
    const anoAtual = hoje.getFullYear();

    let totalReceitasJaRecebidas = 0;
    let totalReceitasFuturas = 0;
    let totalFixas = 0;
    let totalVariaveis = 0;
    
    // 💡 NOVA LÓGICA DE APORTES
    let totalAportesGeral = 0; // Soma TUDO (passado, presente e futuro)
    let aportesDesteMes = 0;   // Só o que você tirou do bolso NESTE MÊS

    dados.slice(1).forEach(linha => {
      if (!linha[0]) return;

      let dataGasto = (linha[0] instanceof Date) ? linha[0] : new Date(linha[0]);
      
      let valorFinal = 0;
      let celulaValor = linha[3];
      if (typeof celulaValor === 'number') {
        valorFinal = celulaValor;
      } else {
        let limpo = celulaValor.toString().replace(/[R$\s]/g, '').replace(/\./g, '').replace(',', '.');
        valorFinal = parseFloat(limpo) || 0;
      }

      const descricao = (linha[1] || "").toString().toLowerCase();
      const categoria = (linha[2] || "").toString().toLowerCase();

      // Identifica o que é Receita (Isso impede que a sua "Retirada do Aporte" bugue o sistema)
      const isReceita = categoria.includes("receita") || categoria.includes("salario") || categoria.includes("bolsa") || categoria.includes("vale");
      
      // Identifica o que é Aporte
      const isAporte = !isReceita && (categoria.includes("aporte") || categoria.includes("invest") || descricao.includes("guarda"));

      // 1. LÓGICA DO COFRE (Soma global de Aportes)
      if (isAporte) {
        totalAportesGeral += valorFinal;
        
        // Se o aporte foi feito no mês atual, nós separamos para abater do salário
        if (dataGasto.getMonth() === mesAtual && dataGasto.getFullYear() === anoAtual) {
          aportesDesteMes += valorFinal;
        }
      } 
      
      // 2. LÓGICA DO MÊS ATUAL (Receitas e Gastos só de Fevereiro)
      else if (dataGasto.getMonth() === mesAtual && dataGasto.getFullYear() === anoAtual) {
        
        if (isReceita) {
          if (dataGasto <= hoje) {
            totalReceitasJaRecebidas += valorFinal;
          } else {
            totalReceitasFuturas += valorFinal;
          }
        } 
        else if (categoria.includes("fixa") || categoria.includes("internet") || 
                 categoria.includes("fatura") || categoria.includes("agua") || 
                 categoria.includes("luz") || categoria.includes("aluguel") || 
                 categoria.includes("supermercado")) {
          totalFixas += valorFinal;
        } 
        else {
          totalVariaveis += valorFinal;
        }
      }
    });

    // 🧮 CÁLCULO DO SALDO DISPONÍVEL
    // Receitas - (Fixas + Variáveis + Aportes feitos SÓ NESTE MÊS)
    const saldoLivreAgora = totalReceitasJaRecebidas - (totalFixas + totalVariaveis + aportesDesteMes);
    
    const formatar = (v) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

    return `
📊 <b>RESUMO FINANCEIRO - ${hoje.toLocaleDateString('pt-BR', {month: 'long', year: 'numeric'}).toUpperCase()}</b>

💰 <b>Receitas Recebidas:</b> ${formatar(totalReceitasJaRecebidas)}
⏳ <b>Receitas Futuras:</b> ${formatar(totalReceitasFuturas)}
📈 <b>Total Acumulado em Aportes:</b> ${formatar(totalAportesGeral)}
-------------------------
🏠 <b>Gastos Fixos:</b> ${formatar(totalFixas)}
🛒 <b>Gastos Variáveis:</b> ${formatar(totalVariaveis)}
-------------------------
💵 <b>DISPONÍVEL HOJE: ${formatar(saldoLivreAgora)}</b>

💡 ${saldoLivreAgora < 0 ? "⚠️ Você está operando com dinheiro que ainda não caiu!" : "✅ Saldo saudável para gastos livres."}
    `;

  } catch (e) {
    return "❌ Erro no resumo: " + e.toString();
  }
}
// ============================================================================
// FUNÇÕES FINANCEIRAS (ADAPTADAS PARA LAYOUT COM CABEÇALHO NA LINHA 7)
// ============================================================================

// Busca a última linha olhando para a Coluna B (Descrição)
function encontrarUltimaLinhaReal(sheet) {
  const dados = sheet.getRange("B:B").getValues(); 
  // Percorre de baixo para cima para encontrar a última preenchida
  for (let i = dados.length - 1; i >= 0; i--) {
    if (dados[i][0] !== "" && dados[i][0] !== undefined) {
      // Se a última preenchida for antes da linha 7 (cabeçalho), retornamos 7
      return Math.max(i + 1, 7); 
    }
  }
  return 7; // Garantia: a primeira linha de dados será a 8 (7 + 1)
}

function obterAbaSegura(ss, nomePadrao) {
  let sheet = ss.getSheetByName(nomePadrao);
  if (sheet) return sheet;
  const variacoes = { "SAÍDA": "SAIDA", "SAIDA": "SAÍDA" };
  return ss.getSheetByName(variacoes[nomePadrao] || "");
}

function salvarSaida(data, descricao, destino, categoria, tipoSaida, pagamento, valor) {
  try {
    const ss = SpreadsheetApp.openById(CONFIG.ID_PLANILHA_FINANCEIRA);
    const sheet = obterAbaSegura(ss, CONFIG.PLANILHA.SAIDA);
    
    // Encontra a linha 8 ou a próxima vazia na coluna B
    const proximaLinha = encontrarUltimaLinhaReal(sheet) + 1;
    
    // Converte ponto em vírgula para o Sheets reconhecer como dinheiro
    const valorFormatado = valor.toString().replace('.', ',');

    // Monta a linha exatamente como a sua planilha espera (Colunas B até I)
    const dados = [[
      descricao,   // B: DESCRIÇÃO
      destino,     // C: DESTINO
      categoria,   // D: CATEGORIA (Validada)
      tipoSaida,   // E: TIPO DE SAÍDA (Validada)
      pagamento,   // F: PAGAMENTO (Validada)
      data,        // G: DATA
      valorFormatado, // H: VALOR
      "SIM"        // I: PAGO?
    ]];
    
    sheet.getRange(proximaLinha, 2, 1, 8).setValues(dados);
    
    return `✅ <b>Registrado na Planilha Oficial!</b>\n\n📝 ${descricao}\n📂 ${categoria}\n💰 R$ ${valor}\n📍 Linha: ${proximaLinha}`;
  } catch (e) {
    return "❌ Erro ao salvar: " + e.toString();
  }
}
function salvarEntrada(data, descricao, origem, tipo, valor) {
  try {
    const ss = SpreadsheetApp.openById(CONFIG.ID_PLANILHA_FINANCEIRA);
    const sheet = obterAbaSegura(ss, CONFIG.PLANILHA.ENTRADA);
    if (!sheet) return "❌ Aba de Entrada não encontrada.";
    
    const proximaLinha = encontrarUltimaLinhaReal(sheet) + 1;
    
    // Colunas na ENTRADA: B (Desc), C (Orig), D (Tipo), E (Data), F (Valor), G (Recebido?)
    sheet.getRange(proximaLinha, 2, 1, 6).setValues([[descricao, origem, tipo, data, valor, "SIM"]]);
    
    return `🤑 <b>ENTRADA REGISTRADA!</b>\n\n🏢 ${origem}\n💰 R$ ${valor}\n📍 Linha: ${proximaLinha}`;
  } catch (e) { return "❌ Erro ao salvar entrada: " + e.toString(); }
}

function salvarAporte(data, descricao, ativo, corretora, valor) {
  try {
    const ss = SpreadsheetApp.openById(CONFIG.ID_PLANILHA_FINANCEIRA);
    const sheet = obterAbaSegura(ss, CONFIG.PLANILHA.APORTE);
    if (!sheet) return "❌ Aba de Aporte não encontrada.";
    
    const proximaLinha = encontrarUltimaLinhaReal(sheet) + 1;
    
    // Colunas no APORTE: B (Desc), C (Ativo), D (Corr), E (Data), F (Valor), G (Feito?)
    sheet.getRange(proximaLinha, 2, 1, 6).setValues([[descricao, ativo, corretora, data, valor, "SIM"]]);
    
    return `📈 <b>APORTE REGISTRADO!</b>\n\n🎯 ${descricao}\n💰 R$ ${valor}\n📍 Linha: ${proximaLinha}`;
  } catch (e) { return "❌ Erro ao salvar aporte: " + e.toString(); }
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
// ============================================================================
// 10. MÓDULO DE BUSCA DE INSIGHTS
// ============================================================================

function buscarInsightPlanilha(termoBusca) {
  try {
    const nomeAba = CONFIG.PLANILHA.INSIGHTS || "INSIGHTS";
    const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(nomeAba);
    
    if (!sheet) return "❌ Erro: Aba de Insights não encontrada.";

    const dados = sheet.getDataRange().getValues();
    if (dados.length <= 1) return "📭 Nenhum insight salvo ainda.";

    const termo = termoBusca.toLowerCase().trim();
    let resultados = [];

    // Busca de trás para frente (mais recentes primeiro)
    for (let i = dados.length - 1; i > 0; i--) {
      const data = dados[i][0] ? dados[i][0].toString() : "Data Indefinida";
      const titulo = dados[i][1] ? dados[i][1].toString() : "";
      const conteudo = dados[i][2] ? dados[i][2].toString() : "";

      if (titulo.toLowerCase().includes(termo) || conteudo.toLowerCase().includes(termo)) {
        resultados.push(`💡 <b>${titulo}</b> <i>(${data})</i>\n${conteudo}`);
        // Limita a 3 resultados para não estourar o limite de tamanho do Telegram
        if (resultados.length >= 3) break; 
      }
    }

    if (resultados.length === 0) {
      return `🔍 Não encontrei nenhum insight com a palavra: "<b>${termoBusca}</b>"`;
    }

    return `🔎 <b>Resultados da Busca:</b>\n\n` + resultados.join("\n\n〰️〰️〰️\n\n");

  } catch (e) {
    return "❌ Erro ao buscar insight: " + e.toString();
  }
}
