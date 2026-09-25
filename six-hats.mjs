#!/usr/bin/env node
// six-hats: installs the Six Hats task-execution team for Claude Code and Codex.
//
//   node six-hats.mjs install   [--scope user|project] [--project DIR] [--only claude|codex] [--no-agents]
//                               [--codex-hooks] [--dry-run] [--home DIR]
//   node six-hats.mjs verify    [--scope user|project] [--project DIR] [--only claude|codex] [--home DIR]
//   node six-hats.mjs uninstall [--scope user|project] [--project DIR] [--only claude|codex] [--dry-run] [--home DIR]
//
// The Claude and Codex skills share a name but not a body: each is written for its own tool's machinery. They
// therefore go to the two places only their own tool reads (~/.claude/skills and ~/.agents/skills) instead of
// one shared folder, so neither tool ever loads the other's version.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const BUNDLE = path.dirname(fileURLToPath(import.meta.url));
const PAYLOAD = path.join(BUNDLE, 'payload');
const argv = process.argv.slice(2);
const command = argv[0] === undefined || argv[0].startsWith('--') ? 'install' : argv[0];
const hasFlag = (name) => argv.includes(name);
const optionValue = (name) => {
  const i = argv.indexOf(name);
  return i === -1 ? undefined : argv[i + 1];
};

const DRY = hasFlag('--dry-run');
const ONLY = optionValue('--only');
const WANT_AGENTS = !hasFlag('--no-agents');
const WANT_HOOKS = hasFlag('--codex-hooks');
const SCOPE = optionValue('--scope') ?? 'user';
const PROJECT_SCOPE = SCOPE === 'project';
const PROJECT = path.resolve(optionValue('--project') ?? process.cwd());
const HOME = path.resolve(optionValue('--home') ?? os.homedir());
// Project scope puts everything under the repository, where both tools look before the home directory.
const ROOT = PROJECT_SCOPE ? PROJECT : HOME;
const BACKUP_DIR = path.join(HOME, '.six-hats-backups', new Date().toISOString().replace(/[:.]/g, '-'));

const forClaude = ONLY !== 'codex';
const forCodex = ONLY !== 'claude';

const SRC = {
  claudeSkill: path.join(PAYLOAD, 'claude', 'six-hats'),
  claudeAgents: path.join(PAYLOAD, 'claude', 'six-hats', 'agents'),
  codexSkill: path.join(PAYLOAD, 'codex', '.agents', 'skills', 'six-hats'),
  codexAgents: path.join(PAYLOAD, 'codex', '.codex', 'agents'),
  codexHooks: path.join(PAYLOAD, 'codex', '.codex', 'hooks'),
};
const DEST = {
  claudeSkill: path.join(ROOT, '.claude', 'skills', 'six-hats'),
  claudeAgents: path.join(ROOT, '.claude', 'agents'),
  codexSkill: path.join(ROOT, '.agents', 'skills', 'six-hats'),
  codexAgents: path.join(ROOT, '.codex', 'agents'),
  codexHooks: path.join(ROOT, '.codex', 'hooks'),
  codexHooksJson: path.join(ROOT, '.codex', 'hooks.json'),
};
const HOOK_SCRIPTS = { Stop: 'six-hats-stop.sh', SubagentStop: 'six-hats-black-findings.sh' };
// Status lines as the package's own hooks.json writes them, so a merged file matches the shipped one.
const HOOK_STATUS = {
  Stop: 'six-hats: checking whether the run is finished',
  SubagentStop: 'six-hats: checking that BLACK reported something',
};

const actions = [];
const results = [];
const followUps = [];
let backedUp = false;

// ---------- helpers ----------

const read = (p) => (fs.existsSync(p) ? fs.readFileSync(p) : null);
const note = (msg) => actions.push(msg);
const check = (level, label, detail = '') => results.push({ level, label, detail });
const sameBytes = (a, b) => a !== null && b !== null && Buffer.compare(a, b) === 0;

function listFiles(dir, base = dir) {
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name);
    return entry.isDirectory() ? listFiles(full, base) : [path.relative(base, full)];
  });
}

function backupCopy(p) {
  if (!fs.existsSync(p) || fs.statSync(p).isDirectory()) return;
  const rel = path.relative(HOME, p);
  const dest = path.join(BACKUP_DIR, rel.startsWith('..') ? path.join('outside-home', path.basename(p)) : rel);
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  fs.copyFileSync(p, dest);
  backedUp = true;
}

function writeFile(p, content, why) {
  if (sameBytes(read(p), content)) return;
  note(`${fs.existsSync(p) ? 'update' : 'create'} ${p}${why ? `  (${why})` : ''}`);
  if (DRY) return;
  backupCopy(p);
  fs.mkdirSync(path.dirname(p), { recursive: true });
  fs.writeFileSync(p, content);
}

function deleteFile(p, why) {
  if (!fs.existsSync(p)) return;
  note(`remove ${p}${why ? `  (${why})` : ''}`);
  if (DRY) return;
  backupCopy(p);
  fs.rmSync(p);
}

// Removes a directory only once nothing is left in it, so a folder the user also keeps their own files in survives.
function pruneDir(dir) {
  if (DRY || !fs.existsSync(dir)) return;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.isDirectory()) pruneDir(path.join(dir, entry.name));
  }
  if (!fs.readdirSync(dir).length) fs.rmdirSync(dir);
}

// A skill folder is mirrored exactly: files the package no longer ships are removed, so an upgrade never leaves a
// stale reference file that the skill body stopped pointing at.
function mirrorDir(src, dest, why, skip = () => false) {
  const wanted = listFiles(src).filter((rel) => !skip(rel));
  for (const rel of wanted) writeFile(path.join(dest, rel), fs.readFileSync(path.join(src, rel)), rel === 'SKILL.md' ? why : '');
  for (const rel of listFiles(dest)) {
    if (!wanted.includes(rel)) deleteFile(path.join(dest, rel), 'no longer part of the package');
  }
}

function copyEach(srcDir, destDir, pattern, why) {
  for (const name of fs.readdirSync(srcDir).filter((n) => pattern.test(n))) {
    writeFile(path.join(destDir, name), fs.readFileSync(path.join(srcDir, name)), why);
  }
}

function removeEach(srcDir, destDir, pattern, why) {
  for (const name of fs.readdirSync(srcDir).filter((n) => pattern.test(n))) deleteFile(path.join(destDir, name), why);
}

function loadJson(file) {
  const raw = read(file);
  if (raw === null) return { raw, data: {} };
  try {
    return { raw, data: JSON.parse(raw.toString('utf8')) };
  } catch (e) {
    throw new Error(`${file} is not valid JSON (${e.message}). Fix it first; nothing was changed.`);
  }
}

// ---------- Codex hooks (project scope only) ----------

// The shipped hooks.json invokes the scripts by a path relative to the repository (`sh .codex/hooks/...`), which
// only resolves when Codex runs from the project root. That is why they install per project and never into the
// home directory, where the same relative path would point at nothing.
const hookCommand = (script) => `sh .codex/hooks/${script}`;
const mentionsHook = (hook) => Object.values(HOOK_SCRIPTS).some((s) => String(hook?.command ?? '').includes(s));

function ensureCodexHooks() {
  copyEach(SRC.codexHooks, DEST.codexHooks, /\.sh$/, 'optional six-hats hook');
  const { data } = loadJson(DEST.codexHooksJson);
  const before = actions.length;
  data.hooks ??= {};
  for (const [event, script] of Object.entries(HOOK_SCRIPTS)) {
    data.hooks[event] ??= [];
    const present = data.hooks[event].some((g) => (g.hooks ?? []).some((h) => String(h.command ?? '').includes(script)));
    if (present) continue;
    note(`hooks.json: add the six-hats ${event} hook`);
    const entry = { type: 'command', command: hookCommand(script), timeout: 15, statusMessage: HOOK_STATUS[event] };
    data.hooks[event].push(event === 'SubagentStop' ? { matcher: 'hat-black', hooks: [entry] } : { hooks: [entry] });
  }
  if (actions.length !== before) {
    writeFile(DEST.codexHooksJson, Buffer.from(JSON.stringify(data, null, 2) + '\n'));
    followUps.push('Codex runs a new hook only after you approve it: open `codex` in this project once and trust both hooks.');
    followUps.push('The hooks need `sh` and `jq` on PATH. Without jq they stay silent rather than fail.');
  }
}

function removeCodexHooks() {
  const { raw, data } = loadJson(DEST.codexHooksJson);
  if (raw !== null && data.hooks) {
    let changed = false;
    for (const event of Object.keys(HOOK_SCRIPTS)) {
      const groups = data.hooks[event];
      if (!Array.isArray(groups) || !groups.some((g) => (g.hooks ?? []).some(mentionsHook))) continue;
      changed = true;
      note(`hooks.json: remove the six-hats ${event} hook`);
      const kept = groups.map((g) => ({ ...g, hooks: (g.hooks ?? []).filter((h) => !mentionsHook(h)) })).filter((g) => g.hooks.length);
      if (kept.length) data.hooks[event] = kept;
      else delete data.hooks[event];
    }
    if (changed) {
      if (!Object.keys(data.hooks).length) delete data.hooks;
      if (Object.keys(data).length) writeFile(DEST.codexHooksJson, Buffer.from(JSON.stringify(data, null, 2) + '\n'));
      else deleteFile(DEST.codexHooksJson, 'it only held the six-hats hooks');
    }
  }
  removeEach(SRC.codexHooks, DEST.codexHooks, /\.sh$/, 'six-hats hook');
}

// ---------- commands ----------

function install() {
  if (forClaude) {
    mirrorDir(SRC.claudeSkill, DEST.claudeSkill, 'Claude Code skill: /six-hats');
    if (WANT_AGENTS) copyEach(SRC.claudeAgents, DEST.claudeAgents, /^hat-.*\.md$/, 'Claude hat agent');
    else removeEach(SRC.claudeAgents, DEST.claudeAgents, /^hat-.*\.md$/, 'agents not wanted');
    followUps.push('Claude Code: run /reload-skills (or restart), then /six-hats <task>.');
    if (PROJECT_SCOPE && WANT_AGENTS) {
      followUps.push("Project agent files only run their built-in report checks after you accept this folder's workspace-trust dialog.");
    }
  }
  if (forCodex) {
    mirrorDir(SRC.codexSkill, DEST.codexSkill, 'Codex skill: $six-hats');
    if (WANT_AGENTS) copyEach(SRC.codexAgents, DEST.codexAgents, /^hat-.*\.toml$/, 'Codex hat agent');
    else removeEach(SRC.codexAgents, DEST.codexAgents, /^hat-.*\.toml$/, 'agents not wanted');
    if (WANT_HOOKS) ensureCodexHooks();
    followUps.push('Codex: start a new session, then $six-hats <task>.');
    const codexHome = process.env.CODEX_HOME && path.resolve(process.env.CODEX_HOME);
    if (!PROJECT_SCOPE && WANT_AGENTS && codexHome && codexHome !== path.join(HOME, '.codex')) {
      followUps.push(`CODEX_HOME is ${codexHome}, so Codex looks for agents in ${path.join(codexHome, 'agents')}, not ${DEST.codexAgents}. Link or copy them there.`);
    }
  }
}

function uninstall() {
  if (forClaude) {
    for (const rel of listFiles(DEST.claudeSkill)) deleteFile(path.join(DEST.claudeSkill, rel));
    pruneDir(DEST.claudeSkill);
    removeEach(SRC.claudeAgents, DEST.claudeAgents, /^hat-.*\.md$/, 'Claude hat agent');
  }
  if (forCodex) {
    for (const rel of listFiles(DEST.codexSkill)) deleteFile(path.join(DEST.codexSkill, rel));
    pruneDir(DEST.codexSkill);
    removeEach(SRC.codexAgents, DEST.codexAgents, /^hat-.*\.toml$/, 'Codex hat agent');
    if (PROJECT_SCOPE) removeCodexHooks();
  }
}

function compareDir(label, src, dest, skip = () => false) {
  const wanted = listFiles(src).filter((rel) => !skip(rel));
  const missing = wanted.filter((rel) => !fs.existsSync(path.join(dest, rel)));
  const changed = wanted.filter((rel) => !missing.includes(rel) && !sameBytes(read(path.join(src, rel)), read(path.join(dest, rel))));
  if (missing.length) return check('FAIL', label, `missing: ${missing.join(', ')}`);
  if (changed.length) return check('warn', label, `edited since install: ${changed.join(', ')}`);
  check('ok', label, dest);
}

function compareEach(label, srcDir, destDir, pattern) {
  const names = fs.readdirSync(srcDir).filter((n) => pattern.test(n));
  const missing = names.filter((n) => !fs.existsSync(path.join(destDir, n)));
  const changed = names.filter((n) => !missing.includes(n) && !sameBytes(read(path.join(srcDir, n)), read(path.join(destDir, n))));
  if (missing.length === names.length) return check(WANT_AGENTS ? 'warn' : 'ok', label, 'not installed: the skill falls back to general agents');
  if (missing.length) return check('FAIL', label, `missing: ${missing.join(', ')}`);
  if (changed.length) return check('warn', label, `edited since install: ${changed.join(', ')}`);
  check('ok', label, `${names.length} files in ${destDir}`);
}

function frontmatterName(file) {
  const text = read(file)?.toString('utf8') ?? '';
  return text.match(/^---\r?\n[\s\S]*?^name:\s*(\S+)/m)?.[1] ?? null;
}

function verify() {
  if (forClaude) {
    compareDir('Claude skill', SRC.claudeSkill, DEST.claudeSkill);
    const name = frontmatterName(path.join(DEST.claudeSkill, 'SKILL.md'));
    check(name === 'six-hats' ? 'ok' : 'FAIL', 'Claude skill name', name ?? 'SKILL.md frontmatter unreadable');
    compareEach('Claude hat agents', SRC.claudeAgents, DEST.claudeAgents, /^hat-.*\.md$/);
  }
  if (forCodex) {
    compareDir('Codex skill', SRC.codexSkill, DEST.codexSkill);
    const name = frontmatterName(path.join(DEST.codexSkill, 'SKILL.md'));
    check(name === 'six-hats' ? 'ok' : 'FAIL', 'Codex skill name', name ?? 'SKILL.md frontmatter unreadable');
    compareEach('Codex hat agents', SRC.codexAgents, DEST.codexAgents, /^hat-.*\.toml$/);
    // A copy of the skill under ~/.codex/skills as well as ~/.agents/skills makes Codex list it twice.
    const stray = path.join(HOME, '.codex', 'skills', 'six-hats');
    check(fs.existsSync(stray) ? 'warn' : 'ok', 'no duplicate Codex skill', fs.existsSync(stray) ? `${stray} also exists; Codex will load both` : '');
    if (PROJECT_SCOPE) {
      const { data } = (() => {
        try {
          return loadJson(DEST.codexHooksJson);
        } catch {
          return { data: {} };
        }
      })();
      const wired = Object.keys(HOOK_SCRIPTS).filter((e) => (data.hooks?.[e] ?? []).some((g) => (g.hooks ?? []).some(mentionsHook)));
      check('ok', 'optional Codex hooks', wired.length ? `wired: ${wired.join(', ')}` : 'not installed (add with --codex-hooks)');
    }
  }
  const width = Math.max(...results.map((r) => r.label.length));
  for (const r of results) console.log(`${`[${r.level}]`.padEnd(7)} ${r.label.padEnd(width)}  ${r.detail}`);
  const fails = results.filter((r) => r.level === 'FAIL').length;
  const warns = results.filter((r) => r.level === 'warn').length;
  console.log(`\n${fails ? `${fails} check(s) failed` : 'all required checks passed'}${warns ? `, ${warns} warning(s)` : ''}.`);
  return fails ? 1 : 0;
}

const USAGE = [
  'usage: node six-hats.mjs [install|verify|uninstall|help] [options]',
  '',
  '  no command            install (so `npx -y six-hats` sets a device up in one line)',
  '  --scope user          default: every project, from your home directory',
  '  --scope project       one repository only (--project DIR, default: the current directory)',
  '  --only claude|codex   limit it to one tool',
  '  --no-agents           skip the hat agent files; the skill then briefs general agents itself',
  '  --codex-hooks         also install the optional Codex Stop and BLACK-report hooks (project scope only)',
  '  --dry-run             show what would change',
  '  --home DIR            treat DIR as the home directory (testing)',
].join('\n');

try {
  if (ONLY && !['claude', 'codex'].includes(ONLY)) throw new Error('--only must be "claude" or "codex"');
  if (!['user', 'project'].includes(SCOPE)) throw new Error('--scope must be "user" or "project"');
  if (PROJECT_SCOPE && !fs.existsSync(PROJECT)) throw new Error(`no such directory: ${PROJECT}`);
  if (WANT_HOOKS && !PROJECT_SCOPE) {
    throw new Error('--codex-hooks needs --scope project: the hooks call their scripts by a path relative to the repository');
  }
  if (WANT_HOOKS && ONLY === 'claude') throw new Error('--codex-hooks is a Codex feature; drop --only claude');
  if (!fs.existsSync(SRC.claudeSkill) || !fs.existsSync(SRC.codexSkill)) throw new Error(`payload missing under ${PAYLOAD}`);

  if (command === 'install' || command === 'uninstall') {
    if (command === 'install') install();
    else uninstall();
    if (!actions.length) console.log('already up to date; nothing to change.');
    else {
      console.log(`${DRY ? 'Dry run, would make' : 'Made'} ${actions.length} change(s):`);
      for (const a of actions) console.log(`  - ${a}`);
    }
    if (backedUp) console.log(`Backups: ${BACKUP_DIR}`);
    if (!DRY && command === 'install') for (const line of followUps) console.log(`  ! ${line}`);
  } else if (command === 'verify') {
    process.exitCode = verify();
  } else {
    console.log(USAGE);
    process.exitCode = command === 'help' ? 0 : 1;
  }
} catch (e) {
  console.error(`error: ${e.message}`);
  process.exitCode = 1;
}
