import mongoose from 'mongoose';

const MONGODB_URI = process.env.MONGODB_URI;

// Only throw error during runtime, not during build
if (!MONGODB_URI && typeof window === 'undefined' && process.env.NODE_ENV !== 'production') {
  throw new Error('Please define the MONGODB_URI environment variable inside .env.local');
}

// Type for the global mongoose cache
interface MongooseCache {
  conn: typeof mongoose | null;
  promise: Promise<typeof mongoose> | null;
}

// Extend global interface
declare global {
  var mongoose: MongooseCache | undefined;
}

/**
 * Global is used here to maintain a cached connection across hot reloads
 * in development. This prevents connections growing exponentially
 * during API Route usage.
 */
let cached = global.mongoose;

if (!cached) {
  global.mongoose = { conn: null, promise: null };
  cached = global.mongoose;
}

async function connectDB() {
  // Return early if MONGODB_URI is not available (e.g., during build)
  if (!MONGODB_URI) {
    console.warn('MONGODB_URI not available, skipping database connection');
    return null;
  }

  if (!cached) {
    global.mongoose = { conn: null, promise: null };
    cached = global.mongoose;
  }

  if (cached.conn) {
    return cached.conn;
  }

  if (!cached.promise) {
    const opts = {
      bufferCommands: false,
    };

    cached.promise = mongoose.connect(MONGODB_URI, opts).then((mongoose) => {
      return mongoose;
    });
  }

  try {
    cached.conn = await cached.promise;
  } catch (e) {
    cached.promise = null;
    throw e;
  }

  return cached.conn;
}

export default connectDB;
