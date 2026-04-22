// Корневой компонент приложения Pages Router — общий layout и InitialLoadMetrics.
import type { AppProps } from 'next/app';
import InitialLoadMetrics from '@/components/InitialLoadMetrics';
import { FRAMEWORK_NAME, SUT_ID } from '@/lib/constants';

export default function App({ Component, pageProps }: AppProps) {
    return (
        <div className="layout-container">
            <header className="app-header">
                <h1 className="app-title">Тестовый стенд</h1>
                <div className="framework-badge">{FRAMEWORK_NAME}</div>
                <div className="routing-tech">Next.js Pages Router (getServerSideProps + client-side Link)</div>
                <div className="sut-id" style={{ display: 'none' }} data-sut-id={SUT_ID} />
            </header>
            <Component {...pageProps} />
            <InitialLoadMetrics />
        </div>
    );
}
