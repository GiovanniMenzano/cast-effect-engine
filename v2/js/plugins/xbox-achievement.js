/**
 * Xbox Achievement - self-contained Xbox-style notification plugin.
 *
 * Type "xbox" to trigger the achievement banner.
 * Manual triggers may override name, header, score and width.
 * This plugin handles everything internally: template injection, animation,
 * sound playback, and single-flight guard (no overlapping banners).
 *
 * Original animation credits: Codepen "Xbox One Achievement in CSS
 * (Regular and Rare)" by Adam Cosman.
 */
(function() {
	"use strict";

	const ANIMATION_DURATION_MS = 12000;
	const ASSET_BASE = new URL("../../assets/", document.currentScript.src);
	const assetUrl = (path) => new URL(path, ASSET_BASE).href;
	const SOUND_RARE = assetUrl("audio/xbox_achievement_rare.mp3");
	const TROPHY_FULL = assetUrl("img/xbox_achievement_trophy_full.svg");
	const TROPHY_NO_HANDLES = assetUrl("img/xbox_achievement_trophy_no_handles.svg");
	const XBOX_LOGO = assetUrl("img/xbox_achievement_logo.svg");
	const GAMERSCORE_ICON = assetUrl("img/xbox_achievement_g.svg");
	const DEFAULT_TEXTS = {
		it: {
			name: "Easter egg trovato",
			header: "Obiettivo raro sbloccato"
		},
		en: {
			name: "Easter egg found",
			header: "Rare achievement unlocked"
		}
	};

	let mounted = false;
	let isRunning = false;

	function mount() {
		if(mounted) return;
		document.body.insertAdjacentHTML("afterbegin", `
			<div class="achievement-notification">
				<div class="achievement--wrapper">
					<div class="achievement__circle">
						<div class="img trophy_animate achievement__circle__trophy">
							<img class="trophy_1" src="${TROPHY_FULL}"/>
							<img class="trophy_2" src="${TROPHY_NO_HANDLES}"/>
						</div>
						<div class="img achievement__circle__xbox">
							<img src="${XBOX_LOGO}"/>
						</div>
						<div class="achievement__circle__diamond--wrapper">
							<div class="diamond"></div>
						</div>
					</div>
					<div class="achievement__banner--wrapper">
						<div class="achievement__banner">
							<div class="achievement__banner__text">
								<span class="achievement__heander"></span>
								<div class="achievement__description">
									<div class="achievement__description__gamerscore--wrapper">
										<img width="20px" src="${GAMERSCORE_ICON}"/>
										<span class="achievement__description__gamerscore"></span>
									</div>
									<span class="achievement__description__separator">-</span>
									<span class="achievement__description__name"></span>
								</div>
							</div>
						</div>
					</div>
				</div>
			</div>
		`);
		mounted = true;
	}

	function showAchievement(ctx, options) {
		if(isRunning) return;
		isRunning = true;
		const language = document.documentElement.lang.split("-")[0];
		const texts = DEFAULT_TEXTS[language] || DEFAULT_TEXTS.en;
		const achievement = Object.assign({
			score: "117",
			wide: false
		}, texts, options);

		mount();

		const nameEl = document.querySelector(".achievement__description__name");
		const scoreEl = document.querySelector(".achievement__description__gamerscore");
		const headerEl = document.querySelector(".achievement__heander");
		const rootEl = document.querySelector(".achievement-notification");
		if(!nameEl || !scoreEl || !headerEl || !rootEl) {
			isRunning = false;
			return;
		}

		nameEl.innerText = achievement.name;
		scoreEl.innerText = achievement.score;
		headerEl.innerText = achievement.header;
		rootEl.classList.toggle("achievement-notification--wide", achievement.wide);

		ctx.sound.play(SOUND_RARE);
		rootEl.classList.add("achievement-rare");

		const circle = document.querySelector(".achievement__circle");
		const banner = document.querySelector(".achievement__banner");
		const text = document.querySelector(".achievement__banner__text");
		circle && circle.classList.add("circle--animate");
		banner && banner.classList.add("banner--animate");
		text && text.classList.add("text--animate");

		setTimeout(() => {
			circle && circle.classList.remove("circle--animate");
			banner && banner.classList.remove("banner--animate");
			text && text.classList.remove("text--animate");
			rootEl.classList.remove("achievement-rare");
			rootEl.classList.remove("achievement-notification--wide");
			isRunning = false;
		}, ANIMATION_DURATION_MS);
	}

	window.CastEffectEngine.registerPlugin({
		id: "xbox-achievement",
		name: "Xbox Achievement",
		description: "Type 'xbox' to score a real-deal Xbox achievement",
		trigger: {
			type: "keyboard",
			sequence: ["x", "b", "o", "x"]
		},
		action(ctx, options) {
			showAchievement(ctx, options);
		}
	});
})();
