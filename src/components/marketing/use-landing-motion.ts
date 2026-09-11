"use client";

import { useLayoutEffect, type RefObject } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { SplitText } from "gsap/SplitText";
import { MorphSVGPlugin } from "gsap/MorphSVGPlugin";
import { Draggable } from "gsap/Draggable";

export function useLandingMotion(root: RefObject<HTMLElement | null>) {
  useLayoutEffect(() => {
    gsap.registerPlugin(ScrollTrigger, SplitText, MorphSVGPlugin, Draggable);
    const mm = gsap.matchMedia();
    mm.add({ motion: "(prefers-reduced-motion: no-preference)", desktop: "(min-width: 900px) and (min-height: 650px)" }, (context) => {
      if (!context.conditions?.motion || !root.current) return;
      const scope = root.current;
      const q = gsap.utils.selector(scope);
      const split = SplitText.create(q(".hero h1"), { type: "words,chars", aria: "auto" });
      gsap.from(split.chars, { yPercent: 95, rotationX: -85, opacity: 0, filter: "blur(8px)", stagger: 0.025, duration: 1.05, ease: "power4.out", transformOrigin: "50% 100%" });
      gsap.from(q(".hero-intro,.hero-actions,.registration-note"), { y: 24, opacity: 0, stagger: 0.12, duration: 0.8, delay: 0.55 });
      gsap.from(q(".hero-product"), { y: 55, opacity: 0, duration: 1.2, delay: 0.3, ease: "power3.out" });
      gsap.to(q(".route-draw"), { strokeDashoffset: 0, duration: 2, delay: 0.4 });
      // Each SVG owns its entrance; stateful scene icons are controlled below.
      scope.querySelectorAll<SVGElement>("svg").forEach((svg) => {
        if (svg.closest(".flow-stage,.event-card,.approved,.trip-experiences")) return;
        gsap.from(svg, { opacity: 0.3, scale: 0.75, duration: 0.65, transformOrigin: "50% 50%", scrollTrigger: { trigger: svg, start: "top 90%", toggleActions: "play none none reverse" } });
      });
      const journey = scope.querySelector<HTMLElement>(".decision-journey")!;
      const track = scope.querySelector<HTMLElement>(".decision-track")!;
      const cards = Array.from(track.querySelectorAll<HTMLElement>(".flow-stage"));
      const buttons = Array.from(journey.querySelectorAll<HTMLButtonElement>(".scene-step"));
      let trigger: ScrollTrigger | undefined;
      const select = (index: number) => {
        cards.forEach((card, i) => {
          const active = i === index;
          card.dataset.state = active ? "active" : "idle";
          gsap.to(card.querySelector("svg"), { scale: active ? 1.18 : 1, rotation: active ? 8 : 0, duration: 0.35, overwrite: true });
          buttons[i].setAttribute("aria-pressed", String(active));
        });
      };
      const go = (index: number) => {
        if (trigger) { window.scrollTo({ top: trigger.start + (trigger.end - trigger.start) * index / 2, behavior: "instant" }); }
        else journey.querySelector(".decision-window")?.scrollTo({ left: cards[index].offsetLeft, behavior: "smooth" });
      };
      const handlers = buttons.map((button, i) => { const handler = () => go(i); button.addEventListener("click", handler); return handler; });
      let drag: Draggable | undefined;
      if (context.conditions.desktop) {
        const distance = () => cards[2].offsetLeft - cards[0].offsetLeft;
        const tween = gsap.to(track, { x: () => -distance(), ease: "none", scrollTrigger: {
          trigger: journey, start: "top top", end: () => `+=${distance()}`, pin: true, scrub: 0.45,
          invalidateOnRefresh: true, anticipatePin: 1,
          onUpdate: self => select(Math.round(self.progress * 2)),
        } });
        trigger = tween.scrollTrigger;
        const proxy = document.createElement("div");
        let origin = 0;
        [drag] = Draggable.create(proxy, { trigger: track, type: "x", allowNativeTouchScrolling: true,
          onPress() { origin = trigger!.scroll(); gsap.set(proxy, { x: 0 }); this.update(); },
          onDrag() { trigger!.scroll(gsap.utils.clamp(trigger!.start, trigger!.end, origin - this.x)); },
          onDragEnd() { go(Math.round(gsap.utils.clamp(0, 1, (origin - this.x - trigger!.start) / (trigger!.end - trigger!.start)) * 2)); },
        });
      }
      select(0);
      const events = Array.from(scope.querySelectorAll<HTMLElement>(".event-card,.approved"));
      const shapes = ["M12 2 L22 21 L2 21 Z", "M3 4 L9 4 L9 17 L16 17 L16 7 L22 7", "M12 1 L15 9 L23 12 L15 15 L12 23 L9 15 L1 12 L9 9 Z", "M3 12 L9 18 L21 5"];
      let last = -1;
      const activate = (index: number) => {
        if (last === index) return;
        last = index;
        events.forEach((card, i) => {
          card.dataset.state = i === index ? "active" : i < index ? "complete" : "idle";
          gsap.to(card.querySelector("svg"), { scale: i === index ? 1.25 : 1, duration: 0.35, overwrite: true });
        });
        gsap.to(q(".state-shape"), { morphSVG: shapes[index], duration: 0.55, ease: "power2.inOut", overwrite: true });
        gsap.set(q(".state-display"), { attr: { "data-stage": index } });
      };
      if (context.conditions.desktop) {
        ScrollTrigger.create({ trigger: scope.querySelector(".reality-section"), start: "top top", end: "+=1600", pin: true, anticipatePin: 1, onUpdate: self => activate(Math.min(3, Math.floor(self.progress * 4))) });
      } else {
        events.forEach((card, i) => ScrollTrigger.create({ trigger: card, start: "top 65%", onEnter: () => activate(i), onEnterBack: () => activate(i) }));
      }
      activate(0);
      return () => { drag?.kill(); buttons.forEach((b, i) => b.removeEventListener("click", handlers[i])); split.revert(); };
    }, root);
    return () => mm.revert();
  }, [root]);
}
