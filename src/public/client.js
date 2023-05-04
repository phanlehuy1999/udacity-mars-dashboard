let store = {
  appRouter: {
    currentRoute: "/",
    routeParams: { currentPage: 1, filterTimeBy: "sol" },
    routes: {
      ROVER_INFO: { path: "/rover" },
    },
  },
  apod: "",
  rovers: ["Curiosity", "Opportunity", "Spirit"],
  photoManifest: "",
  roverPhotos: "",
  photoSlideShow: "",
};

// add our markup to the page
const root = document.getElementById("root");

const updateStore = (store, newState) => {
  store = Object.assign(store, newState);
  render(root, store);
};

const render = async (root, state) => {
  root.innerHTML = App(state);
};

// create content
const App = (state) => {
  let { appRouter, apod, rovers, photoManifest, roverPhotos, photoSlideShow } =
    state;

  return `
        <header>
          ${RoverSelectionBar(rovers, appRouter)}
        </header>
        <main>
          ${MainContainer(
            appRouter,
            apod,
            photoManifest,
            roverPhotos,
            photoSlideShow
          )}
        </main>
        <footer></footer>
    `;
};

// listening for load event because page should load before any JS is called
window.addEventListener("load", () => {
  render(root, store);
});

// ------------------------------------------------------  COMPONENTS

// Example of a pure function that renders infomation requested from the backend
const ImageOfTheDay = (apod) => {
  // If image does not already exist, or it is not from today -- request it again
  if (!apod) {
    getImageOfTheDay(store);
    return Loading();
  } else {
    const today = new Date().toISOString().slice(0, 10);
    const photodate = new Date(apod.image.date).toISOString().slice(0, 10);
    if (today !== photodate) {
      getImageOfTheDay(store);
    }

    // check if the photo of the day is actually type video!
    if (apod.media_type === "video") {
      return `
            <p>See today's featured video <a href="${apod.url}">here</a></p>
            <p>${apod.title}</p>
            <p>${apod.explanation}</p>
        `;
    } else {
      return `
            <img src="${apod.image.url}" height="350px" width="100%" />
            <p>${apod.image.explanation}</p>
        `;
    }
  }
};

const RoverSelectionBar = (rovers, appRouter) => {
  const { routeParams } = appRouter;
  const { roverName } = routeParams;
  const selectionList = rovers
    .map(
      (rover) =>
        `<li class="${rover.toLowerCase()} ${
          rover.toLowerCase() === roverName ? "active" : ""
        }" onclick="navigateTo('/rover', { roverName: '${rover.toLowerCase()}' })">${rover}</li>`
    )
    .reduce((pre, cur) => pre + cur);
  return `
      <nav class="nav-header">
        <h1>NASA's rovers on Mars</h1>
        <ul class="rover-selection-list">
            ${selectionList}
        </ul>
      </nav>
    `;
};

const MainContainer = (
  appRouter,
  apod,
  photoManifest,
  roverPhotos,
  photoSlideShow
) => {
  const { currentRoute, routes } = appRouter;
  if (currentRoute.startsWith(routes.ROVER_INFO.path)) {
    return `
      <section>
        ${RoverInfo(appRouter, photoManifest, roverPhotos, photoSlideShow)}
      </section>
    `;
  } else {
    return `
      <section>
        ${ImageOfTheDay(apod)}
      </section>
    `;
  }
};

const RoverInfo = (appRouter, photoManifest, roverPhotos, photoSlideShow) => {
  const { routeParams } = appRouter;
  let {
    roverName,
    currentPage,
    filterTimeBy = "sol",
    filterTimeValue,
    filterCamera = "all",
  } = routeParams;
  if (
    !photoManifest ||
    photoManifest.photo_manifest.name.toLowerCase() !== roverName
  ) {
    getRoverManifest(roverName);
    return Loading();
  } else {
    if (!filterTimeValue) {
      filterTimeValue =
        filterTimeBy === "sol"
          ? photoManifest.photo_manifest.max_sol
          : photoManifest.photo_manifest.max_date;
    }

    if (!roverPhotos || roverPhotos.page !== currentPage) {
      let apiParams = { page: currentPage };
      if (filterTimeBy === "sol") {
        apiParams = Object.assign(apiParams, { sol: filterTimeValue });
      } else {
        apiParams = Object.assign(apiParams, { earth_date: filterTimeValue });
      }
      if (filterCamera !== "all") {
        apiParams = Object.assign(apiParams, { camera: filterCamera });
      }

      getPhotosByRover(roverName, apiParams);
      return Loading();
    } else {
      const totalElement =
        photoManifest.photo_manifest.photos.find((element) =>
          filterTimeBy === "sol"
            ? element.sol === Number.parseInt(filterTimeValue)
            : element.earth_date === filterTimeValue
        ).total_photos || 0;

      const photos = roverPhotos.photos.map((element) => element.img_src);
      return `<div class="rover-info">
          <div class="rover-info-header">
            ${FilterBar(
              roverPhotos.cameras,
              photoManifest.photo_manifest.max_sol,
              photoManifest.photo_manifest.max_date,
              {
                filterTimeBy,
                filterTimeValue,
                filterCamera,
              }
            )}
            <div class="rover-info-header-detail">
              <p>Name</p>
              <p>${photoManifest.photo_manifest.name}</p>
              <p>Landing date on Mars</p>
              <p>${photoManifest.photo_manifest.landing_date}</p>
              <p>Launch date from Earth</p>
              <p>${photoManifest.photo_manifest.launch_date}</p>
              <p>Mission status</p>
              <p>${photoManifest.photo_manifest.status}</p>
              <p>The most recent Martian sol</p>
              <p>${photoManifest.photo_manifest.max_sol}</p>
              <p>The most recent Earth date</p>
              <p>${photoManifest.photo_manifest.max_date}</p>
              <p>Number of photos taken</p>
              <p>${photoManifest.photo_manifest.total_photos}</p>
            </div>
          </div>
          ${PhotoGallery(photos, photoSlideShow)}
          ${Pagination(currentPage, totalElement)}
        </div>`;
    }
  }
};

const FilterBar = (cameras, max_sol, max_date, filterParams) => {
  return `
    <div id="filter-form" class="filter-form">
      <label for="filter-time-by">Choose a filter time:</label>
      <select name="filter-time-by" id="filter-time-by" onchange="selectFilterTime(event)">
        <option value="sol" ${
          filterParams.filterTimeBy === "sol" ? "selected" : ""
        }>Martian sol</option>
        <option value="earth_date" ${
          filterParams.filterTimeBy === "earth_date" ? "selected" : ""
        }>Earth date</option>
      </select>
      ${FilterBySolOrEarthDate(
        filterParams.filterTimeBy,
        filterParams.filterTimeValue,
        max_sol,
        max_date
      )}
      <label for="filter-camera">Choose a camera:</label>
      <select name="filter-camera" id="filter-camera">
        <option value="all">All</option>
        ${cameras.reduce(
          (pre, cur) =>
            `${pre}<option value="${cur.name}" ${
              filterParams.filterCamera === cur.name ? "selected" : ""
            }>${`${cur.name} - ${cur.full_name}`}</option>`,
          ""
        )}
      </select>
      <button class="btn-filter" onclick="filter()" >Filter</button>
    </div>
  `;
};

const FilterBySolOrEarthDate = (type, defaultValue, maxSol, maxDate) => {
  if (type === "sol") {
    return `
      <p>Select Martian sol (Most recent sol: ${maxSol}):</p>
      <input type="text" id="filter-sol" value="${defaultValue}" />
    `;
  }
  return `
      <p>Select Earth date (Most recent date: ${maxDate}):</p>
      <input type="date" id="filter-date" value="${defaultValue}" />
    `;
};

const PhotoGallery = (photos, photoSlideShow) => {
  const images = photos.reduce(
    (pre, cur) =>
      `${pre}<div class="photo-border ${
        cur === photoSlideShow ? "active" : ""
      }" onclick="selectPhoto('${cur}')"><img src="${cur}" /></div>`,
    ""
  );

  return `
    <div class="photo-slide-show">
      <div class="photo-slide-show-border">
        <img src="${photoSlideShow}" />
      <div>
      <div class="photo-gallery">
        ${images}
      </div>
    </div>
  `;
};

const Pagination = (currentPage, totalElement) => {
  // 1 page <= 25 element
  const totalPage = Math.ceil(totalElement / 25);
  const previousPage = currentPage > 1 ? currentPage - 1 : 1;
  const nextPage = currentPage < totalPage ? currentPage + 1 : totalPage;

  let pager = "";

  for (let i = previousPage; i <= nextPage; i++) {
    pager += `
      <button onclick="selectPage(${i})" class="${
      i === currentPage ? "active" : ""
    }">${i}</button>
    `;
  }

  if (totalPage > 2) {
    if (previousPage === totalPage - 1) {
      pager = `
        <button onclick="selectPage(${previousPage - 1})">${
        previousPage - 1
      }</button>${pager}
      `;
    } else if (previousPage > 1) {
      pager = `... ${pager}`;
    }
    if (nextPage === 2) {
      pager = `
        ${pager}<button onclick="selectPage(${nextPage + 1})">${
        nextPage + 1
      }</button>
      `;
    } else if (nextPage < totalPage) {
      pager = `${pager} ...`;
    }
  }

  if (currentPage > 1) {
    pager = `
      <button onclick="selectPage(${previousPage})">Pre</button>${pager}
    `;
  }
  if (currentPage < totalPage) {
    pager = `
      ${pager}<button onclick="selectPage(${nextPage})">Next</button>
    `;
  }
  return `
    <div class="pagination">
      <div class="btn-page">${pager}</div>
      <div>Page: ${currentPage}/${totalPage}</div>
      <div>Total photos: ${totalElement}</div>
    </div>
  `;
};

const Loading = () => {
  return `
    <div class="loading"><p>Loading...</p></div>
  `;
};

// ------------------------------------------------------  ACTIONS

const selectPage = (page) => {
  if (page === store.appRouter.routeParams.currentPage) {
    return;
  }
  const routeParams = Object.assign(store.appRouter.routeParams, {
    currentPage: page,
  });
  const appRouter = Object.assign(store.appRouter, {
    routeParams,
  });
  updateStore(store, { appRouter });
};

const navigateTo = (routerLink, params) => {
  const routeParams = {
    ...params,
    currentPage: 1,
  };
  const appRouter = Object.assign(store.appRouter, {
    currentRoute: routerLink,
    routeParams,
  });
  updateStore(store, { appRouter });
};

const selectFilterTime = (event) => {
  const routeParams = Object.assign(store.appRouter.routeParams, {
    filterTimeBy: event.target.value,
    filterTimeValue: "",
  });
  const appRouter = Object.assign(store.appRouter, {
    routeParams,
  });
  updateStore(store, { appRouter, roverPhotos: "" });
};

const filter = () => {
  const filterTimeBy = document.getElementById("filter-time-by").value;
  const filterCamera = document.getElementById("filter-camera").value;
  let filterTimeValue;
  if (filterTimeBy === "sol") {
    filterTimeValue = document.getElementById("filter-sol").value;
  } else {
    filterTimeValue = document.getElementById("filter-date").value;
  }

  const routeParams = Object.assign(store.appRouter.routeParams, {
    filterTimeBy,
    filterTimeValue,
    filterCamera,
    currentPage: 1,
  });
  const appRouter = Object.assign(store.appRouter, {
    routeParams,
  });
  updateStore(store, { appRouter, roverPhotos: "" });
};

const selectPhoto = (photoUrl) => {
  updateStore(store, { photoSlideShow: photoUrl });
};

// ------------------------------------------------------  API CALLS

const getImageOfTheDay = (state) => {
  fetch(`http://localhost:3000/apod`)
    .then((res) => res.json())
    .then((apod) => updateStore(store, { apod }));
};

const getRoverManifest = (roverName) => {
  fetch(`http://localhost:3000/manifests/${roverName}`)
    .then((res) => res.json())
    .then((photoManifest) => {
      updateStore(store, { photoManifest, roverPhotos: "" });
    });
};

const getPhotosByRover = (roverName, params) => {
  const queryString = createQueryString(params);
  fetch(`http://localhost:3000/rovers/${roverName}/photos${queryString}`)
    .then((res) => res.json())
    .then((roverPhotos) => {
      const [firstPhoto] = roverPhotos.photos.map((element) => element.img_src);
      updateStore(store, { roverPhotos, photoSlideShow: firstPhoto || "" });
    });
};

// ------------------------------------------------------ UTILS
const createQueryString = (params) => {
  return Object.entries(params).reduce(
    (pre, [key, value], index) =>
      `${pre}${index === 0 ? "" : "&"}${key}=${value}`,
    "?"
  );
};
