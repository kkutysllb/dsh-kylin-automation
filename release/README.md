# 版本发布说明 / Release Notes

本目录是 dsh-kylin-automation 的版本发布事实源：每个发布版本一份
`v<semver>.md`，与 git tag 一一对应。`package.json` 的 `version` 是 KCoder
插件管理检测新版本的信号——**每次发布必须 bump 版本号**；检测到新版本后由
用户手动更新。

## 版本索引

| 版本 | 日期 | 说明 |
|---|---|---|
| [v0.1.1](v0.1.1.md) | 2026-09-16 | 深浅色主题自适应：颜色改走宿主 --dsw-alias-* token，修复深色下页面不可读 |
| [v0.1.0](v0.1.0.md) | 2026-09-16 | 首个发布：调度/执行/历史 + Web 侧边栏独立页面 + Agent 工具（双入口管理） |

## 发版约定

每个版本说明固定以下章节（缺项写「无」）：

1. **版本信息**：版本号 / 日期 / tag / 功能提交 / 发布渠道
2. **新增**：新功能、新文件、新渠道
3. **变更**：行为、默认值、文档、元数据的改动
4. **修复**：缺陷修复（写清症状 → 根因 → 修后行为）
5. **删除**：移除的功能、文件、渠道
6. **兼容性与升级说明**：接口契约、配置语义的变化；升级方式
7. **验证**：本版本实际跑过的验证与结果

## 发版 checklist

1. `package.json` bump `version`（semver：修复 → patch，功能 → minor，破坏性 → major）
2. `pnpm check && node scripts/smoke-plugin.mjs` 全绿（typecheck + 47 用例 + 双 bundle + 冒烟）
3. 写 `release/vX.Y.Z.md`（对照上述章节）
4. 提交并打 tag：`git tag -a vX.Y.Z -m "..."`
5. 推送（含 tag）：`git push origin main --tags`
6. npm 渠道（主渠道，版本可被插件管理检测）：
   ```sh
   npm whoami            # 首次：npm login
   npm publish           # prepack 自动跑 check + smoke
   # 首发建议显式 --access public（package.json publishConfig 已声明，可省）
   ```
   发布后确认 npmmirror 同步：`npm view dsh-kylin-automation version`（同步通常 10 分钟内）
7. GitHub Release 页面：`node scripts/create-github-releases.mjs`
   （把 `release/vX.Y.Z.md` 发布为对应 tag 的 Release 页面；幂等可重跑；需 gh CLI 已登录）
8. 镜像仓对账：`node scripts/sync-to-dsh-plugins.mjs && cd ../dsh-plugins && git add -A && git commit -m "sync dsh-kylin-automation vX.Y.Z" && git push`
   再回本仓 `node scripts/sync-to-dsh-plugins.mjs --check` 零差异
9. 双入口对账：npm / GitHub / dsh-plugins 三个安装源包内容一致（files 白名单为准）

## 安装渠道

```sh
# npm registry（推荐：版本检测 + 手动更新）
dsh plugin --profile web add dsh-kylin-automation

# GitHub 直装
dsh plugin --profile web add github:kkutysllb/dsh-kylin-automation#v0.1.0

# dsh-plugins 镜像仓子目录（pnpm 路径安装）
git clone git@github.com:kkutysllb/dsh-plugins.git
dsh plugin --profile web add ./dsh-plugins/dsh-kylin-automation
```

安装后重启 `dsh web`（或 KCoder）生效。
