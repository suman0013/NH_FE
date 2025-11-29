import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import NamahattaForm from '@/components/forms/NamahattaForm';
import { AuthContext } from '@/lib/auth';

// Mock the API service
vi.mock('@/services/api', () => ({
  api: {
    getDistrictSupervisors: vi.fn(),
    getUserAddressDefaults: vi.fn(),
    createNamahatta: vi.fn(),
    updateNamahatta: vi.fn(),
  }
}));

// Mock react-router
vi.mock('wouter', () => ({
  useLocation: () => ['/namahattas', vi.fn()],
}));

import { api } from '@/services/api';

describe('District Supervisor Assignment - Frontend Tests', () => {
  let queryClient: QueryClient;

  const mockDistrictSupervisors = [
    { id: 1, name: 'HG Nitai Gauranga Das', role: 'DISTRICT_SUPERVISOR', location: { district: 'Bankura' } },
    { id: 2, name: 'HG Chaitanya Das', role: 'DISTRICT_SUPERVISOR', location: { district: 'Nadia' } },
    { id: 3, name: 'HG Radha Krishna Das', role: 'DISTRICT_SUPERVISOR', location: { district: 'Kolkata' } },
  ];

  const mockAddressDefaults = {
    address: { country: 'India', state: 'West Bengal', district: 'Bankura' },
    readonly: ['country', 'state', 'district']
  };

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false },
      },
    });
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  const renderWithProviders = (user: any) => {
    return render(
      <QueryClientProvider client={queryClient}>
        <AuthContext.Provider value={{ user, login: vi.fn(), logout: vi.fn(), isLoading: false }}>
          <NamahattaForm onSuccess={vi.fn()} onCancel={vi.fn()} />
        </AuthContext.Provider>
      </QueryClientProvider>
    );
  };

  describe('District Supervisor User Flow', () => {
    const districtSupervisorUser = {
      id: 1,
      name: 'HG Nitai Gauranga Das',
      role: 'DISTRICT_SUPERVISOR',
      location: { country: 'India', state: 'West Bengal', district: 'Bankura' }
    };

    it('should auto-assign district supervisor and pre-fill address for district supervisor user', async () => {
      vi.mocked(api.getUserAddressDefaults).mockResolvedValue(mockAddressDefaults);

      renderWithProviders(districtSupervisorUser);

      // Wait for address defaults to load
      await waitFor(() => {
        expect(api.getUserAddressDefaults).toHaveBeenCalled();
      });

      // Check if auto-assignment message is displayed
      expect(screen.getByText(/Auto-assigned/)).toBeInTheDocument();
      expect(screen.getByText(/You are automatically assigned as the District Supervisor/)).toBeInTheDocument();

      // Check if address fields are pre-filled and locked
      const countryField = screen.getByDisplayValue('India');
      const stateField = screen.getByDisplayValue('West Bengal');
      const districtField = screen.getByDisplayValue('Bankura');

      expect(countryField).toBeDisabled();
      expect(stateField).toBeDisabled();
      expect(districtField).toBeDisabled();

      // Lock icons should be visible
      expect(screen.getAllByTestId('lock-icon')).toHaveLength(3);
    });

    it('should validate required fields even with auto-assignment', async () => {
      vi.mocked(api.getUserAddressDefaults).mockResolvedValue(mockAddressDefaults);
      vi.mocked(api.createNamahatta).mockRejectedValue(new Error('Validation failed'));

      renderWithProviders(districtSupervisorUser);

      await waitFor(() => {
        expect(api.getUserAddressDefaults).toHaveBeenCalled();
      });

      // Try to submit without filling required fields
      const submitButton = screen.getByRole('button', { name: /create namahatta/i });
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText(/Name is required/)).toBeInTheDocument();
        expect(screen.getByText(/Secretary is required/)).toBeInTheDocument();
      });
    });

    it('should successfully submit form with auto-assigned supervisor', async () => {
      vi.mocked(api.getUserAddressDefaults).mockResolvedValue(mockAddressDefaults);
      vi.mocked(api.createNamahatta).mockResolvedValue({ id: 1, name: 'Test Namahatta' });

      renderWithProviders(districtSupervisorUser);

      await waitFor(() => {
        expect(api.getUserAddressDefaults).toHaveBeenCalled();
      });

      // Fill required fields
      fireEvent.change(screen.getByLabelText(/namahatta code/i), { target: { value: 'NAM001' } });
      fireEvent.change(screen.getByLabelText(/namahatta name/i), { target: { value: 'Test Namahatta' } });
      fireEvent.change(screen.getByLabelText(/secretary/i), { target: { value: 'Test Secretary' } });

      // Submit form
      const submitButton = screen.getByRole('button', { name: /create namahatta/i });
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(api.createNamahatta).toHaveBeenCalledWith(
          expect.objectContaining({
            code: 'NAM001',
            name: 'Test Namahatta',
            secretary: 'Test Secretary',
            districtSupervisorId: 1 // Auto-assigned user ID
          })
        );
      });
    });
  });

  describe('Admin/Office User Flow', () => {
    const adminUser = {
      id: 2,
      name: 'Admin User',
      role: 'ADMIN'
    };

    it('should show manual district supervisor selection for admin users', async () => {
      vi.mocked(api.getUserAddressDefaults).mockResolvedValue({ address: {}, readonly: [] });

      renderWithProviders(adminUser);

      await waitFor(() => {
        expect(api.getUserAddressDefaults).toHaveBeenCalled();
      });

      // Check if manual selection UI is displayed
      expect(screen.getByText('District Supervisor *')).toBeInTheDocument();
      expect(screen.getByText(/Please fill in the address district first/)).toBeInTheDocument();

      // Auto-assignment message should not be displayed
      expect(screen.queryByText(/Auto-assigned/)).not.toBeInTheDocument();
    });

    it('should load district supervisors when district is selected', async () => {
      vi.mocked(api.getUserAddressDefaults).mockResolvedValue({ address: {}, readonly: [] });
      vi.mocked(api.getDistrictSupervisors).mockResolvedValue(mockDistrictSupervisors.filter(s => s.location.district === 'Bankura'));

      renderWithProviders(adminUser);

      await waitFor(() => {
        expect(api.getUserAddressDefaults).toHaveBeenCalled();
      });

      // Fill in address district
      const districtField = screen.getByLabelText(/district/i);
      fireEvent.change(districtField, { target: { value: 'Bankura' } });

      await waitFor(() => {
        expect(api.getDistrictSupervisors).toHaveBeenCalledWith('Bankura');
      });

      // Check if supervisor dropdown is populated
      const supervisorSelect = screen.getByRole('combobox', { name: /district supervisor/i });
      fireEvent.click(supervisorSelect);

      await waitFor(() => {
        expect(screen.getByText('HG Nitai Gauranga Das')).toBeInTheDocument();
      });
    });

    it('should show error when no supervisors available for district', async () => {
      vi.mocked(api.getUserAddressDefaults).mockResolvedValue({ address: {}, readonly: [] });
      vi.mocked(api.getDistrictSupervisors).mockResolvedValue([]);

      renderWithProviders(adminUser);

      await waitFor(() => {
        expect(api.getUserAddressDefaults).toHaveBeenCalled();
      });

      // Fill in district that has no supervisors
      const districtField = screen.getByLabelText(/district/i);
      fireEvent.change(districtField, { target: { value: 'UnknownDistrict' } });

      await waitFor(() => {
        expect(api.getDistrictSupervisors).toHaveBeenCalledWith('UnknownDistrict');
      });

      await waitFor(() => {
        expect(screen.getByText(/No District Supervisors found for UnknownDistrict/)).toBeInTheDocument();
        expect(screen.getByText(/Please contact admin to assign a supervisor/)).toBeInTheDocument();
      });
    });

    it('should validate district supervisor selection is required', async () => {
      vi.mocked(api.getUserAddressDefaults).mockResolvedValue({ address: {}, readonly: [] });
      vi.mocked(api.getDistrictSupervisors).mockResolvedValue(mockDistrictSupervisors.filter(s => s.location.district === 'Bankura'));

      renderWithProviders(adminUser);

      await waitFor(() => {
        expect(api.getUserAddressDefaults).toHaveBeenCalled();
      });

      // Fill required fields but don't select supervisor
      fireEvent.change(screen.getByLabelText(/namahatta code/i), { target: { value: 'NAM001' } });
      fireEvent.change(screen.getByLabelText(/namahatta name/i), { target: { value: 'Test Namahatta' } });
      fireEvent.change(screen.getByLabelText(/secretary/i), { target: { value: 'Test Secretary' } });
      fireEvent.change(screen.getByLabelText(/district/i), { target: { value: 'Bankura' } });

      // Try to submit without selecting supervisor
      const submitButton = screen.getByRole('button', { name: /create namahatta/i });
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText(/District supervisor is required/)).toBeInTheDocument();
      });
    });

    it('should successfully submit with selected supervisor', async () => {
      vi.mocked(api.getUserAddressDefaults).mockResolvedValue({ address: {}, readonly: [] });
      vi.mocked(api.getDistrictSupervisors).mockResolvedValue(mockDistrictSupervisors.filter(s => s.location.district === 'Bankura'));
      vi.mocked(api.createNamahatta).mockResolvedValue({ id: 1, name: 'Test Namahatta' });

      renderWithProviders(adminUser);

      await waitFor(() => {
        expect(api.getUserAddressDefaults).toHaveBeenCalled();
      });

      // Fill all required fields
      fireEvent.change(screen.getByLabelText(/namahatta code/i), { target: { value: 'NAM001' } });
      fireEvent.change(screen.getByLabelText(/namahatta name/i), { target: { value: 'Test Namahatta' } });
      fireEvent.change(screen.getByLabelText(/secretary/i), { target: { value: 'Test Secretary' } });
      fireEvent.change(screen.getByLabelText(/district/i), { target: { value: 'Bankura' } });

      await waitFor(() => {
        expect(api.getDistrictSupervisors).toHaveBeenCalledWith('Bankura');
      });

      // Select district supervisor
      const supervisorSelect = screen.getByRole('combobox', { name: /district supervisor/i });
      fireEvent.click(supervisorSelect);
      
      await waitFor(() => {
        fireEvent.click(screen.getByText('HG Nitai Gauranga Das'));
      });

      // Submit form
      const submitButton = screen.getByRole('button', { name: /create namahatta/i });
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(api.createNamahatta).toHaveBeenCalledWith(
          expect.objectContaining({
            districtSupervisorId: 1
          })
        );
      });
    });
  });

  describe('Loading States and Error Handling', () => {
    const adminUser = { id: 2, name: 'Admin User', role: 'ADMIN' };

    it('should show loading state when fetching supervisors', async () => {
      vi.mocked(api.getUserAddressDefaults).mockResolvedValue({ address: {}, readonly: [] });
      vi.mocked(api.getDistrictSupervisors).mockImplementation(() => 
        new Promise(resolve => setTimeout(() => resolve(mockDistrictSupervisors), 1000))
      );

      renderWithProviders(adminUser);

      await waitFor(() => {
        expect(api.getUserAddressDefaults).toHaveBeenCalled();
      });

      // Fill district to trigger supervisor loading
      fireEvent.change(screen.getByLabelText(/district/i), { target: { value: 'Bankura' } });

      // Check loading state
      expect(screen.getByText(/Loading supervisors.../)).toBeInTheDocument();
    });

    it('should handle API errors gracefully', async () => {
      vi.mocked(api.getUserAddressDefaults).mockResolvedValue({ address: {}, readonly: [] });
      vi.mocked(api.getDistrictSupervisors).mockRejectedValue(new Error('Network error'));

      renderWithProviders(adminUser);

      await waitFor(() => {
        expect(api.getUserAddressDefaults).toHaveBeenCalled();
      });

      // Fill district to trigger supervisor loading
      fireEvent.change(screen.getByLabelText(/district/i), { target: { value: 'Bankura' } });

      await waitFor(() => {
        expect(api.getDistrictSupervisors).toHaveBeenCalledWith('Bankura');
      });

      // Should show appropriate error state
      await waitFor(() => {
        expect(screen.getByText(/No supervisors available for this district/)).toBeInTheDocument();
      });
    });
  });

  describe('Edit Mode Tests', () => {
    const existingNamahatta = {
      id: 1,
      code: 'NAM001',
      name: 'Existing Namahatta',
      secretary: 'Existing Secretary',
      districtSupervisorId: 1,
      address: { country: 'India', state: 'West Bengal', district: 'Bankura' }
    };

    it('should pre-select existing supervisor in edit mode', async () => {
      const adminUser = { id: 2, name: 'Admin User', role: 'ADMIN' };
      vi.mocked(api.getUserAddressDefaults).mockResolvedValue({ address: {}, readonly: [] });
      vi.mocked(api.getDistrictSupervisors).mockResolvedValue(mockDistrictSupervisors.filter(s => s.location.district === 'Bankura'));

      render(
        <QueryClientProvider client={queryClient}>
          <AuthContext.Provider value={{ user: adminUser, login: vi.fn(), logout: vi.fn(), isLoading: false }}>
            <NamahattaForm namahatta={existingNamahatta} onSuccess={vi.fn()} onCancel={vi.fn()} />
          </AuthContext.Provider>
        </QueryClientProvider>
      );

      await waitFor(() => {
        expect(api.getDistrictSupervisors).toHaveBeenCalledWith('Bankura');
      });

      // Check if the existing supervisor is pre-selected
      const supervisorSelect = screen.getByRole('combobox', { name: /district supervisor/i });
      expect(supervisorSelect).toHaveValue('1');
    });
  });

  describe('Form Integration Tests', () => {
    it('should prevent form submission without district supervisor', async () => {
      const adminUser = { id: 2, name: 'Admin User', role: 'ADMIN' };
      vi.mocked(api.getUserAddressDefaults).mockResolvedValue({ address: {}, readonly: [] });

      renderWithProviders(adminUser);

      // Fill all fields except district supervisor
      fireEvent.change(screen.getByLabelText(/namahatta code/i), { target: { value: 'NAM001' } });
      fireEvent.change(screen.getByLabelText(/namahatta name/i), { target: { value: 'Test Namahatta' } });
      fireEvent.change(screen.getByLabelText(/secretary/i), { target: { value: 'Test Secretary' } });

      const submitButton = screen.getByRole('button', { name: /create namahatta/i });
      fireEvent.click(submitButton);

      // Form should not submit
      expect(api.createNamahatta).not.toHaveBeenCalled();
      
      // Should show validation error
      await waitFor(() => {
        expect(screen.getByText(/District supervisor is required/)).toBeInTheDocument();
      });
    });

    it('should reset supervisor selection when district changes', async () => {
      const adminUser = { id: 2, name: 'Admin User', role: 'ADMIN' };
      vi.mocked(api.getUserAddressDefaults).mockResolvedValue({ address: {}, readonly: [] });
      vi.mocked(api.getDistrictSupervisors)
        .mockResolvedValueOnce(mockDistrictSupervisors.filter(s => s.location.district === 'Bankura'))
        .mockResolvedValueOnce(mockDistrictSupervisors.filter(s => s.location.district === 'Nadia'));

      renderWithProviders(adminUser);

      // Select first district and supervisor
      fireEvent.change(screen.getByLabelText(/district/i), { target: { value: 'Bankura' } });
      
      await waitFor(() => {
        expect(api.getDistrictSupervisors).toHaveBeenCalledWith('Bankura');
      });

      const supervisorSelect = screen.getByRole('combobox', { name: /district supervisor/i });
      fireEvent.click(supervisorSelect);
      fireEvent.click(screen.getByText('HG Nitai Gauranga Das'));

      // Change district
      fireEvent.change(screen.getByLabelText(/district/i), { target: { value: 'Nadia' } });

      await waitFor(() => {
        expect(api.getDistrictSupervisors).toHaveBeenCalledWith('Nadia');
      });

      // Supervisor selection should be reset
      expect(supervisorSelect).toHaveValue('');
    });
  });
});