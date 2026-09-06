/**
 * Flicker - IT Pennywise style creepy flash on a target element.
 *
 * Adds .cast-flicker for 800ms, then removes it. Ephemeral: no cleanup
 * contract returned because the class is gone before cast() resolves.
 *
 * Effect id: "flicker".
 */
(function() {
	"use strict";

	const DURATION_MS = 800;

	window.CastEffectEngine.registerEffect({
		id: "flicker",
		name: "Pennywise Flicker",
		description: "Creepy IT-style flash on the target element",
		async cast(target, ctx) {
			target.classList.add("cast-flicker");
			await ctx.sleep(DURATION_MS);
			target.classList.remove("cast-flicker");
		}
	});
})();
