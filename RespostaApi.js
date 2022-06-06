

class RespostaApi 
{

    constructor(requisicao = null) 
    {
        if(requisicao != null)
        {
           // try
           // {
               // console.error("json->: "+requisicao.body);
               // console.error(requisicao.body);
                var apiMsg = requisicao.body.data;// JSON.parse(requisicao.body['data']);
                //console.error("Corpo->: "+apiMsg);
                this.token = apiMsg.token;
                this.error = apiMsg.erro;
                this.sucess = apiMsg.sucesso;
                this.msg = apiMsg.msg;
                this.obj = apiMsg.obj;
                this.tipo = apiMsg.tipo;
                this.codigo = apiMsg.codigo;
                this.IsValid();
           // }catch
           // {
//console.log("Erro");
           // }          
        }
        else
        {
            this.token = "adriano";
            this.error = true;
            this.sucess = false;
            this.msg = "";
            this.obj = null;
            this.tipo = 'response';//response, requeste
            this.codigo = 0;
        }
    }

    IsValid()
    { 
        if(this.tipo == 'request'){
            var tokenTeste = "adriano";
            this.msg = "Token invalido, por favor entre em contado com suporte";
            this.SetErro(true);
            this.SetObj(null);
            return this.token == tokenTeste;
        }
        else
        {
            return true;
        }        
    }

    async SetObj(value)
    {
        this.obj = value;
        return this;
    }
    async SetMsg(value) {
        this.msg = value;
        this.tipo = 'response';
        return this;
    }
    async SetErro(value) {
        this.error = value;
        this.sucess = !value;
        return this;
    }
    async SetSucesso(value) {
        this.sucess = value;
        this.error = !value;
        return this;
    }
    async Send(response)
    {

        var data = {'data':this};
       await response.json(JSON.stringify(data));
    }
}

module.exports = RespostaApi;