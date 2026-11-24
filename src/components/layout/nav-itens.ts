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
  /** Dica (tooltip) que diz o que a tela mostra. */
  dica: string
}

/** Telas principais, na ordem da dock. Configurações fica no cabeçalho. */
export const NAV_PRINCIPAL: NavItem[] = [
  { href: "/radar", label: "Radar", icone: Radar, dica: "Radar: os alertas do dia, do mais urgente para o menos" },
  { href: "/grade", label: "Grade", icone: LayoutGrid, dica: "Grade: dias desde a última ação em cada cliente × frente" },
  { href: "/clientes", label: "Clientes", icone: User, dica: "Clientes: a carteira e a ficha de cada cliente" },
  { href: "/checkup", label: "Check-up", icone: Check, dica: "Check-up: revisar e atualizar as datas de um cliente" },
]

export const NAV_CONFIG: NavItem = {
  href: "/configuracoes",
  label: "Configurações",
  icone: Settings,
  dica: "Configurações: data de referência, prazos e limites",
}

export function estaAtivo(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(`${href}/`)
}

/** Nome da seção atual, para o título do cabeçalho. */
export function secaoAtual(pathname: string): NavItem | undefined {
  return [...NAV_PRINCIPAL, NAV_CONFIG].find((i) => estaAtivo(pathname, i.href))
}
