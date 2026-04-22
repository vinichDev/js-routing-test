// @refresh reload
import { mount, StartClient } from '@solidjs/start/client'

// В режиме CSR (ssr: false) mount к document не вставляет компонент в DOM —
// он только запускает e() без Wt(). Монтируем в #app напрямую.
mount(() => <StartClient />, document.getElementById('app')!)
