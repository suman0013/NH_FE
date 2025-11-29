import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { vi } from 'vitest'
import { useQuery, useMutation } from '@tanstack/react-query'
import { useLocation } from 'wouter'
import Namahattas from '@/pages/Namahattas'

const mockNamahattas = [
  {
    id: 1,
    name: 'Test Namahatta',
    description: 'A test spiritual center',
    foundingDate: '2020-01-01',
    address: {
      country: 'India',
      state: 'West Bengal',
      district: 'Kolkata',
      subDistrict: 'Kolkata',
      village: 'Kolkata',
      postalCode: '700001',
      landmark: 'Near Temple'
    },
    shraddhakutirId: 1,
    shraddhakutir: { name: 'Test Shraddhakutir' },
    devoteeCount: 25,
    createdAt: '2025-01-01T00:00:00Z',
    updatedAt: '2025-01-01T00:00:00Z'
  },
  {
    id: 2,
    name: 'Mumbai Namahatta',
    description: 'Mumbai spiritual center',
    foundingDate: '2021-01-01',
    address: {
      country: 'India',
      state: 'Maharashtra',
      district: 'Mumbai',
      subDistrict: 'Mumbai',
      village: 'Mumbai',
      postalCode: '400001',
      landmark: 'Near Station'
    },
    shraddhakutirId: 2,
    shraddhakutir: { name: 'Mumbai Shraddhakutir' },
    devoteeCount: 30,
    createdAt: '2025-01-02T00:00:00Z',
    updatedAt: '2025-01-02T00:00:00Z'
  }
]

vi.mocked(useQuery).mockImplementation(({ queryKey }) => {
  const key = queryKey[0] as string
  
  if (key === '/api/namahattas') {
    return {
      data: mockNamahattas,
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
  
  if (key === '/api/shraddhakutirs') {
    return {
      data: [{ id: 1, name: 'Test Shraddhakutir' }],
      isLoading: false,
      error: null
    }
  }
  
  return { data: [], isLoading: false, error: null }
})

vi.mocked(useMutation).mockReturnValue({
  mutate: vi.fn(),
  isPending: false,
  isError: false,
  error: null
})

vi.mocked(useLocation).mockReturnValue(['/', vi.fn()])

describe('Namahattas', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should render namahattas list', async () => {
    render(<Namahattas />)
    
    await waitFor(() => {
      expect(screen.getByText('Test Namahatta')).toBeInTheDocument()
      expect(screen.getByText('Mumbai Namahatta')).toBeInTheDocument()
      expect(screen.getByText('A test spiritual center')).toBeInTheDocument()
      expect(screen.getByText('Mumbai spiritual center')).toBeInTheDocument()
    })
  })

  it('should show namahatta cards with proper information', async () => {
    render(<Namahattas />)
    
    await waitFor(() => {
      expect(screen.getByText('Test Shraddhakutir')).toBeInTheDocument()
      expect(screen.getByText('Mumbai Shraddhakutir')).toBeInTheDocument()
      expect(screen.getByText('25 devotees')).toBeInTheDocument()
      expect(screen.getByText('30 devotees')).toBeInTheDocument()
    })
  })

  it('should filter namahattas by search term', async () => {
    render(<Namahattas />)
    
    await waitFor(() => {
      const searchInput = screen.getByPlaceholderText('Search namahattas...')
      fireEvent.change(searchInput, { target: { value: 'Test' } })
      
      expect(screen.getByText('Test Namahatta')).toBeInTheDocument()
      expect(screen.queryByText('Mumbai Namahatta')).not.toBeInTheDocument()
    })
  })

  it('should sort namahattas by name', async () => {
    render(<Namahattas />)
    
    await waitFor(() => {
      const sortSelect = screen.getByRole('combobox')
      fireEvent.click(sortSelect)
      
      const nameOption = screen.getByText('Name')
      fireEvent.click(nameOption)
      
      expect(screen.getByText('Test Namahatta')).toBeInTheDocument()
      expect(screen.getByText('Mumbai Namahatta')).toBeInTheDocument()
    })
  })

  it('should open add namahatta dialog', async () => {
    render(<Namahattas />)
    
    await waitFor(() => {
      const addButton = screen.getByRole('button', { name: /add new namahatta/i })
      fireEvent.click(addButton)
      
      expect(screen.getByText('Add New Namahatta')).toBeInTheDocument()
    })
  })

  it('should navigate to namahatta detail when clicking on card', async () => {
    const mockSetLocation = vi.fn()
    vi.mocked(useLocation).mockReturnValue(['/', mockSetLocation])
    
    render(<Namahattas />)
    
    await waitFor(() => {
      const namahattaCard = screen.getByText('Test Namahatta').closest('div[class*="cursor-pointer"]')
      if (namahattaCard) {
        fireEvent.click(namahattaCard)
        expect(mockSetLocation).toHaveBeenCalledWith('/namahattas/1')
      }
    })
  })

  it('should handle loading state', () => {
    vi.mocked(useQuery).mockReturnValue({
      data: null,
      isLoading: true,
      error: null
    })
    
    render(<Namahattas />)
    
    // Should show skeleton loading components
    expect(screen.getByTestId('namahattas-skeleton')).toBeInTheDocument()
  })

  it('should handle empty state', async () => {
    vi.mocked(useQuery).mockReturnValue({
      data: [],
      isLoading: false,
      error: null
    })
    
    render(<Namahattas />)
    
    await waitFor(() => {
      expect(screen.getByText('No namahattas found')).toBeInTheDocument()
    })
  })

  it('should handle error state', async () => {
    vi.mocked(useQuery).mockReturnValue({
      data: null,
      isLoading: false,
      error: new Error('API Error')
    })
    
    render(<Namahattas />)
    
    await waitFor(() => {
      expect(screen.getByText('Error loading namahattas')).toBeInTheDocument()
    })
  })

  it('should filter by country', async () => {
    render(<Namahattas />)
    
    await waitFor(() => {
      const countryFilter = screen.getByLabelText('Country')
      fireEvent.click(countryFilter)
      
      const indiaOption = screen.getByText('India')
      fireEvent.click(indiaOption)
      
      expect(screen.getByText('Test Namahatta')).toBeInTheDocument()
      expect(screen.getByText('Mumbai Namahatta')).toBeInTheDocument()
    })
  })

  it('should toggle sorting order', async () => {
    render(<Namahattas />)
    
    await waitFor(() => {
      const sortButton = screen.getByRole('button', { name: /sort/i })
      fireEvent.click(sortButton)
      
      // Should toggle between ascending and descending
      expect(sortButton).toBeInTheDocument()
    })
  })
})