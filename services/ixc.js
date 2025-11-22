// AplicativoFIber/services/ixc.js
const axios = require("axios");
const { Buffer } = require("node:buffer");
const md5 = require("md5"); // Biblioteca para hashing MD5

class IXCService {
  constructor() {
    this.apiUrl =
      process.env.IXC_API_URL || "https://SEU_DOMINIO/webservice/v1";
    this.adminToken = process.env.IXC_ADMIN_TOKEN;

    // Geração do token Basic (Base64) a partir do token administrativo
    const tokenBase64 = this.adminToken
      ? Buffer.from(this.adminToken).toString("base64")
      : "";

    this.api = axios.create({
      baseURL: this.apiUrl,
      headers: {
        "Content-Type": "application/json",
        Authorization: `Basic ${tokenBase64}`,
      },
      timeout: 15000,
    });
  }

  // Método base para listar (GET/READ - Usa POST com header 'listar')
  async list(endpoint, data) {
    try {
      const response = await this.api.post(endpoint, data, {
        headers: { ixcsoft: "listar" },
      });
      return response.data;
    } catch (error) {
      console.error(`[IXC] Erro ao listar ${endpoint}:`, error.message);
      return { total: 0, registros: [] };
    }
  }

  // Método base para postar ações (POST/CREATE/UPDATE/DELETE)
  async post(endpoint, data, actionHeader = "") {
    try {
      const headers = {};
      if (actionHeader) {
        headers.ixcsoft = actionHeader;
      }
      const response = await this.api.post(endpoint, data, { headers });
      return response.data;
    } catch (error) {
      console.error(
        `[IXC] Erro ao postar ${endpoint} (${actionHeader || "post"}):`,
        error.message
      );
      // Re-lança o erro para ser tratado no Controller
      throw error;
    }
  }

  // =========================================================
  // 🔑 AUTENTICAÇÃO
  // =========================================================

  /**
   * 1. Busca Cliente (para Autenticação)
   * @desc Usa Email ou CPF/CNPJ para buscar o cliente e validar a senha.
   */
  async findClienteByLogin(login) {
    // Lógica para determinar se o login é um documento ou email
    const apenasNumeros = login.replace(/\D/g, "");
    const isCpf = /^\d{11}$|^\d{14}$/.test(apenasNumeros);

    let campoBusca = isCpf ? "cliente.cnpj_cpf" : "cliente.hotsite_email";
    let valorBusca = isCpf ? apenasNumeros : login; // Sem formatação se for documento

    const payload = {
      qtype: campoBusca,
      query: valorBusca,
      oper: "=",
      page: "1",
      rp: "1",
      sortname: "cliente.id",
      sortorder: "desc",
    };

    let resultado = await this.list("/cliente", payload);

    // Se a busca falhar com número, tenta buscar documentos formatados no IXC (opcional)
    if (isCpf && resultado.total === 0) {
      // Tentativa de buscar o cliente caso o IXC precise do documento formatado
      const docFormatado =
        apenasNumeros.length === 11
          ? apenasNumeros.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, "$1.$2.$3-$4")
          : apenasNumeros.replace(
              /(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/,
              "$1.$2.$3/$4-$5"
            );

      payload.query = docFormatado;
      resultado = await this.list("/cliente", payload);
    }

    return resultado.total > 0 ? resultado.registros[0] : null;
  }

  async login(login, senha) {
    const cliente = await this.findClienteByLogin(login);

    if (!cliente) {
      return null; // Cliente não encontrado
    }

    // A senha do hotsite no IXC é armazenada em MD5
    const senhaHashed = md5(senha);

    if (cliente.hotsite_senha === senhaHashed) {
      return {
        id: cliente.id,
        nome: cliente.nome,
        email: cliente.hotsite_email,
        cpf_cnpj: cliente.cnpj_cpf,
      };
    }

    return null; // Senha incorreta
  }

  // =========================================================
  // 📚 DADOS DO CLIENTE (Após Autenticação)
  // =========================================================

  /**
   * 2. Busca Dados Cadastrais do Cliente
   */
  async getCliente(clienteId) {
    const payload = {
      qtype: "cliente.id",
      query: clienteId,
      oper: "=",
      page: "1",
      rp: "1",
      // Solicita campos detalhados do cadastro (baseado em cliente.php)
      campos:
        "cliente.nome, cliente.fantasia, cliente.cnpj_cpf, cliente.email, cliente.celular, cliente.cep, cliente.endereco, cliente.numero, cliente.complemento, cliente.bairro, cliente.cidade, cliente.estado, cliente.status_hot",
    };

    const resultado = await this.list("/cliente", payload);
    return resultado.registros[0] || null;
  }

  /**
   * 3. Busca Contrato (o mais recente)
   */
  async getContrato(clienteId) {
    const payload = {
      qtype: "cliente_contrato.id_cliente",
      query: clienteId,
      oper: "=",
      page: "1",
      rp: "1",
      sortname: "cliente_contrato.data_ativacao", // Pega o mais recente
      sortorder: "desc",
      // Campos essenciais
      campos:
        "cliente_contrato.id, cliente_contrato.contrato, cliente_contrato.data_ativacao, cliente_contrato.data_cancelamento, cliente_contrato.status, vd_contrato_plano_c.plano_venda, cliente_contrato.data_venc_contrato, cliente_contrato.descricao_aux_plano_venda",
    };

    const resultado = await this.list("/cliente_contrato", payload);
    return resultado.registros[0] || null;
  }

  /**
   * 4. Busca Dados de Conexão (radusuarios)
   * @desc Usado para pegar o login PPPoE/Radius.
   */
  async getDadosConexao(clienteId) {
    const payload = {
      qtype: "radusuarios.id_cliente",
      query: clienteId,
      oper: "=",
      page: "1",
      rp: "1",
      sortname: "radusuarios.id",
      sortorder: "desc",
      // Campos essenciais
      campos:
        "radusuarios.id, radusuarios.login, radusuarios.tipo_conexao, radusuarios.ativo, radusuarios.online, radusuarios.id_contrato, radusuarios.contrato_plano_venda_",
    };

    const resultado = await this.list("/radusuarios", payload);
    return resultado.registros[0] || null;
  }

  /**
   * 5. Busca Faturas (fn_areceber)
   * @desc Inclui campos para linha digitável, link de gateway e Pix (como solicitado).
   */
  async getFaturas(clienteId) {
    const payload = {
      qtype: "fn_areceber.id_cliente",
      query: clienteId,
      oper: "=",
      page: "1",
      rp: "10", // Limita a 10 faturas
      sortname: "fn_areceber.data_vencimento",
      sortorder: "desc",
      campos:
        "fn_areceber.id," +
        "fn_areceber.valor," +
        "fn_areceber.status," +
        "fn_areceber.data_vencimento," +
        "fn_areceber.linha_digitavel," + // Código de Barras
        "fn_areceber.gateway_link," + // Link do Gateway (pode ser o link do boleto ou QR Code)
        "fn_areceber.pix_txid", // TXID do Pix
    };

    const resultado = await this.list("/fn_areceber", payload);
    return resultado.registros || [];
  }
}

module.exports = new IXCService();
