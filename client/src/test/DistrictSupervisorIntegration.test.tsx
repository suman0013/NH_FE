import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { MemoryRouter } from 'wouter';
import Namahattas from '@/pages/Namahattas';
import { AuthContext } from '@/lib/auth';

// Mock the API service
vi.mock('@/services/api', () => ({
  api: {
    getNamahattas: vi.fn(),
    getDistrictSupervisors: vi.fn(),
    getUserAddressDefaults: vi.fn(),
    createNamahatta: vi.fn(),
    updateNamahatta: vi.fn(),
    getCountries: vi.fn(),
    getStates: vi.fn(),
    getDistricts: vi.fn(),
    getSubDistricts: vi.fn(),
    getVillages: vi.fn(),
    getPincodes: vi.fn(),
  }
}));

import { api } from '@/services/api';

describe('District Supervisor Integration Tests', () => {
  let queryClient: QueryClient;

  const mockNamahattas = {
    data: [
      {
        id: 1,
        code: 'NAM001',
        name: 'Test Namahatta',
        secretary: 'Test Secretary',
        districtSupervisorId: 1,
        districtSupervisorName: 'HG Nitai Gauranga Das',
        address: { district: 'Bankura' },
        status: 'APPROVED'
      }
    ],
    total: 1,
    page: 1,
    totalPages: 1
  };

  const mockDistrictSupervisors = [
    { id: 1, name: 'HG Nitai Gauranga Das', location: { district: 'Bankura' } },
    { id: 2, name: 'HG Chaitanya Das', location: { district: 'Nadia' } },
  ];

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false },
      },
    });
    vi.clearAllMocks();

    // Default API mocks
    vi.mocked(api.getNamahattas).mockResolvedValue(mockNamahattas);
    vi.mocked(api.getCountries).mockResolvedValue([{ name: 'India' }]);
    vi.mocked(api.getStates).mockResolvedValue([{ name: 'West Bengal' }]);
    vi.mocked(api.getDistricts).mockResolvedValue([{ name: 'Bankura' }, { name: 'Nadia' }]);
    vi.mocked(api.getSubDistricts).mockResolvedValue([]);
    vi.mocked(api.getVillages).mockResolvedValue([]);
    vi.mocked(api.getPincodes).mockResolvedValue([]);
  });

  const renderWithProviders = (user: any) => {
    return render(
      <MemoryRouter>
        <QueryClientProvider client={queryClient}>
          <AuthContext.Provider value={{ user, login: vi.fn(), logout: vi.fn(), isLoading: false }}>
            <Namahattas />
          </AuthContext.Provider>
        </QueryClientProvider>
      </MemoryRouter>
    );
  };

  describe('Complete User Flow Tests', () => {
    it('should complete full district supervisor assignment flow for admin user', async () => {
      const adminUser = { id: 1, name: 'Admin User', role: 'ADMIN' };
      
      vi.mocked(api.getUserAddressDefaults).mockResolvedValue({ address: {}, readonly: [] });
      vi.mocked(api.getDistrictSupervisors).mockResolvedValue(mockDistrictSupervisors);
      vi.mocked(api.createNamahatta).mockResolvedValue({ id: 2, name: 'New Namahatta' });

      renderWithProviders(adminUser);

      // Wait for initial load
      await waitFor(() => {
        expect(screen.getByText('Test Namahatta')).toBeInTheDocument();
      });

      // Click "Add New Namahatta" button
      const addButton = screen.getByRole('button', { name: /add new namahatta/i });
      fireEvent.click(addButton);

      // Wait for form to appear
      await waitFor(() => {
        expect(screen.getByText('Create Namahatta')).toBeInTheDocument();
      });

      // Fill form step by step
      fireEvent.change(screen.getByLabelText(/namahatta code/i), { target: { value: 'NAM002' } });
      fireEvent.change(screen.getByLabelText(/namahatta name/i), { target: { value: 'New Test Namahatta' } });
      fireEvent.change(screen.getByLabelText(/secretary/i), { target: { value: 'New Secretary' } });

      // Fill address to enable supervisor selection
      fireEvent.change(screen.getByLabelText(/country/i), { target: { value: 'India' } });
      fireEvent.change(screen.getByLabelText(/state/i), { target: { value: 'West Bengal' } });
      fireEvent.change(screen.getByLabelText(/district/i), { target: { value: 'Bankura' } });

      // Wait for supervisors to load
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

      // Verify API call
      await waitFor(() => {
        expect(api.createNamahatta).toHaveBeenCalledWith(
          expect.objectContaining({
            code: 'NAM002',
            name: 'New Test Namahatta',
            secretary: 'New Secretary',
            districtSupervisorId: 1,
            address: expect.objectContaining({
              country: 'India',
              state: 'West Bengal',
              district: 'Bankura'
            })
          })
        );
      });

      // Form should close and return to list
      await waitFor(() => {
        expect(screen.queryByText('Create Namahatta')).not.toBeInTheDocument();
      });
    });

    it('should complete full auto-assignment flow for district supervisor user', async () => {
      const districtSupervisorUser = {
        id: 1,
        name: 'HG Nitai Gauranga Das',
        role: 'DISTRICT_SUPERVISOR',
        location: { country: 'India', state: 'West Bengal', district: 'Bankura' }
      };

      vi.mocked(api.getUserAddressDefaults).mockResolvedValue({
        address: { country: 'India', state: 'West Bengal', district: 'Bankura' },
        readonly: ['country', 'state', 'district']
      });
      vi.mocked(api.createNamahatta).mockResolvedValue({ id: 2, name: 'Auto Assigned Namahatta' });

      renderWithProviders(districtSupervisorUser);

      // Click "Add New Namahatta" button
      const addButton = screen.getByRole('button', { name: /add new namahatta/i });
      fireEvent.click(addButton);

      // Wait for form and address defaults to load
      await waitFor(() => {
        expect(api.getUserAddressDefaults).toHaveBeenCalled();
      });

      // Check auto-assignment message
      expect(screen.getByText(/Auto-assigned/)).toBeInTheDocument();

      // Check pre-filled and locked address fields
      expect(screen.getByDisplayValue('India')).toBeDisabled();
      expect(screen.getByDisplayValue('West Bengal')).toBeDisabled();
      expect(screen.getByDisplayValue('Bankura')).toBeDisabled();

      // Fill only the required fields (address is pre-filled)
      fireEvent.change(screen.getByLabelText(/namahatta code/i), { target: { value: 'NAM003' } });
      fireEvent.change(screen.getByLabelText(/namahatta name/i), { target: { value: 'Auto Assigned Namahatta' } });
      fireEvent.change(screen.getByLabelText(/secretary/i), { target: { value: 'Auto Secretary' } });

      // Submit form
      const submitButton = screen.getByRole('button', { name: /create namahatta/i });
      fireEvent.click(submitButton);

      // Verify API call with auto-assigned supervisor
      await waitFor(() => {
        expect(api.createNamahatta).toHaveBeenCalledWith(
          expect.objectContaining({
            code: 'NAM003',
            name: 'Auto Assigned Namahatta',
            secretary: 'Auto Secretary',
            districtSupervisorId: 1, // Auto-assigned to the logged-in supervisor
            address: expect.objectContaining({
              country: 'India',
              state: 'West Bengal',
              district: 'Bankura'
            })
          })
        );
      });
    });
  });

  describe('Error Scenarios and Edge Cases', () => {
    it('should handle missing supervisors gracefully', async () => {
      const adminUser = { id: 1, name: 'Admin User', role: 'ADMIN' };
      
      vi.mocked(api.getUserAddressDefaults).mockResolvedValue({ address: {}, readonly: [] });
      vi.mocked(api.getDistrictSupervisors).mockResolvedValue([]); // No supervisors

      renderWithProviders(adminUser);

      // Open form
      const addButton = screen.getByRole('button', { name: /add new namahatta/i });
      fireEvent.click(addButton);

      // Fill address to trigger supervisor loading
      fireEvent.change(screen.getByLabelText(/district/i), { target: { value: 'UnknownDistrict' } });

      await waitFor(() => {
        expect(api.getDistrictSupervisors).toHaveBeenCalledWith('UnknownDistrict');
      });

      // Should show no supervisors message
      expect(screen.getByText(/No District Supervisors found for UnknownDistrict/)).toBeInTheDocument();
      expect(screen.getByText(/Please contact admin to assign a supervisor/)).toBeInTheDocument();
    });

    it('should handle API failures gracefully', async () => {
      const adminUser = { id: 1, name: 'Admin User', role: 'ADMIN' };
      
      vi.mocked(api.getUserAddressDefaults).mockResolvedValue({ address: {}, readonly: [] });
      vi.mocked(api.getDistrictSupervisors).mockRejectedValue(new Error('Network error'));

      renderWithProviders(adminUser);

      // Open form
      const addButton = screen.getByRole('button', { name: /add new namahatta/i });
      fireEvent.click(addButton);

      // Fill district to trigger supervisor loading
      fireEvent.change(screen.getByLabelText(/district/i), { target: { value: 'Bankura' } });

      await waitFor(() => {
        expect(api.getDistrictSupervisors).toHaveBeenCalledWith('Bankura');
      });

      // Should handle error gracefully
      await waitFor(() => {
        expect(screen.getByText(/No supervisors available for this district/)).toBeInTheDocument();
      });
    });

    it('should prevent submission with invalid data', async () => {
      const adminUser = { id: 1, name: 'Admin User', role: 'ADMIN' };
      
      vi.mocked(api.getUserAddressDefaults).mockResolvedValue({ address: {}, readonly: [] });

      renderWithProviders(adminUser);

      // Open form
      const addButton = screen.getByRole('button', { name: /add new namahatta/i });
      fireEvent.click(addButton);

      // Try to submit with incomplete data
      const submitButton = screen.getByRole('button', { name: /create namahatta/i });
      fireEvent.click(submitButton);

      // Should show validation errors
      await waitFor(() => {
        expect(screen.getByText(/Name is required/)).toBeInTheDocument();
        expect(screen.getByText(/Secretary is required/)).toBeInTheDocument();
      });

      // API should not be called
      expect(api.createNamahatta).not.toHaveBeenCalled();
    });
  });

  describe('Edit Mode Integration', () => {
    it('should handle editing existing namahatta with supervisor change', async () => {
      const adminUser = { id: 1, name: 'Admin User', role: 'ADMIN' };
      
      vi.mocked(api.getUserAddressDefaults).mockResolvedValue({ address: {}, readonly: [] });
      vi.mocked(api.getDistrictSupervisors).mockResolvedValue(mockDistrictSupervisors);
      vi.mocked(api.updateNamahatta).mockResolvedValue({ id: 1, name: 'Updated Namahatta' });

      renderWithProviders(adminUser);

      // Wait for namahattas to load
      await waitFor(() => {
        expect(screen.getByText('Test Namahatta')).toBeInTheDocument();
      });

      // Click edit button (assuming it exists)
      const editButton = screen.getByRole('button', { name: /edit/i });
      fireEvent.click(editButton);

      // Wait for form to load with existing data
      await waitFor(() => {
        expect(screen.getByDisplayValue('Test Namahatta')).toBeInTheDocument();
      });

      // Change district supervisor
      const supervisorSelect = screen.getByRole('combobox', { name: /district supervisor/i });
      fireEvent.click(supervisorSelect);
      fireEvent.click(screen.getByText('HG Chaitanya Das'));

      // Submit changes
      const submitButton = screen.getByRole('button', { name: /update namahatta/i });
      fireEvent.click(submitButton);

      // Verify update API call
      await waitFor(() => {
        expect(api.updateNamahatta).toHaveBeenCalledWith(
          1,
          expect.objectContaining({
            districtSupervisorId: 2 // Changed supervisor
          })
        );
      });
    });
  });

  describe('Real-time Updates and State Management', () => {
    it('should update supervisor list when district changes', async () => {
      const adminUser = { id: 1, name: 'Admin User', role: 'ADMIN' };
      
      vi.mocked(api.getUserAddressDefaults).mockResolvedValue({ address: {}, readonly: [] });
      vi.mocked(api.getDistrictSupervisors)
        .mockResolvedValueOnce([mockDistrictSupervisors[0]]) // Bankura supervisors
        .mockResolvedValueOnce([mockDistrictSupervisors[1]]); // Nadia supervisors

      renderWithProviders(adminUser);

      // Open form
      const addButton = screen.getByRole('button', { name: /add new namahatta/i });
      fireEvent.click(addButton);

      // Select first district
      fireEvent.change(screen.getByLabelText(/district/i), { target: { value: 'Bankura' } });

      await waitFor(() => {
        expect(api.getDistrictSupervisors).toHaveBeenCalledWith('Bankura');
      });

      // Should show Bankura supervisor
      const supervisorSelect = screen.getByRole('combobox', { name: /district supervisor/i });
      fireEvent.click(supervisorSelect);
      expect(screen.getByText('HG Nitai Gauranga Das')).toBeInTheDocument();

      // Change district
      fireEvent.change(screen.getByLabelText(/district/i), { target: { value: 'Nadia' } });

      await waitFor(() => {
        expect(api.getDistrictSupervisors).toHaveBeenCalledWith('Nadia');
      });

      // Should now show Nadia supervisor
      fireEvent.click(supervisorSelect);
      expect(screen.getByText('HG Chaitanya Das')).toBeInTheDocument();
      expect(screen.queryByText('HG Nitai Gauranga Das')).not.toBeInTheDocument();
    });
  });
});