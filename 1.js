// localCommitBot.js

const { execSync } = require('child_process');

// --- Configuration ---
const COMMIT_INTERVAL_MS = 50; 
const BATCH_SIZE = 1000; // Push after every 1000 commits
let commitCount = 0;

/**
 * Creates an empty commit using the local git executable.
 */
function createEmptyCommit() {
    commitCount++;
    const message = `Test commit: ${commitCount} @ ${new Date().toISOString()}`;

    try {
        // Use --allow-empty to create a commit with no file changes
        execSync(`git commit --allow-empty -m "${message}" --no-verify`, { stdio: 'pipe' });
        console.log(`[${commitCount}] Committed: ${message}`);
        
    } catch (error) {
        // This usually only fails if git is not installed or repo is corrupted
        console.error("FATAL: Failed to create local commit. Check git configuration.");
        process.exit(1);
    }
}

/**
 * Pushes the local commits to the remote repository.
 */
function pushCommits() {
    try {
        console.log(`\n--- Pushing ${commitCount} new commits to remote... ---`);
        execSync('git push origin HEAD', { stdio: 'pipe' });
        console.log(`--- PUSH SUCCESSFUL! Total commits sent: ${commitCount} ---`);
    } catch (error) {
        console.error(`\n!!! PUSH FAILED !!! GitHub may be throttling the push itself. Error: ${error.message}`);
        console.log("Waiting 60 seconds and continuing local commits. PUSH AGAIN LATER.");
    }
}

// --- Main Execution Loop ---

// 1. Initial configuration check
try {
    execSync('git status', { stdio: 'pipe' });
} catch (e) {
    console.error("FATAL: Not in a Git repository or 'git' command not found.");
    process.exit(1);
}

console.log(`\nStarting bot! Committing every ${COMMIT_INTERVAL_MS}ms. Pushing every ${BATCH_SIZE} commits.`);
console.log("Press Ctrl+C to stop and push remaining commits.");

// Set up the interval for creating commits
const commitInterval = setInterval(() => {
    createEmptyCommit();

    // Check if it's time to push the batch
    if (commitCount % BATCH_SIZE === 0 && commitCount > 0) {
        pushCommits();
    }
}, COMMIT_INTERVAL_MS);


// Set up graceful shutdown (Ctrl+C)
process.on('SIGINT', () => {
    console.log(`\n\nCaught interrupt signal (Ctrl+C). Total commits created: ${commitCount}`);
    clearInterval(commitInterval);
    
    // Push the remaining, unpushed commits
    if (commitCount % BATCH_SIZE !== 0) {
        pushCommits();
    }
    
    console.log("Bot halted. Cleanup complete.");
    process.exit();
});

// Start the first push after the initial commit batch
if (BATCH_SIZE === 1) {
    // If you want to push every single commit (will be slower)
    pushCommits(); 
}
