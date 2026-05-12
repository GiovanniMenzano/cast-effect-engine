/**
 * TimeTrigger - fires plugins after a delay (fixed or random within a range).
 *
 * Trigger schema:
 *   { type: 'time', delay: 5000 }                       // fixed
 *   { type: 'time', delayRange: [10000, 60000] }        // random uniform
 *   { type: 'time', delay: 30000, once: false }         // re-arm on every fire
 *
 * `once` defaults to true: the plugin fires once per session and never again.
 * When `once: false` the trigger re-schedules itself after each fire.
 */
(function() {
	"use strict";

	class TimeTrigger {
		#onFire;
		#plugins = [];
		#timersById = new Map();
		#started = false;

		constructor(options) {
			const opts = options || {};
			this.#onFire = opts.onFire || function() {};
		}

		add(plugin) {
			this.#plugins.push(plugin);
			if(this.#started) {
				this.#schedule(plugin);
			}
		}

		start() {
			if(this.#started) return;
			this.#started = true;
			this.#plugins.forEach((p) => this.#schedule(p));
		}

		stop() {
			this.#timersById.forEach((id) => clearTimeout(id));
			this.#timersById.clear();
			this.#started = false;
		}

		#schedule(plugin) {
			const delay = TimeTrigger.#computeDelay(plugin.trigger);
			if(delay === null) return;
			const timerId = setTimeout(() => {
				this.#timersById.delete(plugin.id);
				this.#onFire(plugin);
				if(plugin.trigger.once === false) {
					this.#schedule(plugin);
				}
			}, delay);
			this.#timersById.set(plugin.id, timerId);
		}

		static #computeDelay(trigger) {
			if(typeof trigger.delay === "number" && isFinite(trigger.delay) && trigger.delay >= 0) {
				return trigger.delay;
			}
			if(Array.isArray(trigger.delayRange) && trigger.delayRange.length === 2) {
				const min = Math.max(0, Number(trigger.delayRange[0]) || 0);
				const max = Math.max(min, Number(trigger.delayRange[1]) || min);
				return Math.floor(min + Math.random() * (max - min));
			}
			return null;
		}
	}

	window.CastEffectEngineCore = window.CastEffectEngineCore || {};
	window.CastEffectEngineCore.TimeTrigger = TimeTrigger;
})();
