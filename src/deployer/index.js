const fs = require("fs-extra");
const path = require("path");
const Git = require("simple-git");
const inquirer = require("inquirer");

const cwd = process.cwd();

function branchBaseName(branchName) {
    const levels = branchName.split("/");
    return levels[levels.length - 1];
}

async function getRepo(address) {
    // TODO: key from config
    const repoDir = path.resolve(".deploy/repo");
    const sshKey = path.resolve(".deploy/ssh/id_rsa");
    const command = `ssh -o StrictHostKeyChecking=no -i ${sshKey}`;
    if (!await fs.exists(repoDir))
        await fs.mkdirSync(repoDir);
    const git = Git(repoDir);
    git.outputHandler(function(command, stdout, stderr) {
        //stdout.pipe(process.stdout);
        stderr.pipe(process.stderr);
    });
    await git.env("GIT_SSH_COMMAND", command);
    if (git.checkIsRepo) {
        console.log("Fetching remote changes...");
        await git.raw(["fetch", "origin", "-p"]);
    }
    else {
        console.log(`Cloning ${address} to ${repoDir}...`);
        await git.clone(address, repoDir, ["--progress"]);
    }
    return git;
}

async function deploy(options = { branch: "" }) {
    // TODO: prompt repo address, brand, campaign
    // TODO: save address, brand, campaign to deploy.config.json
    
    // TODO: address from config
    const git = await getRepo("git@gitlab.com:gecko0307/otkritie-october-2022.git");
    
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
            brand: "", // TODO: from config
            campaign: "", // TODO: from config
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
