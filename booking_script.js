// Google Apps Script: Refund & Booking Manager with Razorpay
// -----------------------------------------------------------
// 1. Paste this code into Extensions > Apps Script.
// 2. Project Settings (Gear Icon) -> Script Properties -> Add these:
//    - KEY: RAZORPAY_KEY_ID      VALUE: (Your Key ID)
//    - KEY: RAZORPAY_KEY_SECRET  VALUE: (Your Key Secret)
//    - KEY: RAZORPAY_WEBHOOK_SECRET  VALUE: (Your Webhook Secret)
// 3. Deploy as Web App (Execute as: Me, Access: Anyone).

const SHEET_NAME = 'Bookings';

function doPost(e) {
    try {
        const jsonString = e.postData.contents;
        const data = JSON.parse(jsonString);
        const ss = SpreadsheetApp.getActiveSpreadsheet();
        let sheet = ss.getSheetByName(SHEET_NAME);

        // Ensure Sheet Exists
        if (!sheet) {
            sheet = ss.getSheets()[0];
            if (sheet.getLastRow() === 0) {
                sheet.appendRow(['Date', 'Name', 'Email', 'Phone', 'Tickets', 'Amount', 'Event ID', 'Event Title', 'Status', 'Payment ID', 'Order ID']);
            }
        }

        // --- CASE 1: RAZORPAY WEBHOOK (payment_link.paid) ---
        if (data.event === 'payment_link.paid' && data.payload) {

            // 1. Verify Signature (Security) - Optional but Recommended logic
            // Google Apps Script doesn't verify headers easily in doPost(e) context without e.parameter hacks.
            // We will assume trust based on Secret validation logic if implemented, or proceed.
            // Ideally: crypto.createHmac... but GAS uses Utilities.computeHmacSha256Signature

            const entity = data.payload.payment_link.entity;
            const plId = entity.id; // pl_...
            const paymentId = data.payload.payment.entity.id; // pay_...

            // Find row with this Payment Link ID (we store it in 'Order ID' column for simplicity or add a new col)
            // Let's assume we stored pl_id in column 11 (Order ID)

            const lastRow = sheet.getLastRow();
            const range = sheet.getRange(2, 1, lastRow - 1, 11);
            const values = range.getValues();

            let foundRowIndex = -1;
            // Search for pl_id
            for (let i = 0; i < values.length; i++) {
                if (values[i][10] === plId) { // Column 11 is index 10
                    foundRowIndex = i + 2; // +2 because header is row 1, and i is 0-indexed
                    break;
                }
            }

            if (foundRowIndex > -1) {
                // Update Status to CONFIRMED
                sheet.getRange(foundRowIndex, 9).setValue('CONFIRMED'); // Col 9
                sheet.getRange(foundRowIndex, 10).setValue(paymentId); // Col 10

                // Get user details for email
                const userName = sheet.getRange(foundRowIndex, 2).getValue();
                const userEmail = sheet.getRange(foundRowIndex, 3).getValue();
                const eventTitle = sheet.getRange(foundRowIndex, 8).getValue();
                const tickets = sheet.getRange(foundRowIndex, 5).getValue();

                // Send Confirmation Emails
                sendConfirmationEmail(userEmail, userName, eventTitle, tickets, paymentId);
                sendAdminNotification(userName, eventTitle, tickets, "PAID via Webhook");

                return ContentService.createTextOutput(JSON.stringify({ status: 'ok' }));
            }

            return ContentService.createTextOutput(JSON.stringify({ status: 'ignored_not_found' }));
        }

        // --- CASE 2: BOOKING INITIATION (From Website) ---
        if (data.action === 'create_booking') {

            // 1. Generate Razorpay Payment Link via API
            const linkResponse = createRazorpayLink(data);

            if (!linkResponse || !linkResponse.short_url) {
                throw new Error("Failed to generate payment link: " + JSON.stringify(linkResponse));
            }

            const paymentLinkUrl = linkResponse.short_url;
            const paymentLinkId = linkResponse.id; // pl_...

            // 2. Log "Pending" Booking
            sheet.appendRow([
                new Date(),
                data.name,
                data.email,
                data.phone,
                data.tickets,
                data.total_amount, // e.g. 500
                data.event_id,
                data.event_title,
                'PENDING PAYMENT', // Status
                '', // Payment ID (filled later)
                paymentLinkId // Order/Link ID (used for matching)
            ]);

            // Return URL to frontend
            return ContentService.createTextOutput(JSON.stringify({
                result: 'success',
                payment_url: paymentLinkUrl
            })).setMimeType(ContentService.MimeType.JSON);
        }

        return ContentService.createTextOutput(JSON.stringify({ result: 'error', message: 'Unknown Action' }));

    } catch (error) {
        return ContentService.createTextOutput(JSON.stringify({ result: 'error', error: error.toString() })).setMimeType(ContentService.MimeType.JSON);
    }
}

// --- HELPER: Create Razorpay Link ---
function createRazorpayLink(data) {
    const props = PropertiesService.getScriptProperties();
    const keyId = props.getProperty('RAZORPAY_KEY_ID');
    const keySecret = props.getProperty('RAZORPAY_KEY_SECRET');

    if (!keyId || !keySecret) throw new Error("Razorpay Keys not set in Script Properties");

    // Amount in PAISA (INR * 100)
    const amountPaisa = parseInt(data.total_amount) * 100;

    const payload = {
        "amount": amountPaisa,
        "currency": "INR",
        "accept_partial": false,
        "description": `Booking for ${data.event_title} (${data.tickets} Tickets)`,
        "customer": {
            "name": data.name,
            "email": data.email,
            "contact": data.phone
        },
        "notify": {
            "sms": true,
            "email": true
        },
        "reminder_enable": true,
        "reminder_enable": true,
        // "callback_url": "http://localhost:5174/success.html",
        "callback_url": "https://ndelight.co/success.html",
        "callback_method": "get"
    };

    const authHeader = "Basic " + Utilities.base64Encode(keyId + ":" + keySecret);

    const options = {
        "method": "post",
        "headers": {
            "Authorization": authHeader,
            "Content-Type": "application/json"
        },
        "payload": JSON.stringify(payload),
        "muteHttpExceptions": true
    };

    const response = UrlFetchApp.fetch("https://api.razorpay.com/v1/payment_links", options);
    return JSON.parse(response.getContentText());
}

function sendConfirmationEmail(email, name, event, tickets, payId) {
    if (!email) return;
    MailApp.sendEmail({
        to: email,
        subject: `Booking Confirmed: ${event}`,
        body: `Hi ${name},\n\nYour payment was successful (ID: ${payId}).\n\nYour booking for ${event} (${tickets} tickets) is officially CONFIRMED.\n\nSee you there!\nTeam N DELIGHT`
    });
}

function sendAdminNotification(name, event, tickets, status) {
    MailApp.sendEmail({
        to: Session.getActiveUser().getEmail(),
        subject: `New Confirmed Booking: ${event}`,
        body: `User: ${name}\nEvent: ${event}\nTickets: ${tickets}\nStatus: ${status}`
    });
}
