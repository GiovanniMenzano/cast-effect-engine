/**
 * CastEffectEngine - singleton bootstrap + plugin/effect context provider.
 *
 * Loaded BEFORE the plugins and effects. Each plugin/effect file calls
 * `CastEffectEngine.registerPlugin({...})` or `registerEffect({...})` at
 * script eval time.
 *
 * Two kinds of callable units:
 *   - Plugins start from a trigger such as keyboard, time, idle or scroll.
 *   - Effects run on demand through `CastEffectEngine.cast(id, opts)`.
 *
 * Both receive a frozen `ctx` object (sound/vfx/bus/sleep/log).
 * They never reach into core internals directly.
 *
 * Trigger dispatch: each plugin's `trigger.type` selects the manager that
 * actually watches for the fire condition (see `core/triggers/*`). When a
 * manager fires, it calls back into `#invokePlugin` which is the single
 * place that runs `action(ctx)`.
 *
 * Effect dispatch: `cast(id, { target, ...opts })` looks up the effect
 * by id, awaits `effect.cast(target, ctx, opts)` and returns its result.
 */
(function() {
	"use strict";

	class CastEffectEngine {
		#bus;
		#sound;
		#vfx;
		#registry;
		#effects;
		#input;
		#triggerManagers;
		#ctx;
		#booted = false;

		constructor() {
			const core = window.CastEffectEngineCore;
			if(!core || !core.EventBus) {
				throw new Error("[CastEffectEngine] core not loaded - check script order in index.html");
			}
			const required = ["KeyboardTrigger", "TimeTrigger", "IdleTrigger", "ScrollTrigger", "EffectRegistry"];
			for(const name of required) {
				if(!core[name]) {
					throw new Error("[CastEffectEngine] " + name + " not loaded - check script order in index.html");
				}
			}

			this.#bus = new core.EventBus();
			this.#sound = new core.SoundManager();
			this.#vfx = new core.VisualFXManager();
			this.#registry = new core.PluginRegistry();
			this.#effects = new core.EffectRegistry();
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
				sleep: (ms) => new Promise((resolve) => setTimeout(resolve, ms)),
				log: (msg) => console.log("[CastEffectEngine] " + msg)
			});
		}

		registerPlugin(definition) {
			const ok = this.#registry.register(definition);
			if(!ok) return false;
			const manager = this.#triggerManagers[definition.trigger.type];
			if(manager) {
				manager.add(definition);
				// A trigger skipped during boot must start if its first plugin is registered later.
				if(this.#booted) manager.start();
			}
			return true;
		}

		registerEffect(definition) {
			return this.#effects.register(definition);
		}

		async cast(effectId, opts) {
			const effect = this.#effects.findById(effectId);
			if(!effect) {
				console.warn("[CastEffectEngine] cast() - no effect with id '" + effectId + "'");
				return undefined;
			}
			const options = opts || {};
			if(!options.target) {
				console.warn("[CastEffectEngine] cast('" + effectId + "') called without opts.target");
				return undefined;
			}
			try {
				return await effect.cast(options.target, this.#ctx, options);
			} catch(err) {
				console.error("[CastEffectEngine] effect '" + effectId + "' threw", err);
				return undefined;
			}
		}

		boot() {
			if(this.#booted) return;
			this.#booted = true;

			this.#input.start(document);

			// Multiple plugins can share a trigger, so keep only the trigger types in use.
			const activeTriggerTypes = new Set(
				this.#registry.all().map((plugin) => plugin.trigger.type)
			);

			Object.entries(this.#triggerManagers).forEach(([type, manager]) => {
				// Unused triggers stay idle and do not install listeners or polling timers.
				if(!activeTriggerTypes.has(type)) return;
				try {
					manager.start();
				} catch(err) {
					console.error("[CastEffectEngine] trigger manager start failed", err);
				}
			});

			console.log("[CastEffectEngine] booted with " + this.#registry.count() + " plugins and " + this.#effects.count() + " effects");
		}

		#invokePlugin(plugin) {
			try {
				plugin.action(this.#ctx);
			} catch(err) {
				console.error("[CastEffectEngine] plugin '" + plugin.id + "' threw", err);
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

		listEffects() {
			return this.#effects.all().map((e) => ({
				id: e.id,
				name: e.name || e.id
			}));
		}
	}

	const instance = new CastEffectEngine();
	window.CastEffectEngine = {
		registerPlugin: (def) => instance.registerPlugin(def),
		registerEffect: (def) => instance.registerEffect(def),
		cast: (id, opts) => instance.cast(id, opts),
		listPlugins: () => instance.listPlugins(),
		listEffects: () => instance.listEffects(),
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
