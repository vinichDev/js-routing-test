// Главная страница SolidStart. SolidJS использует реактивные примитивы без VDOM.
import { A, useSearchParams } from '@solidjs/router'
import { SUT_ID, FRAMEWORK_NAME } from '~/lib/constants'

export default function HomePage() {
    const [searchParams] = useSearchParams()

    const listHref = () => {
        const q = new URLSearchParams()
        if (searchParams.run_id) q.set('run_id', searchParams.run_id)
        if (searchParams.mode_id) q.set('mode_id', searchParams.mode_id)
        if (searchParams.iteration) q.set('iteration', searchParams.iteration)
        if (searchParams.sut_id) q.set('sut_id', searchParams.sut_id)
        return `/list?${q.toString()}`
    }

    function handleClick() {
        sessionStorage.setItem('nav_t0', String(Date.now()))
    }

    return (
        <main data-test="page-home" class="home-content">
            <h2>Добро пожаловать</h2>
            <p>Тестирование маршрутизации: <strong>{SUT_ID}</strong></p>
            <p>{FRAMEWORK_NAME}</p>

            <nav style={{ 'margin-top': '2rem' }}>
                {/* SolidJS <A> — SPA-навигация через @solidjs/router */}
                <A
                    href={listHref()}
                    data-test="link-to-list"
                    class="btn-primary"
                    onClick={handleClick}
                >
                    Перейти к списку
                </A>
            </nav>
        </main>
    )
}
