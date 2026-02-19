import { GlassCard } from '../ui/GlassCard'
import { Button }    from '../ui/Button'
import { Alert }     from '../ui/index'
import { useLang }   from '../../hooks'
import styles        from './VideoPlayer.module.css'

interface VideoPlayerProps {
  videoId:      string
  title:        string
  watched:      boolean
  onMarkWatched: () => void
}

export function VideoPlayer({ videoId, title, watched, onMarkWatched }: VideoPlayerProps) {
  const { t } = useLang()

  return (
    <div className="fade-in">
      <GlassCard padding={24} style={{ marginBottom: 20 }}>
        <div className={styles.videoWrap}>
          <iframe
            src={`https://www.youtube.com/embed/${videoId}`}
            title={title}
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
            className={styles.iframe}
          />
        </div>
      </GlassCard>

      {!watched ? (
        <div className={styles.watchRow}>
          <Button onClick={onMarkWatched} size="lg">
            ✓ {t('videoWatched')}
          </Button>
        </div>
      ) : (
        <Alert variant="success" className={styles.watchedAlert}>
          {t('videoWatched')}
        </Alert>
      )}
    </div>
  )
}
