const { Client, MessageMedia, LocalAuth, Contact, Location, Buttons, List } = require('whatsapp-web.js');
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
const { json } = require('express/lib/response');

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

  Log('Mensagem recebida de ' + msg.from, "info", false);
  if(msg.hasMedia){
    Log("Recebido midia de " + msg.from,"info", true);
    return;
  }

if(msg.isStatus){
  Log("Recebido estatus","info", true);
  return;
}
if(msg.isGroup){
  Log("Recebido de grupo","info", true);
  return;
}

  var url = process.env.SITE_API;
  //Post with JSON
  var mensagem = new WppMensagem(msg.from, msg.body);
  var msgApi = new RespostaApi();
  msgApi.SetObj(mensagem);
  msgApi.SetSucesso(true);
  msgApi.SetMsg('Mensagem recebida');

  //Envia as mensagem recebida para o site
  request({
    url: url,
    method: "POST",
    json: true,   // <--Very important!!!
    body: msgApi//JSON.stringify(msgApi)
  }, function (error, response, body) {
    if (error != null) {
      Log("Houve um erro ao receber de " + url, "Erro", false);
      console.log(error);
    }
    if (body != null) {
      Log("Menssagem enviada com sucesso!", "info", false);
      console.log(body);
    }
    if (response != null) {
      Log("Menssagem enviada com sucesso!", "info", false);
      console.log(response);
    }
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

} else if (msg.body === '!buttons') {
        let button = new Buttons('Button body',[{body:'bt1'},{body:'bt2'},{body:'bt3'}],'title','footer');
        client.sendMessage(msg.from, button);
    } else if (msg.body === '!list') {
        let sections = [{title:'sectionTitle',rows:[{title:'ListItem1', description: 'desc'},{title:'ListItem2'}]}];
        let list = new List('List body','btnText',sections,'Title','footer');
        client.sendMessage(msg.from, list);

======================================*/
app.post('/send-message',/* [
  body('number').notEmpty(),
  body('message').notEmpty(),
],*/ async (req, res) => {

  Log("send-message Menssagem recebida do servidor!", "info", false);

  
  var resposta = new RespostaApi();
  /*
  const errors = validationResult(req).formatWith(({
    msg
  }) => {
    return msg;
  });
  if (!errors.isEmpty()) 
  {
    resposta.SetMsg("erro");
    resposta.SetErro(true)
    resposta.SetObj(errors);
    return res.status(422).json(resposta);
  }
/**/
  const number = phoneNumberFormatter(req.body.number);
  const message = req.body.message;
  const options = req.body.options;
  const isRegisteredNumber = await checkRegisteredNumber(number);

  if (!isRegisteredNumber) {
    resposta.SetMsg("Esta numero n??o ?? registrado")
    resposta.SetErro(true);
    return res.status(422).json(resposta);
  }
//test
var testMesg = message;
var sections = [];
try{
var jsonParsed = JSON.parse(req.body['options']).Value;

testMesg = JSON.parse(req.body['message']).Value;
sections = [{title:'Selecione a melhor op????o',rows:[/*{title:'ListItem1', description: 'desc'},{title:'ListItem2'}*/]}];

 if(jsonParsed != null){
  //options = JSON.parse(options);
  jsonParsed.forEach(element => {
   // testMesg += '\n'+element.key+'-*'+element.text+'*';
   var r = {title: element.key+'-'+element.text, description: element.text};
   sections[0].rows.push(r);
   });
 }
}catch{

  Log("erro ao ler o json", "erro", false);
}


  client.sendMessage(number, testMesg).then(response => {
   
    resposta.SetMsg("Enviado com sucesso!");
    resposta.SetErro(false);
    resposta.SetObj(response);
    Log("enviado a msg", "info", false);
    //enviar a lista  
    if(sections.length>0){
      let list = new List('Lista','Selecione',sections,'Escolha uma op??ao','footer');
      client.sendMessage(number, list);
      Log("Lista enviada", "info", false);
    } 
  


    return res.status(200).json(resposta);
  }).catch(err => {
    resposta.SetMsg("Erro ao enviar mensagem");
    resposta.SetErro(true);
    resposta.SetObj(err);
    return res.status(500).json(resposta);
  });
});

/*===========================================
  Send Midia
  number, caption, fileUrl
======================================*/
app.post('/send-media', async (req, res) => {

  Log("send-media Menssagem recebida do servidor!", "info", false);
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

  Log("send-location Menssagem recebida do servidor!", "info", false);
  const errors = validationResult(req).formatWith(({
    msg
  }) => {
    return msg;
  });

  var resposta = new RespostaApi();

  if (!errors.isEmpty()) {
    resposta.SetMsg("erro");
    resposta.SetErro(true);
    resposta.SetObj(errors.mapped());
    return res.status(422).json(resposta);
  }

  const number = phoneNumberFormatter(req.body.number);
  const latitude = req.body.latitude;
  const longitude = req.body.longitude;
  const msg = req.body.message;

  const isRegisteredNumber = await checkRegisteredNumber(number);

  if (!isRegisteredNumber) {
    resposta.SetMsg("N??mero n??o registrado");
    resposta.SetErro(true);
    return res.status(422).json(resposta);
  }
  const location = new Location(latitude, longitude, msg);
  client.sendMessage(number, location).then(response => {
    resposta.SetMsg("Enviado com sucesso!");
    resposta.SetErro(false);
    resposta.SetObj(response);
    return res.status(200).json(resposta);
  }).catch(err => {
    resposta.SetMsg("erro");
    resposta.SetErro(true);
    resposta.SetObj(err);
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
  Log("send-contact Menssagem recebida do servidor!", "info", false);
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
var con = client.getContactById(contact);

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
 // client.sendMessage(number, vCard, { parseVCards: false }).then(response => {
   client.sendMessage(number, con).then(response=>{
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


function Log(msg, tipo = 'info', useConsole) {
  var data = new Date().toISOString().replace(/T/, ' ').replace(/\..+/, '');
  var l = data+ ':(' + tipo + '):' + msg;
  if (useConsole)
    console.log(l);
  io.emit('message', l);
}