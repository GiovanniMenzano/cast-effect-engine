/**
 * Konami Code - the OG.
 *
 * Up Up Down Down Left Right Left Right B A → Mario power-up sound.
 * Sound only, no Xbox banner: the banner is reserved for the `xbox` cheat.
 */
(function() {
	"use strict";

	const SOUND_URL = "/assets/audio/mario_power_up.mp3";

	window.CastEffectEngine.registerPlugin({
		id: "konami-code",
		name: "Konami Code",
		description: "The classic 30-lives cheat",
		trigger: {
			type: "keyboard",
			sequence: [
				"ArrowUp", "ArrowUp",
				"ArrowDown", "ArrowDown",
				"ArrowLeft", "ArrowRight",
				"ArrowLeft", "ArrowRight",
				"b", "a"
			]
		},
		action(ctx) {
			ctx.sound.play(SOUND_URL);
		}
	});
})();
