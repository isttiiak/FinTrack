interface MonthPickerProps {
  value: string
  onChange: (v: string) => void
}

export default function MonthPicker({ value, onChange }: MonthPickerProps) {
  return (
    <div className="month-picker">
      <input
        type="month"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="month-input"
      />
      <style>{`
        .month-picker {}
        .month-input {
          background: var(--bg-card); border: 1px solid var(--border); border-radius: 8px;
          color: var(--text-primary); font-size: 13px; padding: 7px 12px;
          cursor: pointer;
        }
        .month-input:focus { outline: none; border-color: var(--border-focus); }
      `}</style>
    </div>
  )
}
