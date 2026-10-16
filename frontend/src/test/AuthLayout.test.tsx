// src/layouts/AuthLayout.test.tsx
import { render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { describe, it, expect } from 'vitest'
import AuthLayout from '../layouts/AuthLayout'

describe('AuthLayout Test Suite', () => {
  it('renders auth child routes correctly[cite: 6]', () => {
    render(
      <MemoryRouter initialEntries={['/login']}>
        <Routes>
          <Route element={<AuthLayout />}>
            <Route path="/login" element={<div>Login View Container</div>} />
          </Route>
        </Routes>
      </MemoryRouter>
    )

    expect(screen.getByText('Login View Container')).toBeInTheDocument()
  })
})