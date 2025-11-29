#!/usr/bin/env node

/**
 * Script to extract bytecode from compiled Foundry contract
 * 
 * Usage: node scripts/extract-bytecode.js
 * 
 * This will read the compiled contract JSON and output the bytecode
 * that you can copy to your .env.local file
 */

const fs = require('fs');
const path = require('path');

const contractPath = path.join(__dirname, '../contracts/out/Faucet.sol/Faucet.json');

if (!fs.existsSync(contractPath)) {
  console.error('❌ Contract not found at:', contractPath);
  console.error('   Please compile the contract first:');
  console.error('   cd contracts && forge build');
  process.exit(1);
}

try {
  const contractData = JSON.parse(fs.readFileSync(contractPath, 'utf8'));
  
  // Try to get bytecode from different possible locations
  const bytecode = contractData.bytecode?.object || 
                   contractData.bytecode || 
                   contractData.evm?.bytecode?.object;

  if (!bytecode) {
    console.error('❌ Bytecode not found in contract JSON');
    console.error('   Available keys:', Object.keys(contractData));
    process.exit(1);
  }

  console.log('✅ Bytecode extracted successfully!\n');
  console.log('Add this to your .env.local file:');
  console.log('─'.repeat(80));
  console.log(`NEXT_PUBLIC_FAUCET_BYTECODE=${bytecode}`);
  console.log('─'.repeat(80));
  console.log('\n💡 Tip: Make sure to restart your Next.js dev server after updating .env.local');
  
} catch (error) {
  console.error('❌ Error reading contract file:', error.message);
  process.exit(1);
}

