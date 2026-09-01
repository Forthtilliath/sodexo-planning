import { ScrollViewStyleReset } from 'expo-router/html';
import type { ReactNode } from 'react';

// Web uniquement : HTML racine de chaque page, rendu statiquement côté Node
// (pas d'accès au DOM ni aux API navigateur).
export default function Root({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta httpEquiv="X-UA-Compatible" content="IE=edge" />
        <meta name="viewport" content="width=device-width, initial-scale=1, shrink-to-fit=no" />

        {/* Coupe le scroll du body pour que les ScrollView se comportent comme en natif. */}
        <ScrollViewStyleReset />

        {/* CSS brut pour que le fond ne scintille pas au chargement en mode sombre. */}
        <style dangerouslySetInnerHTML={{ __html: responsiveBackground }} />
      </head>
      <body>{children}</body>
    </html>
  );
}

const responsiveBackground = `
body {
  background-color: #fff;
}
@media (prefers-color-scheme: dark) {
  body {
    background-color: #000;
  }
}`;
