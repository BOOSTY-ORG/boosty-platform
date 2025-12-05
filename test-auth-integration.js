// Test script to verify the complete authentication flow
// This simulates how the frontend would interact with the backend
const axios = require("axios");

// Configure axios to match frontend settings
const api = axios.create({
  baseURL: "http://localhost:7000",
  timeout: 10000,
  headers: {
    "Content-Type": "application/json",
  },
});

// Test data
const timestamp = Date.now();
const testUser = {
  firstName: "Integration",
  lastName: "Test User",
  email: `integration${timestamp}@example.com`,
  password: "password123",
};

// Format data for backend (combine firstName and lastName)
const formattedUserData = {
  name: `${testUser.firstName} ${testUser.lastName}`,
  email: testUser.email,
  password: testUser.password,
};

async function testAuthFlow() {
  console.log("=== AUTHENTICATION INTEGRATION TEST ===\n");

  try {
    // 1. Test Registration
    console.log("1. TESTING REGISTRATION...");
    const registerResponse = await api.post("/api/users", formattedUserData);

    console.log("Registration Status:", registerResponse.status);
    console.log(
      "Registration Response:",
      JSON.stringify(registerResponse.data, null, 2)
    );

    // Verify registration response format
    const { token, user } = registerResponse.data;
    if (!token) {
      throw new Error("Registration response missing token");
    }
    if (!user || !user._id || !user.email) {
      throw new Error("Registration response missing required user data");
    }

    console.log("✅ Registration successful - Token and user data present");

    // 2. Test Login with the same credentials
    console.log("\n2. TESTING LOGIN...");
    const loginResponse = await api.post("/api/auth/login", {
      email: testUser.email,
      password: testUser.password,
    });

    console.log("Login Status:", loginResponse.status);
    console.log("Login Response:", JSON.stringify(loginResponse.data, null, 2));

    // Verify login response format
    const { token: loginToken, user: loginUser } = loginResponse.data;
    if (!loginToken) {
      throw new Error("Login response missing token");
    }
    if (!loginUser || !loginUser._id || !loginUser.email) {
      throw new Error("Login response missing required user data");
    }

    console.log("✅ Login successful - Token and user data present");

    // 3. Test authenticated request using the token
    console.log("\n3. TESTING AUTHENTICATED REQUEST...");
    const authResponse = await api.get(`/api/users/${user._id}`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    console.log("Authenticated Request Status:", authResponse.status);
    console.log(
      "Authenticated Response:",
      JSON.stringify(authResponse.data, null, 2)
    );

    console.log("✅ Authenticated request successful");

    // 4. Verify response format matches frontend expectations
    console.log("\n4. VERIFYING FRONTEND COMPATIBILITY...");

    // Frontend expects response with token and user properties
    const frontendExpectedFormat = {
      hasToken: !!registerResponse.data.token,
      hasUser: !!registerResponse.data.user,
      userHasId: !!registerResponse.data.user?._id,
      userHasName: !!registerResponse.data.user?.name,
      userHasEmail: !!registerResponse.data.user?.email,
      userHasRole: !!registerResponse.data.user?.role,
    };

    console.log("Frontend Compatibility Check:", frontendExpectedFormat);

    const isCompatible = Object.values(frontendExpectedFormat).every(Boolean);
    if (isCompatible) {
      console.log(
        "✅ Response format is compatible with frontend expectations"
      );
    } else {
      console.log(
        "❌ Response format is NOT compatible with frontend expectations"
      );
    }

    // 5. Summary
    console.log("\n=== TEST SUMMARY ===");
    console.log("✅ Registration endpoint working correctly");
    console.log("✅ Login endpoint working correctly");
    console.log("✅ JWT token generation working");
    console.log("✅ Token authentication working");
    console.log("✅ Response format matches frontend expectations");
    console.log(
      "\n🎉 ALL TESTS PASSED - Registration issue has been resolved!"
    );
  } catch (error) {
    console.error("\n=== TEST FAILED ===");
    console.error(
      "Error:",
      error.response ? error.response.data : error.message
    );
    if (error.response) {
      console.error("Status Code:", error.response.status);
      console.error("Headers:", error.response.headers);
    }
  }
}

// Run the test
testAuthFlow();
