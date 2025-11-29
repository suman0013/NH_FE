import { vi } from 'vitest';
import '@testing-library/jest-dom';

// Mock IntersectionObserver
global.IntersectionObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
}));

// Mock ResizeObserver
global.ResizeObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
}));

// Mock window.matchMedia
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(), // deprecated
    removeListener: vi.fn(), // deprecated
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
});

// Mock window.scrollTo
Object.defineProperty(window, 'scrollTo', {
  writable: true,
  value: vi.fn(),
});

// Mock HTMLElement.scrollIntoView
Object.defineProperty(HTMLElement.prototype, 'scrollIntoView', {
  writable: true,
  value: vi.fn(),
});

// Mock the Radix UI Portal
vi.mock('@radix-ui/react-portal', () => ({
  Portal: ({ children }: any) => children,
}));

// Mock Lucide React icons
vi.mock('lucide-react', () => ({
  Lock: () => 'div',
  User: () => 'div',
  MapPin: () => 'div',
  Calendar: () => 'div',
  Search: () => 'div',
  Plus: () => 'div',
  Home: () => 'div',
  Users: () => 'div',
  Check: () => 'div',
  X: () => 'div',
  ChevronDown: () => 'div',
  ChevronUp: () => 'div',
}));

// Mock environment variables
vi.mock('react', async () => {
  const actual = await vi.importActual('react');
  return {
    ...actual,
    // Mock any React-specific functionality if needed
  };
});

// Mock the auth context
vi.mock('@/lib/auth', () => ({
  AuthContext: {
    Provider: ({ children, value }: any) => children,
  },
  useAuth: () => ({
    user: null,
    login: vi.fn(),
    logout: vi.fn(),
    isLoading: false,
  }),
}));

// Mock toast notifications
vi.mock('@/hooks/use-toast', () => ({
  useToast: () => ({
    toast: vi.fn(),
  }),
}));

// Global test utilities
global.testUser = {
  admin: {
    id: 1,
    name: 'Test Admin',
    role: 'ADMIN',
    email: 'admin@test.com'
  },
  districtSupervisor: {
    id: 2,
    name: 'Test District Supervisor',
    role: 'DISTRICT_SUPERVISOR',
    email: 'supervisor@test.com',
    location: {
      country: 'India',
      state: 'West Bengal',
      district: 'Bankura'
    }
  },
  office: {
    id: 3,
    name: 'Test Office User',
    role: 'OFFICE',
    email: 'office@test.com'
  }
};

global.testData = {
  supervisors: [
    { id: 1, name: 'HG Nitai Gauranga Das', role: 'DISTRICT_SUPERVISOR', location: { district: 'Bankura' } },
    { id: 2, name: 'HG Chaitanya Das', role: 'DISTRICT_SUPERVISOR', location: { district: 'Nadia' } },
    { id: 3, name: 'HG Radha Krishna Das', role: 'DISTRICT_SUPERVISOR', location: { district: 'Kolkata' } },
  ],
  namahattas: [
    {
      id: 1,
      code: 'NAM001',
      name: 'Test Namahatta 1',
      secretary: 'Test Secretary 1',
      districtSupervisorId: 1,
      address: { country: 'India', state: 'West Bengal', district: 'Bankura' },
      status: 'APPROVED'
    },
    {
      id: 2,
      code: 'NAM002',
      name: 'Test Namahatta 2',
      secretary: 'Test Secretary 2',
      districtSupervisorId: 2,
      address: { country: 'India', state: 'West Bengal', district: 'Nadia' },
      status: 'PENDING_APPROVAL'
    }
  ]
};

// Custom render function for components with providers
export const createTestQueryClient = () => {
  const { QueryClient } = require('@tanstack/react-query');
  return new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        gcTime: 0,
      },
      mutations: {
        retry: false,
      },
    },
  });
};