(function() {
	"use strict";

	const PRIMARY_MESSAGE = "The engine is ready.";
	const ALTERNATE_MESSAGES = [
		"Matrix mode enabled{effect:matrixgreen}",
		"Temperature dropping{effect:frost}",
		"Signal unstable{effect:text-glitch}",
		"Something moved in the dark{effect:flicker}",
		"Core temperature critical{effect:meltdown}",
		"All those moments...{effect:faderain}",
		"Player was ejected{effect:eject}",
		"Half the text is enough{effect:snap}"
	];

	document.addEventListener("DOMContentLoaded", initDemo);

	async function initDemo() {
		const target = document.querySelector("#typewriter");
		const runButton = document.querySelector("#run-typewriter");
		const effectButtons = Array.from(document.querySelectorAll("[data-effect]"));
		const controls = [runButton, ...effectButtons];
		const status = document.querySelector("#status");

		const ready = await (window.castEffectEngineReady || Promise.resolve(false));
		if(!ready || !window.CastEffectEngine) {
			status.textContent = "The engine could not be loaded. Check the console.";
			return;
		}

		controls.forEach((button) => { button.disabled = false; });
		status.textContent = "Ready.";

		const runEffect = (effectId, element) => window.CastEffectEngine.cast(effectId, {
			target: element,
			overflowFix: document.querySelector(".demo-stage")
		});

		runButton.addEventListener("click", async () => {
			setBusy(controls, true);
			status.textContent = "Running typewriter...";
			target.textContent = PRIMARY_MESSAGE;

			const typewriter = new TypeWriter({
				element: target,
				alternateMessages: ALTERNATE_MESSAGES,
				primaryMessage: PRIMARY_MESSAGE,
				charInterval: 38,
				charIntervalRange: 14,
				displayDuration: 1200,
				emptyPauseDuration: 500,
				runEffect
			});

			await typewriter.startAfter(300);
			status.textContent = "Ready.";
			setBusy(controls, false);
		});

		effectButtons.forEach((button) => {
			button.addEventListener("click", async () => {
				setBusy(controls, true);
				const effectId = button.dataset.effect;
				status.textContent = `Running ${effectId}...`;
				target.textContent = `Effect: ${effectId}`;

				const result = (await runEffect(effectId, target)) || {};
				if(typeof result.cleanup === "function") {
					await sleep(1400);
					result.cleanup();
				}

				target.textContent = PRIMARY_MESSAGE;
				status.textContent = "Ready.";
				setBusy(controls, false);
			});
		});
	}

	function setBusy(controls, busy) {
		controls.forEach((button) => { button.disabled = busy; });
	}

	function sleep(ms) {
		return new Promise((resolve) => setTimeout(resolve, ms));
	}
})();
