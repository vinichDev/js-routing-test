// GET / — Домашняя страница. SSR через Document + JSX.
// JSX компилируется esbuild (--jsx=automatic --jsx-import-source=remix/component).
import { createHtmlResponse } from 'remix/response/html';
import { renderToString } from 'remix/component/server';
import { SUT_ID } from '../lib/config.js';
import { extractRunParams, buildListHref } from '../lib/html-helpers.js';
import { Document } from '../components/Document.js';

export async function homeHandler(context: any) {
    const params = extractRunParams(context.request);
    const listHref = buildListHref(params);

    const vnode = (
        <Document>
            <main
                data-test="page-home"
                className="home-content"
                data-sut-id={SUT_ID}
                data-run-id={params.runId}
                data-mode-id={params.modeId}
                data-iteration={params.iteration}
            >
                <h2>Добро пожаловать</h2>
                <p>Тестирование маршрутизации: <strong>{SUT_ID}</strong></p>
                <nav style={{ marginTop: '2rem' }}>
                    <a href={listHref} data-test="link-to-list" className="btn-primary">
                        Перейти к списку
                    </a>
                </nav>
            </main>
        </Document>
    );

    let html = '';
    try {
        html = await renderToString(vnode);
    } catch (e: any) {
        console.error('SSR Component Rendering Failed:', e);
        html = `<html><body><div class="status-msg status-error">SSR Error: ${e.message}</div></body></html>`;
    }

    return createHtmlResponse('<!DOCTYPE html>\n' + html);
}
