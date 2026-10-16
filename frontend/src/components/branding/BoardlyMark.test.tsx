// src/components/BoardlyMark.test.tsx
import { render, screen } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import BoardlyMark from './BoardlyMark'

describe('BoardlyMark Component Test Suite', () => {
  it('renders the mark symbol correctly with hidden accessibility attribute', () => {
    const { container } = render(<BoardlyMark />)
    
    // ตรวจสอบว่าแสดงสัญลักษณ์ ♟ ออกมา
    const markElement = container.querySelector('span')
    expect(markElement).toBeInTheDocument()
    expect(markElement).toHaveTextContent('♟')
    
    // ตรวจสอบว่ามีคุณสมบัติ aria-hidden="true" ตามที่กำหนดไว้ในคอมโพเนนต์
    expect(markElement).toHaveAttribute('aria-hidden', 'true')
  })

  it('applies custom className correctly when provided', () => {
    render(<BoardlyMark className="text-xl text-primary" />)
    
    // ตรวจสอบว่า className ที่ส่งเข้าไปถูกนำไปเรนเดอร์ที่ element จริง
    const markElement = screen.getByText('♟')
    expect(markElement).toHaveClass('text-xl')
    expect(markElement).toHaveClass('text-primary')
  })
})