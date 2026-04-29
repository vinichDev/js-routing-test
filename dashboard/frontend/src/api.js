import axios from 'axios';

const api = axios.create({ baseURL: '/api' });

export const getSutList = () => api.get('/sut/list');
export const getSutStatus = () => api.get('/sut/status');
export const getMetricsSummary = () => api.get('/metrics/summary');
export const getActionStatus = () => api.get('/action/status');
export const cancelAction = () => api.post('/action/cancel');
export const stopSut = () => api.post('/sut/stop');

/** SSE через fetch. Возвращает AbortController для отмены потока */
export const streamPost = (url, body, onLine, onDone) => {
  const controller = new AbortController();

  fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
    signal: controller.signal,
  }).then(res => {
    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    const read = () => reader.read().then(({ done, value }) => {
      if (done) { onDone(); return; }
      decoder.decode(value).split('\n').forEach(line => {
        if (line.startsWith('data: ')) onLine(line.slice(6));
      });
      read();
    }).catch(() => {}); // AbortError при отмене — игнорируем
    read();
  }).catch(() => {});

  return controller;
};

export const switchSut = (sut, onLine, onDone) =>
  streamPost('/api/sut/switch', { sut }, onLine, onDone);

export const runTest = (sut, modes, onLine, onDone) =>
  streamPost('/api/test/run', { sut, modes }, onLine, onDone);

export const runAll = (onLine, onDone) =>
  streamPost('/api/test/run-all', {}, onLine, onDone);
