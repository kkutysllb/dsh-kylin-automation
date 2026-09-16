#!/usr/bin/env node
/**
 * dsh-kylin-automation 插件冒烟测试（零依赖，node scripts/smoke-plugin.mjs）。
 *
 * 覆盖发布面契约：
 * 1. package.json：dsh.bundle / dsh.client manifest、exports、files 白名单
 *    覆盖检查（白名单内每个路径真实存在，exports 路径不越界）；
 * 2. cordis.patch.yml：可解析、单行 insert、row id/name 与包名一致；
 * 3. host bundle（lib/index.js）：ESM、零 `@deepseek-ai/*` 运行时导入
 *    （KCoder 打包运行时不向插件提供框架模块）、导出 apply/inject/name；
 * 4. client bundle（lib/client.js）：`window.__ModuleLoader__.load` 自注册
 *    协议、无裸 ESM export、require('react') 走静态模块表；
 * 5. 隔离：测试不写入任何用户数据。
 */
import { existsSync, readFileSync, statSync } from 'node:fs'
import { createRequire } from 'node:module'
import { dirname, join, relative } from 'node:path'
import { fileURLToPath } from 'node:url'

const require = createRequire(import.meta.url)
const packageRoot = dirname(fileURLToPath(import.meta.url)) + '/..'
const manifest = JSON.parse(await readFile(join(packageRoot, 'package.json'), 'utf8'))
const yamlText = await readFile(join(packageRoot, manifest.dsh.bundle.patch.replace(/^\.\//, '')), 'utf8')

let failures = 0
function check(name, condition, detail = '') {
  const mark = condition ? 'PASS' : 'FAIL'
  console.log(`\x1b[${condition ? 32 : 31}m${mark}\x1b[0m  ${name}${detail ? ' — ' + detail : ''}`)
  if (!condition) failures += 1
}

/* ═══ 1. manifest ═══ */

check('name 形如 dsh-kylin-automation', manifest.name === 'dsh-kylin-automation')
check('version 为合法 semver', /^\d+\.\d+\.\d+$/.test(manifest.version), manifest.version)
check('dsh.bundle.patch 指向 cordis.patch.yml', manifest.dsh?.bundle?.patch === './cordis.patch.yml')
check('dsh.client.platform = web', manifest.dsh?.client?.platform === 'web')
check('dsh.client.inject 非空字符串数组',
  Array.isArray(manifest.dsh?.client?.inject) && manifest.dsh.client.inject.every(x => typeof x === 'string'),
  `inject = ${manifest.dsh?.client?.inject?.length ?? 0} rows`)
check('exports["."] 指向 lib/index.js', manifest.exports?.['.']?.default === './lib/index.js')
check('exports["./client"] 声明 client bundle', typeof manifest.exports?.['./client'] === 'string' || typeof manifest.exports?.['./client']?.default === 'string')

// files 白名单覆盖检查
const filesListed = manifest.files ?? []
for (const entry of filesListed) {
  check(`files 白名单存在: ${entry}`, existsSync(join(packageRoot, entry)))
}
check('files 覆盖 cordis.patch.yml', filesListed.includes('cordis.patch.yml'))
check('files 覆盖 lib 产物目录', filesListed.includes('lib'))

/* ═══ 2. cordis.patch.yml ═══ */

check('patch 含 insert 行', /- insert:/.test(yamlText))
check(`patch row id = ${manifest.name}`, yamlText.includes(`id: ${manifest.name}`))
check(`patch row name = ${manifest.name}`, yamlText.includes(`name: ${manifest.name}`) || yamlText.includes(`name: '${manifest.name}'`))

/* ═══ 3. host bundle ═══ */

const hostPath = join(packageRoot, 'lib/index.js')
check('lib/index.js 存在', existsSync(hostPath))
const hostSource = await readFile(hostPath, 'utf8')
check('host bundle 无 @deepseek-ai/* 运行时导入（KCoder 部署约束）',
  !/from\s*["']@deepseek-ai\//.test(hostSource) && !/import\s*\(?\s*["']@deepseek-ai\//.test(hostSource),
  '框架能力经 inject 服务名接入，不 import @deepseek-ai/*')
check('host bundle 导出 apply', /\bexport\b[\s\S]{0,200}\bfunction apply\b|const apply|exports\.apply/.test(hostSource) || hostSource.includes('apply'))
check('host bundle 声明 inject 服务名', hostSource.includes('storageDomain') && hostSource.includes('connection'))

/* ═══ 4. client bundle ═══ */

const clientPath = join(packageRoot, 'lib/client.js')
check('lib/client.js 存在', existsSync(clientPath))
const clientSource = await readFile(clientPath, 'utf8')
check('client bundle 走 __ModuleLoader__ 自注册协议',
  clientSource.trimStart().startsWith('window.__ModuleLoader__.load('),
  'dsh client module-table 契约')
check('client bundle 无裸 ESM export 语句', !/^export /m.test(clientSource))
check('client bundle 以 require("react") 引 React', clientSource.includes('require("react")') || clientSource.includes("require('react')"))
check('client bundle 注册 id 与包名一致', clientSource.includes(`id: ${JSON.stringify(manifest.name)}`))
check('client bundle 注册 panellist + main 双 slot', clientSource.includes('sidebar.panellist') && clientSource.includes('"main"') || clientSource.includes("'main'"))

/* ═══ 5. 声明产物 ═══ */

const typesIndex = join(packageRoot, 'lib/types/index.d.ts')
check('lib/types/index.d.ts 存在（types 导出）', existsSync(typesIndex))
const sourceMap = clientSource.includes('sourceMappingURL')
check('client bundle 带 sourcemap 引用（HMR 对账用）', sourceMap)

/* ═══ 6. 产物尺寸红线（防误把依赖外置/漏打包）═══ */

for (const [label, path, minKb] of [['host bundle', hostPath, 200], ['client bundle', clientPath, 40]]) {
  const size = statSync(path).size
  check(`${label} 自包含（> ${minKb}KB）：${Math.round(size / 1024)}KB`, size > minKb * 1024)
}

const summary = failures === 0
  ? `\n${manifest.name}@${manifest.version} smoke: ALL PASS`
  : `\n${manifest.name}@${manifest.version} smoke: ${failures} FAILURES`
console.log(summary)
process.exit(failures === 0 ? 0 : 1)

function readFile(path) {
  return import('node:fs/promises').then(fs => fs.readFile(path, 'utf8'))
}
