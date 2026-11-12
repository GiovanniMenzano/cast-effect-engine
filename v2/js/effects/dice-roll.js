/**
 * Dice Roll - two CSS dice tumble in, settle, then fade away.
 * The final pair deliberately never totals five or eight.
 *
 * Effect id: "dice-roll".
 */
(function() {
	"use strict";

	const EFFECT_MS = 4300;
	const ROLL_MS = 2500;
	const VIEWPORT_MARGIN = 8;
	const PLACEMENT_GAP = 4;
	const MIN_DIE_SIZE = 38;
	const MAX_PLACEMENT_SHRINK = 12;
	const START_DROP = 30;
	const REBOUND_RISE = 18;
	const PIPS = {
		1: [5],
		2: [1, 9],
		3: [1, 5, 9],
		4: [1, 3, 7, 9],
		5: [1, 3, 5, 7, 9],
		6: [1, 3, 4, 6, 7, 9]
	};
	const FACE_ROTATIONS = {
		1: { x: 0, y: 0 },
		2: { x: -90, y: 0 },
		3: { x: 0, y: -90 },
		4: { x: 0, y: 90 },
		5: { x: 90, y: 0 },
		6: { x: 0, y: 180 }
	};
	const VALID_RESULTS = [];

	for(let first = 1; first <= 6; first += 1) {
		for(let second = 1; second <= 6; second += 1) {
			const total = first + second;
			if(total !== 5 && total !== 8) VALID_RESULTS.push([first, second]);
		}
	}

	function clamp(min, value, max) {
		return Math.min(Math.max(value, min), max);
	}

	function waitFor(animation) {
		return animation.finished.catch(function() {});
	}

	function pickResult() {
		return VALID_RESULTS[Math.floor(Math.random() * VALID_RESULTS.length)];
	}

	function getVisibleRect(element) {
		if(!element) return null;
		const style = window.getComputedStyle(element);
		if(style.display === "none" || style.visibility === "hidden") return null;
		const rect = element.getBoundingClientRect();
		if(rect.width <= 0 || rect.height <= 0) return null;
		return rect;
	}

	function findFollowingElement(target) {
		const context = target.closest("section, article, main");
		let current = target;

		while(current && current !== context) {
			let element = current.nextElementSibling;
			while(element) {
				if(getVisibleRect(element)) return element;
				element = element.nextElementSibling;
			}
			current = current.parentElement;
		}
		return null;
	}

	function findFreeRanges(stage, ignoredElement, zoneTop, zoneBottom, left, right, extraElements) {
		const occupied = [];
		const interactiveSelector = "a[href], button, input, textarea, select, [tabindex]";
		const candidates = Array.from(document.querySelectorAll(interactiveSelector));
		(extraElements || []).forEach(function(element) {
			if(element && !candidates.includes(element)) candidates.push(element);
		});

		candidates.forEach(function(element) {
			if(stage.contains(element) || (ignoredElement && ignoredElement.contains(element))) return;
			const rect = getVisibleRect(element);
			if(!rect || rect.right <= left || rect.left >= right) return;
			if(rect.bottom <= zoneTop || rect.top >= zoneBottom) return;
			occupied.push({
				top: Math.max(zoneTop, rect.top - PLACEMENT_GAP),
				bottom: Math.min(zoneBottom, rect.bottom + PLACEMENT_GAP)
			});
		});

		occupied.sort(function(a, b) { return a.top - b.top; });
		const free = [];
		let cursor = zoneTop;

		occupied.forEach(function(interval) {
			if(interval.top > cursor) free.push({ top: cursor, bottom: interval.top });
			cursor = Math.max(cursor, interval.bottom);
		});
		if(cursor < zoneBottom) free.push({ top: cursor, bottom: zoneBottom });
		return free;
	}

	function fitGroupInRange(group, range, viewportWidth) {
		const rangeHeight = range.bottom - range.top;
		if(rangeHeight < MIN_DIE_SIZE) return null;

		let groupHeight = group.offsetHeight;
		let dieSize = Math.min(groupHeight, Math.floor(rangeHeight));
		const availableTravel = rangeHeight - dieSize;
		const missingTravel = START_DROP + REBOUND_RISE - availableTravel;

		if(missingTravel > 0) {
			dieSize = Math.max(
				MIN_DIE_SIZE,
				dieSize - Math.min(MAX_PLACEMENT_SHRINK, missingTravel)
			);
		}

		if(dieSize !== groupHeight) {
			group.style.setProperty("--cast-die-size", `${dieSize}px`);
		}

		const groupWidth = group.offsetWidth;
		groupHeight = group.offsetHeight;
		const movementRoom = Math.max(0, rangeHeight - groupHeight);
		const movementScale = Math.min(1, movementRoom / (START_DROP + REBOUND_RISE));
		const startDrop = START_DROP * movementScale;
		const reboundRise = REBOUND_RISE * movementScale;
		const unusedRoom = movementRoom - startDrop - reboundRise;
		const left = clamp(
			VIEWPORT_MARGIN,
			viewportWidth / 2 - groupWidth / 2,
			viewportWidth - groupWidth - VIEWPORT_MARGIN
		);
		const top = range.top + Math.max(0, unusedRoom / 2) + reboundRise;

		return { left, top, movementScale };
	}

	function positionGroup(group, stage, target) {
		const targetRect = target.getBoundingClientRect();
		const viewportWidth = document.documentElement.clientWidth;
		const viewportHeight = window.innerHeight;

		if(window.matchMedia("(max-width: 768px)").matches) {
			const groupWidth = group.offsetWidth;
			const groupHeight = group.offsetHeight;
			group.style.left = `${clamp(
				VIEWPORT_MARGIN,
				targetRect.left + targetRect.width / 2 - groupWidth / 2,
				viewportWidth - groupWidth - VIEWPORT_MARGIN
			)}px`;
			group.style.top = `${clamp(
				VIEWPORT_MARGIN,
				targetRect.top + targetRect.height / 2 - groupHeight / 2,
				viewportHeight - groupHeight - VIEWPORT_MARGIN
			)}px`;
			return 1;
		}

		const followingElement = findFollowingElement(target);
		const followingRect = getVisibleRect(followingElement);
		const contextRect = getVisibleRect(target.closest("section, article, main"));
		const lowerBoundary = Math.min(
			viewportHeight - VIEWPORT_MARGIN,
			contextRect ? contextRect.bottom - VIEWPORT_MARGIN : viewportHeight - VIEWPORT_MARGIN
		);

		let groupWidth = group.offsetWidth;
		let groupHeight = group.offsetHeight;
		let left = clamp(
			VIEWPORT_MARGIN,
			viewportWidth / 2 - groupWidth / 2,
			viewportWidth - groupWidth - VIEWPORT_MARGIN
		);
		let placement = null;

		if(followingRect) {
			const zoneTop = followingRect.bottom + PLACEMENT_GAP;
			if(lowerBoundary > zoneTop) {
				const ranges = findFreeRanges(
					stage,
					followingElement,
					zoneTop,
					lowerBoundary,
					left,
					left + groupWidth
				);
				// Prefer the first lane after the surrounding content. If a lower
				// control splits the area (for example a scroll affordance), do not
				// jump below it just because that second lane is larger.
				const range = ranges.length > 0 ? ranges[0] : null;
				if(range) placement = fitGroupInRange(group, range, viewportWidth);
			}
		}

		// Short viewports may not have a usable lane below the surrounding
		// content. Keep the fallback close to the sentence, but above it and
		// slightly smaller so it cannot cover the following controls.
		if(placement === null) {
			const fallbackSize = Math.max(MIN_DIE_SIZE, Math.floor(groupHeight * 0.84));
			group.style.setProperty("--cast-die-size", `${fallbackSize}px`);
			groupWidth = group.offsetWidth;
			groupHeight = group.offsetHeight;
			left = clamp(
				VIEWPORT_MARGIN,
				viewportWidth / 2 - groupWidth / 2,
				viewportWidth - groupWidth - VIEWPORT_MARGIN
			);
			const upperObstacles = [];
			let previousElement = target.previousElementSibling;
			while(previousElement) {
				upperObstacles.push(previousElement);
				previousElement = previousElement.previousElementSibling;
			}
			const context = target.closest("section, article, main");
			if(context) {
				// Decorative canvas and SVG layers often extend beyond the content
				// they embellish, so only tangible media reserve placement space.
				context.querySelectorAll("img, video").forEach(function(element) {
					upperObstacles.push(element);
				});
			}

			const upperRanges = findFreeRanges(
				stage,
				null,
				VIEWPORT_MARGIN,
				Math.max(VIEWPORT_MARGIN, targetRect.top - PLACEMENT_GAP),
				left,
				left + groupWidth,
				upperObstacles
			);
			const upperRange = upperRanges.reduce(function(best, item) {
				if(item.bottom - item.top < MIN_DIE_SIZE) return best;
				return !best || item.bottom - item.top > best.bottom - best.top ? item : best;
			}, null);
			placement = upperRange
				? fitGroupInRange(group, upperRange, viewportWidth)
				: null;
			if(!placement) {
				placement = {
					left,
					top: clamp(
						VIEWPORT_MARGIN,
						targetRect.top - groupHeight - 18,
						viewportHeight - groupHeight - VIEWPORT_MARGIN
					),
					movementScale: 0
				};
			}
		}

		group.style.left = `${placement.left}px`;
		group.style.top = `${placement.top}px`;
		return placement.movementScale;
	}

	function createFace(value) {
		const face = document.createElement("div");
		face.className = `cast-die__face cast-die__face--${value}`;

		PIPS[value].forEach(function(position) {
			const pip = document.createElement("i");
			pip.className = "cast-die__pip";
			pip.style.gridArea = `${Math.ceil(position / 3)} / ${((position - 1) % 3) + 1}`;
			face.appendChild(pip);
		});

		return face;
	}

	function createDie() {
		const slot = document.createElement("div");
		slot.className = "cast-die-slot";
		const die = document.createElement("div");
		die.className = "cast-die";
		for(let value = 1; value <= 6; value += 1) die.appendChild(createFace(value));
		slot.appendChild(die);
		return { slot, die };
	}

	function animateDie(die, value, index) {
		const finalRotation = FACE_ROTATIONS[value];
		const direction = index === 0 ? 1 : -1;
		const startRotation = {
			x: direction * -20,
			y: direction * 16,
			z: direction * -7
		};
		const endRotation = {
			x: direction * 720 + finalRotation.x,
			y: direction * -720 + finalRotation.y,
			z: direction * 360 + direction * -4
		};
		const rotationSteps = [
			{ offset: 0, progress: 0 },
			{ offset: 0.18, progress: 0.3 },
			{ offset: 0.38, progress: 0.58 },
			{ offset: 0.58, progress: 0.78 },
			{ offset: 0.72, progress: 0.9 },
			{ offset: 0.84, progress: 0.97 },
			{ offset: 0.93, progress: 0.995 },
			{ offset: 1, progress: 1 }
		];
		const keyframes = rotationSteps.map(function(step) {
			const x = startRotation.x + (endRotation.x - startRotation.x) * step.progress;
			const y = startRotation.y + (endRotation.y - startRotation.y) * step.progress;
			const z = startRotation.z + (endRotation.z - startRotation.z) * step.progress;
			return {
				transform: `rotateX(${x}deg) rotateY(${y}deg) rotateZ(${z}deg)`,
				offset: step.offset
			};
		});

		return die.animate(keyframes, {
			duration: ROLL_MS,
			delay: index * 80,
			easing: "linear",
			fill: "forwards"
		});
	}

	function animateDieMovement(slot, index, movementScale) {
		const direction = index === 0 ? -1 : 1;
		const startX = direction * 30;
		const startY = START_DROP * movementScale;
		const firstRise = REBOUND_RISE * movementScale;
		const secondRise = 7 * movementScale;
		const finalRise = 2 * movementScale;

		return slot.animate([
			{ transform: `translate3d(${startX}px, ${startY}px, 0) scale(0.82)`, offset: 0, easing: "cubic-bezier(0.2, 0.65, 0.3, 1)" },
			{ transform: `translate3d(${startX * 0.5}px, ${-firstRise}px, 0) scale(0.95)`, offset: 0.28, easing: "cubic-bezier(0.45, 0, 0.8, 0.55)" },
			{ transform: "translate3d(0, 0, 0) scale(1)", offset: 0.64, easing: "cubic-bezier(0.2, 0.7, 0.35, 1)" },
			{ transform: `translate3d(${direction * -2}px, ${-secondRise}px, 0) scale(0.985)`, offset: 0.74, easing: "cubic-bezier(0.45, 0, 0.75, 0.55)" },
			{ transform: "translate3d(0, 0, 0) scale(1)", offset: 0.85, easing: "cubic-bezier(0.2, 0.65, 0.4, 1)" },
			{ transform: `translate3d(0, ${-finalRise}px, 0) scale(0.995)`, offset: 0.91, easing: "ease-in" },
			{ transform: "translate3d(0, 0, 0) scale(1)", offset: 1 }
		], {
			duration: ROLL_MS,
			delay: index * 80,
			fill: "forwards"
		});
	}

	window.CastEffectEngine.registerEffect({
		id: "dice-roll",
		name: "Dice Roll",
		description: "Two dice roll to a result that never totals five or eight",
		async cast(target) {
			const result = pickResult();
			const stage = document.createElement("div");
			stage.className = "cast-dice-stage";
			stage.setAttribute("aria-hidden", "true");
			const group = document.createElement("div");
			group.className = "cast-dice-group";
			const dice = [createDie(), createDie()];
			dice.forEach(function(item) { group.appendChild(item.slot); });
			stage.appendChild(group);
			document.body.appendChild(stage);

			const movementScale = positionGroup(group, stage, target);

			const groupAnimation = group.animate([
				{ opacity: 0, offset: 0 },
				{ opacity: 1, offset: 0.1 },
				{ opacity: 1, offset: 0.84 },
				{ opacity: 0, offset: 1 }
			], { duration: EFFECT_MS, easing: "ease-out", fill: "forwards" });
			const dieAnimations = dice.map(function(item, index) {
				return animateDie(item.die, result[index], index);
			});
			const movementAnimations = dice.map(function(item, index) {
				return animateDieMovement(item.slot, index, movementScale);
			});

			await Promise.all(
				[waitFor(groupAnimation)]
					.concat(dieAnimations.map(waitFor))
					.concat(movementAnimations.map(waitFor))
			);
			stage.remove();
			return { skipDisplayPause: true };
		}
	});
})();
