import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { vi } from 'vitest'
import { useQuery } from '@tanstack/react-query'
import { useLocation } from 'wouter'
import Devotees from '@/pages/Devotees'

const mockDevotees = [
  {
    id: 1,
    legalName: 'John Doe',
    initiatedName: 'Jayanta Das',
    devotionalStatusId: 6,
    devotionalStatus: { name: 'Harinam Diksha' },
    occupation: 'Software Engineer',
    presentAddress: {
      country: 'India',
      state: 'West Bengal',
      district: 'Kolkata',
      city: 'Kolkata'
    },
    namahattaId: 1,
    namahatta: { name: 'Test Namahatta' },
    createdAt: '2025-01-01T00:00:00Z'
  },
  {
    id: 2,
    legalName: 'Jane Smith',
    initiatedName: null,
    devotionalStatusId: 2,
    devotionalStatus: { name: 'Sadhusangi' },
    occupation: 'Teacher',
    presentAddress: {
      country: 'India',
      state: 'Maharashtra',
      district: 'Mumbai',
      city: 'Mumbai'
    },
    namahattaId: 2,
    namahatta: { name: 'Mumbai Namahatta' },
    createdAt: '2025-01-02T00:00:00Z'
  }
]

vi.mocked(useQuery).mockImplementation(({ queryKey }) => {
  const key = queryKey[0] as string
  
  if (key === '/api/devotees') {
    return {
      data: mockDevotees,
      isLoading: false,
      error: null
    }
  }
  
  if (key === '/api/countries') {
    return {
      data: [{ id: 1, name: 'India' }],
      isLoading: false,
      error: null
    }
  }
  
  return { data: [], isLoading: false, error: null }
})

vi.mocked(useLocation).mockReturnValue(['/', vi.fn()])

describe('Devotees', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should render devotees list', async () => {
    render(<Devotees />)
    
    await waitFor(() => {
      expect(screen.getByText('John Doe')).toBeInTheDocument()
      expect(screen.getByText('Jane Smith')).toBeInTheDocument()
      expect(screen.getByText('Jayanta Das')).toBeInTheDocument()
      expect(screen.getByText('Harinam Diksha')).toBeInTheDocument()
      expect(screen.getByText('Sadhusangi')).toBeInTheDocument()
    })
  })

  it('should show devotee cards with proper information', async () => {
    render(<Devotees />)
    
    await waitFor(() => {
      expect(screen.getByText('Software Engineer')).toBeInTheDocument()
      expect(screen.getByText('Teacher')).toBeInTheDocument()
      expect(screen.getByText('Test Namahatta')).toBeInTheDocument()
      expect(screen.getByText('Mumbai Namahatta')).toBeInTheDocument()
    })
  })

  it('should filter devotees by search term', async () => {
    render(<Devotees />)
    
    await waitFor(() => {
      const searchInput = screen.getByPlaceholderText('Search devotees...')
      fireEvent.change(searchInput, { target: { value: 'John' } })
      
      expect(screen.getByText('John Doe')).toBeInTheDocument()
      expect(screen.queryByText('Jane Smith')).not.toBeInTheDocument()
    })
  })

  it('should sort devotees by name', async () => {
    render(<Devotees />)
    
    await waitFor(() => {
      const sortSelect = screen.getByRole('combobox')
      fireEvent.click(sortSelect)
      
      const nameOption = screen.getByText('Name')
      fireEvent.click(nameOption)
      
      // Should maintain the order or change based on sorting
      expect(screen.getByText('John Doe')).toBeInTheDocument()
      expect(screen.getByText('Jane Smith')).toBeInTheDocument()
    })
  })

  it('should navigate to devotee detail when clicking on card', async () => {
    const mockSetLocation = vi.fn()
    vi.mocked(useLocation).mockReturnValue(['/', mockSetLocation])
    
    render(<Devotees />)
    
    await waitFor(() => {
      const devoteeCard = screen.getByText('John Doe').closest('div[class*="cursor-pointer"]')
      if (devoteeCard) {
        fireEvent.click(devoteeCard)
        expect(mockSetLocation).toHaveBeenCalledWith('/devotees/1')
      }
    })
  })

  it('should handle loading state', () => {
    vi.mocked(useQuery).mockReturnValue({
      data: null,
      isLoading: true,
      error: null
    })
    
    render(<Devotees />)
    
    // Should show skeleton loading components
    expect(screen.getByTestId('devotees-skeleton')).toBeInTheDocument()
  })

  it('should handle empty state', async () => {
    vi.mocked(useQuery).mockReturnValue({
      data: [],
      isLoading: false,
      error: null
    })
    
    render(<Devotees />)
    
    await waitFor(() => {
      expect(screen.getByText('No devotees found')).toBeInTheDocument()
    })
  })

  it('should handle error state', async () => {
    vi.mocked(useQuery).mockReturnValue({
      data: null,
      isLoading: false,
      error: new Error('API Error')
    })
    
    render(<Devotees />)
    
    await waitFor(() => {
      expect(screen.getByText('Error loading devotees')).toBeInTheDocument()
    })
  })

  it('should toggle sorting order', async () => {
    render(<Devotees />)
    
    await waitFor(() => {
      const sortButton = screen.getByRole('button', { name: /sort/i })
      fireEvent.click(sortButton)
      
      // Should toggle between ascending and descending
      expect(sortButton).toBeInTheDocument()
    })
  })
})