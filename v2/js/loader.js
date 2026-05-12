/**
 * CastEffectEngine - single-file loader.
 *
 * Include this ONE script in any page and the entire engine (core + plugins +
 * CSS) will be loaded automatically in the correct order. No need to list 15+
 * script tags manually.
 *
 * Usage (in any HTML page):
 *   <script src="js/cast-effect-engine/loader.js" defer></script>
 *
 * How it works:
 *   1. Injects the engine CSS (<link>) into <head>.
 *   2. Loads core modules sequentially (order matters for globals).
 *   3. Loads trigger modules sequentially (depend on core).
 *   4. Loads engine.js (the singleton that ties everything together).
 *   5. Loads ALL plugins in parallel (order is irrelevant, they auto-register).
 *   6. engine.js already boots on DOMContentLoaded - nothing else needed.
 *
 * Adding a new plugin: just drop a .js file into plugins/ and add its filename
 * to the PLUGINS array below. That's it - every page picks it up automatically.
 */
(function() {
	"use strict";

	// ── Resolve base path relative to this script's location ──────────
	// e.g. if this file is at "/js/cast-effect-engine/loader.js"
	// then BASE = "/js/cast-effect-engine/"
	var thisScript = document.currentScript;
	var BASE = thisScript.src.substring(0, thisScript.src.lastIndexOf("/") + 1);
	// CSS sits one level up in css/
	var CSS_PATH = BASE + "../css/cast-effect-engine.css";
	var XBOX_CSS_PATH = BASE + "../css/xbox-achievement-notification.css";

	// ── Manifest ──────────────────────────────────────────────────────
	// Core modules - loaded sequentially, order matters
	var CORE = [
		"core/event-bus.js",
		"core/input-manager.js",
		"core/sound-manager.js",
		"core/visual-fx.js",
		"core/plugin-registry.js",
		"core/triggers/keyboard-trigger.js",
		"core/triggers/time-trigger.js",
		"core/triggers/idle-trigger.js",
		"core/triggers/scroll-trigger.js",
		"core/engine.js"
	];

	// Plugins - loaded in parallel after core is ready, order irrelevant
	var PLUGINS = [
		"plugins/konami-code.js",
		"plugins/xbox-achievement.js",
		"plugins/barrel-roll.js",
		"plugins/matrix-rain.js",
		"plugins/glitch-mode.js",
		"plugins/bsod.js"
	];

	// ── CSS injection ─────────────────────────────────────────────────
	function injectCSS(href) {
		var link = document.createElement("link");
		link.rel = "stylesheet";
		link.href = href;
		document.head.appendChild(link);
	}

	// ── Script loading helpers ────────────────────────────────────────
	function loadScript(src) {
		return new Promise(function(resolve, reject) {
			var s = document.createElement("script");
			s.src = src;
			s.defer = true;
			s.onload = resolve;
			s.onerror = function() {
				console.error("[CastEffectEngine loader] failed to load: " + src);
				resolve(); // don't break the chain - engine still works without one plugin
			};
			document.head.appendChild(s);
		});
	}

	function loadSequential(files) {
		return files.reduce(function(chain, file) {
			return chain.then(function() {
				return loadScript(BASE + file);
			});
		}, Promise.resolve());
	}

	function loadParallel(files) {
		return Promise.all(files.map(function(file) {
			return loadScript(BASE + file);
		}));
	}

	// ── Go ─────────────────────────────────────────────────────────────
	// Tell engine.js not to auto-boot - we'll call boot() after all plugins.
	window.__castLoaderActive = true;

	injectCSS(CSS_PATH);
	injectCSS(XBOX_CSS_PATH);

	loadSequential(CORE)
		.then(function() {
			return loadParallel(PLUGINS);
		})
		.then(function() {
			console.log("[CastEffectEngine loader] all modules loaded");
			if(window.CastEffectEngine && window.CastEffectEngine.boot) {
				window.CastEffectEngine.boot();
			}
		});

})();
