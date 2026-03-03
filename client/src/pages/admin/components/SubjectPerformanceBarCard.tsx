import { HorizontalBarChartCard } from '../../../components/analytics/HorizontalBarChartCard'

interface SubjectPerformanceBarCardProps {
  title: string
  subtitle: string
  contextLabel: string
  items: Array<{ label: string; value: number; secondaryLabel?: string }>
  emptyLabel: string
  valueSuffix?: string
}

export function SubjectPerformanceBarCard(props: SubjectPerformanceBarCardProps): JSX.Element {
  return (
    <HorizontalBarChartCard
      title={props.title}
      subtitle={props.subtitle}
      contextLabel={props.contextLabel}
      items={props.items}
      valueSuffix={props.valueSuffix}
      emptyLabel={props.emptyLabel}
    />
  )
}

export default SubjectPerformanceBarCard
