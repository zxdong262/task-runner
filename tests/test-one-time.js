#!/usr/bin/env node

// Test script for oneTime execution mode
// This script runs synchronously and returns results

console.log('OneTime test script started!')
console.log('Arguments:', process.argv.slice(2))

// Output some test data
console.log('Test output line 1')
console.error('Test error line 1')

// Simulate some processing
setTimeout(() => {
  console.log('Processing complete')
  console.log('Exit code: 42')

  // Exit with a specific code for testing
  process.exit(42)
}, 100)
