import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { vi } from 'vitest'
import { useQuery } from '@tanstack/react-query'
import { useLocation } from 'wouter'
import Updates from '@/pages/Updates'

const mockUpdates = [
  {
    id: 1,
    namahattaId: 1,
    title: 'Weekly Satsang',
    description: 'Regular weekly spiritual gathering',
    date: '2025-01-15',
    time: '18:00',
    type: 'Satsang',
    location: 'Main Hall',
    attendees: 25,
    prasadamDistribution: 30,
    booksDistributed: 5,
    chantingRounds: 100,
    kirtan: true,
    arati: true,
    bhagwatPath: false,
    specialAttraction: 'Guest speaker from Mayapur',
    namahattaName: 'Test Namahatta',
    namahattaCity: 'Kolkata',
    namahattaState: 'West Bengal',
    createdAt: '2025-01-01T00:00:00Z'
  },
  {
    id: 2,
    namahattaId: 2,
    title: 'Janmashtami Celebration',
    description: 'Krishna Janmashtami festival celebration',
    date: '2025-08-16',
    time: '19:00',
    type: 'Festival',
    location: 'Temple Hall',
    attendees: 50,
    prasadamDistribution: 75,
    booksDistributed: 10,
    chantingRounds: 200,
    kirtan: true,
    arati: true,
    bhagwatPath: true,
    specialAttraction: 'Special drama performance',
    namahattaName: 'Mumbai Namahatta',
    namahattaCity: 'Mumbai',
    namahattaState: 'Maharashtra',
    createdAt: '2025-01-02T00:00:00Z'
  }
]

vi.mocked(useQuery).mockImplementation(({ queryKey }) => {
  const key = queryKey[0] as string
  
  if (key === '/api/namahatta-updates') {
    return {
      data: mockUpdates,
      isLoading: false,
      error: null
    }
  }
  
  if (key === '/api/namahattas') {
    return {
      data: [
        { id: 1, name: 'Test Namahatta' },
        { id: 2, name: 'Mumbai Namahatta' }
      ],
      isLoading: false,
      error: null
    }
  }
  
  return { data: [], isLoading: false, error: null }
})

vi.mocked(useLocation).mockReturnValue(['/', vi.fn()])

describe('Updates', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should render updates list', async () => {
    render(<Updates />)
    
    await waitFor(() => {
      expect(screen.getByText('Weekly Satsang')).toBeInTheDocument()
      expect(screen.getByText('Janmashtami Celebration')).toBeInTheDocument()
      expect(screen.getByText('Test Namahatta')).toBeInTheDocument()
      expect(screen.getByText('Mumbai Namahatta')).toBeInTheDocument()
    })
  })

  it('should render statistics cards', async () => {
    render(<Updates />)
    
    await waitFor(() => {
      expect(screen.getByText('Total Updates')).toBeInTheDocument()
      expect(screen.getByText('2')).toBeInTheDocument()
      expect(screen.getByText('Total Attendees')).toBeInTheDocument()
      expect(screen.getByText('75')).toBeInTheDocument()
      expect(screen.getByText('Books Distributed')).toBeInTheDocument()
      expect(screen.getByText('15')).toBeInTheDocument()
      expect(screen.getByText('Prasadam Served')).toBeInTheDocument()
      expect(screen.getByText('105')).toBeInTheDocument()
    })
  })

  it('should show update details', async () => {
    render(<Updates />)
    
    await waitFor(() => {
      expect(screen.getByText('Regular weekly spiritual gathering')).toBeInTheDocument()
      expect(screen.getByText('Krishna Janmashtami festival celebration')).toBeInTheDocument()
      expect(screen.getByText('25 attendees')).toBeInTheDocument()
      expect(screen.getByText('50 attendees')).toBeInTheDocument()
    })
  })

  it('should filter updates by search term', async () => {
    render(<Updates />)
    
    await waitFor(() => {
      const searchInput = screen.getByPlaceholderText('Search updates...')
      fireEvent.change(searchInput, { target: { value: 'Weekly' } })
      
      expect(screen.getByText('Weekly Satsang')).toBeInTheDocument()
      expect(screen.queryByText('Janmashtami Celebration')).not.toBeInTheDocument()
    })
  })

  it('should filter updates by namahatta', async () => {
    render(<Updates />)
    
    await waitFor(() => {
      const namahattaFilter = screen.getByLabelText('Filter by Namahatta')
      fireEvent.click(namahattaFilter)
      
      const testNamahattaOption = screen.getByText('Test Namahatta')
      fireEvent.click(testNamahattaOption)
      
      expect(screen.getByText('Weekly Satsang')).toBeInTheDocument()
      expect(screen.queryByText('Janmashtami Celebration')).not.toBeInTheDocument()
    })
  })

  it('should filter updates by type', async () => {
    render(<Updates />)
    
    await waitFor(() => {
      const typeFilter = screen.getByLabelText('Filter by Type')
      fireEvent.click(typeFilter)
      
      const satsangOption = screen.getByText('Satsang')
      fireEvent.click(satsangOption)
      
      expect(screen.getByText('Weekly Satsang')).toBeInTheDocument()
      expect(screen.queryByText('Janmashtami Celebration')).not.toBeInTheDocument()
    })
  })

  it('should navigate to namahatta detail when clicking on update card', async () => {
    const mockSetLocation = vi.fn()
    vi.mocked(useLocation).mockReturnValue(['/', mockSetLocation])
    
    render(<Updates />)
    
    await waitFor(() => {
      const updateCard = screen.getByText('Weekly Satsang').closest('div[class*="cursor-pointer"]')
      if (updateCard) {
        fireEvent.click(updateCard)
        expect(mockSetLocation).toHaveBeenCalledWith('/namahattas/1')
      }
    })
  })

  it('should show event status badges', async () => {
    render(<Updates />)
    
    await waitFor(() => {
      // Check for event status badges based on dates
      expect(screen.getByText('Past Event')).toBeInTheDocument() // Weekly Satsang is in past
      expect(screen.getByText('Future Event')).toBeInTheDocument() // Janmashtami is in future
    })
  })

  it('should handle loading state', () => {
    vi.mocked(useQuery).mockReturnValue({
      data: null,
      isLoading: true,
      error: null
    })
    
    render(<Updates />)
    
    expect(screen.getByTestId('updates-skeleton')).toBeInTheDocument()
  })

  it('should handle empty state', async () => {
    vi.mocked(useQuery).mockReturnValue({
      data: [],
      isLoading: false,
      error: null
    })
    
    render(<Updates />)
    
    await waitFor(() => {
      expect(screen.getByText('No updates found')).toBeInTheDocument()
    })
  })

  it('should handle error state', async () => {
    vi.mocked(useQuery).mockReturnValue({
      data: null,
      isLoading: false,
      error: new Error('API Error')
    })
    
    render(<Updates />)
    
    await waitFor(() => {
      expect(screen.getByText('Error loading updates')).toBeInTheDocument()
    })
  })

  it('should show activities badges', async () => {
    render(<Updates />)
    
    await waitFor(() => {
      expect(screen.getByText('Kirtan')).toBeInTheDocument()
      expect(screen.getByText('Arati')).toBeInTheDocument()
      expect(screen.getByText('Bhagwat Path')).toBeInTheDocument()
    })
  })

  it('should display special attractions', async () => {
    render(<Updates />)
    
    await waitFor(() => {
      expect(screen.getByText('Guest speaker from Mayapur')).toBeInTheDocument()
      expect(screen.getByText('Special drama performance')).toBeInTheDocument()
    })
  })

  it('should clear all filters', async () => {
    render(<Updates />)
    
    await waitFor(() => {
      // Apply some filters first
      const searchInput = screen.getByPlaceholderText('Search updates...')
      fireEvent.change(searchInput, { target: { value: 'Weekly' } })
      
      // Clear filters
      const clearButton = screen.getByRole('button', { name: /clear filters/i })
      fireEvent.click(clearButton)
      
      // Should show all updates again
      expect(screen.getByText('Weekly Satsang')).toBeInTheDocument()
      expect(screen.getByText('Janmashtami Celebration')).toBeInTheDocument()
    })
  })
})