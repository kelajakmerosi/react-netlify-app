import styles from '../AdminWorkspace.module.css'

interface LegendItem {
  label: string
  value: string
  color?: string
}

interface ChartLegendProps {
  items: LegendItem[]
}

export function ChartLegend({ items }: ChartLegendProps): JSX.Element {
  return (
    <ul className={styles.chartLegend}>
      {items.map((item) => (
        <li key={`${item.label}-${item.value}`} className={styles.chartLegendItem}>
          <span className={styles.chartLegendLeft}>
            {item.color ? <span className={styles.chartLegendDot} style={{ backgroundColor: item.color }} /> : null}
            <span>{item.label}</span>
          </span>
          <span>{item.value}</span>
        </li>
      ))}
    </ul>
  )
}

export default ChartLegend
