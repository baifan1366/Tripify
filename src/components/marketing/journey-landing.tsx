"use client";

import { useLayoutEffect, useRef, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { SplitText } from "gsap/SplitText";
import { DrawSVGPlugin } from "gsap/DrawSVGPlugin";
import { MorphSVGPlugin } from "gsap/MorphSVGPlugin";
import { Flip } from "gsap/Flip";
import { flushSync } from "react-dom";
import { ArrowUpRight, ArrowRight, Check, LockKeyhole, Plane, RotateCcw, Route, Sparkles } from "lucide-react";
import { TripExperiences } from "./trip-experiences";
import "./journey.css";

const photos = { city: "/travel/tokyo.jpg", street: "/travel/tokyo.jpg", cafe: "/travel/cafe.jpg" };
const names = ["Alice", "Bob", "Charlie", "David"];
function Mark() { return <svg viewBox="0 0 48 48" fill="none" aria-hidden="true"><path d="M8 10H40M24 10V39M8 37C15 20 32 38 40 20" stroke="currentColor" strokeWidth="4" strokeLinecap="round"/><circle cx="8" cy="37" r="4" fill="currentColor"/></svg>; }

export function JourneyLanding({ locale }: { locale: string }) {
  const root = useRef<HTMLElement>(null);
  const goChapter = useRef<(index: number) => void>(() => {});
  const flip = useRef<gsap.core.Timeline | null>(null);
  const [chapter, setChapter] = useState(0);
  const [decision, setDecision] = useState<"waiting" | "approved" | "rejected">("waiting");
  const [alternative, setAlternative] = useState(false);
  const l = (en: string, zh: string, ms: string) => locale === "zh" ? zh : locale === "ms" ? ms : en;
  const chapters = [l("Your people", "不同期待", "Kumpulan anda"), l("A shared route", "共同路线", "Laluan bersama"), l("Your decision", "你的决定", "Keputusan anda")];

  useLayoutEffect(() => {
    gsap.registerPlugin(ScrollTrigger, SplitText, DrawSVGPlugin, MorphSVGPlugin, Flip);
    const mm = gsap.matchMedia();
    const scope = root.current!;
    const q = gsap.utils.selector(scope);
    goChapter.current = i => scope.querySelectorAll(".atlas-chapter")[i]?.scrollIntoView({ block: "nearest", inline: "center", behavior: "smooth" });
    mm.add("(prefers-reduced-motion: no-preference)", () => {
      const split = SplitText.create(q(".departure-title"), { type: "words,chars", aria: "auto" });
      gsap.from(split.chars, { yPercent: 110, rotation: 6, opacity: 0, stagger: .018, duration: .95, ease: "power4.out" });
      gsap.from(q(".travel-fragment"), { y: 80, opacity: 0, stagger: .12, duration: 1.2, ease: "power3.out", delay: .25 });
      gsap.from(q(".departure-meta,.departure-actions"), { y: 20, opacity: 0, delay: .65, duration: .8 });
      gsap.from(q(".shared-thread"), { drawSVG: "0%", scrollTrigger: { trigger: ".departure", start: "top top", end: "bottom 45%", scrub: .6 } });
      gsap.to(q(".closing-thread"), { morphSVG: "M100 60 L500 60 M300 60 L300 220", scrollTrigger: { trigger: ".invitation", start: "top 80%", end: "top 20%", scrub: 1 } });
      return () => split.revert();
    }, scope);
    mm.add("(min-width: 960px) and (min-height: 650px) and (prefers-reduced-motion: no-preference)", () => {
      const fragments = q(".travel-fragment");
      const departure = scope.querySelector<HTMLElement>(".departure")!;
      const gather = gsap.timeline({ scrollTrigger: { trigger: departure, start: "top top", end: "+=950", pin: true, scrub: .8, invalidateOnRefresh: true } });
      gather.to(q(".departure-copy"), { opacity: 0, y: -80, duration: .35 }, 0);
      fragments.forEach((item: HTMLElement, i: number) => gather.to(item, {
        x: () => departure.clientWidth / 2 + (i - 1.5) * Math.min(265, departure.clientWidth / 4.5) - item.offsetLeft - item.offsetWidth / 2,
        y: () => departure.clientHeight * .53 - item.offsetTop - item.offsetHeight / 2,
        rotation: 0, scale: .92, duration: .8, ease: "power2.inOut",
      }, .1));
      gather.fromTo(q(".gathered-message"), { opacity: 0, y: 30 }, { opacity: 1, y: 0, duration: .4 }, .6);
      const atlas = scope.querySelector<HTMLElement>(".atlas")!;
      const belt = scope.querySelector<HTMLElement>(".atlas-belt")!;
      const tween = gsap.to(belt, { x: () => -(belt.scrollWidth - atlas.clientWidth), ease: "none", scrollTrigger: { trigger: atlas, pin: true, start: "top top", end: () => `+=${atlas.clientWidth * 2}`, scrub: .7, invalidateOnRefresh: true, onUpdate: s => setChapter(Math.round(s.progress * 2)) } });
      const trigger = tween.scrollTrigger!;
      goChapter.current = i => window.scrollTo({ top: trigger.start + (trigger.end - trigger.start) * i / 2, behavior: "instant" });
      gsap.from(q(".atlas-route"), { drawSVG: "0%", ease: "none", scrollTrigger: { trigger: atlas, start: "top top", end: () => `+=${atlas.clientWidth * 2}`, scrub: .7 } });
      return () => { goChapter.current = i => scope.querySelectorAll(".atlas-chapter")[i]?.scrollIntoView({ block: "nearest", inline: "center" }); };
    }, scope);
    ScrollTrigger.refresh();
    return () => { flip.current?.kill(); mm.revert(); };
  }, []);

  function choose(next: typeof decision, alt = alternative) {
    flip.current?.progress(1);
    const state = Flip.getState(root.current!.querySelectorAll(".decision-stop"));
    flushSync(() => { setDecision(next); setAlternative(alt); });
    if (!window.matchMedia("(prefers-reduced-motion: reduce)").matches) flip.current = Flip.from(state, { duration: .8, ease: "power3.inOut", stagger: .08 });
  }
  const applied = decision === "approved";
  const stops = applied ? (alternative ? ["hotel", "dinner", "sky"] : ["hotel", "sky", "dinner"]) : ["sky", "hotel", "dinner"];
  const stopNames: Record<string, string> = { hotel: l("Check in & recharge", "入住酒店，休息一下", "Daftar masuk & rehat"), sky: "Shibuya Sky", dinner: l("Dinner together", "一起吃晚餐", "Makan malam bersama") };

  return <main className="journey-site" ref={root} lang={locale}>
    <header className="journey-header"><a className="journey-brand" href="#top" aria-label="Tripify"><Mark/>Tripify</a><nav aria-label={l("Main navigation", "主导航", "Navigasi utama")}><a href="#how-it-works">{l("The journey", "一起出发", "Perjalanan")}</a><a href="#groups">{l("Your last vote", "投下最后一票", "Undian terakhir")}</a></nav><div><Link href="/sign-in">{l("Sign in", "登录", "Log masuk")}</Link><Link className="journey-button" href="/sign-up"><LockKeyhole size={14}/>{l("Create a trip", "创建行程", "Cipta perjalanan")}<ArrowUpRight size={17}/></Link></div></header>

    <section className="departure" id="top">
      <div className="departure-meta"><span>TRIPIFY / TOGETHER, SOMEWHERE.</span><span>{l("4 people · Tokyo · 5 days", "4 位伙伴 · 东京 · 5 天", "4 orang · Tokyo · 5 hari")}</span></div>
      <div className="departure-copy"><p>{l("AN AI TEAMMATE. A VERY HUMAN JOURNEY.", "AI 是队友，旅程由我们决定。", "RAKAN AI. PERJALANAN BERSAMA.")}</p><h1 className="departure-title">{l("Different dreams.", "不同的期待。", "Impian berbeza.")}<br/><em>{l("One shared journey.", "同一段旅程。", "Satu perjalanan.")}</em></h1><div className="departure-actions"><a className="journey-button" href="#how-it-works">{l("Bring it all together", "让期待汇成旅程", "Satukan impian")}<ArrowRight size={18}/></a><small>{l("Explore the demo. Register to create your own trip.", "先体验演示，注册后创建自己的行程。", "Terokai demo. Daftar untuk cipta perjalanan.")}</small></div></div>
      <div className="travel-fragment fragment-city"><div className="travel-photo"><Image src={photos.city} alt={l("Tokyo Tower at night", "东京塔夜景", "Tokyo Tower pada waktu malam")} fill sizes="(max-width: 680px) 160px, 245px" priority/></div><span>CHARLIE / TOKYO AFTER DARK</span><b>{l("Can we keep Shibuya Sky?", "Shibuya Sky，一定要保留。", "Kekalkan Shibuya Sky?")}</b></div>
      <div className="travel-fragment fragment-cafe"><div className="travel-photo"><Image src={photos.cafe} alt={l("A café in Tokyo", "东京的一间咖啡馆", "Kafe di Tokyo")} fill sizes="(max-width: 680px) 160px, 245px" priority/></div><span>ALICE / SLOW MORNINGS</span><b>{l("One more coffee stop?", "再加一站咖啡馆？", "Singgah kopi lagi?")}</b></div>
      <div className="travel-fragment fragment-note"><span>BOB / AKIHABARA</span><b>{l("A little adventure, please.", "冒险，也要安排上。", "Sedikit pengembaraan.")}</b><span className="note-stars">✳ ✳ ✳</span></div>
      <div className="travel-fragment fragment-ticket"><span>DAVID / TABLE FOR FOUR</span><b>{l("Dinner is on the itinerary.", "晚餐，四个人一起。", "Makan malam bersama.")}</b><div className="ticket-code"/><small>TYO — 04 FRIENDS — 05 DAYS</small></div>
      <svg className="departure-thread" viewBox="0 0 1400 320" preserveAspectRatio="none" aria-hidden="true"><path className="shared-thread" d="M0 70 C300 300 400 10 650 180 S1050 40 1400 170"/></svg><div className="departure-bottom"><span>01 — {l("EVERY VOICE COUNTS", "每个声音，都重要", "SETIAP SUARA PENTING")}</span><span>↓ {l("Scroll to connect", "滚动，让彼此连接", "Tatal untuk sambung")}</span></div>
      <div className="gathered-message"><span>FOUR VOICES. ONE ROUTE.</span><h2>{l("There’s room for all of you.", "每一份期待，都有位置。", "Ada ruang untuk semua.")}</h2></div>
    </section>

    <section id="how-it-works" className="atlas">
      <div className="atlas-toolbar"><span><Route size={16}/> HUMAN IN THE LOOP</span><div>{chapters.map((label, i) => <button key={label} aria-pressed={chapter === i} onClick={() => { setChapter(i); goChapter.current(i); }}><small>0{i + 1}</small>{label}</button>)}</div><a href="#groups">{l("Skip to your vote", "直接体验投票", "Terus mengundi")} ↗</a></div>
      <div className="atlas-window"><div className="atlas-belt">
        <svg className="atlas-map" viewBox="0 0 3000 700" preserveAspectRatio="none" aria-hidden="true"><path className="atlas-river" d="M0 480 C500 50 620 690 1200 330 S2300 650 3000 120"/><path className="atlas-route" d="M100 420 C360 100 730 700 1120 390 S1530 120 1780 400 S2400 630 2890 270"/></svg>
        <article className="atlas-chapter"><div className="atlas-heading"><span>01 / {chapters[0]}</span><h2>{l("A group chat.\nNot a group plan.", "聊了很多。\n还没决定。", "Banyak sembang.\nBelum ada pelan.")}</h2><p>{l("Four people bring four different ideas. Tripify makes room for the quiet voice, too.", "四个人带着四种期待。Tripify 也听见那些安静的声音。", "Empat orang, empat idea. Setiap suara didengari.")}</p></div><div className="opinion-stack">{names.map((name, i) => <div key={name} className={`opinion opinion-${i}`}><i>{name[0]}</i><div><span>{name}</span><b>{[l("Cafés & shopping", "咖啡馆与购物", "Kafe & beli-belah"), l("Anime & gaming", "动漫与游戏", "Anime & permainan"), l("Culture, less walking", "文化摄影，少走一点路", "Budaya, kurang berjalan"), l("Good food, no rush", "好好吃饭，不要太赶", "Makanan sedap, santai")][i]}</b></div></div>)}</div><span className="atlas-coordinate">35.6762° N / 139.6503° E</span></article>
        <article className="atlas-chapter research-chapter"><div className="atlas-heading"><span>02 / {chapters[1]}</span><h2>{l("Not just a place.\nA reason to go.", "不只推荐哪里。\n也解释为什么。", "Bukan sekadar tempat.\nSebab untuk pergi.")}</h2><p>{l("Interests, route, weather and cost become one explainable proposal.", "兴趣、路线、天气与费用，汇成一个说得清理由的提案。", "Minat, laluan, cuaca dan kos menjadi cadangan yang jelas.")}</p></div><div className="research-scene"><div className="research-photo"><Image src={photos.street} alt={l("Tokyo city atmosphere, not the attraction itself", "东京城市风景，非景点本身照片", "Suasana bandar Tokyo")} fill sizes="(max-width: 680px) 85vw, 40vw"/><span>TOKYO / EXPLORE TOGETHER</span></div><div className="research-caption"><Sparkles/><div><b>teamLab Borderless</b><p>{l("Illustrative research · 4/4 interested · indoor option", "研究示例 · 4/4 感兴趣 · 室内备选", "Contoh kajian · 4/4 berminat · dalam bangunan")}</p></div><strong>91<small>/100</small></strong></div></div></article>
        <article className="atlas-chapter"><div className="atlas-heading"><span>03 / {chapters[2]}</span><h2>{l("AI can propose.\nOnly you decide.", "AI 可以提案。\n决定权在你。", "AI mencadang.\nAnda memutuskan.")}</h2><p>{l("The route stays a possibility until your group approves it. No silent edits. No surprises.", "团队批准之前，路线始终只是一个可能。没有悄悄修改，也没有意外替你决定。", "Laluan kekal sebagai cadangan sehingga kumpulan meluluskannya.")}</p><a className="journey-button" href="#groups">{l("Cast the last vote", "投下最后一票", "Beri undian terakhir")}<ArrowUpRight size={18}/></a></div><div className="consensus"><span>AI PROPOSES</span><div>{names.map((n, i) => <i key={n}>{i < 3 ? <Check/> : "?"}</i>)}</div><strong>3 / 4</strong><p>{l("One decision left. Yours.", "还差一个决定。你的决定。", "Satu keputusan lagi. Keputusan anda.")}</p></div></article>
      </div></div>
    </section>

    <section id="groups" className="last-vote" data-decision={decision}>
      <div className="vote-intro"><span className="journey-kicker">02 — {l("THE UNEXPECTED, TOGETHER", "一起面对意外", "HADAPI PERUBAHAN BERSAMA")}</span><h2>{l("Life changed the plan.\nYou choose what’s next.", "计划赶不上变化。\n下一步，你来决定。", "Rancangan berubah.\nAnda tentukan seterusnya.")}</h2><p>{l("Interactive simulation. No real trip will be changed.", "互动模拟，不会修改任何真实行程。", "Simulasi interaktif. Tiada perjalanan sebenar diubah.")}</p></div>
      <div className="decision-board"><div className="decision-context"><div className="flight-event"><Plane/><span>EVENT / +4H</span><h3>{l("Your flight is delayed.", "航班延误了。", "Penerbangan lewat.")}</h3><p>{l("Three activities need attention. The group wants to keep the view and dinner together.", "三个活动需要调整。大家仍想保留夜景，以及一起吃晚餐。", "Tiga aktiviti terjejas. Kekalkan pemandangan dan makan malam bersama.")}</p></div><div className="agent-proposal"><Sparkles size={18}/><span>{l("AI proposal · simulated", "AI 提案 · 模拟", "Cadangan AI · simulasi")}</span><h3>{alternative ? l("A slower evening.", "换一个更从容的晚上。", "Petang lebih santai.") : l("Settle in. Keep the highlights.", "先安顿下来，保留最期待的。", "Berehat. Kekalkan keutamaan.")}</h3><p>{alternative ? l("Hotel → dinner → night view. Move the viewpoint later, after a relaxed meal.", "酒店 → 晚餐 → 夜景。先好好吃饭，再去看城市灯光。", "Hotel → makan malam → pemandangan malam.") : l("Hotel → Shibuya Sky → dinner. Check in first and shift the evening activities.", "酒店 → Shibuya Sky → 晚餐。先入住，再顺延晚间活动。", "Hotel → Shibuya Sky → makan malam.")}</p><small>{l("Illustrative estimate: RM 4,760 / RM 5,000. Opening times and bookings require verification.", "示例估算：RM 4,760 / RM 5,000。营业时间和预约仍需核实。", "Anggaran contoh: RM 4,760 / RM 5,000. Waktu dan tempahan perlu disahkan.")}</small></div></div>
      <div className="decision-itinerary"><div className="decision-label"><span>TOKYO / DAY 03</span><b>{applied ? l("Approved in demo", "演示中已批准", "Diluluskan dalam demo") : l("Original itinerary", "原行程", "Jadual asal")}</b></div><div className="decision-stops">{stops.map((id, i) => <div className="decision-stop" key={id} data-flip-id={`vote-${id}`}><span>0{i+1}</span><b>{stopNames[id]}</b>{applied ? <Check size={16}/> : <span>↗</span>}</div>)}</div><div className="voter-strip">{names.slice(0,3).map(n => <span key={n}><i>{n[0]}</i>{n}<Check size={13}/></span>)}<span className="your-vote"><i>{applied ? "✓" : "?"}</i>{l("You", "你", "Anda")}</span></div><div className="decision-status" aria-live="polite" role="status">{applied ? l("4/4 approved. The demo itinerary is now updated.", "4/4 已批准。演示行程现在才更新。", "4/4 diluluskan. Jadual demo kini dikemas kini.") : decision === "rejected" ? l("Proposal rejected. Your original itinerary is unchanged.", "已拒绝提案，原行程保持不变。", "Cadangan ditolak. Jadual asal tidak berubah.") : alternative ? l("Alternative ready. Review it before approving.", "替代方案已就绪，请查看后再批准。", "Alternatif sedia. Semak sebelum meluluskan.") : l("3 simulated approvals. The last vote is yours.", "3 位模拟成员已批准，最后一票交给你。", "3 kelulusan simulasi. Undian terakhir milik anda.")}</div><div className="decision-actions"><button className="journey-button" disabled={applied} onClick={() => choose("approved")}>{l("Approve", "批准", "Luluskan")}<Check size={16}/></button><button onClick={() => choose("waiting", !alternative)}>{l("Modify", "修改", "Ubah")}</button><button disabled={decision === "rejected"} onClick={() => choose("rejected")}>{l("Reject", "拒绝", "Tolak")}</button><button className="reset-vote" onClick={() => choose("waiting", false)} aria-label={l("Reset demo", "重置演示", "Tetapkan semula demo")}><RotateCcw size={16}/></button></div></div></div>
    </section>
    <TripExperiences locale={locale}/>
    <section className="invitation"><svg viewBox="0 0 600 260" aria-hidden="true"><path className="closing-thread" d="M30 200 C120 30 170 260 280 130 S430 240 570 30"/></svg><span>TRIPIFY / YOUR NEXT CHAPTER</span><h2>{l("Four people.\nOne “let’s go”.", "四个伙伴。\n一句「出发吧」。", "Empat orang.\nSatu perjalanan.")}</h2><p>{l("Bring your people. Keep your differences. Go together.", "带上伙伴，保留不同，一起出发。", "Bawa rakan. Raikan perbezaan. Pergi bersama.")}</p><Link className="journey-button" href="/sign-up"><LockKeyhole size={16}/>{l("Register & create your trip", "注册并创建行程", "Daftar & cipta perjalanan")}<ArrowUpRight size={18}/></Link><small>{l("Your group stays in control.", "决定权，始终在你们手中。", "Kumpulan anda kekal berkuasa.")}</small></section>
    <details className="photo-credits"><summary>{l("Photography credits", "摄影来源", "Kredit fotografi")}</summary><p>Tokyo Tower © <a href="https://commons.wikimedia.org/wiki/File:Tokyo_Tower,_Minato_City.jpg">David Kernan</a> · <a href="https://creativecommons.org/licenses/by/4.0/">CC BY 4.0</a>. Café © <a href="https://commons.wikimedia.org/wiki/File:Cafe_Darumado,_Tokyo_2023.jpg">しんぎんぐきゃっと</a> · <a href="https://creativecommons.org/licenses/by-sa/4.0/">CC BY-SA 4.0</a>. {l("Images cropped for display; illustrative travel photography.", "图片经展示裁切，仅作旅行氛围示意。", "Imej dipangkas untuk paparan.")}</p></details><footer className="journey-footer"><a className="journey-brand" href="#top"><Mark/>Tripify</a><span>{l("AI proposes. Humans decide.", "AI 提案，人类决定。", "AI mencadang. Manusia memutuskan.")}</span><div><Link href="/en">EN</Link><Link href="/zh">中文</Link><Link href="/ms">BM</Link></div></footer>
  </main>;
}
