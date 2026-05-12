/**
 * BSOD - type "bsod" or "crash" for a fake Windows blue screen.
 *
 * Two triggers, same plugin, registered separately so the registry can
 * track their progress independently. Both run the same action.
 */
(function() {
	"use strict";

	const DURATION_MS = 5000;

	const BSOD_HTML = `
		<div class="cast-bsod">
			<div class="cast-bsod__face">:(</div>
			<div class="cast-bsod__title">This website ran into a problem and needs to restart.</div>
			<div class="cast-bsod__detail">We're just collecting some error info, and then we'll restart for you.</div>
			<div class="cast-bsod__progress">100% complete</div>
			<div class="cast-bsod__footer">
				<div>For more information about this issue, search online for: <strong>CHEATCODE_OVERFLOW</strong></div>
			</div>
		</div>
	`;

	function showBsod(ctx) {
		const overlay = ctx.vfx.mountFullscreenOverlay(BSOD_HTML, { className: "cast-fullscreen-overlay--bsod" });
		setTimeout(() => ctx.vfx.unmount(overlay), DURATION_MS);
	}

	window.CastEffectEngine.registerPlugin({
		id: "bsod",
		name: "Blue Screen of Death",
		description: "Kernel panic, the Microsoft way",
		trigger: {
			type: "keyboard",
			sequence: ["b", "s", "o", "d"]
		},
		action(ctx) {
			showBsod(ctx);
		}
	});

	window.CastEffectEngine.registerPlugin({
		id: "bsod-crash",
		name: "Blue Screen of Death (crash)",
		description: "Alias trigger for 'crash'",
		trigger: {
			type: "keyboard",
			sequence: ["c", "r", "a", "s", "h"]
		},
		action(ctx) {
			showBsod(ctx);
		}
	});

	window.CastEffectEngine.registerPlugin({
		id: "bsod-idle",
		name: "Blue Screen of Death (idle)",
		description: "BSOD after 3 minutes of inactivity",
		trigger: {
			type: "idle",
			after: 180000
		},
		action(ctx) {
			showBsod(ctx);
		}
	});
})();
