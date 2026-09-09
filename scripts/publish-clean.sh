#!/usr/bin/env bash
# =============================================================================
# publish-clean.sh —— 从开发分支提取「极简纯净版」并发布到发布分支
#
# 用法（在仓库根目录运行）：
#   scripts/publish-clean.sh                 # 正式执行：裁剪 → 验证 → 提交 → 强推
#   scripts/publish-clean.sh --dry-run       # 只打印将要执行的动作，不改动任何东西
#   scripts/publish-clean.sh --no-push       # 提交但不推远程
#   scripts/publish-clean.sh --no-verify     # 跳过 vitest / vue-tsc
#   scripts/publish-clean.sh -y              # 跳过交互确认（CI 用）
#
# 可用环境变量覆盖：
#   DEV_BRANCH=dev PUB_BRANCH=master REMOTE=origin NODE_BIN=node
#
# -----------------------------------------------------------------------------
# 环境坑（本脚本已规避，改动时请勿回退）
#
#   1. 绝不用 `git rm -r <dir>` 删除被裁文件 —— 会让工作树文件物理消失
#      （疑似安全软件拦截批量删除）。改为：
#         git rm -r --cached <path>   # 只动索引，不碰磁盘
#         mv <path> <备份目录>/       # 同盘重命名，安全
#
#   2. 绝不用 Python `write_text()` / `open(..., 'w')` 改文件 —— Windows 下
#      会把 LF 翻转成 CRLF，diff 变成全量行变化。文本处理一律 sed -i / printf。
#
#   3. `git update-ref refs/remotes/...` 在本环境被静默拦截（无报错、ref 不落盘）。
#      remote-tracking 丢失时直接写 `.git/refs/remotes/<remote>/<branch>` 文件。
#
#   4. 切换分支时偶发「工作树文件批量消失」。切换后调用 guard_worktree()
#      检测，缺失过多立即 reset --hard 自愈。
# =============================================================================
set -euo pipefail

# ---------------------------------------------------------------- 配置区 -----
DEV_BRANCH="${DEV_BRANCH:-dev}"
PUB_BRANCH="${PUB_BRANCH:-master}"
REMOTE="${REMOTE:-origin}"

# 要剔除的路径（相对仓库根）。发布版不需要的开发过程资产。
PRUNE_PATHS=(
  ".workbuddy"
  "docs/archive"
  "docs/development-plan.md"
  "docs/execution-log.md"
  "docs/architecture-layering-review.md"
  "docs/delivery-scenario-gap.md"
  "docs/table-column-config-overview.md"
  "demo"
  "src/dev/graphicData.ts"
  "src/dev/grid-50-rows.json"
  "src/dev/ticket-schema-v2-1788315240965.json"
  "src/dev/ticket-schema-v2-1788517143658.json"
)

# 剔除后用于扫描死链的关键词（正则）
DEADREF_PATTERN='development-plan|execution-log|architecture-layering-review|delivery-scenario-gap|table-column-config-overview|docs/archive|graphicData|grid-50-rows|ticket-schema-v2-1788|\.workbuddy'

# ---------------------------------------------------------------- 参数 ------
DRY_RUN=0
DO_PUSH=1
DO_VERIFY=1
ASSUME_YES=0
while [[ $# -gt 0 ]]; do
  case "$1" in
    --dry-run)   DRY_RUN=1 ;;
    --no-push)   DO_PUSH=0 ;;
    --no-verify) DO_VERIFY=0 ;;
    -y|--yes)    ASSUME_YES=1 ;;
    -h|--help)   sed -n '2,40p' "$0"; exit 0 ;;
    *) echo "未知参数: $1（用 --help 查看用法）" >&2; exit 2 ;;
  esac
  shift
done

# ---------------------------------------------------------------- 工具 ------
c_reset=$'\033[0m'; c_red=$'\033[31m'; c_green=$'\033[32m'; c_yellow=$'\033[33m'; c_bold=$'\033[1m'
info()  { printf '%s[info]%s %s\n'  "$c_green"  "$c_reset" "$*"; }
warn()  { printf '%s[warn]%s %s\n'  "$c_yellow" "$c_reset" "$*" >&2; }
err()   { printf '%s[err ]%s %s\n'  "$c_red"    "$c_reset" "$*" >&2; }
step()  { printf '\n%s==> %s%s\n'   "$c_bold"   "$c_reset" "$*"; }
die()   { err "$*"; exit 1; }

# dry-run 下只打印不执行
run() {
  if [[ $DRY_RUN -eq 1 ]]; then
    printf '%s[dry-run]%s %s\n' "$c_yellow" "$c_reset" "$*"
  else
    "$@"
  fi
}

confirm() {
  [[ $ASSUME_YES -eq 1 ]] && return 0
  local ans
  printf '%s%s [y/N]%s ' "$c_bold" "$1" "$c_reset"
  read -r ans
  [[ "$ans" == "y" || "$ans" == "Y" ]]
}

# 解析 node：优先 PATH，其次本机托管版本
resolve_node() {
  if [[ -n "${NODE_BIN:-}" ]]; then echo "$NODE_BIN"; return; fi
  if command -v node >/dev/null 2>&1; then echo "node"; return; fi
  local cand
  for cand in "$HOME"/.workbuddy/binaries/node/versions/*/node.exe; do
    [[ -x "$cand" ]] && { echo "$cand"; return; }
  done
  echo "node"
}

# 坑 4：切换分支后自愈
guard_worktree() {
  [[ $DRY_RUN -eq 1 ]] && return 0
  local missing
  missing=$(git status --porcelain | grep -c '^ D' || true)
  if [[ "${missing:-0}" -gt 20 ]]; then
    warn "检测到 ${missing} 个工作树文件在切换后缺失（环境侧批量文件操作故障），正在 reset --hard 自愈"
    git reset --hard HEAD >/dev/null
    missing=$(git status --porcelain | grep -c '^ D' || true)
    [[ "${missing:-0}" -eq 0 ]] && info "自愈完成" || die "自愈失败，仍有 ${missing} 个文件缺失，请手动 git reset --hard"
  fi
}

# 坑 3：remote-tracking 丢失时直接写 ref 文件
fix_remote_refs() {
  [[ $DRY_RUN -eq 1 ]] && return 0
  local br sha
  for br in "$DEV_BRANCH" "$PUB_BRANCH"; do
    sha=$(git rev-parse --verify "refs/heads/$br" 2>/dev/null || true)
    [[ -z "$sha" ]] && continue
    if ! git rev-parse --verify -q "refs/remotes/$REMOTE/$br" >/dev/null; then
      mkdir -p ".git/refs/remotes/$REMOTE"
      printf '%s\n' "$sha" > ".git/refs/remotes/$REMOTE/$br"
      info "已重建 refs/remotes/$REMOTE/$br -> ${sha:0:7}"
    fi
  done
}

# 剔除单个路径：索引删除 + 同盘 mv（坑 1 规避）
prune_path() {
  local p="$1" backup_dir="$2"
  [[ -e "$p" ]] || { warn "跳过（不存在）：$p"; return 0; }

  if [[ -n "$(git ls-files -- "$p")" ]]; then
    run git rm -r --cached -q -- "$p"
  fi

  local dst="$backup_dir/$p"
  mkdir -p "$(dirname "$dst")"
  run mv -- "$p" "$dst"
  info "已剔除：$p"
}

# ============================================================ 主流程 ========
step "0/7 前置检查"
git rev-parse --git-dir >/dev/null 2>&1 || die "当前目录不是 git 仓库"
REPO_ROOT=$(git rev-parse --show-toplevel)
cd "$REPO_ROOT"

[[ "$(git rev-parse --abbrev-ref HEAD)" == "$DEV_BRANCH" ]] \
  || die "请先切到 $DEV_BRANCH 分支（当前：$(git rev-parse --abbrev-ref HEAD)）"
[[ -z "$(git status --porcelain)" ]] || die "工作树不干净，请先提交或暂存改动"
git rev-parse --verify -q "refs/heads/$PUB_BRANCH" >/dev/null || die "发布分支 $PUB_BRANCH 不存在"

NODE=$(resolve_node)
info "仓库：$REPO_ROOT"
info "流程：$DEV_BRANCH -> $PUB_BRANCH -> push $REMOTE（node=$NODE）"

BACKUP_DIR="${BACKUP_ROOT:-$(dirname "$REPO_ROOT")/_publish_backup_$(date +%Y%m%d_%H%M%S)}"
info "备份目录：$BACKUP_DIR"

step "1/7 切到发布分支并合并开发分支"
run git checkout "$PUB_BRANCH"
guard_worktree

if ! run git merge --no-edit -X theirs "$DEV_BRANCH"; then
  if [[ -f .git/MERGE_HEAD ]]; then
    warn "合并存在冲突，按「发布版一律不要被裁文件」处理（冲突文件取删除）"
    git diff --name-only --diff-filter=U | while read -r f; do
      [[ -z "$f" ]] && continue
      run git rm -f --cached -q -- "$f"
      [[ -e "$f" ]] && run mv -- "$f" "$BACKUP_DIR/conflict_$(basename "$f")"
    done
  else
    die "合并 $DEV_BRANCH 失败，请手动处理"
  fi
fi
guard_worktree

step "2/7 剔除开发过程资产（索引删除 + 同盘 mv）"
mkdir -p "$BACKUP_DIR"
PRUNED=()
for p in "${PRUNE_PATHS[@]}"; do
  if [[ -e "$p" ]]; then
    prune_path "$p" "$BACKUP_DIR"
    PRUNED+=("$p")
  fi
done
info "共剔除 ${#PRUNED[@]} 项"

step "3/7 扫描死链（指向已剔除内容的引用）"
if git grep -nE "$DEADREF_PATTERN" -- . >/dev/null 2>&1; then
  warn "以下位置仍引用已剔除内容，请人工处理："
  git grep -nE "$DEADREF_PATTERN" -- . || true
  [[ $ASSUME_YES -eq 1 ]] || confirm "仍要继续提交吗？" || die "已中止"
else
  info "无死链"
fi

step "4/7 验证"
if [[ $DO_VERIFY -eq 1 ]]; then
  if [[ $DRY_RUN -eq 1 ]]; then
    info "[dry-run] 跳过 vitest / vue-tsc"
  else
    "$NODE" node_modules/vitest/vitest.mjs run || die "vitest 未通过"
    "$NODE" node_modules/vue-tsc/bin/vue-tsc.js --noEmit || die "vue-tsc 未通过"
    info "vitest + vue-tsc 通过"
  fi
else
  warn "已跳过验证（--no-verify）"
fi

step "5/7 提交"
if [[ ${#PRUNED[@]} -eq 0 && -z "$(git status --porcelain)" ]]; then
  info "无变更可提交"
else
  MSG_FILE=$(mktemp)
  {
    echo "发布极简纯净版到 $PUB_BRANCH：剔除开发过程资产"
    echo
    echo "剔除 ${#PRUNED[@]} 项（已备份至 $(basename "$BACKUP_DIR")）："
    for p in "${PRUNED[@]}"; do echo "  - $p"; done
    echo
    if [[ $DO_VERIFY -eq 1 && $DRY_RUN -eq 0 ]]; then
      echo "验证：vitest + vue-tsc 通过"
    else
      echo "验证：已跳过"
    fi
    echo "由 scripts/publish-clean.sh 生成"
  } > "$MSG_FILE"

  if [[ $DRY_RUN -eq 1 ]]; then
    info "[dry-run] 将提交以下内容："; sed 's/^/  | /' "$MSG_FILE"
  else
    run git add -A
    run git commit -q -F "$MSG_FILE"
    info "已提交 $(git rev-parse --short HEAD)"
  fi
  rm -f "$MSG_FILE"
fi

step "6/7 推送"
if [[ $DO_PUSH -eq 0 ]]; then
  warn "已跳过推送（--no-push）"
else
  if [[ $DRY_RUN -eq 1 ]]; then
    info "[dry-run] git push --force-with-lease $REMOTE $PUB_BRANCH"
  else
    confirm "将强推 $PUB_BRANCH 覆盖 $REMOTE/$PUB_BRANCH，确认？" || die "已中止"
    git push --force-with-lease "$REMOTE" "$PUB_BRANCH" || die "推送失败"
    info "已推送 $REMOTE/$PUB_BRANCH"
    fix_remote_refs
  fi
fi

step "7/7 切回开发分支"
run git checkout "$DEV_BRANCH"
guard_worktree
fix_remote_refs

step "完成"
info "发布分支：$PUB_BRANCH -> $(git rev-parse --short "$PUB_BRANCH")"
info "当前分支：$(git rev-parse --abbrev-ref HEAD)"
info "备份位置：$BACKUP_DIR"
warn "提醒：$DEV_BRANCH 仍保留过程文档与调试样本，下次发布需重跑本脚本"
