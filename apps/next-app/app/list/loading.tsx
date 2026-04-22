// Next.js Streaming SSR: fallback UI для страницы /list.
// Показывается пока Server Component загружается (React Suspense boundary).
export default function ListLoading() {
    return (
        <main data-test="page-list-loading">
            <h1>Список элементов</h1>
            <p>Загрузка страницы списка...</p>
        </main>
    );
}
