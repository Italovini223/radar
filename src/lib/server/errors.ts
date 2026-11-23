/**
 * Erros do servidor. `ErroApp` carrega status HTTP e código estável para a
 * resposta JSON; qualquer outro erro vira 500 genérico (detalhes só no log).
 */
export interface CampoInvalido {
  caminho: string
  mensagem: string
}

export class ErroApp extends Error {
  constructor(
    readonly status: number,
    readonly codigo: string,
    mensagem: string,
    readonly campos?: CampoInvalido[]
  ) {
    super(mensagem)
    this.name = new.target.name
  }
}

/** Faltam SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY no servidor. */
export class BancoNaoConfiguradoError extends ErroApp {
  constructor() {
    super(503, "BANCO_NAO_CONFIGURADO", "Banco de dados não configurado.")
  }
}

export class ErroEntrada extends ErroApp {
  constructor(mensagem = "Dados inválidos.", campos?: CampoInvalido[]) {
    super(400, "ENTRADA_INVALIDA", mensagem, campos)
  }
}

export class ErroNaoEncontrado extends ErroApp {
  constructor(entidade: string) {
    super(404, "NAO_ENCONTRADO", `${entidade} não encontrado(a).`)
  }
}

export class ErroConflito extends ErroApp {
  constructor(mensagem: string) {
    super(409, "CONFLITO", mensagem)
  }
}

/** Entrada válida no formato, mas que quebra uma regra do domínio. */
export class ErroRegra extends ErroApp {
  constructor(mensagem: string) {
    super(422, "REGRA_INVALIDA", mensagem)
  }
}

/** Falha do banco (rede, constraint, permissão). Nunca vai para o cliente. */
export class ErroBanco extends Error {
  constructor(mensagem: string) {
    super(mensagem)
    this.name = "ErroBanco"
  }
}
