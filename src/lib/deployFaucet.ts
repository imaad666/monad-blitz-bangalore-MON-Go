/**
 * Utility to deploy Faucet contracts
 * 
 * NOTE: This requires the compiled bytecode from contracts/src/Faucet.sol
 * To compile:
 * 1. Install Foundry: curl -L https://foundry.paradigm.xyz | bash && foundryup
 * 2. Compile: forge build --contracts contracts/src/Faucet.sol
 * 3. Extract bytecode from out/Faucet.sol/Faucet.json
 * 4. Set NEXT_PUBLIC_FAUCET_BYTECODE in .env.local
 */

import { encodeAbiParameters, parseAbiParameters } from 'viem';

/**
 * Get the Faucet contract bytecode
 * This should be set as an environment variable after compiling the contract
 */
export function getFaucetBytecode(): `0x${string}` {
  const bytecode = process.env.NEXT_PUBLIC_FAUCET_BYTECODE;
  
  if (!bytecode) {
    throw new Error(
      'Faucet contract bytecode not found. Please compile contracts/src/Faucet.sol and set NEXT_PUBLIC_FAUCET_BYTECODE in .env.local'
    );
  }
  
  if (!bytecode.startsWith('0x')) {
    return `0x${bytecode}` as `0x${string}`;
  }
  
  return bytecode as `0x${string}`;
}

/**
 * Encode constructor arguments for Faucet contract
 * @param mineAmount The mine amount in wei (bigint)
 * @returns Encoded constructor arguments
 */
export function encodeFaucetConstructor(mineAmount: bigint): `0x${string}` {
  return encodeAbiParameters(
    parseAbiParameters('uint256 _mineAmount'),
    [mineAmount]
  );
}

/**
 * Get the full deployment bytecode (bytecode + constructor args)
 * @param mineAmount The mine amount in wei (bigint)
 * @returns Full bytecode ready for deployment
 */
export function getFaucetDeploymentBytecode(mineAmount: bigint): `0x${string}` {
  const bytecode = getFaucetBytecode();
  const constructorArgs = encodeFaucetConstructor(mineAmount);
  
  // Remove 0x prefix from constructor args if present
  const constructorArgsClean = constructorArgs.startsWith('0x') 
    ? constructorArgs.slice(2) 
    : constructorArgs;
  
  // Combine bytecode + constructor args
  return `${bytecode}${constructorArgsClean}` as `0x${string}`;
}

