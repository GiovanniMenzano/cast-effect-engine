/**
 * Text Glitch - single-element RGB split with horizontal shake.
 *
 * Note: this effect is intentionally distinct from the `glitch-mode`
 * PLUGIN under plugins/glitch-mode.js, which glitches the WHOLE PAGE
 * for 3 seconds when the user types "glitch". This one only glitches
 * the specific target element and runs for ~0.9s. Two different
 * scales, two different ids.
 *
 * Effect id: "text-glitch".
 */
(function() {
	"use strict";

	const DURATION_MS = 900;

	window.CastEffectEngine.registerEffect({
		id: "text-glitch",
		name: "Text RGB Glitch",
		description: "Element-level RGB split + horizontal shake (vs page-level glitch-mode plugin)",
		async cast(target, ctx) {
			target.classList.add("cast-text-glitch");
			await ctx.sleep(DURATION_MS);
			target.classList.remove("cast-text-glitch");
		}
	});
})();
