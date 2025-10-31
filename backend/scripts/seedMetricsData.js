#!/usr/bin/env node

import mongoose from "mongoose";
import dotenv from "dotenv";
import { generateMockData, generateTestUser, generateTestInvestor, MOCK_CONFIG } from "../src/utils/metrics/mockData.generator.js";

// Load environment variables
dotenv.config();

// Database connection
const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.DATABASE_URL);
    console.log(`MongoDB Connected: ${conn.connection.host}`);
  } catch (error) {
    console.error('Database connection error:', error);
    process.exit(1);
  }
};

// Main seeding function
const seedData = async () => {
  try {
    console.log('🌱 Starting database seeding...');
    
    // Connect to database
    await connectDB();
    
    // Check if data already exists
    const User = mongoose.connection.collection('users');
    const userCount = await User.countDocuments();
    
    if (userCount > 0) {
      console.log(`⚠️  Database already contains ${userCount} users`);
      const readline = await import('readline');
      const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout
      });
      
      const answer = await new Promise(resolve => {
        rl.question('Do you want to clear existing data and reseed? (y/N): ', resolve);
      });
      
      rl.close();
      
      if (answer.toLowerCase() !== 'y' && answer.toLowerCase() !== 'yes') {
        console.log('🛑 Seeding cancelled');
        process.exit(0);
      }
    }
    
    // Generate mock data
    const results = await generateMockData();
    
    console.log('\n📊 Seeding Results:');
    console.log(`✅ Users: ${results.users}`);
    console.log(`✅ Investors: ${results.investors}`);
    console.log(`✅ Applications: ${results.applications}`);
    console.log(`✅ Transactions: ${results.transactions}`);
    console.log(`✅ Investments: ${results.investments}`);
    console.log(`✅ KYC Documents: ${results.kycDocuments}`);
    
    // Generate test data for development
    if (process.env.NODE_ENV !== 'production') {
      console.log('\n🧪 Creating test data...');
      
      const testUser = await generateTestUser();
      const testInvestor = await generateTestInvestor(testUser._id);
      
      console.log(`✅ Test User: ${testUser.email} (password: test123)`);
      console.log(`✅ Test Investor: ${testInvestor.investorType}`);
    }
    
    console.log('\n🎉 Database seeding completed successfully!');
    
    // Display API endpoints for testing
    console.log('\n🔗 Available API Endpoints:');
    console.log('Dashboard: GET /metrics/dashboard/overview');
    console.log('Investors: GET /metrics/investors');
    console.log('Users: GET /metrics/users');
    console.log('Transactions: GET /metrics/transactions');
    console.log('KYC: GET /metrics/kyc');
    console.log('Reports: GET /metrics/reports');
    
    if (process.env.NODE_ENV !== 'production') {
      console.log('\n🔑 Test Credentials:');
      console.log('Email: test@example.com');
      console.log('Password: test123');
    }
    
  } catch (error) {
    console.error('❌ Error seeding database:', error);
    process.exit(1);
  } finally {
    // Close database connection
    await mongoose.connection.close();
    console.log('\n🔌 Database connection closed');
    process.exit(0);
  }
};

// Command line arguments handling
const args = process.argv.slice(2);
const command = args[0];

switch (command) {
  case 'test':
    console.log('🧪 Generating test data only...');
    connectDB().then(async () => {
      try {
        const testUser = await generateTestUser();
        const testInvestor = await generateTestInvestor(testUser._id);
        
        console.log(`✅ Test User: ${testUser.email} (password: test123)`);
        console.log(`✅ Test Investor: ${testInvestor.investorType}`);
        
        await mongoose.connection.close();
        process.exit(0);
      } catch (error) {
        console.error('❌ Error generating test data:', error);
        process.exit(1);
      }
    });
    break;
    
  case 'config':
    console.log('⚙️  Mock Data Configuration:');
    console.log(JSON.stringify(MOCK_CONFIG, null, 2));
    process.exit(0);
    break;
    
  case 'help':
    console.log('📖 Seed Script Usage:');
    console.log('node seedMetricsData.js [command]');
    console.log('');
    console.log('Commands:');
    console.log('  (none)     - Generate full mock data set');
    console.log('  test        - Generate only test data');
    console.log('  config      - Display mock data configuration');
    console.log('  help        - Show this help message');
    process.exit(0);
    break;
    
  default:
    seedData();
    break;
}

// Handle unhandled promise rejections
process.on('unhandledRejection', (err) => {
  console.error('❌ Unhandled Promise Rejection:', err);
  process.exit(1);
});

// Handle uncaught exceptions
process.on('uncaughtException', (err) => {
  console.error('❌ Uncaught Exception:', err);
  process.exit(1);
});