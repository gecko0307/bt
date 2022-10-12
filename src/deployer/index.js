const fs = require("fs-extra");
const path = require("path");
const Git = require("simple-git");
const inquirer = require("inquirer");
const { fillMissing } = require("object-fill-missing-keys");
const parseBranch = require("./parseBranch");

const cwd = process.cwd();

function branchBaseName(branchName) {
    const levels = branchName.split("/");
    return levels[levels.length - 1];
}

function requireUncached(module) {
    delete require.cache[require.resolve(module)];
    return require(module);
}

const configDefault = {
    brand: "",
    campaign: ""
};

async function deployConfig(deployConfigPath) {
    let config = {};
    if (await fs.pathExists(deployConfigPath)) {
        config = requireUncached(deployConfigPath) || {};
    }
    config = fillMissing(config, configDefault);
    return config;
}

async function deploy(options = { branch: "" }) {
    const deployConfigPath = path.resolve("./builder.config.json");
    const config = deployConfig(deployConfigPath);
    
    const repoDir = ".deploy/repo";
    const sshKey = path.resolve(".deploy/ssh/id_rsa");
    
    if (!await fs.exists(".deploy")) {
        await fs.mkdir(".deploy");
        await fs.mkdir(repoDir);
    }
    
    const git = Git(path.resolve(repoDir));
    git.outputHandler(function(command, stdout, stderr) {
        //stdout.pipe(process.stdout);
        stderr.pipe(process.stderr);
    });
    
    if (await git.checkIsRepo()) {
        console.log("Fetching remote changes...");
        await git.raw(["fetch", "origin", "-p"]);
    }
    else {
        const answers = await inquirer.prompt([
            { name: "address", message: "Repository URL:" },
            { name: "brand", message: "Brand:" },
            { name: "campaign", message: "Campaign:" }
        ]);
        
        config.address = answers.address;
        config.brand = answers.brand;
        config.campaign = answers.campaign;
        
        await fs.writeJSON(deployConfigPath, config, { spaces: "\t" });
        
        // TODO: SSH path from config
        //const sshCommand = `ssh -o StrictHostKeyChecking=no -i ${sshKey}`;
        //await git.env("GIT_SSH_COMMAND", sshCommand);
        
        const address = answers.address;
        console.log(`Cloning ${address} to ${repoDir}...`);
        await git.clone(address, "./", ["--progress"]);
    }
    
    const remoteBranches = (await git.branch()).branches;
    const keys = Object.keys(remoteBranches);
    let branches = [];
    for (const name of keys) {
        if (name.startsWith("remotes/origin"))
            branches.push(branchBaseName(name));
    }
    
    let branch;
    if (options.branch.length > 0 && branches.includes(options.branch)) {
        branch = options.branch;
    }
    else
    {
        const answers = await inquirer.prompt([{
            type: "list",
            name: "branch",
            message: "Choose a branch to build",
            choices: branches,
        }]);
        branch = answers.branch;
    }
    
    const branchData = parseBranch(branch);
    
    if (options.buildFunc) {
        console.log(`Building branch ${branch}...`);
        
        // TODO: create creative folder
        if (!await fs.exists(branch))
            await fs.mkdir(branch);
        
        if (!await fs.exists("dist"))
            await fs.mkdir("dist");
        
        await git.raw(["checkout", "-f", "-B", branch, "origin/" + branch]);
        const buildOptions = {
            root: `./.deploy/repo`,
            buildPath: branch,
            distPath: "dist",
            brand: config.brand,
            campaign: config.campaign,
            creative: branchData.creative,
            platform: branchData.platform,
            version: branchData.version
        };
        await options.buildFunc(buildOptions);
    }
    else {
        console.log("Error: no buildFunc provided");
    }
}

module.exports = deploy;
