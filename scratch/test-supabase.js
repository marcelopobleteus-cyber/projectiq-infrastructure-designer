const url = "https://fkokqccxhljbuqyutkxi.supabase.co";
const key = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZrb2txY2N4aGxqYnVxeXV0a3hpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODAyMTU5MDQsImV4cCI6MjA5NTc5MTkwNH0.DkxYZftrzmc7xUxMz_jkdPU6LnJcNNvzEoxVz0yPpTM";

async function testConnection() {
  console.log("Testing Supabase connection...");
  try {
    const res = await fetch(`${url}/rest/v1/projects?select=*`, {
      headers: {
        "apikey": key,
        "Authorization": `Bearer ${key}`
      }
    });
    console.log("Response status:", res.status);
    console.log("Response statusText:", res.statusText);
    const data = await res.json();
    console.log("Response data:", data);
    console.log("Connection successful!");
  } catch (error) {
    console.error("Connection failed:", error);
  }
}

testConnection();
