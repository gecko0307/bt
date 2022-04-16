import svelte from "rollup-plugin-svelte";
import resolve from "@rollup/plugin-node-resolve";

process.chdir(__dirname);

const production = !process.env.ROLLUP_WATCH;

export default {
	input: "src/main.js",
	output: {
		sourcemap: true,
		format: "iife",
		name: "app",
		file: "public/bundle.js"
	},
	plugins: [
		svelte({
			dev: !production,
			css: css => {
				css.write("public/bundle.css");
			}
		}),
		resolve({ browser: true })
	]
};
