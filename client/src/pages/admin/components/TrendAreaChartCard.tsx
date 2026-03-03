import { TrendChartCard } from '../../../components/analytics/TrendChartCard'

interface TrendAreaChartCardProps {
  title: string
  subtitle: string
  contextLabel: string
  points: Array<{ bucket: string; value: number }>
  emptyLabel: string
  valueSuffix?: string
}

export function TrendAreaChartCard(props: TrendAreaChartCardProps): JSX.Element {
  return (
    <TrendChartCard
      title={props.title}
      subtitle={props.subtitle}
      contextLabel={props.contextLabel}
      points={props.points}
      valueSuffix={props.valueSuffix}
      variant="area"
      emptyLabel={props.emptyLabel}
    />
  )
}

export default TrendAreaChartCard
