import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { vi } from 'vitest'
import { useQuery, useMutation } from '@tanstack/react-query'
import NamahattaForm from '@/components/forms/NamahattaForm'
import { useToast } from '@/hooks/use-toast'

const mockNamahatta = {
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
  malaSenapoti: 'John Doe',
  mahaChakraSenapoti: 'Jane Smith',
  chakraSenapoti: 'Bob Johnson',
  upaChakraSenapoti: 'Alice Brown',
  secretary: 'Charlie Wilson'
}

const mockToast = vi.fn()
vi.mocked(useToast).mockReturnValue({ toast: mockToast })

const mockMutation = {
  mutate: vi.fn(),
  isPending: false,
  isError: false,
  error: null
}

vi.mocked(useMutation).mockReturnValue(mockMutation)

vi.mocked(useQuery).mockImplementation(({ queryKey }) => {
  const key = queryKey[0] as string
  
  if (key === '/api/shraddhakutirs') {
    return {
      data: [{ id: 1, name: 'Test Shraddhakutir' }],
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

describe('NamahattaForm', () => {
  const mockOnSuccess = vi.fn()
  const mockOnCancel = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should render form fields', () => {
    render(<NamahattaForm onSuccess={mockOnSuccess} onCancel={mockOnCancel} />)
    
    expect(screen.getByLabelText('Namahatta Name')).toBeInTheDocument()
    expect(screen.getByLabelText('Description')).toBeInTheDocument()
    expect(screen.getByLabelText('Founding Date')).toBeInTheDocument()
    expect(screen.getByLabelText('Shraddhakutir')).toBeInTheDocument()
  })

  it('should populate form with existing namahatta data', () => {
    render(<NamahattaForm namahatta={mockNamahatta} onSuccess={mockOnSuccess} onCancel={mockOnCancel} />)
    
    expect(screen.getByDisplayValue('Test Namahatta')).toBeInTheDocument()
    expect(screen.getByDisplayValue('A test spiritual center')).toBeInTheDocument()
    expect(screen.getByDisplayValue('2020-01-01')).toBeInTheDocument()
    expect(screen.getByDisplayValue('John Doe')).toBeInTheDocument()
    expect(screen.getByDisplayValue('Jane Smith')).toBeInTheDocument()
  })

  it('should validate required fields', async () => {
    render(<NamahattaForm onSuccess={mockOnSuccess} onCancel={mockOnCancel} />)
    
    const submitButton = screen.getByRole('button', { name: /save/i })
    fireEvent.click(submitButton)
    
    await waitFor(() => {
      expect(screen.getByText('Namahatta name is required')).toBeInTheDocument()
      expect(screen.getByText('Description is required')).toBeInTheDocument()
      expect(screen.getByText('Founding date is required')).toBeInTheDocument()
    })
  })

  it('should validate address fields', async () => {
    render(<NamahattaForm onSuccess={mockOnSuccess} onCancel={mockOnCancel} />)
    
    // Fill required basic fields
    fireEvent.change(screen.getByLabelText('Namahatta Name'), { target: { value: 'Test' } })
    fireEvent.change(screen.getByLabelText('Description'), { target: { value: 'Test description' } })
    fireEvent.change(screen.getByLabelText('Founding Date'), { target: { value: '2020-01-01' } })
    
    const submitButton = screen.getByRole('button', { name: /save/i })
    fireEvent.click(submitButton)
    
    await waitFor(() => {
      expect(screen.getByText('Country is required')).toBeInTheDocument()
      expect(screen.getByText('State is required')).toBeInTheDocument()
      expect(screen.getByText('District is required')).toBeInTheDocument()
    })
  })

  it('should submit form with valid data', async () => {
    render(<NamahattaForm onSuccess={mockOnSuccess} onCancel={mockOnCancel} />)
    
    // Fill required fields
    fireEvent.change(screen.getByLabelText('Namahatta Name'), { target: { value: 'Test Namahatta' } })
    fireEvent.change(screen.getByLabelText('Description'), { target: { value: 'Test description' } })
    fireEvent.change(screen.getByLabelText('Founding Date'), { target: { value: '2020-01-01' } })
    
    // Fill address fields
    fireEvent.change(screen.getByLabelText('Country'), { target: { value: 'India' } })
    fireEvent.change(screen.getByLabelText('State'), { target: { value: 'West Bengal' } })
    fireEvent.change(screen.getByLabelText('District'), { target: { value: 'Kolkata' } })
    fireEvent.change(screen.getByLabelText('Sub-District'), { target: { value: 'Kolkata' } })
    fireEvent.change(screen.getByLabelText('Village'), { target: { value: 'Kolkata' } })
    fireEvent.change(screen.getByLabelText('Postal Code'), { target: { value: '700001' } })
    
    // Fill leadership fields
    fireEvent.change(screen.getByLabelText('Mala Senapoti'), { target: { value: 'John Doe' } })
    
    const submitButton = screen.getByRole('button', { name: /save/i })
    fireEvent.click(submitButton)
    
    await waitFor(() => {
      expect(mockMutation.mutate).toHaveBeenCalled()
    })
  })

  it('should handle cancel action', () => {
    render(<NamahattaForm onSuccess={mockOnSuccess} onCancel={mockOnCancel} />)
    
    const cancelButton = screen.getByRole('button', { name: /cancel/i })
    fireEvent.click(cancelButton)
    
    expect(mockOnCancel).toHaveBeenCalled()
  })

  it('should show loading state during submission', async () => {
    vi.mocked(useMutation).mockReturnValue({
      ...mockMutation,
      isPending: true
    })
    
    render(<NamahattaForm onSuccess={mockOnSuccess} onCancel={mockOnCancel} />)
    
    expect(screen.getByText('Saving...')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /saving/i })).toBeDisabled()
  })

  it('should handle form submission error', async () => {
    vi.mocked(useMutation).mockReturnValue({
      ...mockMutation,
      isError: true,
      error: new Error('Submission failed')
    })
    
    render(<NamahattaForm onSuccess={mockOnSuccess} onCancel={mockOnCancel} />)
    
    await waitFor(() => {
      expect(mockToast).toHaveBeenCalledWith({
        title: 'Error',
        description: 'Failed to save namahatta. Please try again.',
        variant: 'destructive'
      })
    })
  })

  it('should render leadership roles section', () => {
    render(<NamahattaForm onSuccess={mockOnSuccess} onCancel={mockOnCancel} />)
    
    expect(screen.getByText('Leadership Roles')).toBeInTheDocument()
    expect(screen.getByLabelText('Mala Senapoti')).toBeInTheDocument()
    expect(screen.getByLabelText('Maha Chakra Senapoti')).toBeInTheDocument()
    expect(screen.getByLabelText('Chakra Senapoti')).toBeInTheDocument()
    expect(screen.getByLabelText('Upa Chakra Senapoti')).toBeInTheDocument()
    expect(screen.getByLabelText('Secretary')).toBeInTheDocument()
  })

  it('should validate postal code format', async () => {
    render(<NamahattaForm onSuccess={mockOnSuccess} onCancel={mockOnCancel} />)
    
    const postalCodeInput = screen.getByLabelText('Postal Code')
    fireEvent.change(postalCodeInput, { target: { value: '123' } })
    
    const submitButton = screen.getByRole('button', { name: /save/i })
    fireEvent.click(submitButton)
    
    await waitFor(() => {
      expect(screen.getByText('Postal code must be 6 digits')).toBeInTheDocument()
    })
  })

  it('should show address section', () => {
    render(<NamahattaForm onSuccess={mockOnSuccess} onCancel={mockOnCancel} />)
    
    expect(screen.getByText('Address Information')).toBeInTheDocument()
    expect(screen.getByLabelText('Country')).toBeInTheDocument()
    expect(screen.getByLabelText('State')).toBeInTheDocument()
    expect(screen.getByLabelText('District')).toBeInTheDocument()
    expect(screen.getByLabelText('Sub-District')).toBeInTheDocument()
    expect(screen.getByLabelText('Village')).toBeInTheDocument()
    expect(screen.getByLabelText('Postal Code')).toBeInTheDocument()
    expect(screen.getByLabelText('Landmark')).toBeInTheDocument()
  })
})