'use server';

import dbConnect from '@/lib/db';
import Loot from '@/models/Loot';
import User from '@/models/User';

/**
 * Generates 5 random loot items around the given coordinates
 */
export async function spawnLoot(lat: number, lng: number) {
  try {
    const db = await dbConnect();
    if (!db) {
      return { success: false, error: 'Database not configured', loot: [] };
    }

    const lootItems = [];
    const radius = 0.005; // ~500 meters

    for (let i = 0; i < 5; i++) {
      // Generate random offset within radius
      const angle = Math.random() * 2 * Math.PI;
      const distance = Math.random() * radius;
      const offsetLat = lat + distance * Math.cos(angle);
      const offsetLng = lng + distance * Math.sin(angle);

      const loot = new Loot({
        lat: offsetLat,
        lng: offsetLng,
        active: true,
      });

      await loot.save();
      lootItems.push(loot);
    }

    return { success: true, loot: lootItems };
  } catch (error) {
    console.error('Error spawning loot:', error);
    return { success: false, error: 'Failed to spawn loot' };
  }
}

/**
 * Claims a loot item for a user
 */
export async function claimLoot(lootId: string, userAddress: string) {
  try {
    const db = await dbConnect();
    if (!db) {
      return { success: false, error: 'Database not configured' };
    }

    // Find the loot
    const loot = await Loot.findById(lootId);

    if (!loot) {
      return { success: false, error: 'Loot not found' };
    }

    if (!loot.active) {
      return { success: false, error: 'Loot already claimed' };
    }

    // Update loot
    loot.active = false;
    loot.claimedBy = userAddress;
    await loot.save();

    // Update or create user
    let user = await User.findOne({ address: userAddress });

    if (!user) {
      user = new User({
        address: userAddress,
        score: 10,
        inventory: [lootId],
      });
    } else {
      user.score += 10;
      user.inventory.push(lootId);
    }

    await user.save();

    return {
      success: true,
      score: user.score,
      message: 'Loot claimed successfully!',
    };
  } catch (error) {
    console.error('Error claiming loot:', error);
    return { success: false, error: 'Failed to claim loot' };
  }
}

/**
 * Gets all active loot items
 */
export async function getActiveLoot() {
  try {
    const db = await dbConnect();
    if (!db) {
      return { success: false, error: 'Database not configured', loot: [] };
    }

    const loot = await Loot.find({ active: true });
    return { success: true, loot };
  } catch (error) {
    console.error('Error fetching loot:', error);
    return { success: false, error: 'Failed to fetch loot', loot: [] };
  }
}

/**
 * Gets user data by address
 */
export async function getUserData(address: string) {
  try {
    const db = await dbConnect();
    if (!db) {
      return {
        success: false,
        error: 'Database not configured',
        user: { address, score: 0, inventory: [] },
      };
    }

    const user = await User.findOne({ address });
    return {
      success: true,
      user: user || { address, score: 0, inventory: [] },
    };
  } catch (error) {
    console.error('Error fetching user:', error);
    return {
      success: false,
      error: 'Failed to fetch user',
      user: { address, score: 0, inventory: [] },
    };
  }
}

