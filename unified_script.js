// Google Apps Script: Unified Gatekeeper (Bookings + Contact + Secure Data)
// --------------------------------------------------------------------------
// 1. Paste this into your Google Apps Script editor.
// 2. Project Settings > Script Properties > Add:
//    - RAZORPAY_KEY_ID
//    - RAZORPAY_KEY_SECRET
//    - RAZORPAY_WEBHOOK_SECRET
// 3. Deploy as Web App (Execute as: Me, Access: Anyone)

const SHEET_ID = '1_7lOYKJZ_cmJeMn3hZNggNmk58Wu2SdYjVtlQgG-7lQ'; // Your Master Sheet ID
const ADMIN_EMAIL = 'ndelight.co@gmail.com';

// RUN THIS FUNCTION IN THE EDITOR TO AUTHORIZE THE SCRIPT
function debugAuth() {
    console.log("Testing Permissions...");
    const ss = SpreadsheetApp.openById(SHEET_ID);
    console.log("Spreadsheet Access: OK");
    console.log("Your Email: " + Session.getEffectiveUser().getEmail());
}

function doPost(e) {
    try {
        const jsonString = e.postData.contents;
        const data = JSON.parse(jsonString);

        // --- Action: Contact Form ---
        if (data.name && data.email && data.message && !data.action) {
            return handleContactForm(data);
        }

        // --- Action: Create Booking ---
        else if (data.action === 'create_booking') {
            return handleBooking(data);
        }

        // --- Action: Razorpay Webhook ---
        else if (data.event === 'payment_link.paid') {
            return handleWebhook(data);
        }

        return response({ result: 'error', message: 'Unknown Action' });

    } catch (err) {
        return response({ result: 'error', error: err.toString() });
    }
}

function doGet(e) {
    try {
        const action = e.parameter.action;

        if (action === 'get_events') return getData('upcoming_events');
        if (action === 'get_portfolio') return getData('featured_events');

        // SPECIAL SECURE HANDLER FOR INFLUENCERS
        if (action === 'get_influencers') return getInfluencersSecurely();

        return ContentService.createTextOutput("NDelight API Active");
    } catch (err) {
        // Return the error as text so we can see it in the browser
        return ContentService.createTextOutput("SCRIPT ERROR: " + err.toString());
    }
}


// --- HANDLERS ---

function handleContactForm(data) {
    MailApp.sendEmail({
        to: ADMIN_EMAIL,
        subject: `New Message: ${data.name}`,
        body: `Name: ${data.name}\nEmail: ${data.email}\nMessage: ${data.message}`,
        replyTo: data.email
    });
    return response({ result: 'success' });
}

function handleBooking(data) {
    const link = createRazorpayLink(data); // Using helper below

    const ss = SpreadsheetApp.openById(SHEET_ID);
    const sheet = ss.getSheetByName('Bookings');

    sheet.appendRow([
        new Date(),
        data.name, data.email, data.phone, data.tickets, data.total_amount,
        data.event_id, data.event_title, 'PENDING', '', link.id
    ]);

    return response({ result: 'success', payment_url: link.short_url });
}

function handleWebhook(data) {
    // Same logic as before to mark Paid
    const plId = data.payload.payment_link.entity.id;
    const payId = data.payload.payment.entity.id;

    const ss = SpreadsheetApp.openById(SHEET_ID);
    const sheet = ss.getSheetByName('Bookings');
    const values = sheet.getDataRange().getValues();

    for (let i = 0; i < values.length; i++) {
        if (values[i][10] === plId) { // Order ID col
            sheet.getRange(i + 1, 9).setValue('CONFIRMED'); // Status
            sheet.getRange(i + 1, 10).setValue(payId);      // Pay ID

            // Send Email logic here...
            break;
        }
    }
    return response({ status: 'ok' });
}

// --- SECURE DATA FETCHING ---

function getData(sheetName) {
    const ss = SpreadsheetApp.openById(SHEET_ID);
    const sheet = ss.getSheetByName(sheetName);
    const rows = sheet.getDataRange().getValues();
    const headers = rows.shift();

    const json = rows.map(row => {
        let obj = {};
        headers.forEach((h, i) => obj[h] = row[i]);
        return obj;
    });

    return response(json);
}

function getInfluencersSecurely() {
    const ss = SpreadsheetApp.openById(SHEET_ID);
    const sheet = ss.getSheetByName('influencers');
    const rows = sheet.getDataRange().getValues();
    const headers = rows[0];

    // We intentionally IGNORE Phone/Email columns
    const nameIdx = headers.findIndex(h => h.toLowerCase().includes('name'));
    const imgIdx = headers.findIndex(h => h.toLowerCase().includes('image') || h.toLowerCase().includes('profile'));
    const instaIdx = headers.findIndex(h => h.toLowerCase().includes('insta'));
    const ytIdx = headers.findIndex(h => h.toLowerCase().includes('youtube') || h.toLowerCase().includes('yt') || h.toLowerCase().includes('yotuube'));
    const fbIdx = headers.findIndex(h => h.toLowerCase().includes('facebook') || h.toLowerCase().includes('fb'));

    const publicData = [];

    // Start from 1 to skip header
    for (let i = 1; i < rows.length; i++) {
        publicData.push({
            Name: rows[i][nameIdx] || 'Influencer',
            image: rows[i][imgIdx] || '',
            insta: rows[i][instaIdx] || '',
            youtube: rows[i][ytIdx] || '',
            facebook: rows[i][fbIdx] || ''
        });
    }

    return response(publicData);
}

// --- HELPERS ---

function response(data) {
    return ContentService.createTextOutput(JSON.stringify(data))
        .setMimeType(ContentService.MimeType.JSON);
}

function createRazorpayLink(data) {
    const props = PropertiesService.getScriptProperties();
    const keyId = props.getProperty('RAZORPAY_KEY_ID');
    const keySecret = props.getProperty('RAZORPAY_KEY_SECRET');

    const payload = {
        "amount": data.total_amount * 100,
        "currency": "INR",
        "description": `Booking: ${data.event_title}`,
        "customer": { "name": data.name, "email": data.email, "contact": data.phone },
        "notify": { "sms": true, "email": true },
        "callback_url": "https://ndelight.co/success.html",
        "callback_method": "get"
    };

    const auth = "Basic " + Utilities.base64Encode(keyId + ":" + keySecret);
    const res = UrlFetchApp.fetch("https://api.razorpay.com/v1/payment_links", {
        "method": "post",
        "headers": { "Authorization": auth, "Content-Type": "application/json" },
        "payload": JSON.stringify(payload)
    });
    return JSON.parse(res.getContentText());
}
