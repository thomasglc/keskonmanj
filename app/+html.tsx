import { ScrollViewStyleReset } from 'expo-router/html'
import type { PropsWithChildren } from 'react'

export default function Root({ children }: PropsWithChildren) {
  return (
    <html lang="fr">
      <head>
        <meta charSet="utf-8" />
        <meta httpEquiv="X-UA-Compatible" content="IE=edge" />
        <meta
          name="viewport"
          content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no, shrink-to-fit=no"
        />

        {/* PWA manifest */}
        <link rel="manifest" href="/manifest.json" />

        {/* iOS PWA standalone mode */}
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="apple-mobile-web-app-title" content="Kèskonmanj" />
        <link rel="apple-touch-icon" href="/assets/icon.png" />

        {/* Android PWA */}
        <meta name="mobile-web-app-capable" content="yes" />

        <ScrollViewStyleReset />
      </head>
      <body>{children}</body>
    </html>
  )
}
