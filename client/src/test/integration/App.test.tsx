import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { vi } from 'vitest'
import App from '@/App'
import { useQuery } from '@tanstack/react-query'

// Mock all required modules
vi.mock('@/lib/api-config', () => ({
  logApiConfig: vi.fn()
}))

vi.mocked(useQuery).mockImplementation(({ queryKey }) => {
  const key = queryKey[0] as string
  
  if (key === '/api/dashboard') {
    return {
      data: {
        totalDevotees: 250,
        totalNamahattas: 100,
        recentUpdates: []
      },
      isLoading: false,
      error: null
    }
  }
  
  return { data: null, isLoading: false, error: null }
})

describe('App Integration', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should render app layout', () => {
    render(<App />)
    
    expect(screen.getByTestId('app-layout')).toBeInTheDocument()
  })

  it('should render navigation menu', () => {
    render(<App />)
    
    expect(screen.getByTestId('navigation-menu')).toBeInTheDocument()
  })

  it('should render dashboard by default', async () => {
    render(<App />)
    
    await waitFor(() => {
      expect(screen.getByText('Dashboard')).toBeInTheDocument()
      expect(screen.getByText('Total Devotees')).toBeInTheDocument()
      expect(screen.getByText('Total Namahattas')).toBeInTheDocument()
    })
  })

  it('should handle routing', async () => {
    const { container } = render(<App />)
    
    // Mock location change
    window.history.pushState({}, '', '/devotees')
    
    await waitFor(() => {
      expect(container.querySelector('[data-testid="devotees-page"]')).toBeInTheDocument()
    })
  })

  it('should render theme provider', () => {
    render(<App />)
    
    expect(screen.getByTestId('theme-provider')).toBeInTheDocument()
  })

  it('should handle 404 routes', async () => {
    window.history.pushState({}, '', '/non-existent-route')
    
    render(<App />)
    
    await waitFor(() => {
      expect(screen.getByText('Page Not Found')).toBeInTheDocument()
    })
  })

  it('should render all navigation links', () => {
    render(<App />)
    
    expect(screen.getByText('Dashboard')).toBeInTheDocument()
    expect(screen.getByText('Devotees')).toBeInTheDocument()
    expect(screen.getByText('Namahattas')).toBeInTheDocument()
    expect(screen.getByText('Updates')).toBeInTheDocument()
    expect(screen.getByText('Map')).toBeInTheDocument()
    expect(screen.getByText('Hierarchy')).toBeInTheDocument()
  })

  it('should handle mobile navigation', () => {
    render(<App />)
    
    const mobileMenuButton = screen.getByTestId('mobile-menu-button')
    fireEvent.click(mobileMenuButton)
    
    expect(screen.getByTestId('mobile-menu')).toBeInTheDocument()
  })

  it('should handle theme switching', () => {
    render(<App />)
    
    const themeToggle = screen.getByTestId('theme-toggle')
    fireEvent.click(themeToggle)
    
    expect(document.documentElement).toHaveClass('dark')
  })

  it('should render toast notifications', () => {
    render(<App />)
    
    expect(screen.getByTestId('toaster')).toBeInTheDocument()
  })

  it('should handle scroll to top', () => {
    render(<App />)
    
    const scrollToTop = screen.getByTestId('scroll-to-top')
    expect(scrollToTop).toBeInTheDocument()
    
    // Mock scroll event
    window.scrollTo(0, 1000)
    fireEvent.scroll(window)
    
    expect(scrollToTop).toBeVisible()
  })
})