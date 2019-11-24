import React from 'react'
import './style.css'

export type CardSize =
    | '1x0'
    | '1x1'
    | '1x2'
    | '1x3'
    | '1x4'
    | '2x0'
    | '2x1'
    | '2x2'
    | '2x3'
    | '2x4'
    | '3x0'
    | '3x1'
    | '3x2'
    | '3x3'
    | '3x4'
    | '4x0'
    | '4x1'
    | '4x2'
    | '4x3'
    | '4x4'

export interface CardProps {
    cardSize?: CardSize
    children?: React.ReactNode
}

export function Card({ cardSize, children }: CardProps) {
    const className = `pkb-card pkb-card-${cardSize || '1x1'}`
    return <div className={`pkd-card ${className}`}>{children}</div>
}
