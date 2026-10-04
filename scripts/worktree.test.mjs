import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { execFileSync, spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const script = path.join(path.dirname(fileURLToPath(import.meta.url)), "worktree.mjs");
function fixture(t) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "gbf-worktree-test-"));
  const repo = path.join(dir, "元 repo");
  fs.mkdirSync(path.join(repo, "scripts"), { recursive: true });
  fs.copyFileSync(script, path.join(repo, "scripts", "worktree.mjs"));
  // The fixture creates commits only in a disposable repository, never the project.
  const git = (...args) => execFileSync("git", ["-C", repo, ...args], { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] }).trim();
  git("init", "-b", "main");
  git("add", "scripts/worktree.mjs");
  git("-c", "user.name=Fixture", "-c", "user.email=fixture@example.invalid", "-c", "commit.gpgsign=false", "commit", "-m", "fixture");
  const base = git("rev-parse", "HEAD");
  const run = (...args) => spawnSync(process.execPath, [path.join(repo, "scripts", "worktree.mjs"), ...args], { encoding: "utf8", cwd: dir });
  t.after(() => {
    // Absolute temp-root boundary and mkdtemp prefix checked before recursive cleanup.
    const resolved = fs.realpathSync.native(dir);
    const relative = path.relative(fs.realpathSync.native(os.tmpdir()), resolved);
    assert.match(relative, /^gbf-worktree-test-[^\\/]+$/);
    fs.rmSync(resolved, { recursive: true, force: true });
  });
  return { dir, repo, git, base, run };
}
test("dry-run is read-only; new creates the requested branch from an immutable base", t => {
  const f = fixture(t);
  const target = path.join(f.dir, "別 worktree");
  const args = ["new", "ui-task", "--base", f.base, "--directory", target];
  assert.equal(f.run(...args, "--dry-run").status, 0);
  assert.equal(fs.existsSync(target), false);
  assert.equal(f.git("branch", "--list", "task/ui-task"), "");
  const created = f.run(...args);
  assert.equal(created.status, 0, created.stderr);
  assert.equal(f.git("rev-parse", "task/ui-task"), f.base);
  assert.equal(f.git("branch", "--show-current"), "main");
  assert.equal(f.git("status", "--porcelain"), "");
  assert.ok(fs.existsSync(path.join(target, ".git")));
  assert.equal(f.run(...args).status, 1);
  assert.equal(f.run("new", "ui-task", "--base", f.base, "--directory", path.join(f.dir, "other")).status, 1);
});
test("new refuses dirty source, preserving its file and Git state", t => {
  const f = fixture(t);
  fs.writeFileSync(path.join(f.repo, "user.txt"), "keep");
  const result = f.run("new", "dirty", "--base", f.base, "--directory", path.join(f.dir, "dirty"));
  assert.equal(result.status, 1);
  assert.match(result.stderr, /未コミット/);
  assert.equal(fs.readFileSync(path.join(f.repo, "user.txt"), "utf8"), "keep");
  assert.equal(f.git("branch", "--list", "task/dirty"), "");
});
test("new refuses existing directories and paths inside another worktree", t => {
  const f = fixture(t);
  for (const target of [f.dir, path.join(f.repo, "nested")]) {
    assert.equal(f.run("new", "nested", "--base", f.base, "--directory", target).status, 1);
  }
  const other = path.join(f.dir, "other");
  f.git("worktree", "add", "--detach", other, f.base);
  assert.equal(f.run("new", "nested", "--base", f.base, "--directory", path.join(other, "nested")).status, 1);
});
test("new detects a nested destination through a junction or symlink", t => {
  const f = fixture(t);
  const alias = path.join(f.dir, "alias");
  fs.symlinkSync(f.repo, alias, process.platform === "win32" ? "junction" : "dir");
  assert.equal(f.run("new", "nested", "--base", f.base, "--directory", path.join(alias, "nested")).status, 1);
  assert.equal(fs.existsSync(path.join(f.repo, "nested")), false);
});
test("new refuses Git operations in progress", t => {
  const f = fixture(t);
  fs.writeFileSync(path.join(f.repo, ".git", "MERGE_HEAD"), `${f.base}\n`);
  const result = f.run("new", "busy", "--base", f.base, "--directory", path.join(f.dir, "busy"));
  assert.equal(result.status, 1);
  assert.match(result.stderr, /Git操作/);
  assert.ok(fs.existsSync(path.join(f.repo, ".git", "MERGE_HEAD")));
});
test("invalid input never creates a branch", t => {
  const f = fixture(t);
  for (const args of [
    ["new", "bad/name", "--base", f.base, "--directory", path.join(f.dir, "bad")],
    ["new", "valid", "--base", "-bad", "--directory", path.join(f.dir, "bad")],
    ["new", "valid", "--base", "missing-ref", "--directory", path.join(f.dir, "bad")],
    ["new", "valid", "--base", f.base, "--directory", "relative"],
    ["new", "valid", "--base", f.base], ["new", "valid", "--directory", path.join(f.dir, "bad")],
    ["status", "--dry-run"], ["review"], ["status", "--unknown"],
  ]) assert.equal(f.run(...args).status, 1, args.join(" "));
  assert.equal(f.git("branch", "--list", "task/*"), "");
});
test("status and review are read-only and separate dirty changes from committed work", t => {
  const f = fixture(t);
  fs.appendFileSync(path.join(f.repo, "scripts", "worktree.mjs"), "\n// fixture edit\n");
  fs.writeFileSync(path.join(f.repo, "new.txt"), "untracked");
  const before = f.git("status", "--porcelain");
  assert.equal(f.run("status").status, 0);
  const review = f.run("review", "--base", f.base);
  assert.equal(review.status, 0, review.stderr);
  assert.match(review.stdout, /確認対象HEAD/);
  assert.match(review.stdout, /コミット済み差分\n\(なし\)/);
  assert.match(review.stdout, /未ステージ差分/);
  assert.match(review.stdout, /\?\? new.txt/);
  assert.equal(f.git("status", "--porcelain"), before);
  assert.equal(f.git("rev-parse", "HEAD"), f.base);
});
test("Windows invalid directory names are rejected in dry-run and real execution without Git changes", { skip: process.platform !== "win32" }, t => {
  const f = fixture(t);
  const beforeWorktrees = f.git("worktree", "list", "--porcelain");
  const names = ["CON", "con.txt", "PRN", "AUX", "NUL.tar.gz", "COM1", "COM9", "LPT1", "LPT9", "COM¹", "LPT².txt", "LPT³",
    "CONIN$", "CONOUT$", "CON .txt", "bad<name", "bad>name", 'bad"name', "bad:name", "bad|name", "bad?name", "bad*name",
    "bad\x01name", "bad\x1fname", "bad ", "bad.", path.join("CON", "child"), path.join("bad.", "child")];
  const invalidPaths = names.map(name => path.join(f.dir, name));
  invalidPaths.push("\\root-relative", `\\\\?\\${path.join(f.dir, "special")}`);
  for (const target of invalidPaths) {
    for (const extra of [["--dry-run"], []]) {
      const result = f.run("new", "invalid-path", "--base", f.base, "--directory", target, ...extra);
      assert.equal(result.status, 1, JSON.stringify(target));
      assert.match(result.stderr, /Windowsの作成先/, JSON.stringify(target));
    }
  }
  assert.equal(f.git("branch", "--list", "task/*"), "");
  assert.equal(f.git("worktree", "list", "--porcelain"), beforeWorktrees);
  assert.equal(f.git("status", "--porcelain"), "");
  assert.equal(f.git("rev-parse", "HEAD"), f.base);
});
test("creation failures explain how to inspect remaining state without deleting it", t => {
  const f = fixture(t);
  const blocker = path.join(f.dir, "parent-is-file");
  fs.writeFileSync(blocker, "keep");
  const target = path.join(blocker, "child");
  const result = f.run("new", "creation-failure", "--base", f.base, "--directory", target);
  assert.equal(result.status, 1);
  assert.match(result.stderr, /git worktree list --porcelain/);
  assert.match(result.stderr, /git branch --list task\/creation-failure/);
  assert.match(result.stderr, /自動削除・強制処理は行いません/);
  assert.equal(fs.readFileSync(blocker, "utf8"), "keep");
  assert.equal(f.git("branch", "--show-current"), "main");
  assert.equal(f.git("rev-parse", "HEAD"), f.base);
});
