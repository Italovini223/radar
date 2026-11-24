"use client"

import { useMemo, useRef, useState } from "react"

import { GradeTable } from "@/components/grade/grade-table"
import { Legend } from "@/components/grade/legend"
import { Dica } from "@/components/ui/dica"
import {
  ComDados,
  PageHeading,
  SemResultados,
} from "@/components/radar/page-states"
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { SETORES } from "@/lib/domain/types"
import { useRadar } from "@/lib/hooks"
import { useEntrada } from "@/lib/motion/use-entrada"

function Conteudo() {
  const { clients, frentes, grade, configuracao } = useRadar()
  const [setor, setSetor] = useState("todos")

  const ativos = useMemo(() => clients.filter((c) => c.ativo), [clients])
  const colunas = useMemo(
    () => (setor === "todos" ? frentes : frentes.filter((f) => f.setor === setor)),
    [frentes, setor]
  )

  const raiz = useRef<HTMLDivElement>(null)
  useEntrada(raiz)

  return (
    <div ref={raiz}>
      <PageHeading
        title="Grade"
        description={
          <span className="tnum">
            {ativos.length} {ativos.length === 1 ? "cliente ativo" : "clientes ativos"} ·{" "}
            {colunas.length} {colunas.length === 1 ? "frente" : "frentes"}
          </span>
        }
        actions={
          <Select value={setor} onValueChange={setSetor}>
            <Dica texto="Mostrar só as frentes de um setor da agência">
              <SelectTrigger className="w-48" aria-label="Filtrar frentes por setor">
                <SelectValue />
              </SelectTrigger>
            </Dica>
            <SelectContent>
              <SelectGroup>
                <SelectItem value="todos">Todos os setores</SelectItem>
                {SETORES.map((s) => (
                  <SelectItem key={s} value={s}>
                    {s}
                  </SelectItem>
                ))}
              </SelectGroup>
            </SelectContent>
          </Select>
        }
      />
      <div data-entra className="mb-4">
        <Legend />
      </div>
      {ativos.length === 0 || colunas.length === 0 ? (
        <SemResultados
          titulo="Nada para mostrar na grade"
          descricao="Não há clientes ativos ou frentes neste setor. Restaure os dados de demonstração em Configurações."
        />
      ) : (
        <div data-entra>
          <GradeTable clients={ativos} frentes={colunas} grade={grade} />
          <p className="mt-3 max-w-3xl text-sm text-muted-foreground">
            Problemas são frentes atrasadas ou críticas. &ldquo;Nunca&rdquo;
            marca uma frente sem nenhuma ação registrada. O canto marcado indica
            aprovação travada há mais de {configuracao.limiteAprovacaoDias} dias. Clique numa célula para abrir
            a ficha do cliente.
          </p>
        </div>
      )}
    </div>
  )
}

export function GradeView() {
  return (
    <ComDados rows={3}>
      <Conteudo />
    </ComDados>
  )
}
