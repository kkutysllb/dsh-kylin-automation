# dsh-kylin-automation 开发计划（定时任务插件）

> 目标：参考 titanwings/dsh-automation，为 DSH（kcoder 0.1.6-alpha.1）开发定时任务插件：
> 适配最新框架能力，注册为 workspace 侧边栏菜单项，提供独立 UI 页面。

## 已验证的框架事实（与参考插件不同的点）

| 能力 | 0.1.6-alpha.1 现状 | 结论 |
|---|---|---|
| 侧边栏入口 | 官方 slot `sidebar.panellist`（list，root 作用域，id/order/label） | 不用 DOM hack |
| 独立 UI 页面 | 官方 slot `main`（keyed，key=面板 id，无 Session 绑定），`ctx.layout.selectPanel(id)` 导航 | 视频/工坊插件已验证同款注册 |
| 宿主 RPC | `ctx.connection.rpc.handle(channel, handler)`，信任围栏（isTrusted+浏览器鉴权）由 connection 内建 | 不再传 `{authority}` |
| 工具注册 | `ctx.tools.register(def)`，def 必含 `output: {schema, render}`；scoped 工具 + `agentCtx.tools.guard` | 参考旧版无 output 契约 |
| 会话持久化 | `ctx.sessions.flush(session)`（SessionStore）存在 | 可用 |
| 会话标题 | `ctx.sessionTitle.rename(session, title)`（webhook 用法） | 弃用 raw session.append |
| 消息 source | `MessageSourceMap` merge-extensible，webhook 有 'webhook' 先例 | 声明 `automation` 源 |
| 存储 | `ctx.storageDomain.open(defineDomain(...))`，KvTable put/update/delete + global，zod ^4.4 | 采用 |
| 客户端静态模块表 | react、react/jsx-runtime、react-dom、@deepseek-ai/cordis、client-store、ui-slots、ui-primitives、ui-dockkit | 客户端可 require('react') |
| 客户端服务名 | slots、locale、sessions、layout、remote、connection … | inject 声明需与 dsh.client.inject 包对齐 |
| 模型目录 | `ctx.remote.session.modelCatalog()` | 创建表单模型选择 |

## 交付范围（v0.1）

- Host（cordis 插件，web profile）：定义/运行记录持久化（storageDomain）、调度时钟（Cordis 定时器 + at-most-once occurrence key + misfire grace + overlap skip + catch-up=最新到期一次）、并发闸（maxConcurrentRuns）、fresh Agent 执行器（read-only/workspace-write 边界 + approval never + 能力白名单 guard + run timeout）、恢复语义（host_interrupted）、保留策略（historyLimit）。
- RPC 通道 `/dsh-kylin-automation`：snapshot / create / update / mutate / run-now / runs。
- Agent 工具（agent-scoped，仅本工作区）：automation_create / list / update / run_now / runs / delete；变更类工具经 `tools/pre-execute` 提升人工审批。
- systemPrompt 能力通告 section。
- Web 客户端：官方 slot 注册（`sidebar.panellist` 图标 + `main` keyed 独立页面），zh/en 双语，任务列表 + 新建/编辑 + 立即运行 + 暂停/恢复/删除 + 运行历史 + 打开结果会话。
- 构建：esbuild 双产物（host ESM 外部化 @deepseek-ai/*；client CJS 包 __ModuleLoader__ 注册协议）+ tsc 严格类型 + node --test 单测（recurrence/DST、domain 校验、调度语义、RPC 校验、client 协议）。

## 非目标（v0.1 不做，与参考对齐或裁剪）

- RRULE 规范化存储（直接存友好形式，校验为准）
- 运行结果确认/重试/归档闭环、archiveRunSessions
- catchUpMissedRuns 积压重放（只实现 grace 内最新一次补跑）
- settings 运行时改策略（cordis config 为准）

## 文件规划

```
package.json / cordis.patch.yml / README.md / LICENSE
src/types.ts            领域类型与品牌 id
src/recurrence.ts       luxon 次发时刻引擎（DST 跳过语义）+ 摘要
src/domain.ts           输入校验、视图投影、occurrence key、摘要绑定
src/store.ts            持久层（domain spec zod）+ CRUD + 保留裁剪
src/executor.ts         fresh agent 执行 + 事件摘要 + 允许清单 guard
src/scheduler.ts        时钟与到期判定（纯函数可测）
src/service.ts          编排：生命周期、运行状态机、并发、恢复
src/rpc.ts              通道适配（参数校验、{ok,value}/{ok,error} 信封）
src/tools.ts            六个 agent 工具
src/client-announce.ts  systemPrompt section 文案
src/index.ts            宿主入口
src/client/protocol.ts  JSON 契约
src/client/runtime.ts   rpc 调用 + 状态源 + 轮询
src/client/locales.ts   zh/en
src/client/AutomationsView.tsx  独立页面
src/client/index.ts     客户端入口（sidebar.panellist + main keyed）
scripts/build.mjs       esbuild + tsc 产物
tests/*                 单测
```

## 安全边界（与参考一致）

- 仅 read-only / workspace-write 两档；approval policy = never（fail closed）
- 无继承授权：run 不带来源会话历史/grant/审批
- agent 工具绑定调用者会话 cwd 所在 workspace，禁止任意路径
- 变更类工具人工审批（pause-only 更新除外）
- 无自动副作用重试；Manual Run now only

## 验收

1. `pnpm check`（typecheck + test + build）通过
2. `dsh plugin --profile web add /Users/libing/kk_Projects/dsh-kylin-automation` 安装成功，`dsh web` 启动后侧边栏出现「定时任务」入口，打开独立页面
3. 页面内可创建/编辑/暂停/恢复/删除/立即运行，运行历史可见并链接结果会话
