# Cast Effect Engine

A small vanilla JavaScript engine for easter eggs and visual effects. It has no runtime dependencies and can be added to an existing page with one script.

## How it is organized

There are two types of modules:

- **Plugins** run when a trigger fires, for example a keyboard sequence or an idle timeout.
- **Effects** are passive and run only when `CastEffectEngine.cast()` is called on a DOM element.

The loader takes care of the load order and loads the stylesheet declared by each module.

```text
v2/
├── assets/
├── css/
│   ├── core.css
│   ├── effects/
│   └── plugins/
├── examples/
│   └── typewriter/
└── js/
    ├── core/
    ├── effects/
    ├── plugins/
    └── loader.js
```

## Installation

Copy the whole `v2` folder into your project, then include the loader:

```html
<script src="path/to/v2/js/loader.js" defer></script>
```

Asset and CSS paths are resolved from the engine folder, so it does not have to live at the root of the website. The engine boots only after its scripts and styles are ready.

The loader exposes a Promise. Await it before using the API from another script:

```javascript
const ready = await window.castEffectEngineReady;

if(ready) {
    const target = document.querySelector(".message");
    await window.CastEffectEngine.cast("flicker", { target });
}
```

## Built-in effects

- `flicker`: short light flicker.
- `meltdown`: the target sinks and fades like molten metal.
- `matrixgreen`: persistent green terminal color.
- `frost`: persistent ice-blue color.
- `text-glitch`: RGB split and horizontal glitch on one element.
- `faderain`: rain drawn over the target with a canvas.
- `snap`: the target dissolves into particles.
- `eject`: an Among Us crewmate crosses the screen.

`matrixgreen` and `frost` return a cleanup function because they are persistent:

```javascript
const result = await CastEffectEngine.cast("frost", { target });

// Remove the effect when it is no longer needed.
result?.cleanup?.();
```

`snap` accepts an optional `overflowFix` element or selector. It is useful when an ancestor clips the particles:

```javascript
await CastEffectEngine.cast("snap", {
    target,
    overflowFix: ".hero"
});
```

## Built-in plugins

- Type the Konami Code (`↑ ↑ ↓ ↓ ← → ← → B A`): plays the classic power-up sound.
- Type `xbox`: shows an Xbox-style achievement.
- Type `roll`: performs a barrel roll.
- Type `matrix`: starts the Matrix rain.
- Type `glitch`: glitches the whole page.
- Type `bsod` or `crash`: shows a fake blue screen.
- Stay idle for three minutes: shows the same blue screen.

The engine ignores keyboard input while the user is writing inside an input, textarea, select or editable element.

## Public methods

```javascript
CastEffectEngine.registerPlugin(definition);
CastEffectEngine.registerEffect(definition);
CastEffectEngine.cast(effectId, { target });
CastEffectEngine.trigger(pluginId);
CastEffectEngine.listPlugins();
CastEffectEngine.listEffects();
```

## Adding an effect

Create a file inside `js/effects/`:

```javascript
(function() {
    "use strict";

    window.CastEffectEngine.registerEffect({
        id: "highlight",
        name: "Highlight",
        async cast(target, ctx) {
            target.classList.add("is-highlighted");
            await ctx.sleep(1000);
            target.classList.remove("is-highlighted");
        }
    });
})();
```

Put the stylesheet in `css/effects/`, then add both files to the `EFFECTS` array in `js/loader.js`:

```javascript
{ script: "effects/highlight.js", style: "effects/highlight.css" }
```

The `style` field can be omitted when the effect does not need CSS. Keep its selectors namespaced.

## Adding a plugin

Create a file inside `js/plugins/`:

```javascript
(function() {
    "use strict";

    window.CastEffectEngine.registerPlugin({
        id: "hello",
        name: "Hello",
        trigger: {
            type: "keyboard",
            sequence: ["h", "e", "l", "l", "o"]
        },
        action(ctx) {
            ctx.log("Hello triggered");
        }
    });
})();
```

Then add it to the `PLUGINS` array in `js/loader.js`. A plugin with its own stylesheet uses the same format:

```javascript
{ script: "plugins/hello.js", style: "plugins/hello.css" }
```

Available trigger types are `keyboard`, `time`, `idle` and `scroll`. Their required fields are checked by the matching modules in `js/core/triggers/`.

## TypeWriter example

`examples/typewriter/` contains a standalone typewriter that understands these tokens:

- `{br}` inserts a line break.
- `{w500}` waits for 500 milliseconds.
- `{effect:flicker}` delegates an effect to an injected runner.

The typewriter does not import or access the engine directly. `demo.js` contains the small adapter used to connect them.

If more than one persistent effect returns a cleanup function, the typewriter keeps them and runs them in reverse order before restoring the primary message.

Run the repository through a local web server and open:

```text
v2/examples/typewriter/index.html
```

The page includes buttons for testing every effect without waiting for the random typewriter message.
