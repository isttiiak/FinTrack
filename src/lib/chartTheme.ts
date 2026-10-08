// Shared Recharts styling. CHART_COLORS is one of the three deliberate
// literal-hex palettes (see CLAUDE.md): the token palette collapses
// accent-teal→primary and accent-amber→gold, so a categorical chart needs
// its own mutually distinct hues.
export const CHART_COLORS = [
  '#4FA981', '#C2A24E', '#C9736E', '#3E9B72',
  '#C25B55', '#B4923F', '#8A968C',
  '#B5677A', '#6B8CAE', '#5FA88F',
]

export const TOOLTIP_STYLE = {
  contentStyle: {
    background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: 10,
    color: 'var(--text-primary)', fontSize: 12,
  },
  itemStyle: { color: 'var(--text-primary)' },
  labelStyle: { color: 'var(--text-secondary)', marginBottom: 4 },
}

export const AXIS_TICK = { fill: '#8A968C', fontSize: 11 }
export const GRID_STROKE = '#212A24'
