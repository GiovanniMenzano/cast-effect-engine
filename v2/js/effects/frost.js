/**
 * Frost - persistent Tolkien-style cold coloring: target text turns
 * ice-blue with a soft glow. Stays applied until the caller invokes
 * the returned `cleanup()` function.
 *
 * Same persistent-class pattern as matrixgreen, different palette.
 *
 * Effect id: "frost".
 */
(function() {
	"use strict";

	window.CastEffectEngine.registerEffect({
		id: "frost",
		name: "Tolkien Frost",
		description: "Persistent ice-blue coloring, removed via cleanup()",
		async cast(target) {
			target.classList.add("cast-frost");
			return {
				cleanup: () => target.classList.remove("cast-frost")
			};
		}
	});
})();
