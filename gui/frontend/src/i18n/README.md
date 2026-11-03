# Translating the GUI

The interface ships in English and Simplified Chinese. This directory holds
the whole mechanism; there is no i18n dependency.

## How it fits together

```
i18n/
  index.ts        runtime: Locale, translate(), useI18n(), detectLocale()
  provider.tsx    <I18nProvider>, reads/writes the locale preference
  catalog/
    common.ts     vocabulary shared by three or more surfaces
    shell.ts      sidebar, header, palette, lint badge, preferences
    story.ts      Story panel, story map, choice view
    inspector.ts  scene inspector, composer editors, screens
    library.ts    library tabs: characters, assets, variables, mini-games
    ship.ts       localization and distribution panels
```

Every catalog module exports `{ en, "zh-Hans" }`. `index.ts` merges all of
them into one flat `key → string` map per locale.

## Using a string

```tsx
const { t } = useI18n();

<span>{t("story.mode.map")}</span>
<button title={t("common.close")}>✕</button>
<time>{t("shell.time.minutesAgo", { count: 3 })}</time>
```

Placeholders are `{name}` and are substituted from the second argument.
A placeholder with no supplied value is left intact on purpose: seeing
`{count}` in the UI is a loud, harmless bug report, whereas rendering an
empty string hides the typo.

## Adding a key

1. Add it to the `en` object in the catalog that owns the surface.
2. Add the same key to that file's `zh-Hans` object.

The `zh-Hans` objects are typed `Record<keyof typeof en, string>`, so
forgetting step 2 fails `tsc -b`. That is deliberate: an untranslated string
is the mistake most likely to reach production, so it should not be
committable.

Keys are flat and dotted, prefixed with the catalog's namespace
(`story.mode.map`, not `mode.map`), because the merge is flat.

## What must not be translated

Translation is a display concern only. Never route these through `t()`:

- `.rpy` content, dialogue, label names, character names, variable names
- project names, file paths, tool names, tool arguments
- MCP tool output and Ren'Py's own lint diagnostics — these are data, not
  chrome, and a translated diagnostic would no longer match search results
  or upstream docs
- numbers, pids, counts (only the surrounding words get translated)

## Terminology

Consistency matters more than elegance here. Existing choices:

| English | 简体中文 | Notes |
| --- | --- | --- |
| Story | 剧情 | the panel and `.rpy` scenes |
| Library | 素材库 | |
| Localization | 本地化 | |
| Ship | 发布 | |
| label | label | never translated; it is an identifier |
| scene | 场景 | |
| choice / option | 选项 | |
| route | 路线 | |
| character | 角色 | |
| sprite | 立绘 | Ren'Py community term |
| background | 背景 | |
| music | 音乐 | |
| sound FX | 音效 | |
| screen | 界面 | Ren'Py's `screen` construct |
| variable | 变量 | |
| inspector | 检查器 | |
| lint | lint | kept as-is; it is a Ren'Py command |
| draft | 草稿 | |
| preview | 预览 | |
| build | 构建 | |
| distribute | 打包分发 | |
| theme | 主题 | |
| accent | 强调色 | |
| density | 密度 | |
| sidebar | 侧边栏 | |
| translation coverage | 翻译覆盖率 | |

## Adding a locale

Add the locale to `Locale`, `SUPPORTED_LOCALES`, `CATALOGS`, and
`detectLocale`. Every catalog needs the new locale object; the
`Record<keyof typeof en, string>` annotations make the compiler list every
missing key.

Language detection matches broadly — `zh`, `zh-CN`, `zh-SG`, and `zh-TW` all
resolve to Simplified, because Simplified is far closer to Traditional than
English is. Traditional deserves its own catalog rather than a fallback, but
a fallback is better than the wrong language entirely.
