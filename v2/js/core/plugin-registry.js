/**
 * PluginRegistry - store + validator for plugin definitions.
 *
 * No matching logic lives here anymore: each `trigger.type` has its own
 * dedicated manager under `core/triggers/`. The registry is just the canonical
 * list of plugins (used for listing).
 *
 * Trigger schemas accepted:
 *   { type: 'keyboard', sequence: ['a', 'b', ...] }
 *   { type: 'time', delay: 5000 } | { type: 'time', delayRange: [min, max] }
 *   { type: 'idle', after: 30000 }
 *   { type: 'scroll', at: 'bottom' | 'top' | { offset } | { selector } }
 */
(function() {
	"use strict";

	const VALID_TYPES = ["keyboard", "time", "idle", "scroll"];

	class PluginRegistry {
		#plugins = [];

		register(definition) {
			const validated = PluginRegistry.#validate(definition);
			if(this.#plugins.some((p) => p.id === validated.id)) {
				console.warn("[CastEffectEngine] Plugin '" + validated.id + "' already registered, ignoring duplicate");
				return false;
			}
			this.#plugins.push(validated);
			return true;
		}

		all() {
			return this.#plugins.slice();
		}

		findById(id) {
			return this.#plugins.find((p) => p.id === id) || null;
		}

		count() {
			return this.#plugins.length;
		}

		static #validate(def) {
			if(!def || typeof def !== "object") {
				throw new Error("[CastEffectEngine] Plugin definition must be an object");
			}
			if(!def.id || typeof def.id !== "string") {
				throw new Error("[CastEffectEngine] Plugin must have a string id");
			}
			if(!def.trigger || typeof def.trigger !== "object") {
				throw new Error("[CastEffectEngine] Plugin '" + def.id + "' must have a trigger object");
			}
			if(VALID_TYPES.indexOf(def.trigger.type) === -1) {
				throw new Error("[CastEffectEngine] Plugin '" + def.id + "' has unsupported trigger type: " + def.trigger.type);
			}
			PluginRegistry.#validateTriggerShape(def);
			if(typeof def.action !== "function") {
				throw new Error("[CastEffectEngine] Plugin '" + def.id + "' must have an action(ctx) function");
			}
			return def;
		}

		static #validateTriggerShape(def) {
			const id = def.id;
			const t = def.trigger;
			switch(t.type) {
				case "keyboard":
					if(!Array.isArray(t.sequence) || t.sequence.length === 0) {
						throw new Error("[CastEffectEngine] Plugin '" + id + "' keyboard trigger needs a non-empty sequence array");
					}
					return;
				case "time": {
					const hasDelay = typeof t.delay === "number" && isFinite(t.delay) && t.delay >= 0;
					const hasRange = Array.isArray(t.delayRange)
						&& t.delayRange.length === 2
						&& typeof t.delayRange[0] === "number"
						&& typeof t.delayRange[1] === "number";
					if(!hasDelay && !hasRange) {
						throw new Error("[CastEffectEngine] Plugin '" + id + "' time trigger needs `delay` or `delayRange: [min, max]`");
					}
					return;
				}
				case "idle":
					if(typeof t.after !== "number" || !isFinite(t.after) || t.after <= 0) {
						throw new Error("[CastEffectEngine] Plugin '" + id + "' idle trigger needs `after: ms` (> 0)");
					}
					return;
				case "scroll":
					if(t.at === "bottom" || t.at === "top") return;
					if(t.at && typeof t.at === "object") {
						if(typeof t.at.offset === "number") return;
						if(typeof t.at.selector === "string" && t.at.selector.length > 0) return;
					}
					throw new Error("[CastEffectEngine] Plugin '" + id + "' scroll trigger needs `at: 'bottom' | 'top' | { offset } | { selector }`");
				default:
					return;
			}
		}
	}

	window.CastEffectEngineCore = window.CastEffectEngineCore || {};
	window.CastEffectEngineCore.PluginRegistry = PluginRegistry;
})();
