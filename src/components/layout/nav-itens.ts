import {
  ClipboardCheck,
  LayoutGrid,
  Radar,
  Settings,
  Users,
  type LucideIcon,
} from "lucide-react"

export type ChaveContagem = "oportunidades" | "clientes"

export interface NavItem {
  href: string
  label: string
  /** Rótulo curto para o trilho de ícones (caixa alta, 10–11px). */
  curto: string
  icone: LucideIcon
  contagem?: ChaveContagem
}

/** Telas principais, na ordem da navegação. Configurações fica à parte. */
export const NAV_PRINCIPAL: NavItem[] = [
  { href: "/radar", label: "Radar", curto: "Radar", icone: Radar, contagem: "oportunidades" },
  { href: "/grade", label: "Grade", curto: "Grade", icone: LayoutGrid },
  { href: "/clientes", label: "Clientes", curto: "Clientes", icone: Users, contagem: "clientes" },
  { href: "/checkup", label: "Check-up", curto: "Check-up", icone: ClipboardCheck },
]

export const NAV_CONFIG: NavItem = {
  href: "/configuracoes",
  label: "Configurações",
  curto: "Ajustes",
  icone: Settings,
}

export function estaAtivo(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(`${href}/`)
}

/** Nome da seção atual, para o título da barra superior. */
export function secaoAtual(pathname: string): NavItem | undefined {
  return [...NAV_PRINCIPAL, NAV_CONFIG].find((i) => estaAtivo(pathname, i.href))
}
