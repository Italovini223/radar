import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "cn"
import { Slot } from "radix-ui"

const badgeVariants = cva(
  "group/badge inline-flex h-[26px] w-fit shrink-0 items-center justify-center gap-[5px] overflow-hidden rounded-full border border-transparent px-[11px] text-xs font-normal whitespace-nowrap transition-[color,background-color,border-color,box-shadow,opacity,transform] focus-visible:outline-2 focus-visible:outline-ring has-data-[icon=inline-end]:pr-2 has-data-[icon=inline-start]:pl-2 [&>svg]:pointer-events-none [&>svg]:size-3! [&_b]:font-medium [&_b]:text-foreground",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground [a]:hover:bg-primary/80",
        /** Pílula do guia: fundo `pill`, texto ink-2, número em <b>. */
        secondary: "bg-pill text-muted-foreground [a]:hover:brightness-[.97]",
        destructive: "bg-state-crit-soft text-destructive",
        outline: "bg-pill text-foreground [a]:hover:brightness-[.97]",
        ghost:
          "hover:bg-muted hover:text-muted-foreground dark:hover:bg-muted/50",
        link: "text-foreground underline underline-offset-4 hover:underline",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

function Badge({
  className,
  variant = "default",
  asChild = false,
  ...props
}: React.ComponentProps<"span"> &
  VariantProps<typeof badgeVariants> & { asChild?: boolean }) {
  const Comp = asChild ? Slot.Root : "span"

  return (
    <Comp
      data-slot="badge"
      data-variant={variant}
      className={cn(badgeVariants({ variant }), className)}
      {...props}
    />
  )
}

export { Badge, badgeVariants }
