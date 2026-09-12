"use client";

import { useLayoutEffect, useRef, useState } from "react";
import { flushSync } from "react-dom";
import { gsap } from "gsap";
import { Flip } from "gsap/Flip";
import { DrawSVGPlugin } from "gsap/DrawSVGPlugin";
import { MotionPathPlugin } from "gsap/MotionPathPlugin";
import { MorphSVGPlugin } from "gsap/MorphSVGPlugin";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { ArrowUpRight, Check, Fingerprint, Wallet, BookOpen, Coffee, MapPin, Route, CloudRain, Users, Clock, Sparkles } from "lucide-react";
import "./trip-experiences.css";
import "./proposal-lab.css";

export function TripExperiences({ locale }: { locale: string }) {
  const root = useRef<HTMLDivElement>(null);
  const animation = useRef<gsap.core.Timeline | null>(null);
  const [proposed, setProposed] = useState(false);
  const [member, setMember] = useState(0);
  const [evidence, setEvidence] = useState(0);
  const l = (en: string, zh: string, ms: string) => locale === "zh" ? zh : locale === "ms" ? ms : en;
  const members = [
    { name: "Alice", letter: "A", interest: l("Shopping & cafés", "购物与咖啡馆", "Membeli-belah & kafe"), pace: l("Time to explore", "留时间慢慢逛", "Masa untuk meneroka"), place: "Shibuya", color: "#accfff" },
    { name: "Bob", letter: "B", interest: l("Anime & gaming", "动漫与游戏", "Anime & permainan"), pace: l("A little adventure", "多一点冒险", "Sedikit pengembaraan"), place: "Akihabara", color: "#d2c6fa" },
    { name: "Charlie", letter: "C", interest: l("Culture & photography", "文化与摄影", "Budaya & fotografi"), pace: l("Less walking, more seeing", "少走路，多看风景", "Kurang berjalan, lebih melihat"), place: "Asakusa", color: "#f1cfaa" },
    { name: "David", letter: "D", interest: l("Food & relaxation", "美食与休闲", "Makanan & rehat"), pace: l("Leave room to unwind", "为休息留出空间", "Luangkan masa untuk berehat"), place: "Tsukiji", color: "#b7e2d3" },
  ];
  useLayoutEffect(() => {
    gsap.registerPlugin(Flip, DrawSVGPlugin, MotionPathPlugin, MorphSVGPlugin, ScrollTrigger);
    const mm = gsap.matchMedia();
    mm.add("(prefers-reduced-motion: no-preference)", () => {
      const scope = root.current!;
      const route = scope.querySelector<SVGPathElement>(".experience-route")!;
      const travel = gsap.timeline({ scrollTrigger: { trigger: ".preference-section", start: "top 75%", end: "bottom 40%", scrub: 0.6 } });
      travel.fromTo(route, { drawSVG: "0%" }, { drawSVG: "100%", duration: 1 }, 0)
        .to(scope.querySelector(".traveller"), { motionPath: { path: route, align: route, alignOrigin: [0.5,0.5] }, duration: 1, ease: "none" }, 0)
        .from(scope.querySelectorAll(".destination-dot"), { scale: 0, transformOrigin: "center", stagger: 0.22, duration: 0.12 }, 0);
      scope.querySelectorAll<HTMLElement>(".experience-reveal").forEach(card => gsap.from(card, { y: 45, opacity: 0, duration: 0.85, ease: "power3.out", scrollTrigger: { trigger: card, start: "top 88%", once: true } }));
      gsap.from(scope.querySelectorAll(".budget-slice"), { scaleX: 0, transformOrigin: "left", stagger: .2, duration: 1.2, ease: "power3.inOut", scrollTrigger: { trigger: ".budget-breakdown", start: "top 85%" } });
      gsap.from(scope.querySelectorAll(".evidence-wires path"), { drawSVG: "0%", stagger: .15, duration: 1.2, scrollTrigger: { trigger: ".proposal-lens", start: "top 75%" } });
    }, root);
    return () => { mm.revert(); animation.current?.kill(); };
  }, []);

  useLayoutEffect(() => {
    const path = root.current?.querySelector(".slimming-path");
    if (!path) return;
    const d = proposed ? "M100 216 C190 216 240 190 350 187 S500 170 620 162 S770 126 880 126" : "M100 216 C130 10 270 15 400 72 S900 330 640 280 S460 50 880 126";
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) { gsap.set(path, { attr: { d } }); return; }
    const tween = gsap.to(path, { morphSVG: d, duration: .95, ease: "power3.inOut" });
    return () => { tween.kill(); };
  }, [proposed]);

  function togglePlan() {
    animation.current?.progress(1);
    const state = Flip.getState(root.current!.querySelectorAll(".plan-stop,.route-stop"));
    flushSync(() => setProposed(value => !value));
    if (!window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      animation.current = Flip.from(state, { duration: 0.85, ease: "power3.inOut", stagger: 0.07, absolute: true, onEnter: elements => gsap.fromTo(elements, { opacity: 0, scale: 0.85 }, { opacity: 1, scale: 1, duration: 0.5 }) });
    }
  }
  const stops = proposed ? ["teamlab", "cafe", "sky", "dinner"] : ["teamlab", "sky", "shopping", "dinner"];
  const names: Record<string,string> = { teamlab: "teamLab Borderless", cafe: l("A proper café break", "好好喝杯咖啡", "Rehat di kafe"), sky: "Shibuya Sky", shopping: l("Shopping detour", "绕路购物", "Lencongan membeli-belah"), dinner: l("Dinner together", "一起吃晚餐", "Makan malam bersama") };
  return <div ref={root} className="trip-experiences">
    <section className="preference-section" id="preferences">
      <div className="experience-heading experience-reveal"><p className="eyebrow blue"><Fingerprint size={16}/>{l("Everyone belongs in the plan", "让每个人都在计划里", "Semua orang dalam rancangan")}</p><h2>{l("Four people.\nFour kinds of perfect.", "四个伙伴。\n四种理想旅程。", "Empat orang.\nEmpat perjalanan impian.")}</h2><p>{l("A great group trip makes room for differences. Tripify considers everyone's interests, budget and walking tolerance—not just the loudest voice.", "好的团体旅行容得下不同。Tripify 综合每个人的兴趣、预算和步行偏好，让安静的声音也被听见。", "Tripify mempertimbangkan minat, bajet dan keselesaan berjalan setiap ahli kumpulan.")}</p></div>
      <div className="preference-playground"><div className="member-picker" aria-label={l("Explore member preferences", "查看成员偏好", "Lihat pilihan ahli")}>{members.map((person,i) => <button key={person.name} aria-pressed={member===i} onClick={()=>setMember(i)} style={{"--member-color":person.color} as React.CSSProperties}><span>{person.letter}</span>{person.name}</button>)}</div><div className="preference-detail" aria-live="polite"><span>{members[member].name} <ArrowUpRight size={18}/></span><h3>{members[member].interest}</h3><p>{members[member].pace}</p><b><Check size={14}/>{members[member].place}</b></div>
      <svg className="group-route" viewBox="0 0 560 180" aria-hidden="true"><path className="route-ghost" d="M35 130 C110 130 90 40 180 50 S320 170 365 95 S450 35 520 55"/><path className="experience-route" d="M35 130 C110 130 90 40 180 50 S320 170 365 95 S450 35 520 55"/>{[[35,130],[180,50],[365,95],[520,55]].map(([x,y],i)=><g key={x} className="destination-dot"><circle cx={x} cy={y} r="7"/><text x={x} y={y+27} textAnchor="middle">{["Shibuya","Akihabara","Asakusa","Tsukiji"][i]}</text></g>)}<circle className="traveller" cx="35" cy="130" r="5"/></svg></div>
    </section>

    <section className="compromise-section route-lab" id="proposal-demo"><div className="experience-heading experience-reveal"><p className="eyebrow">{l("Try a proposal · illustrative demo", "试试提案 · 示例演示", "Cuba cadangan · demo ilustrasi")}</p><h2>{l("Less walking.\nNobody left out.", "少走一点路。\n不落下任何人。", "Kurang berjalan.\nTiada siapa tersisih.")}</h2><p>{l("Charlie wants to keep Shibuya Sky. The group wants a lighter day. Keep the highlight, remove the low-priority detour, add a café break. That is a compromise worth voting for.", "Charlie 想保留 Shibuya Sky，大家希望走得轻松一些。保留最期待的活动，去掉低优先级绕路，再加一个咖啡休息站。这样的折中，才值得大家投票。", "Kekalkan Shibuya Sky, buang lencongan dan tambah rehat di kafe. Semua keutamaan utama kekal.")}</p><button className="proposal-toggle" onClick={togglePlan} aria-pressed={proposed}>{proposed?l("Show original plan", "查看原行程", "Lihat rancangan asal"):l("Preview AI compromise", "预览 AI 折中方案", "Pratonton cadangan AI")}<ArrowUpRight size={18}/></button><small>{l("Preview only. Your group approves before anything changes.", "这里只是预览。实际行程需要团队批准后才会修改。", "Pratonton sahaja. Kumpulan mesti meluluskan perubahan.")}</small></div>
      <div className="route-theatre" data-proposed={proposed}>
        <div className="distance-display" aria-live="polite"><span>{l("WALKING / DAY 03", "第 3 天 / 步行距离", "BERJALAN / HARI 03")}</span><div><strong>{proposed ? "7.2" : "11.2"}</strong><b>km</b><small>{proposed ? l("−4 km. Same highlights.", "少走 4 km，精彩不减。", "−4 km. Keutamaan kekal.") : l("A detour you don't need.", "不必走的绕路。", "Lencongan tidak diperlukan.")}</small></div></div>
        <div className="route-scroll"><div className="route-canvas">
          <svg viewBox="0 0 1000 360" preserveAspectRatio="none" aria-hidden="true"><path className="old-route" d="M100 216 C130 10 270 15 400 72 S900 330 640 280 S460 50 880 126"/><path className="slimming-path" d="M100 216 C130 10 270 15 400 72 S900 330 640 280 S460 50 880 126"/></svg>
          {stops.map((id,i) => { const positions = proposed ? [[10,60],[35,52],[62,45],[88,35]] : [[10,60],[40,20],[64,78],[88,35]]; return <div className={`route-stop route-stop-${id}`} data-flip-id={`route-${id}`} key={id} style={{left:`${positions[i][0]}%`,top:`${positions[i][1]}%`}}><i>{id==="cafe"?<Coffee size={20}/>:<MapPin size={20}/>}</i><b>{names[id]}</b><small>{(proposed?["09:00","13:00","15:00","18:30"]:["09:00","14:00","16:00","18:30"])[i]}</small></div> })}
        </div></div><div className="route-caption"><span>TYO / 03</span><p>{l("Schematic route · illustrative distances, not geographic navigation", "示意路线 · 示例距离，非真实导航地图", "Laluan skematik · jarak ilustrasi, bukan navigasi")}</p><b>{proposed?l("Café break added", "已加入咖啡休息站", "Rehat kafe ditambah"):l("Shopping detour", "低优先级购物绕路", "Lencongan membeli-belah")}</b></div>
      </div>
      <div className="plan-demo experience-reveal"><div className="plan-demo-top"><span>DAY 03 / TOKYO</span><b>{proposed?l("Proposed", "提案预览", "Cadangan"):l("Original", "原行程", "Asal")}</b></div><div className="plan-stops">{stops.map((id,i)=><div className={`plan-stop ${id==='cafe'?'new-stop':''}`} data-flip-id={id} key={id}><time>{(proposed?["09:00","13:00","15:00","18:30"]:["09:00","14:00","16:00","18:30"])[i]}</time><span>{names[id]}</span>{id==='cafe'?<Check size={17}/>:<span className="stop-dot"/>}</div>)}</div><div className="plan-impact" aria-live="polite"><div><span>{l("Walking", "步行", "Berjalan")}</span><b>{proposed?"7.2":"11.2"}<small> km</small></b></div><div><span>{l("Group fit", "团队适配度", "Keserasian")}</span><b>{proposed?"89":"82"}<small> / 100</small></b></div><div><span>{l("Top priorities kept", "保留核心偏好", "Keutamaan kekal")}</span><b>4<small> / 4</small></b></div></div></div>
    </section>

    <section className="proposal-lens" id="proposal-evidence">
      <header className="lens-heading"><p className="eyebrow blue"><BookOpen size={16}/>{l("LOOK INSIDE THE PROPOSAL", "看清提案的每一面", "LIHAT DI SEBALIK CADANGAN")}</p><h2>{l("See the trade-offs.\nThen make the call.", "看清代价。\n再做决定。", "Fahami kesannya.\nKemudian putuskan.")}</h2><p>{l("A route is only half the story. Follow the cost and the evidence behind it.", "路线只是故事的一半。沿着费用与证据，看看推荐为何成立。", "Laluan hanya separuh cerita. Fahami kos dan bukti di sebaliknya.")}</p></header>
      <div className="lens-layout">
        <article className="budget-breakdown"><p className="lab-label"><Wallet size={16}/>{l("COST / FORECAST", "费用 / 预测", "KOS / RAMALAN")}</p><div className="forecast-total"><span>RM</span><strong>4,760</strong><small>/ 5,000</small></div><div className="budget-track" aria-label={l("4,120 current estimate, 640 projected additional cost, 240 headroom", "当前估算 4120，预测新增 640，剩余 240", "Anggaran 4120, tambahan 640, baki 240")}><span className="budget-slice current"/><span className="budget-slice projected"/><span className="budget-slice headroom"/></div>
        <dl className="budget-ledger"><div><dt><i/>{l("Current estimate", "当前估算", "Anggaran semasa")}</dt><dd>4,120</dd></div><div><dt><i/>{l("Projected additional cost", "预测新增费用", "Kos tambahan diramal")}</dt><dd>+640</dd></div><div><dt><i/>{l("Room left", "剩余空间", "Baki")}</dt><dd>240</dd></div></dl><p className="lab-footnote">{l("Illustrative forecast. The 640 is the difference between the current estimate and forecast, not a verified price for this route change.", "示例预测。640 为当前估算与预测总额的差值，并非本次路线变更的已核实报价。", "Ramalan ilustrasi. 640 ialah perbezaan anggaran dan ramalan, bukan harga perubahan laluan yang disahkan.")}</p></article>
        <div className="proposal-hub"><svg className="evidence-wires" viewBox="0 0 260 400" preserveAspectRatio="none" aria-hidden="true"><path d="M0 200H90"/><path d="M170 200C210 200 210 45 260 45"/><path d="M170 200C210 200 210 145 260 145"/><path d="M170 200C210 200 210 245 260 245"/><path d="M170 200C210 200 210 345 260 345"/></svg><div className="hub-core"><Sparkles size={30}/><span>TRIPIFY AI</span><b>{l("A proposal.\nNot a guess.", "有据可依。\n不是猜测。", "Cadangan.\nBukan tekaan.")}</b><small>{l("Illustrative demo", "示例演示", "Demo ilustrasi")}</small></div></div>
        <article className="evidence-explorer"><p className="lab-label"><Route size={16}/>{l("EVIDENCE / EXPLORE", "依据 / 点击探索", "BUKTI / TEROKAI")}</p><div className="evidence-switches">{[ [Users,l("Group fit", "兴趣适配", "Keserasian")], [Route,l("Travel time", "交通距离", "Masa perjalanan")], [CloudRain,l("Weather", "天气备选", "Cuaca")], [Clock,l("Crowd risk", "人潮风险", "Risiko sesak")] ].map(([Icon,label],i)=> { const EvidenceIcon=Icon as typeof Users; return <button key={i} aria-pressed={evidence===i} aria-controls="evidence-detail" onClick={()=>setEvidence(i)}><EvidenceIcon size={19}/><span>{label as string}</span><b>0{i+1}</b></button>; })}</div></article>
      </div>
      <div className="evidence-detail" id="evidence-detail" aria-live="polite"><span>0{evidence+1} / {l("WHY IT MATTERS", "推荐理由", "MENGAPA PENTING")}</span><h3>{[l("4 people. 4 reasons to go.", "4 位伙伴，都有想去的理由。", "4 orang. Semua berminat."),l("25 minutes from the previous stop.", "距上一站，约 25 分钟。", "25 minit dari hentian sebelumnya."),l("Rain doesn't have to cancel the day.", "下雨，也不用取消一整天。", "Hujan tidak membatalkan hari anda."),l("Choose the time, not the crowd.", "选对时间，避开人潮。", "Pilih masa, elakkan kesesakan.")][evidence]}</h3><p>{[l("The teamLab example matches all four members' interests. A high score supports discussion; it never replaces the group vote.", "teamLab 示例符合四位成员的兴趣。高分是讨论的依据，不替代团队投票。", "Contoh teamLab sesuai dengan empat ahli. Skor tidak menggantikan undian."),l("Travel time sits beside the recommendation so the group can judge the pace. Verify the route for the travel date.", "把交通时间放进推荐，让大家判断节奏是否轻松。实际路线需要按出行日期核实。", "Masa perjalanan membantu menilai rentak. Sahkan laluan mengikut tarikh."),l("An indoor activity offers flexibility. Tokyo National Museum is the illustrative backup, subject to availability.", "室内活动给行程多一点弹性。示例备用方案为 Tokyo National Museum，仍需核实开放及可用情况。", "Aktiviti dalaman memberi fleksibiliti. Sandaran contoh: Tokyo National Museum, tertakluk pada ketersediaan."),l("The example suggests 09:00–11:30 and flags crowds after 14:00. These are illustrative research notes, not live crowd data.", "示例建议 09:00–11:30，并提示 14:00 后的人潮风险。这些是研究示例，不是实时人流数据。", "Contoh mencadangkan 09:00–11:30, dengan risiko sesak selepas 14:00. Bukan data langsung.")][evidence]}</p></div>
      <details className="research-disclosure" onToggle={()=>ScrollTrigger.refresh()}><summary>{l("Research sources & limitations", "研究来源与限制", "Sumber & batasan kajian")}</summary><p>{l("The MVP combines place details, routes, weather and indexed public sources. This page uses illustrative data. Official hours, prices and bookings must be verified before travelling.", "MVP 综合地点信息、路线、天气与公开索引资料。本页使用示例数据，实际营业时间、价格与预约须在出行前核实。", "MVP menggabungkan tempat, laluan, cuaca dan sumber awam. Data halaman ini ialah ilustrasi; waktu, harga dan tempahan perlu disahkan.")}</p></details>
    </section>
  </div>;
}
