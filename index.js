const { Builder, By, Key, until } = require("selenium-webdriver");
const { MongoClient } = require("mongodb");
const express = require("express");
const bodyParser = require("body-parser");
const { v4: uuidv4 } = require("uuid");

// MongoDB configuration
const mongoUri = "mongodb://localhost:27017";
const dbName = "twitter_trends"; 
const collectionName = "scrap_twittertrend";

// Function to fetch Twitter trends
async function fetchTwitterTrends() {
  let driver = null;
  let trends = [];
  const uniqueId = uuidv4();
  const startTime = new Date();
  let ipAddress = null;

  try {
    driver = await new Builder().forBrowser("chrome").build();

    await driver.get("https://x.com/i/flow/login");


    await driver.wait(until.elementLocated(By.css('input[name="text"]')), 5000);

    const usernameField = await driver.findElement(
      By.css('input[name="text"]')
    );
    await usernameField.sendKeys(""); //Enter Your Username here

    
    await driver.sleep(3000);
    
    await usernameField.sendKeys(Key.RETURN);

    // Check if the email/phone number field appears
    try {
      await driver.wait(
        until.elementLocated(By.css('input[name="text"]')),
        3000
      );
      const emailOrPhoneField = await driver.findElement(
        By.css('input[name="text"]')
      );
      await driver.sleep(2000);
      await emailOrPhoneField.sendKeys(""); // Replace with actual email/phone
      console.log("Entered email or phone.");

      await driver.sleep(3000);

      await emailOrPhoneField.sendKeys(Key.RETURN);
    } catch (err) {
      console.log("No email or phone field detected.");
    }

    await driver.wait(
      until.elementLocated(By.css('input[name="password"]')),
      5000
    );

    const passwordField = await driver.findElement(
      By.css('input[name="password"]')
    );
    await passwordField.sendKeys("", Key.RETURN);// Enter Your twitter(x) account password

    await driver.sleep(5000);

    console.log("Fetching trending details...");

    const trendElements = await driver.findElements(
      By.css('[data-testid="trend"]')
    );
    for (let i = 0; i < Math.min(trendElements.length, 5); i++) {
      try {
        const trendText = await trendElements[i].getText();
        trends.push(trendText);
      } catch (err) {
        console.error(`Failed to fetch trend ${i + 1}:`, err);
      }
    }

    // Fetch IP Address using jsonip.com
    try {
      ipAddress = await driver.executeScript(`
      return fetch('https://jsonip.com/')
          .then(response => response.json())
          .then(data => data.ip)
          .catch(err => null);
  `);

      if (ipAddress) {
        console.log("IP Address fetched:", ipAddress);
      } else {
        console.log("No IP address fetched.");
      }
    } catch (err) {
      console.error("Error fetching IP address:", err);
    }


    const client = new MongoClient(mongoUri);
    await client.connect();
    const db = client.db(dbName);
    const collection = db.collection(collectionName);

    await collection.insertOne({
      uniqueId,
      trends,
      endTime: new Date(),
      ipAddress,
    });

    console.log("Trends fetched and stored successfully.");
    await client.close();
  } catch (error) {
    console.error("Error fetching trends:", error);
  } finally {
    if (driver) await driver.quit();
  }

  return { uniqueId, trends, endTime: new Date(), ipAddress };
}

const app = express();
app.use(bodyParser.json());

app.get("/", (req, res) => {
  res.send(`
    <html>
      <body>
        <h1>Twitter Trends</h1>
        <button onclick="fetchTrends()">Fetch Twitter Trends</button>
        <div id="trends-container" style="margin-top: 20px;">
          <h2>Trends will appear here:</h2>
          <ul id="trends-list"></ul>
        </div>
        <script>
          async function fetchTrends() {
            const response = await fetch('/run-script');
            const data = await response.json();

            const trendsList = document.getElementById('trends-list');
            trendsList.innerHTML = ''; // Clear previous trends

            if (data.trends && data.trends.length > 0) {
              data.trends.forEach((trend, index) => {
                const listItem = document.createElement('li');
                listItem.textContent = \`\${index + 1}. \${trend}\`;
                trendsList.appendChild(listItem);
              });
            } else {
              trendsList.innerHTML = '<li>No trends found.</li>';
            }
          }
        </script>
      </body>
    </html>
  `);
});


app.get("/run-script", async (req, res) => {
  const result = await fetchTwitterTrends();
  res.json(result);
});


const PORT = 3000;
app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
