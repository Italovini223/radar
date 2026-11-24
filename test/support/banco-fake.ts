// O fake dos testes é o mesmo banco em memória usado no modo de desenvolvimento.
export {
  BancoMemoria as BancoFake,
  type Operacao,
} from "@/lib/server/banco-memoria"
