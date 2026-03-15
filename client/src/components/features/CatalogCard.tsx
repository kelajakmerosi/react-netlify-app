import type { KeyboardEvent, MouseEvent, ReactNode } from 'react'
import { Star } from 'lucide-react'
import { GlassCard } from '../ui/GlassCard'
import { cn } from '../../utils'
import styles from './CatalogCard.module.css'

type CatalogCardVariant = 'default' | 'paid' | 'owned'
type CatalogCardDensity = 'default' | 'compact'

interface CatalogCardMetaItem {
  icon?: ReactNode
  text: string
}

interface CatalogCardRating {
  value: number
  votes?: string
}

interface CatalogCardProps {
  variant?: CatalogCardVariant
  density?: CatalogCardDensity
  mediaBackground: string
  mediaLabel?: string
  mediaIcon?: ReactNode
  mediaImageUrl?: string
  mediaImageAlt?: string
  topAction?: ReactNode
  title: string
  subtitle?: string
  description?: string
  rating?: CatalogCardRating
  badge?: ReactNode
  metaItems?: CatalogCardMetaItem[]
  actions?: ReactNode[]
  price?: {
    label: string
    value: string
  }
  onClick?: () => void
  clickLabel?: string
  className?: string
  children?: ReactNode
}

const variantClassMap: Record<CatalogCardVariant, string> = {
  default: styles.variantDefault,
  paid: styles.variantPaid,
  owned: styles.variantOwned,
}

const densityClassMap: Record<CatalogCardDensity, string> = {
  default: styles.densityDefault,
  compact: styles.densityCompact,
}

export function CatalogCard({
  variant = 'default',
  density = 'default',
  mediaBackground,
  mediaLabel,
  mediaIcon,
  mediaImageUrl,
  mediaImageAlt,
  topAction,
  title,
  subtitle,
  description,
  rating,
  badge,
  metaItems = [],
  actions = [],
  price,
  onClick,
  clickLabel,
  className,
  children,
}: CatalogCardProps): JSX.Element {
  const isPaidCard = variant === 'paid'
  const primaryAction = actions[0] ?? null
  const secondaryActions = actions.slice(1)
  const isInteractive = typeof onClick === 'function'
  const normalizedRating = typeof rating?.value === 'number'
    ? Math.min(5, Math.max(0, rating.value))
    : null
  const roundedRating = normalizedRating ? Math.round(normalizedRating) : 0
  const handleCardClick = (event: MouseEvent<HTMLDivElement>) => {
    if (!isInteractive) return
    const target = event.target instanceof HTMLElement ? event.target : null
    if (target?.closest('button, a, input, select, textarea, summary')) return
    onClick?.()
  }

  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (!isInteractive || event.currentTarget !== event.target) return
    if (event.key !== 'Enter' && event.key !== ' ') return
    event.preventDefault()
    onClick?.()
  }

  return (
    <GlassCard
      padding={0}
      className={cn(
        styles.card,
        variantClassMap[variant],
        densityClassMap[density],
        isInteractive && styles.cardInteractive,
        className,
      )}
      role={isInteractive ? 'button' : undefined}
      tabIndex={isInteractive ? 0 : undefined}
      aria-label={isInteractive ? (clickLabel || title) : undefined}
      onClick={handleCardClick}
      onKeyDown={handleKeyDown}
    >
      <div className={styles.media} style={{ background: mediaBackground }} aria-hidden={!mediaImageUrl}>
        {mediaImageUrl ? (
          <img src={mediaImageUrl} alt={mediaImageAlt || ''} className={styles.mediaImage} />
        ) : null}
        {mediaLabel ? <p className={styles.mediaLabel}>{mediaLabel}</p> : null}
        {topAction ? <div className={styles.topAction} onClick={(event) => event.stopPropagation()}>{topAction}</div> : null}
        {!mediaImageUrl && mediaIcon ? <span className={styles.mediaIcon} aria-hidden="true">{mediaIcon}</span> : null}
      </div>

      <div className={styles.head}>
        {subtitle ? <p className={styles.subtitle}>{subtitle}</p> : null}
        <div className={styles.headTop}>
          <h3 className={styles.title}>{title}</h3>
          {badge ? <span className={styles.badge}>{badge}</span> : null}
        </div>
        {description ? <p className={styles.description}>{description}</p> : null}
        {normalizedRating ? (
          <div className={styles.ratingRow} aria-label={`Rating ${normalizedRating} of 5`}>
            <strong className={styles.ratingValue}>{normalizedRating.toFixed(1)}</strong>
            <span className={styles.stars} aria-hidden="true">
              {Array.from({ length: 5 }).map((_, index) => (
                <Star
                  key={`star-${index}`}
                  size={13}
                  className={cn(styles.star, index < roundedRating && styles.starActive)}
                />
              ))}
            </span>
            {rating?.votes ? <span className={styles.votes}>{rating.votes}</span> : null}
          </div>
        ) : null}
      </div>

      {metaItems.length ? (
        <div className={styles.metaList}>
          {metaItems.map((item, index) => (
            <span key={`${item.text}-${index}`} className={styles.metaItem}>
              {item.icon}
              {item.text}
            </span>
          ))}
        </div>
      ) : null}

      {children ? <div className={styles.extra}>{children}</div> : null}

      {(isPaidCard || primaryAction || price) && (primaryAction || secondaryActions.length || price) ? (
        <div className={styles.footer}>
          <div className={styles.decisionRow}>
            {primaryAction ? (
              <span
                className={cn(styles.actionWrap, styles.primaryActionWrap)}
                onClick={(event) => event.stopPropagation()}
              >
                {primaryAction}
              </span>
            ) : null}
            {price ? (
              <div className={styles.inlinePrice}>
                <span className={styles.priceLabel}>{price.label}</span>
                <strong className={styles.priceValue}>{price.value}</strong>
              </div>
            ) : null}
          </div>
          {secondaryActions.length ? (
            <div className={styles.secondaryActions}>
              {secondaryActions.map((action, index) => (
                <span
                  key={`secondary-action-${index}`}
                  className={cn(styles.actionWrap, styles.secondaryActionWrap)}
                  onClick={(event) => event.stopPropagation()}
                >
                  {action}
                </span>
              ))}
            </div>
          ) : null}
        </div>
      ) : null}
    </GlassCard>
  )
}

export default CatalogCard
