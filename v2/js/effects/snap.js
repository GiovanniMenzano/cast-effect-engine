/**
 * Snap - Thanos disintegration: target text dissolves into a fine grid of
 * dust particles drifting up-rightwards. Left-to-right dissolve wave.
 *
 * Each cell is a clone of the target with a clip-path mask covering only
 * its slice; CSS transitions handle the actual physics (transform + opacity
 * + blur with per-cell delays). The original target fades out softly so
 * there is no visible layout seam when the particles take over.
 *
 * Signals `clearedText: true` (the visual leaves the area empty).
 *
 * Opts:
 *   - overflowFix: optional element or CSS selector whose overflow would
 *                  clip the outward-drifting particles.
 *
 * Effect id: "snap".
 */
(function() {
	"use strict";

	const COLS = 50;
	const CELL_HEIGHT_PX = 4; // smaller = finer dust, larger = chunkier
	const ANIMATION_MS = 3500; // includes the staggered per-cell delays
	const TEXT_FADE_MS = 300; // soft fade of the original element

	window.CastEffectEngine.registerEffect({
		id: "snap",
		name: "Thanos Snap",
		description: "Target text disintegrates into dust drifting up-right",
		async cast(target, ctx, opts) {
			const parent = target.parentElement;
			if(!parent) return { clearedText: true };

			const overflowFix = opts && opts.overflowFix;
			const overflowFixEl = typeof overflowFix === "string"
				? document.querySelector(overflowFix)
				: (overflowFix && overflowFix.nodeType === 1 ? overflowFix : null);
			const prevOverflow = overflowFixEl ? overflowFixEl.style.overflowX : "";
			if(overflowFixEl) overflowFixEl.style.overflowX = "visible";

			const parentPos = getComputedStyle(parent).position;
			if(parentPos === "static") parent.style.position = "relative";

			const rect = target.getBoundingClientRect();
			const parentRect = parent.getBoundingClientRect();

			// Subtract border + padding so the absolute container aligns to
			// the parent's content box, not its padding box.
			const parentStyle = getComputedStyle(parent);
			const borderLeft = parseFloat(parentStyle.borderLeftWidth) || 0;
			const borderTop = parseFloat(parentStyle.borderTopWidth) || 0;
			const paddingLeft = parseFloat(parentStyle.paddingLeft) || 0;
			const paddingTop = parseFloat(parentStyle.paddingTop) || 0;

			const leftOff = rect.left - parentRect.left - borderLeft - paddingLeft;
			const topOff = rect.top - parentRect.top - borderTop - paddingTop;

			const rows = Math.max(6, Math.ceil(rect.height / CELL_HEIGHT_PX));
			const cellW = 100 / COLS;
			const cellH = 100 / rows;

			const container = document.createElement("div");
			container.className = "cast-snap-container";
			container.style.cssText = `position:absolute;top:${topOff}px;left:${leftOff}px;width:${rect.width}px;height:${rect.height}px;pointer-events:none;overflow:visible;z-index:10;`;
			parent.appendChild(container);

			// Absolute positioning turns an inline clone into a block. Depending
			// on the font, that can move its glyphs even when the boxes line up.
			// Measure the difference once instead of relying on a fixed offset.
			const alignmentClone = target.cloneNode(true);
			alignmentClone.style.cssText = "position:absolute;top:0;left:0;width:100%;height:100%;margin:0;padding:0;visibility:hidden;pointer-events:none;box-sizing:border-box;";
			container.appendChild(alignmentClone);

			const sourceRange = document.createRange();
			sourceRange.selectNodeContents(target);
			const cloneRange = document.createRange();
			cloneRange.selectNodeContents(alignmentClone);
			const baselineOffset = sourceRange.getBoundingClientRect().top
				- cloneRange.getBoundingClientRect().top;

			container.style.top = `${topOff + baselineOffset}px`;
			alignmentClone.remove();

			const particles = [];
			for(let r = 0; r < rows; r++) {
				for(let c = 0; c < COLS; c++) {
					// Lightweight clone of the target span (not the parent)
					// keeps memory & layout cost low for ~50 * rows particles.
					const p = target.cloneNode(true);

					// Jitter prevents visible perfect-grid seams between cells.
					const jitter = () => (Math.random() - 0.5) * 1.5;
					const clipTop = r * cellH + jitter();
					const clipRight = 100 - (c + 1) * cellW + jitter();
					const clipBottom = 100 - (r + 1) * cellH + jitter();
					const clipLeft = c * cellW + jitter();

					p.style.cssText = `position:absolute;top:0;left:0;width:100%;height:100%;margin:0;padding:0;clip-path:inset(${clipTop}% ${clipRight}% ${clipBottom}% ${clipLeft}%);pointer-events:none;will-change:transform,opacity,filter;box-sizing:border-box;`;

					// Wind physics: up-right drift with per-particle variation.
					const baseAngle = -Math.PI / 4; // -45 degrees
					const angle = baseAngle + (Math.random() - 0.5) * 0.8;
					const distance = 60 + Math.random() * 120;
					const dx = Math.cos(angle) * distance;
					const dy = Math.sin(angle) * distance;
					const rot = (Math.random() - 0.5) * 180; // tumble

					// Left-to-right dissolve wave via per-column delay.
					const delay = (c / COLS) * 1500 + Math.random() * 200;
					const dur = 800 + Math.random() * 800;

					p.style.transition = `transform ${dur}ms cubic-bezier(0.25, 0.46, 0.45, 0.94) ${delay}ms, opacity ${dur}ms ease-out ${delay}ms, filter ${dur}ms ease-out ${delay}ms`;
					container.appendChild(p);
					particles.push({ el: p, dx, dy, rot });
				}
			}

			// Force layout reflow so the browser registers the initial state
			// before we toggle the transition end values.
			void container.offsetHeight;

			// Soft fade of the original element to hide the cross-over.
			target.style.transition = `opacity ${TEXT_FADE_MS}ms ease-out`;
			target.style.opacity = "0";

			particles.forEach(({ el: p, dx, dy, rot }) => {
				p.style.transform = `translate(${dx}px, ${dy}px) rotate(${rot}deg) scale(0)`;
				p.style.opacity = "0";
				p.style.filter = "blur(3px)";
			});

			await ctx.sleep(ANIMATION_MS);

			container.remove();
			target.style.transition = "";
			target.style.opacity = "";
			if(parentPos === "static") parent.style.position = "";
			if(overflowFixEl) overflowFixEl.style.overflowX = prevOverflow;

			return { clearedText: true };
		}
	});
})();
