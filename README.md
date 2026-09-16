# dsh-kylin-automation

[DeepSeek Harness](https://github.com/deepseek-ai/deepseek-harness) 定时任务插件：把"完整可自足"的编码任务按时间计划投递到**全新根 Agent 会话**独立执行，运行历史持久可审计。Web 侧边栏菜单项 + 独立管理页面 + Agent 工具双入口。

**简体中文** · 参考 [titanwings/dsh-automation](https://github.com/titanwings/dsh-automation) 的产品模型，按 kcoder 0.1.6-alpha.1 最新框架能力重写。

## ✨ 它解决什么

DSH Core Schedule 是当前对话内的提醒工具（"十分钟后回到这个会话"）。`dsh-kylin-automation` 处理另一件事："每个工作日独立跑一遍这个任务，并给我留下可检查的结果。"

| | DSH Core Schedule | dsh-kylin-automation |
| --- | --- | --- |
| 执行上下文 | 回到同一个活跃 Agent | 全新根 Agent + 全新 Session |
| 输入 | 现有上下文里的追问 | 保存下来的自包含任务 |
| 范围 | 当前会话 | 精确绑定一个工作区 |
| 历史 | 会话事件 | 定义修订版 + 持久运行记录 |

## ✨ 特性

### 🕹️ 双入口，一个控制面

- **DSH Web**：侧边栏「定时任务」菜单项（官方 `sidebar.panellist` slot）→ 独立管理页面（官方 `main` keyed slot，不依赖会话视图）。创建规则（**可自选绑定工作区**，列表支持跨工作区切换）、暂停/恢复、立即运行、删除、查看运行历史、打开结果会话、钉住 provider/model/推理力度（跟随全局亦可）。
- **任意根 Agent**：自然语言管理，六个工具只绑定调用者自己的工作区。

### 📅 人读得懂的时间计划

一次性（ISO 时刻）/ 固定间隔（≥5 分钟）/ 每天 / 每周（周一到周日任选），daily/weekly 使用 IANA 时区；本地 `HH:mm` 按任务时区求解，DST 不存在的墙面时间**跳过而不是平移**。

### 🧼 每次运行都是干净的执行边界

- 全新 Session ID + 全新根 Agent，不带来源会话的历史/收件箱/授权/过往审批；
- 沙箱只有两档：`read-only` / `workspace-write`（不接受无人值守 full access）；
- `approval policy = never`：仍需交互审批的工具直接失败，绝不静默等待或升级；
- 明确能力允许清单：交互提问、计划、目标、嵌套 Agent、后台任务、递归自动化管理等一律拒绝（agent-scoped 最终 guard）；
- 任务消息带 `source.kind = automation`（automation/run 身份 + 计划时刻），从不冒充人类消息。

### 🧾 失败也被解释的历史

运行经历 `queued → running → succeeded / failed / skipped / cancelled`；每条记录保留定义版本号、提示词与目标快照、计划时刻、结果 Session id、有界摘要与结构化错误。更新定义递增 revision，历史运行仍能对上"当时执行的是什么"。删除定义不立即抹掉运行记录。

## ⚡ 安装

```sh
dsh plugin --profile web add /绝对路径/dsh-kylin-automation
# 或发布后：dsh plugin --profile web add dsh-kylin-automation
```

安装后重启 `dsh web` 生效。从源码开发：Node.js ≥ 22.19。

```sh
pnpm install
pnpm check        # typecheck + test + build
```

## 🚀 快速开始

### 🖥️ 从 DSH Web

1. 打开一个工作区里的会话（面板跟随当前会话的工作区）。
2. 侧边栏点「定时任务」。
3. 填写自包含任务、时间计划、时区、模型目标、权限边界。
4. 先点「立即运行」验证一次，再依赖调度。

### 💬 让 Agent 管理

```
创建一个只读定时任务"工作日回归分诊"，周一到周五 09:30（Asia/Shanghai）运行：
检查本地测试证据，归类失败原因，在新会话里留下简短报告。不要修改文件。
```

| 工具 | 用途 |
| --- | --- |
| `automation_create` | 创建绑定**调用者工作区**的规则（可钉住 provider/model/effort；Web 页面创建时可自选任意已注册工作区） |
| `automation_list` | 读规则、下次运行时刻与最近结果 |
| `automation_update` | 改名称/提示词/计划/模型/权限/状态（仅单独暂停豁免审批） |
| `automation_run_now` | 以相同边界排队一次手动运行 |
| `automation_runs` | 读运行历史、错误、摘要与 Session id |
| `automation_delete` | 删除定义（运行历史保留） |

创建/更新/立即运行/删除会触发插件级人工审批（Agent 创建或扩大无人值守未来工作需要人确认）。

## 🛡️ 计划不等于权限

无人值守编码需要比交互聊天更小的信任边界：

- **无继承授权**：run 不带来源会话任何能力；
- **两档权限**：`read-only` / `workspace-write`；
- **fail closed**：审批策略 `never`；
- **精确工作区绑定**：工具按调用者会话 cwd 解析，不接受任意路径；
- **回环 Web 通道**：RPC 信任围栏由 DSH connection 内建（isTrusted + 浏览器鉴权）；
- **可追溯来源**：`source.kind = automation`；
- **无盲目重试**：一旦可能产生副作用，不自动重跑；手动「立即运行」是唯一的重试。

用「立即运行」验证过再开启无人值守写入。

## 🔧 调度与恢复语义

| 情形 | 行为 |
| --- | --- |
| 固定间隔 | 最小 5 分钟；首个运行在锚点后一个完整间隔 |
| 每天/每周 | 任务时区本地 `HH:mm`；DST 缺失墙面时间跳过 |
| 重叠 | 同一任务同时至多一个 queued/running；到期 occurrence 记 `skipped(overlap)` |
| 停机补跑 | 宽限窗口（默认 15 分钟）内只有**最新**一个到期 occurrence 补跑；更早的不回放 |
| 运行超时 | 默认 60 分钟，超时取消并记 `failed` |
| 宿主崩溃 | 恢复时持久化 queued/running 记 `failed(host_interrupted)`，绝不秘密重跑 |
| 保留 | 每任务终态运行记录上限 200（可配）；活跃记录永不裁剪 |
| at-most-once | 确定性 occurrence key + 持久游标：同一 occurrence 至多派发一次 |

## ⚙️ 配置（cordis.patch.yml）

| 选项 | 默认 | 含义 |
| --- | --- | --- |
| `maxConcurrentRuns` | `2` | 本 Host 全局并发执行闸 |
| `runTimeoutMinutes` | `60` | 单次运行墙钟上限 |
| `misfireGraceMinutes` | `15` | 补跑宽限 |
| `historyLimit` | `200` | 每任务终态历史保留 |

调大并发/超时等于扩大无人值守工作量，按策略决策对待。

## 🧰 好的自动化候选

| 任务 | 建议边界 | 为什么有用 |
| --- | --- | --- |
| 工作日回归分诊 | `read-only` | 检查测试证据、归类失败、留下诊断 |
| 每周仓库健康报告 | `read-only` | 陈旧 TODO、依赖清单、被忽略的失败 |
| 一次性验证 | `read-only` | 稍后复查不稳定失败并留档 |
| 生成代码刷新 | `workspace-write` | 重建已知产物、聚焦检查、报告精确 diff |
| 维护修复窗口 | `workspace-write` | 复现一个有界问题、最小修复、验收即停 |

避免"继续我们之前说的"或"把所有事都修了"：定时任务不继承创建它的对话。

## 🚧 v0.1 明确不做

- 同会话心跳（请用 DSH Core Schedule）
- 原生 cron 表达式或任意 shell 动作
- 无人值守 full access、运行结果确认/重试闭环、会话归档
- 多工作区目标、DAG、跨运行记忆、外部投递（邮件/短信/推送）
- 外部副作用的恰好一次保证

仅实现本地执行；运行依赖 DSH Host 进程存活。

## 🧪 开发

```sh
pnpm typecheck   # tsc --noEmit（严格 + exactOptionalPropertyTypes）
node --import ./tests/register-dsh-stubs.mjs --import tsx --test tests/*.test.ts
pnpm build       # esbuild Host ESM + Web client（__ModuleLoader__ 契约）+ 声明产物
```

## 📄 License

MIT。“Codex Scheduled Tasks” 仅作为产品模式参考。
