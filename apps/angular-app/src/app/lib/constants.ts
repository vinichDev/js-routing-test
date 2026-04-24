import { InjectionToken } from '@angular/core';

export const SUT_ID = 'angular_app';
export const FRAMEWORK_NAME = 'Angular 19 + SSR';
export const LIST_ITEMS_EXPECTED = 1000;
export const METRICS_SCHEMA_VERSION = '1.0';

/** Базовый URL Data API — предоставляется только на сервере (app.config.server.ts). */
export const DATA_API_BASE_URL = new InjectionToken<string>('DATA_API_BASE_URL');
