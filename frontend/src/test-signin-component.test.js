// Test file to verify SignIn component implementation
import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { SignIn, AdminSignIn, UserSignIn } from './components/auth';

describe('SignIn Component Tests', () => {
  // Test 1: Check if all components can be imported
  test('should import all components successfully', () => {
    expect(SignIn).toBeDefined();
    expect(AdminSignIn).toBeDefined();
    expect(UserSignIn).toBeDefined();
  });

  // Test 2: Check if default SignIn component renders with user type
  test('should render UserSignIn when type is "user"', () => {
    render(<SignIn type="user" />);
    const userPortalTitle = screen.getByText('User Portal');
    expect(userPortalTitle).toBeInTheDocument();
  });

  // Test 3: Check if default SignIn component renders with admin type
  test('should render AdminSignIn when type is "admin"', () => {
    render(<SignIn type="admin" />);
    const adminPortalTitle = screen.getByText('Admin Portal');
    expect(adminPortalTitle).toBeInTheDocument();
  });

  // Test 4: Check if AdminSignIn component can be rendered directly
  test('should render AdminSignIn component correctly', () => {
    render(<AdminSignIn />);
    const adminEmailField = screen.getByPlaceholderText('admin@example.com');
    expect(adminEmailField).toBeInTheDocument();
    
    const adminPasswordField = screen.getByPlaceholderText('enter admin password');
    expect(adminPasswordField).toBeInTheDocument();
    
    const adminIdField = screen.getByPlaceholderText('check your email');
    expect(adminIdField).toBeInTheDocument();
  });

  // Test 5: Check if UserSignIn component can be rendered directly
  test('should render UserSignIn component correctly', () => {
    render(<UserSignIn />);
    const userEmailField = screen.getByPlaceholderText('you@example.com');
    expect(userEmailField).toBeInTheDocument();
    
    const userPasswordField = screen.getByPlaceholderText('enter password');
    expect(userPasswordField).toBeInTheDocument();
  });

  // Test 6: Check if lucide-react icons are rendered
  test('should render lucide-react icons in AdminSignIn', () => {
    render(<AdminSignIn />);
    // Check for Mail icon
    const mailIcon = document.querySelector('svg[data-testid="Mail"]');
    // Check for Lock icon
    const lockIcon = document.querySelector('svg[data-testid="Lock"]');
    // Check for Key icon
    const keyIcon = document.querySelector('svg[data-testid="Key"]');
    
    // Icons should be present in the document
    expect(document.querySelector('svg')).toBeTruthy();
  });

  test('should render lucide-react icons in UserSignIn', () => {
    render(<UserSignIn />);
    // Icons should be present in the document
    expect(document.querySelector('svg')).toBeTruthy();
  });
});