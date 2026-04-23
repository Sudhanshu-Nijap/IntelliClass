const webhookUrl = "https://sudhanshunnn.app.n8n.cloud/webhook/test";

const payload = {
  teacherName: "Nijap Sau",
  teacherEmail: "nijap.sau72@gmail.com",
  quizTitle: "N8N Integration Test Quiz",
  quizLink: "http://localhost:5173/student",
  studentEmails: ["sudhanshun10b3720@gmail.com"],
};

console.log("Sending test payload to n8n webhook...");
console.log(JSON.stringify(payload, null, 2));

fetch(webhookUrl, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify(payload)
})
.then(async (response) => {
  console.log(`Response Status: ${response.status} ${response.statusText}`);
  const text = await response.text();
  console.log(`Response Body: ${text}`);
})
.catch(err => {
  console.error("Failed to send webhook:", err);
});
