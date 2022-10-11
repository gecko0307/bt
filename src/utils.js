const { spawn } = require("child_process");

function execute(cmd, options, spawnOptions = {}) {
    return new Promise(function(resolve, reject) {
        const p = spawn(cmd, options, { shell: true, ...spawnOptions });
        
        p.stdout.on("data", function(data) {
            process.stdout.write(data.toString());
        });
        
        p.stderr.on("data", function(data) {
            process.stderr.write(data.toString());
        });
        
        p.on("close", function(code) {
            resolve(code);
        });
        
        p.on("error", function(err) {
            console.log(err);
            reject(err);
        });
    });
}

module.exports = { execute };
