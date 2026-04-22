import { createHandler, StartServer } from '@solidjs/start/server'

export default createHandler(() => (
    <StartServer
        document={({ assets, children, scripts }) => (
            <html lang="ru">
                <head>
                    <meta charset="utf-8" />
                    <meta name="viewport" content="width=device-width, initial-scale=1" />
                    <title>Тестовый стенд — SolidStart</title>
                    <link rel="stylesheet" href="/shared/global.css" />
                    {assets}
                </head>
                <body>
                    <div id="app">{children}</div>
                    {scripts}
                </body>
            </html>
        )}
    />
))
