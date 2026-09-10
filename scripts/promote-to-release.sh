#!/usr/bin/env bash
# scripts/promote-to-release.sh —— 将 dev 的迭代安全提升到 release（对外公共分支）
#
# 解决「直接 git merge dev」会带来的问题：
#   1. 包名回退（dev 仍是内部开发分支，可能带不同包名/协议）—— 合并后恢复 release 的
#      **发布身份字段**（name/license/repository/publishConfig/files/peerDependencies + scripts.release|promote），
#      由 scripts/merge-package-json.mjs 按字段覆盖，**不整体覆盖 package.json**（否则会把 dev 的合法改动一并吞掉）
#   2. GitLab CI 泄漏（.gitlab-ci.yml 只在 dev）—— 合并后删除
#   3. 过程文档 / demo 回流 —— 合并后按清单裁剪
#   4. 推送目标错乱 —— 默认只本地提交，--push 仅推 origin release（不碰其他 remote）
#
# 用法：
#   scripts/promote-to-release.sh            # 合并 + 裁剪 + 验证 + 本地提交（不推送）
#   scripts/promote-to-release.sh --push     # 提交后再推 origin release
#   scripts/promote-to-release.sh --no-verify# 跳过 vitest / vue-tsc
#   scripts/promote-to-release.sh --dry-run  # 仅打印步骤，不改动
#
# 前置：在 release 分支、工作树干净。发版请用随后的 `npm run release -- --otp=xxxx`。
set -euo pipefail

DO_PUSH=0
DO_VERIFY=1
DRY=0
for a in "$@"; do
  case "$a" in
    --push) DO_PUSH=1 ;;
    --no-verify) DO_VERIFY=0 ;;
    --dry-run) DRY=1 ;;
    -h|--help) sed -n '2,16p' "$0"; exit 0 ;;
    *) echo "未知参数: $a" >&2; exit 2 ;;
  esac
done

c_reset=$'\033[0m'; c_bold=$'\033[1m'; c_green=$'\033[32m'
info() { printf '%s[promote]%s %s\n' "$c_green" "$c_reset" "$*"; }
run() { if [ $DRY -eq 1 ]; then printf '%s[dry-run]%s %s\n' "$c_bold" "$c_reset" "$*"; else "$@"; fi; }

[ "$(git rev-parse --abbrev-ref HEAD)" = "release" ] \
  || { echo "请先切到 release 分支（当前：$(git rev-parse --abbrev-ref HEAD)）" >&2; exit 1; }
[ -z "$(git status --porcelain)" ] \
  || { echo "工作树不干净，请先提交或暂存改动" >&2; exit 1; }

# release 侧权威的 package.json 先备份，合并后恢复「发布身份」字段
# 注意：只恢复身份字段（name/license/repository/publishConfig/...），**不做整体覆盖** ——
# 整体覆盖会把 dev 的合法改动一并吞掉（2026-09-10 踩中：exports["./style.css"] 的修复被丢弃）。
PKG_BAK="$(mktemp)"
run cp package.json "$PKG_BAK"

info "1/6 合并 dev（代码冲突取 dev 侧 -X theirs）"
run git merge --no-edit -X theirs dev || {
  echo "合并产生需人工解决的冲突，请处理后重试" >&2; exit 1;
}

info "2/6 恢复 release 的发布身份字段（@aikkk / MIT / GitHub / public）"
run node scripts/merge-package-json.mjs package.json "$PKG_BAK"
run git add package.json
rm -f "$PKG_BAK"

info "3/6 删除 GitLab 专用 .gitlab-ci.yml（公开分支不该有）"
if [ -e .gitlab-ci.yml ]; then run git rm -f --ignore-unmatch .gitlab-ci.yml; fi

info "4/6 裁剪开发过程资产"
PRUNE_PATHS=(
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
for p in "${PRUNE_PATHS[@]}"; do
  if [ -e "$p" ]; then run git rm -r --cached -q -- "$p" 2>/dev/null || true; fi
done

info "5/6 替换 docs/README.md 为对外模板"
if [ -f scripts/publish-assets/docs-README.clean.md ]; then
  run cp -f scripts/publish-assets/docs-README.clean.md docs/README.md
  run git add docs/README.md
fi

if [ $DO_VERIFY -eq 1 ]; then
  info "6/6 验证 vitest + vue-tsc"
  if [ $DRY -eq 0 ]; then
    node_modules/.bin/vitest run || { echo "vitest 未通过" >&2; exit 1; }
    node_modules/vue-tsc/bin/vue-tsc.js --noEmit || { echo "vue-tsc 未通过" >&2; exit 1; }
  else
    info "[dry-run] 跳过 vitest / vue-tsc"
  fi
else
  info "6/6 跳过验证（--no-verify）"
fi

if [ -z "$(git status --porcelain)" ]; then
  info "无变更（dev 已是 release 的祖先，或内容一致），无需提交"
  exit 0
fi

MSG="promote: 合并 dev 到 release（裁剪过程资产 / 保留 @aikkk 包名 / 去除 GitLab CI）"
if [ $DRY -eq 0 ]; then
  git commit -q -m "$MSG"
  info "已提交 $(git rev-parse --short HEAD)"
else
  info "[dry-run] 将提交：$MSG"
fi

if [ $DO_PUSH -eq 1 ]; then
  info "推送 origin release"
  run git push origin release
else
  info "未推送（加 --push 可推 origin release；发版请用 npm run release）"
fi

info "完成。随后发版：npm run release -- --otp=<6位码>"
