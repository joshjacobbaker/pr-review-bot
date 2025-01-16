import 'dotenv/config';
import { Octokit } from '@octokit/rest';
import fetch from 'node-fetch';

// Authenticate with GitHub
const octokit = new Octokit({
  auth: process.env.GH_TOKEN,
  request: {
    fetch: fetch
  }
});

// Repository details
const owner = "joshjacobbaker"; // Replace with your GitHub username or organization
const repo = "pr-review-bot"; // Replace with your repository name

// Function to review PRs
const reviewPullRequests = async () => {
  try {
    // Fetch open pull requests
    const { data: pullRequests } = await octokit.pulls.list({
      owner,
      repo,
      state: "open",
    });

    for (const pr of pullRequests) {
      console.log(`Reviewing PR #${pr.number}: ${pr.title}`);

      const reviewComments = [];

      // Check for large PRs
      if (pr.changed_files > 50) {
        reviewComments.push(
          "This PR modifies more than 50 files. Consider splitting it into smaller PRs for easier review."
        );
      }

      // Check for missing tests
      const { data: files } = await octokit.pulls.listFiles({
        owner,
        repo,
        pull_number: pr.number,
      });
      const hasTests = files.some((file) =>
        file.filename.toLowerCase().includes("test")
      );

      if (!hasTests) {
        reviewComments.push(
          "No test files detected. Please ensure adequate tests are included."
        );
      }

      // Check for TODO comments
      files.forEach((file) => {
        if (file.patch && file.patch.includes("TODO")) {
          reviewComments.push(
            `TODO found in \`${file.filename}\`. Please address before merging.`
          );
        }
      });

      // Post comments if any issues were found
      if (reviewComments.length > 0) {
        const body = reviewComments.join("\n");
        await octokit.issues.createComment({
          owner,
          repo,
          issue_number: pr.number,
          body,
        });
        console.log(`Comments added to PR #${pr.number}.`);
      } else {
        console.log(`No issues found in PR #${pr.number}.`);
      }
    }
  } catch (error) {
    console.error("Error reviewing PRs:", error);
  }
};

// Run the bot
reviewPullRequests();
