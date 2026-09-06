/**
 * Meltdown - T-800 lava sink: target text glows orange, blurs, sinks
 * downward and fades out over 2.5s.
 *
 * The animation visually clears the area (opacity 0 + downward translate),
 * so the result reports `clearedText: true` to the caller.
 *
 * Effect id: "meltdown".
 */
(function() {
	"use strict";

	const DURATION_MS = 2500;

	window.CastEffectEngine.registerEffect({
		id: "meltdown",
		name: "T-800 Meltdown",
		description: "Orange lava sink with downward fade",
		async cast(target, ctx) {
			target.classList.add("cast-meltdown");
			await ctx.sleep(DURATION_MS);
			target.classList.remove("cast-meltdown");
			return { clearedText: true };
		}
	});
})();
