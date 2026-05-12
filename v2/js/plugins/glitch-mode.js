/**
 * Glitch Mode - type "glitch" for ~3s of VHS / CRT damage.
 *
 * Two layers:
 *   1. <body>.cast-glitch         → shake + color filter on the page itself
 *   2. <html> > .cast-glitch-overlay → scanlines + RGB bands above everything
 *
 * The overlay is appended to <html> (not body) on purpose: the body has a
 * `transform`/`filter` during the glitch, which would turn it into the
 * containing block for any `position: fixed` child, breaking fullscreen
 * layout.
 */
(function() {
	"use strict";

	const DURATION_MS = 3000;

	window.CastEffectEngine.registerPlugin({
		id: "glitch-mode",
		name: "Glitch Mode",
		description: "VHS damage",
		trigger: {
			type: "keyboard",
			sequence: ["g", "l", "i", "t", "c", "h"]
		},
		action(ctx) {
			const overlay = ctx.vfx.mountFullscreenOverlay("", {
				className: "cast-glitch-overlay",
				parent: document.documentElement
			});
			ctx.vfx.applyClassFor(document.body, "cast-glitch", DURATION_MS);
			setTimeout(() => ctx.vfx.unmount(overlay), DURATION_MS);
		}
	});
})();
