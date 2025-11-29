import { render, RenderOptions } from '@testing-library/react'
import { ReactElement } from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { vi } from 'vitest'

// Mock providers for testing
const TestQueryClient = () => new QueryClient({
  defaultOptions: {
    queries: {
      retry: false,
      gcTime: 0,
    },
    mutations: {
      retry: false,
    },
  },
})

interface AllTheProvidersProps {
  children: React.ReactNode
}

const AllTheProviders = ({ children }: AllTheProvidersProps) => {
  const queryClient = TestQueryClient()
  
  return (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  )
}

const customRender = (
  ui: ReactElement,
  options?: Omit<RenderOptions, 'wrapper'>,
) => render(ui, { wrapper: AllTheProviders, ...options })

// Mock data generators
export const mockDevotee = (overrides = {}) => ({
  id: 1,
  legalName: 'Test Devotee',
  initiatedName: 'Test Das',
  dateOfBirth: '1990-01-01',
  gender: 'Male',
  bloodGroup: 'O+',
  occupation: 'Software Engineer',
  email: 'test@example.com',
  phone: '1234567890',
  devotionalStatusId: 6,
  devotionalStatus: { name: 'Harinam Diksha' },
  namahattaId: 1,
  namahatta: { name: 'Test Namahatta' },
  presentAddress: {
    country: 'India',
    state: 'West Bengal',
    district: 'Kolkata',
    city: 'Kolkata'
  },
  createdAt: '2025-01-01T00:00:00Z',
  ...overrides
})

export const mockNamahatta = (overrides = {}) => ({
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
  ...overrides
})

export const mockUpdate = (overrides = {}) => ({
  id: 1,
  namahattaId: 1,
  title: 'Test Update',
  description: 'A test update',
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
  namahattaName: 'Test Namahatta',
  namahattaCity: 'Kolkata',
  namahattaState: 'West Bengal',
  createdAt: '2025-01-01T00:00:00Z',
  ...overrides
})

// Mock API responses
export const mockApiResponse = {
  devotees: [mockDevotee(), mockDevotee({ id: 2, legalName: 'Test Devotee 2' })],
  namahattas: [mockNamahatta(), mockNamahatta({ id: 2, name: 'Test Namahatta 2' })],
  updates: [mockUpdate(), mockUpdate({ id: 2, title: 'Test Update 2' })],
  dashboard: {
    totalDevotees: 250,
    totalNamahattas: 100,
    recentUpdates: [mockUpdate()]
  },
  statusDistribution: [
    { statusName: 'Shraddhavan', count: 100 },
    { statusName: 'Sadhusangi', count: 80 },
    { statusName: 'Harinam Diksha', count: 20 }
  ],
  hierarchy: {
    founder: [{ id: 1, name: 'His Divine Grace A.C. Bhaktivedanta Swami Prabhupada', role: 'Founder-Acharya' }],
    currentAcharya: [{ id: 2, name: 'His Holiness Jayapataka Swami', role: 'Current Acharya' }],
    regionalDirectors: [{ id: 3, name: 'Test Regional Director', role: 'Regional Director' }],
    coRegionalDirectors: [{ id: 4, name: 'Test Co-Regional Director', role: 'Co-Regional Director' }]
  }
}

// Test utilities
export const waitForLoadingToFinish = async () => {
  await new Promise(resolve => setTimeout(resolve, 0))
}

export const mockUseQuery = (mockData: any) => {
  vi.mocked(useQuery).mockImplementation(({ queryKey }) => {
    const key = queryKey[0] as string
    
    if (mockData[key]) {
      return {
        data: mockData[key],
        isLoading: false,
        error: null,
        refetch: vi.fn()
      }
    }
    
    return { data: null, isLoading: false, error: null, refetch: vi.fn() }
  })
}

export const mockUseMutation = () => ({
  mutate: vi.fn(),
  isPending: false,
  isError: false,
  error: null,
  reset: vi.fn()
})

// Form testing utilities
export const fillForm = (formData: Record<string, string>) => {
  Object.entries(formData).forEach(([field, value]) => {
    const input = screen.getByLabelText(field)
    if (input) {
      fireEvent.change(input, { target: { value } })
    }
  })
}

export const selectOption = (selectLabel: string, optionText: string) => {
  const select = screen.getByLabelText(selectLabel)
  fireEvent.click(select)
  
  const option = screen.getByText(optionText)
  fireEvent.click(option)
}

export const submitForm = () => {
  const submitButton = screen.getByRole('button', { name: /save|submit/i })
  fireEvent.click(submitButton)
}

// Re-export everything from testing-library
export * from '@testing-library/react'
export { customRender as render }