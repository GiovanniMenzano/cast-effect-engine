/**
 * CastEffectEngine - single-file loader.
 *
 * Include this script to load the engine's JavaScript and CSS in the
 * correct order. Modules declare their optional stylesheet in the manifest.
 *
 * Usage:
 *   <script src="path/to/cast-effect-engine/js/loader.js" defer></script>
 */
(function() {
	"use strict";

	const thisScript = document.currentScript;
	const JS_BASE = new URL("./", thisScript.src).href;
	const CSS_BASE = new URL("../css/", JS_BASE).href;

	// Core scripts are ordered because each one builds on the previous globals.
	const CORE = [
		"core/event-bus.js",
		"core/input-manager.js",
		"core/sound-manager.js",
		"core/visual-fx.js",
		"core/plugin-registry.js",
		"core/effect-registry.js",
		"core/triggers/keyboard-trigger.js",
		"core/triggers/time-trigger.js",
		"core/triggers/idle-trigger.js",
		"core/triggers/scroll-trigger.js",
		"core/engine.js"
	];

	// Effects and plugins can load in parallel within their own phase.
	const EFFECTS = [
		{ script: "effects/flicker.js", style: "effects/flicker.css" },
		{ script: "effects/meltdown.js", style: "effects/meltdown.css" },
		{ script: "effects/matrixgreen.js", style: "effects/matrixgreen.css" },
		{ script: "effects/frost.js", style: "effects/frost.css" },
		{ script: "effects/text-glitch.js", style: "effects/text-glitch.css" },
		{ script: "effects/faderain.js", style: "effects/faderain.css" },
		{ script: "effects/snap.js" },
		{ script: "effects/eject.js", style: "effects/eject.css" }
	];

	const PLUGINS = [
		{ script: "plugins/konami-code.js" },
		{ script: "plugins/xbox-achievement.js", style: "plugins/xbox-achievement.css" },
		{ script: "plugins/barrel-roll.js" },
		{ script: "plugins/matrix-rain.js", style: "plugins/matrix-rain.css" },
		{ script: "plugins/glitch-mode.js", style: "plugins/glitch-mode.css" },
		{ script: "plugins/bsod.js", style: "plugins/bsod.css" }
	];

	function findLoadedElement(selector, urlProperty, url) {
		return Array.from(document.querySelectorAll(selector)).find(function(element) {
			return element[urlProperty] === url;
		});
	}

	function waitForLoad(element, url, type) {
		return new Promise(function(resolve) {
			if(element.dataset.castLoadState === "loaded") {
				resolve(true);
				return;
			}
			if(element.dataset.castLoadState === "failed") {
				resolve(false);
				return;
			}

			element.addEventListener("load", function() {
				element.dataset.castLoadState = "loaded";
				resolve(true);
			}, { once: true });
			element.addEventListener("error", function() {
				element.dataset.castLoadState = "failed";
				console.error("[CastEffectEngine loader] failed to load " + type + ": " + url);
				resolve(false);
			}, { once: true });
		});
	}

	function loadStyle(path) {
		const href = new URL(path, CSS_BASE).href;
		const existing = findLoadedElement('link[rel="stylesheet"]', "href", href);
		if(existing) {
			if(existing.sheet) return Promise.resolve(true);
			return waitForLoad(existing, href, "stylesheet");
		}

		const link = document.createElement("link");
		link.rel = "stylesheet";
		link.href = href;
		const loaded = waitForLoad(link, href, "stylesheet");
		document.head.appendChild(link);
		return loaded;
	}

	function loadScript(path) {
		const src = new URL(path, JS_BASE).href;
		const existing = findLoadedElement("script[src]", "src", src);
		if(existing) return Promise.resolve(true);

		const script = document.createElement("script");
		script.src = src;
		script.defer = true;
		const loaded = waitForLoad(script, src, "script");
		document.head.appendChild(script);
		return loaded;
	}

	function loadSequential(paths) {
		return paths.reduce(function(chain, path) {
			return chain.then(function() {
				return loadScript(path);
			});
		}, Promise.resolve());
	}

	function loadModule(module) {
		const resources = [loadScript(module.script)];
		if(module.style) resources.push(loadStyle(module.style));
		return Promise.all(resources);
	}

	function loadModules(modules) {
		return Promise.all(modules.map(loadModule));
	}

	// engine.js must wait until every registered module and style is ready.
	window.__castLoaderActive = true;

	window.castEffectEngineReady = Promise.all([
		loadStyle("core.css"),
		loadSequential(CORE)
	])
		.then(function() {
			return loadModules(EFFECTS);
		})
		.then(function() {
			return loadModules(PLUGINS);
		})
		.then(function() {
			console.log("[CastEffectEngine loader] all modules and styles loaded");
			if(window.CastEffectEngine && window.CastEffectEngine.boot) {
				window.CastEffectEngine.boot();
				return true;
			}
			console.error("[CastEffectEngine loader] engine unavailable after loading");
			return false;
		})
		.catch(function(error) {
			console.error("[CastEffectEngine loader] initialization failed", error);
			return false;
		});
})();
