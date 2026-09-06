/**
 * EffectRegistry - store + validator for reusable visual effects.
 *
 * An Effect is a pure, awaitable visual unit that can be cast on any DOM
 * target by any component (typewriter, plugins, future callers). Unlike
 * plugins, effects have NO trigger and no agency: they only run when
 * explicitly invoked via CastEffectEngine.cast(id, opts).
 *
 * Effect definition shape:
 *   {
 *     id:           "snap",
 *     name?:        "Thanos Snap",
 *     description?: "Text disintegrates into dust particles",
 *     cast:         async (target, ctx, opts) => EffectResult | undefined
 *   }
 *
 * EffectResult (all keys optional):
 *   - clearedText: boolean   -> signals "the visual effect left the area
 *                               empty; caller should reset its text state".
 *                               TypeWriter uses this to skip its delete loop.
 *   - cleanup:     () => void -> function the caller invokes when ready to
 *                                wipe persistent side-effects (e.g. classes
 *                                kept on the target through a deletion phase).
 */
(function() {
	"use strict";

	class EffectRegistry {
		#effects = new Map();

		register(definition) {
			const validated = EffectRegistry.#validate(definition);
			if(this.#effects.has(validated.id)) {
				console.warn("[CastEffectEngine] Effect '" + validated.id + "' already registered, ignoring duplicate");
				return false;
			}
			this.#effects.set(validated.id, validated);
			return true;
		}

		findById(id) {
			return this.#effects.get(id) || null;
		}

		all() {
			return Array.from(this.#effects.values());
		}

		count() {
			return this.#effects.size;
		}

		static #validate(def) {
			if(!def || typeof def !== "object") {
				throw new Error("[CastEffectEngine] Effect definition must be an object");
			}
			if(!def.id || typeof def.id !== "string") {
				throw new Error("[CastEffectEngine] Effect must have a string id");
			}
			if(typeof def.cast !== "function") {
				throw new Error("[CastEffectEngine] Effect '" + def.id + "' must have a cast(target, ctx, opts) function");
			}
			return def;
		}
	}

	window.CastEffectEngineCore = window.CastEffectEngineCore || {};
	window.CastEffectEngineCore.EffectRegistry = EffectRegistry;
})();
