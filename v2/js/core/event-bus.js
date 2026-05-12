/**
 * EventBus - minimal pub/sub system used internally by the CastEffectEngine.
 *
 * Lives under `window.CastEffectEngineCore.EventBus` so that subsequent core files
 * (loaded via plain <script defer>) can grab it without ES modules.
 */
(function() {
	"use strict";

	class EventBus {
		#handlers = new Map();

		on(event, handler) {
			if(typeof handler !== "function") {
				return () => {};
			}
			if(!this.#handlers.has(event)) {
				this.#handlers.set(event, new Set());
			}
			this.#handlers.get(event).add(handler);
			return () => this.off(event, handler);
		}

		off(event, handler) {
			const set = this.#handlers.get(event);
			if(!set) return;
			set.delete(handler);
			if(set.size === 0) {
				this.#handlers.delete(event);
			}
		}

		emit(event, payload) {
			const set = this.#handlers.get(event);
			if(!set || set.size === 0) return;
			// snapshot so handlers can off() during emit without mutating iteration
			[...set].forEach((handler) => {
				try {
					handler(payload);
				} catch(err) {
					console.error(`[CastEffectEngine] EventBus handler for "${event}" threw`, err);
				}
			});
		}

		clear() {
			this.#handlers.clear();
		}
	}

	window.CastEffectEngineCore = window.CastEffectEngineCore || {};
	window.CastEffectEngineCore.EventBus = EventBus;
})();
