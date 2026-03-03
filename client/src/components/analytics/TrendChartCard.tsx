import { GlassCard } from '../ui/GlassCard'
import {
  Area,
  AreaChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import styles from './charts.module.css'

interface TrendPoint {
  bucket: string
  value: number
}

interface TrendChartCardProps {
  title: string
  subtitle?: string
  contextLabel?: string
  points: TrendPoint[]
  valueSuffix?: string
  variant?: 'area' | 'line'
  emptyLabel?: string
}

const formatDate = (bucket: string): string => {
  const date = new Date(bucket)
  if (Number.isNaN(date.getTime())) return bucket
  return date.toISOString().slice(5, 10)
}

const toGradientId = (title: string, variant: 'area' | 'line') => `trend-${variant}-${title.replace(/[^a-z0-9]+/gi, '-').toLowerCase()}`

export function TrendChartCard({
  title,
  subtitle,
  contextLabel,
  points,
  valueSuffix = '',
  variant = 'area',
  emptyLabel = 'No data for selected filters.',
}: TrendChartCardProps): JSX.Element {
  const data = points.map((point) => ({
    date: formatDate(point.bucket),
    value: Number(point.value ?? 0),
  }))

  const gradientId = toGradientId(title, variant)

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
            {variant === 'line' ? (
              <LineChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#36c8f4" stopOpacity={0.25} />
                    <stop offset="100%" stopColor="#36c8f4" stopOpacity={0.04} />
                  </linearGradient>
                </defs>
                <CartesianGrid stroke="rgba(130,146,175,0.22)" strokeDasharray="3 3" />
                <XAxis
                  dataKey="date"
                  tick={{ fill: 'rgba(191,200,221,0.88)', fontSize: 12 }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  tick={{ fill: 'rgba(191,200,221,0.88)', fontSize: 12 }}
                  axisLine={false}
                  tickLine={false}
                  width={44}
                />
                <Tooltip
                  formatter={(value: unknown) => `${Number(value ?? 0).toFixed(0)}${valueSuffix}`}
                  contentStyle={{
                    borderRadius: 12,
                    border: '1px solid rgba(118, 143, 186, 0.35)',
                    background: 'rgba(8, 19, 43, 0.95)',
                    color: '#d9e4ff',
                  }}
                />
                <Area type="monotone" dataKey="value" fill={`url(#${gradientId})`} stroke="none" />
                <Line type="monotone" dataKey="value" stroke="#39c6f0" strokeWidth={2.4} dot={false} />
              </LineChart>
            ) : (
              <AreaChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#36c8f4" stopOpacity={0.36} />
                    <stop offset="100%" stopColor="#36c8f4" stopOpacity={0.02} />
                  </linearGradient>
                </defs>
                <CartesianGrid stroke="rgba(130,146,175,0.22)" strokeDasharray="3 3" />
                <XAxis
                  dataKey="date"
                  tick={{ fill: 'rgba(191,200,221,0.88)', fontSize: 12 }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  tick={{ fill: 'rgba(191,200,221,0.88)', fontSize: 12 }}
                  axisLine={false}
                  tickLine={false}
                  width={44}
                />
                <Tooltip
                  formatter={(value: unknown) => `${Number(value ?? 0).toFixed(0)}${valueSuffix}`}
                  contentStyle={{
                    borderRadius: 12,
                    border: '1px solid rgba(118, 143, 186, 0.35)',
                    background: 'rgba(8, 19, 43, 0.95)',
                    color: '#d9e4ff',
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="value"
                  stroke="#39c6f0"
                  strokeWidth={2.4}
                  fill={`url(#${gradientId})`}
                />
              </AreaChart>
            )}
          </ResponsiveContainer>
        </div>
      )}
    </GlassCard>
  )
}

export default TrendChartCard
