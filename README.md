# Cast Effect Engine

This repository contains the source code for the Cast Effect Engine, a lightweight, vanilla JavaScript library designed to add interactive visual effects and easter eggs to any website.

## Repository Structure

The repository stores the evolution of the engine across different versions:

* **v0**: The initial prototype and proof of concept.
* **v1**: The first stable release with basic effects.
* **v2**: The latest and most advanced version of the engine.

## About Version 2 (v2)

The `v2` engine is a complete rewrite focused on modularity and performance. It acts as a plug-and-play system with zero external dependencies.

Key features of v2 include:
* **Plugin Architecture**: Easily extend the engine by creating new effects without modifying the core code.
* **Event System**: A robust EventBus and InputManager handle user interactions like keyboard typing, scroll events, and idle time.
* **Built-in Effects**: Comes with ready-to-use plugins like the Konami Code, Matrix digital rain, CSS barrel rolls, screen glitches, and a Blue Screen of Death.
* **Safe Styling**: All CSS rules are safely scoped to prevent collisions with your website's existing styles.

## How to use

If you want to use the engine, navigate to the `v2` directory. You will find a dedicated README with simple installation instructions and a guide on how to create custom plugins.
