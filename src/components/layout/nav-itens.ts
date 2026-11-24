import {
  Check,
  LayoutGrid,
  Radar,
  Settings,
  User,
  type LucideIcon,
} from "lucide-react"

export interface NavItem {
  href: string
  label: string
  /** Ícone da dock (o Radar usa a própria marca no lugar). */
  icone: LucideIcon
}

/** Telas principais, na ordem da dock. Configurações fica no cabeçalho. */
export const NAV_PRINCIPAL: NavItem[] = [
  { href: "/radar", label: "Radar", icone: Radar },
  { href: "/grade", label: "Grade", icone: LayoutGrid },
  { href: "/clientes", label: "Clientes", icone: User },
  { href: "/checkup", label: "Check-up", icone: Check },
]

export const NAV_CONFIG: NavItem = {
  href: "/configuracoes",
  label: "Configurações",
  icone: Settings,
}

export function estaAtivo(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(`${href}/`)
}

/** Nome da seção atual, para o título do cabeçalho. */
export function secaoAtual(pathname: string): NavItem | undefined {
  return [...NAV_PRINCIPAL, NAV_CONFIG].find((i) => estaAtivo(pathname, i.href))
}
