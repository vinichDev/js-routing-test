// Кастомный Document — подключение глобального CSS и базовая HTML-структура.
import { Html, Head, Main, NextScript } from 'next/document';

export default function Document() {
    return (
        <Html lang="ru">
            <Head>
                <link rel="stylesheet" href="/shared/global.css" />
            </Head>
            <body>
                <Main />
                <NextScript />
            </body>
        </Html>
    );
}
