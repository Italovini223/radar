"use client"

import * as React from "react"
import { cn } from "cn"
import { Dialog as DialogPrimitive } from "radix-ui"

import { Button } from "@/components/ui/button"
import { gsap } from "@/lib/motion/gsap"
import { reduzMovimento } from "@/lib/motion/movimento"
import { DUR, EASE } from "@/lib/motion/tokens"
import { XIcon } from "lucide-react"

/**
 * Abertura e fechamento com GSAP (opacidade + escala 0,98 a 1, 0,18 s). O
 * Radix só desmonta depois que a saída termina: `onOpenChange(false)` espera o
 * tween. Com prefers-reduced-motion fecha na hora.
 */
function Dialog({
  onOpenChange,
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Root>) {
  const fechando = React.useRef(false)
  const aoMudar = React.useCallback(
    (aberto: boolean) => {
      if (aberto) {
        fechando.current = false
        onOpenChange?.(true)
        return
      }
      const conteudo = document.querySelector<HTMLElement>(
        "[data-slot=dialog-content]"
      )
      if (!onOpenChange || !conteudo || reduzMovimento()) {
        onOpenChange?.(false)
        return
      }
      if (fechando.current) return
      fechando.current = true
      const veu = conteudo.previousElementSibling
      gsap
        .timeline({
          onComplete: () => {
            fechando.current = false
            onOpenChange(false)
          },
        })
        .to(conteudo, {
          autoAlpha: 0,
          scale: 0.98,
          duration: DUR.rapido,
          ease: EASE.saida,
        })
        .to(veu, { autoAlpha: 0, duration: DUR.rapido }, 0)
    },
    [onOpenChange]
  )
  return (
    <DialogPrimitive.Root data-slot="dialog" onOpenChange={aoMudar} {...props} />
  )
}

function DialogTrigger({
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Trigger>) {
  return <DialogPrimitive.Trigger data-slot="dialog-trigger" {...props} />
}

function DialogPortal({
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Portal>) {
  return <DialogPrimitive.Portal data-slot="dialog-portal" {...props} />
}

function DialogClose({
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Close>) {
  return <DialogPrimitive.Close data-slot="dialog-close" {...props} />
}

function DialogOverlay({
  className,
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Overlay>) {
  return (
    <DialogPrimitive.Overlay
      data-slot="dialog-overlay"
      className={cn(
        "fixed inset-0 isolate z-50 bg-ink/40",
        className
      )}
      {...props}
    />
  )
}

function DialogContent({
  className,
  children,
  showCloseButton = true,
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Content> & {
  showCloseButton?: boolean
}) {
  // Ref de função: roda quando o Radix monta o conteúdo (a abertura), não
  // quando este componente é montado fechado.
  const aoMontar = React.useCallback((el: HTMLDivElement | null) => {
    if (!el || reduzMovimento()) return
    gsap.from(el, {
      autoAlpha: 0,
      scale: 0.98,
      duration: 0.18,
      ease: EASE.saida,
      clearProps: "opacity,visibility,transform,scale",
    })
    if (el.previousElementSibling) {
      gsap.from(el.previousElementSibling, {
        autoAlpha: 0,
        duration: 0.18,
        clearProps: "opacity,visibility",
      })
    }
  }, [])
  return (
    <DialogPortal>
      <DialogOverlay />
      <DialogPrimitive.Content
        ref={aoMontar}
        data-slot="dialog-content"
        className={cn(
          "fixed top-1/2 left-1/2 z-50 grid w-full max-w-[calc(100%-2rem)] -translate-x-1/2 -translate-y-1/2 gap-4 rounded-2xl bg-popover p-6 shadow-pop text-sm text-popover-foreground outline-none sm:max-w-sm",
          className
        )}
        {...props}
      >
        {children}
        {showCloseButton && (
          <DialogPrimitive.Close data-slot="dialog-close" asChild>
            <Button
              variant="ghost"
              className="absolute top-3 right-3"
              size="icon-sm"
              dica="Fechar (Esc)"
            >
              <XIcon />
              <span className="sr-only">Fechar</span>
            </Button>
          </DialogPrimitive.Close>
        )}
      </DialogPrimitive.Content>
    </DialogPortal>
  )
}

function DialogHeader({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="dialog-header"
      className={cn("flex flex-col gap-2", className)}
      {...props}
    />
  )
}

function DialogFooter({
  className,
  showCloseButton = false,
  children,
  ...props
}: React.ComponentProps<"div"> & {
  showCloseButton?: boolean
}) {
  return (
    <div
      data-slot="dialog-footer"
      className={cn(
        "-mx-6 -mb-6 flex flex-col-reverse gap-2 rounded-b-2xl border-t bg-card p-4 px-6 sm:flex-row sm:justify-end",
        className
      )}
      {...props}
    >
      {children}
      {showCloseButton && (
        <DialogPrimitive.Close asChild>
          <Button variant="outline">Fechar</Button>
        </DialogPrimitive.Close>
      )}
    </div>
  )
}

function DialogTitle({
  className,
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Title>) {
  return (
    <DialogPrimitive.Title
      data-slot="dialog-title"
      className={cn(
        "font-heading text-lg leading-tight font-medium",
        className
      )}
      {...props}
    />
  )
}

function DialogDescription({
  className,
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Description>) {
  return (
    <DialogPrimitive.Description
      data-slot="dialog-description"
      className={cn(
        "text-sm text-muted-foreground *:[a]:underline *:[a]:underline-offset-3 *:[a]:hover:text-foreground",
        className
      )}
      {...props}
    />
  )
}

export {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogOverlay,
  DialogPortal,
  DialogTitle,
  DialogTrigger,
}
