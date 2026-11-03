import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { clsx } from "clsx";
import { api } from "@/api/client";
import type { AudioListing, ImageInfo } from "@/api/types";
import { useI18n, type MessageKey } from "@/i18n";

type Tab = "backgrounds" | "sprites" | "music" | "sfx";

const TABS: { id: Tab; label: MessageKey }[] = [
  { id: "backgrounds", label: "library.assets.backgrounds" },
  { id: "sprites", label: "library.assets.sprites" },
  { id: "music", label: "library.assets.music" },
  { id: "sfx", label: "library.assets.sfx" },
];

export function Assets() {
  const { t } = useI18n();
  const [tab, setTab] = useState<Tab>("backgrounds");
  const images = useQuery({
    queryKey: ["images"],
    queryFn: () => api<{ images: ImageInfo[] }>("/api/images"),
  });
  const audio = useQuery({
    queryKey: ["audio"],
    queryFn: () => api<AudioListing>("/api/audio"),
  });

  return (
    <div className="p-8 h-full overflow-auto">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-semibold text-zinc-800">{t("library.assets.title")}</h1>
      </div>

      <div className="border-b border-zinc-200 mb-6 flex gap-1">
        {TABS.map((item) => (
          <button
            key={item.id}
            onClick={() => setTab(item.id)}
            className={clsx(
              "px-3 py-2 text-sm border-b-2 -mb-px transition-colors",
              tab === item.id
                ? "border-accent text-accent font-medium"
                : "border-transparent text-zinc-500 hover:text-zinc-800",
            )}
          >
            {t(item.label)}
          </button>
        ))}
      </div>

      {(tab === "backgrounds" || tab === "sprites") && images.data && (
        <ImageGrid images={images.data.images} kind={tab} />
      )}
      {(tab === "music" || tab === "sfx") && audio.data && (
        <AudioGrid audio={audio.data} kind={tab} />
      )}
    </div>
  );
}

function ImageGrid({ images, kind }: { images: ImageInfo[]; kind: "backgrounds" | "sprites" }) {
  const { t } = useI18n();
  // Heuristic: image names starting with `bg ` are backgrounds; everything else is a sprite.
  const filtered = images.filter((img) =>
    kind === "backgrounds" ? img.name.startsWith("bg ") : !img.name.startsWith("bg "),
  );
  if (filtered.length === 0) {
    return (
      <p className="text-sm text-zinc-500">
        {t(
          kind === "backgrounds"
            ? "library.assets.emptyBackgrounds"
            : "library.assets.emptySprites",
        )}
      </p>
    );
  }
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
      {filtered.map((img) => (
        <div
          key={`${img.name}-${img.kind}`}
          className="bg-card border border-zinc-200 rounded-md overflow-hidden"
        >
          <div className="bg-zinc-100 aspect-video grid place-items-center text-xs text-zinc-400 font-mono">
            {img.kind === "auto" ? "auto" : img.kind}
          </div>
          <div className="p-2 space-y-0.5">
            <div className="text-sm font-medium truncate" title={img.name}>
              {img.name}
            </div>
            <div className="text-[10px] text-zinc-400 font-mono truncate">
              {img.asset_path ?? img.value ?? ""}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

function AudioGrid({ audio, kind }: { audio: AudioListing; kind: "music" | "sfx" }) {
  const { t } = useI18n();
  // Crude split: assets in audio/ that look like music vs SFX by file name patterns.
  const isMusic = (path: string) => /theme|bgm|music/i.test(path) || path.endsWith(".ogg");
  const filtered = audio.files.filter((f) => (kind === "music" ? isMusic(f.asset_path) : !isMusic(f.asset_path)));
  if (filtered.length === 0) {
    return (
      <p className="text-sm text-zinc-500">
        {t(kind === "music" ? "library.assets.emptyMusic" : "library.assets.emptySfx")}
      </p>
    );
  }
  return (
    <div className="space-y-2">
      {filtered.map((f) => {
        const usedBy = audio.plays.filter((p) => f.asset_path.endsWith(p.asset)).length;
        return (
          <div
            key={f.asset_path}
            className="bg-card border border-zinc-200 rounded-md p-3 flex items-center justify-between"
          >
            <div className="min-w-0">
              <div className="text-sm font-medium truncate font-mono">{f.asset_path}</div>
              <div className="text-xs text-zinc-500">
                {(f.size_bytes / 1024).toFixed(1)} KB
                {usedBy > 0 &&
                  ` · ${t(
                    usedBy === 1 ? "library.assets.usedIn" : "library.assets.usedInPlural",
                    { count: usedBy },
                  )}`}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
