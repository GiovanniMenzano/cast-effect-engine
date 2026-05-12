/**
 * CastEffectEngine - singleton bootstrap + plugin context provider.
 *
 * Loaded BEFORE the plugins. Each plugin file calls
 * `CastEffectEngine.registerPlugin({...})` at script eval time; those calls are
 * queued until DOMContentLoaded, at which point we start every trigger
 * manager.
 *
 * Plugins receive a frozen-ish `ctx` object (sound/vfx/bus/log).
 * They never reach into core internals directly.
 *
 * Trigger dispatch: each plugin's `trigger.type` selects the manager that
 * actually watches for the fire condition (see `core/triggers/*`). When a
 * manager fires, it calls back into `#invokePlugin` which is the single
 * place that runs `action(ctx)` and logs to PHP.
 */
(function() {
	"use strict";

	const LOGGER_ENDPOINT = "php/function_logger.php";

	class CastEffectEngine {
		#bus;
		#sound;
		#vfx;
		#registry;
		#input;
		#triggerManagers;
		#ctx;
		#booted = false;

		constructor() {
			const core = window.CastEffectEngineCore;
			if(!core || !core.EventBus) {
				throw new Error("[CastEffectEngine] core not loaded - check script order in index.html");
			}
			const required = ["KeyboardTrigger", "TimeTrigger", "IdleTrigger", "ScrollTrigger"];
			for(const name of required) {
				if(!core[name]) {
					throw new Error("[CastEffectEngine] " + name + " not loaded - check script order in index.html");
				}
			}

			this.#bus = new core.EventBus();
			this.#sound = new core.SoundManager();
			this.#vfx = new core.VisualFXManager();
			this.#registry = new core.PluginRegistry();
			this.#input = new core.InputManager(this.#bus);

			const onFire = (plugin) => this.#invokePlugin(plugin);
			this.#triggerManagers = {
				keyboard: new core.KeyboardTrigger({ bus: this.#bus, onFire: onFire }),
				time: new core.TimeTrigger({ onFire: onFire }),
				idle: new core.IdleTrigger({ onFire: onFire }),
				scroll: new core.ScrollTrigger({ onFire: onFire })
			};

			this.#ctx = Object.freeze({
				sound: this.#sound,
				vfx: this.#vfx,
				bus: this.#bus,
				log: (msg) => console.log("[CastEffectEngine] " + msg)
			});
		}

		registerPlugin(definition) {
			const ok = this.#registry.register(definition);
			if(!ok) return false;
			const manager = this.#triggerManagers[definition.trigger.type];
			if(manager) {
				manager.add(definition);
			}
			return true;
		}

		boot() {
			if(this.#booted) return;
			this.#booted = true;

			this.#input.start(document);

			Object.values(this.#triggerManagers).forEach((mgr) => {
				try {
					mgr.start();
				} catch(err) {
					console.error("[CastEffectEngine] trigger manager start failed", err);
				}
			});

			console.log("[CastEffectEngine] booted with " + this.#registry.count() + " plugins");
		}

		#invokePlugin(plugin) {
			try {
				plugin.action(this.#ctx);
			} catch(err) {
				console.error("[CastEffectEngine] plugin '" + plugin.id + "' threw", err);
			}
			this.#logActivation(plugin.id);
		}

		#logActivation(pluginId) {
			try {
				fetch(LOGGER_ENDPOINT, {
					method: "POST",
					headers: { "Content-Type": "application/json" },
					body: JSON.stringify({ function_name: "cast:" + pluginId })
				}).catch((err) => console.debug("[CastEffectEngine] logging failed", err));
			} catch(err) {
				// fetch may not exist in very old browsers
			}
		}

		// Manual fire by plugin id. Useful to test non-keyboard plugins from
		// DevTools without waiting for their natural trigger condition.
		trigger(pluginId) {
			const plugin = this.#registry.findById(pluginId);
			if(!plugin) {
				console.warn("[CastEffectEngine] trigger() - no plugin with id '" + pluginId + "'");
				return false;
			}
			this.#invokePlugin(plugin);
			return true;
		}

		listPlugins() {
			return this.#registry.all().map((p) => ({
				id: p.id,
				name: p.name || p.id,
				type: p.trigger && p.trigger.type
			}));
		}
	}

	const instance = new CastEffectEngine();
	window.CastEffectEngine = {
		registerPlugin: (def) => instance.registerPlugin(def),
		listPlugins: () => instance.listPlugins(),
		trigger: (id) => instance.trigger(id),
		boot: () => instance.boot()
	};

	// Boot strategy:
	// - If loaded by loader.js, it sets window.__castLoaderActive = true
	//   and calls CastEffectEngine.boot() itself after all plugins are loaded.
	// - If loaded via traditional <script defer> tags in HTML, we auto-boot
	//   on DOMContentLoaded so every plugin file has already run its
	//   registerPlugin() call by then.
	if(!window.__castLoaderActive) {
		if(document.readyState === "complete") {
			setTimeout(() => instance.boot(), 0);
		} else {
			document.addEventListener("DOMContentLoaded", () => instance.boot(), { once: true });
		}
	}
})();
