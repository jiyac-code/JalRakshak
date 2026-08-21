const admin = require('firebase-admin');

// Initialize Firebase Admin safely for dev testing
if (!admin.apps.length) {
  try {
    admin.initializeApp();
  } catch (err) {
    console.warn('Firebase Admin initialized without credentials (dev mode active)');
  }
}

const verifyToken = async (req, res, next) => {
  const token = req.headers.authorization?.split('Bearer ')[1];
  if (!token) return res.status(401).json({ error: 'Unauthorized: Missing token' });

  try {
    const decodedToken = await admin.auth().verifyIdToken(token);
    req.user = decodedToken;
    next();
  } catch (err) {
    return res.status(403).json({ error: 'Invalid or expired token' });
  }
};

module.exports = { verifyToken };