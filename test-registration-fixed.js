// Test script to verify the registration endpoint with JWT token fix
const axios = require("axios");

// Test data for registration with unique email using timestamp
const timestamp = Date.now();
const testUser = {
  name: "Test User Registration",
  email: `testuser${timestamp}@example.com`,
  password: "password123",
  role: "user",
};

// Make a POST request to the registration endpoint
axios
  .post("http://localhost:7000/api/users", testUser, {
    headers: {
      "Content-Type": "application/json",
    },
  })
  .then((response) => {
    console.log("=== REGISTRATION TEST RESULTS ===");
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

    // Test if the token can be used for authentication (optional)
    console.log("\n=== TOKEN AUTHENTICATION TEST ===");
    if (response.data.token) {
      axios
        .get("http://localhost:7000/api/users/" + response.data.user._id, {
          headers: {
            Authorization: "Bearer " + response.data.token,
          },
        })
        .then((authResponse) => {
          console.log("✅ Token authentication successful");
          console.log(
            "Authenticated user data:",
            JSON.stringify(authResponse.data, null, 2)
          );
        })
        .catch((authError) => {
          console.log("❌ Token authentication failed");
          console.log(
            "Auth error:",
            authError.response ? authError.response.data : authError.message
          );
        });
    }
  })
  .catch((error) => {
    console.error("=== REGISTRATION TEST FAILED ===");
    console.error(
      "Error:",
      error.response ? error.response.data : error.message
    );
    if (error.response) {
      console.error("Status Code:", error.response.status);
      console.error("Headers:", error.response.headers);
    }
  });
