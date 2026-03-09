import React from 'react'
import styles from './Skeleton.module.css'

interface SkeletonProps {
    className?: string
    width?: string | number
    height?: string | number
    borderRadius?: string | number
    style?: React.CSSProperties
}

export function Skeleton({ className = '', width, height, borderRadius, style }: SkeletonProps) {
    return (
        <div
            className={`${styles.skeleton} ${className}`}
            style={{
                width,
                height,
                borderRadius,
                ...style,
            }}
            aria-hidden="true"
        />
    )
}
