// =============================================================================
// Безопасный серверный шаблонизатор для Vanilla SUT
// =============================================================================

// Утилита для экранирования опасных символов
export function escapeHtml(unsafe) {
    if (unsafe == null) return '';
    
    // Если это массив (например, массив карточек), объединяем его
    if (Array.isArray(unsafe)) {
        return unsafe.join('');
    }

    if (typeof unsafe !== 'string') {
        unsafe = String(unsafe);
    }
    return unsafe
         .replace(/&/g, "&amp;")
         .replace(/</g, "&lt;")
         .replace(/>/g, "&gt;")
         .replace(/"/g, "&quot;")
         .replace(/'/g, "&#039;");
}

/**
 * Оболочка для отметки строки как "безопасной" (пропускает экранирование).
 * Полезно, когда мы вставляем один шаблон в другой.
 */
class SafeString {
    constructor(str) {
        this.str = str;
    }
    toString() {
        return this.str;
    }
}

export function safe(str) {
    return new SafeString(str);
}

/**
 * Tagged template literal `html`.
 * Автоматически экранирует все интерполированные переменные.
 */
export function html(strings, ...values) {
    const raw = strings.raw;
    let result = '';

    for (let i = 0; i < raw.length; i++) {
        result += raw[i];
        if (i < values.length) {
            const val = values[i];
            if (val instanceof SafeString) {
                result += val.toString();
            } else if (Array.isArray(val)) {
                // Если передали массив вложенных SafeString
                result += val.map(v => v instanceof SafeString ? v.toString() : escapeHtml(v)).join('');
            } else {
                result += escapeHtml(val);
            }
        }
    }
    return new SafeString(result);
}
