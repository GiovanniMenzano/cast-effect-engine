/**
 * SoundManager - centralized audio playback with preloading and silent
 * fallback when a file is missing.
 *
 * Plugins call `ctx.sound.play(url)` and don't worry about Audio() lifecycle
 * or the "404 makes a noise in the console" scenario: missing files are
 * logged once and then silently ignored.
 */
(function() {
	"use strict";

	class SoundManager {
		#cache = new Map();
		#missing = new Set();

		preload(url) {
			if(!url || this.#cache.has(url) || this.#missing.has(url)) return;
			try {
				const audio = new Audio(url);
				audio.preload = "auto";
				audio.addEventListener("error", () => {
					this.#markMissing(url);
				});
				this.#cache.set(url, audio);
			} catch(err) {
				this.#markMissing(url);
			}
		}

		preloadMany(urls) {
			(urls || []).forEach((u) => this.preload(u));
		}

		play(url, options) {
			if(!url || this.#missing.has(url)) return null;
			const opts = options || {};
			let audio = this.#cache.get(url);
			if(!audio) {
				try {
					audio = new Audio(url);
					audio.addEventListener("error", () => this.#markMissing(url));
					this.#cache.set(url, audio);
				} catch(err) {
					this.#markMissing(url);
					return null;
				}
			}

			try {
				// rewind so the same effect can be retriggered quickly
				audio.currentTime = 0;
			} catch(err) {
				// some browsers throw if not yet loadable, ignore
			}
			if(typeof opts.volume === "number") {
				audio.volume = Math.max(0, Math.min(1, opts.volume));
			}

			const promise = audio.play();
			if(promise && typeof promise.catch === "function") {
				promise.catch((err) => {
					// Autoplay policies / missing file -> just be quiet
					console.debug("[CastEffectEngine] sound play() rejected for " + url, err);
				});
			}
			return audio;
		}

		#markMissing(url) {
			if(this.#missing.has(url)) return;
			this.#missing.add(url);
			console.warn("[CastEffectEngine] sound asset missing or unplayable: " + url);
		}
	}

	window.CastEffectEngineCore = window.CastEffectEngineCore || {};
	window.CastEffectEngineCore.SoundManager = SoundManager;
})();
