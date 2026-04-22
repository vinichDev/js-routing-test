// Главная страница TanStack Start.
import { createFileRoute, Link } from '@tanstack/react-router'
import { SUT_ID, FRAMEWORK_NAME } from '~/lib/constants'

export const Route = createFileRoute('/')({
    validateSearch: (search: Record<string, unknown>) => ({
        run_id: (search.run_id as string) || '',
        mode_id: (search.mode_id as string) || 'manual',
        iteration: Number(search.iteration) || 1,
        sut_id: (search.sut_id as string) || '',
    }),
    component: HomePage,
})

function HomePage() {
    const { run_id, mode_id, iteration, sut_id } = Route.useSearch()

    const listSearch: Record<string, string> = {}
    if (run_id) listSearch.run_id = run_id
    if (mode_id) listSearch.mode_id = mode_id
    if (iteration) listSearch.iteration = String(iteration)
    if (sut_id) listSearch.sut_id = sut_id

    return (
        <main data-test="page-home" className="home-content">
            <h2>Добро пожаловать</h2>
            <p>Тестирование маршрутизации: <strong>{SUT_ID}</strong></p>
            <p>{FRAMEWORK_NAME}</p>

            <nav style={{ marginTop: '2rem' }}>
                {/* TanStack Router <Link> — SPA-навигация через client-side router */}
                <Link
                    to="/list"
                    search={listSearch as any}
                    data-test="link-to-list"
                    className="btn-primary"
                    onClick={() => sessionStorage.setItem('nav_t0', String(Date.now()))}
                >
                    Перейти к списку
                </Link>
            </nav>
        </main>
    )
}
