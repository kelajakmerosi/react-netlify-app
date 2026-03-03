import { DonutChartCard } from '../../../components/analytics/DonutChartCard'

interface DonutBreakdownCardProps {
  title: string
  subtitle: string
  contextLabel: string
  items: Array<{ label: string; value: number }>
  emptyLabel: string
  valueSuffix?: string
}

export function DonutBreakdownCard(props: DonutBreakdownCardProps): JSX.Element {
  return (
    <DonutChartCard
      title={props.title}
      subtitle={props.subtitle}
      contextLabel={props.contextLabel}
      items={props.items}
      valueSuffix={props.valueSuffix}
      emptyLabel={props.emptyLabel}
    />
  )
}

export default DonutBreakdownCard
