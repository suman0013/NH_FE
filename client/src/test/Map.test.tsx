import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { vi } from 'vitest'
import { useQuery } from '@tanstack/react-query'
import Map from '@/pages/Map'

const mockMapData = [
  {
    id: 1,
    name: 'West Bengal',
    type: 'state',
    count: 50,
    coordinates: [88.3639, 22.5726],
    level: 'state',
    parent: 'India'
  },
  {
    id: 2,
    name: 'Maharashtra',
    type: 'state',
    count: 30,
    coordinates: [75.7139, 19.7515],
    level: 'state',
    parent: 'India'
  }
]

vi.mocked(useQuery).mockImplementation(({ queryKey }) => {
  const key = queryKey[0] as string
  
  if (key === '/api/map-data') {
    return {
      data: mockMapData,
      isLoading: false,
      error: null
    }
  }
  
  return { data: [], isLoading: false, error: null }
})

describe('Map', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should render map container', async () => {
    render(<Map />)
    
    await waitFor(() => {
      expect(screen.getByTestId('composable-map')).toBeInTheDocument()
    })
  })

  it('should render geographic data markers', async () => {
    render(<Map />)
    
    await waitFor(() => {
      expect(screen.getByText('West Bengal')).toBeInTheDocument()
      expect(screen.getByText('Maharashtra')).toBeInTheDocument()
      expect(screen.getByText('50')).toBeInTheDocument()
      expect(screen.getByText('30')).toBeInTheDocument()
    })
  })

  it('should handle loading state', () => {
    vi.mocked(useQuery).mockReturnValue({
      data: null,
      isLoading: true,
      error: null
    })
    
    render(<Map />)
    
    expect(screen.getByTestId('map-skeleton')).toBeInTheDocument()
  })

  it('should handle error state', async () => {
    vi.mocked(useQuery).mockReturnValue({
      data: null,
      isLoading: false,
      error: new Error('API Error')
    })
    
    render(<Map />)
    
    await waitFor(() => {
      expect(screen.getByText('Error loading map data')).toBeInTheDocument()
    })
  })

  it('should show zoom controls', async () => {
    render(<Map />)
    
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /zoom in/i })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /zoom out/i })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /reset zoom/i })).toBeInTheDocument()
    })
  })

  it('should handle marker clicks', async () => {
    render(<Map />)
    
    await waitFor(() => {
      const marker = screen.getByTestId('marker')
      fireEvent.click(marker)
      
      // Should show tooltip or detail view
      expect(screen.getByText('West Bengal')).toBeInTheDocument()
    })
  })

  it('should display legend', async () => {
    render(<Map />)
    
    await waitFor(() => {
      expect(screen.getByText('Legend')).toBeInTheDocument()
      expect(screen.getByText('Namahatta Count')).toBeInTheDocument()
    })
  })

  it('should handle empty map data', async () => {
    vi.mocked(useQuery).mockReturnValue({
      data: [],
      isLoading: false,
      error: null
    })
    
    render(<Map />)
    
    await waitFor(() => {
      expect(screen.getByText('No map data available')).toBeInTheDocument()
    })
  })

  it('should show geographic hierarchy controls', async () => {
    render(<Map />)
    
    await waitFor(() => {
      expect(screen.getByText('View by:')).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /country/i })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /state/i })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /district/i })).toBeInTheDocument()
    })
  })

  it('should switch between different geographic levels', async () => {
    render(<Map />)
    
    await waitFor(() => {
      const stateButton = screen.getByRole('button', { name: /state/i })
      fireEvent.click(stateButton)
      
      const districtButton = screen.getByRole('button', { name: /district/i })
      fireEvent.click(districtButton)
      
      expect(districtButton).toHaveClass('active')
    })
  })
})