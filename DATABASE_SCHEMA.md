# Database Schema for Monad Go

## Required Tables

### 1. `faucets` table
```sql
CREATE TABLE IF NOT EXISTS faucets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  lat DECIMAL(10, 8) NOT NULL,
  lng DECIMAL(11, 8) NOT NULL,
  total_coins INTEGER NOT NULL,
  remaining_coins INTEGER NOT NULL,
  is_active BOOLEAN DEFAULT true,
  contract_address TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Index for location-based queries
CREATE INDEX IF NOT EXISTS idx_faucets_location ON faucets(lat, lng);
CREATE INDEX IF NOT EXISTS idx_faucets_contract ON faucets(contract_address);
```

### 2. `pending_claims` table (NEW - Required for new mining flow)
```sql
CREATE TABLE IF NOT EXISTS pending_claims (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  faucet_id UUID NOT NULL REFERENCES faucets(id) ON DELETE CASCADE,
  user_address TEXT NOT NULL,
  pending_amount DECIMAL(20, 8) NOT NULL DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(faucet_id, user_address)
);

-- Indexes for fast lookups
CREATE INDEX IF NOT EXISTS idx_pending_claims_faucet ON pending_claims(faucet_id);
CREATE INDEX IF NOT EXISTS idx_pending_claims_user ON pending_claims(user_address);
CREATE INDEX IF NOT EXISTS idx_pending_claims_composite ON pending_claims(faucet_id, user_address);
```

### 3. `users` table (if not exists)
```sql
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  address TEXT UNIQUE NOT NULL,
  total_collected DECIMAL(20, 8) DEFAULT 0,
  total_mines INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_users_address ON users(address);
```

## Supabase Setup

If using Supabase, you can run these SQL commands in the SQL Editor:

1. Go to your Supabase project dashboard
2. Navigate to SQL Editor
3. Run the SQL commands above

## Migration Script

You can also create a migration file or run this in your Supabase SQL editor:

```sql
-- Create pending_claims table
CREATE TABLE IF NOT EXISTS pending_claims (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  faucet_id UUID NOT NULL REFERENCES faucets(id) ON DELETE CASCADE,
  user_address TEXT NOT NULL,
  pending_amount DECIMAL(20, 8) NOT NULL DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(faucet_id, user_address)
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_pending_claims_faucet ON pending_claims(faucet_id);
CREATE INDEX IF NOT EXISTS idx_pending_claims_user ON pending_claims(user_address);
CREATE INDEX IF NOT EXISTS idx_pending_claims_composite ON pending_claims(faucet_id, user_address);
```

## How It Works

1. **Mining**: User clicks "Mine" → Pending amount increments in DB → No blockchain transaction
2. **Claiming**: User clicks "Claim" → Contract transfers accumulated amount → Cooldown starts → Pending amount cleared from DB

