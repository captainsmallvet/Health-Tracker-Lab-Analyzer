import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import multer from 'multer';
import { createServer as createViteServer } from 'vite';
import { google } from 'googleapis';
import jwt from 'jsonwebtoken';
import { GoogleGenAI } from '@google/genai';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config();

const app = express();
const PORT = 3000;

app.use(cors());
app.use(express.json());
app.use(cookieParser());

const upload = multer({ storage: multer.memoryStorage() });

// --- Configuration ---
const WHITELIST_EMAILS = [
'thunyaluks@gmail.com',
'tmchote@gmail.com',
'captainsmallvet@gmail.com',
'captainct007@gmail.com',
'ulidsp@gmail.com',
'thunyalukblank@gmail.com',
'tmchotestat@gmail.com',
'toniekku@gmail.com',
'tonstudyblog@gmail.com',
'thunyalukkrungthai@gmail.com',
'thunyalukkrungsri@gmail.com',
'thunyalukkasikorn@gmail.com',
'tonhc001@gmail.com',
'tonhc002@gmail.com',
'tonhc003@gmail.com',
'tonhc004@gmail.com',
'thunyalukusa@gmail.com'
];
const JWT_SECRET = process.env.JWT_SECRET || 'fallback-secret';
const GOOGLE_SHEET_ID = process.env.GOOGLE_SHEET_ID;
const OAUTH_CLIENT_ID = process.env.OAUTH_CLIENT_ID;
const OAUTH_CLIENT_SECRET = process.env.OAUTH_CLIENT_SECRET;
const APP_URL = process.env.APP_URL || `http://localhost:${PORT}`;
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

// --- OAuth Setup ---
const oauth2Client = new google.auth.OAuth2(
  OAUTH_CLIENT_ID,
  OAUTH_CLIENT_SECRET,
  `${APP_URL}/api/auth/callback`
);

// --- Middleware ---
const authenticate = (req: express.Request, res: express.Response, next: express.NextFunction) => {
  const token = req.cookies.auth_token;
  if (!token) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as { email: string; name: string; picture: string };
    if (!WHITELIST_EMAILS.includes(decoded.email)) {
      return res.status(403).json({ error: 'Forbidden: Email not whitelisted' });
    }
    (req as any).user = decoded;
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Invalid token' });
  }
};

// --- Routes ---

// 1. Auth Routes
app.get('/api/auth/url', (req, res) => {
  const url = oauth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: [
      'https://www.googleapis.com/auth/userinfo.email',
      'https://www.googleapis.com/auth/userinfo.profile',
    ],
  });
  res.json({ url });
});

app.get(['/api/auth/callback', '/api/auth/callback/'], async (req, res) => {
  const code = req.query.code as string;
  try {
    const { tokens } = await oauth2Client.getToken(code);
    oauth2Client.setCredentials(tokens);

    const oauth2 = google.oauth2({ version: 'v2', auth: oauth2Client });
    const userInfo = await oauth2.userinfo.get();
    
    const email = userInfo.data.email;
    if (!email || !WHITELIST_EMAILS.includes(email)) {
      return res.status(403).send(`
        <html><body>
          <h2>Access Denied</h2>
          <p>Your email (${email}) is not authorized to use this application.</p>
          <script>
            setTimeout(() => window.close(), 5000);
          </script>
        </body></html>
      `);
    }

    const token = jwt.sign(
      { email: userInfo.data.email, name: userInfo.data.name, picture: userInfo.data.picture },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.cookie('auth_token', token, {
      httpOnly: true,
      secure: true,
      sameSite: 'none',
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    });

    res.send(`
      <html>
        <body>
          <script>
            if (window.opener) {
              window.opener.postMessage({ type: 'OAUTH_AUTH_SUCCESS' }, '*');
              window.close();
            } else {
              window.location.href = '/';
            }
          </script>
          <p>Authentication successful. This window should close automatically.</p>
        </body>
      </html>
    `);
  } catch (error) {
    console.error('OAuth callback error:', error);
    res.status(500).send('Authentication failed');
  }
});

app.get('/api/auth/me', authenticate, (req, res) => {
  res.json((req as any).user);
});

app.post('/api/auth/logout', (req, res) => {
  res.clearCookie('auth_token', {
    httpOnly: true,
    secure: true,
    sameSite: 'none',
  });
  res.json({ success: true });
});

// 2. Google Sheets Setup
// We need service account or user credentials to access the sheet.
// For simplicity, we can use the user's OAuth token if we requested drive/sheets scope,
// OR we can use a service account. The requirements say:
// "เตรียมโครงสร้างไฟล์ .env.example และแนะนำขั้นตอนการตั้งค่าใน Google Cloud Console (เปิด Sheets API, Drive API)"
// Let's assume the user will provide a Service Account JSON or we use the app's own credentials.
// Actually, if we use the user's OAuth token, they need to have access to the sheet.
// Let's use the user's OAuth token to access the sheet. We need to add scopes.
// Wait, if it's a shared database, it's better to use a Service Account or a single central account.
// Let's update the auth url to include sheets scope if we want to act on behalf of the user,
// OR we can just use the server's own credentials.
// The prompt says: "ใช้ Environment Variables ในการเก็บ API Keys และ OAuth Secrets"
// Let's use the standard Google Auth library which can use GOOGLE_APPLICATION_CREDENTIALS or we can pass client email/private key.
// To make it easier without a file, we can use environment variables for the service account.
// Let's add GOOGLE_SERVICE_ACCOUNT_EMAIL and GOOGLE_PRIVATE_KEY to .env.

// For now, let's mock the sheets API if credentials are not fully set, or implement the real one.
const getSheetsClient = () => {
  // If we have service account details in env
  if (process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL && process.env.GOOGLE_PRIVATE_KEY) {
    const auth = new google.auth.GoogleAuth({
      credentials: {
        client_email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
        private_key: process.env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, '\n'),
      },
      scopes: ['https://www.googleapis.com/auth/spreadsheets']
    });
    return google.sheets({ version: 'v4', auth });
  }
  return null;
};

// Helper to get current date/time in Thailand timezone (Asia/Bangkok)
const getThaiTimestamp = () => {
  return new Date().toLocaleString('en-US', { timeZone: 'Asia/Bangkok' });
};

const getThaiDateString = () => {
  // Returns YYYY-MM-DD in Thai timezone
  const d = new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Bangkok' }));
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

// Get today's usage
app.get('/api/usage/today', authenticate, async (req, res) => {
  try {
    const sheets = getSheetsClient();
    if (!sheets || !GOOGLE_SHEET_ID) return res.json({ count: 0 });
    
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: GOOGLE_SHEET_ID,
      range: 'UsageLogs!A:A'
    });
    
    const rows = response.data.values || [];
    const today = getThaiDateString();
    
    // Count rows where the first column starts with today's date (YYYY-MM-DD or MM/DD/YYYY depending on how it was saved)
    // We'll check if the string contains the current day and month to be safe across different formats
    const d = new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Bangkok' }));
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    const year = d.getFullYear();
    
    const todayCount = rows.filter(row => {
      if (!row[0]) return false;
      const dateStr = String(row[0]);
      // Check ISO format (YYYY-MM-DD) or locale format (M/D/YYYY)
      return dateStr.startsWith(today) || 
             (dateStr.includes(`${year}`) && dateStr.includes(`${d.getMonth() + 1}`) && dateStr.includes(`${d.getDate()}`));
    }).length;
    
    res.json({ count: todayCount });
  } catch (error) {
    console.error('Failed to fetch usage', error);
    // If the tab doesn't exist, just return 0
    res.json({ count: 0 });
  }
});

app.get('/api/data/:tab', authenticate, async (req, res) => {
  const { tab } = req.params;
  const sheets = getSheetsClient();
  if (!sheets || !GOOGLE_SHEET_ID) {
    return res.json([]);
  }

  try {
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: GOOGLE_SHEET_ID,
      range: `${tab}!A:Z`,
    });
    
    const rows = response.data.values || [];
    if (rows.length === 0) return res.json([]);
    
    const headers = rows[0];
    const data = rows.slice(1).map((row, index) => {
      const obj: any = { _rowIndex: index + 2 }; // +2 because row 1 is header and index is 0-based
      headers.forEach((header, colIndex) => {
        obj[header] = row[colIndex] || '';
      });
      return obj;
    });
    
    res.json(data);
  } catch (error) {
    console.error('Sheets API error:', error);
    res.status(500).json({ error: 'Failed to fetch data' });
  }
});

app.post('/api/data/:tab', authenticate, async (req, res) => {
  const { tab } = req.params;
  const data = req.body; // Should be an array of objects or a single object
  
  const sheets = getSheetsClient();
  if (!sheets || !GOOGLE_SHEET_ID) {
    return res.json({ success: true, message: 'Mock save (Sheets API not configured)' });
  }

  try {
    // First, get headers
    const headerResponse = await sheets.spreadsheets.values.get({
      spreadsheetId: GOOGLE_SHEET_ID,
      range: `${tab}!1:1`,
    });
    
    let headers = headerResponse.data.values?.[0];
    
    // If no headers, create them from the first object
    const items = Array.isArray(data) ? data : [data];
    if (items.length === 0) return res.json({ success: true });
    
    if (!headers) {
      headers = Object.keys(items[0]).filter(key => key !== '_rowIndex');
      await sheets.spreadsheets.values.update({
        spreadsheetId: GOOGLE_SHEET_ID,
        range: `${tab}!A1`,
        valueInputOption: 'USER_ENTERED',
        requestBody: { values: [headers] }
      });
    } else {
      let newHeadersAdded = false;
      items.forEach(item => {
        Object.keys(item).forEach(key => {
          if (key !== '_rowIndex' && !headers.includes(key)) {
            headers.push(key);
            newHeadersAdded = true;
          }
        });
      });
      
      if (newHeadersAdded) {
        await sheets.spreadsheets.values.update({
          spreadsheetId: GOOGLE_SHEET_ID,
          range: `${tab}!A1`,
          valueInputOption: 'USER_ENTERED',
          requestBody: { values: [headers] }
        });
      }
    }

    // Map data to rows based on headers
    const rows = items.map(item => headers!.map(header => item[header] || ''));

    await sheets.spreadsheets.values.append({
      spreadsheetId: GOOGLE_SHEET_ID,
      range: `${tab}!A:A`,
      valueInputOption: 'USER_ENTERED',
      requestBody: { values: rows }
    });

    res.json({ success: true });
  } catch (error) {
    console.error('Sheets API error:', error);
    res.status(500).json({ error: 'Failed to append data' });
  }
});

app.put('/api/data/:tab/:rowIndex', authenticate, async (req, res) => {
  const { tab, rowIndex } = req.params;
  const data = req.body;
  
  const sheets = getSheetsClient();
  if (!sheets || !GOOGLE_SHEET_ID) {
    return res.json({ success: true, message: 'Mock save (Sheets API not configured)' });
  }

  try {
    // First, get headers
    const headerResponse = await sheets.spreadsheets.values.get({
      spreadsheetId: GOOGLE_SHEET_ID,
      range: `${tab}!1:1`,
    });
    
    let headers = headerResponse.data.values?.[0];
    if (!headers) {
      return res.status(400).json({ error: 'No headers found in sheet' });
    }

    let newHeadersAdded = false;
    Object.keys(data).forEach(key => {
      if (key !== '_rowIndex' && !headers.includes(key)) {
        headers.push(key);
        newHeadersAdded = true;
      }
    });

    if (newHeadersAdded) {
      await sheets.spreadsheets.values.update({
        spreadsheetId: GOOGLE_SHEET_ID,
        range: `${tab}!A1`,
        valueInputOption: 'USER_ENTERED',
        requestBody: { values: [headers] }
      });
    }

    // Map data to row based on headers
    const row = headers.map(header => data[header] !== undefined ? data[header] : '');

    await sheets.spreadsheets.values.update({
      spreadsheetId: GOOGLE_SHEET_ID,
      range: `${tab}!A${rowIndex}`,
      valueInputOption: 'USER_ENTERED',
      requestBody: { values: [row] }
    });

    res.json({ success: true });
  } catch (error) {
    console.error('Sheets API error:', error);
    res.status(500).json({ error: 'Failed to update data' });
  }
});

app.delete('/api/data/:tab/:rowIndex', authenticate, async (req, res) => {
  const { tab, rowIndex } = req.params;
  
  const sheets = getSheetsClient();
  if (!sheets || !GOOGLE_SHEET_ID) {
    return res.json({ success: true, message: 'Mock save (Sheets API not configured)' });
  }

  try {
    // Get sheetId for the tab
    const sheetInfo = await sheets.spreadsheets.get({
      spreadsheetId: GOOGLE_SHEET_ID,
      ranges: [tab],
    });
    
    const sheetId = sheetInfo.data.sheets?.[0]?.properties?.sheetId;
    if (sheetId === undefined) {
      return res.status(400).json({ error: 'Sheet not found' });
    }

    const rowIdx = parseInt(rowIndex, 10);

    await sheets.spreadsheets.batchUpdate({
      spreadsheetId: GOOGLE_SHEET_ID,
      requestBody: {
        requests: [
          {
            deleteDimension: {
              range: {
                sheetId: sheetId,
                dimension: 'ROWS',
                startIndex: rowIdx - 1,
                endIndex: rowIdx,
              },
            },
          },
        ],
      },
    });

    res.json({ success: true });
  } catch (error) {
    console.error('Sheets API error:', error);
    res.status(500).json({ error: 'Failed to delete data' });
  }
});

// 3. AI Image Processing
app.post('/api/analyze-lab', authenticate, upload.single('image'), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No image provided' });
  }

  if (!GEMINI_API_KEY) {
    return res.status(500).json({ error: 'Gemini API Key not configured' });
  }

  try {
    const ai = new GoogleGenAI({ apiKey: GEMINI_API_KEY });
    
    const prompt = `
      Analyze this lab result image. Extract the data into a JSON array of objects.
      IMPORTANT: This image is a phone screenshot. Please IGNORE all phone UI elements at the top or bottom of the screen (such as time, battery percentage, wifi/cellular signal, navigation bars, app headers, etc.). Focus STRICTLY on extracting the medical laboratory test results from the main content area.
      Each object should represent one test result and have the following keys:
      - testName: The name of the test. Normalize common abbreviations (e.g., "FBS" to "Fasting Blood Sugar", "Chol" to "Cholesterol", "TG" to "Triglycerides", "HDL-C" to "HDL Cholesterol", "LDL-C" to "LDL Cholesterol").
      - value: The numerical value or result.
      - unit: The unit of measurement (if available).
      - referenceRange: The normal or reference range (if available).
      
      Return ONLY the JSON array. Do not include markdown formatting like \`\`\`json.
    `;

    const modelToUse = req.body.model || 'gemini-3-flash-preview';
    const response = await ai.models.generateContent({
      model: modelToUse,
      contents: {
        parts: [
          {
            inlineData: {
              data: req.file.buffer.toString('base64'),
              mimeType: req.file.mimetype,
            }
          },
          {
            text: prompt
          }
        ]
      },
      config: {
        responseMimeType: "application/json",
      }
    });

    const text = response.text;
    if (!text) {
      throw new Error('No text returned from Gemini');
    }

    const parsedData = JSON.parse(text);
    
    // Log usage (simplified, in a real app we'd track tokens)
    const sheets = getSheetsClient();
    if (sheets && GOOGLE_SHEET_ID) {
      try {
        await sheets.spreadsheets.values.append({
          spreadsheetId: GOOGLE_SHEET_ID,
          range: 'UsageLogs!A:A',
          valueInputOption: 'USER_ENTERED',
          requestBody: { 
            values: [[getThaiTimestamp(), (req as any).user.email, 'analyze-lab', 1]] 
          }
        });
      } catch (e) {
        console.error('Failed to log usage', e);
      }
    }

    res.json(parsedData);
  } catch (error) {
    console.error('Gemini API error:', error);
    res.status(500).json({ error: 'Failed to analyze image' });
  }
});

// 4. AI Image Processing for Medications
app.post('/api/analyze-medication', authenticate, upload.single('image'), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No image provided' });
  }

  if (!GEMINI_API_KEY) {
    return res.status(500).json({ error: 'Gemini API Key not configured' });
  }

  try {
    const ai = new GoogleGenAI({ apiKey: GEMINI_API_KEY });
    
    const prompt = `
      Analyze this medication label or prescription image. Extract the data into a JSON array of objects.
      IMPORTANT: This image might be a phone screenshot. Please IGNORE all phone UI elements at the top or bottom of the screen. Focus STRICTLY on extracting the medication details from the main content area.
      If there are multiple medications, return an object for each one.
      Each object should have the following keys:
      - MedicationName: The name of the medication (e.g., "Paracetamol", "Amlodipine").
      - Dosage: The strength or dosage per unit (e.g., "500 mg", "10 mg").
      - Frequency: Instructions on how often to take it (e.g., "1 tablet after breakfast and dinner", "1 tab daily").
      - Purpose: The indication or what it is used for (if available on the label, e.g., "For pain relief", "Blood pressure").
      - StartDate: The date the medication was prescribed or started (if available, format YYYY-MM-DD). If not available, leave empty.
      - EndDate: The date the medication should be stopped (if available, format YYYY-MM-DD). If not available, leave empty.
      - Notes: Any additional notes, warnings, or side effects mentioned on the label.
      
      Return ONLY the JSON array. Do not include markdown formatting like \`\`\`json.
    `;

    const modelToUse = req.body.model || 'gemini-3-flash-preview';
    const response = await ai.models.generateContent({
      model: modelToUse,
      contents: {
        parts: [
          {
            inlineData: {
              data: req.file.buffer.toString('base64'),
              mimeType: req.file.mimetype,
            }
          },
          {
            text: prompt
          }
        ]
      },
      config: {
        responseMimeType: "application/json",
      }
    });

    const text = response.text;
    if (!text) {
      throw new Error('No text returned from Gemini');
    }

    const parsedData = JSON.parse(text);
    
    // Log usage
    const sheets = getSheetsClient();
    if (sheets && GOOGLE_SHEET_ID) {
      try {
        await sheets.spreadsheets.values.append({
          spreadsheetId: GOOGLE_SHEET_ID,
          range: 'UsageLogs!A:A',
          valueInputOption: 'USER_ENTERED',
          requestBody: { 
            values: [[getThaiTimestamp(), (req as any).user.email, 'analyze-medication', 1]] 
          }
        });
      } catch (e) {
        console.error('Failed to log usage', e);
      }
    }

    // Ensure it's an array
    const dataArray = Array.isArray(parsedData) ? parsedData : [parsedData];
    res.json(dataArray);
  } catch (error) {
    console.error('Gemini API error:', error);
    res.status(500).json({ error: 'Failed to analyze medication image' });
  }
});

// 4.5 AI Image Processing for Health Events
app.post('/api/analyze-event', authenticate, upload.single('image'), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No image provided' });
  }

  if (!GEMINI_API_KEY) {
    return res.status(500).json({ error: 'Gemini API Key not configured' });
  }

  try {
    const ai = new GoogleGenAI({ apiKey: GEMINI_API_KEY });
    
    const prompt = `
      Analyze this medical document, doctor's note, or imaging result (e.g., MRI, X-Ray, Ultrasound). Extract the data into a JSON object.
      IMPORTANT: This image might be a phone screenshot. Please IGNORE all phone UI elements at the top or bottom of the screen. Focus STRICTLY on extracting the medical event details from the main content area.
      The object should have the following keys:
      - Date: The date of the test or event (format YYYY-MM-DD). If not found, leave empty.
      - Type: Categorize the event into one of these exact strings: "Illness", "Symptom", "Diagnosis", "Surgery/Procedure", "Other". (For imaging like MRI/X-Ray, use "Diagnosis" or "Other").
      - Description: A short, concise title for the event (e.g., "MRI Brain Results", "Chest X-Ray", "Doctor's Appointment").
      - Notes: A detailed summary or translation of the findings, impressions, or doctor's notes. Translate complex medical terms into easy-to-understand Thai if possible.
      
      Return ONLY the JSON object. Do not include markdown formatting like \`\`\`json.
    `;

    const modelToUse = req.body.model || 'gemini-3-flash-preview';
    const response = await ai.models.generateContent({
      model: modelToUse,
      contents: {
        parts: [
          {
            inlineData: {
              data: req.file.buffer.toString('base64'),
              mimeType: req.file.mimetype,
            }
          },
          {
            text: prompt
          }
        ]
      },
      config: {
        responseMimeType: "application/json",
      }
    });

    const text = response.text;
    if (!text) {
      throw new Error('No text returned from Gemini');
    }

    const parsedData = JSON.parse(text);
    
    // Log usage
    const sheets = getSheetsClient();
    if (sheets && GOOGLE_SHEET_ID) {
      try {
        await sheets.spreadsheets.values.append({
          spreadsheetId: GOOGLE_SHEET_ID,
          range: 'UsageLogs!A:A',
          valueInputOption: 'USER_ENTERED',
          requestBody: { 
            values: [[getThaiTimestamp(), (req as any).user.email, 'analyze-event', 1]] 
          }
        });
      } catch (e) {
        console.error('Failed to log usage', e);
      }
    }

    res.json(parsedData);
  } catch (error) {
    console.error('Gemini API error:', error);
    res.status(500).json({ error: 'Failed to analyze event image' });
  }
});

// 5. AI Chat Assistant
app.get('/api/chat/history', authenticate, async (req, res) => {
  try {
    const sheets = getSheetsClient();
    if (!sheets || !GOOGLE_SHEET_ID) return res.json({ messages: [] });
    
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: GOOGLE_SHEET_ID,
      range: 'ChatHistory!A:C' // Only need 3 columns now: Timestamp, Role, Text
    });
    
    const rows = response.data.values || [];
    const { startDate, endDate, search } = req.query;
    
    const filteredRows = rows.filter(row => {
      if (!row[0] || !row[1] || !row[2]) return false;
      
      let matchesDate = true;
      if (startDate || endDate) {
        const rowDate = new Date(row[0]);
        if (!isNaN(rowDate.getTime())) {
          if (startDate) {
            const start = new Date(startDate as string);
            start.setHours(0, 0, 0, 0);
            if (rowDate < start) matchesDate = false;
          }
          if (endDate) {
            const end = new Date(endDate as string);
            end.setHours(23, 59, 59, 999);
            if (rowDate > end) matchesDate = false;
          }
        }
      }
      
      let matchesSearch = true;
      if (search) {
        const searchTerm = (search as string).toLowerCase();
        if (!row[2].toLowerCase().includes(searchTerm)) {
          matchesSearch = false;
        }
      }
      
      return matchesDate && matchesSearch;
    });
    
    const userHistory = filteredRows
      .map(row => ({
        timestamp: row[0],
        role: row[1], // Role is now in column B
        text: row[2]  // Text is now in column C
      }));
      
    res.json({ messages: userHistory });
  } catch (error) {
    console.error('Failed to fetch chat history', error);
    res.status(500).json({ error: 'Failed to fetch chat history' });
  }
});

app.post('/api/chat', authenticate, async (req, res) => {
  const { messages, model } = req.body;

  if (!GEMINI_API_KEY) {
    return res.status(500).json({ error: 'Gemini API Key not configured' });
  }

  try {
    const sheets = getSheetsClient();
    let healthContext = "No health data available.";
    
    if (sheets && GOOGLE_SHEET_ID) {
      try {
        const [vitalsRes, labsRes, medsRes, eventsRes, profileRes] = await Promise.all([
          sheets.spreadsheets.values.get({ spreadsheetId: GOOGLE_SHEET_ID, range: 'Vitals!A:Z' }).catch(() => null),
          sheets.spreadsheets.values.get({ spreadsheetId: GOOGLE_SHEET_ID, range: 'LabResults!A:Z' }).catch(() => null),
          sheets.spreadsheets.values.get({ spreadsheetId: GOOGLE_SHEET_ID, range: 'Medications!A:Z' }).catch(() => null),
          sheets.spreadsheets.values.get({ spreadsheetId: GOOGLE_SHEET_ID, range: 'HealthEvents!A:Z' }).catch(() => null),
          sheets.spreadsheets.values.get({ spreadsheetId: GOOGLE_SHEET_ID, range: 'Profile!A:Z' }).catch(() => null)
        ]);

        const formatData = (response: any) => {
          const rows = response?.data?.values || [];
          if (rows.length <= 1) return "None";
          const headers = rows[0];
          const data = rows.slice(1).map((row: any) => {
            const obj: any = {};
            headers.forEach((h: string, i: number) => obj[h] = row[i] || '');
            return obj;
          });
          return JSON.stringify(data);
        };

        const getLatestProfile = (response: any) => {
          const rows = response?.data?.values || [];
          if (rows.length <= 1) return "None";
          const headers = rows[0];
          const latestRow = rows[rows.length - 1];
          const obj: any = {};
          headers.forEach((h: string, i: number) => obj[h] = latestRow[i] || '');
          return JSON.stringify(obj);
        };

        healthContext = `
          Patient's Personal Profile: ${getLatestProfile(profileRes)}
          
          Patient's Current Health Data:
          - Vitals: ${formatData(vitalsRes)}
          - Lab Results: ${formatData(labsRes)}
          - Medications: ${formatData(medsRes)}
          - Medical History & Events: ${formatData(eventsRes)}
        `;
      } catch (e) {
        console.error("Error fetching context data", e);
      }
    }

    const ai = new GoogleGenAI({ apiKey: GEMINI_API_KEY });
    
    const systemInstruction = `
      คุณคือแพทย์ผู้เชี่ยวชาญ (Expert Medical Doctor) และเภสัชกรคลินิก (Clinical Pharmacist)
      หน้าที่ของคุณคือให้คำปรึกษา แนะนำ และวิเคราะห์ข้อมูลสุขภาพของผู้ป่วย
      
      ข้อมูลสุขภาพปัจจุบันของผู้ป่วย (ดึงมาจากระบบติดตามสุขภาพ):
      ${healthContext}

      คำแนะนำในการตอบ:
      1. วิเคราะห์ผลตรวจเลือด (Lab Results) ล่าสุด อธิบายความหมายของค่าต่างๆ ว่าปกติหรือไม่ และมีแนวโน้มอย่างไร
      2. ประเมินสุขภาพโดยรวมจากค่าความดันโลหิต น้ำตาลในเลือด (Vitals)
      3. ให้คำแนะนำเรื่องการใช้ยา ผลข้างเคียง ข้อควรระวัง หรือปฏิกิริยาระหว่างยา (Drug Interactions) จากรายการยาที่ผู้ป่วยใช้อยู่
      4. ตอบคำถามด้วยความเห็นอกเห็นใจ เป็นมืออาชีพ และใช้ภาษาที่เข้าใจง่าย (ภาษาไทย)
      5. **คำเตือนสำคัญ:** ต้องระบุเสมอว่าคุณเป็นเพียง AI ผู้ช่วยทางการแพทย์ และผู้ป่วยควรปรึกษาแพทย์เจ้าของไข้เพื่อการวินิจฉัยและการรักษาที่ถูกต้อง
    `;

    const modelToUse = model || 'gemini-3.1-pro-preview';
    const response = await ai.models.generateContent({
      model: modelToUse,
      contents: messages,
      config: {
        systemInstruction: systemInstruction,
      }
    });

    const timestamp = getThaiTimestamp();

    // Log usage and save chat history
    if (sheets && GOOGLE_SHEET_ID) {
      try {
        const userEmail = (req as any).user.email;
        
        // Log usage
        await sheets.spreadsheets.values.append({
          spreadsheetId: GOOGLE_SHEET_ID,
          range: 'UsageLogs!A:A',
          valueInputOption: 'USER_ENTERED',
          requestBody: { 
            values: [[timestamp, userEmail, 'chat-assistant', 1]] 
          }
        });

        // Save chat history
        const userMsg = messages[messages.length - 1]?.parts[0]?.text || '';
        if (userMsg) {
          await sheets.spreadsheets.values.append({
            spreadsheetId: GOOGLE_SHEET_ID,
            range: 'ChatHistory!A:C',
            valueInputOption: 'USER_ENTERED',
            requestBody: { 
              values: [
                [timestamp, 'user', userMsg],
                [timestamp, 'model', response.text]
              ] 
            }
          });
        }
      } catch (e) {
        console.error('Failed to log usage or save chat history', e);
      }
    }

    res.json({ text: response.text, timestamp });
  } catch (error) {
    console.error('Chat API error:', error);
    res.status(500).json({ error: 'Failed to generate response' });
  }
});

// --- Vite Integration ---
async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static('dist'));
    
    // Fallback for SPA routing in production
    app.get('*', (req, res) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
