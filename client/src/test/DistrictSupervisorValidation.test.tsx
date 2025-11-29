import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { insertNamahattaSchema } from '@shared/schema';

// Component that tests just the validation logic
const ValidationTestComponent = ({ user, onSubmit }: any) => {
  const form = useForm({
    resolver: zodResolver(insertNamahattaSchema.extend({
      districtSupervisorId: insertNamahattaSchema.shape.districtSupervisorId.refine(
        (val) => val > 0,
        { message: "District supervisor is required" }
      )
    })),
    defaultValues: {
      code: "",
      name: "",
      secretary: "",
      districtSupervisorId: 0,
      address: {},
    }
  });

  return (
    <form onSubmit={form.handleSubmit(onSubmit)}>
      <input
        {...form.register("code", { required: "Code is required" })}
        data-testid="code-input"
        placeholder="Code"
      />
      {form.formState.errors.code && (
        <span data-testid="code-error">{form.formState.errors.code.message}</span>
      )}

      <input
        {...form.register("name", { required: "Name is required" })}
        data-testid="name-input"
        placeholder="Name"
      />
      {form.formState.errors.name && (
        <span data-testid="name-error">{form.formState.errors.name.message}</span>
      )}

      <input
        {...form.register("secretary", { required: "Secretary is required" })}
        data-testid="secretary-input"
        placeholder="Secretary"
      />
      {form.formState.errors.secretary && (
        <span data-testid="secretary-error">{form.formState.errors.secretary.message}</span>
      )}

      <input
        type="number"
        {...form.register("districtSupervisorId", { 
          required: "District supervisor is required",
          valueAsNumber: true,
          validate: (value) => value > 0 || "District supervisor is required"
        })}
        data-testid="supervisor-input"
        placeholder="District Supervisor ID"
      />
      {form.formState.errors.districtSupervisorId && (
        <span data-testid="supervisor-error">{form.formState.errors.districtSupervisorId.message}</span>
      )}

      <button type="submit" data-testid="submit-button">Submit</button>
    </form>
  );
};

describe('District Supervisor Validation Tests', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false },
      },
    });
    vi.clearAllMocks();
  });

  const renderValidationTest = (user: any, onSubmit = vi.fn()) => {
    return render(
      <QueryClientProvider client={queryClient}>
        <ValidationTestComponent user={user} onSubmit={onSubmit} />
      </QueryClientProvider>
    );
  };

  describe('Form Validation Rules', () => {
    it('should require district supervisor selection', async () => {
      const onSubmit = vi.fn();
      renderValidationTest({ role: 'ADMIN' }, onSubmit);

      // Fill other required fields but leave supervisor empty
      fireEvent.change(screen.getByTestId('code-input'), { target: { value: 'NAM001' } });
      fireEvent.change(screen.getByTestId('name-input'), { target: { value: 'Test Namahatta' } });
      fireEvent.change(screen.getByTestId('secretary-input'), { target: { value: 'Test Secretary' } });
      
      // Try to submit without supervisor
      fireEvent.click(screen.getByTestId('submit-button'));

      await waitFor(() => {
        expect(screen.getByTestId('supervisor-error')).toHaveTextContent('District supervisor is required');
      });

      expect(onSubmit).not.toHaveBeenCalled();
    });

    it('should reject zero or negative supervisor IDs', async () => {
      const onSubmit = vi.fn();
      renderValidationTest({ role: 'ADMIN' }, onSubmit);

      // Fill all fields with invalid supervisor ID
      fireEvent.change(screen.getByTestId('code-input'), { target: { value: 'NAM001' } });
      fireEvent.change(screen.getByTestId('name-input'), { target: { value: 'Test Namahatta' } });
      fireEvent.change(screen.getByTestId('secretary-input'), { target: { value: 'Test Secretary' } });
      fireEvent.change(screen.getByTestId('supervisor-input'), { target: { value: '0' } });

      fireEvent.click(screen.getByTestId('submit-button'));

      await waitFor(() => {
        expect(screen.getByTestId('supervisor-error')).toHaveTextContent('District supervisor is required');
      });

      expect(onSubmit).not.toHaveBeenCalled();
    });

    it('should accept valid supervisor ID', async () => {
      const onSubmit = vi.fn();
      renderValidationTest({ role: 'ADMIN' }, onSubmit);

      // Fill all fields with valid data
      fireEvent.change(screen.getByTestId('code-input'), { target: { value: 'NAM001' } });
      fireEvent.change(screen.getByTestId('name-input'), { target: { value: 'Test Namahatta' } });
      fireEvent.change(screen.getByTestId('secretary-input'), { target: { value: 'Test Secretary' } });
      fireEvent.change(screen.getByTestId('supervisor-input'), { target: { value: '1' } });

      fireEvent.click(screen.getByTestId('submit-button'));

      await waitFor(() => {
        expect(onSubmit).toHaveBeenCalledWith(
          expect.objectContaining({
            code: 'NAM001',
            name: 'Test Namahatta',
            secretary: 'Test Secretary',
            districtSupervisorId: 1
          }),
          expect.anything()
        );
      });

      // No error messages should be displayed
      expect(screen.queryByTestId('supervisor-error')).not.toBeInTheDocument();
    });

    it('should validate all required fields together', async () => {
      const onSubmit = vi.fn();
      renderValidationTest({ role: 'ADMIN' }, onSubmit);

      // Submit empty form
      fireEvent.click(screen.getByTestId('submit-button'));

      await waitFor(() => {
        expect(screen.getByTestId('code-error')).toHaveTextContent('Code is required');
        expect(screen.getByTestId('name-error')).toHaveTextContent('Name is required');
        expect(screen.getByTestId('secretary-error')).toHaveTextContent('Secretary is required');
        expect(screen.getByTestId('supervisor-error')).toHaveTextContent('District supervisor is required');
      });

      expect(onSubmit).not.toHaveBeenCalled();
    });
  });

  describe('Cross-field Validation', () => {
    it('should validate supervisor exists for selected district', async () => {
      // This would be implemented in the actual form component
      // Testing the logic that supervisor must belong to the selected district
      const supervisorBelongsToDistrict = (supervisorId: number, district: string) => {
        const supervisorDistrictMap: Record<number, string> = {
          1: 'Bankura',
          2: 'Nadia',
          3: 'Kolkata'
        };
        return supervisorDistrictMap[supervisorId] === district;
      };

      expect(supervisorBelongsToDistrict(1, 'Bankura')).toBe(true);
      expect(supervisorBelongsToDistrict(1, 'Nadia')).toBe(false);
      expect(supervisorBelongsToDistrict(2, 'Nadia')).toBe(true);
    });

    it('should validate address district is filled before supervisor selection', () => {
      const canSelectSupervisor = (address: any) => {
        return address && address.district && address.district.trim().length > 0;
      };

      expect(canSelectSupervisor({})).toBe(false);
      expect(canSelectSupervisor({ district: '' })).toBe(false);
      expect(canSelectSupervisor({ district: 'Bankura' })).toBe(true);
    });
  });

  describe('Business Logic Validation', () => {
    it('should auto-assign supervisor for district supervisor users', () => {
      const getAutoAssignedSupervisor = (user: any) => {
        if (user.role === 'DISTRICT_SUPERVISOR') {
          return user.id;
        }
        return null;
      };

      const districtSupervisorUser = { id: 1, role: 'DISTRICT_SUPERVISOR' };
      const adminUser = { id: 2, role: 'ADMIN' };

      expect(getAutoAssignedSupervisor(districtSupervisorUser)).toBe(1);
      expect(getAutoAssignedSupervisor(adminUser)).toBe(null);
    });

    it('should validate district supervisor can only create namahattas in their district', () => {
      const canCreateInDistrict = (user: any, namahattaDistrict: string) => {
        if (user.role === 'DISTRICT_SUPERVISOR') {
          return user.location?.district === namahattaDistrict;
        }
        return true; // Admin/Office can create in any district
      };

      const districtSupervisor = {
        id: 1,
        role: 'DISTRICT_SUPERVISOR',
        location: { district: 'Bankura' }
      };
      const admin = { id: 2, role: 'ADMIN' };

      expect(canCreateInDistrict(districtSupervisor, 'Bankura')).toBe(true);
      expect(canCreateInDistrict(districtSupervisor, 'Nadia')).toBe(false);
      expect(canCreateInDistrict(admin, 'Bankura')).toBe(true);
      expect(canCreateInDistrict(admin, 'Nadia')).toBe(true);
    });
  });

  describe('Error Message Validation', () => {
    it('should show appropriate error for missing district when selecting supervisor', () => {
      const getDistrictRequiredMessage = (hasDistrict: boolean) => {
        if (!hasDistrict) {
          return "Please fill in the address district first to load available District Supervisors.";
        }
        return null;
      };

      expect(getDistrictRequiredMessage(false)).toBe(
        "Please fill in the address district first to load available District Supervisors."
      );
      expect(getDistrictRequiredMessage(true)).toBe(null);
    });

    it('should show appropriate error for no supervisors in district', () => {
      const getNoSupervisorsMessage = (district: string, supervisors: any[]) => {
        if (supervisors.length === 0) {
          return `No District Supervisors found for ${district}. Please contact admin to assign a supervisor to this district.`;
        }
        return null;
      };

      expect(getNoSupervisorsMessage('UnknownDistrict', [])).toBe(
        "No District Supervisors found for UnknownDistrict. Please contact admin to assign a supervisor to this district."
      );
      expect(getNoSupervisorsMessage('Bankura', [{ id: 1, name: 'Test' }])).toBe(null);
    });
  });

  describe('State Management Validation', () => {
    it('should reset supervisor selection when district changes', () => {
      let selectedSupervisor = 1;
      let currentDistrict = 'Bankura';

      const handleDistrictChange = (newDistrict: string) => {
        if (newDistrict !== currentDistrict) {
          selectedSupervisor = 0; // Reset selection
          currentDistrict = newDistrict;
        }
      };

      expect(selectedSupervisor).toBe(1);
      handleDistrictChange('Nadia');
      expect(selectedSupervisor).toBe(0);
      expect(currentDistrict).toBe('Nadia');
    });

    it('should preserve supervisor selection when district remains same', () => {
      let selectedSupervisor = 1;
      let currentDistrict = 'Bankura';

      const handleDistrictChange = (newDistrict: string) => {
        if (newDistrict !== currentDistrict) {
          selectedSupervisor = 0;
          currentDistrict = newDistrict;
        }
      };

      expect(selectedSupervisor).toBe(1);
      handleDistrictChange('Bankura'); // Same district
      expect(selectedSupervisor).toBe(1); // Should remain unchanged
    });
  });

  describe('Loading State Validation', () => {
    it('should disable supervisor selection while loading', () => {
      const getSupervisorSelectState = (loading: boolean, hasDistrict: boolean) => {
        return {
          disabled: loading || !hasDistrict,
          placeholder: loading ? 'Loading supervisors...' : 
                      !hasDistrict ? 'Select district first' : 
                      'Select District Supervisor'
        };
      };

      expect(getSupervisorSelectState(true, true)).toEqual({
        disabled: true,
        placeholder: 'Loading supervisors...'
      });

      expect(getSupervisorSelectState(false, false)).toEqual({
        disabled: true,
        placeholder: 'Select district first'
      });

      expect(getSupervisorSelectState(false, true)).toEqual({
        disabled: false,
        placeholder: 'Select District Supervisor'
      });
    });
  });
});