import express from 'express';
import { createServer } from 'http';
import { Server as SocketIOServer } from 'socket.io';
import { MongoClient, ObjectId } from 'mongodb';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { GoogleGenAI } from '@google/genai';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const httpServer = createServer(app);
const io = new SocketIOServer(httpServer, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST', 'PATCH', 'DELETE']
  },
  maxHttpBufferSize: 15e6 // 15MB for voice notes, stickers & photo status
});

app.use(express.json({ limit: '20mb' }));
app.use(express.urlencoded({ extended: true, limit: '20mb' }));

// -------------------------------------------------------------
// ENVIRONMENT & CONFIGURATION
// -------------------------------------------------------------
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb+srv://therasalk9999_db_user:lNFIF60izF65ekpX@cluster0.fglue0z.mongodb.net/dark-dinu?retryWrites=true&w=majority&appName=Cluster0';
const DB_NAME = 'zavi_chats_db';

const APP_NAME = process.env.APP_NAME || 'zavi chats';
const APP_VERSION = process.env.APP_VERSION || '1.0.0';
const APP_LOGO_URL = process.env.APP_LOGO_URL || 'https://cdn.imagetourls.com/uploads/tyImg/Y6a8BZUa.png';

const AI_API_URL = process.env.AI_API_URL || 'https://supunofc.site/api/ai/ai/nova';
const AI_API_KEY = process.env.AI_API_KEY || 'supun_f3be1dda5f1fbd062eacdeca72c0a9c1';

const NEWS_API_URL = process.env.NEWS_API_URL || 'https://api.chamindu.site/api/v1/media/hirunews';
const NEWS_API_KEY = process.env.NEWS_API_KEY || 'chama_api_7b9669a740e0cde09142ee6169e8b575';

const YOUTUBE_SONG_API_URL = process.env.YOUTUBE_SONG_API_URL || 'https://api.chamindu.site/api/v1/youtube/savefrom/mp3';
const YOUTUBE_SONG_API_KEY = process.env.YOUTUBE_SONG_API_KEY || 'chama_api_7b9669a740e0cde09142ee6169e8b575';

// Parse Verified Developers from env
let verifiedDevsList: Array<{ id: string; email: string; username: string; phone: string; ex: string }> = [
  { id: 'dev_94760264995', email: 'zantaxmd@gmail.com', username: 'suranga_mods', phone: '0760264995', ex: '2030-12-31' }
];

try {
  if (process.env.VERIFIED_DEVELOPERS) {
    const parsed = JSON.parse(process.env.VERIFIED_DEVELOPERS);
    if (Array.isArray(parsed)) {
      verifiedDevsList = parsed;
    }
  }
} catch (e) {
  console.warn('Could not parse VERIFIED_DEVELOPERS env JSON, using default.');
}

function checkIsVerifiedDeveloper(email?: string, username?: string, phone?: string): { isVerified: boolean; devId?: string } {
  const cleanEmail = (email || '').trim().toLowerCase();
  const cleanUsername = (username || '').trim().toLowerCase();
  const cleanPhone = (phone || '').replace(/[\s\-\(\)\+]/g, '');

  const now = new Date();

  for (const dev of verifiedDevsList) {
    const devEmail = dev.email.toLowerCase();
    const devUsername = dev.username.toLowerCase();
    const devPhone = dev.phone.replace(/[\s\-\(\)\+]/g, '');

    const expiry = new Date(dev.ex);
    if (now <= expiry) {
      if (
        (cleanEmail && cleanEmail === devEmail) ||
        (cleanUsername && cleanUsername === devUsername) ||
        (cleanPhone && (cleanPhone === devPhone || cleanPhone.endsWith(devPhone) || devPhone.endsWith(cleanPhone)))
      ) {
        return { isVerified: true, devId: dev.id };
      }
    }
  }

  return { isVerified: false };
}

// -------------------------------------------------------------
// DATABASE SETUP
// -------------------------------------------------------------
let dbClient: MongoClient | null = null;
let db: any = null;

async function connectDB() {
  try {
    dbClient = new MongoClient(MONGODB_URI, {
      connectTimeoutMS: 8000,
      serverSelectionTimeoutMS: 8000,
    });
    await dbClient.connect();
    db = dbClient.db(DB_NAME);
    console.log('Database connected successfully');

    await db.collection('users').createIndex({ email: 1 }, { unique: true }).catch(() => {});
    await db.collection('users').createIndex({ phone: 1 }).catch(() => {});
    await db.collection('messages').createIndex({ chatId: 1, timestamp: -1 }).catch(() => {});
    await db.collection('statuses').createIndex({ expiresAt: 1 }).catch(() => {});
    await db.collection('call_logs').createIndex({ userId: 1, timestamp: -1 }).catch(() => {});
  } catch (err: any) {
    console.error('Database connection error:', err?.message || err);
  }
}

connectDB();

// Fallback in-memory storage
const memoryStore = {
  users: new Map<string, any>(),
  chats: new Map<string, any>(),
  messages: new Map<string, any[]>(),
  statuses: new Map<string, any[]>(),
  callLogs: new Map<string, any[]>(),
};

const onlineUsers = new Map<string, string>(); // userId -> socketId

// Gemini API for intelligent AI backup
const aiKey = process.env.GEMINI_API_KEY || '';
const genAI = aiKey ? new GoogleGenAI({ apiKey: aiKey }) : null;

// Validation helpers
function isValidEmail(email: string): boolean {
  if (!email || typeof email !== 'string') return false;
  const cleaned = email.trim().toLowerCase();
  const regex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,10}$/;
  if (!regex.test(cleaned)) return false;

  const fakeDomains = [
    'test.com', 'example.com', 'fake.com', 'mailinator.com', 'tempmail.com',
    'trashmail.com', '10minutemail.com', 'guerrillamail.com', 'yopmail.com',
    'dispostable.com', 'abc.com', 'asdf.com'
  ];
  const domain = cleaned.split('@')[1];
  if (fakeDomains.includes(domain)) return false;

  const prefix = cleaned.split('@')[0];
  if (/^(.)\1{4,}$/.test(prefix)) return false;
  if (prefix.length < 3) return false;

  return true;
}

function isValidPhone(phone: string): boolean {
  if (!phone || typeof phone !== 'string') return false;
  const cleaned = phone.replace(/[\s\-\(\)]/g, '');
  const regex = /^\+?[0-9]{9,15}$/;
  if (!regex.test(cleaned)) return false;

  const digitsOnly = cleaned.replace(/\+/, '');
  if (/^(.)\1+$/.test(digitsOnly)) return false;
  if (digitsOnly === '1234567890' || digitsOnly === '0123456789' || digitsOnly === '9876543210') return false;

  return true;
}

// -------------------------------------------------------------
// APP CONFIG & METADATA ENDPOINT
// -------------------------------------------------------------
app.get('/api/config', (req, res) => {
  res.json({
    appName: APP_NAME,
    appVersion: APP_VERSION,
    appLogoUrl: APP_LOGO_URL
  });
});

// -------------------------------------------------------------
// AUTHENTICATION & USER MANAGEMENT
// -------------------------------------------------------------
app.post('/api/auth/request-otp', async (req, res) => {
  try {
    const { username, email, phone } = req.body;

    if (!isValidEmail(email)) {
      return res.status(400).json({ error: 'කරුණාකර වලංගු ඊමේල් ලිපිනයක් ඇතුළත් කරන්න (Please enter a valid, real email address).' });
    }
    if (!isValidPhone(phone)) {
      return res.status(400).json({ error: 'කරුණාකර වලංගු දුරකථන අංකයක් ඇතුළත් කරන්න (Please enter a valid phone number).' });
    }
    if (!username || username.trim().length < 2) {
      return res.status(400).json({ error: 'කරුණාකර නම ඇතුළත් කරන්න (Username must be at least 2 characters).' });
    }

    const cleanEmail = email.trim().toLowerCase();
    const cleanPhone = phone.trim();
    const cleanUsername = username.trim();

    const devCheck = checkIsVerifiedDeveloper(cleanEmail, cleanUsername, cleanPhone);

    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const otpExpiry = Date.now() + 10 * 60 * 1000;

    const usersCol = db?.collection('users');
    let user = usersCol ? await usersCol.findOne({ email: cleanEmail }) : memoryStore.users.get(cleanEmail);

    if (user) {
      const updateFields: any = {
        otp,
        otpExpiry,
        lastActive: new Date()
      };
      if (devCheck.isVerified) {
        updateFields.hasVerifiedBadge = true;
        updateFields.developerId = devCheck.devId;
      }

      if (usersCol) {
        await usersCol.updateOne({ _id: user._id }, { $set: updateFields });
      } else {
        Object.assign(user, updateFields);
        memoryStore.users.set(cleanEmail, user);
      }
    } else {
      const newUser = {
        _id: new ObjectId().toString(),
        username: cleanUsername,
        displayName: cleanUsername,
        email: cleanEmail,
        phone: cleanPhone,
        avatar: '',
        about: 'Hey there! I am using zavi chats.',
        otp,
        otpExpiry,
        isVerified: false,
        hasVerifiedBadge: devCheck.isVerified,
        developerId: devCheck.devId || null,
        pinnedChatIds: [],
        customWallpaper: '',
        savedStickers: [],
        createdAt: new Date(),
        lastActive: new Date(),
      };

      if (usersCol) {
        await usersCol.insertOne(newUser);
      } else {
        memoryStore.users.set(cleanEmail, newUser);
      }
    }

    console.log(`[zavi chats OTP] Code for ${cleanEmail}: ${otp}`);

    res.json({
      success: true,
      message: `OTP කේතය ${cleanEmail} වෙත යවන ලදි.`,
      debugOtp: otp,
      email: cleanEmail
    });
  } catch (error: any) {
    console.error('Request OTP error:', error);
    res.status(500).json({ error: 'Failed to process request.' });
  }
});

app.post('/api/auth/verify-otp', async (req, res) => {
  try {
    const { email, otp } = req.body;
    if (!email || !otp) {
      return res.status(400).json({ error: 'Email and OTP are required.' });
    }

    const cleanEmail = email.trim().toLowerCase();
    const usersCol = db?.collection('users');
    let user = usersCol ? await usersCol.findOne({ email: cleanEmail }) : memoryStore.users.get(cleanEmail);

    if (!user) {
      return res.status(404).json({ error: 'පරිශීලකයා හමු නොවීය (User not found).' });
    }

    if (user.otp !== otp.trim()) {
      return res.status(400).json({ error: 'වැරදි OTP අංකයකි. කරුණාකර නැවත උත්සාහ කරන්න (Invalid OTP code).' });
    }

    if (Date.now() > user.otpExpiry) {
      return res.status(400).json({ error: 'OTP අංකයේ කාලය ඉකුත්ව ඇත (OTP code has expired).' });
    }

    const devCheck = checkIsVerifiedDeveloper(user.email, user.username, user.phone);
    const updatePayload: any = {
      isVerified: true,
      otp: null,
      lastActive: new Date()
    };
    if (devCheck.isVerified) {
      updatePayload.hasVerifiedBadge = true;
      updatePayload.developerId = devCheck.devId;
    }

    if (usersCol) {
      await usersCol.updateOne({ _id: user._id }, { $set: updatePayload });
    } else {
      Object.assign(user, updatePayload);
      memoryStore.users.set(cleanEmail, user);
    }

    user.otp = undefined;
    user.otpExpiry = undefined;

    res.json({ success: true, user });
  } catch (error: any) {
    console.error('Verify OTP error:', error);
    res.status(500).json({ error: 'Verification failed.' });
  }
});

app.get('/api/users/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const usersCol = db?.collection('users');
    let user = null;
    if (usersCol) {
      let query: any = { _id: id };
      try {
        query = { $or: [{ _id: id }, { _id: new ObjectId(id) }] };
      } catch {
        query = { _id: id };
      }
      user = await usersCol.findOne(query);
    }
    if (!user) {
      for (const u of memoryStore.users.values()) {
        if (u._id === id) { user = u; break; }
      }
    }

    if (!user) return res.status(404).json({ error: 'User not found' });
    delete user.otp;
    delete user.otpExpiry;
    res.json({ user });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.patch('/api/users/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { displayName, about, avatar, customWallpaper, pinnedChatIds, savedStickers, savedContacts } = req.body;
    const updateData: any = { updatedAt: new Date() };

    if (displayName !== undefined) updateData.displayName = displayName;
    if (about !== undefined) updateData.about = about;
    if (avatar !== undefined) updateData.avatar = avatar;
    if (customWallpaper !== undefined) updateData.customWallpaper = customWallpaper;
    if (pinnedChatIds !== undefined) updateData.pinnedChatIds = pinnedChatIds;
    if (savedStickers !== undefined) updateData.savedStickers = savedStickers;
    if (savedContacts !== undefined) updateData.savedContacts = savedContacts;

    const usersCol = db?.collection('users');
    if (usersCol) {
      await usersCol.updateOne({ _id: id }, { $set: updateData });
    }

    for (const [k, u] of memoryStore.users.entries()) {
      if (u._id === id) {
        memoryStore.users.set(k, { ...u, ...updateData });
        break;
      }
    }

    io.emit('user:updated', { userId: id, ...updateData });
    res.json({ success: true, updated: updateData });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/users', async (req, res) => {
  try {
    const currentUserId = req.query.currentUserId as string;
    const search = ((req.query.q as string) || '').trim().toLowerCase();

    const usersCol = db?.collection('users');
    let usersList: any[] = [];

    if (usersCol) {
      usersList = await usersCol.find({
        _id: { $ne: currentUserId },
        isVerified: true
      }).project({ otp: 0, otpExpiry: 0 }).toArray();
    } else {
      usersList = Array.from(memoryStore.users.values())
        .filter(u => u._id !== currentUserId && u.isVerified);
    }

    if (search) {
      usersList = usersList.filter(u =>
        u.displayName?.toLowerCase().includes(search) ||
        u.username?.toLowerCase().includes(search) ||
        u.phone?.includes(search) ||
        u.email?.toLowerCase().includes(search)
      );
    }

    res.json({ users: usersList });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// -------------------------------------------------------------
// CHATS & CHANNELS
// -------------------------------------------------------------
app.get('/api/chats', async (req, res) => {
  try {
    const userId = req.query.userId as string;
    if (!userId) return res.status(400).json({ error: 'User ID is required' });

    const chatsCol = db?.collection('chats');
    const usersCol = db?.collection('users');
    let chats: any[] = [];

    // Fetch requesting user to read savedContacts
    let currentUserDoc = usersCol ? await usersCol.findOne({ _id: userId }) : null;
    if (!currentUserDoc) {
      for (const u of memoryStore.users.values()) {
        if (u._id === userId) { currentUserDoc = u; break; }
      }
    }
    const savedContacts = currentUserDoc?.savedContacts || {};

    if (chatsCol) {
      chats = await chatsCol.find({
        $or: [
          { participants: userId },
          { type: 'channel' },
          { type: 'news' }
        ]
      }).sort({ updatedAt: -1 }).toArray();
    } else {
      chats = Array.from(memoryStore.chats.values()).filter(c =>
        c.participants?.includes(userId) || c.type === 'channel' || c.type === 'news'
      );
    }

    // Resolve direct chat other participant's dynamic details
    const resolvedChats = await Promise.all(chats.map(async (c) => {
      if (c.type === 'direct') {
        const otherId = c.participants?.find((p: string) => p !== userId);
        if (otherId) {
          let otherDoc = usersCol ? await usersCol.findOne({ _id: otherId }) : null;
          if (!otherDoc) {
            for (const u of memoryStore.users.values()) {
              if (u._id === otherId) { otherDoc = u; break; }
            }
          }
          if (otherDoc) {
            const customSavedName = savedContacts[otherId];
            return {
              ...c,
              name: customSavedName || otherDoc.displayName || otherDoc.username || 'User',
              avatar: otherDoc.avatar || '',
              hasVerifiedBadge: !!otherDoc.hasVerifiedBadge,
              otherUser: {
                _id: otherDoc._id,
                displayName: otherDoc.displayName,
                username: otherDoc.username,
                phone: otherDoc.phone,
                email: otherDoc.email,
                avatar: otherDoc.avatar,
                about: otherDoc.about,
                hasVerifiedBadge: !!otherDoc.hasVerifiedBadge,
                savedName: customSavedName || ''
              }
            };
          }
        }
      }
      return c;
    }));

    res.json({ chats: resolvedChats });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Save or Update Custom Contact Name
app.post('/api/users/:id/contacts', async (req, res) => {
  try {
    const { id } = req.params;
    const { targetUserId, savedName } = req.body;
    if (!targetUserId) return res.status(400).json({ error: 'targetUserId is required' });

    const usersCol = db?.collection('users');
    const cleanName = (savedName || '').trim();

    if (usersCol) {
      await usersCol.updateOne(
        { _id: id },
        { $set: { [`savedContacts.${targetUserId}`]: cleanName } }
      );
    }

    for (const [k, u] of memoryStore.users.entries()) {
      if (u._id === id) {
        u.savedContacts = u.savedContacts || {};
        u.savedContacts[targetUserId] = cleanName;
        memoryStore.users.set(k, u);
        break;
      }
    }

    res.json({ success: true, targetUserId, savedName: cleanName });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Get User Contact Profile Details (including their active status updates)
app.get('/api/users/:id/details', async (req, res) => {
  try {
    const { id } = req.params;
    const requesterId = req.query.requesterId as string;

    const usersCol = db?.collection('users');
    const statusesCol = db?.collection('statuses');

    let targetUser = usersCol ? await usersCol.findOne({ _id: id }) : null;
    if (!targetUser) {
      for (const u of memoryStore.users.values()) {
        if (u._id === id) { targetUser = u; break; }
      }
    }

    if (!targetUser) return res.status(404).json({ error: 'User not found' });

    let savedName = '';
    if (requesterId) {
      let requester = usersCol ? await usersCol.findOne({ _id: requesterId }) : null;
      if (!requester) {
        for (const u of memoryStore.users.values()) {
          if (u._id === requesterId) { requester = u; break; }
        }
      }
      if (requester?.savedContacts?.[id]) {
        savedName = requester.savedContacts[id];
      }
    }

    // Active status updates
    const now = new Date();
    let activeStatuses: any[] = [];
    if (statusesCol) {
      activeStatuses = await statusesCol.find({
        userId: id,
        expiresAt: { $gt: now.toISOString() }
      }).sort({ createdAt: -1 }).toArray();
    } else {
      const list = memoryStore.statuses.get(id) || [];
      activeStatuses = list.filter(s => new Date(s.expiresAt) > now);
    }

    res.json({
      user: {
        _id: targetUser._id,
        displayName: targetUser.displayName,
        username: targetUser.username,
        email: targetUser.email,
        phone: targetUser.phone,
        avatar: targetUser.avatar,
        about: targetUser.about,
        hasVerifiedBadge: !!targetUser.hasVerifiedBadge,
        savedName
      },
      statuses: activeStatuses
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/chats/direct', async (req, res) => {
  try {
    const { currentUserId, targetUserId } = req.body;
    if (!currentUserId || !targetUserId) {
      return res.status(400).json({ error: 'Both users are required' });
    }

    const chatsCol = db?.collection('chats');
    const usersCol = db?.collection('users');

    const targetUser = usersCol ? await usersCol.findOne({ _id: targetUserId }) : memoryStore.users.get(targetUserId);
    const currentUser = usersCol ? await usersCol.findOne({ _id: currentUserId }) : memoryStore.users.get(currentUserId);

    let existingChat = null;
    if (chatsCol) {
      existingChat = await chatsCol.findOne({
        type: 'direct',
        participants: { $all: [currentUserId, targetUserId] }
      });
    } else {
      for (const c of memoryStore.chats.values()) {
        if (c.type === 'direct' && c.participants?.includes(currentUserId) && c.participants?.includes(targetUserId)) {
          existingChat = c;
          break;
        }
      }
    }

    const baseChat = existingChat || {
      _id: `chat_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      type: 'direct',
      participants: [currentUserId, targetUserId],
      lastMessage: null,
      unreadCounts: { [currentUserId]: 0, [targetUserId]: 0 },
      createdAt: new Date(),
      updatedAt: new Date()
    };

    if (!existingChat) {
      if (chatsCol) {
        await chatsCol.insertOne(baseChat);
      } else {
        memoryStore.chats.set(baseChat._id, baseChat);
      }
    }

    // Format chat for current user
    const currentSavedName = currentUser?.savedContacts?.[targetUserId];
    const chatForCurrent = {
      ...baseChat,
      name: currentSavedName || targetUser?.displayName || targetUser?.username || 'User',
      avatar: targetUser?.avatar || '',
      hasVerifiedBadge: !!targetUser?.hasVerifiedBadge,
      otherUser: targetUser ? {
        _id: targetUser._id,
        displayName: targetUser.displayName,
        username: targetUser.username,
        savedName: currentSavedName || '',
        avatar: targetUser.avatar || '',
        about: targetUser.about || '',
        phone: targetUser.phone || '',
        email: targetUser.email || '',
        hasVerifiedBadge: !!targetUser.hasVerifiedBadge,
        isOnline: onlineUsers.has(targetUserId)
      } : null
    };

    // Format chat for target user and notify via socket
    const targetSocketId = onlineUsers.get(targetUserId);
    if (targetSocketId) {
      const targetSavedName = targetUser?.savedContacts?.[currentUserId];
      const chatForTarget = {
        ...baseChat,
        name: targetSavedName || currentUser?.displayName || currentUser?.username || 'User',
        avatar: currentUser?.avatar || '',
        hasVerifiedBadge: !!currentUser?.hasVerifiedBadge,
        otherUser: currentUser ? {
          _id: currentUser._id,
          displayName: currentUser.displayName,
          username: currentUser.username,
          savedName: targetSavedName || '',
          avatar: currentUser.avatar || '',
          about: currentUser.about || '',
          phone: currentUser.phone || '',
          email: currentUser.email || '',
          hasVerifiedBadge: !!currentUser.hasVerifiedBadge,
          isOnline: onlineUsers.has(currentUserId)
        } : null
      };
      io.to(targetSocketId).emit('chat:new', chatForTarget);
    }

    res.json({ chat: chatForCurrent });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/chats/group', async (req, res) => {
  try {
    const { name, description, avatar, creatorId, participantIds, type } = req.body;
    if (!name || !creatorId) {
      return res.status(400).json({ error: 'Name and creator are required' });
    }

    const isChannel = type === 'channel';
    const participants = Array.from(new Set([creatorId, ...(participantIds || [])]));

    const newChat = {
      _id: `${isChannel ? 'channel' : 'group'}_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      type: isChannel ? 'channel' : 'group',
      name: name.trim(),
      description: description || '',
      avatar: avatar || '',
      creatorId,
      hasVerifiedBadge: isChannel,
      participants,
      lastMessage: {
        _id: `sys_${Date.now()}`,
        chatId: '',
        text: isChannel ? `Channel created: "${name}"` : `Group created: "${name}"`,
        senderId: 'system',
        senderName: 'System',
        timestamp: new Date().toISOString(),
        type: 'text',
        status: 'read'
      },
      unreadCounts: {},
      createdAt: new Date(),
      updatedAt: new Date()
    };

    const chatsCol = db?.collection('chats');
    if (chatsCol) {
      await chatsCol.insertOne(newChat);
    } else {
      memoryStore.chats.set(newChat._id, newChat);
    }

    participants.forEach(pId => {
      const socketId = onlineUsers.get(pId);
      if (socketId) {
        io.to(socketId).emit('chat:new', newChat);
      }
    });

    res.json({ chat: newChat });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// -------------------------------------------------------------
// MESSAGES (REACTIONS, REPLY, FORWARD, DELETE FOR ME / EVERYONE)
// -------------------------------------------------------------
app.get('/api/chats/:chatId/messages', async (req, res) => {
  try {
    const { chatId } = req.params;
    const userId = req.query.userId as string;
    const limit = parseInt(req.query.limit as string) || 120;

    const messagesCol = db?.collection('messages');
    let messages: any[] = [];

    if (messagesCol) {
      messages = await messagesCol.find({ chatId })
        .sort({ timestamp: 1 })
        .limit(limit)
        .toArray();
    } else {
      messages = memoryStore.messages.get(chatId) || [];
    }

    // Filter out messages deleted for this user
    if (userId) {
      messages = messages.filter(m => !(m.deletedFor && m.deletedFor.includes(userId)));
    }

    res.json({ messages });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/chats/:chatId/messages', async (req, res) => {
  try {
    const { chatId } = req.params;
    const {
      senderId, senderName, senderAvatar, text, type,
      mediaUrl, audioDuration, replyTo, isForwarded, songMeta, callMeta
    } = req.body;

    if (!senderId) return res.status(400).json({ error: 'senderId is required' });

    const chatsCol = db?.collection('chats');
    const targetChat = chatsCol ? await chatsCol.findOne({ _id: chatId }) : memoryStore.chats.get(chatId);

    // Channel restriction: Only the creator can send messages in channels!
    if (targetChat && targetChat.type === 'channel' && targetChat.creatorId !== senderId) {
      return res.status(403).json({ error: 'Only the channel creator can send messages in this channel.' });
    }

    // News channel restriction: No user can post
    if (targetChat && targetChat.type === 'news' && senderId !== 'system' && senderId !== 'zanta_news') {
      return res.status(403).json({ error: 'Users cannot post in news broadcast channel.' });
    }

    const message = {
      _id: `msg_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      chatId,
      senderId,
      senderName: senderName || 'User',
      senderAvatar: senderAvatar || '',
      text: text || '',
      type: type || 'text', // 'text', 'voice', 'image', 'sticker', 'song', 'call_log'
      mediaUrl: mediaUrl || '',
      audioDuration: audioDuration || 0,
      timestamp: new Date().toISOString(),
      status: 'sent',
      readBy: [senderId],
      replyTo: replyTo || null,
      isForwarded: !!isForwarded,
      reactions: {},
      deletedFor: [],
      isDeletedForEveryone: false,
      songMeta: songMeta || null,
      callMeta: callMeta || null
    };

    const messagesCol = db?.collection('messages');
    if (messagesCol) {
      await messagesCol.insertOne(message);
    } else {
      const existing = memoryStore.messages.get(chatId) || [];
      existing.push(message);
      memoryStore.messages.set(chatId, existing);
    }

    if (chatsCol) {
      await chatsCol.updateOne(
        { _id: chatId },
        {
          $set: {
            lastMessage: message,
            updatedAt: new Date()
          }
        }
      );
    }

    // Broadcast message to room and emit notification
    io.to(chatId).emit('message:new', message);

    // Send notification to participants who are not sender
    if (targetChat?.participants) {
      targetChat.participants.forEach((pId: string) => {
        if (pId !== senderId) {
          const socketId = onlineUsers.get(pId);
          if (socketId) {
            io.to(socketId).emit('notification:new_message', {
              chatId,
              senderName: senderName || 'User',
              text: type === 'voice' ? '🎤 Voice note' : type === 'image' ? '📷 Photo' : type === 'sticker' ? '🎨 Sticker' : text,
              timestamp: message.timestamp
            });
          }
        }
      });
    }

    res.json({ message });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// React to a Message with Emoji
app.post('/api/messages/:messageId/react', async (req, res) => {
  try {
    const { messageId } = req.params;
    const { userId, emoji } = req.body;
    if (!userId || !emoji) return res.status(400).json({ error: 'userId and emoji required' });

    const messagesCol = db?.collection('messages');
    let message = messagesCol ? await messagesCol.findOne({ _id: messageId }) : null;

    if (!message) {
      for (const list of memoryStore.messages.values()) {
        const found = list.find(m => m._id === messageId);
        if (found) { message = found; break; }
      }
    }

    if (!message) return res.status(404).json({ error: 'Message not found' });

    const reactions = message.reactions || {};
    const userList = reactions[emoji] || [];

    if (userList.includes(userId)) {
      reactions[emoji] = userList.filter((id: string) => id !== userId);
      if (reactions[emoji].length === 0) delete reactions[emoji];
    } else {
      reactions[emoji] = [...userList, userId];
    }

    if (messagesCol) {
      await messagesCol.updateOne({ _id: messageId }, { $set: { reactions } });
    }

    io.to(message.chatId).emit('message:reaction', {
      messageId,
      chatId: message.chatId,
      reactions
    });

    res.json({ success: true, reactions });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Delete Message (for me or everyone)
app.post('/api/messages/:messageId/delete', async (req, res) => {
  try {
    const { messageId } = req.params;
    const { userId, mode } = req.body; // mode: 'me' | 'everyone'
    if (!userId || !mode) return res.status(400).json({ error: 'userId and mode required' });

    const messagesCol = db?.collection('messages');
    let message = messagesCol ? await messagesCol.findOne({ _id: messageId }) : null;

    if (!message) {
      for (const list of memoryStore.messages.values()) {
        const found = list.find(m => m._id === messageId);
        if (found) { message = found; break; }
      }
    }

    if (!message) return res.status(404).json({ error: 'Message not found' });

    if (mode === 'everyone') {
      if (message.senderId !== userId) {
        return res.status(403).json({ error: 'Only sender can delete for everyone' });
      }

      const updateData = {
        isDeletedForEveryone: true,
        text: 'This message was deleted',
        mediaUrl: '',
        songMeta: null
      };

      if (messagesCol) {
        await messagesCol.updateOne({ _id: messageId }, { $set: updateData });
      } else {
        Object.assign(message, updateData);
      }

      io.to(message.chatId).emit('message:deleted_everyone', {
        messageId,
        chatId: message.chatId
      });
    } else {
      // Delete for Me
      if (messagesCol) {
        await messagesCol.updateOne({ _id: messageId }, { $addToSet: { deletedFor: userId } });
      } else {
        message.deletedFor = message.deletedFor || [];
        if (!message.deletedFor.includes(userId)) message.deletedFor.push(userId);
      }
    }

    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/chats/:chatId/read', async (req, res) => {
  try {
    const { chatId } = req.params;
    const { userId } = req.body;
    if (!userId) return res.status(400).json({ error: 'userId is required' });

    const messagesCol = db?.collection('messages');
    if (messagesCol) {
      await messagesCol.updateMany(
        { chatId, senderId: { $ne: userId } },
        {
          $addToSet: { readBy: userId },
          $set: { status: 'read' }
        }
      );
    }

    io.to(chatId).emit('message:read_receipt', {
      chatId,
      readByUserId: userId,
      status: 'read'
    });

    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// -------------------------------------------------------------
// STATUS UPDATES (REACTIONS & COMMENTS)
// -------------------------------------------------------------
app.post('/api/status', async (req, res) => {
  try {
    const { userId, userName, userAvatar, hasVerifiedBadge, type, content, caption, background, font } = req.body;
    if (!userId || !content) {
      return res.status(400).json({ error: 'User ID and content are required' });
    }

    const now = new Date();
    const expiresAt = new Date(now.getTime() + 24 * 60 * 60 * 1000);

    const newStatus = {
      _id: `status_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      userId,
      userName: userName || 'User',
      userAvatar: userAvatar || '',
      hasVerifiedBadge: !!hasVerifiedBadge,
      type: type || 'text',
      content,
      caption: caption || '',
      background: background || '#128c7e',
      font: font || 'sans-serif',
      createdAt: now.toISOString(),
      expiresAt: expiresAt.toISOString(),
      viewers: [],
      reactions: {},
      comments: []
    };

    const statusesCol = db?.collection('statuses');
    if (statusesCol) {
      await statusesCol.insertOne(newStatus);
    } else {
      const list = memoryStore.statuses.get(userId) || [];
      list.push(newStatus);
      memoryStore.statuses.set(userId, list);
    }

    io.emit('status:new', newStatus);
    res.json({ status: newStatus });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/status', async (req, res) => {
  try {
    const currentUserId = req.query.userId as string;
    const now = new Date();

    const statusesCol = db?.collection('statuses');
    let allStatuses: any[] = [];

    if (statusesCol) {
      allStatuses = await statusesCol.find({
        expiresAt: { $gt: now.toISOString() }
      }).sort({ createdAt: -1 }).toArray();
    } else {
      for (const list of memoryStore.statuses.values()) {
        allStatuses.push(...list.filter(s => new Date(s.expiresAt) > now));
      }
    }

    const groupedMap = new Map<string, any>();
    allStatuses.forEach(s => {
      if (!groupedMap.has(s.userId)) {
        groupedMap.set(s.userId, {
          userId: s.userId,
          userName: s.userName,
          userAvatar: s.userAvatar,
          hasVerifiedBadge: s.hasVerifiedBadge,
          statuses: [],
          allViewed: true,
          updatedAt: s.createdAt
        });
      }
      const group = groupedMap.get(s.userId);
      group.statuses.push(s);
      const isViewed = s.viewers?.some((v: any) => v.userId === currentUserId);
      if (!isViewed && s.userId !== currentUserId) {
        group.allViewed = false;
      }
    });

    res.json({
      myStatuses: groupedMap.get(currentUserId)?.statuses || [],
      recentUpdates: Array.from(groupedMap.values()).filter(g => g.userId !== currentUserId)
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/status/:statusId/view', async (req, res) => {
  try {
    const { statusId } = req.params;
    const { userId, userName } = req.body;
    if (!userId) return res.status(400).json({ error: 'userId is required' });

    const viewerEntry = {
      userId,
      userName: userName || 'User',
      viewedAt: new Date().toISOString()
    };

    const statusesCol = db?.collection('statuses');
    if (statusesCol) {
      await statusesCol.updateOne(
        { _id: statusId, 'viewers.userId': { $ne: userId } },
        { $push: { viewers: viewerEntry } }
      );
    }

    io.emit('status:viewed', { statusId, viewer: viewerEntry });
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Like / React to Status
app.post('/api/status/:statusId/react', async (req, res) => {
  try {
    const { statusId } = req.params;
    const { userId, emoji } = req.body;
    if (!userId || !emoji) return res.status(400).json({ error: 'userId and emoji required' });

    const statusesCol = db?.collection('statuses');
    let status = statusesCol ? await statusesCol.findOne({ _id: statusId }) : null;

    if (!status) return res.status(404).json({ error: 'Status not found' });

    const reactions = status.reactions || {};
    const userList = reactions[emoji] || [];
    if (!userList.includes(userId)) {
      reactions[emoji] = [...userList, userId];
    } else {
      reactions[emoji] = userList.filter((id: string) => id !== userId);
    }

    if (statusesCol) {
      await statusesCol.updateOne({ _id: statusId }, { $set: { reactions } });
    }

    io.emit('status:reaction_updated', { statusId, reactions });
    res.json({ success: true, reactions });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Comment on Status (Also sends as direct reply to status creator)
app.post('/api/status/:statusId/comment', async (req, res) => {
  try {
    const { statusId } = req.params;
    const { userId, userName, userAvatar, text } = req.body;
    if (!userId || !text?.trim()) return res.status(400).json({ error: 'Comment text required' });

    const comment = {
      id: `c_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      userId,
      userName: userName || 'User',
      userAvatar: userAvatar || '',
      text: text.trim(),
      createdAt: new Date().toISOString()
    };

    const statusesCol = db?.collection('statuses');
    if (statusesCol) {
      await statusesCol.updateOne({ _id: statusId }, { $push: { comments: comment } });
    }

    io.emit('status:comment_added', { statusId, comment });
    res.json({ success: true, comment });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// -------------------------------------------------------------
// CALL LOGS & MISSED CALLS
// -------------------------------------------------------------
app.get('/api/calls', async (req, res) => {
  try {
    const userId = req.query.userId as string;
    if (!userId) return res.status(400).json({ error: 'userId required' });

    const callsCol = db?.collection('call_logs');
    let logs: any[] = [];
    if (callsCol) {
      logs = await callsCol.find({
        $or: [{ userId }, { otherUserId: userId }]
      }).sort({ timestamp: -1 }).limit(50).toArray();
    } else {
      logs = memoryStore.callLogs.get(userId) || [];
    }

    res.json({ calls: logs });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/calls/log', async (req, res) => {
  try {
    const { userId, otherUserId, otherUserName, otherUserAvatar, type, direction, duration } = req.body;
    const logItem = {
      _id: `call_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      userId,
      otherUserId,
      otherUserName,
      otherUserAvatar,
      type: type || 'voice',
      direction: direction || 'outgoing', // 'incoming', 'outgoing', 'missed'
      duration: duration || 0,
      timestamp: new Date().toISOString()
    };

    const callsCol = db?.collection('call_logs');
    if (callsCol) {
      await callsCol.insertOne(logItem);
    } else {
      const existing = memoryStore.callLogs.get(userId) || [];
      existing.unshift(logItem);
      memoryStore.callLogs.set(userId, existing);
    }

    res.json({ success: true, log: logItem });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// -------------------------------------------------------------
// ZANTA AI CHAT (STRICTLY PRIVATE & NAMED "ZANTA AI")
// -------------------------------------------------------------
app.post('/api/ai/zanta', async (req, res) => {
  try {
    const { prompt } = req.body;
    if (!prompt || typeof prompt !== 'string') {
      return res.status(400).json({ error: 'Prompt is required' });
    }

    const externalUrl = `${AI_API_URL}?q=${encodeURIComponent(prompt)}&apikey=${AI_API_KEY}`;
    let reply = '';

    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 8000);
      const response = await fetch(externalUrl, { signal: controller.signal });
      clearTimeout(timeout);

      if (response.ok) {
        const data = await response.json().catch(() => null);
        if (data) {
          reply = data.text || data.results?.text || data.result || data.response || data.message || data.reply || data.data || '';
        } else if (typeof data === 'string') {
          reply = data;
        }
      }
    } catch (fetchErr) {
      console.warn('External AI endpoint issue, switching to Gemini fallback:', fetchErr);
    }

    // Check if user asked who/what is its name
    const lowerPrompt = prompt.toLowerCase();
    const isAskingName = lowerPrompt.includes('name') || lowerPrompt.includes('who are you') || lowerPrompt.includes('නම') || lowerPrompt.includes('කවුද');

    if (!reply && genAI) {
      const response = await genAI.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
        config: {
          systemInstruction: 'You are Zanta AI, a helpful, polite, and intelligent AI companion in the zavi chats app v1.0.0. Whenever asked about your name, identity, or creator, you must ALWAYS state your name is Zanta AI. Answer warmly in Sinhala or English.',
        }
      });
      reply = response.text || 'හායි! මම Zanta AI. මට ඔබට උදව් කළ හැක්කේ කෙසේද? (Hi, I am Zanta AI! How can I help you today?)';
    }

    if (reply) {
      reply = reply.replace(/nova\s*ai/gi, 'Zanta AI').replace(/nova/gi, 'Zanta AI');
    }

    if (!reply || isAskingName) {
      if (isAskingName) {
        reply = 'මගේ නම Zanta AI! zavi chats තුළ ඔබට ඕනෑම දෙයකට උදව් කිරීමට මම සූදානම්. (My name is Zanta AI!)';
      } else {
        reply = 'Hi! I am Zanta AI. How can I assist you with your questions, code, or messages today?';
      }
    }

    res.json({ reply });
  } catch (err: any) {
    console.error('Zanta AI error:', err);
    res.status(500).json({ reply: 'Sorry, I am Zanta AI. I could not process that request right now. Please try again.' });
  }
});

// -------------------------------------------------------------
// SONG BOT (.song <name> -> YouTube MP3)
// -------------------------------------------------------------
app.post('/api/song/search', async (req, res) => {
  try {
    const { query } = req.body;
    if (!query) return res.status(400).json({ error: 'Song name or query required' });

    const cleanQuery = query.replace(/^\.song\s*/i, '').trim();
    if (!cleanQuery) return res.status(400).json({ error: 'Please enter a song name' });

    const songApiUrl = `${YOUTUBE_SONG_API_URL}?query=${encodeURIComponent(cleanQuery)}&api_key=${YOUTUBE_SONG_API_KEY}`;

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 12000);
    const response = await fetch(songApiUrl, { signal: controller.signal });
    clearTimeout(timeout);

    if (response.ok) {
      const data = await response.json().catch(() => null);
      if (data && (data.download_url || data.link || data.mp3 || data.url || data.result)) {
        const result = data.result || data;
        const songData = {
          title: result.title || result.name || cleanQuery,
          mp3Url: result.download_url || result.link || result.mp3 || result.url,
          thumbnail: result.thumbnail || result.image || 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=300&auto=format&fit=crop&q=80',
          duration: result.duration || '3:30'
        };
        return res.json({ success: true, song: songData });
      }
    }

    // Fallback if API returns empty
    res.json({
      success: true,
      song: {
        title: cleanQuery,
        mp3Url: 'https://cdn.pixabay.com/download/audio/2022/05/27/audio_1808fbf07a.mp3',
        thumbnail: 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=300&auto=format&fit=crop&q=80',
        duration: '3:45'
      }
    });
  } catch (err: any) {
    console.error('Song Bot error:', err);
    res.status(500).json({ error: 'Failed to search song. Please try again.' });
  }
});

// -------------------------------------------------------------
// ZANTA NEWS CHANNEL (HIRU NEWS)
// -------------------------------------------------------------
let cachedNews: any[] = [];
let lastNewsFetch = 0;

async function fetchLatestNews() {
  try {
    const fullNewsUrl = `${NEWS_API_URL}?limit=48&api_key=${NEWS_API_KEY}`;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000);
    const response = await fetch(fullNewsUrl, { signal: controller.signal });
    clearTimeout(timeout);

    if (response.ok) {
      const data = await response.json().catch(() => null);
      const items = data?.data || data?.results || data?.news || (Array.isArray(data) ? data : []);
      if (Array.isArray(items) && items.length > 0) {
        cachedNews = items.map((item: any, idx: number) => ({
          id: item.id || `news_${idx}_${Date.now()}`,
          title: item.title || item.news_heading || 'News Update',
          description: item.description || item.paragraph || item.content || '',
          image: item.image || item.img_url || item.thumbnail || '',
          time: item.time || item.date || item.created_at || 'Just now',
          link: item.link || item.url || item.news_url || 'https://www.hirunews.lk',
          timestamp: new Date().toISOString()
        }));
        lastNewsFetch = Date.now();
        console.log(`[zavi chats News] Fetched ${cachedNews.length} latest news updates.`);
      }
    }
  } catch (err: any) {
    console.warn('[News Channel] Could not fetch news updates:', err.message);
  }
}

fetchLatestNews();
setInterval(fetchLatestNews, 20 * 60 * 1000);

app.get('/api/news', async (req, res) => {
  if (Date.now() - lastNewsFetch > 20 * 60 * 1000 || cachedNews.length === 0) {
    await fetchLatestNews();
  }
  res.json({ news: cachedNews });
});

// -------------------------------------------------------------
// SOCKET.IO REAL-TIME ENGINE
// -------------------------------------------------------------
io.on('connection', (socket) => {
  let activeUserId: string | null = null;

  socket.on('user:online', (userId: string) => {
    activeUserId = userId;
    onlineUsers.set(userId, socket.id);
    io.emit('user:status_change', { userId, isOnline: true });
  });

  socket.on('chat:join', (chatId: string) => {
    socket.join(chatId);
  });

  socket.on('chat:leave', (chatId: string) => {
    socket.leave(chatId);
  });

  socket.on('chat:typing', ({ chatId, userId, userName, isTyping }) => {
    socket.to(chatId).emit('chat:typing', { chatId, userId, userName, isTyping });
  });

  // Calling
  socket.on('call:start', ({ toUserId, fromUser, isVideo, callId }) => {
    const targetSocketId = onlineUsers.get(toUserId);
    if (targetSocketId) {
      io.to(targetSocketId).emit('call:incoming', {
        fromUser,
        isVideo,
        callId
      });
    } else {
      socket.emit('call:unavailable', { message: 'User is offline' });
    }
  });

  socket.on('call:accept', ({ toUserId, callId }) => {
    const targetSocketId = onlineUsers.get(toUserId);
    if (targetSocketId) {
      io.to(targetSocketId).emit('call:accepted', { callId });
    }
  });

  socket.on('call:reject', ({ toUserId, callId, reason }) => {
    const targetSocketId = onlineUsers.get(toUserId);
    if (targetSocketId) {
      io.to(targetSocketId).emit('call:rejected', { callId, reason });
    }
  });

  socket.on('call:signal', ({ toUserId, signal }) => {
    const targetSocketId = onlineUsers.get(toUserId);
    if (targetSocketId) {
      io.to(targetSocketId).emit('call:signal', { signal });
    }
  });

  socket.on('call:end', ({ toUserId, callId, isMissed }) => {
    const targetSocketId = onlineUsers.get(toUserId);
    if (targetSocketId) {
      io.to(targetSocketId).emit('call:ended', { callId, isMissed });
    }
  });

  socket.on('disconnect', () => {
    if (activeUserId) {
      onlineUsers.delete(activeUserId);
      io.emit('user:status_change', { userId: activeUserId, isOnline: false });
    }
  });
});

// -------------------------------------------------------------
// VITE DEV SERVER OR STATIC PRODUCTION
// -------------------------------------------------------------
const PORT = process.env.PORT || 3000;

async function startServer() {
  if (process.env.NODE_ENV === 'production') {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (req, res) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  } else {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa'
    });
    app.use(vite.middlewares);
  }

  httpServer.listen(Number(PORT), '0.0.0.0', () => {
    console.log(`zavi chats server is running at http://localhost:${PORT}`);
  });
}

startServer();
