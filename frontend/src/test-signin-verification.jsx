import React from 'react';
import { createRoot } from 'react-dom/client';
import { SignIn, AdminSignIn, UserSignIn } from './components/auth';

// Test function to verify the SignIn components
function verifySignInComponents() {
  console.log('Starting SignIn component verification...');
  
  // Create a container element for testing
  const container = document.createElement('div');
  document.body.appendChild(container);
  const root = createRoot(container);
  
  try {
    // Test 1: Verify all components can be imported
    console.log('Test 1: Checking imports...');
    if (SignIn && AdminSignIn && UserSignIn) {
      console.log('✓ All components imported successfully');
    } else {
      console.log('✗ Failed to import all components');
      return false;
    }
    
    // Test 2: Render default SignIn with user type
    console.log('Test 2: Rendering SignIn with type="user"...');
    root.render(<SignIn type="user" />);
    const userPortalTitle = document.querySelector('h1');
    if (userPortalTitle && userPortalTitle.textContent === 'User Portal') {
      console.log('✓ UserSignIn renders correctly');
    } else {
      console.log('✗ UserSignIn title not found or incorrect');
      return false;
    }
    
    // Test 3: Render default SignIn with admin type
    console.log('Test 3: Rendering SignIn with type="admin"...');
    root.render(<SignIn type="admin" />);
    const adminPortalTitle = document.querySelector('h1');
    if (adminPortalTitle && adminPortalTitle.textContent === 'Admin Portal') {
      console.log('✓ AdminSignIn renders correctly');
    } else {
      console.log('✗ AdminSignIn title not found or incorrect');
      return false;
    }
    
    // Test 4: Render AdminSignIn directly
    console.log('Test 4: Rendering AdminSignIn directly...');
    root.render(<AdminSignIn />);
    const adminEmailField = document.querySelector('input[placeholder="admin@example.com"]');
    if (adminEmailField) {
      console.log('✓ AdminSignIn email field renders correctly');
    } else {
      console.log('✗ AdminSignIn email field not found');
      return false;
    }
    
    // Test 5: Render UserSignIn directly
    console.log('Test 5: Rendering UserSignIn directly...');
    root.render(<UserSignIn />);
    const userEmailField = document.querySelector('input[placeholder="you@example.com"]');
    if (userEmailField) {
      console.log('✓ UserSignIn email field renders correctly');
    } else {
      console.log('✗ UserSignIn email field not found');
      return false;
    }
    
    // Test 6: Check for lucide-react icons
    console.log('Test 6: Checking for lucide-react icons...');
    root.render(<AdminSignIn />);
    const icons = document.querySelectorAll('svg');
    if (icons.length > 0) {
      console.log(`✓ Found ${icons.length} SVG icons (lucide-react)`);
    } else {
      console.log('✗ No SVG icons found');
      return false;
    }
    
    console.log('\n✅ All tests passed! SignIn component is working correctly.');
    return true;
    
  } catch (error) {
    console.error('✗ Error during verification:', error);
    return false;
  } finally {
    // Clean up
    document.body.removeChild(container);
    root.unmount();
  }
}

// Run the verification
const isVerified = verifySignInComponents();

// Export the result for potential use in other scripts
export { isVerified };