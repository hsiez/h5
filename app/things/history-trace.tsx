'use client';

import { useEffect, useRef, useState } from 'react';

const KEY = 'things-history-trace';
const ENABLED = `${KEY}-enabled`;
type Entry = { event: string; time: string; url: string; length: number; active: boolean | null; detail?: string };
function route() {
  const query = new URLSearchParams(location.search);
  const region = query.get('region');
  return location.pathname + (region ? `?region=${encodeURIComponent(region)}` : '');
}
function read(): Entry[] {
  try { return JSON.parse(localStorage.getItem(KEY) || '[]'); } catch { return []; }
}

// Opt-in diagnostics only. Do not insert history entries or intercept Back.
export function HistoryTrace() {
  const [enabled, setEnabled] = useState(false);
  const [report, setReport] = useState('');
  const recordRef = useRef<(event: string, detail?: string) => void>(() => {});
  useEffect(() => {
    try {
      const flag = new URLSearchParams(location.search).get('historyDebug');
      if (flag === '1') sessionStorage.setItem(ENABLED, '1');
      if (flag === '0') sessionStorage.removeItem(ENABLED);
      if (sessionStorage.getItem(ENABLED) !== '1') return;
    } catch { return; }
    // This state reflects a browser-only diagnostic preference.
    setEnabled(true);
    const record = (event: string, detail?: string) => {
      const entries = read();
      entries.push({event, detail, time: new Date().toISOString(), url: route(), length: history.length,
        active: navigator.userActivation?.isActive ?? null});
      try { localStorage.setItem(KEY, JSON.stringify(entries.slice(-150))); } catch { /* storage unavailable */ }
    };
    recordRef.current = record;
    record('trace-mounted', navigator.userAgent);
    const push = history.pushState;
    const replace = history.replaceState;
    const wrappedPush: History['pushState'] = function(this: History, ...args) {
      record('push-before');
      const result = push.apply(this, args);
      record('push-after');
      return result;
    };
    const wrappedReplace: History['replaceState'] = function(this: History, ...args) {
      record('replace-before');
      const result = replace.apply(this, args);
      record('replace-after');
      return result;
    };
    history.pushState = wrappedPush;
    history.replaceState = wrappedReplace;
    const pop = () => record('popstate');
    const hide = (event: PageTransitionEvent) => record('pagehide', `persisted=${event.persisted}`);
    const show = (event: PageTransitionEvent) => record('pageshow', `persisted=${event.persisted}`);
    const visibility = () => record('visibility', document.visibilityState);
    const tap = (event: Event) => {
      const target = event.target instanceof Element ? event.target.closest('[data-item-id], [data-region-id]') : null;
      if (target) record('selection', target.getAttribute('data-item-id') || target.getAttribute('data-region-id') || '');
    };
    let previous = '';
    const observeView = () => {
      const layer = !!document.querySelector('[data-item-layer]');
      const view = layer ? 'item-layer' : document.querySelector('[data-stage]')?.getAttribute('data-stage') === '1'
        ? 'standalone-item' : document.querySelector('[data-region-id]') ? 'world' : 'region';
      const next = `${route()} ${view}`;
      if (next !== previous) { previous = next; record('rendered', view); }
    };
    const observer = new MutationObserver(observeView);
    observer.observe(document.body, {childList:true, subtree:true});
    observeView();
    addEventListener('popstate', pop);
    addEventListener('pagehide', hide);
    addEventListener('pageshow', show);
    document.addEventListener('visibilitychange', visibility);
    document.addEventListener('click', tap, true);
    return () => {
      observer.disconnect();
      if (history.pushState === wrappedPush) history.pushState = push;
      if (history.replaceState === wrappedReplace) history.replaceState = replace;
      removeEventListener('popstate', pop);
      removeEventListener('pagehide', hide);
      removeEventListener('pageshow', show);
      document.removeEventListener('visibilitychange', visibility);
      document.removeEventListener('click', tap, true);
      recordRef.current = () => {};
    };
  }, []);
  if (!enabled) return null;
  return <aside style={{position:'fixed',right:8,top:8,zIndex:10000,font:'12px system-ui',background:'#fff',color:'#111',padding:8,border:'1px solid #aaa',borderRadius:8,maxWidth:'90vw'}}>
    <button type="button" onClick={() => setReport(JSON.stringify(read(),null,2))}>Show history trace</button>
    {' · '}<button type="button" onClick={() => {localStorage.removeItem(KEY); recordRef.current('test-start'); setReport('');}}>Clear</button>
    {report && <div><textarea aria-label="History trace" readOnly value={report} style={{display:'block',width:300,maxWidth:'80vw',height:160}} onFocus={event=>event.currentTarget.select()} />
      <button type="button" onClick={() => setReport('')}>Close trace</button></div>}
  </aside>;
}
