import { renderToStream, type RenderToStreamOptions } from '@builder.io/qwik/server';
import { manifest } from '@qwik-city-plan';
import Root from './root';

export default function (opts: RenderToStreamOptions) {
    return renderToStream(<Root />, {
        manifest,
        ...opts,
        containerAttributes: {
            lang: 'ru',
            ...opts.containerAttributes,
        },
    });
}
