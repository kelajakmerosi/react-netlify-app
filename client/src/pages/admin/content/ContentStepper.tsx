import { BookOpen, ClipboardCheck, ListTree, Send } from 'lucide-react'
import { UI_MIGRATION_FLAGS } from '../../../app/feature-flags'
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

  const icons: Record<BuilderStep, JSX.Element> = {
    1: <BookOpen size={14} aria-hidden="true" />,
    2: <ListTree size={14} aria-hidden="true" />,
    3: <ClipboardCheck size={14} aria-hidden="true" />,
    4: <Send size={14} aria-hidden="true" />,
  }

  const canOpen = (candidate: BuilderStep): boolean => {
    if (candidate === 1) return true
    if (candidate === 2) return completion.step1
    if (candidate === 3) return completion.step1 && completion.step2
    return completion.step1 && completion.step2 && completion.step3
  }

  if (UI_MIGRATION_FLAGS.adminUseSharedSegmentedControls) {
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

  return (
    <div className={styles.stepper} role="tablist" aria-label={t('adminContentStepperAria')}>
      {STEPS.map((value) => {
        const candidate = value as BuilderStep
        const active = candidate === step
        const disabled = !canOpen(candidate)

        return (
          <button
            key={candidate}
            type="button"
            role="tab"
            aria-selected={active}
            disabled={disabled}
            className={`${styles.stepItem} ${active ? styles.stepItemActive : ''}`}
            onClick={() => onStepChange(candidate)}
          >
            <span className={styles.stepIcon}>{icons[candidate]}</span>
            <span className={styles.stepText}>{labels[candidate]}</span>
          </button>
        )
      })}
    </div>
  )
}
