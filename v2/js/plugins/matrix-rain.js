/**
 * Matrix Rain - type "matrix" to summon the digital rain.
 *
 * Uses the canvas already declared in index.html (#matrix-container > #matrix).
 * If it isn't there for some reason we create it on the fly. Auto-closes
 * after 15 seconds, or earlier if the user clicks/presses a key. Robust to
 * resize during the animation.
 */
(function() {
	"use strict";

	const DURATION_MS = 15000;
	const FONT_SIZE = 16;
	const FADE_ALPHA = 0.045;          // lower = longer trails
	const FRAME_INTERVAL_MS = 55;      // ~18 FPS, film-like cadence
	const HEAD_COLOR = "#cfffcf";      // near-white green: the "leader"
	const BODY_COLOR = "#00cc33";      // standard Matrix green for the trail

	let active = false;

	function getOrCreateContainer() {
		let container = document.getElementById("matrix-container");
		if(!container) {
			container = document.createElement("div");
			container.id = "matrix-container";
			container.className = "matrix-container";
			const canvas = document.createElement("canvas");
			canvas.id = "matrix";
			container.appendChild(canvas);
			document.body.appendChild(container);
		}
		container.classList.add("matrix-container--active");
		return container;
	}

	function startRain(ctx) {
		if(active) return;
		active = true;

		const container = getOrCreateContainer();
		const canvas = container.querySelector("canvas");
		const g = canvas.getContext("2d");

		const sizeCanvas = () => {
			canvas.width = window.innerWidth;
			canvas.height = window.innerHeight;
		};
		sizeCanvas();
		window.addEventListener("resize", sizeCanvas);

		const charset = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789ｱｲｳｴｵｶｷｸｹｺｻｼｽｾｿﾀﾁﾂﾃﾄﾅﾆﾇﾈﾉﾊﾋﾌﾍﾎ@#$%&*+=<>".split("");
		let columns = Math.floor(canvas.width / FONT_SIZE);
		const drops = new Array(columns).fill(0);
		const lastChars = new Array(columns).fill("");

		let rafId = null;
		let lastFrameTime = 0;

		const renderFrame = () => {
			// Reflow columns if the window was resized
			const currentColumns = Math.floor(canvas.width / FONT_SIZE);
			if(currentColumns !== columns) {
				if(currentColumns > columns) {
					for(let i = columns; i < currentColumns; i++) {
						drops[i] = 0;
						lastChars[i] = "";
					}
				} else {
					drops.length = currentColumns;
					lastChars.length = currentColumns;
				}
				columns = currentColumns;
			}

			// Black overlay with low alpha → previous characters fade slowly,
			// producing the long green trail behind each leader.
			g.fillStyle = "rgba(0, 0, 0, " + FADE_ALPHA + ")";
			g.fillRect(0, 0, canvas.width, canvas.height);
			g.font = FONT_SIZE + "px monospace";

			for(let i = 0; i < drops.length; i++) {
				const x = i * FONT_SIZE;
				const y = drops[i] * FONT_SIZE;

				// Repaint the previous head in plain green so the trail looks
				// like white-green-green-fade instead of white-white-fade.
				if(lastChars[i]) {
					g.fillStyle = BODY_COLOR;
					g.fillText(lastChars[i], x, y - FONT_SIZE);
				}

				// Bright leader at the current head position
				const ch = charset[Math.floor(Math.random() * charset.length)];
				g.fillStyle = HEAD_COLOR;
				g.fillText(ch, x, y);
				lastChars[i] = ch;

				// Reset drops at the bottom with a small probability so columns
				// don't all restart at once
				if(y > canvas.height && Math.random() > 0.975) {
					drops[i] = 0;
					lastChars[i] = "";
				}
				drops[i]++;
			}
		};

		const draw = (now) => {
			if(!now) now = performance.now();
			if(now - lastFrameTime >= FRAME_INTERVAL_MS) {
				lastFrameTime = now;
				renderFrame();
			}
			rafId = requestAnimationFrame(draw);
		};

		// kick off
		rafId = requestAnimationFrame(draw);

		const stop = () => {
			if(!active) return;
			active = false;
			cancelAnimationFrame(rafId);
			window.removeEventListener("resize", sizeCanvas);
			document.removeEventListener("keydown", earlyStop, true);
			container.removeEventListener("click", earlyStop);
			container.classList.remove("matrix-container--active");
			g.clearRect(0, 0, canvas.width, canvas.height);
		};

		const earlyStop = () => stop();
		document.addEventListener("keydown", earlyStop, { once: true, capture: true });
		container.addEventListener("click", earlyStop, { once: true });

		setTimeout(stop, DURATION_MS);
	}

	window.CastEffectEngine.registerPlugin({
		id: "matrix-rain",
		name: "Matrix Rain",
		description: "Wake up, Neo...",
		trigger: {
			type: "keyboard",
			sequence: ["m", "a", "t", "r", "i", "x"]
		},
		action(ctx) {
			startRain(ctx);
		}
	});
})();
