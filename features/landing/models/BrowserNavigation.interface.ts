// La Navigation API todavía no está en los tipos de TypeScript (lib.dom), así que se declara lo que se usa.
export interface BrowserNavigation {
  canGoBack: boolean;
}

export interface WindowWithNavigation extends Window {
  navigation?: BrowserNavigation;
}
