# PreToolUse hook: worktree guard (CLAUDE.md §5, Git Worktree Discipline).
# The primary checkout is shared by multiple agents; branch switches or file
# writes there break other agents' in-flight work. Exit 2 = block the tool call.
$in = [Console]::In.ReadToEnd() | ConvertFrom-Json

# Primary checkout root: the project dir itself, or its owner if the session
# is already inside a .claude/worktrees/ worktree.
$proj = $env:CLAUDE_PROJECT_DIR
if (-not $proj) { exit 0 }
$primary = ($proj -replace '[\\/]\.claude[\\/]worktrees[\\/].*$', '') -replace '/', '\'

function Deny([string]$msg) { [Console]::Error.WriteLine($msg); exit 2 }

if ($in.tool_name -in @('Edit', 'Write', 'NotebookEdit')) {
  $p = $in.tool_input.file_path ?? $in.tool_input.notebook_path
  if (-not $p) { exit 0 }
  $p = $p -replace '/', '\'
  if ($p -like "$primary\*" -and $p -notlike "$primary\.claude\worktrees\*") {
    Deny 'BLOCKED: writing files in the shared primary checkout is forbidden — multiple agents share it (CLAUDE.md §5). Write in an isolated worktree under .claude/worktrees/ and commit to main instead.'
  }
  exit 0
}

$cmd = $in.tool_input.command
if (-not $cmd) { exit 0 }

if ($cmd -match '(?i)\bgit\b[^|;&]*?\b(checkout|switch)\b') {
  $dir = $in.cwd
  if ($cmd -match '(?i)\s-C\s+(?:"([^"]+)"|''([^'']+)''|(\S+))') {
    $dir = $Matches[1] ?? $Matches[2] ?? $Matches[3]
  }
  if (-not ($dir -match '[\\/]\.claude[\\/]worktrees[\\/]?')) {
    Deny 'BLOCKED: git checkout/switch in the shared primary checkout is forbidden — multiple agents share it (CLAUDE.md §5). Work in an isolated worktree under .claude/worktrees/ instead.'
  }
}
exit 0
