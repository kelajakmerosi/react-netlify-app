import { SegmentedControl } from '../../../components/ui'
import { useLang } from '../../../hooks'
import type { BuilderStep, StepCompletionState } from './types'
import styles from './ContentBuilder.module.css'

interface ContentStepperProps {
  step: BuilderStep
  completion: StepCompletionState
  onStepChange: (step: BuilderStep) => void
}

const STEPS = [1, 2, 3, 4] as const

export default function ContentStepper({ step, completion, onStepChange }: ContentStepperProps): JSX.Element {
  const { t } = useLang()

  const labels: Record<BuilderStep, string> = {
    1: t('adminContentStep1'),
    2: t('adminContentStep2'),
    3: t('adminContentStep3'),
    4: t('adminContentStep4'),
  }

  const canOpen = (candidate: BuilderStep): boolean => {
    if (candidate === 1) return true
    if (candidate === 2) return completion.step1
    if (candidate === 3) return completion.step1 && completion.step2
    return completion.step1 && completion.step2 && completion.step3
  }

  return (
    <SegmentedControl
      options={STEPS.map((value) => {
        const candidate = value as BuilderStep
        return {
          id: candidate,
          label: labels[candidate],
          disabled: !canOpen(candidate),
        }
      })}
      value={step}
      onChange={onStepChange}
      ariaLabel={t('adminContentStepperAria')}
      className={styles.stepper}
    />
  )
}
