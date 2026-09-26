/** Hand-typed face of the injected client services this plugin composes
 * against. The loader passes the module's exports as an object plugin, so the
 * shapes here mirror the runtime contract (verified against kcoder
 * 0.1.7-rc.2); every consumer soft-probes before use.
 *
 * 0.1.7-rc.2 audit: the slot contract (`ui-slots`/`ui-renderer`) is unchanged
 * for the fourth consecutive release, and every service below kept its shape —
 * `layout.selectPanel`, `uiWorkspace.openSession`/`pickDirectory`,
 * `connection.rpc.call`, and `remote.session.modelCatalog`. The release added
 * a hard `shortcuts` client dependency to `ui-layout`, which this plugin does
 * not compose and therefore does not inject.
 */
import type { ModelCatalog } from './protocol.ts';
import type { AutomationsRuntime, Translate } from './runtime.ts';
export interface ClientContext {
    effect(factory: () => void | (() => void), label?: string): void;
    slots: {
        inject(name: string, register: () => void | (() => void)): void;
        register(options: Record<string, unknown>, component: unknown): () => void;
    };
    locale?: {
        register(namespace: string, dictionaries: Record<string, Record<string, string>>): () => void;
        bind(namespace: string): Translate;
    };
    connection?: {
        readonly rpc: {
            call(channel: string, endpoint: string, payload: unknown): Promise<unknown>;
        };
    };
    sessions?: {
        readonly list: {
            getSnapshot(): {
                readonly current?: string;
            };
            subscribe(listener: () => void): () => void;
        };
        refresh(): Promise<void>;
    };
    /** Workspace navigation + directory services provided by the host's
     * ui-workspace client plugin (cordis Service registered as 'uiWorkspace').
     * Soft-probed: hosts without it degrade to inline error notices. */
    uiWorkspace?: {
        /** Select a Session and show its Conversation (official navigation path). */
        openSession(target: string): void;
        /** Host-side OS directory chooser (works on web and desktop windows). */
        pickDirectory(): Promise<string | null>;
    };
    layout?: {
        selectPanel(panelId: string | null): void;
    };
    remote?: {
        session?: {
            /** Typert Remote envelope: { ok: true, value } | { ok: false, error }. */
            modelCatalog(): Promise<{
                ok: true;
                value: unknown;
            } | {
                ok: false;
                error: {
                    code: string;
                    message: string;
                };
            }>;
        };
    };
}
/** Shape the sidebar icon component receives (owner share of the list slot). */
export interface PanelIconProps {
    readonly size?: number;
}
/** The main panel component props (register inject factory projection). */
export interface AutomationsMountProps {
    readonly t: Translate;
    readonly runtime: AutomationsRuntime;
    readonly lang: 'zh' | 'en';
    readonly openSession: (sessionId: string) => void;
    readonly backToConversation: () => void;
    readonly loadModelCatalog: () => Promise<ModelCatalog>;
}
