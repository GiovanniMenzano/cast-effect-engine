/**
 * Faderain - Blade Runner "tears in rain" canvas overlay.
 *
 * Mounts a canvas absolutely positioned over the target (padded by 48px),
 * draws ~140 streaks of rain with random speeds/opacities for 1.8s, then
 * tears down and signals `clearedText: true` so the caller resets its
 * text state. The text itself is NOT recolored or hidden during the
 * animation - rain just streaks over it, lyrically.
 *
 * Mask-fade on the overlay edges is provided by `.cast-faderain-overlay`
 * in css/effects/faderain.css so the rain dissolves gracefully into
 * the surrounding layout instead of cutting off at a hard edge.
 *
 * Effect id: "faderain".
 */
(function() {
	"use strict";

	const DURATION_MS = 1800;
	const PAD_PX = 48;
	const INITIAL_DROPS = 80;
	const MAX_DROPS = 140;

	window.CastEffectEngine.registerEffect({
		id: "faderain",
		name: "Blade Runner Tears in Rain",
		description: "Canvas rain streaks over the target; text stays unchanged",
		async cast(target, ctx) {
			const parent = target.parentElement;
			if(!parent) return { clearedText: true };

			const parentPos = getComputedStyle(parent).position;
			if(parentPos === "static") parent.style.position = "relative";

			const rect = target.getBoundingClientRect();
			const parentRect = parent.getBoundingClientRect();
			const topOff = rect.top - parentRect.top;
			const leftOff = rect.left - parentRect.left;
			const w = rect.width + PAD_PX * 2;
			const h = rect.height + PAD_PX * 2;

			const rainWrap = document.createElement("div");
			rainWrap.className = "cast-faderain-overlay";
			rainWrap.style.cssText = `position:absolute;top:${topOff - PAD_PX}px;left:${leftOff - PAD_PX}px;width:${w}px;height:${h}px;pointer-events:none;z-index:10;overflow:hidden;`;

			const canvas = document.createElement("canvas");
			canvas.width = Math.ceil(w);
			canvas.height = Math.ceil(h);
			rainWrap.appendChild(canvas);
			parent.appendChild(rainWrap);

			const g = canvas.getContext("2d");
			const drops = [];
			const start = performance.now();
			let rafId = null;
			let running = true;

			const spawnDrop = (randomY) => {
				drops.push({
					x: Math.random() * canvas.width,
					y: randomY ? Math.random() * canvas.height : -30 - Math.random() * 60,
					len: 16 + Math.random() * 36,
					speed: 16 + Math.random() * 22,
					opacity: 0.2 + Math.random() * 0.5,
					width: 1 + Math.random() * 1.5
				});
			};

			for(let i = 0; i < INITIAL_DROPS; i++) spawnDrop(true);

			const drawFrame = (now) => {
				if(!running) return;

				g.clearRect(0, 0, canvas.width, canvas.height);

				while(drops.length < MAX_DROPS && Math.random() < 0.85) {
					spawnDrop(false);
				}

				for(let i = drops.length - 1; i >= 0; i--) {
					const d = drops[i];
					d.y += d.speed;
					d.x += 0.4; // slight wind drift

					const grad = g.createLinearGradient(d.x, d.y, d.x + 2, d.y + d.len);
					grad.addColorStop(0, "rgba(200, 220, 240, 0)");
					grad.addColorStop(0.15, `rgba(200, 220, 240, ${d.opacity})`);
					grad.addColorStop(0.7, `rgba(140, 180, 220, ${d.opacity * 0.6})`);
					grad.addColorStop(1, "rgba(100, 150, 200, 0)");

					g.strokeStyle = grad;
					g.lineWidth = d.width;
					g.lineCap = "round";
					g.beginPath();
					g.moveTo(d.x, d.y);
					g.lineTo(d.x + 2, d.y + d.len);
					g.stroke();

					if(d.y > canvas.height + d.len) {
						drops.splice(i, 1);
					}
				}

				if(now - start < DURATION_MS) {
					rafId = requestAnimationFrame(drawFrame);
				}
			};

			rafId = requestAnimationFrame(drawFrame);
			await ctx.sleep(DURATION_MS);

			running = false;
			if(rafId) cancelAnimationFrame(rafId);

			rainWrap.remove();
			if(parentPos === "static") parent.style.position = "";

			return { clearedText: true };
		}
	});
})();
