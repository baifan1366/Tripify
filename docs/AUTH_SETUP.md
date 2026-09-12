# Tripify 认证接入与配置

更新：2026-09-10。采用 Supabase Auth（邮箱密码 + Google OAuth）、`@supabase/ssr` Cookie / PKCE 和 next-intl。这里的“本地登录”指自有邮箱密码登录；localhost 开发默认连接现有托管 Supabase，不要求启动 Docker。

2026-09-11 工作台更新：登录后 `/dashboard` 进入空白行程列表，账户信息与退出登录移至 `/dashboard/account`。`/demo` 是不包含私人数据的公开示例。当前行程功能仅为内存 UI 原型，不代表已经接入数据库；详见根目录 `UX-CONTRACT.md` 与 `database.sql`。

## 1. 本地环境变量

在 `.env.local`（不要提交 Git）配置；已在 `.env` 设置有效值时不必重复覆盖。

```dotenv
NEXT_PUBLIC_SUPABASE_URL=https://YOUR_PROJECT_REF.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_YOUR_KEY
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

- URL、Publishable Key：Supabase 项目的 Connect / API Keys 中获取。它们可以用于前端，不等于管理权限。
- `NEXT_PUBLIC_APP_URL` 只用于应用归属配置，不控制认证域名。认证统一由 `src/lib/auth/origin.ts` 读取 `NODE_ENV`：`production` → `https://tripify-agent.vercel.app`，`development`（及测试）→ `http://localhost:3000`。`next dev` 自动使用 development，`next build` / `next start` 使用 production，无需在 `.env` 手动设置 NODE_ENV。
- 注册验证、重发验证、重置密码、Google 回调及登录成功跳转共用上述域名。非目标域名的认证页面会先跳到目标域名再开始登录，避免跨域丢失 PKCE/session Cookie。生产构建的 Vercel Preview 和本地 `next start` 也会跳到正式域名，这是当前按 NODE_ENV 的规则。
- 本认证流程不需要 `SUPABASE_SERVICE_ROLE_KEY`、数据库密码、OpenRouter Key。
- **不要**把 Supabase Secret / service_role 或 Google Client Secret 放到任何 `NEXT_PUBLIC_*` 变量。
- 更改环境变量后重启 Next.js；生产环境的 public 变量需要重新构建。
- 本次只读检查：现有 URL / Key 能读取 Auth settings，邮箱与 Google provider 已启用，`mailer_autoconfirm=false`。没有输出任何 Key，也没有更改远程配置。

## 2. Supabase 邮箱配置

Authentication → Providers / Sign In → Email：启用 Email 与 Confirm email；允许新用户注册。建议把最低密码长度设为 8，与表单提示一致；更严格的后台密码策略仍由 Supabase 强制执行。

Authentication → URL Configuration：

- Site URL：设为 `https://tripify-agent.vercel.app`，开发请求通过显式 redirectTo 使用 localhost。
- Redirect URLs 至少加入以下精确地址（英文不带 `/en`）：

```text
http://localhost:3000/auth/callback
http://localhost:3000/zh/auth/callback
http://localhost:3000/ms/auth/callback
http://localhost:3000/auth/confirm
http://localhost:3000/zh/auth/confirm
http://localhost:3000/ms/auth/confirm
```

Google 登录使用不带查询参数的精确 callback 地址，成功后进入当前语言的 Dashboard，避免白名单因为额外查询参数不匹配。

正式地址也必须加入（本次代码修改不会自动更改 Supabase Dashboard）：

```text
https://tripify-agent.vercel.app/auth/callback
https://tripify-agent.vercel.app/zh/auth/callback
https://tripify-agent.vercel.app/ms/auth/callback
https://tripify-agent.vercel.app/auth/confirm
https://tripify-agent.vercel.app/zh/auth/confirm
https://tripify-agent.vercel.app/ms/auth/confirm
```

生产不使用宽泛 `**` 白名单。不要混用 `127.0.0.1` 和 `localhost`，Cookie 与 PKCE verifier 属于不同 origin。参见 [Supabase Redirect URLs](https://supabase.com/docs/guides/auth/redirect-urls)。

## 3. Google OAuth：两个不同的回调

Google Auth Platform → Clients → 创建 **Web application** OAuth Client。

| 项目 | 配置 |
| --- | --- |
| Google Authorized JavaScript origins | `http://localhost:3000` + 正式站点 origin |
| Google Authorized redirect URIs | `https://YOUR_PROJECT_REF.supabase.co/auth/v1/callback`，从 Supabase Google provider 页面复制 |
| Supabase Google provider | 填 Google **Client ID** 和 **Client Secret**，保存并启用 |
| Supabase Redirect URLs | 第 2 节的 Tripify `/auth/callback` 地址 |

Google Secret 只填 Supabase 控制台，Next.js 不需要它。只使用基本身份 scope：openid、email、profile；不请求 Drive、Calendar 或离线访问权限。Google 应用处于 Testing 时添加自己的测试账户，正式发布前完成 Audience / Branding 等必要配置。

流程：Tripify → Google（经 Supabase）→ **Supabase `/auth/v1/callback`** → **Tripify `/auth/callback`** → 服务端 code exchange → Dashboard。

Google provider “已启用”不证明 Client Secret、测试用户或回调白名单一定正确；必须由你使用真实 Google 账户完成一次授权验收。

## 4. 邮箱验证 HTML 模板

Authentication → Email Templates：

| Supabase 模板槽位 | 本地文件 | 建议主题 |
| --- | --- | --- |
| Confirm sign up | `supabase/templates/confirm-signup.html` | `Tripify · Confirm your email / 验证邮箱` |
| Reset password | `supabase/templates/reset-password.html` | `Tripify · Reset your password / 重置密码` |

复制完整文件内容到对应模板槽位并保存。模板使用 table 布局、内联 CSS、蓝色 CTA，不依赖远程图片、Web 字体、SVG 或脚本。正文按 `.Data.locale` 使用 en / zh / ms；无该字段则英文。该 metadata 仅用于展示，不参与权限判断。

**必须成套部署模板和代码**：注册 / 重发 / 找回密码均把当前语言的 `/auth/confirm` 作为 `.RedirectTo`。模板链接使用 `token_hash={{ .TokenHash }}` 与 `type=email` 或 `type=recovery`；不要替换为默认 `.ConfirmationURL`，也不要向 RedirectTo 再添加查询字符串。Confirm 页面 GET 只显示确认按钮，用户 POST 后才调用 `verifyOtp`。这也允许在另一设备打开邮件，不依赖注册浏览器的 PKCE verifier。

本套模板针对应用发起的上述流程。不要把它原样放进 Invite、Change email 或 Magic Link 槽位；那些需要各自流程。Supabase Dashboard 预览时缺少 RedirectTo 属正常变量预览问题，真实测试须从 Tripify 发起。

2026-06-03 起，新 Free 项目使用默认 SMTP 时不能自定义认证邮件模板；已有项目的情况可能不同。配置自有 SMTP 后再启用定制模板。默认发信服务还有收件人与频率限制，正式给外部用户发送必须配置可靠的 SMTP。

自定义 SMTP 所需配置：SMTP host / port / username / password（或邮件服务 API Key）、发件地址和名称 Tripify；在邮件供应商验证域名并配置 SPF / DKIM，按供应商指导配置 DMARC。凭据只放 Supabase SMTP 配置，不进浏览器代码。禁用会改写一次性认证 URL 的邮件链接追踪。

本轮提供 HTML 文件，不自动保存到未明确选择的 Supabase 项目；未配置 SMTP 时不要声称自定义邮件已发送。

## 5. 页面与行为

| 路径（中文加 `/zh`，马来语加 `/ms`） | 行为 |
| --- | --- |
| `/sign-in` | 邮箱密码 / Google；错误不暴露账户是否存在 |
| `/sign-up` | 名字、邮箱、密码、确认密码；待验证提示；60 秒 UI 重发冷却 |
| `/forgot-password` | 发出重置请求后使用防枚举的通用提示 |
| `/auth/confirm` | 手动确认邮件；失效链接可重新获取 |
| `/reset-password` | 服务端验证会话后显示修改密码表单 |
| `/auth/callback` | Google PKCE code exchange；错误转回本地化登录页 |
| `/dashboard` | 服务端验证用户后显示真实账户资料与退出；尚不实现行程 CRUD |

登录成功默认到 Dashboard；next 仅允许已实现的 Dashboard 地址，禁止外域、协议相对路径与任意路径。退出仅退出当前会话（local scope）。SSR 使用 `getUser` 验证账户，proxy 使用 `getClaims` 刷新；不把 `getSession().user` 当服务端授权依据。

密码始终由 Supabase 管理。名字存在 Auth metadata，允许用户编辑，因此不能作为角色来源。本轮不创建 public profiles 表或权限策略；后续增加表时需独立设计 RLS。受保护页面本身检查用户；未来 API / Server Actions 必须各自校验权限，不能只依赖隐藏按钮或 proxy。

## 6. 验收方法与边界

本轮已通过：`npm run lint`、`npx tsc --noEmit`、`npm run build`、`node --test scripts/auth-paths.test.cjs`、`scripts/auth-smoke.cjs` 的 Edge 浏览器测试，以及设计技能 strict 静态审计。已查看桌面及 390px 手机截图，并自动检查 320px 无横向溢出。浏览器没有 pageerror。

浏览器脚本需要 Playwright 与 Edge；已安装 Playwright 时直接执行 `node scripts/auth-smoke.cjs`，否则通过 `PLAYWRIGHT_MODULE` 指向已有模块路径。测试输出图片在忽略提交的 `test-results/auth/`。注册成功提示、找回邮件提示和错误登录使用**拦截的模拟响应**，没有发送真实邮件或创建测试账户。真实 Supabase 只进行了 Auth settings 的只读连通性检查。

仍待验证：你控制的收件邮箱、Google 实际授权、邮件客户端渲染及 Supabase 控制台保存模板。200% 缩放与真实触屏设备尚未执行；不将桌面浏览器窄视口测试等同于这些验收。

- 未登录访问三种语言 Dashboard 应返回同语言登录页面，带安全 next。
- 空表单、无效邮箱、密码过短、确认不一致显示关联字段错误并聚焦；检查显示密码、键盘和手机布局。
- 验证邮件从注册页面发送；点击到确认页面后手动确认，进入 Dashboard，刷新仍登录。
- 同一链接再次使用、失效 / 篡改 token、Google 取消授权显示可恢复错误。
- 注册后的首次邮件、重发与重置都需实测收信；邮箱已注册时不能泄漏账户存在性。
- Google 需用户实际完成授权；测试不同浏览器或无痕状态，确保 cookie 和 locale 保留。
- 退出后重新打开 Dashboard 必须被拦截；重置完成可用新密码登录。
- 60 秒前端冷却只是 UX；实际防滥用依赖 Supabase rate limits，公开上线前评估 CAPTCHA / 滥用保护。
- 本地浏览器自动化不创建真实用户、不发送邮件，除非取得用户提供的测试收件地址。真实邮件和 Google 成功流程需单独记录结果。

参考：[Google 登录](https://supabase.com/docs/guides/auth/social-login/auth-google)、[SSR](https://supabase.com/docs/guides/auth/server-side/creating-a-client)、[密码登录](https://supabase.com/docs/guides/auth/passwords)、[邮件模板](https://supabase.com/docs/guides/auth/auth-email-templates)、[免费计划模板变更](https://supabase.com/changelog/46599-changes-to-email-template-customisation-on-free-tier)。
