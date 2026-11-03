/**
 * Localization and distribution panels.
 *
 * Keys are flat and namespace-prefixed (`ship.…`) because the runtime
 * merges every catalog into one flat map. `zh-Hans` is typed
 * `Record<ShipKey, string>` so a missing translation fails the build
 * instead of leaking English into a Chinese UI.
 *
 * Raw Ren'Py/tool output (stdout, stderr, lint summaries, exit codes) and
 * identifiers (language codes, package ids, file paths) are data, not
 * chrome — they are interpolated or rendered verbatim, never translated.
 */

const en = {
  // Shared by both Ship surfaces: a labelled failure box.
  "ship.errorLabel": "Error:",

  // Languages — translation coverage dashboard
  "ship.languages.eyebrow": "Coverage",
  "ship.languages.heading": "Languages",
  "ship.languages.subtitlePre": "Per-language translation progress, sourced from",
  "ship.languages.subtitlePost": ".",
  "ship.languages.loadingCoverage": "Loading coverage…",
  "ship.languages.emptyPre":
    "No translations exist yet. Add a language below to scaffold one via Ren'Py's",
  "ship.languages.emptyPost": "command.",
  "ship.languages.addPlaceholder": "add language (e.g. spanish)",
  "ship.languages.scaffolding": "Scaffolding…",
  "ship.languages.scaffold": "Scaffold",
  "ship.languages.staleHeading": "Stale strings · {language}",
  "ship.languages.entry": "{count} entry",
  "ship.languages.entries": "{count} entries",
  "ship.languages.staleEmpty":
    "Nothing stale — every entry has a non-empty translation that differs from its source.",
  "ship.languages.matchesSource": '→ "{text}" (matches source)',
  "ship.languages.targetEmpty": "→ (empty)",
  "ship.languages.exited": "renpy.sh translate exited {code}",
  "ship.languages.rerunTitle": "Re-run renpy.sh translate to refresh scaffolding",

  // Ship panel — raw lint output
  "ship.build.heading": "Ship",
  "ship.build.diagnostics": "Diagnostics",
  "ship.build.rawHeading": "Raw lint output",
  "ship.build.rawHintPre": "The summary count lives in the header. This panel keeps the raw",
  "ship.build.rawHintPost": "stdout/stderr for power-use diagnosis.",
  "ship.build.running": "Running…",
  "ship.build.runLint": "Run lint",
  "ship.build.noLintRun": "No lint run yet.",
  "ship.build.exitCode": "exit code: {code}",
  "ship.build.emptyStdout": "(empty stdout)",
  // Technical stream divider inside the verbatim log block: kept identical in
  // both locales, because "stderr" is a stream name, not prose.
  "ship.build.stderrDivider": "\n--- stderr ---\n",

  // Ship panel — distribute section
  "ship.build.unknownPath": "(unknown)",
  "ship.build.platform.pcHint": "Windows + Linux zip",
  "ship.build.platform.macHint": "universal zip",
  "ship.build.platform.linuxHint": "x86_64 tarball",
  "ship.build.platform.webHint": "browser export",
  "ship.build.platform.steamHint": "depot bundle",
  "ship.build.distribute": "Distribute",
  "ship.build.compileFor": "Compile for…",
  "ship.build.compiling": "Compiling…",
  "ship.build.buildDistribution": "Build distribution",
  "ship.build.outputDir": "Output directory",
  "ship.build.optional": "(optional)",
  "ship.build.outputPlaceholder": "leave empty to put artifacts next to the project folder",
  "ship.build.defaultLabel": "Default:",
  "ship.build.selectTarget": "Select at least one target.",
  "ship.build.targetOne": "{count} target",
  "ship.build.targetMany": "{count} targets",
  "ship.build.artifactOne": "{count} artifact produced",
  "ship.build.artifactMany": "{count} artifacts produced",
  "ship.build.inDirectory": "in",
  "ship.build.noArtifactsPre":
    "renpy.sh exited {code} but no artifacts were found. Check the build log below — the package name(s) may not be defined in this project's",
  "ship.build.noArtifactsPost": ".",
  "ship.build.noTargets": "(no targets)",
  "ship.build.warningOne": "{count} scaffold warning",
  "ship.build.warningMany": "{count} scaffold warnings",
  "ship.build.warningsHint":
    "These template leftovers can pass lint but break the built game at startup.",
  "ship.build.repairing": "Repairing…",
  "ship.build.repairScaffold": "Repair scaffold",
  "ship.build.fixLabel": "Fix:",
  "ship.build.noSummary": "(no summary)",
  "ship.build.rerunToClean": "Re-run the build to produce a clean artifact.",
};

export type ShipKey = keyof typeof en;

const zhHans: Record<ShipKey, string> = {
  "ship.errorLabel": "错误：",

  "ship.languages.eyebrow": "覆盖率",
  "ship.languages.heading": "语言",
  "ship.languages.subtitlePre": "按语言统计的翻译进度，数据来自",
  "ship.languages.subtitlePost": "。",
  "ship.languages.loadingCoverage": "正在加载覆盖率…",
  "ship.languages.emptyPre": "尚无任何翻译。在下方添加一种语言，即可通过 Ren'Py 的",
  "ship.languages.emptyPost": "命令生成脚手架。",
  "ship.languages.addPlaceholder": "添加语言（例如 spanish）",
  "ship.languages.scaffolding": "正在生成脚手架…",
  "ship.languages.scaffold": "生成脚手架",
  "ship.languages.staleHeading": "过期字符串 · {language}",
  "ship.languages.entry": "{count} 条",
  "ship.languages.entries": "{count} 条",
  "ship.languages.staleEmpty": "没有过期条目 —— 每条记录都有非空且与原文不同的翻译。",
  "ship.languages.matchesSource": "→“{text}”（与原文相同）",
  "ship.languages.targetEmpty": "→（空）",
  "ship.languages.exited": "renpy.sh translate 退出，退出码 {code}",
  "ship.languages.rerunTitle": "重新运行 renpy.sh translate 以刷新脚手架",

  "ship.build.heading": "发布",
  "ship.build.diagnostics": "诊断",
  "ship.build.rawHeading": "lint 原始输出",
  "ship.build.rawHintPre": "统计数字显示在顶栏；本面板保留",
  "ship.build.rawHintPost": "的原始 stdout/stderr，供进阶诊断使用。",
  "ship.build.running": "正在运行…",
  "ship.build.runLint": "运行 lint",
  "ship.build.noLintRun": "尚未运行 lint。",
  "ship.build.exitCode": "退出码：{code}",
  "ship.build.emptyStdout": "（stdout 为空）",
  "ship.build.stderrDivider": "\n--- stderr ---\n",

  "ship.build.unknownPath": "（未知）",
  "ship.build.platform.pcHint": "Windows + Linux 压缩包",
  "ship.build.platform.macHint": "通用压缩包",
  "ship.build.platform.linuxHint": "x86_64 tar 包",
  "ship.build.platform.webHint": "浏览器导出",
  "ship.build.platform.steamHint": "depot 包",
  "ship.build.distribute": "打包分发",
  "ship.build.compileFor": "构建目标…",
  "ship.build.compiling": "正在构建…",
  "ship.build.buildDistribution": "构建分发包",
  "ship.build.outputDir": "输出目录",
  "ship.build.optional": "（可选）",
  "ship.build.outputPlaceholder": "留空则把产物放在项目文件夹旁边",
  "ship.build.defaultLabel": "默认：",
  "ship.build.selectTarget": "请至少选择一个目标平台。",
  "ship.build.targetOne": "{count} 个目标平台",
  "ship.build.targetMany": "{count} 个目标平台",
  "ship.build.artifactOne": "已生成 {count} 个产物",
  "ship.build.artifactMany": "已生成 {count} 个产物",
  "ship.build.inDirectory": "位于",
  "ship.build.noArtifactsPre":
    "renpy.sh 退出码为 {code}，但没有找到任何产物。请查看下方构建日志 —— 本项目的",
  "ship.build.noArtifactsPost": " 中可能未定义包名。",
  "ship.build.noTargets": "（无目标平台）",
  "ship.build.warningOne": "{count} 个脚手架警告",
  "ship.build.warningMany": "{count} 个脚手架警告",
  "ship.build.warningsHint": "这些模板残留能通过 lint，但会让构建出的游戏在启动时出错。",
  "ship.build.repairing": "正在修复…",
  "ship.build.repairScaffold": "修复脚手架",
  "ship.build.fixLabel": "修复：",
  "ship.build.noSummary": "（无摘要）",
  "ship.build.rerunToClean": "重新构建一次，以生成干净的产物。",
};

export const ship = { en, "zh-Hans": zhHans };
