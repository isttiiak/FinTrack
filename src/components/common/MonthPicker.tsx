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
    </div>
  )
}
