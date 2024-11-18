import { defineConfig } from "tsup";

export default defineConfig({
	entryPoints: ["src/index.ts"],
	format: ["esm"],
	dts: true,
	outDir: "dist",
	external: ["wifi", "timer"],
	minify: true,
	clean: true,
});
