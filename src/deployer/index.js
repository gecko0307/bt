const fs = require("fs-extra");
const path = require("path");
const Git = require("simple-git");
const inquirer = require("inquirer");

const cwd = process.cwd();

function branchBaseName(branchName) {
    const levels = branchName.split("/");
    return levels[levels.length - 1];
}

async function deploy(options = { branch: "" }) {
    const config = {
        brand: "",
        campaign: ""
    };
    
    // TODO: try to read deploy.config.json

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
        //const address = "git@gitlab.com:gecko0307/otkritie-october-2022.git";
        const answers = await inquirer.prompt([
            { name: "address", message: "Repository URL:" },
            { name: "brand", message: "Brand:" },
            { name: "campaign", message: "Campaign:" }
        ]);
        
        config.address = answers.address;
        config.brand = answers.brand;
        config.campaign = answers.campaign;
        
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
    
    if (options.buildFunc) {
        console.log(`Building branch ${branch}...`);
        await git.raw(["checkout", "-f", "-B", branch, "origin/" + branch]);
        const buildOptions = {
            root: `./.deploy/repo`,
            brand: config.brand, // TODO: from config
            campaign: config.campaign, // TODO: from config
            creative: "", // TODO: from branch
            platform: "publish", // TODO: from branch
            version: "v1" // TODO: from branch
        };
        await options.buildFunc(buildOptions);
    }
    else {
        console.log("Error: no buildFunc provided");
    }
}

module.exports = deploy;
