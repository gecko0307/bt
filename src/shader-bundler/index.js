const fs = require("fs-extra");  
const path = require("path");
const unixify = require("unixify");
const glob = require("glob-promise");

function requireUncached(module) {
    delete require.cache[require.resolve(module)];
    return require(module);
}

const shadersPath = path.resolve("./Shaders");
const shadersStringsScriptPath = path.resolve("./HTML/shader_strings.js");

async function inputFiles() {
    const pattern = `${unixify(shadersPath)}/**/*.glsl`;
    const files = await glob.promise(pattern);
    let shaderFiles = [];
    for (const shaderPath of files) {
        const shaderFilename = path.basename(shaderPath);
        shaderFiles.push(shaderFilename);
    }
    return shaderFiles;
}

async function init() {
    await bundleShaders();
}

async function update() {
    await bundleShaders();
}

function compressShader(code) {
    // From rollup-plugin-glslify
    let needNewline = false;
    return code.replace(/\\(?:\r\n|\n\r|\n|\r)|\/\*.*?\*\/|\/\/(?:\\(?:\r\n|\n\r|\n|\r)|[^\n\r])*/gs, '').split(/\n+/).reduce((result, line) => {
        line = line.trim().replace(/\s{2,}|\t/, ' '); // lgtm[js/incomplete-sanitization]
        if (line.charAt(0) === '#') {
            if (needNewline) {
                result.push('\n');
            }
            result.push(line, '\n');
            needNewline = false;
        } else {
            result.push(line.replace(/\s*({|}|=|\*|,|\+|\/|>|<|&|\||\[|\]|\(|\)|-|!|;)\s*/g, '$1'));
            needNewline = true;
        }
        return result;
    }, []).join('').replace(/\n+/g, '\n');
}

async function bundleShaders() {
    const shaderStrings = {};
    
    const shaderFiles = await inputFiles();
    for (const shaderFile of shaderFiles) {
        const content = await fs.readFile(path.join(shadersPath, shaderFile), "utf8");
        const name = shaderFile.split(".")[0];
        // TODO: use shader_minifier if available
        shaderStrings[name] = compressShader(content);
    }
    
    const output = JSON.stringify(shaderStrings);
    const script = `var shaderStrings = ${output};`;
    
    await fs.writeFile(shadersStringsScriptPath, script);
}

module.exports = {
    init,
    update
};
