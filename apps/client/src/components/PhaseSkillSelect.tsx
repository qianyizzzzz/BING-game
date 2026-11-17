type Option = { value: string; label: string; disabled?: boolean };

export function PhaseSkillSelect({ selected, onChange, moves, phaseSkills = [], standardLabel = "常规技能", disabled, testId }: {
  selected: string;
  onChange: (id: string) => void;
  moves: Option[];
  phaseSkills?: Option[];
  standardLabel?: string;
  disabled?: boolean;
  testId?: string;
}) {
  const options = (entries: Option[]) => entries.map(({ value, label, disabled }) =>
    <option key={value} value={value} disabled={disabled}>{label}</option>);

  return <label className="block text-sm font-medium text-gray-700">
    技能
    <select className="soft-input mt-1 w-full" data-testid={testId} value={selected} disabled={disabled}
      onChange={(event) => onChange(event.currentTarget.value)}>
      {!selected ? <option value="">选择技能</option> : null}
      {moves.length && phaseSkills.length ? <>
        <optgroup label={standardLabel}>{options(moves)}</optgroup>
        <optgroup label="阶段技能">{options(phaseSkills)}</optgroup>
      </> : options([...moves, ...phaseSkills])}
    </select>
  </label>;
}
