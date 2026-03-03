import { TrendChartCard } from '../../../components/analytics/TrendChartCard'

interface TrendLineChartCardProps {
  title: string
  subtitle: string
  contextLabel: string
  points: Array<{ bucket: string; value: number }>
  emptyLabel: string
  valueSuffix?: string
}

export function TrendLineChartCard(props: TrendLineChartCardProps): JSX.Element {
  return (
    <TrendChartCard
      title={props.title}
      subtitle={props.subtitle}
      contextLabel={props.contextLabel}
      points={props.points}
      valueSuffix={props.valueSuffix}
      variant="line"
      emptyLabel={props.emptyLabel}
    />
  )
}

export default TrendLineChartCard
