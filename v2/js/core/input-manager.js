/**
 * InputManager - single source of keyboard input for the engine.
 *
 * Listens once on `document` for keydown, normalizes the key value, and emits
 * an `input:key` event on the shared EventBus. Plugins never touch keyboard
 * APIs directly, they only react via the registry.
 *
 * Normalization rules:
 *   - single printable characters -> lowercase (so "A" and "a" match the same)
 *   - named keys (ArrowUp, Enter, Escape, ...) -> kept verbatim
 *   - typing inside <input>, <textarea> or contenteditable is ignored, so
 *     forms (e.g. contact-me page) keep working without false triggers
 */
(function() {
	"use strict";

	class InputManager {
		#bus;
		#target = null;
		#listener = null;
		#started = false;

		constructor(bus) {
			this.#bus = bus;
		}

		start(target = document) {
			if(this.#started) return;
			this.#target = target;
			this.#listener = (event) => this.#onKeydown(event);
			this.#target.addEventListener("keydown", this.#listener);
			this.#started = true;
		}

		stop() {
			if(!this.#started) return;
			this.#target.removeEventListener("keydown", this.#listener);
			this.#listener = null;
			this.#target = null;
			this.#started = false;
		}

		#onKeydown(event) {
			if(InputManager.#isEditable(event.target)) {
				return;
			}
			const key = InputManager.#normalize(event.key);
			if(key === null) return;
			this.#bus.emit("input:key", { key, raw: event.key, original: event });
		}

		static #isEditable(node) {
			if(!node) return false;
			const tag = node.tagName;
			if(tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return true;
			if(node.isContentEditable) return true;
			return false;
		}

		static #normalize(key) {
			if(typeof key !== "string" || key.length === 0) return null;
			if(key.length === 1) {
				return key.toLowerCase();
			}
			return key;
		}
	}

	window.CastEffectEngineCore = window.CastEffectEngineCore || {};
	window.CastEffectEngineCore.InputManager = InputManager;
})();
