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
    const config = await deployConfig(deployConfigPath);
    
    console.log(config);
    
    const repoDir = ".deploy/repo";
    
    if (!await fs.exists(".deploy")) {
        await fs.mkdir(".deploy");
        await fs.mkdir(repoDir);
    }
    
    const git = Git(path.resolve(repoDir));
    git.outputHandler(function(command, stdout, stderr) {
        //stdout.pipe(process.stdout);
        stderr.pipe(process.stderr);
    });
    
    if (config.sshKey) {
        const sshCommand = `ssh -o StrictHostKeyChecking=no -i ${config.sshKey}`;
        await git.env("GIT_SSH_COMMAND", sshCommand);
    }
    
    if (await git.checkIsRepo()) {
        console.log("Fetching remote changes...");
        await git.raw(["fetch", "origin", "-p"]);
    }
    else {
        console.log("Initializing a new repository...");
        
        if (config.address === undefined) {
            const answers = await inquirer.prompt([
                { name: "address", message: "Repository URL:" }
            ]);
            config.address = answers.address;
        }
        
        if (config.brand === undefined) {
            const answers = await inquirer.prompt([
                { name: "brand", message: "Brand:" }
            ]);
            config.brand = answers.brand;
        }
        
        if (config.campaign === undefined) {
            const answers = await inquirer.prompt([
                { name: "campaign", message: "Campaign:" }
            ]);
            config.campaign = answers.campaign;
        }
        
        await fs.writeJSON(deployConfigPath, config, { spaces: "\t" });
        
        console.log(`Cloning ${config.address} to ${repoDir}...`);
        await git.clone(config.address, "./", ["--progress"]);
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
