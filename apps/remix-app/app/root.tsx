import {
  Links,
  Meta,
  Outlet,
  Scripts,
  ScrollRestoration,
} from "@remix-run/react";
import type { LinksFunction } from "@remix-run/node";
import InitialLoadMetrics from "~/components/InitialLoadMetrics";

export const links: LinksFunction = () => [
  { rel: "stylesheet", href: "/shared/global.css" },
];

export function Layout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ru">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <Meta />
        <Links />
      </head>
      <body>
        <div className="layout-container">
          <header className="app-header">
            <h1 className="app-title">Тестовый стенд</h1>
            <div className="framework-badge">Remix v2</div>
            <div className="routing-tech">Remix (Vite, Server Loader + Hydration)</div>
          </header>
          {children}
        </div>
        <ScrollRestoration />
        <Scripts />
        <InitialLoadMetrics />
      </body>
    </html>
  );
}

export default function App() {
  return <Outlet />;
}
