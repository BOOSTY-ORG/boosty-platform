// Test script to verify the login endpoint with JWT token
const axios = require("axios");

// Test data for login (using the user we just created)
const testUser = {
  email: "testuser1764429566627@example.com",
  password: "password123",
};

// Make a POST request to the login endpoint
axios
  .post("http://localhost:7000/api/auth/login", testUser, {
    headers: {
      "Content-Type": "application/json",
    },
  })
  .then((response) => {
    console.log("=== LOGIN TEST RESULTS ===");
    console.log("Status Code:", response.status);
    console.log("Response Headers:", response.headers);
    console.log("\n=== RESPONSE DATA ===");
    console.log(JSON.stringify(response.data, null, 2));

    // Verify the response structure
    console.log("\n=== VERIFICATION ===");
    if (response.data.token) {
      console.log("✅ Token is present in response");
    } else {
      console.log("❌ Token is missing from response");
    }

    if (response.data.user) {
      console.log("✅ User data is present in response");
      if (response.data.user._id) console.log("✅ User ID is present");
      if (response.data.user.name) console.log("✅ User name is present");
      if (response.data.user.email) console.log("✅ User email is present");
      if (response.data.user.role) console.log("✅ User role is present");
    } else {
      console.log("❌ User data is missing from response");
    }
  })
  .catch((error) => {
    console.error("=== LOGIN TEST FAILED ===");
    console.error(
      "Error:",
      error.response ? error.response.data : error.message
    );
    if (error.response) {
      console.error("Status Code:", error.response.status);
      console.error("Headers:", error.response.headers);
    }
  });
