import express from "express";


const app = express();

// Read JSON bodies sent to your API
app.use(express.json());

// A simple route to check the server
app.get("/", (_req, res) => {
  res.json({
    success: true,
    message: "SNK Alapon backend is running",
  });
});

export default app;