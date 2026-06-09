/**
 * EDU-CARE Google Apps Script Webhook
 * 
 * Instructions:
 * 1. Open your Google Sheet where you want to store enquiries.
 * 2. Click Extensions > Apps Script.
 * 3. Delete any existing code and paste this code.
 * 4. Click the Save icon (floppy disk).
 * 5. Click Deploy > New deployment.
 * 6. Choose Select type > Web app (gear icon).
 * 7. Set settings:
 *    - Description: EDU-CARE Enquiry Webhook
 *    - Execute as: Me (your-email@gmail.com)
 *    - Who has access: Anyone (This is critical so the website can send POST requests without logging in)
 * 8. Click Deploy. Authorize access if prompted.
 * 9. Copy the "Web app URL" (ends in /exec).
 * 10. Open `/Users/ryan./Desktop/educare/enquiry-submit.js` and paste the URL in the `GOOGLE_SHEETS_WEBHOOK_URL` constant.
 */

function doPost(e) {
  try {
    // Parse the incoming JSON payload
    var data = JSON.parse(e.postData.contents);
    
    // Open the active spreadsheet
    var sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
    
    // If the sheet is empty, add headers first
    if (sheet.getLastRow() === 0) {
      sheet.appendRow([
        "Timestamp",
        "Name",
        "Phone",
        "Email",
        "Course",
        "Message",
        "Source",
        "Status"
      ]);
      // Format headers: Bold and freeze first row
      sheet.getRange("A1:H1").setFontWeight("bold");
      sheet.setFrozenRows(1);
    }
    
    // Format timestamp nicely
    var timestamp = data.createdAt ? new Date(data.createdAt) : new Date();
    
    // Append the row
    sheet.appendRow([
      timestamp,
      data.name || "",
      "'" + (data.phone || ""), // Prefix with ' to keep phone number as text in sheet (prevents losing leading zeros)
      data.email || "",
      data.course || "",
      data.message || "",
      data.source || "",
      data.status || "new"
    ]);
    
    // Return success response
    return ContentService.createTextOutput(JSON.stringify({
      status: "success",
      message: "Enquiry appended successfully"
    })).setMimeType(ContentService.MimeType.JSON);
    
  } catch (error) {
    // Log error and return failure response
    console.error("Webhook Error: " + error.toString());
    return ContentService.createTextOutput(JSON.stringify({
      status: "error",
      message: error.toString()
    })).setMimeType(ContentService.MimeType.JSON);
  }
}

// Simple GET test handler to verify setup
function doGet() {
  return ContentService.createTextOutput("EDU-CARE Webhook is active! Send a POST request to submit enquiries.");
}
