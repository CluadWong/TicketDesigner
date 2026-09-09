#!/usr/bin/env bash
# scripts/release.sh —— 一键发布：升版本 → 构建 → 发布 npm → 推 GitHub(release + main)
#
# 用法：
#   npm run release                        # patch 升版 + 构建 + 发布 + 推 release/main
#   npm run release -- minor               # 升 minor
#   npm run release -- --otp=123456        # 带 2FA OTP 发布（OTP 30s 有效、一次性）
#   npm run release -- minor --otp=123456
#   npm run release -- --no-push           # 只发布到 npm，不推 GitHub
#   npm run release -- --no-publish        # 只构建+提交+推 GitHub，不发 npm
#   npm run release -- --dry-run           # 仅打印将执行的步骤，不做任何改动
#
# 前置条件：
#   - 当前在 release 分支、工作树干净
#   - 已 `npm login` 且账号拥有 @aikkk scope
#   - 本机无指向 10.8.0.102 的 .npmrc（否则 @aikkk 会被重定向到 GitLab）
set -euo pipefail

BUMP=patch
OTP=""
DO_PUSH=1
DO_PUBLISH=1
DRY=0

for a in "$@"; do
  case "$a" in
    patch|minor|major) BUMP="$a" ;;
    --otp=*) OTP="${a#*=}" ;;
    --no-push) DO_PUSH=0 ;;
    --no-publish) DO_PUBLISH=0 ;;
    --dry-run) DRY=1 ;;
    -h|--help) sed -n '2,18p' "$0"; exit 0 ;;
    *) echo "未知参数: $a" >&2; exit 2 ;;
  esac
done

c_reset=$'\033[0m'; c_bold=$'\033[1m'; c_green=$'\033[32m'
info() { printf '%s[release]%s %s\n' "$c_green" "$c_reset" "$*"; }
run() { if [ $DRY -eq 1 ]; then printf '%s[dry-run]%s %s\n' "$c_bold" "$c_reset" "$*"; else "$@"; fi }

# ---- 守卫 ----
[ "$(git rev-parse --abbrev-ref HEAD)" = "release" ] \
  || { echo "请先切到 release 分支（当前：$(git rev-parse --abbrev-ref HEAD)）" >&2; exit 1; }
[ -z "$(git status --porcelain)" ] \
  || { echo "工作树不干净，请先提交或暂存改动" >&2; exit 1; }

info "1/4 升版本 ($BUMP)"
run npm version "$BUMP" -m "release: v%s"

info "2/4 构建库与类型声明"
run npm run build:lib
run npm run build:types

if [ $DO_PUBLISH -eq 1 ]; then
  info "3/4 发布到 npmjs（@aikkk/ticket-designer）"
  PUB=()
  [ -n "$OTP" ] && PUB+=(--otp "$OTP")
  # 发布前再确认 scope 没被本机 .npmrc 重定向到内网 GitLab
  if grep -q "10.8.0.102" .npmrc 2>/dev/null; then
    echo "检测到 .npmrc 含 10.8.0.102，@aikkk 会被重定向到 GitLab，已中止" >&2
    exit 1
  fi
  run npm publish "${PUB[@]}"
else
  info "3/4 跳过 npm 发布 (--no-publish)"
fi

if [ $DO_PUSH -eq 1 ]; then
  info "4/4 推 GitHub：release + main（+ tags）"
  run git push github release
  # main 为 release 的历史前缀，release:main 是快进推送（无需强推）
  run git push github release:main
  run git push github --tags
else
  info "4/4 跳过 GitHub 推送 (--no-push)"
fi

info "完成"
