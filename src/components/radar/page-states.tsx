"use client"

import { useState, type ReactNode } from "react"

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyTitle,
} from "@/components/ui/empty"
import { Skeleton } from "@/components/ui/skeleton"
import { useRadar } from "@/lib/hooks"
import { useRadarStore } from "@/lib/store"

/**
 * Cabeçalho de página: h1 em Geist 400, 28px. `italic` é só um complemento
 * existe só no h1 do /radar: nas demais telas, nome de cliente e títulos de
 * página ficam em romano. `description` só quando traz dado.
 */
export function PageHeading({
  title,
  italic,
  description,
  actions,
}: {
  title: string
  italic?: string
  description?: ReactNode
  actions?: ReactNode
}) {
  return (
    <div
      data-entra
      className="mb-6 flex flex-wrap items-end justify-between gap-4"
    >
      <div className="min-w-0">
        <h1 className="text-2xl leading-tight sm:text-[1.75rem]">
          {title}
          {title && italic ? " " : null}
          {italic ?? null}
        </h1>
        {description ? (
          <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
            {description}
          </p>
        ) : null}
      </div>
      {actions ? <div className="flex items-center gap-2">{actions}</div> : null}
    </div>
  )
}

/** Skeleton genérico: cabeçalho + linhas. */
export function PageSkeleton({ rows = 4 }: { rows?: number }) {
  return (
    <div
      className="flex flex-col gap-4"
      role="status"
      aria-busy="true"
      aria-label="Carregando…"
    >
      <Skeleton className="h-8 w-64" />
      <Skeleton className="h-4 w-96 max-w-full" />
      {Array.from({ length: rows }).map((_, i) => (
        <Skeleton key={i} className="h-20 w-full" />
      ))}
    </div>
  )
}

/**
 * Primeira vez com o banco ainda sem dados: em vez de erro, oferece carregar
 * a demonstração (com confirmação de que o conteúdo é substituído).
 */
export function BancoVazio() {
  const resetarDemo = useRadarStore((s) => s.resetarDemo)
  const [confirma, setConfirma] = useState(false)
  const [carregando, setCarregando] = useState(false)
  return (
    <>
      <Empty className="rounded-lg bg-card py-12">
        <EmptyHeader>
          <EmptyTitle>O banco de dados ainda está vazio</EmptyTitle>
          <EmptyDescription>
            Carregue os dados de demonstração (10 clientes fictícios, 8 frentes
            e as ações do gabarito) para começar a usar o Radar.
          </EmptyDescription>
        </EmptyHeader>
        <EmptyContent>
          <Button
            dica="Preencher o banco com os dados fictícios do gabarito"
            onClick={() => setConfirma(true)}
          >
            Carregar dados de demonstração
          </Button>
        </EmptyContent>
      </Empty>
      <Dialog open={confirma} onOpenChange={setConfirma}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Carregar dados de demonstração?</DialogTitle>
            <DialogDescription>
              Isso substitui todo o conteúdo do banco (clientes, frentes, ações,
              check-ups e atribuições) pelos dados fictícios do gabarito, para
              todas as pessoas que usam o Radar.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              dica="Fechar sem mudar nada"
              onClick={() => setConfirma(false)}
            >
              Cancelar
            </Button>
            <Button
              disabled={carregando}
              onClick={async () => {
                setCarregando(true)
                const ok = await resetarDemo()
                setCarregando(false)
                if (ok) setConfirma(false)
              }}
            >
              {carregando ? "Carregando…" : "Carregar e substituir"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}

export function ErroDados({ mensagem }: { mensagem: string }) {
  const iniciar = useRadarStore((s) => s.iniciar)
  const resetarDemo = useRadarStore((s) => s.resetarDemo)
  return (
    <Alert variant="destructive" className="max-w-2xl">
      <AlertTitle>Não foi possível carregar os dados</AlertTitle>
      <AlertDescription>
        <p>{mensagem}</p>
        <div className="mt-3 flex flex-wrap gap-2">
          <Button
            size="sm"
            variant="outline"
            dica="Tentar carregar os dados outra vez"
            onClick={() => void iniciar()}
          >
            Tentar de novo
          </Button>
          <Button
            size="sm"
            variant="destructive"
            dica="Apagar tudo e recarregar os dados de demonstração"
            onClick={() => resetarDemo()}
          >
            Resetar dados de demonstração
          </Button>
        </div>
      </AlertDescription>
    </Alert>
  )
}

export function SemResultados({
  titulo,
  descricao,
  onLimpar,
}: {
  titulo: string
  descricao: string
  onLimpar?: () => void
}) {
  return (
    <Empty className="rounded-lg bg-card py-10">
      <EmptyHeader>
        <EmptyTitle>{titulo}</EmptyTitle>
        <EmptyDescription>{descricao}</EmptyDescription>
      </EmptyHeader>
      {onLimpar ? (
        <EmptyContent>
          <Button
            size="sm"
            variant="outline"
            dica="Remover busca, setor e aba e voltar a ver tudo"
            onClick={onLimpar}
          >
            Limpar filtros
          </Button>
        </EmptyContent>
      ) : null}
    </Empty>
  )
}

/**
 * Envolve o conteúdo de uma tela: skeleton enquanto o store hidrata, erro se
 * a leitura falhar, conteúdo caso contrário.
 */
export function ComDados({
  children,
  rows,
}: {
  children: ReactNode
  rows?: number
}) {
  const { ready, erro, vazio } = useRadar()
  if (erro) return <ErroDados mensagem={erro} />
  if (!ready) return <PageSkeleton rows={rows} />
  if (vazio) return <BancoVazio />
  return <>{children}</>
}
