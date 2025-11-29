import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { vi } from 'vitest'
import { useQuery } from '@tanstack/react-query'
import Dashboard from '@/pages/Dashboard'
import { useLocation } from 'wouter'

// Mock the hooks
vi.mocked(useQuery).mockImplementation(({ queryKey }) => {
  const key = queryKey[0] as string
  
  if (key === '/api/dashboard') {
    return {
      data: {
        totalDevotees: 250,
        totalNamahattas: 100,
        recentUpdates: [
          {
            id: 1,
            namahattaId: 1,
            title: 'Weekly Satsang',
            description: 'Regular weekly spiritual gathering',
            date: '2025-01-15',
            time: '18:00',
            type: 'Satsang',
            location: 'Main Hall',
            namahattaName: 'Test Namahatta',
            namahattaCity: 'Test City',
            namahattaState: 'Test State'
          }
        ]
      },
      isLoading: false,
      error: null
    }
  }
  
  if (key === '/api/status-distribution') {
    return {
      data: [
        { statusName: 'Shraddhavan', count: 100 },
        { statusName: 'Sadhusangi', count: 80 },
        { statusName: 'Gour Sevak', count: 50 },
        { statusName: 'Harinam Diksha', count: 20 }
      ],
      isLoading: false,
      error: null
    }
  }
  
  if (key === '/api/hierarchy') {
    return {
      data: {
        founder: [{ id: 1, name: 'His Divine Grace A.C. Bhaktivedanta Swami Prabhupada', role: 'Founder-Acharya' }],
        currentAcharya: [{ id: 2, name: 'His Holiness Jayapataka Swami', role: 'Current Acharya' }],
        regionalDirectors: [{ id: 3, name: 'Test Regional Director', role: 'Regional Director' }],
        coRegionalDirectors: [{ id: 4, name: 'Test Co-Regional Director', role: 'Co-Regional Director' }]
      },
      isLoading: false,
      error: null
    }
  }
  
  return { data: null, isLoading: false, error: null }
})

vi.mocked(useLocation).mockReturnValue(['/', vi.fn()])

describe('Dashboard', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should render dashboard with statistics', async () => {
    render(<Dashboard />)
    
    await waitFor(() => {
      expect(screen.getByText('250')).toBeInTheDocument()
      expect(screen.getByText('100')).toBeInTheDocument()
      expect(screen.getByText('Total Devotees')).toBeInTheDocument()
      expect(screen.getByText('Total Namahattas')).toBeInTheDocument()
    })
  })

  it('should render recent updates section', async () => {
    render(<Dashboard />)
    
    await waitFor(() => {
      expect(screen.getByText('Recent Updates')).toBeInTheDocument()
      expect(screen.getByText('Weekly Satsang')).toBeInTheDocument()
      expect(screen.getByText('Test Namahatta')).toBeInTheDocument()
    })
  })

  it('should render status distribution chart', async () => {
    render(<Dashboard />)
    
    await waitFor(() => {
      expect(screen.getByText('Status Distribution')).toBeInTheDocument()
      expect(screen.getByText('Shraddhavan')).toBeInTheDocument()
      expect(screen.getByText('100')).toBeInTheDocument()
    })
  })

  it('should render leadership hierarchy', async () => {
    render(<Dashboard />)
    
    await waitFor(() => {
      expect(screen.getByText('Leadership Hierarchy')).toBeInTheDocument()
      expect(screen.getByText('His Divine Grace A.C. Bhaktivedanta Swami Prabhupada')).toBeInTheDocument()
      expect(screen.getByText('Test Regional Director')).toBeInTheDocument()
    })
  })

  it('should navigate to devotees page when clicking total devotees', async () => {
    const mockSetLocation = vi.fn()
    vi.mocked(useLocation).mockReturnValue(['/', mockSetLocation])
    
    render(<Dashboard />)
    
    await waitFor(() => {
      const devoteeCard = screen.getByText('Total Devotees').closest('button')
      if (devoteeCard) {
        fireEvent.click(devoteeCard)
        expect(mockSetLocation).toHaveBeenCalledWith('/devotees')
      }
    })
  })

  it('should navigate to namahattas page when clicking total namahattas', async () => {
    const mockSetLocation = vi.fn()
    vi.mocked(useLocation).mockReturnValue(['/', mockSetLocation])
    
    render(<Dashboard />)
    
    await waitFor(() => {
      const namahattaCard = screen.getByText('Total Namahattas').closest('button')
      if (namahattaCard) {
        fireEvent.click(namahattaCard)
        expect(mockSetLocation).toHaveBeenCalledWith('/namahattas')
      }
    })
  })

  it('should handle loading state', () => {
    vi.mocked(useQuery).mockReturnValue({
      data: null,
      isLoading: true,
      error: null
    })
    
    render(<Dashboard />)
    
    // Should show skeleton loading components
    expect(screen.getByTestId('dashboard-skeleton')).toBeInTheDocument()
  })

  it('should handle error state', async () => {
    vi.mocked(useQuery).mockReturnValue({
      data: null,
      isLoading: false,
      error: new Error('API Error')
    })
    
    render(<Dashboard />)
    
    await waitFor(() => {
      expect(screen.getByText('Error loading dashboard data')).toBeInTheDocument()
    })
  })
})