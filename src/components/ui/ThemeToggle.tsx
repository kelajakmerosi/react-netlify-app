import { useTheme } from '../../hooks'
import { Button }   from './Button'

export function ThemeToggle() {
  const { theme, toggleTheme } = useTheme()
  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={toggleTheme}
      title="Toggle theme"
      style={{ width: 36, height: 36, padding: 0, justifyContent: 'center' }}
    >
      {theme === 'light' ? '🌙' : '☀️'}
    </Button>
  )
}
