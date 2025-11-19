const axios = require("axios");
const { Buffer } = require("node:buffer"); // Garante compatibilidade total

class IXCService {
  constructor() {
    // Configuração inicial lendo do .env
    this.apiUrl =
      process.env.IXC_API_URL || "https://centralfiber.online/webservice/v1";
    this.token = process.env.IXC_ADMIN_TOKEN;

    // Criação do Cliente Axios otimizado
    const tokenBase64 = this.token
      ? Buffer.from(this.token).toString("base64")
      : "";

    this.api = axios.create({
      baseURL: this.apiUrl,
      headers: {
        "Content-Type": "application/json",
        Authorization: `Basic ${tokenBase64}`,
      },
      timeout: 20000, // 20 segundos de tolerância
    });
  }

  /**
   * Método POST genérico para endpoints de LISTAGEM
   * Adiciona o header obrigatório 'ixcsoft: listar'
   */
  async postList(endpoint, payload) {
    try {
      const response = await this.api.post(endpoint, payload, {
        headers: { ixcsoft: "listar" },
      });
      return response.data;
    } catch (error) {
      console.error(`[IXC] Erro ao listar ${endpoint}:`, error.message);
      // Retorna objeto vazio seguro para não quebrar o servidor
      return { total: 0, registros: [] };
    }
  }

  /**
   * Busca cliente por Login (Email ou CPF)
   * Implementa a lógica de dupla verificação do CPF
   */
  async findClienteByLogin(loginInput) {
    // Remove tudo que não é número
    const numeros = loginInput.replace(/\D/g, "");
    const isCpf = numeros.length === 11 || numeros.length === 14;

    // Define estratégia de busca
    let campoBusca = isCpf ? "cliente.cnpj_cpf" : "cliente.hotsite_email";
    let valorBusca = isCpf ? numeros : loginInput;

    const payload = {
      qtype: campoBusca,
      query: valorBusca,
      oper: "=",
      page: "1",
      rp: "1",
      sortname: "cliente.id",
      sortorder: "desc",
    };

    // TENTATIVA 1: Busca exata (CPF Limpo ou Email)
    let resultado = await this.postList("/cliente", payload);

    // TENTATIVA 2: Se for CPF e falhou, tenta FORMATADO (xxx.xxx.xxx-xx)
    if (isCpf && resultado.total === 0) {
      // Formata CPF ou CNPJ
      let valorFormatado = numeros;
      if (numeros.length === 11) {
        valorFormatado = numeros.replace(
          /(\d{3})(\d{3})(\d{3})(\d{2})/,
          "$1.$2.$3-$4"
        );
      } else if (numeros.length === 14) {
        valorFormatado = numeros.replace(
          /(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/,
          "$1.$2.$3/$4-$5"
        );
      }

      console.log(`[IXC] Tentando CPF formatado: ${valorFormatado}`);
      payload.query = valorFormatado;
      resultado = await this.postList("/cliente", payload);
    }

    // Retorna o primeiro registro ou null
    return resultado.total > 0 ? resultado.registros[0] : null;
  }

  /**
   * Busca o contrato principal ativo
   */
  async findContratoAtivo(clienteId) {
    const payload = {
      qtype: "cliente_contrato.id_cliente",
      query: clienteId,
      oper: "=",
      page: "1",
      rp: "1",
      sortname: "cliente_contrato.data_ativacao",
      sortorder: "desc", // Pega o mais recente
    };

    const resultado = await this.postList("/cliente_contrato", payload);

    // Retorna dados seguros mesmo se não achar
    return resultado.total > 0
      ? resultado.registros[0]
      : { id: "0", status: "Desconhecido" };
  }

  /**
   * Busca faturas (Abertas e Pagas)
   */
  async getFaturas(clienteId) {
    const payload = {
      qtype: "fn_areceber.id_cliente",
      query: clienteId,
      oper: "=",
      page: "1",
      rp: "20",
      sortname: "fn_areceber.data_vencimento",
      sortorder: "desc",
    };
    const resultado = await this.postList("/fn_areceber", payload);
    return resultado.registros || [];
  }

  /**
   * Busca PDF do Boleto
   */
  async getBoletoBase64(boletoId) {
    try {
      const payload = {
        boletos: boletoId,
        atualiza_boleto: "S",
        tipo_boleto: "arquivo",
        base64: "S",
      };
      // Nota: get_boleto NÃO usa o header 'listar'
      const response = await this.api.post("/get_boleto", payload);
      return response.data;
    } catch (error) {
      console.error("[IXC] Erro ao baixar boleto:", error.message);
      throw error;
    }
  }

  /**
   * Busca Login PPPoE (Para integração GenieACS)
   */
  async getPppoeLogin(clienteId) {
    const payload = {
      qtype: "radusuarios.id_cliente",
      query: clienteId,
      oper: "=",
      page: "1",
      rp: "1",
    };
    const resultado = await this.postList("/radusuarios", payload);
    return resultado.total > 0 ? resultado.registros[0].login : null;
  }
}

// Exporta uma instância pronta para uso
module.exports = new IXCService();
