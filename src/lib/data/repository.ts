import type { EntradaCheckup, ResultadoCheckup } from "../domain/checkup"
import type {
  Acao,
  Atribuicao,
  Configuracao,
  RadarSnapshot,
  ResultadoAds,
  StatusAcao,
} from "../domain/types"

/**
 * Interface de repositório: o store só conversa com isto. A implementação de
 * produção é `api-repository.ts` (fetch aos route handlers; o navegador nunca
 * fala com o banco). Operações granulares, nunca "salvar o snapshot inteiro".
 */
export interface RadarRepository {
  carregar(): Promise<RadarSnapshot>
  registrarAcao(acao: Acao): Promise<void>
  atualizarStatusAcao(id: string, status: StatusAcao): Promise<void>
  salvarCheckup(input: {
    id: string
    clientId: string
    data: string
    entradas: EntradaCheckup[]
    resultadoAds?: ResultadoAds
  }): Promise<ResultadoCheckup>
  atualizarFrente(
    id: string,
    campos: { prazoDias?: number; criticoAposDias?: number }
  ): Promise<void>
  atribuir(atribuicao: Atribuicao): Promise<void>
  atualizarConfiguracao(parcial: Partial<Configuracao>): Promise<Configuracao>
  importar(dataset: RadarSnapshot): Promise<RadarSnapshot>
  resetar(): Promise<RadarSnapshot>
}

/** Falha de uma chamada à API (HTTP ou rede). */
export class ErroApi extends Error {
  constructor(
    readonly status: number,
    readonly codigo: string,
    mensagem: string
  ) {
    super(mensagem)
    this.name = "ErroApi"
  }
}

export const CODIGO_BANCO_NAO_CONFIGURADO = "BANCO_NAO_CONFIGURADO"
