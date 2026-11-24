import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "cn"
import { Slot } from "radix-ui"

import { Dica } from "@/components/ui/dica"

const buttonVariants = cva(
  "group/button inline-flex shrink-0 items-center justify-center rounded-full border border-transparent bg-clip-padding text-sm font-medium whitespace-nowrap transition-[color,background-color,border-color,box-shadow,opacity,filter] outline-none select-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring disabled:pointer-events-none disabled:opacity-50 aria-invalid:border-destructive [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
  {
    variants: {
      variant: {
        /** Tinta: ação de sistema ("Atualizar radar", "Salvar"). */
        default: "bg-primary text-primary-foreground hover:bg-primary-hover",
        /** Coral: a ação que resolve o alerta ("Ver proposta"). Uma por tela. */
        resolver:
          "bg-resolver text-resolver-foreground hover:bg-resolver-hover",
        /** Cinza (pílula): todo o resto. */
        outline:
          "bg-pill text-foreground hover:brightness-[.97] aria-expanded:brightness-[.97]",
        secondary:
          "bg-pill text-foreground hover:brightness-[.97] aria-expanded:brightness-[.97]",
        ghost:
          "text-muted-foreground hover:bg-pill hover:text-foreground aria-expanded:bg-pill aria-expanded:text-foreground",
        destructive: "bg-pill text-destructive hover:bg-state-crit-soft",
        /** Link sublinhado ("Ver tudo"). */
        link: "h-auto! px-0! text-foreground underline underline-offset-2 hover:decoration-2",
      },
      size: {
        default: "h-10 gap-1.5 px-[22px]",
        xs: "h-6 gap-1 px-2.5 text-xs",
        sm: "h-8 gap-1 px-4",
        lg: "h-11 gap-1.5 px-7",
        icon: "size-10",
        "icon-xs": "size-6 [&_svg:not([class*='size-'])]:size-3",
        "icon-sm": "size-8",
        "icon-lg": "size-11",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

function Button({
  className,
  variant = "default",
  size = "default",
  asChild = false,
  dica,
  ...props
}: React.ComponentProps<"button"> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean
    /** Tooltip que explica o que o botão faz (ver `Dica`). */
    dica?: React.ReactNode
  }) {
  const Comp = asChild ? Slot.Root : "button"

  return (
    <Dica texto={dica}>
      <Comp
        data-slot="button"
        data-variant={variant}
        data-size={size}
        className={cn(buttonVariants({ variant, size, className }))}
        {...props}
      />
    </Dica>
  )
}

export { Button, buttonVariants }
