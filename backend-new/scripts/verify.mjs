import { spawnSync } from "node:child_process";

const steps = [
  ["run", "lint"],
  ["run", "build"],
  ["test"],
];

// Builds a cross-platform npm command invocation.
function npmInvocation(args) {
  if (process.platform === "win32") {
    return {
      command: "cmd.exe",
      args: ["/c", "npm", ...args],
    };
  }

  return {
    command: "npm",
    args,
  };
}

// Runs verification steps sequentially.
function runVerify() {
  for (const args of steps) {
    const invocation = npmInvocation(args);
    const result = spawnSync(invocation.command, invocation.args, {
      stdio: "inherit",
      shell: false,
    });

    if (result.status !== 0) {
      process.exit(result.status || 1);
    }
  }
}

runVerify();
