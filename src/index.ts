/** Cordis Host plugin for durable standalone DSH automations (麒麟定时任务).
 *
 * Owns: durable definitions + run history (storage domain), the dispatch
 * clock, the fresh-Agent executor, the Web RPC channel, agent-scoped
 * management tools, and the capability announcement section. Does not patch
 * DSH core; every integration rides published services and events.
 *
 * Deployment note (KCoder packaged harness): no `@deepseek-ai/*` runtime
 * imports — services arrive via the `inject` names, config arrives as the
 * plain patch-row object, and the service factory clamps it.
 */

import type { Context } from '@deepseek-ai/cordis'
import { registerAutomationRpc } from './rpc.ts'
import { AutomationService } from './service.ts'
import { automationToolDefs, callerFrom, MUTATING_TOOLS } from './tools.ts'
import type { AutomationService as Service } from './service.ts'

export const name = 'dsh-kylin-automation'

export const inject = [
  'storageDomain',
  'agents',
  'workspaceRegistry',
  'agentDefaultModel',
  'agentPresets',
  'sessionTitle',
  'connection',
  'webServer',
  'systemPrompt',
  'sessions',
] as const

/** Plugin configuration (patch-row `config` values are read defensively). */
export interface Config {
  readonly maxConcurrentRuns?: number
  readonly runTimeoutMinutes?: number
  readonly misfireGraceMinutes?: number
  readonly historyLimit?: number
}

/** Executor-minted run Sessions are recognizable by id prefix; management
 * tools are never mounted onto them (and their executor guard denies the
 * same verbs anyway — defense in depth). */
function isAutomationRunSession(sessionId: string): boolean {
  return sessionId.startsWith('kauto-session-')
}

/** A pause-only update does not expand unattended work; everything else does. */
export function needsHumanApproval(
  exec: { readonly name: string; readonly arguments?: unknown; readonly signal: AbortSignal },
  mountedAgent: boolean,
): boolean {
  if (!mountedAgent || exec.signal.aborted || !MUTATING_TOOLS.has(exec.name)) return false
  if (exec.name !== 'automation_update') return true
  const args = typeof exec.arguments === 'object' && exec.arguments !== null
    ? exec.arguments as Record<string, unknown>
    : {}
  return !(args['status'] === 'paused' && Object.keys(args).every(key => key === 'id' || key === 'status'))
}

/** One `ask` decision's audited reason plus its localized prompt text. */
export interface ApprovalAsk {
  /** Locale-neutral audited reason persisted with the approval request. */
  readonly reason: string
  /** Localized prompt text; `ui-approval` resolves it through the active
   * locale and falls back to `en`. */
  readonly displayReason: { readonly en: string; readonly [locale: string]: string }
}

/**
 * Build the approval decision for one mutating management tool.
 *
 * dsh 0.1.7 split the two faces of an approval prompt: `reason` is the audited
 * text committed with the request (so the audit trail never depends on the
 * reader's locale) and `displayReason` is the localized text the approval card
 * renders. Older hosts ignore the extra field and fall back to `reason`, which
 * is why both carry the complete explanation.
 */
export function humanApprovalAsk(toolName: string): ApprovalAsk {
  if (toolName === 'automation_delete') {
    return {
      reason: 'This permanently deletes the automation definition; run history is retained but scheduling cannot be restored.',
      displayReason: {
        en: 'This permanently deletes the scheduled task definition (run history is retained, but scheduling cannot be restored).',
        zh: '此操作会永久删除定时任务定义（运行历史保留，但调度不可恢复）。',
      },
    }
  }
  if (toolName === 'automation_create') {
    const en = 'This creates unattended future execution. Confirm the task prompt, schedule, workspace, and permission boundary.'
    return {
      reason: en,
      displayReason: {
        en,
        zh: '该操作将创建无人值守的未来执行任务。请确认任务提示词、时间计划、工作区与权限边界。',
      },
    }
  }
  const en = 'This creates or widens unattended future execution. Confirm the schedule and permission boundary.'
  return {
    reason: en,
    displayReason: {
      en,
      zh: '该操作将创建或扩大无人值守的未来执行范围，请确认任务计划与权限边界。',
    },
  }
}

/** The `tools/pre-execute` verdict this plugin contributes for one call, or
 * `undefined` when the call is not this plugin's to escalate. Extracted from
 * the hook body so the escalation contract is unit-testable without a model. */
export function approvalDecision(
  exec: { readonly name: string; readonly arguments?: unknown; readonly signal: AbortSignal },
  mountedAgent: boolean,
): ({ readonly kind: 'ask' } & ApprovalAsk) | undefined {
  if (!needsHumanApproval(exec, mountedAgent)) return undefined
  const ask = humanApprovalAsk(exec.name)
  return { kind: 'ask', reason: ask.reason, displayReason: ask.displayReason }
}

/** Mount one host-wide authority and agent-scoped management tools. */
export async function apply(ctx: Context, rawConfig: Config): Promise<void> {
  await ctx.effect(async () => {
    const service: Service = await AutomationService.open(ctx, rawConfig)
    // 时钟 + 崩溃恢复必须显式启动：不调用则 requestTick 因 alive=false
    // 直接返回，定时 occurrence 永不派发（仅 automation_run_now 手动
    // 路径可用）。
    service.start()
    const agentTools = new Map<string, () => void>()
    const owned: Array<() => void> = []

    // Capability announcement: one bounded prompt section so agents discover
    // the workflow without reading plugin internals.
    owned.push(ctx.systemPrompt.section({
      name: `plugin:${name}`,
      order: 206,
      text: ANNOUNCEMENT,
    }))

    const mountTools = (agent: unknown): void => {
      const scoped = agent as {
        id?: unknown
        session?: { id?: unknown }
        ctx?: import('@deepseek-ai/cordis').Context
      }
      const agentId = typeof scoped?.id === 'string' ? scoped.id : undefined
      const sessionId = typeof scoped?.session?.id === 'string' ? scoped.session.id : undefined
      if (agentId === undefined || sessionId === undefined || scoped.ctx === undefined) return
      if (isAutomationRunSession(sessionId)) return
      if (!ctx.agents.roots().some(root => root.id === agentId)) return
      if (agentTools.has(agentId)) return
      // Scoped registrations ride the agent scope fiber: agent teardown removes
      // them in order; the recorded disposer is the plugin's safety net.
      const registered = scoped.ctx.effect(() => {
        const removers = automationToolDefs(service).map(def => scoped.ctx!.tools.register(def))
        return () => {
          for (const remove of [...removers].reverse()) { void remove() }
        }
      }, 'dsh-kylin-automation: management tools')
      agentTools.set(agentId, registered)
    }

    for (const root of ctx.agents.roots()) mountTools(root)
    owned.push(ctx.on('agent/created', ({ agent }: { agent?: unknown }) => { mountTools(agent) }))
    owned.push(ctx.on('agent/disposed', ({ agent }: { agent?: unknown }) => {
      const agentId = (agent as { id?: string } | undefined)?.id
      if (typeof agentId === 'string') agentTools.delete(agentId)
    }))
    owned.push(ctx.on('tools/pre-execute', async (exec: unknown, next: () => Promise<{ kind: string }>) => {
      const downstream = await next()
      if (downstream.kind !== 'allow') return downstream
      const caller = callerFrom(exec)
      const mounted = caller.sessionId !== undefined
        && !isAutomationRunSession(caller.sessionId)
        && agentTools.has(caller.sessionId)
      const decision = approvalDecision(
        exec as { name: string; arguments?: unknown; signal: AbortSignal },
        mounted,
      )
      return decision ?? downstream
    }))

    const removeRpc = registerAutomationRpc(ctx, service)

    return async () => {
      for (const dispose of [...agentTools.values()].reverse()) {
        try { dispose() } catch (error: unknown) {
          ctx.logger.warn(`dsh-kylin-automation: tool teardown failed: ${String(error)}`)
        }
      }
      agentTools.clear()
      for (const dispose of [...owned].reverse()) {
        try { dispose() } catch (error: unknown) {
          ctx.logger.warn(`dsh-kylin-automation: listener teardown failed: ${String(error)}`)
        }
      }
      await removeRpc()
      await service.dispose()
    }
  }, 'dsh-kylin-automation: service')
}

/** One bounded capability announcement. Deliberately states only what the tool
 * schemas and results cannot: the tool roster, the three non-obvious workflow
 * constraints, and the Web entry point. dsh 0.1.7's prompt-budget policy
 * removed system-prompt restatements of tool parameters (the standard preset's
 * first-turn prompt shrank ~18% in that release), so per-parameter rules stay
 * in the parameter descriptions. */
const ANNOUNCEMENT = `本机已安装 dsh-kylin-automation 插件（定时任务）：把任务按时间计划投递到全新根 Agent 会话独立执行，运行历史持久可审计。六个工具：automation_create / automation_list / automation_update / automation_run_now / automation_runs / automation_delete（参数与返回值见工具描述；automation_list 只列调用者自己工作区的任务）。三个非显然约束：① 定时任务不继承当前对话，任务提示词必须自包含（目标、证据、允许改动、验收与停止条件）；② 先用 automation_run_now 验证一次，再依赖调度；③ 创建/更新/立即运行/删除会扩大无人值守范围，需用户人工审批（仅 status=paused 的单独暂停豁免）。Web 侧边栏「定时任务」入口提供独立管理页面。`
