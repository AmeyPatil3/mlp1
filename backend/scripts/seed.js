import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';
import User from '../src/models/User.js';
import Therapist from '../src/models/Therapist.js';
import Room from '../src/models/Room.js';

// Load environment variables
dotenv.config();

const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('MongoDB connected for seeding...');
  } catch (error) {
    console.error('Database connection error:', error);
    process.exit(1);
  }
};

const seedUsers = async () => {
  try {
    // Clear existing users
    await User.deleteMany({});
    await Therapist.deleteMany({});

    // Hash password manually since insertMany bypasses Mongoose pre-save hooks
    const salt = bcrypt.genSaltSync(12);
    const hashedPassword = bcrypt.hashSync('password123', salt);

    // Create sample users
    const users = [
      {
        fullName: 'Alex Johnson',
        email: 'alex@example.com',
        password: hashedPassword,
        mobile: '123-456-7890',
        role: 'user',
        profileImage: 'https://i.pravatar.cc/150?u=alex'
      },
      {
        fullName: 'Sarah Wilson',
        email: 'sarah@example.com',
        password: hashedPassword,
        mobile: '234-567-8901',
        role: 'user',
        profileImage: 'https://i.pravatar.cc/150?u=sarah'
      },
      {
        fullName: 'Mike Chen',
        email: 'mike@example.com',
        password: hashedPassword,
        mobile: '345-678-9012',
        role: 'user',
        profileImage: 'https://i.pravatar.cc/150?u=mike'
      }
    ];

    const createdUsers = await User.insertMany(users);
    console.log(`Created ${createdUsers.length} users`);

    // Create sample therapists
    const therapists = [
      {
        fullName: 'Dr. Evelyn Reed',
        email: 'evelyn.reed@example.com',
        password: hashedPassword,
        mobile: '456-789-0123',
        role: 'therapist',
        profileImage: 'https://i.pravatar.cc/300?u=evelyn'
      },
      {
        fullName: 'Dr. Ben Carter',
        email: 'ben.carter@example.com',
        password: hashedPassword,
        mobile: '567-890-1234',
        role: 'therapist',
        profileImage: 'https://i.pravatar.cc/300?u=ben'
      },
      {
        fullName: 'Dr. Olivia Chen',
        email: 'olivia.chen@example.com',
        password: hashedPassword,
        mobile: '678-901-2345',
        role: 'therapist',
        profileImage: 'https://i.pravatar.cc/300?u=olivia'
      }
    ];

    const createdTherapists = await User.insertMany(therapists);
    console.log(`Created ${createdTherapists.length} therapists`);

    // Create therapist profiles
    const therapistProfiles = [
      {
        user: createdTherapists[0]._id,
        specialties: ['Anxiety', 'Depression', 'Trauma'],
        experienceYears: 12,
        education: 'PhD in Clinical Psychology, Stanford University',
        bio: 'Specialized in cognitive behavioral therapy and trauma recovery.',
        hourlyRate: 150,
        rating: 4.8,
        totalSessions: 245
      },
      {
        user: createdTherapists[1]._id,
        specialties: ['Family Counseling', 'Stress Management'],
        experienceYears: 8,
        education: 'MA in Counseling Psychology, NYU',
        bio: 'Focused on family dynamics and stress management techniques.',
        hourlyRate: 120,
        rating: 4.6,
        totalSessions: 180
      },
      {
        user: createdTherapists[2]._id,
        specialties: ['Cognitive Behavioral Therapy (CBT)', 'Mindfulness'],
        experienceYears: 15,
        education: 'PsyD, University of California, Berkeley',
        bio: 'Expert in mindfulness-based interventions and CBT.',
        hourlyRate: 180,
        rating: 4.9,
        totalSessions: 320
      }
    ];

    const createdTherapistProfiles = await Therapist.insertMany(therapistProfiles);
    console.log(`Created ${createdTherapistProfiles.length} therapist profiles`);

    return { users: createdUsers, therapists: createdTherapists, therapistProfiles: createdTherapistProfiles };
  } catch (error) {
    console.error('Error seeding users:', error);
    throw error;
  }
};

const seedRooms = async (users) => {
  try {
    // Clear existing rooms
    await Room.deleteMany({});

    const rooms = [
      {
        roomId: 'global-anxiety-support',
        name: 'Anxiety Support',
        topic: 'General discussion for anxiety management and support',
        description: 'A safe space to discuss anxiety-related concerns and share coping strategies.',
        createdBy: users[0]._id,
        participants: [],
        maxParticipants: 15,
        tags: ['anxiety', 'support', 'mental-health'],
        isActive: true
      },
      {
        roomId: 'global-daily-wins',
        name: 'Daily Wins',
        topic: 'Share something positive from your day',
        description: 'Celebrate small victories and positive moments in your daily life.',
        createdBy: users[1]._id,
        participants: [],
        maxParticipants: 20,
        tags: ['positivity', 'daily-wins', 'motivation'],
        isActive: true
      },
      {
        roomId: 'global-stress-relief',
        name: 'Stress Relief',
        topic: 'Techniques for managing stress and building resilience',
        description: 'Learn and share effective stress management techniques and relaxation methods.',
        createdBy: users[2]._id,
        participants: [],
        maxParticipants: 12,
        tags: ['stress', 'relaxation', 'coping-strategies'],
        isActive: true
      },
      {
        roomId: 'depression-support-group',
        name: 'Depression Support Group',
        topic: 'Support and understanding for those dealing with depression',
        description: 'A compassionate space for sharing experiences and finding hope.',
        createdBy: users[0]._id,
        participants: [],
        maxParticipants: 10,
        tags: ['depression', 'support-group', 'healing'],
        isActive: true
      },
      {
        roomId: 'mindfulness-meditation',
        name: 'Mindfulness & Meditation',
        topic: 'Practice mindfulness and meditation techniques together',
        description: 'Guided meditation sessions and mindfulness practice discussions.',
        createdBy: users[1]._id,
        participants: [],
        maxParticipants: 25,
        tags: ['mindfulness', 'meditation', 'wellness'],
        isActive: true
      }
    ];

    const createdRooms = await Room.insertMany(rooms);
    console.log(`Created ${createdRooms.length} rooms`);

    return createdRooms;
  } catch (error) {
    console.error('Error seeding rooms:', error);
    throw error;
  }
};

const seedDatabase = async () => {
  try {
    await connectDB();
    
    // Safety check to prevent wiping custom profiles during development
    const isForce = process.argv.includes('--force');
    const userCount = await User.countDocuments();
    if (userCount > 0 && !isForce) {
      console.log('\n⚠️  Database already contains user records. Skipping seeding to prevent wiping your custom profiles.');
      console.log('👉 If you explicitly want to reset and re-seed the database, run: npm run seed -- --force\n');
      return;
    }
    
    console.log('Starting database seeding...');
    
    // Seed users and therapists
    const { users, therapists } = await seedUsers();
    
    // Seed rooms
    await seedRooms([...users, ...therapists]);
    
    console.log('Database seeding completed successfully!');
    console.log('\nSample accounts created:');
    console.log('Users:');
    users.forEach(user => {
      console.log(`  - ${user.fullName} (${user.email}) - password: password123`);
    });
    console.log('Therapists:');
    therapists.forEach(therapist => {
      console.log(`  - ${therapist.fullName} (${therapist.email}) - password: password123`);
    });
    
  } catch (error) {
    console.error('Seeding failed:', error);
  } finally {
    await mongoose.connection.close();
    console.log('Database connection closed.');
    process.exit(0);
  }
};

// Run seeding if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  seedDatabase();
}

export default seedDatabase;
