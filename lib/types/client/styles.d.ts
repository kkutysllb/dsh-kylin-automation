/** Plugin stylesheet: one injected <style> element, all classes prefixed
 * `kyl-`. Self-contained dark/light adaptation via CSS variables inherited
 * from the host theme surface.
 */
/** Install the stylesheet once; idempotent across StrictMode replays. */
export declare function installStyles(): () => void;
