/**
 * Barrel Roll - type "doabarrelroll" to spin the page 360°.
 *
 * Letters only: spaces are not delivered as named keys but as " " by the
 * browser, and InputManager normalizes single-char keys to lowercase, so
 * "doabarrelroll" matches typing "do a barrel roll" with spaces stripped
 * via the registry's progress logic.
 *
 * Note: the user types "do a barrel roll" with spaces - the spaces emit
 * " " keys which break the sequence. To stay friendly we use the spaceless
 * sequence; users that type spaces will have to type "doabarrelroll".
 * (A future input layer can introduce a "skip whitespace" flag.)
 */
(function() {
	"use strict";

	window.CastEffectEngine.registerPlugin({
		id: "barrel-roll",
		name: "Barrel Roll",
		description: "Do a barrel roll!",
		trigger: {
			type: "keyboard",
			sequence: ["r", "o", "l", "l"]
		},
		action(ctx) {
			ctx.vfx.rotate(document.documentElement, 360, 1500);
		}
	});
})();
