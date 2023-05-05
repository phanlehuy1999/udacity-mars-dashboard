require("dotenv").config();
const express = require("express");
const bodyParser = require("body-parser");
const fetch = require("node-fetch");
const path = require("path");

const app = express();
const port = 3000;

app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());

app.use("/", express.static(path.join(__dirname, "../public")));

app.get("/apod", async (req, res) => {
  try {
    const image = await fetch(
      `https://api.nasa.gov/planetary/apod?api_key=${process.env.API_KEY}`
    ).then((res) => res.json());
    res.send({ image });
  } catch (err) {
    console.log("error:", err);
  }
});

app.get("/manifests/:rover_name", async (req, res) => {
  try {
    const roverName = req.params.rover_name;
    const photoManifestUrl = `https://api.nasa.gov/mars-photos/api/v1/manifests/${roverName}?api_key=${process.env.API_KEY}`;
    const photoManifest = await fetch(photoManifestUrl).then((res) =>
      res.json()
    );
    res.send(photoManifest);
  } catch (err) {
    console.log("error:", err);
  }
});

app.get("/rovers/:rover_name/photos", async (req, res) => {
  try {
    const roverName = req.params.rover_name;
    const queryString = createQueryString(req.query);
    const roverPhotosUrl = `https://api.nasa.gov/mars-photos/api/v1/rovers/${roverName}/photos?api_key=${process.env.API_KEY}${queryString}`;
    const roverPhotos = await fetch(roverPhotosUrl).then((res) => res.json());
    const roverCamerasUrl = `https://api.nasa.gov/mars-photos/api/v1/rovers/${roverName}?api_key=${process.env.API_KEY}`;
    const { rover } = await fetch(roverCamerasUrl).then((res) => res.json());
    const { cameras } = rover;

    const roverPhotosPage = Object.assign(roverPhotos, {
      page: Number.parseInt(req.query.page),
      cameras,
    });
    res.send(roverPhotosPage);
  } catch (err) {
    console.log("error:", err);
  }
});

// Utils
const createQueryString = (params) => {
  return Object.entries(params).reduce(
    (pre, [key, value]) => `${pre}&${key}=${value}`,
    ""
  );
};

app.listen(port, () => console.log(`Example app listening on port ${port}!`));
