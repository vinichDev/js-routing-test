/**
 * Полоса статуса: показывает активный SUT (со ссылкой и кнопкой остановки)
 * и текущее выполняемое действие (с кнопкой отмены).
 */
export default function StatusBar({ activeSut, stoppingSut, running, actionLabel, onStopSut, onCancelAction }) {
  const sutUrl = `${window.location.protocol}//${window.location.hostname}:8000`;

  return (
    <div className="bg-white rounded-lg border border-gray-200 px-5 py-3 flex flex-wrap gap-x-8 gap-y-2 items-center">
      <div className="flex items-center gap-2">
        <span className="text-sm text-gray-500">Активный SUT:</span>
        {activeSut ? (
          <>
            <a
              href={sutUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm font-medium text-indigo-600 hover:underline"
            >
              {activeSut}
            </a>
            {stoppingSut ? (
              <span className="text-xs text-red-500 animate-pulse">Останавливаем...</span>
            ) : (
              <button
                onClick={onStopSut}
                className="px-2 py-0.5 text-xs bg-red-100 text-red-700 rounded hover:bg-red-200"
              >
                Остановить
              </button>
            )}
          </>
        ) : (
          <span className="text-sm text-gray-400">нет активного SUT</span>
        )}
      </div>

      <div className="flex items-center gap-2">
        <span className="text-sm text-gray-500">Действие:</span>
        {running ? (
          <>
            <span className="text-sm font-medium text-emerald-600 animate-pulse">
              {actionLabel || 'Выполняется...'}
            </span>
            <button
              onClick={onCancelAction}
              className="px-2 py-0.5 text-xs bg-gray-100 text-gray-700 rounded hover:bg-gray-200"
            >
              Прекратить
            </button>
          </>
        ) : (
          <span className="text-sm text-gray-400">нет</span>
        )}
      </div>
    </div>
  );
}
