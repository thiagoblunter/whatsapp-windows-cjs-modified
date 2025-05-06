// Importando a biblioteca whatsapp-web.js usando CommonJS
const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');

// Criando o cliente WhatsApp com salvar sessão
const client = new Client({
    puppeteer: {
        headless: true,
        args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-dev-shm-usage',
            '--disable-accelerated-2d-canvas',
            '--no-first-run',
            '--disable-gpu'
        ]
    },
    restartOnAuthFail: true,
    // Salva os dados da sessão para não precisar escanear o QR code novamente
    authStrategy: new LocalAuth({
        clientId: "mobile-on-bot"
    })
});

console.log("WhatsApp Bot iniciando... Aguarde o QR Code para fazer login.");

// QR code generation for authentication
client.on('qr', qr => {
    qrcode.generate(qr, {small: true});
    console.log('QR Code gerado. Escaneie com o WhatsApp para fazer login.');
});

// Client ready event handler
client.on('ready', () => {
    console.log('WhatsApp Bot conectado! Mobile On está online.');
});

// Client authentication failure handler
client.on('auth_failure', msg => {
    console.error('Falha na autenticação:', msg);
});

// Connection event handlers
client.on('disconnected', (reason) => {
    console.log('Cliente foi desconectado', reason);
});

// Initialize the WhatsApp client
client.initialize().catch(err => {
    console.error('Erro ao inicializar:', err);
});

// Handle connection errors
process.on('unhandledRejection', (reason, promise) => {
    console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

// Utility function for creating delays
const delay = ms => new Promise(res => setTimeout(res, ms));

// Estados de conversa
const userStates = {}; // Objeto para armazenar o estado de cada usuário

// Constantes para os estados
const WAITING_FOR_OPTION = 'waiting_for_option';
const WAITING_FOR_YES_NO = 'waiting_for_yes_no';
const WAITING_FOR_PRODUCT_TYPE = 'waiting_for_product_type';
const WAITING_FOR_MODEL_INFO = 'waiting_for_model_info';
const WAITING_FOR_CAPINHA_MODEL = 'waiting_for_capinha_model';
const WAITING_FOR_FEEDBACK_TYPE = 'waiting_for_feedback_type';
const WAITING_FOR_RECLAMACAO = 'waiting_for_reclamacao';
const WAITING_FOR_SUGESTAO = 'waiting_for_sugestao';
const WAITING_FOR_FONE_TYPE = 'waiting_for_fone_type'; 
const WAITING_FOR_CABO_TYPE = 'waiting_for_cabo_type'; // Novo estado para submenu de cabos
const WAITING_FOR_CARREGADOR_TYPE = 'waiting_for_carregador_type'; // Novo estado para submenu de carregadores
const WAITING_FOR_RATING = 'waiting_for_rating'; // Novo estado para avaliação do atendimento

// Função para definir o estado do usuário
function setUserState(userId, state) {
    userStates[userId] = state;
    console.log(`Estado do usuário ${userId} alterado para: ${state}`);
}

// Função para obter o estado do usuário
function getUserState(userId) {
    return userStates[userId] || null;
}

// Mensagem de erro padrão para opções inválidas
const INVALID_OPTION_MESSAGE = "Desculpe, não entendi sua mensagem. Para continuar, por favor selecione uma das opções digitando o número correspondente.";

// Função para enviar mensagem de erro de opção inválida
async function sendInvalidOptionMessage(msg) {
    await client.sendMessage(msg.from, INVALID_OPTION_MESSAGE);
}

client.on('message', async msg => {
    try {
        console.log(`Mensagem recebida de ${msg.from}: "${msg.body}"`);
        console.log(`Estado atual do usuário: ${getUserState(msg.from)}`);
        
        const chat = await msg.getChat();
        const currentState = getUserState(msg.from);
        
        // Processamento baseado no estado do usuário
        switch (currentState) {
            case WAITING_FOR_RATING:
                const rating = parseInt(msg.body.trim());
                
                if (isNaN(rating) || rating < 1 || rating > 5) {
                    await client.sendMessage(msg.from, 'Por favor, avalie nosso atendimento com uma nota de 1 a 5, onde 1 é muito ruim e 5 é excelente.');
                    return;
                }
                
                await delay(1000);
                await chat.sendStateTyping();
                await delay(1000);
                
                // Respostas personalizadas baseadas na nota
                if (rating <= 2) {
                    // Notas baixas - resposta mais apologética
                    await client.sendMessage(msg.from, `Agradecemos sua avaliação de *${rating}/5*. Sentimos muito que sua experiência não tenha sido satisfatória. Vamos trabalhar para melhorar nosso atendimento. Sua opinião é muito importante para nós! 🙏`);
                } else if (rating === 3) {
                    // Nota média - resposta neutra
                    await client.sendMessage(msg.from, `Obrigado pela sua avaliação de *${rating}/5*. Estamos sempre buscando melhorar nosso atendimento. Se tiver sugestões específicas, ficaremos felizes em ouvi-las em um próximo contato! 😊`);
                } else {
                    // Notas altas - resposta entusiasmada
                    await client.sendMessage(msg.from, `Muito obrigado pela avaliação de *${rating}/5*! Ficamos felizes em saber que conseguimos atender suas expectativas. Esperamos vê-lo novamente em breve! 🌟`);
                }
                
                await delay(1000);
                await chat.sendStateTyping();
                await delay(1000);
                await client.sendMessage(msg.from, 'Até logo! 👋');
                
                delete userStates[msg.from]; // Remove o estado do usuário
                return;
                
            case WAITING_FOR_CARREGADOR_TYPE: // Submenu de tipos de carregadores
                const carregadorType = msg.body.trim();
                let carregadorResponse = '';
                
                switch(carregadorType) {
                    case '1':
                        carregadorResponse = 'Carregador Tipo C';
                        break;
                    case '2':
                        carregadorResponse = 'Carregador Lightning/iPhone';
                        break;
                    case '3':
                        carregadorResponse = 'Carregador Micro V8';
                        break;
                    default:
                        await sendInvalidOptionMessage(msg);
                        await client.sendMessage(msg.from, 'Por favor, escolha uma opção válida de 1 a 3.');
                        return;
                }
                
                await delay(1000);
                await chat.sendStateTyping();
                await delay(1000);
                await client.sendMessage(msg.from, `Você escolheu *${carregadorResponse}*, aguarde que em breve enviaremos as fotos e preços disponíveis.`);
                
                setUserState(msg.from, WAITING_FOR_YES_NO);
                await client.sendMessage(msg.from, 'Deseja retornar às opções? (sim ou não)');
                return;
                
            case WAITING_FOR_CABO_TYPE: // Submenu de tipos de cabos
                const caboType = msg.body.trim();
                let caboResponse = '';
                
                switch(caboType) {
                    case '1':
                        caboResponse = 'Cabo Tipo C';
                        break;
                    case '2':
                        caboResponse = 'Cabo Lightning/iPhone';
                        break;
                    case '3':
                        caboResponse = 'Cabo Micro V8';
                        break;
                    default:
                        await sendInvalidOptionMessage(msg);
                        await client.sendMessage(msg.from, 'Por favor, escolha uma opção válida de 1 a 3.');
                        return;
                }
                
                await delay(1000);
                await chat.sendStateTyping();
                await delay(1000);
                await client.sendMessage(msg.from, `Você escolheu *${caboResponse}*, aguarde que em breve enviaremos as fotos e preços disponíveis.`);
                
                setUserState(msg.from, WAITING_FOR_YES_NO);
                await client.sendMessage(msg.from, 'Deseja retornar às opções? (sim ou não)');
                return;
                
            case WAITING_FOR_FONE_TYPE: // Submenu de tipos de fone
                const foneType = msg.body.trim();
                let foneResponse = '';
                
                switch(foneType) {
                    case '1':
                        foneResponse = 'Fone com fio';
                        break;
                    case '2':
                        foneResponse = 'Fone de ouvido bluetooth';
                        break;
                    case '3':
                        foneResponse = 'Headphone bluetooth';
                        break;
                    case '4':
                        foneResponse = 'Headset gamer';
                        break;
                    default:
                        await sendInvalidOptionMessage(msg);
                        await client.sendMessage(msg.from, 'Por favor, escolha uma opção válida de 1 a 4.');
                        return;
                }
                
                await delay(1000);
                await chat.sendStateTyping();
                await delay(1000);
                await client.sendMessage(msg.from, `Você escolheu *${foneResponse}*, aguarde que em breve enviaremos as fotos e preços disponíveis.`);
                
                setUserState(msg.from, WAITING_FOR_YES_NO);
                await client.sendMessage(msg.from, 'Deseja retornar às opções? (sim ou não)');
                return;
                
            case WAITING_FOR_CAPINHA_MODEL:
                const modeloCapinha = msg.body.trim();
                
                if (modeloCapinha.length > 0) {
                    await delay(1000);
                    await chat.sendStateTyping();
                    await delay(1000);
                    await client.sendMessage(msg.from, `Obrigado por informar o modelo *${modeloCapinha}*! Em breve enviaremos as fotos e preços das capinhas disponíveis para este aparelho.`);
                    
                    setUserState(msg.from, WAITING_FOR_YES_NO);
                    await client.sendMessage(msg.from, 'Deseja retornar às opções? (sim ou não)');
                }
                return;
                
            case WAITING_FOR_RECLAMACAO:
                const reclamacao = msg.body.trim();
                
                if (reclamacao.length > 0) {
                    await delay(1000);
                    await chat.sendStateTyping();
                    await delay(1000);
                    await client.sendMessage(msg.from, "Sentimos muito pelo ocorrido. Vamos encaminhar sua reclamação para o setor responsável e faremos o possível para resolver o quanto antes. Obrigado por nos avisar. 🙏");
                    
                    setUserState(msg.from, WAITING_FOR_YES_NO);
                    await client.sendMessage(msg.from, 'Deseja retornar às opções? (sim ou não)');
                }
                return;
                
            case WAITING_FOR_SUGESTAO:
                const sugestao = msg.body.trim();
                
                if (sugestao.length > 0) {
                    await delay(1000);
                    await chat.sendStateTyping();
                    await delay(1000);
                    await client.sendMessage(msg.from, "Agradecemos muito por compartilhar sua ideia! É esse tipo de feedback que nos ajuda a melhorar cada vez mais. 😊✨");
                    
                    setUserState(msg.from, WAITING_FOR_YES_NO);
                    await client.sendMessage(msg.from, 'Deseja retornar às opções? (sim ou não)');
                }
                return;
                
            case WAITING_FOR_FEEDBACK_TYPE:
                const escolhaFeedback = msg.body.trim();
                
                switch(escolhaFeedback) {
                    case '1': // Reclamação
                        await delay(1000);
                        await chat.sendStateTyping();
                        await delay(1000);
                        await client.sendMessage(msg.from, "Poxa, sentimos muito pelo que aconteceu 😔 Conta pra gente o que houve – queremos resolver rapidinho 💨 e garantir que você tenha a melhor experiência possível com a gente 💛.");
                        setUserState(msg.from, WAITING_FOR_RECLAMACAO);
                        break;
                        
                    case '2': // Sugestão
                        await delay(1000);
                        await chat.sendStateTyping();
                        await delay(1000);
                        await client.sendMessage(msg.from, "Adoramos ouvir ideias novas! Se você tem alguma sugestão ou melhoria, conta pra gente — sua opinião faz toda a diferença 💬✨");
                        setUserState(msg.from, WAITING_FOR_SUGESTAO);
                        break;
                        
                    default:
                        await sendInvalidOptionMessage(msg);
                        await client.sendMessage(msg.from, "Por favor, escolha uma opção válida: 1 para Reclamação ou 2 para Sugestão.");
                        break;
                }
                return;
                
            case WAITING_FOR_MODEL_INFO:
                const userMessage = msg.body.trim();
                const promptMessage = '⚠️ Informamos que *não* aceitamos aparelhos usados como forma de pagamento. Trabalhamos apenas com aparelhos novos, lacrados e com 1 ano de garantia.\n\nPara continuarmos, por favor nos diga o modelo que você procura. Exemplos: iPhone 13 128gb, iphone 12 64gb...';
                
                if (userMessage === '' || userMessage === promptMessage) {
                    await client.sendMessage(msg.from, 'Pra gente seguir certinho, me diz qual é o modelo que você está procurando, por favor 😊 (ex: iPhone 11 64gb, Samsung A54, Moto G73...)');
                    return;
                }
                
                console.log(`Usuário informou modelo: *${userMessage}*`);
                
                await delay(1000);
                await chat.sendStateTyping();
                await delay(1000);
                await client.sendMessage(msg.from, `Obrigado pelo interesse no modelo *${userMessage}*! 📱`);
                
                await delay(1000);
                await chat.sendStateTyping();
                await delay(1000);
                await client.sendMessage(msg.from, '✨ Aguarde só um pouquinho! Um de nossos atendentes vai falar com você em breve para te ajudar no que for preciso 😊');
                
                setUserState(msg.from, WAITING_FOR_YES_NO);
                await client.sendMessage(msg.from, 'Deseja retornar às opções? (sim ou não)');
                return;
                
            case WAITING_FOR_PRODUCT_TYPE:
                const productType = msg.body.trim();
                
                if (productType === '3') { // Cabos
                    await delay(1000);
                    await chat.sendStateTyping();
                    await delay(1000);
                    await client.sendMessage(msg.from, '🔌 Qual tipo de cabo você precisa?\n\n1 - Tipo C 🔌\n2 - Lightning/iPhone 🔌\n3 - Micro V8 🔌');
                    setUserState(msg.from, WAITING_FOR_CABO_TYPE);
                    return;
                }
                
                switch(productType) {
                    case '1': // Capinhas
                        await delay(1000);
                        await chat.sendStateTyping();
                        await delay(1000);
                        await client.sendMessage(msg.from, '*📱 Para te enviar as opções de capinhas, nos informe o modelo do seu aparelho:*\nExemplo: iPhone 15, Samsung A32, Motorola G8 Plus...\n\nAssim conseguimos te mostrar as melhores opções disponíveis!');
                        setUserState(msg.from, WAITING_FOR_CAPINHA_MODEL);
                        break;
                        
                    case '2': // Fones
                        await delay(1000);
                        await chat.sendStateTyping();
                        await delay(1000);
                        await client.sendMessage(msg.from, '🎧 Qual tipo de fone você você precisa?\n\n1 - Fone com fio 🎧\n2 - Fone de ouvido bluetooth 🎧\n3 - Headphone bluetooth 🎧\n4 - Headset gamer 🎮');
                        setUserState(msg.from, WAITING_FOR_FONE_TYPE);
                        break;
                        
                    case '4': // Carregadores
                        await delay(1000);
                        await chat.sendStateTyping();
                        await delay(1000);
                        await client.sendMessage(msg.from, '🔋 Qual tipo de carregador você você precisa?\n\n1 - Tipo C 🔋\n2 - Lightning/iPhone 🔋\n3 - Micro V8 🔋');
                        setUserState(msg.from, WAITING_FOR_CARREGADOR_TYPE);
                        break;
                        
                    case '5': // Caixa de Som
                        await delay(1000);
                        await chat.sendStateTyping();
                        await delay(1000);
                        await client.sendMessage(msg.from, '🔊 Você escolheu uma *caixa de som*! Para mais detalhes, *clique abaixo* e fale com um de nossos atendentes:');
                        await delay(1000);
                        await chat.sendStateTyping();
                        await delay(1000);
                        await client.sendMessage(msg.from, 'Falar com atendente: https://ig.me/m/mobileon_');
                        setUserState(msg.from, WAITING_FOR_YES_NO);
                        await client.sendMessage(msg.from, 'Deseja retornar às opções? (sim ou não)');
                        break;
                        
                    case '6': // Outros
                        await delay(1000);
                        await chat.sendStateTyping();
                        await delay(1000);
                        await client.sendMessage(msg.from, 'Você escolheu *Outros*! Para mais informações,*clique abaixo* e fale com um de nossos atendentes:');
                        await delay(1000);
                        await chat.sendStateTyping();
                        await delay(1000);
                        await client.sendMessage(msg.from, 'Falar com atendente: https://ig.me/m/mobileon_');
                        setUserState(msg.from, WAITING_FOR_YES_NO);
                        await client.sendMessage(msg.from, 'Deseja retornar às opções? (sim ou não)');
                        break;
                        
                    default:
                        await sendInvalidOptionMessage(msg);
                        await client.sendMessage(msg.from, 'Por favor, escolha uma opção válida de 1 a 6.');
                        return;
                }
                return;
                
            case WAITING_FOR_YES_NO:
                const answer = msg.body.toLowerCase();
                
                if (answer === 'yes' || answer === 'sim' || answer === 'Sim' || answer === 'Quero' || answer === 'quero') {
                    await delay(1000);
                    await chat.sendStateTyping();
                    await delay(1000);
                    await client.sendMessage(msg.from, 'Por favor, digite uma das opções abaixo:\n\n1 - Trocas e Devoluções 🔄\n2 - Fotos de Produtos 📷\n3 - Preços de iphones 📱\n4 - Hórario de funcionamento 🕘\n5 - Reclamações e Sugestões 🗣️\n6 - Outros Assuntos 📝\n7 - Acesso VIP com Descontos Exclusivos 💎');
                    setUserState(msg.from, WAITING_FOR_OPTION);
                } else if (answer === 'no' || answer === 'não' || answer === 'nao'|| answer === 'Nao'|| answer === 'Não') {
                    await delay(1000);
                    await chat.sendStateTyping();
                    await delay(1000);
                    // Em vez de encerrar, pede uma avaliação
                    await client.sendMessage(msg.from, '⭐ *Antes de finalizarmos*, gostaríamos de saber sua opinião: como você avaliaria nosso atendimento?\n\n*Por favor, avalie nosso atendimento de 1 a 5, onde:*\n\n1 - *Muito ruim*\n2 - *Ruim*\n3 - *Regular*\n4 - *Bom*\n5 - *Excelente*\n\nSua opinião é muito importante para nós! 😊');
                    setUserState(msg.from, WAITING_FOR_RATING);
                } else {
                    await client.sendMessage(msg.from, 'Por favor, responda com "sim" ou "nao".');
                }
                return;
        }
        
        // Processamento para mensagens iniciais ou em estado não definido
        // Verificar se é uma saudação
        if (msg.body.match(/(menu|Menu|dia|tarde|noite|oi|Oi|Olá|olá|ola|Ola|bom|Bom|Boa|boa|Amigo|amigo|Amiga|amiga|Thiago|thiago|Tiago|tiago|Thi|thi|Ti|ti)/i) && msg.from.endsWith('@c.us')) {
            await delay(1000);
            await chat.sendStateTyping();
            await delay(1000);
            const contact = await msg.getContact();
            const name = contact.pushname || "Cliente";
            await client.sendMessage(msg.from,'Olá! '+ name.split(" ")[0] + ' Seja bem-vindo(a) à *Mobile on* 😀\n\nSou o assistente virtual e estou aqui pra te ajuda! 🤖\n\nPor favor, digite uma das opções abaixo:\n\n1 - Trocas e Devoluções 🔄\n2 - Fotos de Produtos 📷\n3 - Preços de iphones 📱\n4 - Hórario de funcionamento 🕘\n5 - Reclamações e Sugestões 🗣️\n6 - Outros Assuntos 📝\n7 - Acesso VIP com Descontos Exclusivos 💎');
            setUserState(msg.from, WAITING_FOR_OPTION);
            return;
        }
        
        // Processamento das opções do menu principal
        if (msg.from.endsWith('@c.us')) {
            switch(msg.body) {
                case '1': // Trocas e Devoluções
                    await delay(1000);
                    await chat.sendStateTyping();
                    await delay(1000);
                    await client.sendMessage(msg.from, '*Você pode trocar ou devolver seu produto em até 7 dias após a compra!*.\nLembre-se de que o produto deve estar na embalagem original, com todos os acessórios, o cupom de compra e sem sinais de uso.📦🔄\n\nPara mais informações ou para dar início ao processo, *clique abaixo* e fale com um de nossos atendentes.💬😊');
                    await delay(1000);
                    await chat.sendStateTyping();
                    await delay(1000);
                    await client.sendMessage(msg.from, 'Falar com atendente: https://ig.me/m/mobileon_');
                    setUserState(msg.from, WAITING_FOR_YES_NO);
                    await client.sendMessage(msg.from, 'Deseja retornar às opções? (sim ou não)');
                    break;
                    
                case '2': // Fotos de Produtos
                    await delay(1000);
                    await chat.sendStateTyping();
                    await delay(1000);
                    await client.sendMessage(msg.from, '*Que tipo de produto você está buscando?*\nEscolha uma das opções abaixo para que possamos te ajudar melhor!🔍\n\n1 - Capinhas 📲\n2 - Fones 🎧\n3 - Cabos 🔌\n4 - Carregadores 🔋\n5 - Caixa de Som 📻\n6 - Outros 🛒');
                    setUserState(msg.from, WAITING_FOR_PRODUCT_TYPE);
                    break;
                    
                case '3': // Preços de iPhones
                    await delay(1000);
                    await chat.sendStateTyping();
                    await delay(1000);
                    await client.sendMessage(msg.from, '⚠️ Informamos que *não* aceitamos aparelhos usados como forma de pagamento. Trabalhamos apenas com aparelhos novos, lacrados e com 1 ano de garantia.\n\nPara continuarmos, por favor nos diga o modelo que você procura. Exemplos: iPhone 13 128gb, iphone 12 64gb...');
                    setUserState(msg.from, WAITING_FOR_MODEL_INFO);
                    break;
                    
                case '4': // Horário de funcionamento
                    await delay(1000);
                    await chat.sendStateTyping();
                    await delay(1000);
                    await client.sendMessage(msg.from, '*⏰ Horário de Funcionamento:*\n\n📅Segunda a Sábado: 9h às 21h\n📅Domingo e Feriados: 9h às 15h\n\n💬Atendimento online também disponível via Instagram: @mobileon_');
                    await delay(1000);
                    await chat.sendStateTyping();
                    await delay(1000);
                    await client.sendMessage(msg.from, 'Falar com atendente: https://ig.me/m/mobileon_');
                    setUserState(msg.from, WAITING_FOR_YES_NO);
                    await client.sendMessage(msg.from, 'Deseja retornar às opções? (sim ou não)');
                    break;
                    
                case '5': // Reclamações e Sugestões
                    await delay(1000);
                    await chat.sendStateTyping();
                    await delay(1000);
                    await client.sendMessage(msg.from, '*📣 Gostaríamos de ouvir você!*\nVocê prefere registrar uma reclamação ou enviar uma sugestão para melhorar nossos serviços? 😊\n\n1 - Reclamação 😔\n2 - Sugestão 💡');
                    setUserState(msg.from, WAITING_FOR_FEEDBACK_TYPE);
                    break;
                    
                case '6': // Outros Assuntos
                    await delay(1000);
                    await chat.sendStateTyping();
                    await delay(1000);
                    await client.sendMessage(msg.from, 'Para outros assuntos, estamos à disposição!\n\n*Clique abaixo* e entre em contato diretamente com um de nossos atendentes. Estamos prontos para ajudar você! 😊');
                    await delay(1000);
                    await chat.sendStateTyping();
                    await delay(1000);
                    await client.sendMessage(msg.from, 'Falar com atendente: https://ig.me/m/mobileon_');
                    setUserState(msg.from, WAITING_FOR_YES_NO);
                    await client.sendMessage(msg.from, 'Deseja retornar às opções? (sim ou não)');
                    break;
                    
                case '7': // Acesso VIP
                    await delay(1000);
                    await chat.sendStateTyping();
                    await delay(1000);
                    await client.sendMessage(msg.from, '🎉 VOCÊ ACABA DE DESBLOQUEAR O ACESSO AO NOSSO CANAL VIP! 💎\n\nEssa é a sua chance de garantir ofertas secretas com descontos jamais vistos – produtos com preços imperdíveis que não são divulgados em lugar nenhum!\n\n✅ Totalmente GRÁTIS!\n✅ Descontos exclusivos para membros VIP!\n✅ Sem pegadinhas – só precisa estar dentro do canal!\n✅ Apenas informe o código promocional exibido no canal no ato da compra!\n\n🚨 Mas atenção: as ofertas são por tempo LIMITADO e com estoque reduzido.\n\n🔐 *Clique abaixo* e entre agora no canal VIP para não perder essas oportunidades únicas:');
                    await delay(1000);
                    await chat.sendStateTyping();
                    await delay(1000);
                    await client.sendMessage(msg.from, 'https://whatsapp.com/channel/0029Vb5nvdo3QxS7BjAkBk1z');
                    setUserState(msg.from, WAITING_FOR_YES_NO);
                    await client.sendMessage(msg.from, 'Deseja retornar às opções? (sim ou não)');
                    break;
                    
                default:
                    await sendInvalidOptionMessage(msg);
                    await client.sendMessage(msg.from, 'Por favor, escolha uma opção válida de 1 a 7.');
                    return;
            }
        }
        
    } catch (error) {
        console.error('Erro ao processar mensagem:', error);
        try {
            await client.sendMessage(msg.from, '🚨 *Desculpe, houve um pequeno erro ao processar sua mensagem.*\nPor favor, tente novamente mais tarde. Se o problema persistir, não hesite em entrar em contato com um de nossos atendentes! Agradecemos pela sua paciência. 😊');
        } catch (sendError) {
            console.error('Erro ao enviar mensagem de erro:', sendError);
        }
    }
    // Função para manter o bot ativo no Railway
function keepAlive() {
    console.log('Bot ativo: ' + new Date().toISOString());
}
// A cada 10 minutos, registra atividade para manter o serviço ativo
setInterval(keepAlive, 10 * 60 * 1000);
});