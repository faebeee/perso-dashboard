import { describe, expect, it } from "vitest";
import { failureForStatus, readJson, send } from "./failures";

const reply = (body: string, status = 200) => new Response(body, { status });

describe("LLM failures", () => {
	it("takes the error detail from the body's usual places", async () => {
		const detail = async (body: string): Promise<string> => {
			try {
				await readJson("p", "P", reply(body, 500));
				return "";
			} catch (error) {
				return (error as Error).message;
			}
		};
		expect(await detail('{"error":"plain"}')).toContain("plain");
		expect(await detail('{"error":{"message":"nested"}}')).toContain("nested");
		expect(await detail('{"message":"top"}')).toContain("top");
		expect(await detail("not json")).toContain("not json");
	});

	it("rejects an unreadable 200 answer", async () => {
		await expect(readJson("p", "P", reply("<html>"))).rejects.toMatchObject({
			message: "P sent an unreadable answer.",
		});
	});

	it("maps 401 and 403 to unauthorized", () => {
		expect(failureForStatus("p", "P", 401).error.kind).toBe("unauthorized");
		expect(failureForStatus("p", "P", 403).error.kind).toBe("unauthorized");
	});

	it("passes cancellation through and turns other errors into network", async () => {
		const abort = new DOMException("aborted", "AbortError");
		await expect(
			send("p", "offline", async () => {
				throw abort;
			}),
		).rejects.toBe(abort);
		await expect(
			send("p", "offline", async () => {
				throw new TypeError("fetch failed");
			}),
		).rejects.toMatchObject({ error: { kind: "network", message: "offline" } });
	});
});
