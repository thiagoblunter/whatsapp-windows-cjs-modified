
const { default: makeWASocket, useSingleFileAuthState, DisconnectReason } = require('@whiskeysockets/baileys');
const { Boom } = require('@hapi/boom');
const fs = require('fs');

const { state, saveState } = useSingleFileAuthState('./auth_info.json');

async function iniciarBot() {
  const sock = makeWASocket({
    auth: state,
    printQRInTerminal: true,
  });

  sock.ev.on('creds.update', saveState);

  sock.ev.on('messages.upsert', async (m) => {
    const msg = m.messages[0];

    if (!msg.message || msg.key.fromMe) return;

    const mensagemTexto =
      msg.message?.conversation ||
      msg.message?.extendedTextMessage?.text ||
      '';

    const numero = msg.key.remoteJid;

    console.log(`Mensagem de ${numero}: ${mensagemTexto}`);

    if (mensagemTexto.includes('Acesso VIP com Descontos Exclusivos')) {
      await sock.sendMessage(numero, {
        text: '🎉 Bem-vindo ao canal VIP! Aqui estão seus descontos exclusivos. Aproveite!',
      });
    } else {
      await sock.sendMessage(numero, {
        text: '👋 Olá! Envie *Acesso VIP com Descontos Exclusivos* para entrar no nosso canal com ofertas exclusivas.',
      });
    }
  });

  sock.ev.on('connection.update', (update) => {
    const { connection, lastDisconnect } = update;
    if (connection === 'close') {
      const shouldReconnect =
        lastDisconnect?.error?.output?.statusCode !== DisconnectReason.loggedOut;
      console.log('Conexão encerrada. Reconectando:', shouldReconnect);
      if (shouldReconnect) {
        iniciarBot();
      }
    } else if (connection === 'open') {
      console.log('✅ Conectado com sucesso!');
    }
  });
}

iniciarBot();
