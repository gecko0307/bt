import svelte from "rollup-plugin-svelte";
import css from "rollup-plugin-css-only";
import resolve from "@rollup/plugin-node-resolve";
//import commonjs from "@rollup/plugin-commonjs";
import { terser } from "rollup-plugin-terser";

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
			compilerOptions: {
				dev: !production
			}
		}),
		css({
			output: "bundle.css"
		}),
		resolve({
			browser: true,
			dedupe: ["svelte"]
		}),
		//commonjs(),
		production && terser()
	]
};
