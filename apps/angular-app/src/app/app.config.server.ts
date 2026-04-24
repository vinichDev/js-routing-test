import { mergeApplicationConfig, ApplicationConfig } from '@angular/core';
import { provideServerRendering } from '@angular/platform-server';
import { appConfig } from './app.config';
import { DATA_API_BASE_URL } from './lib/constants';

const serverConfig: ApplicationConfig = {
    providers: [
        provideServerRendering(),
        {
            // Внутренний URL data-api для SSR-запросов (Docker-сеть).
            // На клиенте токен не предоставлен — resolver использует '' (nginx proxy).
            provide: DATA_API_BASE_URL,
            useFactory: () => process.env['DATA_API_URL'] || 'http://data-api:8080',
        },
    ],
};

export const config = mergeApplicationConfig(appConfig, serverConfig);
