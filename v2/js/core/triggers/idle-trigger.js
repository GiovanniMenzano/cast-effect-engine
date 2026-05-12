/**
 * IdleTrigger - fires plugins after the user has been inactive for N ms.
 *
 * Trigger schema:
 *   { type: 'idle', after: 30000 }                  // one-shot per session
 *   { type: 'idle', after: 60000, repeat: true }    // re-arm after every fire
 *
 * Activity is detected via mousemove / keydown / scroll / wheel / touchstart
 * on `window`. All listeners are passive + capture so they never interfere
 * with the existing handlers (carousel scroll, cheat keyboard, etc).
 *
 * The timer is shared across plugins for performance: we schedule a single
 * setTimeout per plugin (rather than a polling loop) and reset all of them
 * on any user activity.
 */
(function() {
	"use strict";

	const ACTIVITY_EVENTS = ["mousemove", "keydown", "scroll", "wheel", "touchstart"];

	class IdleTrigger {
		#onFire;
		#plugins = [];
		#timersById = new Map();
		#firedOnce = new Set();
		#started = false;
		#activityHandler;

		constructor(options) {
			const opts = options || {};
			this.#onFire = opts.onFire || function() {};
			this.#activityHandler = () => this.#onActivity();
		}

		add(plugin) {
			this.#plugins.push(plugin);
			if(this.#started) {
				this.#arm(plugin);
			}
		}

		start() {
			if(this.#started) return;
			this.#started = true;
			ACTIVITY_EVENTS.forEach((evt) => {
				window.addEventListener(evt, this.#activityHandler, { passive: true, capture: true });
			});
			this.#plugins.forEach((p) => this.#arm(p));
		}

		stop() {
			ACTIVITY_EVENTS.forEach((evt) => {
				window.removeEventListener(evt, this.#activityHandler, { capture: true });
			});
			this.#timersById.forEach((id) => clearTimeout(id));
			this.#timersById.clear();
			this.#started = false;
		}

		#arm(plugin) {
			if(this.#firedOnce.has(plugin.id) && plugin.trigger.repeat !== true) return;
			const after = Number(plugin.trigger.after);
			if(!isFinite(after) || after <= 0) return;

			const existing = this.#timersById.get(plugin.id);
			if(existing) clearTimeout(existing);

			const timerId = setTimeout(() => {
				this.#timersById.delete(plugin.id);
				this.#firedOnce.add(plugin.id);
				this.#onFire(plugin);
				if(plugin.trigger.repeat === true) {
					this.#arm(plugin);
				}
			}, after);
			this.#timersById.set(plugin.id, timerId);
		}

		#onActivity() {
			// re-arm every still-eligible plugin
			this.#plugins.forEach((plugin) => {
				if(this.#firedOnce.has(plugin.id) && plugin.trigger.repeat !== true) return;
				this.#arm(plugin);
			});
		}
	}

	window.CastEffectEngineCore = window.CastEffectEngineCore || {};
	window.CastEffectEngineCore.IdleTrigger = IdleTrigger;
})();
