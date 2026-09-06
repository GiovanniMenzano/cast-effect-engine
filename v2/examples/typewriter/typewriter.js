/**
 * TypeWriter - small typing animation with support for custom tokens.
 *
 * What it does:
 *   - tokenize a raw string into renderable tokens (chars, emoji, {br},
 *     {w1000}, {effect:id})
 *   - type tokens one by one with jittered character interval
 *   - delete tokens one by one (or select-and-clear) after writing a message
 *   - delegate visual effects to an injected runner
 *
 * Visual effects are NOT defined here. Any token using the {effect:id}
 * namespace is forwarded to the runner supplied by the caller, so this
 * class neither imports nor accesses a specific effect engine.
 *
 * This class has some built-in token handlers, but only the text-formatting ones:
 *   - {br}     -> inserts a <br> in the rendered output
 *   - {wNNN}   -> pauses typing for NNN milliseconds
 *
 * Effect ids are read directly from their token. Adding an effect does not
 * require registering another handler in this file.
 */
(function() {
	"use strict";

class TypeWriter {

	constructor({
		element,
		alternateMessages,
		primaryMessage,
		charInterval = 50,
		charIntervalRange = 20,
		displayDuration = 3000,
		emptyPauseDuration = 1000,
		runEffect = null
	}) {

		this.element = element;
		this.runEffect = runEffect;
		this.charInterval = charInterval;
		// Char interval is jittered in the range [charInterval - charIntervalRange, charInterval + charIntervalRange].
		this.charIntervalRange = charIntervalRange;
		// Time the message stays on screen before delete.
		this.displayDuration = parseInt(displayDuration, 10);
		// Time to pause on an empty screen (blinking cursor) after a clearing effect completes.
		this.emptyPauseDuration = parseInt(emptyPauseDuration, 10);

		// Select and tokenize one temporary alternative to the primary message.
		this.alternateMessageTokens = TypeWriter.tokenize(pickRandom(alternateMessages));

		// Use the visible HTML content so the primary message also works
		// without JavaScript or when the config request fails.
		const initialMessage = element && element.textContent.trim();
		this.primaryMessage = primaryMessage || initialMessage || "";

		// Keep the visible HTML fallback in place on first paint. Mirroring it in the
		// token buffer lets the regular delete animation act on the same text later.
		this.renderedTokens = initialMessage ? Array.from(initialMessage) : [];
		if (!initialMessage) this.element.innerHTML = "";
		// Persistent effects can each return a cleanup function. They stay active
		// through deletion and are cleaned in reverse order before the primary message.
		this._pendingCleanups = [];

	}

	async startAfter(delayMs) {
		await sleep(delayMs);
		await this.start();
	}

	async start() {

		// The fallback is already visible on first paint. Let it be
		// read before temporarily replacing it with one random message.
		if (this.renderedTokens.length > 0) {
			await this.pauseAndClear();
		}

		// Type the random line and preserve all of its existing token effects.
		await this.typeTokens(this.alternateMessageTokens);

		// Effects such as snap, eject, meltdown and faderain can clear the line
		// themselves; in that case only keep a short visual pause.
		if (this.renderedTokens.length > 0) {
			await this.pauseAndClear();
		} else {
			await sleep(this.emptyPauseDuration);
		}

		// Remove any persistent state left by effects in the alternate message.
		await this.runPendingCleanups();

		// Restore the primary message.
		await this.typeString(this.primaryMessage);

	}

	async pauseAndClear() {
		await sleep(this.displayDuration);

		if (Math.random() < 0.5) {
			// Select-and-clear path: highlight the line, wait briefly, wipe in one frame.
			this.element.classList.add("text--selected");
			await sleep(this.displayDuration / 3);
			this.clear();
			this.element.classList.remove("text--selected");
			return;
		}

		// Token-by-token deletion path: pop one rendered token per tick.
		while (this.renderedTokens.length > 0) {
			await sleep(this.charInterval / 2);
			this.delete();
		}
	}

	async typeString(rawString) {
		await this.typeTokens(TypeWriter.tokenize(rawString));
	}

	async typeTokens(tokens) {

		const ctx = { typewriter: this, sleep };

		for (const token of tokens) {

			const handler = TypeWriter._resolveHandler(token);

			if (handler === null) {
				// Plain character or emoji code-point.
				await sleep(Math.max(0, randomBetween(this.charInterval - this.charIntervalRange, this.charInterval + this.charIntervalRange)));
				this.write(token);
			} else if (handler.visible) {
				// Functional token that produces visible output (e.g. {br} -> "<br>").
				await sleep(Math.max(0, randomBetween(this.charInterval - this.charIntervalRange, this.charInterval + this.charIntervalRange)));
				this.write(handler.render(ctx, handler.arg));
			} else {
				// Functional token with side-effect only (e.g. {w1000} or {effect:snap}).
				await handler.run(ctx, handler.arg);
			}

		}

	}

	async executeEffect(effectId) {
		if (typeof this.runEffect !== "function") {
			console.warn(`[TypeWriter] No effect runner configured, skipping "${effectId}"`);
			return;
		}

		const result = (await this.runEffect(effectId, this.element)) || {};
		if (typeof result.cleanup === "function") {
			this._pendingCleanups.push(result.cleanup);
		}
		if (result.clearedText) {
			this.clear();
		}
	}

	async runPendingCleanups() {
		while (this._pendingCleanups.length > 0) {
			const cleanup = this._pendingCleanups.pop();
			try {
				await cleanup();
			} catch (err) {
				console.error("[TypeWriter] Effect cleanup failed", err);
			}
		}
	}

	write(visibleString) {
		this.renderedTokens.push(visibleString);
		this.render();
	}

	delete() {
		this.renderedTokens.pop();
		this.render();
	}

	clear() {
		this.renderedTokens = [];
		this.render();
	}

	render() {
		this.element.innerHTML = this.renderedTokens.join("");
	}

	// Split a raw string into renderable tokens:
	//   - "{wNNN}" -> wait handler (e.g. {w1000})
	//   - "{name}" -> named functional token (e.g. {br})
	//   - "{effect:id}" -> delegates an effect id to the injected runner
	//                      (ids accept ASCII letters, digits, hyphens and underscores)
	//   - Support backslash escapes like \{ and \} for literal braces.
	//   - Any single character (including emoji code-points) -> plain char token
	static tokenize(string) {
		const rawTokens = string.match(/\\.|\{[a-zA-Z0-9:_-]+\}|./gsu) || [];
		const tokens = [];

		for (const rawToken of rawTokens) {
			if (rawToken.startsWith("\\")) {
				// Strip backslash escape
				tokens.push(rawToken.slice(1));
			} else if (rawToken.startsWith("{") && rawToken.endsWith("}")) {
				const tail = rawToken.slice(1, -1);
				const effectId = tail.startsWith("effect:") ? tail.slice("effect:".length) : "";
				const isEffect = effectId.length > 0 && /^[a-zA-Z0-9_-]+$/.test(effectId);
				const isValid = (tail.length > 1 && tail[0] === "w" && /^\d+$/.test(tail.slice(1))) ||
				                isEffect || (tail in TypeWriter.tokenHandlers);
				if (isValid) {
					tokens.push(rawToken);
				} else {
					// Fallback: split unrecognized brace block into individual character tokens
					tokens.push(...rawToken.split(""));
				}
			} else {
				tokens.push(rawToken);
			}
		}

		return tokens;
	}

	// Resolve a token to a functional handler, or return null for plain chars.
	// Handlers live in TypeWriter.tokenHandlers, easy to extend at runtime.
	static _resolveHandler(token) {

		if (token.length < 3 || token[0] !== "{" || token[token.length - 1] !== "}") return null;

		const tail = token.slice(1, -1);

		// "{w1000}" format: explicit wait prefix.
		if (tail.length > 1 && tail[0] === "w" && /^\d+$/.test(tail.slice(1))) {
			const handler = TypeWriter.tokenHandlers["wait"];
			return { visible: false, render: null, run: handler.run, arg: tail.slice(1) };
		}

		// "{effect:id}" delegates the id without knowing which effects exist.
		if (tail.startsWith("effect:")) {
			const effectId = tail.slice("effect:".length);
			return {
				visible: false,
				render: null,
				run: (ctx, id) => ctx.typewriter.executeEffect(id),
				arg: effectId
			};
		}

		// Named built-in token (e.g. {br}).
		const handler = TypeWriter.tokenHandlers[tail];
		if (!handler) {
			console.warn(`[TypeWriter] Unknown functional token: ${token}`);
			return null;
		}

		return { visible: handler.visible, render: handler.render, run: handler.run, arg: null };

	}

}

// Built-in token handlers: text-formatting concerns only. Visual effects
// use the generic {effect:id} namespace and an injected runner.
TypeWriter.tokenHandlers = {
	// "{br}" inserts a line break in the current line.
	br: { visible: true, render: () => "<br>" },
	// "{wNNN}" pauses typing for N milliseconds.
	wait: { visible: false, run: (ctx, arg) => ctx.sleep(parseInt(arg, 10)) }
};

function sleep(ms) {
	return new Promise(resolve => setTimeout(resolve, ms));
}

// Inclusive integer in [min, max]. If sleep() is called with a negative value the browser clamps to 0.
function randomBetween(min, max) {
	return Math.floor(Math.random() * (max - min + 1)) + min;
}

function pickRandom(array) {
	return array[Math.floor(Math.random() * array.length)];
}


window.TypeWriter = TypeWriter;
})();
