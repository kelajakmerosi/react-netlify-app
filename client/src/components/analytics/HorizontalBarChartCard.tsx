import { GlassCard } from '../ui/GlassCard'
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import styles from './charts.module.css'

interface BarItem {
  label: string
  value: number
  secondaryLabel?: string
}

interface HorizontalBarChartCardProps {
  title: string
  subtitle?: string
  contextLabel?: string
  items: BarItem[]
  valueSuffix?: string
  emptyLabel?: string
}

export function HorizontalBarChartCard({
  title,
  subtitle,
  contextLabel,
  items,
  valueSuffix = '',
  emptyLabel = 'No data for selected filters.',
}: HorizontalBarChartCardProps): JSX.Element {
  const data = items.map((item) => ({
    label: item.label,
    value: Number(item.value || 0),
    secondaryLabel: item.secondaryLabel,
  }))

  return (
    <GlassCard padding={18}>
      <div className={styles.cardHead}>
        <div>
          <h4 className={styles.title}>{title}</h4>
          {subtitle ? <p className={styles.subtitle}>{subtitle}</p> : null}
        </div>
        {contextLabel ? <p className={styles.contextLabel}>{contextLabel}</p> : null}
      </div>
      {data.length === 0 ? (
        <div className={styles.empty}>{emptyLabel}</div>
      ) : (
        <div className={styles.chartWrap}>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={data} layout="vertical" margin={{ top: 4, right: 12, left: 6, bottom: 4 }}>
              <CartesianGrid stroke="rgba(130,146,175,0.2)" strokeDasharray="3 3" />
              <XAxis
                type="number"
                tick={{ fill: 'rgba(191,200,221,0.88)', fontSize: 12 }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                type="category"
                dataKey="label"
                width={88}
                tick={{ fill: 'rgba(191,200,221,0.88)', fontSize: 12 }}
                axisLine={false}
                tickLine={false}
              />
              <Tooltip
                formatter={(value: unknown, _name, payload) => {
                  const line = `${Number(value)}${valueSuffix}`
                  const extra = (payload as { payload?: { secondaryLabel?: string } })?.payload?.secondaryLabel
                  return extra ? [`${line} - ${extra}`, 'Value'] : [line, 'Value']
                }}
                contentStyle={{
                  borderRadius: 12,
                  border: '1px solid rgba(118, 143, 186, 0.35)',
                  background: 'rgba(8, 19, 43, 0.95)',
                  color: '#d9e4ff',
                }}
              />
              <Bar dataKey="value" radius={[0, 10, 10, 0]} fill="url(#barGradient)" />
              <defs>
                <linearGradient id="barGradient" x1="0" y1="0" x2="1" y2="0">
                  <stop offset="0%" stopColor="#5ca2ff" />
                  <stop offset="100%" stopColor="#39c6f0" />
                </linearGradient>
              </defs>
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </GlassCard>
  )
}

export default HorizontalBarChartCard
