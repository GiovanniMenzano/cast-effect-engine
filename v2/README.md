# Cast Effect Engine

A lightweight, vanilla JavaScript easter-egg and interactive visual effect engine for websites.

This engine allows you to easily inject fun, interactive elements (like the Matrix rain, Konami Code, screen glitches, barrel rolls, and Xbox achievements) into any website with zero dependencies.

## Features

- **Zero Dependencies**: Pure vanilla JavaScript and CSS. No React, jQuery, or GSAP required.
- **Plug-and-Play**: Just drop the folder into your project and link a single JS file.
- **Plugin Architecture**: Modular design makes it incredibly easy to add new effects without touching the core engine.
- **Robust Event System**: A built-in EventBus and InputManager handle all keyboard tracking (konami codes, secrets) and scroll/idle triggers.

## Installation

1. Copy the `cast-effect-engine` folder into your project's static assets directory. The folder structure looks like this:
   ```text
   cast-effect-engine/
   ├── css/
   │   ├── cast-effect-engine.css
   │   └── xbox-achievement-notification.css
   └── js/
       ├── loader.js
       ├── core/
       └── plugins/
   ```
If you want to change the path of some components (css or plugin files), remember to update `loader.js` file.

2. Include the `loader.js` script in your HTML file, anywhere in the `<head>` or before the closing `</body>` tag. Use the `defer` attribute.
   ```html
   <script src="path/to/cast-effect-engine/js/loader.js" defer></script>
   ```

That's it! The loader will automatically resolve paths, inject the necessary CSS files, and load all the core modules and plugins in the correct order.

## Built-in Plugins (Triggers)

Once loaded, the engine listens for the following triggers:

- **Konami Code** (`↑ ↑ ↓ ↓ ← → ← → B A`): Triggers a developer greeting/easter egg.
- **Type "matrix"**: Triggers a global Matrix digital rain effect.
- **Type "roll"**: Does a CSS barrel roll on the whole page.
- **Type "glitch"**: Triggers a temporary screen glitch/distortion effect.
- **Type "bsod"**: Triggers a fake Blue Screen of Death.
- **Stay idle for 3 minutes**: Triggers a fake Blue Screen of Death.

## How to Create a New Plugin

Creating a new effect is incredibly simple. Just add a new `.js` file to the `js/plugins/` directory and add it to the manifest.

**Example: `my-plugin.js`**
```javascript
(function() {
    "use strict";

    // Register your plugin with the engine
    window.CastEffectEngine.PluginRegistry.register({
        name: "MyCustomEffect",
        init: function() {
            // Subscribe to the global EventBus
            // For example, listen for a specific typed word:
            window.CastEffectEngine.EventBus.subscribe("input:secretWord", function() {
                alert("You typed the secret word!");
            });
        }
    });
})();
```

Then, open `js/loader.js` and add your plugin to the `PLUGINS` array:
```javascript
var PLUGINS = [
    "plugins/konami-code.js",
    "plugins/xbox-achievement.js",
    "plugins/barrel-roll.js",
    "plugins/matrix-rain.js",
    "plugins/glitch-mode.js",
    "plugins/bsod.js",
    "plugins/my-plugin.js" // <-- Your new plugin
];
```
