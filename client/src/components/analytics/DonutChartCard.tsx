import { GlassCard } from '../ui/GlassCard'
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts'
import styles from './charts.module.css'

interface DonutItem {
  label: string
  value: number
}

interface DonutChartCardProps {
  title: string
  subtitle?: string
  contextLabel?: string
  items: DonutItem[]
  valueSuffix?: string
  emptyLabel?: string
}

const COLORS = ['#39c6f0', '#5ca2ff', '#7de2a1', '#ffcd6b', '#ff7f9f', '#b790ff']

export function DonutChartCard({
  title,
  subtitle,
  contextLabel,
  items,
  valueSuffix = '',
  emptyLabel = 'No data for selected filters.',
}: DonutChartCardProps): JSX.Element {
  const safeItems = items
    .map((item) => ({ label: item.label, value: Number(item.value || 0) }))
    .filter((item) => item.value > 0)

  const total = safeItems.reduce((sum, item) => sum + item.value, 0)

  return (
    <GlassCard padding={18}>
      <div className={styles.cardHead}>
        <div>
          <h4 className={styles.title}>{title}</h4>
          {subtitle ? <p className={styles.subtitle}>{subtitle}</p> : null}
        </div>
        {contextLabel ? <p className={styles.contextLabel}>{contextLabel}</p> : null}
      </div>
      {safeItems.length === 0 ? (
        <div className={styles.empty}>{emptyLabel}</div>
      ) : (
        <div className={styles.donutLayout}>
          <div className={styles.chartWrap}>
            <ResponsiveContainer width="100%" height={260}>
              <PieChart>
                <Pie
                  data={safeItems}
                  dataKey="value"
                  nameKey="label"
                  cx="50%"
                  cy="50%"
                  innerRadius={62}
                  outerRadius={94}
                  paddingAngle={2}
                >
                  {safeItems.map((entry, index) => (
                    <Cell key={`${entry.label}-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(value: unknown) => `${Number(value ?? 0)}${valueSuffix}`}
                  contentStyle={{
                    borderRadius: 12,
                    border: '1px solid rgba(118, 143, 186, 0.35)',
                    background: 'rgba(8, 19, 43, 0.95)',
                    color: '#d9e4ff',
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className={styles.legend}>
            {safeItems.map((item, index) => {
              const pct = total > 0 ? Math.round((item.value / total) * 100) : 0
              return (
                <div key={item.label} className={styles.legendItem}>
                  <span className={styles.legendLeft}>
                    <span className={styles.colorDot} style={{ backgroundColor: COLORS[index % COLORS.length] }} />
                    <span className={styles.legendLabel}>{item.label}</span>
                  </span>
                  <span className={styles.legendValue}>{item.value}{valueSuffix} ({pct}%)</span>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </GlassCard>
  )
}

export default DonutChartCard
