const chalk = require("chalk");

class Logger {
    constructor(options = {}) {
        this.infoMessages = [];
        this.warningMessages = [];
        this.errorMessages = [];
        this.options = options || {};
    }

    info() {
        const output = Array.from(arguments).join(" ");
        if (this.options.printInfo === true) console.log(output);
        this.infoMessages.push({ output, timestamp: new Date() });
    }

    warn() {
        const output = Array.from(arguments).join(" ");
        if (this.options.printWarnings === true) console.log(chalk.redBright(output));
        this.warningMessages.push({ output, timestamp: new Date() });
    }

    error() {
        const output = Array.from(arguments).join(" ");
        if (this.options.printErrors === true) console.log(chalk.redBright(output));
        this.errorMessages.push({ output, timestamp: new Date() });
    }

    printInfoMessages() {
        for(const info of this.infoMessages) {
            console.log(info.output);
        }
    }

    printWarningMessages() {
        for(const w of this.warningMessages) {
            console.log(chalk.redBright(w.output));
        }
    }

    printErrorMessages() {
        for(const err of this.errorMessages) {
            console.log(chalk.redBright(err.output));
        }
    }

    clear() {
        this.infoMessages = [];
        this.warningMessages = [];
        this.errorMessages = [];
    }
}

function createLogger(options = {}) {
    return new Logger(options);
}

module.exports = { createLogger };