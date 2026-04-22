import { Router } from '@solidjs/router'
import { FileRoutes } from '@solidjs/start/router'
import { Suspense } from 'solid-js'
import type { ParentComponent } from 'solid-js'
import InitialLoadMetrics from './components/InitialLoadMetrics'

// Root layout: оборачивает активный маршрут. FileRoutes должен быть прямым
// потомком Router, иначе createRoutes не видит объекты с полем path.
const Layout: ParentComponent = (props) => (
    <div class="layout-container">
        <header class="app-header">
            <h1 class="app-title">Тестовый стенд</h1>
            <div class="framework-badge">SolidStart v1</div>
            <div class="routing-tech">SolidJS 1.9 (Signals, no VDOM, CSR)</div>
        </header>
        {/* Suspense нужен для lazy-маршрутов FileRoutes */}
        <Suspense>{props.children}</Suspense>
        <InitialLoadMetrics />
    </div>
)

export default function App() {
    return (
        <Router root={Layout}>
            <FileRoutes />
        </Router>
    )
}
