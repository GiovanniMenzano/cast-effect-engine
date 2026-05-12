/**
 * ScrollTrigger - fires plugins when the user scrolls past a target point.
 *
 * Trigger schema:
 *   { type: 'scroll', at: 'bottom' }                          // viewport reaches bottom
 *   { type: 'scroll', at: 'top' }                             // back at the top
 *   { type: 'scroll', at: { offset: 1500 } }                  // scrollY >= 1500
 *   { type: 'scroll', at: { selector: '#hobbies' } }          // element top enters viewport
 *   { type: 'scroll', at: 'bottom', once: false }             // re-arm at every cross
 *
 * Listener uses a single window.scroll handler throttled via requestAnimationFrame
 * so we only re-evaluate once per repaint, regardless of how many plugins
 * are subscribed.
 */
(function() {
	"use strict";

	class ScrollTrigger {
		#onFire;
		#plugins = [];
		#firedOnce = new Set();
		#wasMet = new Map();
		#started = false;
		#rafScheduled = false;
		#scrollHandler;
		#evaluateBound;

		constructor(options) {
			const opts = options || {};
			this.#onFire = opts.onFire || function() {};
			this.#scrollHandler = () => this.#onScroll();
			this.#evaluateBound = () => this.#evaluate();
		}

		add(plugin) {
			this.#plugins.push(plugin);
			this.#wasMet.set(plugin.id, false);
		}

		start() {
			if(this.#started) return;
			this.#started = true;
			window.addEventListener("scroll", this.#scrollHandler, { passive: true });
			// initial check in case the page is already scrolled (e.g. anchor link)
			this.#scheduleEvaluation();
		}

		stop() {
			window.removeEventListener("scroll", this.#scrollHandler);
			this.#started = false;
		}

		#onScroll() {
			this.#scheduleEvaluation();
		}

		#scheduleEvaluation() {
			if(this.#rafScheduled) return;
			this.#rafScheduled = true;
			requestAnimationFrame(this.#evaluateBound);
		}

		#evaluate() {
			this.#rafScheduled = false;
			const scrollY = window.scrollY || window.pageYOffset || 0;
			const viewportH = window.innerHeight;
			const docH = Math.max(
				document.documentElement.scrollHeight,
				document.body ? document.body.scrollHeight : 0
			);

			for(const plugin of this.#plugins) {
				if(this.#firedOnce.has(plugin.id) && plugin.trigger.once !== false) continue;
				const met = ScrollTrigger.#isConditionMet(plugin.trigger.at, scrollY, viewportH, docH);
				const previouslyMet = this.#wasMet.get(plugin.id) === true;
				if(met && !previouslyMet) {
					this.#firedOnce.add(plugin.id);
					this.#onFire(plugin);
				}
				this.#wasMet.set(plugin.id, met);
			}
		}

		static #isConditionMet(at, scrollY, viewportH, docH) {
			if(at === "bottom") {
				return (scrollY + viewportH) >= (docH - 2);
			}
			if(at === "top") {
				return scrollY <= 2;
			}
			if(at && typeof at === "object") {
				if(typeof at.offset === "number") {
					return scrollY >= at.offset;
				}
				if(typeof at.selector === "string") {
					const el = document.querySelector(at.selector);
					if(!el) return false;
					const rect = el.getBoundingClientRect();
					// element top has entered the viewport
					return rect.top <= viewportH && rect.bottom >= 0;
				}
			}
			return false;
		}
	}

	window.CastEffectEngineCore = window.CastEffectEngineCore || {};
	window.CastEffectEngineCore.ScrollTrigger = ScrollTrigger;
})();
