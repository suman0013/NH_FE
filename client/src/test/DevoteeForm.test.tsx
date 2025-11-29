import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { vi } from 'vitest'
import { useQuery, useMutation } from '@tanstack/react-query'
import DevoteeForm from '@/components/forms/DevoteeForm'
import { useToast } from '@/hooks/use-toast'

const mockDevotee = {
  id: 1,
  legalName: 'John Doe',
  initiatedName: 'Jayanta Das',
  dateOfBirth: '1990-01-01',
  gender: 'Male',
  bloodGroup: 'O+',
  fatherName: 'John Sr.',
  motherName: 'Jane Doe',
  spouseName: 'Mary Doe',
  occupation: 'Software Engineer',
  email: 'john@example.com',
  phone: '1234567890',
  whatsapp: '1234567890',
  devotionalStatusId: 6,
  namahattaId: 1,
  presentAddress: {
    country: 'India',
    state: 'West Bengal',
    district: 'Kolkata',
    subDistrict: 'Kolkata',
    village: 'Kolkata',
    postalCode: '700001',
    landmark: 'Near Temple'
  },
  permanentAddress: {
    country: 'India',
    state: 'West Bengal',
    district: 'Kolkata',
    subDistrict: 'Kolkata',
    village: 'Kolkata',
    postalCode: '700001',
    landmark: 'Near Temple'
  },
  harinamInitiationDate: '2020-01-01',
  pancharatrikInitiationDate: '2021-01-01',
  courses: []
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
  
  if (key === '/api/devotional-statuses') {
    return {
      data: [
        { id: 1, name: 'Shraddhavan' },
        { id: 2, name: 'Sadhusangi' },
        { id: 6, name: 'Harinam Diksha' }
      ],
      isLoading: false,
      error: null
    }
  }
  
  if (key === '/api/namahattas') {
    return {
      data: [{ id: 1, name: 'Test Namahatta' }],
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

describe('DevoteeForm', () => {
  const mockOnSuccess = vi.fn()
  const mockOnCancel = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should render form fields', () => {
    render(<DevoteeForm onSuccess={mockOnSuccess} onCancel={mockOnCancel} />)
    
    expect(screen.getByLabelText('Legal Name')).toBeInTheDocument()
    expect(screen.getByLabelText('Date of Birth')).toBeInTheDocument()
    expect(screen.getByLabelText('Gender')).toBeInTheDocument()
    expect(screen.getByLabelText('Email')).toBeInTheDocument()
    expect(screen.getByLabelText('Phone')).toBeInTheDocument()
    expect(screen.getByLabelText('Occupation')).toBeInTheDocument()
  })

  it('should populate form with existing devotee data', () => {
    render(<DevoteeForm devotee={mockDevotee} onSuccess={mockOnSuccess} onCancel={mockOnCancel} />)
    
    expect(screen.getByDisplayValue('John Doe')).toBeInTheDocument()
    expect(screen.getByDisplayValue('Jayanta Das')).toBeInTheDocument()
    expect(screen.getByDisplayValue('john@example.com')).toBeInTheDocument()
    expect(screen.getByDisplayValue('Software Engineer')).toBeInTheDocument()
  })

  it('should validate required fields', async () => {
    render(<DevoteeForm onSuccess={mockOnSuccess} onCancel={mockOnCancel} />)
    
    const submitButton = screen.getByRole('button', { name: /save/i })
    fireEvent.click(submitButton)
    
    await waitFor(() => {
      expect(screen.getByText('Legal name is required')).toBeInTheDocument()
      expect(screen.getByText('Date of birth is required')).toBeInTheDocument()
      expect(screen.getByText('Gender is required')).toBeInTheDocument()
    })
  })

  it('should validate email format', async () => {
    render(<DevoteeForm onSuccess={mockOnSuccess} onCancel={mockOnCancel} />)
    
    const emailInput = screen.getByLabelText('Email')
    fireEvent.change(emailInput, { target: { value: 'invalid-email' } })
    
    const submitButton = screen.getByRole('button', { name: /save/i })
    fireEvent.click(submitButton)
    
    await waitFor(() => {
      expect(screen.getByText('Please enter a valid email address')).toBeInTheDocument()
    })
  })

  it('should validate phone number format', async () => {
    render(<DevoteeForm onSuccess={mockOnSuccess} onCancel={mockOnCancel} />)
    
    const phoneInput = screen.getByLabelText('Phone')
    fireEvent.change(phoneInput, { target: { value: '123' } })
    
    const submitButton = screen.getByRole('button', { name: /save/i })
    fireEvent.click(submitButton)
    
    await waitFor(() => {
      expect(screen.getByText('Phone number must be at least 10 digits')).toBeInTheDocument()
    })
  })

  it('should submit form with valid data', async () => {
    render(<DevoteeForm onSuccess={mockOnSuccess} onCancel={mockOnCancel} />)
    
    // Fill required fields
    fireEvent.change(screen.getByLabelText('Legal Name'), { target: { value: 'Test User' } })
    fireEvent.change(screen.getByLabelText('Date of Birth'), { target: { value: '1990-01-01' } })
    fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'test@example.com' } })
    fireEvent.change(screen.getByLabelText('Phone'), { target: { value: '1234567890' } })
    
    // Select gender
    const genderSelect = screen.getByRole('combobox')
    fireEvent.click(genderSelect)
    fireEvent.click(screen.getByText('Male'))
    
    const submitButton = screen.getByRole('button', { name: /save/i })
    fireEvent.click(submitButton)
    
    await waitFor(() => {
      expect(mockMutation.mutate).toHaveBeenCalled()
    })
  })

  it('should handle cancel action', () => {
    render(<DevoteeForm onSuccess={mockOnSuccess} onCancel={mockOnCancel} />)
    
    const cancelButton = screen.getByRole('button', { name: /cancel/i })
    fireEvent.click(cancelButton)
    
    expect(mockOnCancel).toHaveBeenCalled()
  })

  it('should show loading state during submission', async () => {
    vi.mocked(useMutation).mockReturnValue({
      ...mockMutation,
      isPending: true
    })
    
    render(<DevoteeForm onSuccess={mockOnSuccess} onCancel={mockOnCancel} />)
    
    expect(screen.getByText('Saving...')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /saving/i })).toBeDisabled()
  })

  it('should handle form submission error', async () => {
    vi.mocked(useMutation).mockReturnValue({
      ...mockMutation,
      isError: true,
      error: new Error('Submission failed')
    })
    
    render(<DevoteeForm onSuccess={mockOnSuccess} onCancel={mockOnCancel} />)
    
    await waitFor(() => {
      expect(mockToast).toHaveBeenCalledWith({
        title: 'Error',
        description: 'Failed to save devotee. Please try again.',
        variant: 'destructive'
      })
    })
  })

  it('should copy present address to permanent address', async () => {
    render(<DevoteeForm onSuccess={mockOnSuccess} onCancel={mockOnCancel} />)
    
    // Fill present address
    fireEvent.change(screen.getByLabelText('Present Address - Country'), { target: { value: 'India' } })
    fireEvent.change(screen.getByLabelText('Present Address - State'), { target: { value: 'West Bengal' } })
    
    // Click copy address button
    const copyButton = screen.getByRole('button', { name: /copy present address/i })
    fireEvent.click(copyButton)
    
    await waitFor(() => {
      expect(screen.getByDisplayValue('India')).toBeInTheDocument()
      expect(screen.getByDisplayValue('West Bengal')).toBeInTheDocument()
    })
  })

  it('should show initiated name field only for appropriate statuses', async () => {
    render(<DevoteeForm onSuccess={mockOnSuccess} onCancel={mockOnCancel} />)
    
    // Select high devotional status
    const statusSelect = screen.getByLabelText('Devotional Status')
    fireEvent.click(statusSelect)
    fireEvent.click(screen.getByText('Harinam Diksha'))
    
    await waitFor(() => {
      expect(screen.getByLabelText('Initiated Name')).toBeInTheDocument()
    })
  })
})