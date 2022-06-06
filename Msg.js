

class WppMensagem 
{
    constructor(_from, _msg = '') 
    {
        this.id = 0;
        this.msg = _msg;
        this.resposta = "";
        this.from = _from;
        this.entregue = false;
        this.contato = new Contato();
        this.localizacao = new Localizacao();
        this.linkPreview = new LinkPreview();
        this.button = new Button();
        this.imagem = new Arquivo();
        this.arquivo = new Arquivo();
        this.tipo = 'text';//text, img, contato, localizacao, button, link
    }

    CopyFrom(otter) 
    {
        this.id = otter.id;
        this.msg = otter.msg;
        this.resposta = otter.resposta;
        this.from = otter.from;
        this.entregue = otter.entregue;
        this.contato = otter.contato;
        this.localizacao = otter.localizacao;
        this.linkPreview = otter.linkPreview;
        this.imagem = otter.imagem;
        this.arquivo = otter.arquivo;
        this.tipo = otter.tipo;
        this.button = new Button(otter.button);
        console.log('Copiando msg');
        return this;
    }
    async Send(client) 
    {
        switch (this.tipo) 
        {
            case 'text': return this.SendText(client);
            case 'img': return this.sendImage(client);
            case 'contato': return this.sendContactVcard(client);
            case 'localizacao': return this.SendLocalizacao(client);
            case 'button': return this.SendButtons(client);
            default: return this.SendText(client);
        }
    }


    async SendText(client) {
       return null;
    }

    async SendListButtons(client) {
        
        return null;
    }

    async SendButtons(client) 
    {
        return null;
    }

    async SendContato(client) 
    {
        return null;
    }

    async SendLocalizacao(client) {
       
        return null;
    }


    async SendLinkPreview(client) 
    {
        return null;
    }

    async SendFile(client) 
    {
        return null;
    }

    async SendFileFromBase64(client)
    {
        return null;
    }

    async SendImage(client)
    {
        return null;
    }
}

class Contato {
    constructor() {
        this.numero = "";
        this.nome = "";
    }
}

class Localizacao {
    constructor() {
        this.latitude = '';
        this.longitude = '';
        this.titulo = '';
    }
}

class LinkPreview {
    constructor() {
        this.link = '';
        this.descricao = '';
    }
}

class Arquivo {
    constructor() {
        this.caminho = '';
        this.nome = '';
        this.descricao = '';
    }
}


class ButtonText {
    constructor(text = '') {
        this.displayText = text;
    }
}


class Button {
    constructor(otter = null) {

        if (otter != null) {
            this.title = otter.title;
            this.description = otter.description;
            this.buttonText = otter.buttonText;
        }
        else {
            this.title = "";
            this.description = "";
            this.buttonText = [];
        }
    }

    AddButton(text) {
        this.buttonText.push(new this.buttonText(text))
    }

    GetButtons() {
        var retVal = [];
        this.buttonText.forEach(btn => {
            retVal.push(
                {
                    "buttonText":
                    {
                        "displayText": btn.displayText
                    }
                });
        });

        return retVal;
    }
}

module.exports.WppMensagem = WppMensagem;
module.exports.Contato = Contato;
module.exports.Localizacao = Localizacao;
module.exports.LinkPreview = LinkPreview;
module.exports.Arquivo = Arquivo;
module.exports.buttonText = ButtonText;
module.exports.Button = Button;
