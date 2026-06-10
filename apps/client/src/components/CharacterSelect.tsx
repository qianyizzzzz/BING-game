import { CSSProperties, useEffect, useMemo, useState } from "react";
import { Check, Sparkles } from "lucide-react";
import {
  CHARACTER_ROSTER,
  CharacterProfile,
  getCharacterById
} from "../lib/characters";

interface CharacterSelectProps {
  selectedCharacterId: string;
  onConfirm: (character: CharacterProfile) => void;
}

export function CharacterSelect({
  selectedCharacterId,
  onConfirm
}: CharacterSelectProps) {
  const [draftId, setDraftId] = useState(selectedCharacterId);
  const draft = useMemo(() => getCharacterById(draftId), [draftId]);
  const selected = getCharacterById(selectedCharacterId);

  useEffect(() => {
    setDraftId(selectedCharacterId);
  }, [selectedCharacterId]);

  return (
    <section className="character-select-panel">
      <div className="character-select-preview">
        <div
          className="character-select-portrait"
          style={
            {
              "--character-accent": draft.accent,
              "--character-secondary": draft.secondary
            } as CSSProperties
          }
        >
          <img alt={`${draft.name} 预览`} src={draft.avatarUrl} />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 text-xs font-black text-teal-700">
            <Sparkles className="h-4 w-4" aria-hidden="true" />
            虚拟角色
          </div>
          <h3 className="mt-1 truncate text-lg font-black text-gray-950">
            {draft.name}
          </h3>
          <p className="text-sm font-bold text-gray-600">{draft.archetype}</p>
          <p className="mt-1 text-sm leading-6 text-gray-500">
            {draft.description}
          </p>
          <button
            className="btn-primary mt-3"
            onClick={() => onConfirm(draft)}
            type="button"
          >
            <Check className="h-4 w-4" aria-hidden="true" />
            {draft.id === selected.id ? "已确认" : "确认角色"}
          </button>
        </div>
      </div>

      <div className="character-roster-grid">
        {CHARACTER_ROSTER.map((character) => (
          <button
            key={character.id}
            aria-pressed={draft.id === character.id}
            className={[
              "character-option",
              draft.id === character.id ? "character-option-active" : ""
            ].join(" ")}
            onClick={() => setDraftId(character.id)}
            style={
              {
                "--character-accent": character.accent,
                "--character-secondary": character.secondary
              } as CSSProperties
            }
            type="button"
          >
            <img alt="" src={character.avatarUrl} />
            <span>
              <strong>{character.name}</strong>
              <small>{character.archetype}</small>
            </span>
          </button>
        ))}
      </div>
    </section>
  );
}
