import { describe, expect, it } from "vitest";
import { parseAccelerator } from "./desktop";

const key = (init: Partial<KeyboardEvent>) => ({
	key: "",
	code: "",
	ctrlKey: false,
	altKey: false,
	shiftKey: false,
	metaKey: false,
	...init,
});

describe("parseAccelerator", () => {
	const quickCapture = parseAccelerator("Control+Alt+Space");

	it("matches the exact combination", () => {
		// Option+Space types a non-breaking space on macOS; the code still matches.
		expect(
			quickCapture(
				key({ code: "Space", key: " ", ctrlKey: true, altKey: true }),
			),
		).toBe(true);
	});

	it("ignores other modifiers and keys", () => {
		expect(quickCapture(key({ code: "Space", key: " ", ctrlKey: true }))).toBe(
			false,
		);
		expect(
			quickCapture(
				key({
					code: "Space",
					key: " ",
					ctrlKey: true,
					altKey: true,
					metaKey: true,
				}),
			),
		).toBe(false);
		expect(
			quickCapture(
				key({ code: "KeyK", key: "k", ctrlKey: true, altKey: true }),
			),
		).toBe(false);
	});

	it("matches letter keys by code", () => {
		const accel = parseAccelerator("Super+Shift+K");
		expect(
			accel(key({ code: "KeyK", key: "K", metaKey: true, shiftKey: true })),
		).toBe(true);
	});
});
