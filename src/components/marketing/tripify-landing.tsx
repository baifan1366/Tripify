"use client";

import { useRef } from "react";
import { TripExperiences } from "./trip-experiences";
import { useLandingMotion } from "./use-landing-motion";
import "./motion.css";
import Link from "next/link";
import {
  ArrowRight,
  ArrowUpRight,
  Check,
  CircleAlert,
  CloudRain,
  Compass,
  LockKeyhole,
  MapPin,
  MessageCircle,
  Route,
  Sparkles,
  ThumbsUp,
  UsersRound,
} from "lucide-react";

type Locale = "en" | "zh" | "ms";

const copy = {
  en: {
    nav: ["How it works", "For groups"], signIn: "Sign in", create: "Create your trip", eyebrow: "AI travel teammate for group trips",
    titleA: "Plan the trip.", titleB: "Decide together.", intro: "Tripify turns group opinions, real-world changes, and AI research into a trip everyone can stand behind.",
    human: "AI proposes. Humans decide.", demo: "See the decision flow", members: "4 people · Tokyo · 5 days", product: "A real decision, not a generated itinerary.",
    live: "LIVE TRIP WORKSPACE", day: "Day 3 · Tokyo", health: "Trip health 88", chat: "Group chat", proposal: "AI proposal", less: "Make Day 3 less tiring", reason: "11.2 km is above Charlie's walking preference.",
    walk: "Walking", cost: "Cost", fit: "Group fit", approve: "Approve", modify: "Modify", reject: "Reject", votes: "3 of 4 approve", preserve: "Keeps everyone's top priority",
    kicker: "Human in the loop", sectionTitle: "An AI teammate with a seat at the table.", sectionText: "Tripify reads the shared context, researches options, and explains the trade-offs. It never changes the trip silently.",
    step1: "The group speaks", step1Text: "Preferences, budget, pace and concerns are visible to everyone.", step2: "AI researches", step2Text: "It checks practical details: weather, routes, crowd risk, cost and fit.", step3: "People decide", step3Text: "Every consequential change becomes a proposal the group can approve, modify or reject.",
    proof: "The proposal is the product.", proofText: "Instead of replying with an opaque plan, Tripify shows what changes, why it changes, and who it helps.", why: "Why this works", evidence: "4/4 members interested", indoor: "Indoor alternative for rain", route: "25 min from previous activity", risk: "Crowd risk after 14:00", backup: "Backup ready", agent: "Tripify AI is researching…",
    reality: "When reality changes, the group stays in control.", realityText: "A flight delay or weather shift becomes an explainable backup proposal—not a surprise rewrite.", delay: "Flight delayed by 4 hours", affected: "3 activities affected", replan: "Replan proposal prepared", applied: "Applied after 4/4 approval", final: "A trip everyone can back.", finalText: "Bring your people, their preferences, and the unexpected. Tripify helps you make the next decision together.", register: "Registration required to create a trip", scroll: "Scroll to follow the route",
  },
  zh: {
    nav: ["如何运作", "适合团队"], signIn: "登录", create: "创建行程", eyebrow: "专为团体旅行打造的 AI 队友",
    titleA: "一起规划。", titleB: "一起决定。", intro: "Tripify 将团队意见、现实变化和 AI 研究，变成每个人都愿意支持的共同旅程。",
    human: "AI 提案，人类决定。", demo: "查看决策流程", members: "4 位成员 · 东京 · 5 天", product: "这是一次真实决策，不是一份生成式行程。",
    live: "实时行程工作台", day: "第 3 天 · 东京", health: "行程健康度 88", chat: "群组聊天", proposal: "AI 提案", less: "让第 3 天更轻松", reason: "11.2 公里超过了 Charlie 的步行偏好。",
    walk: "步行", cost: "费用", fit: "团队适配度", approve: "批准", modify: "修改", reject: "拒绝", votes: "4 人中有 3 人批准", preserve: "保留每个人最重要的活动",
    kicker: "Human in the loop", sectionTitle: "让 AI 成为有座位的旅行队友。", sectionText: "Tripify 读取共同情境、研究选项并说明取舍；它绝不会悄悄修改行程。",
    step1: "团队先表达", step1Text: "偏好、预算、节奏和顾虑都对每个人可见。", step2: "AI 再研究", step2Text: "它核对天气、路线、人潮风险、费用和团队适配度。", step3: "由人做决定", step3Text: "每个重要变更都会变成可批准、修改或拒绝的提案。",
    proof: "提案，才是产品本身。", proofText: "Tripify 不会给你一份难以理解的计划；它清楚展示改变了什么、为什么改变，以及谁会因此受益。", why: "推荐理由", evidence: "4/4 成员都感兴趣", indoor: "下雨时的室内替代方案", route: "距上一站 25 分钟", risk: "14:00 后人潮风险较高", backup: "备用方案已就绪", agent: "Tripify AI 正在研究…",
    reality: "现实变化时，团队依然掌握决定权。", realityText: "航班延误或天气变化会变成可解释的备用提案，而不是意外的行程重写。", delay: "航班延误 4 小时", affected: "3 个活动受影响", replan: "重新规划提案已准备", applied: "4/4 批准后已应用", final: "一段每个人都支持的旅程。", finalText: "带上你的伙伴、偏好和那些意外。Tripify 帮助大家一起做出下一次决定。", register: "注册后即可创建行程", scroll: "滚动，沿路线前进",
  },
  ms: {
    nav: ["Cara ia berfungsi", "Untuk kumpulan"], signIn: "Log masuk", create: "Cipta perjalanan", eyebrow: "Rakan sepasukan AI untuk perjalanan berkumpulan",
    titleA: "Rancang bersama.", titleB: "Putus bersama.", intro: "Tripify mengubah pendapat kumpulan, perubahan dunia sebenar dan penyelidikan AI menjadi perjalanan yang semua orang boleh sokong.",
    human: "AI mencadang. Manusia memutuskan.", demo: "Lihat aliran keputusan", members: "4 orang · Tokyo · 5 hari", product: "Keputusan sebenar, bukan jadual yang dijana.",
    live: "RUANG KERJA PERJALANAN LANGSUNG", day: "Hari 3 · Tokyo", health: "Kesihatan perjalanan 88", chat: "Sembang kumpulan", proposal: "Cadangan AI", less: "Jadikan Hari 3 lebih ringan", reason: "11.2 km melebihi keutamaan berjalan Charlie.",
    walk: "Berjalan", cost: "Kos", fit: "Keserasian kumpulan", approve: "Luluskan", modify: "Ubah", reject: "Tolak", votes: "3 daripada 4 lulus", preserve: "Mengekalkan keutamaan semua orang",
    kicker: "Manusia dalam gelung", sectionTitle: "Rakan AI yang ada tempat di meja.", sectionText: "Tripify membaca konteks bersama, menyelidik pilihan dan menerangkan pertukaran. Ia tidak mengubah perjalanan secara senyap.",
    step1: "Kumpulan bersuara", step1Text: "Pilihan, bajet, rentak dan kebimbangan dapat dilihat semua orang.", step2: "AI menyelidik", step2Text: "Ia menyemak cuaca, laluan, risiko kesesakan, kos dan keserasian.", step3: "Manusia memutuskan", step3Text: "Setiap perubahan penting menjadi cadangan yang boleh diluluskan, diubah atau ditolak.",
    proof: "Cadangan ialah produknya.", proofText: "Bukan pelan kabur. Tripify menunjukkan apa yang berubah, sebabnya, dan siapa yang dibantu.", why: "Sebab pilihan ini", evidence: "4/4 ahli berminat", indoor: "Alternatif dalaman untuk hujan", route: "25 min dari aktiviti sebelumnya", risk: "Risiko sesak selepas 14:00", backup: "Sandaran sedia", agent: "Tripify AI sedang menyelidik…",
    reality: "Apabila realiti berubah, kumpulan kekal berkuasa.", realityText: "Kelewatan penerbangan atau perubahan cuaca menjadi cadangan sandaran yang jelas—bukan penulisan semula mengejut.", delay: "Penerbangan lewat 4 jam", affected: "3 aktiviti terjejas", replan: "Cadangan pelarasan sedia", applied: "Dilaksana selepas 4/4 lulus", final: "Perjalanan yang semua orang sokong.", finalText: "Bawa orang anda, pilihan mereka, dan perkara tidak dijangka. Tripify membantu keputusan seterusnya dibuat bersama.", register: "Pendaftaran diperlukan untuk mencipta perjalanan", scroll: "Tatal untuk ikut laluan",
  },
} as const;

function TripifyMark() {
  return <svg aria-hidden="true" className="tripify-mark" viewBox="0 0 42 42" fill="none"><path d="M9 10h24M21 10v21" stroke="currentColor" strokeWidth="4" strokeLinecap="round"/><path d="M12 31c4.5-7 9-1.5 14-8s5-7 8-8" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeDasharray="2 5"/><circle cx="12" cy="31" r="2.5" fill="currentColor"/><circle cx="34" cy="15" r="2.5" fill="currentColor"/></svg>;
}

export function TripifyLanding({ locale }: { locale: string }) {
  const t = copy[(locale in copy ? locale : "en") as Locale];
  const root = useRef<HTMLElement>(null);

  useLandingMotion(root);

  return <main ref={root} className="tripify-site">
    <header className="site-header"><a className="brand" href="#top" aria-label="Tripify home"><TripifyMark/><span>Tripify</span></a><nav aria-label="Primary navigation">{t.nav.map((item, index) => <a key={item} href={index ? "#groups" : "#how-it-works"}>{item}</a>)}</nav><div className="header-actions"><Link className="sign-in" href="/sign-in">{t.signIn}</Link><Link className="create-trip" href="/sign-up"><LockKeyhole size={15}/>{t.create}<ArrowUpRight size={16}/></Link></div></header>

    <section id="top" className="hero"><div className="hero-copy"><p className="eyebrow"><Sparkles size={15}/>{t.eyebrow}</p><h1>{t.titleA}<br/><em>{t.titleB}</em></h1><p className="hero-intro">{t.intro}</p><div className="hero-actions"><Link className="create-trip large" href="/sign-up">{t.create}<ArrowUpRight size={18}/></Link><a className="text-link" href="#how-it-works">{t.demo}<ArrowDown/></a></div><p className="registration-note"><LockKeyhole size={13}/>{t.register}</p></div>
      <div className="hero-product" aria-label={t.product}><div className="product-top"><span className="workspace-label"><span className="live-dot"/>{t.live}</span><span>{t.day}</span><span className="health">● {t.health}</span></div><div className="product-body"><aside><span className="mock-logo"><TripifyMark/></span><span className="side-active">Plan</span><span>Map</span><span>{t.chat}</span><span>Budget</span></aside><section className="timeline"><div className="timeline-title"><span>{t.members}</span><b>{t.day}</b></div><div className="time-item"><time>09:30</time><div><b>teamLab Borderless</b><span>Indoor · 91 AI score</span></div></div><div className="time-item cafe"><time>13:00</time><div><b>Cafe break</b><span>New · 0.2 km</span></div></div><div className="time-item"><time>15:00</time><div><b>Shibuya Sky</b><span>Booked · 89 AI score</span></div></div></section><section className="proposal-card"><div className="proposal-title"><span><Sparkles size={15}/>{t.proposal}</span><span className="pending">VOTING</span></div><h2>{t.less}</h2><p>{t.reason}</p><div className="impact-grid"><Metric label={t.walk} before="11.2 km" after="6.1 km"/><Metric label={t.cost} before="RM120" after="RM140"/><Metric label={t.fit} before="82" after="91"/></div><div className="vote-row"><div className="avatars"><i>A</i><i>B</i><i>C</i><i className="muted-avatar">D</i></div><span>{t.votes}</span></div><div className="proposal-actions" aria-label={`${t.proposal} preview`}><span>{t.approve}</span><span>{t.modify}</span><span>{t.reject}</span></div></section></div><svg className="hero-route" viewBox="0 0 680 360" fill="none" aria-hidden="true"><path className="route-draw" d="M58 300C130 222 138 249 205 205S269 276 350 210s83-116 151-83 70-8 128-91" stroke="currentColor" strokeWidth="3" strokeDasharray="900" strokeDashoffset="900"/><circle cx="58" cy="300" r="7"/><circle cx="205" cy="205" r="7"/><circle cx="350" cy="210" r="7"/><circle cx="501" cy="127" r="7"/><circle cx="629" cy="36" r="7"/></svg></div>
      <p className="scroll-cue"><span/>{t.scroll}</p></section>

    <section id="how-it-works" className="human-section"><div className="section-intro reveal"><p className="eyebrow blue"><UsersRound size={15}/>{t.kicker}</p><h2>{t.sectionTitle}</h2><p>{t.sectionText}</p></div><div className="decision-journey"><div className="scene-toolbar"><span>{t.kicker}</span><div>{[t.step1,t.step2,t.step3].map((label,i)=><button className="scene-step" key={label} onClick={() => { if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) document.querySelectorAll(".flow-stage")[i]?.scrollIntoView({block:"nearest"}); }} aria-label={label}>{String(i+1).padStart(2,"0")}</button>)}</div><span>↔</span></div><div className="decision-window"><div className="decision-track"><Flow number="01" icon={<MessageCircle/>} title={t.step1} text={t.step1Text}/><Flow number="02" icon={<Compass/>} title={t.step2} text={t.step2Text}/><Flow number="03" icon={<ThumbsUp/>} title={t.step3} text={t.step3Text}/></div></div></div></section>

    <section className="proposal-showcase"><div className="showcase-copy reveal"><p className="eyebrow blue"><Sparkles size={15}/>{t.human}</p><h2>{t.proof}</h2><p>{t.proofText}</p><p className="preserve"><Check size={17}/>{t.preserve}</p></div><article className="recommendation reveal"><div className="recommendation-map"><div className="map-label"><MapPin size={16}/>Tokyo · Day 3</div><span className="map-node one"/><span className="map-node two"/><span className="map-node three"/><svg viewBox="0 0 400 210" aria-hidden="true"><path d="M34 162C106 154 90 69 180 86s73 102 184 7" fill="none" stroke="currentColor" strokeWidth="2" strokeDasharray="5 8"/></svg></div><div className="recommendation-body"><div><p className="card-label"><Sparkles size={14}/>{t.agent}</p><h3>teamLab Borderless</h3></div><div className="score"><b>91</b><span>AI score</span></div><div className="why-list"><p><Check/>{t.evidence}</p><p><Check/>{t.indoor}</p><p><Route/>{t.route}</p><p className="risk"><CircleAlert/>{t.risk}</p></div><div className="backup"><CloudRain size={17}/><span><b>{t.backup}</b><br/>Tokyo National Museum</span><ArrowRight size={18}/></div></div></article></section>

    <TripExperiences locale={locale}/>
    <section id="groups" className="reality-section"><div className="reality-copy"><p className="eyebrow"><CloudRain size={15}/>{t.backup}</p><h2>{t.reality}</h2><p>{t.realityText}</p></div><div className="replan-flow"><div className="state-display"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path className="state-shape" d="M12 2 L22 21 L2 21 Z"/></svg><span>{t.human}</span></div><div className="event-card delay"><CircleAlert/><div><span>EVENT</span><b>{t.delay}</b></div></div><div className="flow-line"/><div className="event-card"><Route/><div><span>IMPACT</span><b>{t.affected}</b></div></div><div className="flow-line"/><div className="event-card proposal"><Sparkles/><div><span>TRIPIFY AI</span><b>{t.replan}</b></div></div><div className="approved"><Check size={16}/>{t.applied}</div></div></section>

    <section className="closing"><div className="closing-route"><TripifyMark/></div><p className="eyebrow blue">TRIPIFY</p><h2>{t.final}</h2><p>{t.finalText}</p><Link className="create-trip large" href="/sign-up">{t.create}<ArrowUpRight size={18}/></Link></section>
  </main>;
}

function ArrowDown() { return <ChevronDownIcon/>; }
function ChevronDownIcon() { return <span aria-hidden="true" className="arrow-down">↓</span>; }
function Metric({ label, before, after }: { label: string; before: string; after: string }) { return <div><span>{label}</span><b>{before} <small>→</small> <strong>{after}</strong></b></div>; }
function Flow({ number, icon, title, text }: { number: string; icon: React.ReactNode; title: string; text: string }) { return <article className="flow-stage"><span>{number}</span><div className="flow-icon">{icon}</div><h3>{title}</h3><p>{text}</p></article>; }
