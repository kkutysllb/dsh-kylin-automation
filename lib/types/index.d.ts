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
import type { Context } from '@deepseek-ai/cordis';
export declare const name = "dsh-kylin-automation";
export declare const inject: readonly ["storageDomain", "agents", "workspaceRegistry", "agentDefaultModel", "agentPresets", "sessionTitle", "connection", "webServer", "systemPrompt", "sessions"];
/** Plugin configuration (patch-row `config` values are read defensively). */
export interface Config {
    readonly maxConcurrentRuns?: number;
    readonly runTimeoutMinutes?: number;
    readonly misfireGraceMinutes?: number;
    readonly historyLimit?: number;
}
/** A pause-only update does not expand unattended work; everything else does. */
export declare function needsHumanApproval(exec: {
    readonly name: string;
    readonly arguments?: unknown;
    readonly signal: AbortSignal;
}, mountedAgent: boolean): boolean;
/** One `ask` decision's audited reason plus its localized prompt text. */
export interface ApprovalAsk {
    /** Locale-neutral audited reason persisted with the approval request. */
    readonly reason: string;
    /** Localized prompt text; `ui-approval` resolves it through the active
     * locale and falls back to `en`. */
    readonly displayReason: {
        readonly en: string;
        readonly [locale: string]: string;
    };
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
export declare function humanApprovalAsk(toolName: string): ApprovalAsk;
/** The `tools/pre-execute` verdict this plugin contributes for one call, or
 * `undefined` when the call is not this plugin's to escalate. Extracted from
 * the hook body so the escalation contract is unit-testable without a model. */
export declare function approvalDecision(exec: {
    readonly name: string;
    readonly arguments?: unknown;
    readonly signal: AbortSignal;
}, mountedAgent: boolean): ({
    readonly kind: 'ask';
} & ApprovalAsk) | undefined;
/** Mount one host-wide authority and agent-scoped management tools. */
export declare function apply(ctx: Context, rawConfig: Config): Promise<void>;
