/**
 * KeyboardTrigger - fires plugins whose sequence of keys has been typed.
 *
 * Subscribes to `input:key` events on the shared EventBus and tracks per-plugin
 * progress (one cursor per plugin). When a sequence completes, calls `onFire(plugin)`.
 *
 * Trigger schema:
 *   { type: 'keyboard', sequence: ['a', 'b', 'ArrowUp', ...] }
 *
 * Sequence values are compared using the same normalization applied by
 * InputManager (lowercase single chars, named keys verbatim).
 */
(function() {
	"use strict";

	class KeyboardTrigger {
		#bus;
		#onFire;
		#plugins = [];
		#progressById = new Map();
		#normalizedSequences = new Map();
		#unsubscribe = null;

		constructor(options) {
			const opts = options || {};
			this.#bus = opts.bus;
			this.#onFire = opts.onFire || function() {};
		}

		add(plugin) {
			this.#plugins.push(plugin);
			this.#progressById.set(plugin.id, 0);
			this.#normalizedSequences.set(plugin.id, KeyboardTrigger.#normalizeSequence(plugin.trigger.sequence));
		}

		start() {
			if(!this.#bus || this.#unsubscribe) return;
			this.#unsubscribe = this.#bus.on("input:key", ({ key }) => this.#consumeKey(key));
		}

		stop() {
			if(this.#unsubscribe) {
				this.#unsubscribe();
				this.#unsubscribe = null;
			}
		}

		#consumeKey(key) {
			for(const plugin of this.#plugins) {
				const sequence = this.#normalizedSequences.get(plugin.id);
				let progress = this.#progressById.get(plugin.id) || 0;

				if(key === sequence[progress]) {
					progress += 1;
					if(progress === sequence.length) {
						this.#progressById.set(plugin.id, 0);
						this.#onFire(plugin);
						continue;
					}
				} else if(key === sequence[0]) {
					progress = 1;
					if(progress === sequence.length) {
						this.#progressById.set(plugin.id, 0);
						this.#onFire(plugin);
						continue;
					}
				} else {
					progress = 0;
				}

				this.#progressById.set(plugin.id, progress);
			}
		}

		static #normalizeSequence(sequence) {
			return sequence.map((k) => (typeof k === "string" && k.length === 1 ? k.toLowerCase() : k));
		}
	}

	window.CastEffectEngineCore = window.CastEffectEngineCore || {};
	window.CastEffectEngineCore.KeyboardTrigger = KeyboardTrigger;
})();
