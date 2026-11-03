/**
 * Library tabs: characters, assets, variables, and mini-games.
 *
 * Keys are flat and namespace-prefixed (`library.…`) because the runtime
 * merges every catalog into one flat map. `zh-Hans` is typed
 * `Record<LibraryKey, string>` so a missing translation fails the build
 * instead of leaking English into a Chinese UI.
 */

const en = {
  // Library tabs
  "library.tab.characters": "Characters",
  "library.tab.charactersHint": "cast · display names",
  "library.tab.assets": "Assets",
  "library.tab.assetsHint": "bg · sprites · audio",
  "library.tab.variables": "Variables",
  "library.tab.variablesHint": "default values",
  "library.tab.screens": "Screens",
  "library.tab.screensHint": "screen blocks · imagemaps",
  "library.tab.minigames": "Mini-Games",
  "library.tab.minigamesHint": "screen scaffolds",

  // Shared by the panels in this group
  "library.error": "Error: {message}",

  // Characters
  "library.characters.title": "Characters",
  "library.characters.empty":
    "No characters defined yet. Add one with the renpy-mcp `add_character` tool.",
  "library.characters.var": "var: {name}",
  "library.characters.edit": "Edit character",
  "library.characters.variable": "Variable",
  "library.characters.displayName": "Display name",
  "library.characters.displayNamePlaceholder": "On-screen name",
  "library.characters.color": "Color",

  // Assets
  "library.assets.title": "Assets",
  "library.assets.backgrounds": "Backgrounds",
  "library.assets.sprites": "Sprites",
  "library.assets.music": "Music",
  "library.assets.sfx": "Sound FX",
  "library.assets.emptyBackgrounds": "No backgrounds found in this project.",
  "library.assets.emptySprites": "No sprites found in this project.",
  "library.assets.emptyMusic": "No music found in this project.",
  "library.assets.emptySfx": "No sound effects found in this project.",
  "library.assets.usedIn": "used in {count} place",
  "library.assets.usedInPlural": "used in {count} places",

  // Variables
  "library.variables.title": "Variables",
  "library.variables.all": "All",
  "library.variables.newDefault": "New default",
  "library.variables.colName": "Name",
  "library.variables.colKind": "Kind",
  "library.variables.colValue": "Value",
  "library.variables.colLocation": "Location",
  "library.variables.emptyFilter": "No variables in this filter.",
  "library.variables.editValue": "Edit value",
  "library.variables.readOnly": "read-only",
  "library.variables.cancelTitle": "Cancel (Esc)",
  "library.variables.saveTitle": "Save (Enter)",
  "library.variables.noticeBefore":
    "Only `default` declarations are editable here — they participate in save/load and rollback. `define` constants surface read-only; edit them via ",
  "library.variables.noticeAfter": " when the Build panel lands.",
  "library.variables.name": "Name",
  "library.variables.valueLabel": "Value (raw Python literal)",
  "library.variables.identifierError":
    "Must be a valid Python identifier (letters, digits, _; cannot start with digit).",
  "library.variables.creating": "Creating…",
  "library.variables.create": "Create",

  // Mini-games
  "library.minigames.title": "Mini-Games",
  "library.minigames.newScaffold": "New scaffold",
  "library.minigames.empty": "No minigames scaffolded yet.",
  "library.minigames.emptyHintBefore": "A scaffold creates a ",
  "library.minigames.emptyHintAnd": " plus a ",
  "library.minigames.emptyHintAfter": " that calls it and jumps on return.",
  "library.minigames.colName": "Name",
  "library.minigames.colScreen": "Screen",
  "library.minigames.colEntryLabel": "Entry label",
  "library.minigames.missingScreen": "missing (expected {name}_minigame)",
  "library.minigames.missingLabel": "missing (expected {name}_play)",
  "library.minigames.noticeBefore":
    "The scaffold's screen body is a placeholder that auto-returns after 5 seconds — drop your real minigame UI into the screen, then the ",
  "library.minigames.noticeAfter":
    " label is already wired to call it and jump onward.",
  "library.minigames.modalTitle": "New minigame scaffold",
  "library.minigames.name": "Name",
  "library.minigames.createsBefore": "Creates ",
  "library.minigames.createsAnd": " and ",
  "library.minigames.createsAfter": ".",
  "library.minigames.identifierError": "Must be a valid Python identifier.",
  "library.minigames.collisionBefore": "A minigame with prefix ",
  "library.minigames.collisionAfter": " already exists.",
  "library.minigames.onCompleteLabel": "On-complete label",
  "library.minigames.jumpBefore": "The ",
  "library.minigames.jumpMid": " label will ",
  "library.minigames.jumpAfter": " here after the screen returns.",
  "library.minigames.labelIdentifierError": "Must be a valid label identifier.",
  "library.minigames.showTargets": "Show file targets",
  "library.minigames.hideTargets": "Hide file targets",
  "library.minigames.screensFile": "Screens file (optional)",
  "library.minigames.labelFile": "Label file (optional)",
  "library.minigames.scaffolding": "Scaffolding…",
  "library.minigames.scaffold": "Scaffold",
};

export type LibraryKey = keyof typeof en;

const zhHans: Record<LibraryKey, string> = {
  // Library tabs
  "library.tab.characters": "角色",
  "library.tab.charactersHint": "出场角色 · 显示名称",
  "library.tab.assets": "素材",
  "library.tab.assetsHint": "背景 · 立绘 · 音频",
  "library.tab.variables": "变量",
  "library.tab.variablesHint": "默认值",
  "library.tab.screens": "界面",
  "library.tab.screensHint": "界面块 · 图像映射",
  "library.tab.minigames": "小游戏",
  "library.tab.minigamesHint": "界面脚手架",

  "library.error": "错误：{message}",

  // Characters
  "library.characters.title": "角色",
  "library.characters.empty":
    "还没有定义任何角色。可用 renpy-mcp 的 `add_character` 工具添加。",
  "library.characters.var": "变量：{name}",
  "library.characters.edit": "编辑角色",
  "library.characters.variable": "变量",
  "library.characters.displayName": "显示名称",
  "library.characters.displayNamePlaceholder": "游戏内显示名称",
  "library.characters.color": "颜色",

  // Assets
  "library.assets.title": "素材",
  "library.assets.backgrounds": "背景",
  "library.assets.sprites": "立绘",
  "library.assets.music": "音乐",
  "library.assets.sfx": "音效",
  "library.assets.emptyBackgrounds": "此项目中未找到背景。",
  "library.assets.emptySprites": "此项目中未找到立绘。",
  "library.assets.emptyMusic": "此项目中未找到音乐。",
  "library.assets.emptySfx": "此项目中未找到音效。",
  "library.assets.usedIn": "用于 {count} 处",
  "library.assets.usedInPlural": "用于 {count} 处",

  // Variables
  "library.variables.title": "变量",
  "library.variables.all": "全部",
  "library.variables.newDefault": "新建 default 变量",
  "library.variables.colName": "名称",
  "library.variables.colKind": "类型",
  "library.variables.colValue": "值",
  "library.variables.colLocation": "位置",
  "library.variables.emptyFilter": "当前筛选条件下没有变量。",
  "library.variables.editValue": "编辑值",
  "library.variables.readOnly": "只读",
  "library.variables.cancelTitle": "取消（Esc）",
  "library.variables.saveTitle": "保存（Enter）",
  "library.variables.noticeBefore":
    "这里只能编辑 `default` 声明 —— 它们会参与存档/读档和回滚。`define` 常量以只读方式展示；待构建面板上线后，可通过 ",
  "library.variables.noticeAfter": " 修改。",
  "library.variables.name": "名称",
  "library.variables.valueLabel": "值（原始 Python 字面量）",
  "library.variables.identifierError":
    "必须是合法的 Python 标识符（字母、数字、_；不能以数字开头）。",
  "library.variables.creating": "创建中…",
  "library.variables.create": "创建",

  // Mini-games
  "library.minigames.title": "小游戏",
  "library.minigames.newScaffold": "新建脚手架",
  "library.minigames.empty": "还没有生成任何小游戏脚手架。",
  "library.minigames.emptyHintBefore": "脚手架会创建一个 ",
  "library.minigames.emptyHintAnd": "，以及一个 ",
  "library.minigames.emptyHintAfter": "，由后者调用并在返回后继续跳转。",
  "library.minigames.colName": "名称",
  "library.minigames.colScreen": "界面",
  "library.minigames.colEntryLabel": "入口 label",
  "library.minigames.missingScreen": "缺失（应为 {name}_minigame）",
  "library.minigames.missingLabel": "缺失（应为 {name}_play）",
  "library.minigames.noticeBefore":
    "脚手架的界面主体只是占位实现，5 秒后会自动返回 —— 把真正的小游戏界面放进这个 screen，",
  "library.minigames.noticeAfter": " label 已经接好了调用与跳转。",
  "library.minigames.modalTitle": "新建小游戏脚手架",
  "library.minigames.name": "名称",
  "library.minigames.createsBefore": "将创建 ",
  "library.minigames.createsAnd": " 和 ",
  "library.minigames.createsAfter": "。",
  "library.minigames.identifierError": "必须是合法的 Python 标识符。",
  "library.minigames.collisionBefore": "前缀为 ",
  "library.minigames.collisionAfter": " 的小游戏已存在。",
  "library.minigames.onCompleteLabel": "完成时跳转 label",
  "library.minigames.jumpBefore": "screen 返回后，",
  "library.minigames.jumpMid": " label 会执行 ",
  "library.minigames.jumpAfter": " 跳到这里。",
  "library.minigames.labelIdentifierError": "必须是合法的 label 标识符。",
  "library.minigames.showTargets": "显示文件目标",
  "library.minigames.hideTargets": "隐藏文件目标",
  "library.minigames.screensFile": "界面文件（可选）",
  "library.minigames.labelFile": "label 文件（可选）",
  "library.minigames.scaffolding": "正在生成…",
  "library.minigames.scaffold": "生成脚手架",
};

export const library = { en, "zh-Hans": zhHans };
