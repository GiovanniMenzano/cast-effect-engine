/**
 * MatrixGreen - persistent Matrix terminal coloring: target text turns
 * neon green with a soft glow, and stays that way until the caller
 * invokes the returned `cleanup()` function.
 *
 * Persistent: the returned cleanup function removes the class when the
 * caller no longer needs it.
 *
 * Effect id: "matrixgreen".
 */
(function() {
	"use strict";

	window.CastEffectEngine.registerEffect({
		id: "matrixgreen",
		name: "Matrix Terminal Green",
		description: "Persistent neon-green coloring, removed via cleanup()",
		async cast(target) {
			target.classList.add("cast-matrixgreen");
			return {
				cleanup: () => target.classList.remove("cast-matrixgreen")
			};
		}
	});
})();
