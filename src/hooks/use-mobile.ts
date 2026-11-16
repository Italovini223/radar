/**
 * Desvio do padrão shadcn: o Radar não usa o Sheet de celular. Em telas
 * estreitas a sidebar colapsa para uma coluna de ícones (como no mockup), e
 * isso é decidido em `AppShell` com matchMedia. Por isso `useIsMobile`
 * (consumido por `ui/sidebar.tsx`) sempre devolve falso.
 */
export function useIsMobile() {
  return false
}
