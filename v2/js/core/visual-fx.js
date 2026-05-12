/**
 * VisualFXManager - small toolbox of visual effect helpers usable by plugins.
 *
 * Methods:
 *   - rotate(el, deg, durationMs): one-shot CSS rotation that snaps back to
 *     identity transform when finished (so layout stays clean).
 *   - applyClassFor(el, className, durationMs): adds a class, removes after
 *     N ms. Returns a "cancel" function. Re-trigger before the timeout
 *     extends the duration instead of stacking listeners.
 *   - mountFullscreenOverlay(html, options): builds a fixed full-viewport
 *     <div>, injects HTML, returns the node so the caller can dismiss it.
 *   - unmount(node): removes a node previously mounted, safely.
 *
 * All of these are thin wrappers around DOM APIs but keep plugins from
 * reinventing transitionend/setTimeout dance.
 */
(function() {
	"use strict";

	class VisualFXManager {
		#activeOverlays = new Set();
		#timersByEl = new WeakMap();

		rotate(element, degrees, durationMs) {
			if(!element) return;
			const deg = typeof degrees === "number" ? degrees : 360;
			const duration = typeof durationMs === "number" ? durationMs : 1500;
			const previousTransition = element.style.transition;
			const previousTransform = element.style.transform;

			element.style.transition = "transform " + duration + "ms ease-in-out";
			element.style.transform = "rotate(" + deg + "deg)";

			const cleanup = () => {
				element.style.transition = "none";
				element.style.transform = previousTransform || "";
				// next frame, restore previous transition
				requestAnimationFrame(() => {
					element.style.transition = previousTransition || "";
				});
				element.removeEventListener("transitionend", onEnd);
			};

			const onEnd = (event) => {
				if(event.propertyName !== "transform") return;
				cleanup();
			};
			element.addEventListener("transitionend", onEnd);

			// safety net in case transitionend doesn't fire (e.g. tab backgrounded)
			setTimeout(() => cleanup(), duration + 200);
		}

		applyClassFor(element, className, durationMs) {
			if(!element || !className) return () => {};
			const duration = typeof durationMs === "number" ? durationMs : 1000;
			const existing = this.#timersByEl.get(element) || {};
			if(existing[className]) {
				clearTimeout(existing[className]);
			} else {
				element.classList.add(className);
			}
			const timerId = setTimeout(() => {
				element.classList.remove(className);
				const map = this.#timersByEl.get(element) || {};
				delete map[className];
				this.#timersByEl.set(element, map);
			}, duration);
			existing[className] = timerId;
			this.#timersByEl.set(element, existing);

			return () => {
				clearTimeout(timerId);
				element.classList.remove(className);
				const map = this.#timersByEl.get(element) || {};
				delete map[className];
				this.#timersByEl.set(element, map);
			};
		}

		mountFullscreenOverlay(html, options) {
			const opts = options || {};
			const overlay = document.createElement("div");
			overlay.className = "cast-fullscreen-overlay" + (opts.className ? " " + opts.className : "");
			overlay.setAttribute("role", "presentation");
			overlay.innerHTML = html || "";
			// Default parent is <body>. Plugins that apply transform/filter
			// to <body> (e.g. glitch-mode) must mount the overlay on <html>
			// instead, otherwise fixed positioning is computed against the
			// transformed body box rather than the viewport.
			const parent = opts.parent || document.body;
			parent.appendChild(overlay);
			this.#activeOverlays.add(overlay);
			return overlay;
		}

		unmount(node) {
			if(!node) return;
			if(node.parentNode) {
				node.parentNode.removeChild(node);
			}
			this.#activeOverlays.delete(node);
		}
	}

	window.CastEffectEngineCore = window.CastEffectEngineCore || {};
	window.CastEffectEngineCore.VisualFXManager = VisualFXManager;
})();
