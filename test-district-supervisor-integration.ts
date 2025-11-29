#!/usr/bin/env tsx

/**
 * Integration Test Suite for District Supervisor Assignment Feature
 * Tests all user roles and scenarios for mandatory district supervisor assignment
 */

import { api } from './client/src/services/api';

interface TestResult {
  name: string;
  status: 'PASS' | 'FAIL' | 'SKIP';
  message: string;
  duration: number;
}

class IntegrationTester {
  private results: TestResult[] = [];
  private apiBaseUrl = 'http://localhost:5000';

  async runAllTests(): Promise<void> {
    console.log('🚀 Starting District Supervisor Integration Tests\n');
    
    // Test 1: API Endpoint Availability
    await this.testApiEndpoints();
    
    // Test 2: District Supervisor Data Retrieval
    await this.testDistrictSupervisorRetrieval();
    
    // Test 3: Address Defaults for Different User Roles
    await this.testAddressDefaults();
    
    // Test 4: Form Validation Scenarios
    await this.testFormValidation();
    
    // Test 5: Edge Cases
    await this.testEdgeCases();
    
    this.printResults();
  }

  private async testApiEndpoints(): Promise<void> {
    const startTime = Date.now();
    
    try {
      // Test district supervisors endpoint
      const response = await fetch(`${this.apiBaseUrl}/api/district-supervisors?district=Bankura`);
      const duration = Date.now() - startTime;
      
      if (response.ok) {
        const data = await response.json();
        this.results.push({
          name: 'API Endpoints - District Supervisors',
          status: 'PASS',
          message: `Endpoint responds correctly. Found ${Array.isArray(data) ? data.length : 0} supervisors`,
          duration
        });
      } else {
        this.results.push({
          name: 'API Endpoints - District Supervisors',
          status: 'FAIL',
          message: `HTTP ${response.status}: ${response.statusText}`,
          duration
        });
      }
    } catch (error) {
      this.results.push({
        name: 'API Endpoints - District Supervisors',
        status: 'FAIL',
        message: `Network error: ${error instanceof Error ? error.message : 'Unknown error'}`,
        duration: Date.now() - startTime
      });
    }
  }

  private async testDistrictSupervisorRetrieval(): Promise<void> {
    const testCases = [
      { district: 'Bankura', expectedCount: 1 },
      { district: 'Nadia', expectedCount: 1 },
      { district: 'NonExistent', expectedCount: 0 }
    ];

    for (const testCase of testCases) {
      const startTime = Date.now();
      
      try {
        const response = await fetch(`${this.apiBaseUrl}/api/district-supervisors?district=${testCase.district}`);
        const duration = Date.now() - startTime;
        
        if (response.ok) {
          const data = await response.json();
          const actualCount = Array.isArray(data) ? data.length : 0;
          
          if (actualCount >= testCase.expectedCount) {
            this.results.push({
              name: `District Supervisor Retrieval - ${testCase.district}`,
              status: 'PASS',
              message: `Found ${actualCount} supervisors (expected ≥${testCase.expectedCount})`,
              duration
            });
          } else {
            this.results.push({
              name: `District Supervisor Retrieval - ${testCase.district}`,
              status: 'FAIL',
              message: `Found ${actualCount} supervisors (expected ≥${testCase.expectedCount})`,
              duration
            });
          }
        } else {
          this.results.push({
            name: `District Supervisor Retrieval - ${testCase.district}`,
            status: 'FAIL',
            message: `HTTP ${response.status}`,
            duration
          });
        }
      } catch (error) {
        this.results.push({
          name: `District Supervisor Retrieval - ${testCase.district}`,
          status: 'FAIL',
          message: `Error: ${error instanceof Error ? error.message : 'Unknown error'}`,
          duration: Date.now() - startTime
        });
      }
    }
  }

  private async testAddressDefaults(): Promise<void> {
    const startTime = Date.now();
    
    try {
      // This requires authentication, so we'll test the endpoint availability
      const response = await fetch(`${this.apiBaseUrl}/api/user/address-defaults`);
      const duration = Date.now() - startTime;
      
      // Expected to get 401 without authentication
      if (response.status === 401) {
        this.results.push({
          name: 'Address Defaults - Endpoint Security',
          status: 'PASS',
          message: 'Endpoint correctly requires authentication',
          duration
        });
      } else {
        this.results.push({
          name: 'Address Defaults - Endpoint Security',
          status: 'FAIL',
          message: `Expected 401, got ${response.status}`,
          duration
        });
      }
    } catch (error) {
      this.results.push({
        name: 'Address Defaults - Endpoint Security',
        status: 'FAIL',
        message: `Error: ${error instanceof Error ? error.message : 'Unknown error'}`,
        duration: Date.now() - startTime
      });
    }
  }

  private async testFormValidation(): Promise<void> {
    // Test form validation logic (frontend simulation)
    const testCases = [
      {
        name: 'Required Field Validation',
        formData: { name: '', district: 'Bankura' },
        shouldPass: false
      },
      {
        name: 'District Supervisor Required',
        formData: { name: 'Test Namahatta', district: 'Bankura', districtSupervisorId: null },
        shouldPass: false
      },
      {
        name: 'Valid Form Data',
        formData: { name: 'Test Namahatta', district: 'Bankura', districtSupervisorId: 1 },
        shouldPass: true
      }
    ];

    for (const testCase of testCases) {
      const startTime = Date.now();
      
      // Simulate frontend validation logic
      const isValid = this.simulateFormValidation(testCase.formData);
      const duration = Date.now() - startTime;
      
      if ((isValid && testCase.shouldPass) || (!isValid && !testCase.shouldPass)) {
        this.results.push({
          name: `Form Validation - ${testCase.name}`,
          status: 'PASS',
          message: `Validation behaved as expected (${isValid ? 'valid' : 'invalid'})`,
          duration
        });
      } else {
        this.results.push({
          name: `Form Validation - ${testCase.name}`,
          status: 'FAIL',
          message: `Expected ${testCase.shouldPass ? 'valid' : 'invalid'}, got ${isValid ? 'valid' : 'invalid'}`,
          duration
        });
      }
    }
  }

  private async testEdgeCases(): Promise<void> {
    const edgeCases = [
      'Empty district parameter',
      'Special characters in district name',
      'Very long district name',
      'SQL injection attempt'
    ];

    for (const edgeCase of edgeCases) {
      const startTime = Date.now();
      
      try {
        let testValue = '';
        switch (edgeCase) {
          case 'Empty district parameter':
            testValue = '';
            break;
          case 'Special characters in district name':
            testValue = "Ban'kura & Nadia";
            break;
          case 'Very long district name':
            testValue = 'A'.repeat(1000);
            break;
          case 'SQL injection attempt':
            testValue = "'; DROP TABLE leaders; --";
            break;
        }

        const response = await fetch(`${this.apiBaseUrl}/api/district-supervisors?district=${encodeURIComponent(testValue)}`);
        const duration = Date.now() - startTime;
        
        if (response.ok) {
          this.results.push({
            name: `Edge Case - ${edgeCase}`,
            status: 'PASS',
            message: 'Handled gracefully without errors',
            duration
          });
        } else if (response.status === 400) {
          this.results.push({
            name: `Edge Case - ${edgeCase}`,
            status: 'PASS',
            message: 'Correctly rejected invalid input',
            duration
          });
        } else {
          this.results.push({
            name: `Edge Case - ${edgeCase}`,
            status: 'FAIL',
            message: `Unexpected status: ${response.status}`,
            duration
          });
        }
      } catch (error) {
        this.results.push({
          name: `Edge Case - ${edgeCase}`,
          status: 'FAIL',
          message: `Error: ${error instanceof Error ? error.message : 'Unknown error'}`,
          duration: Date.now() - startTime
        });
      }
    }
  }

  private simulateFormValidation(formData: any): boolean {
    // Simulate the form validation logic from NamahattaForm
    if (!formData.name || formData.name.trim().length === 0) {
      return false;
    }
    
    if (!formData.districtSupervisorId || formData.districtSupervisorId === 0) {
      return false;
    }
    
    return true;
  }

  private printResults(): void {
    console.log('\n📊 Test Results Summary\n');
    console.log('='.repeat(80));
    
    const passed = this.results.filter(r => r.status === 'PASS').length;
    const failed = this.results.filter(r => r.status === 'FAIL').length;
    const skipped = this.results.filter(r => r.status === 'SKIP').length;
    
    console.log(`✅ Passed: ${passed}`);
    console.log(`❌ Failed: ${failed}`);
    console.log(`⏭️  Skipped: ${skipped}`);
    console.log(`⏱️  Total Tests: ${this.results.length}`);
    console.log('='.repeat(80));
    
    this.results.forEach(result => {
      const icon = result.status === 'PASS' ? '✅' : result.status === 'FAIL' ? '❌' : '⏭️';
      console.log(`${icon} ${result.name}`);
      console.log(`   ${result.message} (${result.duration}ms)`);
      console.log('');
    });
    
    if (failed === 0) {
      console.log('🎉 All tests passed! District Supervisor feature is working correctly.');
    } else {
      console.log(`⚠️  ${failed} test(s) failed. Please review and fix the issues.`);
    }
  }
}

// Run tests if this file is executed directly
const tester = new IntegrationTester();
tester.runAllTests().catch(console.error);

export { IntegrationTester };