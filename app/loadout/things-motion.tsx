'use client';
import { createContext, useContext, useEffect, useLayoutEffect, useRef, type ReactNode, type RefObject } from 'react';

type Shot = { id: string; rect: DOMRect; src: string };
type Frame = { key: string; focus: boolean; shots: Shot[] };
type Motion = { previous: Frame | null; animations: Animation[]; overlays: HTMLElement[]; restore: (() => void)[] };
const Context = createContext<RefObject<Motion> | null>(null);
export function ThingsMotion({ children }: { children: ReactNode }) {
  const state = useRef<Motion>({ previous: null, animations: [], overlays: [], restore: [] });
  useEffect(() => () => clear(state.current), []);
  return <Context.Provider value={state}>{children}</Context.Provider>;
}
function milliseconds(value: string) {
  const time = value.trim();
  const amount = parseFloat(time);
  if (!Number.isFinite(amount)) return 0;
  return time.endsWith('ms') ? amount : amount * 1000;
}
function clear(state: Motion) {
  state.animations.forEach(animation => animation.cancel());
  state.overlays.forEach(node => node.remove());
  state.restore.forEach(restore => restore());
  state.animations = []; state.overlays = []; state.restore = [];
}
export function useThingsMotion(ref: RefObject<HTMLDivElement | null>, key: string, focus: boolean) {
  const motionRef = useContext(Context);
  useLayoutEffect(() => {
    const root = ref.current;
    const state = motionRef?.current;
    if (!root || !state) return;
    const images = () => Array.from(root.querySelectorAll<HTMLImageElement>('[data-motion-image]'));
    const capture = (): Frame => ({ key, focus, shots: images().map(image => ({id: image.dataset.motionImage!, rect: image.getBoundingClientRect(), src: image.currentSrc || image.src})).filter(shot => shot.rect.width > 0 && shot.rect.height > 0) });
    const old = state.previous;
    // Strict Mode replays layout effects; replaying the same route must not cancel its motion.
    if (old?.key !== key) clear(state);
    const world = key === 'world:grid';
    const fromWorld = old?.key === 'world:grid';
    const entering = focus || fromWorld;
    if (old && old.key !== key && (old.focus !== focus || world || fromWorld) && !matchMedia('(prefers-reduced-motion: reduce)').matches) {
      const css = getComputedStyle(document.documentElement);
      const duration = milliseconds(css.getPropertyValue(entering ? '--motion-things-focus-duration' : '--motion-things-grid-duration'));
      const easing = entering ? css.getPropertyValue('--motion-things-focus-easing').trim() : 'ease-out';
      const fadeDuration = milliseconds(css.getPropertyValue('--motion-things-fade-duration'));
      const finishStipple = () => root.removeAttribute('data-region-entering');
      if (fromWorld && !world) {
        root.setAttribute('data-region-entering', 'true');
        state.restore.push(finishStipple);
      }
      const destinationIds = new Set(images().map(image => image.dataset.motionImage));
      // Peripheral images stay in their original positions and only fade.
      for (const shot of old.shots.filter(shot => !destinationIds.has(shot.id))) {
        const ghost = document.createElement('img');
        ghost.src = shot.src; ghost.alt = ''; ghost.setAttribute('aria-hidden', 'true');
        Object.assign(ghost.style, {position:'fixed', left:`${shot.rect.left}px`, top:`${shot.rect.top}px`, width:`${shot.rect.width}px`, height:`${shot.rect.height}px`, objectFit:'contain', pointerEvents:'none', zIndex:'99'});
        document.body.append(ghost); state.overlays.push(ghost);
        const fade = ghost.animate([{opacity:1}, {opacity:0}], {duration:fadeDuration, easing:'ease-out', fill:'both'});
        state.animations.push(fade);
        void fade.finished.then(() => ghost.remove(), () => {});
      }
      for (const image of images()) {
        const source = old.shots.find(shot => shot.id === image.dataset.motionImage);
        if (!source) {
          const fade = (fromWorld ? image.parentElement! : image).animate([{opacity:0}, {opacity:1}], {duration:fadeDuration, easing:'ease-out'});
          state.animations.push(fade);
          continue;
        }
        const target = image.getBoundingClientRect();
        if (!target.width || !target.height) continue;
        const overlay = document.createElement('img');
        // Returning to world uses its drawing immediately, without a color crossfade.
        overlay.src = world ? image.currentSrc || image.src : source.src; overlay.alt = ''; overlay.setAttribute('aria-hidden', 'true');
        overlay.dataset.thingsMotion = world ? 'world' : fromWorld ? 'region' : focus ? 'focus' : 'grid';
        Object.assign(overlay.style, { position:'fixed', left:`${target.left}px`, top:`${target.top}px`, width:`${target.width}px`, height:`${target.height}px`, objectFit:'contain', transformOrigin:'0 0', pointerEvents:'none', zIndex:'100' });
        document.body.append(overlay);state.overlays.push(overlay);
        const hiddenTarget = fromWorld ? image.parentElement! : image;
        const previous = hiddenTarget.style.visibility;hiddenTarget.style.visibility='hidden';
        const restore=()=>{hiddenTarget.style.visibility=previous;};state.restore.push(restore);
        const animation=overlay.animate([
          {transform:`translate(${source.rect.left-target.left}px, ${source.rect.top-target.top}px) scale(${source.rect.width/target.width}, ${source.rect.height/target.height})`},
          {transform:'none'},
        ],{duration,easing,fill:'both'});
        state.animations.push(animation);
        // Next restores scroll after layout effects. Keep the landing rectangle
        // in sync without restarting the animation or changing browser history.
        let landing = target;
        const updateLanding = () => {
          const next = image.getBoundingClientRect();
          if (!next.width || !next.height || (next.left === landing.left && next.top === landing.top && next.width === landing.width && next.height === landing.height)) return;
          landing = next;
          Object.assign(overlay.style, {left:`${next.left}px`, top:`${next.top}px`, width:`${next.width}px`, height:`${next.height}px`});
          (animation.effect as KeyframeEffect).setKeyframes([
            {transform:`translate(${source.rect.left-next.left}px, ${source.rect.top-next.top}px) scale(${source.rect.width/next.width}, ${source.rect.height/next.height})`},
            {transform:'none'},
          ]);
        };
        let frame = 0;
        const track = () => { updateLanding(); frame = requestAnimationFrame(track); };
        frame = requestAnimationFrame(track);
        window.addEventListener('scroll', updateLanding, true);
        const stopTracking = () => { cancelAnimationFrame(frame); window.removeEventListener('scroll', updateLanding, true); };
        state.restore.push(stopTracking);
        void animation.finished.then(()=>{stopTracking();restore();overlay.remove();},stopTracking);
      }
      if (fromWorld && !world) {
        void Promise.all(state.animations.map(animation => animation.finished)).then(finishStipple, () => {});
      }
    }
    // Keep a live snapshot: the incoming route may mount before outgoing cleanup.
    // The context holds an imperative ref, not React render state.
    // eslint-disable-next-line react-hooks/immutability
    state.previous = capture();
    const remember = () => { const next=capture(); if(next.shots.length && state.previous?.key === key) state.previous=next; };
    const observer=new ResizeObserver(remember); images().forEach(image=>observer.observe(image));
    window.addEventListener('scroll',remember,true);window.addEventListener('resize',remember);
    return () => {
      remember(); observer.disconnect();
      window.removeEventListener('scroll',remember,true);window.removeEventListener('resize',remember);
    };
  }, [motionRef, ref, key, focus]);
}
