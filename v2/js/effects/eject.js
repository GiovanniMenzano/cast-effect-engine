/**
 * Eject - Among Us crewmate flies horizontally across the screen, spinning
 * counter-clockwise. Inspired by the in-game "you were ejected" cinematic.
 *
 * The crewmate is built entirely from CSS-on-divs (no images, no SVG sprite
 * - based on Louis Hoebregts' CodePen WNxOvjo, adapted to a red palette).
 * Two-layer structure to avoid matrix-jitter when combining translate+rotate
 * on the same node:
 *   - outer container: pure horizontal translate3d (linear, no rotation)
 *   - inner flyer:     pure rotation around its visual center
 *
 * The target text is left untouched during the flight (matches the Among
 * Us in-game cinematic, where the eject animation never dims the HUD text).
 * At the end of the flight we signal `clearedText: true` so the caller
 * resets its text state in a single frame.
 *
 * The SVG filter used by some legs (.cast-among-leg--right/--back) is
 * lazy-injected once into <body> at the first cast - no need to hand-write
 * it into every page's index.html.
 *
 * --- MANUAL TWEAKS GUIDE ---
 * 1. Center of mass / rotation axis: change `transform-origin: 50% 66%` in
 *    flyer.style.cssText. Adjust the 66% if it wobbles up/down.
 * 2. Flight path vertical alignment: change `flyerHeight * 0.66` in topPos.
 *    The multiplier MUST match the Y % of transform-origin above.
 * 3. Spin count and direction: change SPIN_DEGREES below. Negative is
 *    counter-clockwise. 1080 = 3 full spins.
 *
 * Effect id: "eject".
 */
(function() {
	"use strict";

	const FLYER_FONT_SIZE_REM = 3.2;
	const ANIMATION_MS = 4000;
	const SPIN_DEGREES = -1080; // 3 full counter-clockwise rotations
	const SVG_FILTER_ID = "cast-among-inset";

	// Body markup for the crewmate. CSS in css/effects/eject.css under
	// `.cast-among-*` selectors handles all the styling and the SVG filter
	// `url(#cast-among-inset)` injected below.
	const AMONG_US_BOI_HTML = ''
		+ '<div class="cast-among-leg cast-among-leg--right"></div>'
		+ '<div class="cast-among-leg cast-among-leg--left cast-among-leg--back"></div>'
		+ '<div class="cast-among-backpack"></div>'
		+ '<div class="cast-among-belly"></div>'
		+ '<div class="cast-among-eye"></div>'
		+ '<div class="cast-among-leg cast-among-leg--left cast-among-leg--front"></div>';

	// One-shot, idempotent: inject the SVG filter used by the crewmate legs.
	// SUBTLE: we guard twice - first via the module-scoped flag (fast path
	// after first cast), then via a DOM lookup. The DOM lookup is NOT
	// redundant: during dev hot-reload, navigation between sub-pages that
	// re-execute this script, or when the engine loader is re-imported, the
	// flag resets to `false` but the <svg> filter is still in <body> from
	// the previous load. Without the getElementById check we'd append a
	// duplicate filter with the same id every reload, which is invalid
	// markup and can confuse Chrome's filter cache (the legs occasionally
	// render with no outline).
	let svgFilterInjected = false;
	function ensureSvgFilter() {
		if(svgFilterInjected) return;
		if(document.getElementById(SVG_FILTER_ID)) {
			svgFilterInjected = true;
			return;
		}
		const SVG_NS = "http://www.w3.org/2000/svg";
		const svg = document.createElementNS(SVG_NS, "svg");
		svg.setAttribute("width", "0");
		svg.setAttribute("height", "0");
		svg.setAttribute("aria-hidden", "true");
		svg.setAttribute("focusable", "false");
		svg.style.position = "absolute";
		svg.innerHTML = ''
			+ '<filter id="' + SVG_FILTER_ID + '" x="-50%" y="-50%" width="200%" height="200%">'
			+   '<feFlood flood-color="black" result="outside-color"/>'
			+   '<feMorphology in="SourceAlpha" operator="dilate" radius="2.5"/>'
			+   '<feComposite in="outside-color" operator="in" result="outside-stroke"/>'
			+   '<feFlood flood-color="#C51111" result="inside-color"/>'
			+   '<feComposite in2="SourceAlpha" operator="in" result="inside-stroke"/>'
			+   '<feMerge>'
			+     '<feMergeNode in="outside-stroke"/>'
			+     '<feMergeNode in="inside-stroke"/>'
			+   '</feMerge>'
			+ '</filter>';
		document.body.appendChild(svg);
		svgFilterInjected = true;
	}

	window.CastEffectEngine.registerEffect({
		id: "eject",
		name: "Among Us Eject",
		description: "Crewmate flies horizontally across the screen, spinning",
		async cast(target) {
			ensureSvgFilter();

			const rect = target.getBoundingClientRect();
			const scrollY = window.scrollY !== undefined ? window.scrollY : window.pageYOffset;
			const yCenter = rect.top + scrollY + rect.height / 2;

			// Outer container: linear horizontal travel only.
			const container = document.createElement("div");
			container.style.cssText = ''
				+ 'position:absolute;'
				+ 'left:0px;'
				+ 'pointer-events:none;'
				+ 'z-index:9999;'
				+ 'will-change:transform;';

			// Inner flyer: pure rotation around its visual center.
			const flyer = document.createElement("div");
			flyer.className = "cast-among-boi";
			flyer.innerHTML = AMONG_US_BOI_HTML;
			flyer.style.cssText = ''
				+ 'display:block;'
				+ 'margin:0;'
				+ 'padding:0;'
				+ 'font-size:' + FLYER_FONT_SIZE_REM + 'rem;'
				+ 'will-change:transform;'
				+ 'transform-origin:50% 66%;';
			container.appendChild(flyer);
			document.body.appendChild(container);

			// Measure rendered height to align rotation axis with the
			// target text center. The 0.66 multiplier MUST match the
			// transform-origin Y % above, else the flyer wobbles vertically.
			const flyerHeight = flyer.offsetHeight;
			const topPos = yCenter - flyerHeight * 0.66;
			container.style.top = `${topPos}px`;

			// SUBTLE: the offscreen margin is NOT arbitrary. The flyer's
			// bounding box is 2.5em × 3.5em (~50px × 70px at 3.2rem) but
			// during rotation its visual diagonal extends to ~sqrt(50² +
			// 70²) ≈ 86px from the centre, so the corners poke out well
			// beyond the static box. A margin smaller than ~150px causes
			// the crewmate to visibly "pop in" mid-air at the edge of the
			// viewport instead of drifting in from outer space. 180px
			// covers the diagonal plus the backpack offset (~12px) on the
			// worst rotation angle with safety headroom.
			const startX = -180;
			const endX = window.innerWidth + 180;
			const totalDist = endX - startX;
			const startTime = performance.now();

			await new Promise((resolve) => {
				function animate(now) {
					const elapsed = now - startTime;
					const t = Math.min(elapsed / ANIMATION_MS, 1);

					// Constant horizontal velocity (linear) for outer-space drift.
					const x = startX + t * totalDist;
					container.style.transform = `translate3d(${x}px, 0, 0)`;

					// Continuous counter-clockwise rotation.
					const rotation = t * SPIN_DEGREES;
					flyer.style.transform = `rotate(${rotation}deg)`;

					if(t < 1) {
						requestAnimationFrame(animate);
					} else {
						container.remove();
						resolve();
					}
				}
				requestAnimationFrame(animate);
			});

			// Tell integrations that the effect has finished with the current
			// content, even though the target itself was left untouched.
			return { clearedText: true };
		}
	});
})();
