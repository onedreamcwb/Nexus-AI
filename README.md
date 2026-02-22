<div align="center">
  
  <img src="Assets/Banner.png" alt="Nexus AI Banner" width="100%">

  # 🤖 Nexus AI - Assistente Executivo e Segundo Cérebro
  
  **O Nexus é um bot de Telegram Serverless que utiliza o ecossistema Google Workspace e a IA multimodal do Gemini 2.5 para automatizar finanças, tarefas e agenda.**

  ![JavaScript](https://img.shields.io/badge/JavaScript-F7DF1E?style=for-the-badge&logo=javascript&logoColor=black)
  ![Google Apps Script](https://img.shields.io/badge/Google_Apps_Script-4285F4?style=for-the-badge&logo=google&logoColor=white)
  ![Telegram API](https://img.shields.io/badge/Telegram_Bot_API-2CA5E0?style=for-the-badge&logo=telegram&logoColor=white)
  ![Gemini AI](https://img.shields.io/badge/Gemini_2.5_Flash-8E75B2?style=for-the-badge&logo=googlebard&logoColor=white)

</div>

---

## 🚀 O Problema que o Nexus Resolve
A gestão diária de tarefas, controle financeiro e caixa de entrada tomam muito tempo útil. O Nexus foi criado para ser um assistente proativo: basta enviar uma foto de um recibo, um áudio ou um comando rápido no Telegram, e ele orquestra todas as informações diretamente para as planilhas e agendas corretas usando Inteligência Artificial.

## ✨ Funcionalidades em Destaque

### 📊 1. OCR Multimodal e Engenharia de Dados Financeiros
O motor principal (Gemini 2.5 Flash Multimodal) analisa fotos de notas fiscais, agrupa os itens por contexto e gera múltiplas inserções no Google Sheets com alta granularidade, separando itens automaticamente (ex: Bebidas, Lanches, Sobremesas).

<div align="center">
  <img src="Assets/Financeiro.png" alt="Demonstração do OCR Financeiro" width="80%">
  <br>
  <i>Exemplo: Leitura de cupom fiscal gerando múltiplas linhas categorizadas (incluindo a Coluna F de Subcategorias).</i>
</div>

### 🎯 2. Matriz de Eisenhower (Google Tasks)
Gestão visual de prioridades. O usuário envia uma tarefa e o Nexus exibe um menu interativo no Telegram para classificar a urgência e importância. A tarefa é automaticamente criada na lista correta do Google Tasks (ex: Q1 - Urgente e Importante).

<div align="center">
  <img src="Assets/Matriz.png" alt="Menu da Matriz de Eisenhower" width="50%">
  <br>
    <i>Exemplo: Exemplo: Comando "/Tarefa", o usuário escolhe nivel de importância, Digita Titulo e Detalhes e a Tarefa é adicionada no Google Tasks</i>
</div>

### 🎙️ 3. Transcrição de Áudio e NLP
O Nexus processa mensagens de voz (`.ogg` do Telegram), converte para Base64 e utiliza a API do Gemini para transcrever e interpretar intenções (agendamentos, insights, anotações).

<div align="center">
  <img src="Assets/Audio.png" alt="Transcrição de Áudio" width="50%">
  <br>
<i>Exemplo: Exemplo: Comando "/Tarefa", o usuário escolhe nivel de importância, Digita Titulo e Detalhes e a Tarefa é adicionada no Google Tasks</i>

</div>

### 📧 4. Secretário Virtual (Gmail & Calendar)
* **Briefing Matinal:** Puxa eventos do Google Calendar e e-mails não lidos, gerando um resumo executivo por IA no início do dia.
* **Auto-Drafts:** Monitora remetentes VIPs no Gmail e cria rascunhos de resposta automáticos baseados no contexto da mensagem.

<div align="center">
  <img src="Assets/Briefing_Matinal.png" alt="Transcrição de Áudio" width="50%">
  <br>
  <i>Exemplo: o <b>Nexus AI</b> Manda os relatórios Matinais contendo Mindset, Agenda do dia, Prioridades do dia e os 3 E-mails mais importantes, respondendo automatico os E-mails cadastrados como VIPS </b></i>
</div>
  <br>
---

## ⚙️ Arquitetura do Projeto

* O projeto é totalmente **Serverless**, hospedado no **Google Apps Script**.
* Utiliza um **Webhook** configurado na API do Telegram (`doPost`) para receber os dados em tempo real.
* O roteamento interno de IA decide se o comando invoca a API do Sheets, Calendar, Tasks ou Gmail.

## 🔐 Aviso de Segurança
Por motivos de segurança cibernética, as credenciais originais (`TELEGRAM_TOKEN`, `GEMINI_KEY` e IDs de planilhas) foram substituídas por _placeholders_ neste repositório. Nunca comite chaves de API expostas.

---
<div align="center">
  <i>Desenvolvido por Gustavo - Foco em Produtividade e Engenharia de Automação</i>
</div>
