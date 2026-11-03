/**
 * Story panel, story map, and choice view.
 *
 * Keys are flat and namespace-prefixed (`story.…`) because the runtime
 * merges every catalog into one flat map. The `zh-Hans` object is typed
 * as `Record<StoryKey, string>` so a missing translation is a compile
 * error, not English text leaking into a Chinese UI.
 */

const en = {
  // Story panel — the two canvas modes. The hint is the small mono
  // caption under the label, same pattern as the sidebar.
  "story.mode.map": "Map",
  "story.mode.mapHint": "branching graph",
  "story.mode.choice": "Choice",
  "story.mode.choiceHint": "player perspective",

  // Node kind tags on the story map. The glyph is part of the tag; only
  // the word after it is translated.
  "story.kind.start": "◉ start",
  "story.kind.ending": "▣ ending",
  "story.kind.choice": "◇ choice",
  "story.kind.scene": "— scene",

  // Legend in the bottom-right corner of the map. `jump` and `call` are
  // Ren'Py statements, so they stay verbatim in every locale.
  "story.legend.start": "start",
  "story.legend.scene": "scene",
  "story.legend.choice": "choice",
  "story.legend.ending": "ending",
  "story.legend.jump": "jump",
  "story.legend.call": "call",

  // Story map status, toolbar, and canvas chrome
  "story.map.loading": "Loading project graph…",
  "story.map.nothingSelected": "nothing selected",
  // Appended to a backend error; the leading space is deliberate.
  "story.map.referencesOne": " ({count} reference)",
  "story.map.referencesMany": " ({count} references)",
  "story.map.lines": "{count} lines",
  "story.map.portTitle": "Drag to another node to connect",
  "story.map.addScene": "Scene",
  "story.map.addSceneTitle": "Add a new scene label",
  "story.map.addChoice": "Choice",
  "story.map.addChoiceTitle": "Add a new choice label (label + starter menu)",
  "story.map.addEnding": "Ending",
  "story.map.addEndingTitle": "Add a new ending label",
  "story.map.delete": "Delete",
  "story.map.deleteTitle": "Delete the selected label (Backspace)",
  "story.map.zoomIn": "Zoom in",
  "story.map.zoomOut": "Zoom out",
  "story.map.fit": "Fit to view",
  "story.map.connectHint": "release on a node to connect",
  "story.map.dismiss": "dismiss",
  "story.map.empty": "No labels found in this project.",
  "story.map.addStartingScene": "+ Add a starting scene",

  // Choice view
  "story.choice.loading": "Loading choice graph…",
  "story.choice.title": "Choice View",
  "story.choice.perspective": "Player perspective",
  "story.choice.summaryOne":
    "{count} menu across the project · click a target to open it in the Inspector",
  "story.choice.summaryMany":
    "{count} menus across the project · click a target to open it in the Inspector",
  "story.choice.openInInspector": "Open {label} in the Inspector",
  // `if` and `condition` are .rpy syntax and project data: untranslated.
  "story.choice.condition": "if {condition}",
  "story.choice.noJump": "no jump (branch has no clear target)",
  // `call` is a Ren'Py statement; only the word before it is translated.
  "story.choice.viaCall": "via call",
  "story.choice.emptyText": "text cannot be empty",
  "story.choice.editTitle": "Edit choice text",
  "story.choice.empty": "No choices in this project yet.",
  // Split around the inline `<code>menu:</code>`: the trailing space of
  // the prefix and the leading space of the suffix are load-bearing.
  "story.choice.emptyHintPrefix": "Add a ",
  "story.choice.emptyHintSuffix": " to a label and they'll show up here.",
};

export type StoryKey = keyof typeof en;

const zhHans: Record<StoryKey, string> = {
  "story.mode.map": "剧情图",
  "story.mode.mapHint": "分支结构",
  "story.mode.choice": "选项",
  "story.mode.choiceHint": "玩家视角",

  "story.kind.start": "◉ 开始",
  "story.kind.ending": "▣ 结局",
  "story.kind.choice": "◇ 选项",
  "story.kind.scene": "— 场景",

  "story.legend.start": "开始",
  "story.legend.scene": "场景",
  "story.legend.choice": "选项",
  "story.legend.ending": "结局",
  "story.legend.jump": "jump",
  "story.legend.call": "call",

  "story.map.loading": "正在加载项目剧情图…",
  "story.map.nothingSelected": "未选中任何节点",
  "story.map.referencesOne": " （{count} 处引用）",
  "story.map.referencesMany": " （{count} 处引用）",
  "story.map.lines": "{count} 行",
  "story.map.portTitle": "拖到另一个节点即可连接",
  "story.map.addScene": "场景",
  "story.map.addSceneTitle": "新增场景 label",
  "story.map.addChoice": "选项",
  "story.map.addChoiceTitle": "新增选项 label（label 加初始菜单）",
  "story.map.addEnding": "结局",
  "story.map.addEndingTitle": "新增结局 label",
  "story.map.delete": "删除",
  "story.map.deleteTitle": "删除选中的 label（Backspace）",
  "story.map.zoomIn": "放大",
  "story.map.zoomOut": "缩小",
  "story.map.fit": "适应画布",
  "story.map.connectHint": "在节点上松开即可连接",
  "story.map.dismiss": "忽略",
  "story.map.empty": "此项目中未找到任何 label。",
  "story.map.addStartingScene": "+ 添加起始场景",

  "story.choice.loading": "正在加载选项图…",
  "story.choice.title": "选项视图",
  "story.choice.perspective": "玩家视角",
  "story.choice.summaryOne":
    "项目中共 {count} 个选项菜单 · 点击目标可在检查器中打开",
  "story.choice.summaryMany":
    "项目中共 {count} 个选项菜单 · 点击目标可在检查器中打开",
  "story.choice.openInInspector": "在检查器中打开 {label}",
  "story.choice.condition": "if {condition}",
  "story.choice.noJump": "无跳转（该分支没有明确的目标）",
  "story.choice.viaCall": "经由 call",
  "story.choice.emptyText": "选项文本不能为空",
  "story.choice.editTitle": "编辑选项文本",
  "story.choice.empty": "此项目还没有任何选项。",
  "story.choice.emptyHintPrefix": "为某个 label 添加 ",
  "story.choice.emptyHintSuffix": " 后，选项就会显示在这里。",
};

export const story = { en, "zh-Hans": zhHans };
