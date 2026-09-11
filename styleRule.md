# Tripify · App Style Rules

版本：1.0 · 2026-09-10 · 适用范围：官方主页、登录前页面、登录后的应用及其共享组件。

> **这是后续开发的目标规范，不是已经完成的主题迁移。** 本次只制定文档，不安装组件、不替换运行时样式。现有主页的品牌方向保留；新增的颜色、尺寸与状态规则需按第 15 节逐步落地。

## 1. 设计定位与规范归属

**一句话：一张有旅行温度的协作地图，一个冷静可信的团队决策工作台。**

Tripify 是协助团队研究、比较、提案和投票的 AI 旅行队友，不是订票平台，也不是只有聊天框的 AI 包装。视觉始终服务于“AI proposes. Humans decide.”。

### 文档与代码的职责

| 来源 | 职责 |
| --- | --- |
| `Tripify — MVP Development Plan & Todo List.md` | 产品范围、提案流程、协作机制的业务依据 |
| `DESIGN.md` | 已有品牌方向与设计记忆；保留当前采用的值 |
| 本文件 `styleRule.md` | 后续应用的详细目标值、交互规则、组件接入和验收标准 |
| `src/app/globals.css` | 唯一运行时 token 源；完成迁移后与本规范同步 |
| `src/components/ui/` | 共享基础组件的实现，不在每个页面重新造一套 |
| 领域组件 | 把基础组件组合成提案、路线、预算等业务界面 |

新页面遵循本规范；旧页面按模块迁移。目标值与现状有差异时必须标注迁移，不把文档写成已实现。改变业务权限、投票门槛、提案状态转换不能靠样式规范决定；必须查业务与服务端契约。

### 同一品牌，两种表达密度

| 项目 | Marketing：首页、公开介绍 | App：团队决策与行程工作台 |
| --- | --- | --- |
| 任务 | 吸引注意、讲清价值、让访客尝试 | 快速理解、比较、共同决定 |
| 结构 | 大标题、摄影、路线叙事、深浅章节切换 | 紧凑标题、明确分区、数据与操作优先 |
| 留白 | 大、富有节奏 | 有呼吸感，但不浪费视口 |
| 动效 | 允许有界的横向滚动叙事、路径变形 | 仅表达选择、排序、变化、完成 |
| 禁止 | 假研究来源、假真实投票、假上线承诺 | 滚动劫持、循环漂浮、每张卡都发光 |

Tripify 的识别点是**路线连接人与决策**：偏好 → 证据 → 提案 → 人的决定 → 新路线。不要用通用紫色 AI 光球代替它。

## 2. 颜色系统

### 2.1 品牌原色：保留主页识别度

| Token | 色值 | 使用规则 |
| --- | --- | --- |
| `--trip-ink` | `#07182C` | 品牌深色、深色章节底色、浅色模式主文字 |
| `--trip-route` | `#2E7CF6` | 路线、品牌标记、装饰性连接线；不是所有按钮的背景 |
| `--trip-sky` | `#B8DEFF` | 深色背景上的轻量强调、天空氛围 |
| `--trip-cloud` | `#F6F8FC` | 浅色应用画布 |
| `--trip-slate` | `#68778A` | 保留旧品牌变量；小正文改用下方语义文字色 |
| `--trip-success` | `#197A57` | 浅色模式成功语义基础色 |

`#2E7CF6` 与白色的对比度约 **3.94:1**，不适合普通字号白字按钮。目标主按钮改为 `#1765D8`，与白色约 **5.40:1**。保留品牌路线蓝，不等于保留不合格的文字组合。

### 2.2 核心语义 token：浅色 / 深色

以下为不透明 sRGB 色值。默认先交付完整浅色主题；深色为目标配方，必须完成组件状态测试后才能宣称支持。首页的深色章节不等同于整个应用支持深色模式。

| CSS token | Light | Dark | 含义 |
| --- | --- | --- | --- |
| `--background` | `#F6F8FC` | `#07182C` | 页面画布 |
| `--foreground` | `#07182C` | `#F3F7FC` | 主要正文 |
| `--card` | `#FFFFFF` | `#10263D` | 内容面板 |
| `--card-foreground` | `#07182C` | `#F3F7FC` | 卡片正文 |
| `--popover` | `#FFFFFF` | `#173149` | 菜单、浮层 |
| `--popover-foreground` | `#07182C` | `#F3F7FC` | 浮层正文 |
| `--primary` | `#1765D8` | `#8CBDFF` | 主操作背景、强调文字 |
| `--primary-foreground` | `#FFFFFF` | `#07182C` | 主操作上的文字 |
| `--primary-hover` | `#1256BE` | `#AACFFF` | 主操作 hover |
| `--primary-active` | `#10499D` | `#6CA5F0` | 主操作按下 |
| `--secondary` | `#EAF1FA` | `#1B354F` | 次级操作背景 |
| `--secondary-foreground` | `#193B61` | `#D7E8FC` | 次级操作文字 |
| `--surface-hover` | `#EDF3FB` | `#1B354F` | 中性可点击区域 hover |
| `--surface-active` | `#DFEAF8` | `#264561` | 中性区域按下 |
| `--muted` | `#EEF2F7` | `#142C44` | 安静辅助面 |
| `--muted-foreground` | `#526780` | `#A7BAD0` | 次要正文、帮助、占位提示 |
| `--accent` | `#E8F1FF` | `#163B63` | 选中项、菜单高亮 |
| `--accent-foreground` | `#1256BE` | `#B8DEFF` | 选中项文字 |
| `--border` | `#D9E2ED` | `#36516B` | 非关键装饰分隔线 |
| `--input` | `#8295AD` | `#6D88A4` | 可识别的输入框边界 |
| `--ring` | `#1765D8` | `#8CBDFF` | 键盘焦点 |
| `--disabled` | `#E7EDF4` | `#1B3046` | 不可用背景 |
| `--disabled-foreground` | `#607287` | `#91A4BA` | 不可用文字 |

装饰分隔线不承担控件可识别性。输入框、复选框等必要边界需要与相邻背景至少 3:1；普通文字至少 4.5:1，大字至少 3:1。所有实际组合还要验证透明度、底图和 hover 后的结果。

### 2.3 状态色与软背景

| 语义 | Light 前景 / 软背景 | Dark 前景 / 软背景 | 场景 |
| --- | --- | --- | --- |
| Info | `#1765D8` / `#E8F1FF` | `#8CBDFF` / `#163B63` | AI 研究、待审阅提案、普通说明 |
| Success | `#197A57` / `#E8F5EE` | `#80DDB4` / `#103D31` | 已通过、已应用、已成功保存；标签必须区分 |
| Warning | `#945500` / `#FFF3DB` | `#F4C775` / `#422F16` | 天气风险、预算预警、需注意 |
| Danger | `#B42332` / `#FDECEF` | `#FFA6AE` / `#481F2C` | 失败、破坏性操作、严重风险 |
| Neutral | `#526780` / `#EEF2F7` | `#A7BAD0` / `#142C44` | 草稿、未投票、一般元信息 |

补充变量命名为 `--status-{info|success|warning|danger}-{fg|bg}`。`--destructive` 引用 danger 前景，不另配一套红色。

破坏性最终确认按钮：Light 背景 `#B42332` → hover `#981C29` → active `#7F1723`，白字；Dark 背景 `#FFA6AE` → `#FFBDC3` → `#F58B98`，深色文字 `#07182C`。

状态不能仅靠颜色。始终配合名称、图标或线型。“未被采用的方案”默认中性，不等于系统故障；“花费增加”是差异，不自动等于危险；预算风险阈值由产品规则决定。

## 3. 间距与页面网格

### 3.1 间距标尺

以 4px 为基本步进；文字光学校正允许 2px，不能用来随意创建布局值。

| 值 | Tailwind 示例 | 主要用途 |
| --- | --- | --- |
| 4px | `gap-1` | 标签与微型状态、紧凑堆叠 |
| 8px | `gap-2` | 图标与文字、按钮组 |
| 12px | `gap-3` | 列表内元素、紧凑卡片 padding |
| 16px | `gap-4` / `p-4` | 默认卡片 padding、移动端页面边距 |
| 20px | `p-5` | 需要较强分组的卡片 |
| 24px | `gap-6` / `p-6` | 面板内分区、桌面页面边距 |
| 32px | `gap-8` | 页面主要内容组间距 |
| 40px / 48px | `gap-10` / `gap-12` | 大区块、空状态留白 |
| 64px / 80px / 112px | `py-16` / `py-20` / `py-28` | 营销章节；不要带进普通表单 |

字段 label 到 input：8px；input 到帮助/错误：4px；字段组之间：20px；标题到正文：8–12px；正文到操作：16–24px。同一表单统一一种密度。

### 3.2 页面模式

- **官网**：最大内容宽度 78rem；桌面章节垂直 112px，平板 80px，手机 64px；可为叙事章节保留独立命名例外。
- **普通 App 页面**：内容最大 1200px；桌面边距 24–32px、手机 16px；页面标题区下方 24px。
- **表单 / 设置**：正文最大 720px；短表单可以 480px；不要为了填满桌面把输入框拉到全屏。
- **Decision Workspace**：全宽工作画布，行程 / 地图 / AI 的目标比例 25 / 45 / 30；不是不可改变的固定宽度。
- **工作台顶部**：TripHeader 建议 64px，紧凑工具栏 48px；移动端允许标题换行，不能写死导致遮挡。

### 3.3 响应式约定

| 宽度 | 工作台布局 |
| --- | --- |
| ≥1280px 且面板空间足够 | 三栏；建议行程至少 280px、地图 380px、AI 320px；不足时提前降级 |
| 768–1279px | 行程 + 地图；AI 通过明确按钮打开 Sheet 或独立面板 |
| <768px | Plan / Map / Chat / Decisions / Budget 五项导航，单一主要视图 |

断点以内容可用性为准。不得在手机上缩小整个三栏界面；切换视图保留所选日期、活动和未提交文本。底部导航预留 safe-area，键盘出现时输入与提交操作仍可见。

默认页面自然滚动。只有工作台自己的面板可采用完整的 `min-height: 0` + overflow 链；禁止为了某张表而给全站 body 加 `overflow: hidden`。不允许地图、聊天、文档产生无意义的多重滚动争夺。

## 4. 字体与信息层级

沿用现有主页字体方向，不为“高级感”额外混入多套字体。

- 正文 / 标题：`Arial, 'Noto Sans SC', 'Microsoft YaHei', sans-serif`。
- 工具数字 / 时间：`'SFMono-Regular', Consolas, monospace`；中文标签仍用正文字体。
- 金额、时间、投票计数使用 `font-variant-numeric: tabular-nums`，避免更新时跳动。
- 当前未确认加载了 Noto Sans SC 字体文件；仅写 fallback 不代表字体已安装或下载。未来加载时预留布局并检查授权。

| 角色 | 字号 / 行高 | 字重 | 使用 |
| --- | --- | --- | --- |
| 官网 Hero | `clamp(40px, 6vw, 88px)` / 1.08；中文 1.18 | 700 | 短句，不用于应用内 |
| 官网章节标题 | 32–56px / 1.2 | 700 | 叙事分区 |
| App 页标题 | 28px / 36px | 700 | 一页一个主标题 |
| 面板标题 | 20px / 28px | 600 | 行程、提案、预算 |
| 卡片标题 | 16px / 24px | 600 | 活动、研究结论 |
| 正文 | 16px / 24px | 400 | 描述、聊天、表单输入 |
| 紧凑正文 / 控件 | 14px / 20px | 400 / 600 | 列表、按钮、标签 |
| 辅助元信息 | 12px / 18px | 400 | 来源时间等；不用作主要操作 |

中文多行正文 line-height 建议 1.65；中文不使用英文标题的负字距。英文展示标题可 `letter-spacing: -0.03em`；正文不人为拉宽。移动端输入字号至少 16px。

活动名、错误信息与决策原因允许换行。只有非关键摘要可截断；完整内容必须可通过点击或键盘展开，不能只靠 hover tooltip。

## 5. 圆角、边框、阴影与图标

| 角色 | 目标 token / 值 |
| --- | --- |
| 紧凑标签 | `--radius-tag: 6px` |
| 按钮、输入、菜单项 | `--radius-control: 10px` |
| App 卡片、Popover | `--radius-panel: 16px` |
| Dialog、官网展示卡片 | `--radius-showcase: 24px` |
| 头像、路线节点、简短状态 pill | `--radius-pill: 999px` |

普通卡片默认 1px `--border`，无阴影。App 卡片 16px 是新增的紧凑变体；官网现有 24px 保留。不要机械地把所有 Card 改为同一巨大圆角。

- 浮层阴影：Light `0 12px 32px rgb(7 24 44 / 12%)`；Dark `0 12px 32px rgb(0 0 0 / 28%)`。
- Dialog 阴影：Light `0 24px 64px rgb(7 24 44 / 18%)`；Dark `0 24px 64px rgb(0 0 0 / 36%)`。
- 遮罩：Light `rgb(7 24 44 / 48%)`；Dark `rgb(0 0 0 / 60%)`。
- 阴影不是唯一边界；深色面板仍保留边框。不在所有卡片上使用玻璃模糊。
- 图标统一 Lucide，stroke 1.75，通常 16px 元信息、20px 控件、24px 空状态辅助。
- AI 可用 Sparkles / `✦`，但需搭配“AI 提案 / AI 研究”等文字。状态图标不能被装饰动效覆盖。
- 暂未确定最终 Logo：延续路线构成的 T + Tripify 字标；不要在各页面自创不同飞机图标。

## 6. Hover、按下、焦点与按钮

### 6.1 通用状态矩阵

| 状态 | 统一反馈 |
| --- | --- |
| Default | 可点击对象必须有明确形态或语义；信息卡片不假装按钮 |
| Hover | 背景 / 边框改变；只在支持 hover 的设备上提供增强 |
| Active / Pressed | 使用 active token；普通按钮可缩至 0.98，松开恢复 |
| Focus-visible | 2px 实线 `--ring`，offset 2px；不可用低透明度光晕替代 |
| Selected / Checked | 持续的 accent 背景 + 标记 / 下划线 / 图标，鼠标离开仍明确 |
| Disabled | disabled token、禁止触发；不是只改 opacity；必要时在控件旁说明原因 |
| Busy | 保持原宽高、显示加载标记和可读状态、阻止重复提交 |
| Error | 保留内容，显示原因与恢复操作；不得仅闪一下红色 |

所有可用按钮与导航链接使用 pointer cursor；文本输入保持 text，拖拽把手 grab / grabbing。Disabled 不得继续呈现有效 hover 或执行事件。若保留可聚焦的 `aria-disabled` 以解释原因，必须同时拦截鼠标与键盘操作。

### 6.2 按钮视觉配方

| 变体 | Default | Hover | Pressed | 用途 |
| --- | --- | --- | --- | --- |
| Primary / solid | primary 背景 + primary-foreground | primary-hover | primary-active | 当前区域最重要的操作 |
| Secondary | secondary 背景 + secondary-foreground | surface-active | accent | 次要但常用操作 |
| Outline | card 背景 + foreground + input 边界 | surface-hover | surface-active | 取消、对比、辅助操作 |
| Ghost | 透明 + foreground | surface-hover | surface-active | 工具栏、次要入口 |
| Link | primary 文字 | 下划线 + primary-hover | primary-active | 文本导航；正文链接默认带下划线 |
| Danger / quiet | danger 前景，透明 | danger 软背景 | danger 软背景 + 内边框 | 删除入口 |
| Danger / solid | 第 2.3 节红色配方 | 同配方 | 同配方 | 最终破坏性确认 |

深浅主题共用语义配方，不在页面内分别写硬编码色值。按钮的“强调程度”和“业务意图”分开建模；不要为了不同页面扩展十几个同义 variant。

### 6.3 按钮尺寸与动作语义

| 尺寸 | 高度 | 横向 padding | 字号 / 图标 |
| --- | --- | --- | --- |
| Compact | 36px | 12px | 14px / 16px |
| Default | 40px | 16px | 14px / 18–20px |
| Touch | 44px | 16px | 14–16px / 20px |
| Large | 48px | 20px | 16px / 20px |

图标按钮默认 40×40，触摸场景至少 44×44；较小可见图标用外层真实点击区域补足。相邻点击区域不得重叠。

- 一个局部决策区域通常一个主按钮，不把每张卡都涂成主操作。
- “预览 AI 折中方案”“赞成提案”“应用已通过提案”不是同一个动作，标签必须说清真实结果。
- 赞成按钮仍用品牌主色；绿色优先表示结果，不用绿色制造已经完成的错觉。
- 未登录的创建入口使用“注册并创建行程”等明确文案，保持可访问；不要把可注册的入口做成无解释的 disabled。
- 拒绝提案通常不是删除数据，默认 outline / neutral，不滥用破坏性红色。
- 菜单触发器、输入、复选框、拖拽项不跟随按钮缩放；不能影响浮层定位或命中区域。

## 7. 动效系统：路线感，而非全屏特效

### 7.1 时间与 easing

| Token | 值 | 用途 |
| --- | --- | --- |
| `--motion-press` | 80ms | 按下响应 |
| `--motion-fast` | 120ms | hover、颜色与边框 |
| `--motion-base` | 180ms | 弹层、切换指示器 |
| `--motion-layout` | 280ms | 卡片位置、前后差异 |
| `--motion-story` | 600ms | 官网标题与路线叙事，允许场景级调整 |
| `--ease-ui` | `cubic-bezier(0.2, 0, 0, 1)` | 普通 UI 进入与恢复 |

只声明实际变化的属性，例如 background-color、border-color、color、transform、opacity；禁止共享组件默认 `transition-all`。App 中 hover 不浮起整张信息卡；官网可点击展示卡最多 translateY(-2px)。

### 7.2 动效技术分工

- **CSS**：按钮、focus、Tabs、简单展开等高频微交互。
- **GSAP ScrollTrigger**：只用于官网叙事；保持有界 pin，内容与导航无动效时仍可访问。
- **GSAP Flip**：提案前后活动位置变化；真实 App 必须以服务端确认状态为准。
- **DrawSVG / MotionPath**：解释路线和事件传递，不伪装实时追踪数据。
- **MorphSVG**：官网路线到 T 等品牌转场；不要把关键状态文字 morph 成不可读形状。
- **Draggable**：只有确有排序/比较需求时使用；必须提供“上移 / 下移”或选择按钮替代。
- 不因为动画种类不够而再引入 Motion / Framer Motion；现有 CSS + GSAP 已足够。若后续引入，明确属性所有权，不能两套系统同时控制同一 transform。

### 7.3 SVG 状态契约

每个业务图形至少定义 idle / active / completed，必要时增加 warning；独立状态来自当前步骤，而不是共享一个无限循环动画。

例如 Event → Impact → Proposal：当前节点蓝色强调并显示文字，已经过的节点显示连接完成，未来节点中性；completed 只代表图解阶段完成，不代表真实提案已应用。应用内状态由数据驱动，不能由滚动距离决定投票结果。

有意义的图解配 `<title>` / 可读说明，纯装饰 SVG 设 `aria-hidden`。动画结束必须停在可读状态。

### 7.4 安全与降级

- `prefers-reduced-motion: reduce`：移除 pin、parallax、自动路径移动、缩放与布局飞行；内容直接展示，必要的颜色反馈仍保留。
- 路由离开 / 组件卸载清理 timeline、ScrollTrigger、监听器；React 开发模式重复挂载不能叠加动画。
- 首屏和滚动章节不得依赖 JS 把永久 opacity:0 的关键内容救回来。
- 状态改变立即可读，动画不阻塞提交、取消与键盘导航。避免装饰动画不断占用 GPU。

## 8. shadcn 接入与主题映射

### 8.1 已有配置，不是从零安装

当前仓库 `components.json` 已配置 `base-nova`、`cssVariables: true`、Lucide、`@/components/ui`；已有 Button 基于 **Base UI**，不是 Radix。后续添加组件沿用该体系，不混装另一套同名底层组件。

shadcn 引入的是可维护源码，不是直接接受默认外观。每次加入组件，都应检查生成代码的尺寸、状态选择器、主题与无障碍契约。

### 8.2 唯一 token 链路

`globals.css :root / .dark → @theme inline 语义别名 → 共享 ui 组件 → 领域组件 → 页面`。

| shadcn / Tailwind 用法 | Tripify 来源 |
| --- | --- |
| `bg-background text-foreground` | 页面画布与正文 |
| `bg-card text-card-foreground` | 信息面板 |
| `bg-primary text-primary-foreground` | 主操作 |
| `bg-accent text-accent-foreground` | 选中项 |
| `text-muted-foreground` | 次要正文 |
| `border-border` | 装饰分隔 |
| `border-input` | 输入控件必要边界 |
| `outline-ring` 或等效实线 | 焦点 |
| `bg-popover text-popover-foreground` | Portal 浮层 |

新 hover token 需注册 Tailwind v4 别名，不能只在 `:root` 声明后假设 utility 自动存在。示意，**不是已经应用的代码**：

```css
@theme inline {
  --color-primary-hover: var(--primary-hover);
  --color-primary-active: var(--primary-active);
  --color-surface-hover: var(--surface-hover);
  --color-surface-active: var(--surface-active);
  --radius-control: var(--trip-radius-control);
  --radius-panel: var(--trip-radius-panel);
}
```

圆角表中的角色值在运行时可采用 `--trip-radius-*` 源变量，避免别名自引用。字体同理：使用具体字体栈或 `--trip-font-sans`，禁止 `--font-sans: var(--font-sans)`。

当前 `--radius: .625rem` 经现有倍率得到的 `rounded-xl` 是 14px，**不是**官网的 24px。需要准确形状时使用明确角色别名，不通过改一个基础半径意外改变所有组件。

深色 theme class 放在覆盖 Portal 的共同祖先，通常为 html；局部官网深色区若打开浮层，必须显式传递主题上下文，防止浅色菜单突然出现在深色体验里。

### 8.3 每个组件导入后必须调整的项目

| 组件 | Tripify 调整与行为 |
| --- | --- |
| Button | 默认 40px；替换灰黑主色、透明度 hover、transition-all；补齐 busy 与命中尺寸 |
| Card | App 16px 圆角 / 16–20px padding；默认无阴影；静态卡不加 hover |
| Badge | 6px 或 pill 的明确变体；状态色配图标与文字；不是按钮则无手型 |
| Input / Textarea | 40px / 触摸 44px；真实 label；输入边界、error、readonly；textarea 自增高并提供长文展开 |
| Checkbox / Radio / Switch | 默认、hover、checked、focus、disabled；可见控件配足触摸区；不自创键盘行为 |
| Tabs | hover 与 selected 分离；活动项下划线或底色；键盘导航保留；页签多时可横滚 |
| Dialog / AlertDialog | 24px 圆角、24px padding、建议宽 480–560px；最大宽 calc(100vw - 32px)；可滚动正文、焦点回归 |
| Sheet / Drawer | 桌面详情建议宽 440px；手机使用可达的全宽布局；模态与常驻面板明确区分 |
| Popover / DropdownMenu | 16px 外圆角、8px padding；菜单行 36px / 触摸 44px；视口碰撞与内部滚动 |
| Select / Combobox | 使用维护的可访问组件；下拉宽度与触发器对齐；空结果、长选项、清除、键盘可用 |
| Command | 分组标题、快捷键、无结果状态；搜索不吞中文输入法 Enter；无快捷键也可访问 |
| Tooltip | 只提供补充说明；键盘 focus 也可打开；重要状态不可仅在 tooltip 中 |
| Avatar | 24px 紧凑、32px 默认、40px 成员；缺头像显示姓名首字符；完整姓名可读 |
| Progress | 只有真实可计算进度才显示百分比；预算必须同时显示金额、单位与上限 |
| ScrollArea | 继承全局滚动条与键盘可操作性；不要隐藏滚动暗示 |
| Separator | 使用 border 色；分区主要靠间距，不给每一行加粗线 |
| Alert / Toast | 语义色、明确动作；持续风险用 inline Alert；Toast 不承载唯一错误信息 |
| Table | 数字右对齐、文字左对齐；表头 40px、数据行至少 48px；长文本可展开；排序是实际按钮 |

Base UI 的组合 API、受控状态和 data 属性以**当前生成源码与对应文档**为准；不要直接复制 Radix 的 `asChild`、`data-state` 等假设。保留底层焦点管理、键盘交互与 aria 属性，不为样式简化删掉它们。

图表色号按信息含义命名；路线用蓝色，风险用 warning，已完成用 success。多类别数据额外配标签、线型或纹理，不能把任意彩虹色当装饰。Sidebar 若引入，其语义色引用上述 token，不单独保留 neutral 灰黑主题。

## 9. Tripify 专属领域组件

### 9.1 ProposalCard / ProposalDiff / VotePanel

卡片固定阅读顺序：**状态与发起者 → 改什么 → 为什么 → 前后差异 → 对团队的影响 → 投票情况 → 操作**。

- Diff 明确标注“原方案 / 建议方案”；新增、移除、保留以图标和文字区分，不能只靠红绿。
- 对比同一维度：步行距离、时间、费用、保留偏好。未知显示“暂缺数据”，不是 0。
- 移动端上下堆叠仍重复“原 / 建议”标题，不丢比较语义。
- VotePanel 显示成员与选择、未投票人数、真实规则说明；不能因为首页演示是 4 人就把全票通过写死。
- Reject / Modify 保留原提案上下文；修改产生新提案的关联清楚可追踪。

| 业务状态 | 视觉表达 | 不可误导之处 |
| --- | --- | --- |
| DRAFT | neutral，“草稿” | 不暗示已经发给成员 |
| PENDING | info，“待审阅” | 不暗示已开始有效投票 |
| VOTING | info，“投票中” + 实际计数 | 不用动画伪造进度 |
| APPROVED | success outline，“已通过 · 尚未应用” | 不等同于行程已经更新 |
| APPLIED | success soft + check，“已应用” + 时间 | 仅在真实更新确认后展示 |
| REJECTED | neutral，“未通过” + 可查看原因 | 不是系统失败 |

上述是产品文档状态的展示约定，不定义谁可以切换状态。应用请求失败时保留“已通过”并显示失败原因，不能提前显示“已应用”。多人同时变更导致版本冲突时，要求查看最新方案，不能静默覆盖。

### 9.2 ActivityCard / DayTimeline / RouteSegment / Map

- ActivityCard 主层：时间、名称、地点；次层：预计费用、交通时间、推荐时间、风险；详细研究折叠。
- 活动选中后，时间轴卡片、地图节点、AI 上下文同步强调；仅 hover 不能改变正式选择。
- RouteSegment 显示交通方式、时间、距离；未知标明估算或不可用。路线颜色不是唯一标记。
- 已选择路线实线 + 加粗，备选路线虚线 + 文字说明；不要把全地图所有 marker 同时点亮。
- 地图加载失败时保留地点列表、路段文字与重试入口；不能使整个行程不可用。

### 9.3 AIMessage / ResearchEvidence / RecommendationCard

- 用户发言、AI 推理摘要、引用证据、提案操作分别排版；不把所有内容塞成相同聊天气泡。
- AI 消息明确标记，正文可选中复制；流式响应显示“正在研究 / 正在整理”，支持停止，失败可重试。
- 用户向上阅读时不持续强制滚到底；新内容提供可访问的“查看最新”入口。
- 研究卡先显示结论和适用原因，再披露来源、时间、风险与备选；证据支持结论，而非用长链接堆出可信感。
- 未核验不得显示“Verified / 已验证”；只有示例时明确标“示例数据”，城市照片不是地点研究证据。
- 推荐分数要有维度解释，不把分数当成确定事实；来源缺失或过期必须可见。

### 9.4 BudgetSummary / TripHealth / SmartAlert

- BudgetSummary 是预算预测，不是记账或分账工具。当前花费、预测总额、上限、剩余额度要分开。
- 示例：当前 RM 4,120，上限 RM 5,000，当前剩余 RM 880；预测 RM 4,760，预测剩余 RM 240；预测新增 RM 640。
- RM 640 只是预测与当前的差值，不能无依据称为“这次改路线的成本”。
- 预测值必须标“预测 / 估算”；超出上限时进度条可封顶，但仍显示超出金额，不隐藏溢出。
- TripHealth 是紧凑健康摘要，不为凑视觉做成巨大仪表盘；每个风险能进入对应详情。
- SmartAlert 顺序：事件 → 影响的活动 → 严重程度 / 时间 → 查看建议；天气变化不直接触发自动修改。

## 10. 表单、反馈与异步状态

| 场景 | 必须呈现 |
| --- | --- |
| 首次加载 | 稳定占位区域 + 可读加载状态；默认 spinner，不默认整屏 skeleton |
| 背景刷新 | 保留现有内容，局部刷新指示；不把整页变空 |
| 空状态 | 说明当前没有什么，给一个合理的下一步 |
| 搜索无结果 | 显示查询 / 筛选背景，提供清除，不伪装为空数据 |
| 提交失败 | 保留输入，字段或区域内说明原因，允许安全重试 |
| 请求结果不确定 | 说明正在核实状态；涉及应用行程时先刷新确认，不能盲目重复执行 |
| 成功 | 真实结果确认后反馈；按钮位置不跳动 |
| 离线 / 旧数据 | 显示状态与更新时间，不把缓存当最新研究 |

表单有真实 label、关联帮助与错误；产品表单使用自有校验提示而非浏览器气泡。提交后聚焦第一个无效字段。Readonly 保持可读可复制，与 disabled 区分。

搜索有非空时的清除按钮；远程搜索默认 debounce 300ms、取消过期请求、中文 composition 结束后再触发。清除立即生效。输入值、成员意见等敏感内容不能仅为恢复状态而随意放进 URL。

Toast 在桌面右下、手机底部导航之上，统一系统去重；普通成功约 4 秒，关键错误保留在页面。Dialog 保留标题、说明、焦点管理与 Escape 行为；严重删除确认默认焦点放安全选项。仅在真的支持恢复时提供“撤销”。

## 11. 层级与滚动条

| 层 | z-index 目标 |
| --- | --- |
| 页面内容 | 0 |
| 面板 sticky / 地图工具 | 10 |
| 应用 Header / 底部导航 | 20 |
| 普通 Popover / Menu | 40 |
| 模态遮罩 | 50 |
| Dialog / 模态 Sheet | 60 |
| 模态内 Popover / Tooltip | 70 |
| Toast | 80 |

z-index 不是焦点管理替代品。浮层使用共享层级策略；模态内菜单必须处于正确 Portal 与焦点边界内。地图第三方内部层级不能越过应用模态。

全局滚动条统一：Light track `#F3F6FA`、thumb `#9EB5CE`、hover `#657F9E`、active `#526780`；Dark track `#10263D`、thumb `#6D88A4`、hover `#8FA9C4`、active `#B8DEFF`。宽度建议 10px；同时提供标准 scrollbar 属性与引擎 fallback。

新增 overflow 容器自动继承基线，不要求每个页面自行加类。需要稳定宽度的内容区使用 `scrollbar-gutter: stable`。forced-colors 使用系统可辨识颜色；不要为了美观隐藏滚动条。

## 12. 多语言与可访问性

- 当前 UI 语言为 en / zh / ms；日期、数字、货币、错误、aria-label、菜单与日历全部跟随 active locale。
- 使用 next-intl 和 Intl；行程时间按目的地 / 业务提供时区显示，不能由 UI 语言猜测时区。
- 用户原始文本保持原语言，除非明确请求翻译；Tokyo 示例不意味着产品只服务日本或新增 ja 语言。
- 为马来语和英文长按钮保留伸展空间；不以固定宽度截掉关键动作。中文标题不强制 uppercase 或逐字字距。
- 目标 WCAG 2.2 AA；键盘可达、可见焦点、足够对比、语义 HTML、真实 accessible name。
- 页面只有一个主 h1，标题层级不由视觉字号决定；图标按钮提供本地化名称。
- 状态变化适度使用 live region，不逐 token 朗读 AI 长回复；不对装饰计数反复播报。
- 触摸主要操作至少 44×44px；验证 200% 缩放、窄屏与 reduced-motion。
- 所有拖拽都有非拖拽替代；关键内容不依赖 hover、动画完成或精确滚动才能看到。

## 13. 不允许出现的风格漂移

- 每个页面自创蓝色、hover、阴影、圆角或 loading 样式。
- 默认 shadcn 黑白组件直接混入 Tripify 蓝色页面。
- 使用品牌蓝底 + 普通小白字而不测对比度。
- 把绿颜色当“已应用”的唯一证据，或把预算数字变绿来掩盖未知数据。
- 大面积渐变字、所有卡片 hover 漂浮、在工作台 pin 滚动、把滚动位置当业务状态。
- 在组件内硬编码 hex、随机 z-index、任意 duration，绕开 token。
- 修改组件尺寸时遗漏 icon-only、loading、长文本、菜单展开、触摸模式。
- 用 `outline: none` 去掉焦点而没有替代；用透明度让正文变得不可读。
- 把 `div` 做成无键盘支持的按钮，或把“开发中”入口导向空白 / 404。

## 14. 后续开发的执行约定

1. 开始新页面前，先确认页面属于 Marketing 还是 App，查本规范与业务文档。
2. 先找现有共享组件；复用或扩展语义变体，不复制一个页面私有版本。
3. 新组件在独立组件预览中覆盖 default、hover、active、focus、disabled、busy、error 与长文本。
4. 业务字段、权限、投票门槛、风险阈值引用业务契约；未知事项不能通过 UI 默认值补成事实。
5. 新的长期设计决定同步本规范、DESIGN 的采用记录与 runtime token；明确哪些页面已迁移。
6. 新例外必须有业务名称、原因、范围和验收方式，不能叫 `specialBlue` / `card2`。

建议后续建立 `/dev/ui` 或等效内部预览页，展示按钮、字段、浮层、状态色以及完整 ProposalCard；是否开放该路由需服从项目环境约定。本次不创建路由。

## 15. 当前差异与 shadcn 迁移顺序

以下全部为待实施项，不是本轮已完成事项。

| 当前证据 | 目标与迁移动作 |
| --- | --- |
| globals 已有 Tripify 品牌变量，但 shadcn 语义色仍是默认 neutral | 先映射 light 语义 token，再接组件；保留官网品牌装饰色 |
| 深色变量仍为通用灰黑 | 使用目标海军蓝配方，全状态测试后启用深色支持 |
| `--font-sans` 存在自引用 | 改为具体栈 / 独立源 token，核对实际 computed font |
| 现有 Button 默认 h-8，即 32px | 默认调整为 40px，保留命名明确的 compact / touch 尺寸 |
| Button 有 opacity hover、transition-all、统一按下位移 | 改为语义 hover / active、限定 transition；按控件类型处理按下 |
| 现有 destructive 是软色 | 保留安静入口，增加明确的最终确认高强调样式 |
| 官网 CTA 有多个蓝色 hover | 在迁移对应 section 时统一，避免全局覆盖破坏场景 |
| 当前圆角倍率与官网 24px 不对应 | 新增角色 token，App panel16 / showcase24 分开 |

实施顺序：**token → Button / Input / Badge → 浮层与选择控件 → ProposalCard 完整流程 → 行程 / 地图 / AI → Budget / SmartAlert → 官网组件逐步归一**。

每一批只迁移明确范围，保留可对照的前后截图；通过后再去除旧规则。不得为“统一主题”一次性重写已有 GSAP 场景或更改业务流程。

### 验收清单

- [ ] 新页面无独立硬编码主题；token 无自引用，light / dark 映射无缺失。
- [ ] 按钮、输入与弹出菜单遵守尺寸、hover、active、focus、disabled、busy 规则。
- [ ] 错误、长文、空数据、无结果、网络慢、重复点击、旧版本冲突都有清楚反馈。
- [ ] 提案的预览、投票、通过、应用在文案与状态上不混淆。
- [ ] 预算的当前 / 预测 / 上限 / 剩余含义一致；示例数据有标识。
- [ ] en / zh / ms、窄屏、触摸、键盘、200% 缩放、reduced-motion 已验证。
- [ ] Dialog / Select 打开状态和主题 Portal 已在真实浏览器检查。
- [ ] 修改代码时运行项目 lint、typecheck、相关测试与 build；记录实际结果，不用文档检查代替运行验证。
- [ ] 更新 DESIGN 的已采用记录；明确迁移完成范围和仍存在的旧样式。

## 16. 依据与维护

本规范结合以下本地证据：

- `Tripify — MVP Development Plan & Todo List.md`：团队 AI、人类审批闭环、Decision Workspace、预算预测、组件需求与多语言。
- `DESIGN.md`：路线驱动的品牌方向、现有字体、品牌色、官网节奏与动效边界。
- `src/app/globals.css`：当前主题变量、半径倍率与默认样式的实际状态。
- `components.json`、`src/components/ui/button.tsx`：base-nova / Base UI 的实际接入情况。
- `src/components/marketing/journey-landing.tsx`、`journey.css`、`trip-experiences.tsx`：当前首页的路线叙事和产品示例表达。

技术参考（查阅于 2026-09-10）：[shadcn 语义主题与 CSS variables](https://ui.shadcn.com/docs/theming)、[shadcn Base UI Button](https://ui.shadcn.com/docs/components/base/button)。组件版本更新后重新核对生成代码，不把本文件中的版本现状当作永远不变的 API。

本次制定了规范并核对了现有代码与部分颜色对比度，**没有声称现有应用已经符合全部规则，也没有完成界面迁移或浏览器全状态验收**。
