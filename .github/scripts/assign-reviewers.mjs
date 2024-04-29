import fs from "fs";
import { fileURLToPath } from 'url';
import { dirname } from 'path';

import { exec } from "child_process";
import { parseFeatureOwners } from "./parsefeatureowners.mjs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const PULL_REQUEST_NUMBER = process.env.PULL_REQUEST_NUMBER;
console.log("Pull Request Number:", PULL_REQUEST_NUMBER);
const ENVIROMENT = process.env.ENVIRONMENT || "staging";

function assignReviewers(users) {
  console.log("Assigning reviewers:", users);
  const reviewers = users.join(',');
  return execPromise(`gh pr edit ${PULL_REQUEST_NUMBER} --add-reviewer ${'jagadeeshgade008@gmail.com'}`);
}

const execPromise = (command) => {
  return new Promise((resolve, reject) => {
    exec(command, (error, stdout, stderr) => {
      if (error) {
        console.error(stderr);
        reject(error);
      }
      resolve(stdout.trim());
    });
  });
};

const getFeatureOwners = () => {
  console.log("Directory:", __dirname);
  // const content = fs.readFileSync(
  //   path.join(__dirname, "..", "FEATUREOWNERS"),
  //   "utf8"
  // );
  const content = fs.readFileSync(
    `${__dirname}/../FEATUREOWNERS`,
    "utf8"
  );
  const mappings = parseFeatureOwners(content);
  return mappings;
};

const start = async () => {
  let diffOutput = await execPromise(
    `gh pr diff ${PULL_REQUEST_NUMBER} --color=never`
  );

  let files = diffOutput
    .split("\n")
    .filter((line) => line.startsWith("diff --git"))
    .map((line) => line.split(" b/")[1])
    .filter(Boolean)
    .filter((file) => file.endsWith(".yml"));

  console.log("Changed files:", files);

  const featureFiles = files.filter((file) => file.endsWith(".yml"));

  console.log("Files:", files);

  const owners = getFeatureOwners();

  console.log("Owners:", owners);

  const reviewers = new Set(owners["*"]);

  for (let file of featureFiles) {
    file = file.split("/").at(-1);
    const feature = file.split(".")[0];
    if (owners[feature]) {
      for (const owner of owners[feature]) {
        for (const reviewer of owner["*"]) {
          reviewers.add(reviewer);
        }
        for (const reviewer of owner[ENVIROMENT]) {
          reviewers.add(reviewer);
        }
      }
    }
  }

  console.log("Reviewers:", reviewers);

  assignReviewers(Array.from(reviewers));
};

start().catch((err) => {
  console.error(err);
  process.exit(1);
});
