/**
 * Scene inspector, composer editors, and the screens panel.
 *
 * Keys are flat and namespace-prefixed (`inspector.…`) because the
 * runtime merges every catalog into one flat map. `zh-Hans` is typed
 * `Record<InspectorKey, string>` so a missing translation fails the
 * build instead of leaking English into a Chinese UI.
 */

const en = {
  // SceneInspector shell
  "inspector.kindFallback": "Scene",
  "inspector.closeInspector": "Close inspector",
  "inspector.loadingScene": "Loading scene…",
  "inspector.errorPrefix": "Error: {message}",

  // Sections
  "inspector.background": "Background",
  "inspector.music": "Music",
  "inspector.outgoing": "Outgoing ({count})",
  "inspector.endsWithReturn": "Ends with `return`.",
  "inspector.noOutgoing": "No outgoing jumps.",
  "inspector.body": "Body ({count})",
  "inspector.unparsed": "Unparsed ({count})",
  "inspector.unparsedHint":
    "These lines weren't recognized by the parser. Edit with the renpy-mcp tools or a text editor — the GUI will not modify them.",

  // Background / music edit forms
  "inspector.musicPlaceholder": "audio/spring_theme.ogg (or empty for stop music)",
  "inspector.loop": "loop",
  "inspector.stopMusic": "Stop music",
  "inspector.setMusic": "Set music",
  "inspector.noSceneLine":
    "No `scene` line — this label doesn't set a background. Edit via tools for now.",
  "inspector.swapBackground": "Swap background",

  // Dialogue
  "inspector.narration": "(narration)",
  "inspector.narrationLabel": "narration",
  "inspector.dialoguePlaceholder": "Add a dialogue line…",
  "inspector.adding": "Adding…",
  "inspector.addLine": "Add line",
  "inspector.noBody": "No body yet.",

  // Event stream counts
  "inspector.choiceCountOne": "{count} choice",
  "inspector.choiceCountMany": "{count} choices",
  "inspector.branchCountOne": "{count} branch",
  "inspector.branchCountMany": "{count} branches",
  "inspector.noArg": "(no arg)",

  // Insert-event popup
  "inspector.insertEvent": "Insert event",
  "inspector.insert.pause": "Pause / beat",
  "inspector.insert.setvar": "Set variable",
  "inspector.insert.show": "Show / move character",
  "inspector.insert.with": "With effect",
  "inspector.insert.flash": "Color flash",
  "inspector.insert.stage": "Stage (multi-sprite)",
  "inspector.insert.menu": "Menu / choices",
  "inspector.closeComposer": "Close composer",

  // Insert-event forms
  "inspector.durationSeconds": "Duration (s)",
  "inspector.variableName": "Variable name",
  "inspector.valueType": "Value type",
  "inspector.valueTypeNumber": "number",
  "inspector.valueTypeString": "string",
  "inspector.valueTypeBoolean": "boolean",
  "inspector.valueTypeNull": "null",
  "inspector.imageTag": "Image tag",
  "inspector.expression": "Expression",
  "inspector.position": "Position",
  "inspector.transition": "Transition",
  "inspector.transitionExpression": "Transition expression",
  "inspector.color": "Color",
  "inspector.inserting": "Inserting…",
  "inspector.insert": "Insert",

  // Screen layout composer
  "inspector.screenLayoutComposer": "Screen Layout Composer",
  "inspector.screenName": "Screen name",
  "inspector.targetFileOptional": "Target file (optional)",
  "inspector.widgetTree": "Widget tree (JSON)",
  "inspector.containerKinds": "Container kinds:",
  "inspector.hintGroupSeparator": ". ",
  "inspector.hintEnd": ".",
  "inspector.leaves": "Leaves:",
  "inspector.composing": "Composing…",
  "inspector.composeScreen": "Compose screen",
  "inspector.resetTemplate": "Reset template",
  "inspector.reset": "Reset",
  "inspector.treeJsonInvalid": "tree JSON is invalid: {message}",

  // Stage composer
  "inspector.stageComposer": "Stage Composer",
  "inspector.targetLabel": "Target label",
  "inspector.selectLabel": "— select label —",
  "inspector.sprites": "Sprites",
  "inspector.spriteTagPlaceholder": "tag (eileen)",
  "inspector.spriteExpressionPlaceholder": "expression (happy)",
  "inspector.spritePositionPlaceholder": "position (left)",
  "inspector.removeSprite": "Remove sprite",
  "inspector.addSprite": "sprite",
  "inspector.transitionOptional": "Transition (optional)",
  "inspector.composeStage": "Compose stage",

  // ImageMap composer
  "inspector.imagemapComposer": "ImageMap Composer",
  "inspector.groundImage": "Ground image",
  "inspector.hoverImage": "Hover image",
  "inspector.hotspots": "Hotspots (x y w h → action)",
  "inspector.removeHotspot": "Remove hotspot",
  "inspector.addHotspot": "hotspot",
  "inspector.composeImagemap": "Compose imagemap",
  "inspector.hotspotActionRequired": "at least one hotspot needs an action",

  // Menu composer
  "inspector.menuComposer": "Menu Composer",
  "inspector.choices": "Choices",
  "inspector.choiceTextPlaceholder": 'Choice text (e.g. "Take the left path")',
  "inspector.choiceConditionPlaceholder":
    'if condition (optional, e.g. "trust > 0")',
  "inspector.choiceBodyPlaceholder": "body lines, one per line (default: pass)",
  "inspector.removeChoice": "Remove choice",
  "inspector.addChoice": "choice",
  "inspector.composeMenu": "Compose menu",
  "inspector.choiceTextRequired": "at least one choice needs text",

  // Screens panel
  "inspector.screensEyebrow": "Library · Screens",
  "inspector.screensTitle": "Screens",
  "inspector.screensIntroPre": "Project screens parsed from ",
  "inspector.screensIntroPost":
    " blocks. Add new ones with the Screen Layout or ImageMap composers.",
  "inspector.addScreen": "Add screen",
  "inspector.addImagemap": "Add imagemap",
  "inspector.screenCountOne": "{count} screen",
  "inspector.screenCountMany": "{count} screens",
  "inspector.screensEmpty":
    'No screens yet. Use "Add screen" or "Add imagemap" to create one.',
};

export type InspectorKey = keyof typeof en;

const zhHans: Record<InspectorKey, string> = {
  "inspector.kindFallback": "场景",
  "inspector.closeInspector": "关闭检查器",
  "inspector.loadingScene": "正在加载场景…",
  "inspector.errorPrefix": "错误：{message}",

  "inspector.background": "背景",
  "inspector.music": "音乐",
  "inspector.outgoing": "后续跳转（{count}）",
  "inspector.endsWithReturn": "以 `return` 结束。",
  "inspector.noOutgoing": "没有后续跳转。",
  "inspector.body": "正文（{count}）",
  "inspector.unparsed": "未解析（{count}）",
  "inspector.unparsedHint":
    "解析器无法识别这些行。请使用 renpy-mcp 工具或文本编辑器修改 —— 界面不会改动它们。",

  "inspector.musicPlaceholder": "audio/spring_theme.ogg（留空则停止音乐）",
  "inspector.loop": "循环播放",
  "inspector.stopMusic": "停止音乐",
  "inspector.setMusic": "设置音乐",
  "inspector.noSceneLine":
    "没有 `scene` 语句 —— 此 label 未设置背景。请暂时通过工具修改。",
  "inspector.swapBackground": "更换背景",

  "inspector.narration": "（旁白）",
  "inspector.narrationLabel": "旁白",
  "inspector.dialoguePlaceholder": "添加一句对白…",
  "inspector.adding": "添加中…",
  "inspector.addLine": "添加对白",
  "inspector.noBody": "正文还是空的。",

  "inspector.choiceCountOne": "{count} 个选项",
  "inspector.choiceCountMany": "{count} 个选项",
  "inspector.branchCountOne": "{count} 个分支",
  "inspector.branchCountMany": "{count} 个分支",
  "inspector.noArg": "（无参数）",

  "inspector.insertEvent": "插入事件",
  "inspector.insert.pause": "暂停 / 停顿",
  "inspector.insert.setvar": "设置变量",
  "inspector.insert.show": "显示 / 移动角色",
  "inspector.insert.with": "转场效果",
  "inspector.insert.flash": "颜色闪烁",
  "inspector.insert.stage": "舞台（多立绘）",
  "inspector.insert.menu": "菜单 / 选项",
  "inspector.closeComposer": "关闭编辑器",

  "inspector.durationSeconds": "时长（秒）",
  "inspector.variableName": "变量名",
  "inspector.valueType": "值类型",
  "inspector.valueTypeNumber": "数字",
  "inspector.valueTypeString": "字符串",
  "inspector.valueTypeBoolean": "布尔",
  "inspector.valueTypeNull": "null",
  "inspector.imageTag": "图像标签",
  "inspector.expression": "表情",
  "inspector.position": "位置",
  "inspector.transition": "转场",
  "inspector.transitionExpression": "转场表达式",
  "inspector.color": "颜色",
  "inspector.inserting": "插入中…",
  "inspector.insert": "插入",

  "inspector.screenLayoutComposer": "界面布局编辑器",
  "inspector.screenName": "界面名称",
  "inspector.targetFileOptional": "目标文件（可选）",
  "inspector.widgetTree": "控件树（JSON）",
  "inspector.containerKinds": "容器类型：",
  "inspector.hintGroupSeparator": "。",
  "inspector.hintEnd": "。",
  "inspector.leaves": "叶子节点：",
  "inspector.composing": "正在生成…",
  "inspector.composeScreen": "生成界面",
  "inspector.resetTemplate": "重置模板",
  "inspector.reset": "重置",
  "inspector.treeJsonInvalid": "树 JSON 无效：{message}",

  "inspector.stageComposer": "舞台编辑器",
  "inspector.targetLabel": "目标 label",
  "inspector.selectLabel": "— 选择 label —",
  "inspector.sprites": "立绘",
  "inspector.spriteTagPlaceholder": "标签（eileen）",
  "inspector.spriteExpressionPlaceholder": "表情（happy）",
  "inspector.spritePositionPlaceholder": "位置（left）",
  "inspector.removeSprite": "移除立绘",
  "inspector.addSprite": "立绘",
  "inspector.transitionOptional": "转场（可选）",
  "inspector.composeStage": "生成舞台",

  "inspector.imagemapComposer": "图像映射编辑器",
  "inspector.groundImage": "底图",
  "inspector.hoverImage": "悬停图",
  "inspector.hotspots": "热区（x y w h → action）",
  "inspector.removeHotspot": "移除热区",
  "inspector.addHotspot": "热区",
  "inspector.composeImagemap": "生成图像映射",
  "inspector.hotspotActionRequired": "至少需要一个带 action 的热区",

  "inspector.menuComposer": "菜单编辑器",
  "inspector.choices": "选项",
  "inspector.choiceTextPlaceholder": "选项文本（例如“走左边的小路”）",
  "inspector.choiceConditionPlaceholder": "if 条件（可选，例如“trust > 0”）",
  "inspector.choiceBodyPlaceholder": "正文行，每行一条（默认：pass）",
  "inspector.removeChoice": "移除选项",
  "inspector.addChoice": "选项",
  "inspector.composeMenu": "生成菜单",
  "inspector.choiceTextRequired": "至少需要一个有文本的选项",

  "inspector.screensEyebrow": "素材库 · 界面",
  "inspector.screensTitle": "界面",
  "inspector.screensIntroPre": "项目界面由 ",
  "inspector.screensIntroPost": " 块解析得出。可用界面布局或图像映射编辑器新建。",
  "inspector.addScreen": "添加界面",
  "inspector.addImagemap": "添加图像映射",
  "inspector.screenCountOne": "{count} 个界面",
  "inspector.screenCountMany": "{count} 个界面",
  "inspector.screensEmpty": "还没有界面。用「添加界面」或「添加图像映射」新建一个。",
};

export const inspector = { en, "zh-Hans": zhHans };
