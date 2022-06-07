const { Client, MessageMedia, LocalAuth, Contact, Location, Buttons } = require('whatsapp-web.js');
const express = require('express');
const { body, validationResult } = require('express-validator');
const socketIO = require('socket.io');
const qrcode = require('qrcode');
const http = require('http');
const fs = require('fs');
const { phoneNumberFormatter } = require('./helpers/formatter');
const fileUpload = require('express-fileupload');
const axios = require('axios');
const mime = require('mime-types');
const { WppMensagem } = require('./Msg');
const RespostaApi = require("./RespostaApi");
var request = require('request');

if (process.env.NODE_ENV !== 'production') {
  require('dotenv').config();
}

const port = process.env.PORT || 3333;

const app = express();
const server = http.createServer(app);
const io = socketIO(server, {
  allowEIO3: true,
});

app.use(express.json());
app.use(express.urlencoded({
  extended: true
}));
app.use(fileUpload({
  debug: true
}));

app.get('/', (req, res) => {
  res.sendFile('index.html', {
    root: __dirname
  });
});

const client = new Client({
  restartOnAuthFail: true,
  puppeteer: {
    headless: true,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-accelerated-2d-canvas',
      '--no-first-run',
      '--no-zygote',
      '--single-process', // <- this one doesn't works in Windows
      '--disable-gpu'
    ],
  },
  authStrategy: new LocalAuth({
    clientId: 'servidor'
  })
});

client.on('message', msg => {


  var url = process.env.SITE_API;
 //Post with JSON
var mensagem = new WppMensagem(msg.from, msg.body);
  var msgApi = new RespostaApi();
  msgApi.SetObj(mensagem);
  msgApi.SetSucesso(true);
  msgApi.SetMsg('Mensagem recebida');
  io.emit('message', 'Mensagem recebida de ' + msg.from );
    //Envia as mensagem recebida para o site
   request({
      url:url,
      method: "POST",
      json: true,   // <--Very important!!!
      body: msgApi//JSON.stringify(msgApi)
  }, function (error, response, body)
  {
    console.log(error);
    console.log(body);
      console.log(response);
      io.emit('message', 'Servidor respondeu correto!');
  });

  //msg.reply("Oiiii, sua linda!@"+msg.from);
 // console.log(msg);


  



  /* if (msg.body == '!ping') {
     msg.reply('pong');
   } else if (msg.body == 'good morning') {
     msg.reply('selamat pagi');
   } else if (msg.body == '!groups') {
     client.getChats().then(chats => {
       const groups = chats.filter(chat => chat.isGroup);
 
       if (groups.length == 0) {
         msg.reply('You have no group yet.');
       } else {
         let replyMsg = '*YOUR GROUPS*\n\n';
         groups.forEach((group, i) => {
           replyMsg += `ID: ${group.id._serialized}\nName: ${group.name}\n\n`;
         });
         replyMsg += '_You can use the group id to send a message to the group._'
         msg.reply(replyMsg);
       }
     });
   
   }
 
   // Downloading media
   if (msg.hasMedia) {
     msg.downloadMedia().then(media => {
       // To better understanding
       // Please look at the console what data we get
       console.log(media);
 
       if (media) {
         // The folder to store: change as you want!
         // Create if not exists
         const mediaPath = './downloaded-media/';
 
         if (!fs.existsSync(mediaPath)) {
           fs.mkdirSync(mediaPath);
         }
 
         // Get the file extension by mime-type
         const extension = mime.extension(media.mimetype);
         
         // Filename: change as you want! 
         // I will use the time for this example
         // Why not use media.filename? Because the value is not certain exists
         const filename = new Date().getTime();
 
         const fullFilename = mediaPath + filename + '.' + extension;
 
         // Save to file
         try {
           fs.writeFileSync(fullFilename, media.data, { encoding: 'base64' }); 
           console.log('File downloaded successfully!', fullFilename);
         } catch (err) {
           console.log('Failed to save the file:', err);
         }
       }
     });
   }  /**/
});

client.initialize();

// Socket IO
io.on('connection', function (socket) {
  socket.emit('message', 'Connecting...');

  client.on('qr', (qr) => {
    console.log('QR RECEIVED', qr);
    qrcode.toDataURL(qr, (err, url) => {
      socket.emit('qr', url);
      socket.emit('message', 'QR Code received, scan please!');
    });
  });

  client.on('ready', () => {
    socket.emit('ready', 'Whatsapp is ready!');
    socket.emit('message', 'Whatsapp is ready!');
  });

  client.on('authenticated', () => {
    socket.emit('authenticated', 'Whatsapp is authenticated!');
    socket.emit('message', 'Whatsapp is authenticated!');
    console.log('AUTHENTICATED');
  });

  client.on('auth_failure', function (session) {
    socket.emit('message', 'Auth failure, restarting...');
  });

  client.on('disconnected', (reason) => {
    socket.emit('message', 'Whatsapp is disconnected!');
    client.destroy();
    client.initialize();
  });
});


const checkRegisteredNumber = async function (number) {
  const isRegistered = await client.isRegisteredUser(number);
  return isRegistered;
}


const findGroupByName = async function (name) {
  const group = await client.getChats().then(chats => {
    return chats.find(chat =>
      chat.isGroup && chat.name.toLowerCase() == name.toLowerCase()
    );
  });
  return group;
}











/*===========================================
  Send msg
  number, message
======================================*/
app.post('/send-message', [
  body('number').notEmpty(),
  body('message').notEmpty(),
], async (req, res) => {
  const errors = validationResult(req).formatWith(({
    msg
  }) => {
    return msg;
  });
  var resposta = new RespostaApi();

  if (!errors.isEmpty()) {
    resposta.SetMsg("erro").SetErro(true).SetObj(errors);
    return res.status(422).json(resposta);
  }

  const number = phoneNumberFormatter(req.body.number);
  const message = req.body.message;

  const isRegisteredNumber = await checkRegisteredNumber(number);

  if (!isRegisteredNumber) {
    resposta.SetMsg("The number is not registered'").SetErro(true);
    return res.status(422).json(resposta);
  }

  client.sendMessage(number, message).then(response => {
    resposta.SetMsg("Enviado com sucesso!").SetErro(false).SetObj(response);
    return res.status(200).json(resposta);
  }).catch(err => {
    resposta.SetMsg("Erro ao enviar mensagem").SetErro(true).SetObj(err);
    return res.status(500).json(resposta);
  });
});

/*===========================================
  Send Midia
  number, caption, fileUrl
======================================*/
app.post('/send-media', async (req, res) => {
  const number = phoneNumberFormatter(req.body.number);
  const caption = req.body.caption;
  const fileUrl = req.body.file;

  // const media = MessageMedia.fromFilePath('./image-example.png');
  // const file = req.files.file;
  // const media = new MessageMedia(file.mimetype, file.data.toString('base64'), file.name);
  let mimetype;
  const attachment = await axios.get(fileUrl, {
    responseType: 'arraybuffer'
  }).then(response => {
    mimetype = response.headers['content-type'];
    return response.data.toString('base64');
  });

  const media = new MessageMedia(mimetype, attachment, 'Media');

  client.sendMessage(number, media, {
    caption: caption
  }).then(response => {
    res.status(200).json({
      status: true,
      response: response
    });
  }).catch(err => {
    res.status(500).json({
      status: false,
      response: err
    });
  });
});

/*======================================
  Enviar localizacao
  number, latitude, longitude, message
========================================= */
app.post('/send-location', [
  body('number').notEmpty(),
  body('latitude').notEmpty(),
  body('longitude').notEmpty(),
  body('message').notEmpty(),
], async (req, res) => {
  const errors = validationResult(req).formatWith(({
    msg
  }) => {
    return msg;
  });

  var resposta = new RespostaApi();

  if (!errors.isEmpty()) {
    resposta.SetMsg("erro").SetErro(true).SetObj(errors.mapped());
    return res.status(422).json(resposta);
  }

  const number = phoneNumberFormatter(req.body.number);
  const latitude = req.body.latitude;
  const longitude = req.body.longitude;
  const msg = req.body.message;

  const isRegisteredNumber = await checkRegisteredNumber(number);

  if (!isRegisteredNumber) {
    resposta.SetMsg("Número não registrado").SetErro(true);
    return res.status(422).json(resposta);
  }
  const location = new Location(latitude, longitude, msg);
  client.sendMessage(number, location).then(response => {
    resposta.SetMsg("Enviado com sucesso!").SetErro(false).SetObj(response);
    return res.status(200).json(resposta);
  }).catch(err => {
    resposta.SetMsg("erro").SetErro(true).SetObj(err);
    return res.status(422).json(resposta);
  });
});

/*===========================================
  enviar contato
  number, message
======================================*/
app.post('/send-contact', [
  body('number').notEmpty(),
  body('contact').notEmpty(),
  body('name').notEmpty(),
], async (req, res) => {
  const errors = validationResult(req).formatWith(({
    msg
  }) => {
    return msg;
  });

  if (!errors.isEmpty()) {
    return res.status(422).json({
      status: false,
      message: errors.mapped()
    });
  }

  const number = phoneNumberFormatter(req.body.number);
  const contact = phoneNumberFormatter(req.body.contact);
  const contactName = req.body.contact;

  const isRegisteredNumber = await checkRegisteredNumber(number);

  if (!isRegisteredNumber) {
    return res.status(422).json({
      status: false,
      message: 'The number is not registered'
    });
  }

  const vCard = `BEGIN:VCARD
  VERSION:3.0
  FN;CHARSET=UTF-8:`+ contactName + `
  N;CHARSET=UTF-8:;;;;
  EMAIL;CHARSET=UTF-8;type=HOME,INTERNET:
  TEL;TYPE=HOME,VOICE:`+ contact + `
  REV:2021-06-06T02:35:53.559Z
  END:VCARD`;
  //await client.sendMessage(remoteId, vCard, {parseVCards: false});
  client.sendMessage(number, vCard, { parseVCards: false }).then(response => {
    res.status(200).json({
      status: true,
      response: response
    });
  }).catch(err => {
    res.status(500).json({
      status: false,
      response: err
    });
  });
});


// Send message to group
// You can use chatID or group name, yea!
/*===========================================
  Enviar em grupo mensagem
======================================*/
app.post('/send-group-message', [
  body('id').custom((value, { req }) => {
    if (!value && !req.body.name) {
      throw new Error('Invalid value, you can use `id` or `name`');
    }
    return true;
  }),
  body('message').notEmpty(),
], async (req, res) => {
  const errors = validationResult(req).formatWith(({
    msg
  }) => {
    return msg;
  });

  if (!errors.isEmpty()) {
    return res.status(422).json({
      status: false,
      message: errors.mapped()
    });
  }

  let chatId = req.body.id;
  const groupName = req.body.name;
  const message = req.body.message;

  // Find the group by name
  if (!chatId) {
    const group = await findGroupByName(groupName);
    if (!group) {
      return res.status(422).json({
        status: false,
        message: 'No group found with name: ' + groupName
      });
    }
    chatId = group.id._serialized;
  }

  client.sendMessage(chatId, message).then(response => {
    res.status(200).json({
      status: true,
      response: response
    });
  }).catch(err => {
    res.status(500).json({
      status: false,
      response: err
    });
  });
});

// Clearing message on spesific chat
/*===========================================
  Limpar mensagem
======================================*/
app.post('/clear-message', [
  body('number').notEmpty(),
], async (req, res) => {
  const errors = validationResult(req).formatWith(({
    msg
  }) => {
    return msg;
  });

  if (!errors.isEmpty()) {
    return res.status(422).json({
      status: false,
      message: errors.mapped()
    });
  }

  const number = phoneNumberFormatter(req.body.number);

  const isRegisteredNumber = await checkRegisteredNumber(number);

  if (!isRegisteredNumber) {
    return res.status(422).json({
      status: false,
      message: 'The number is not registered'
    });
  }

  const chat = await client.getChatById(number);

  chat.clearMessages().then(status => {
    res.status(200).json({
      status: true,
      response: status
    });
  }).catch(err => {
    res.status(500).json({
      status: false,
      response: err
    });
  })
});

server.listen(port, function () {
  console.log('App running on *: ' + port);
});