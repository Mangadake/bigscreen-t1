// ==========================================
// CONFIGURACIÓN DE PUBLICIDAD
const LINK_PUBLICIDAD = "https://google.com";
const ACTIVAR_PUBLICIDAD = true; 
// ==========================================

const catalogGrid = document.getElementById("catalog-grid");
const filterButtons = document.querySelectorAll(".filter-btn");
const searchInput = document.getElementById("search-input");
const modalOverlay = document.getElementById("modal-overlay");
const modalBody = document.getElementById("modal-body");
const closeModalBtn = document.getElementById("close-modal");
const heroBanner = document.getElementById("hero-banner");

let mediaData = [];
let currentCategory = "all";

// GESTIÓN DE FAVORITOS (Almacenamiento local del usuario)
function obtenerFavoritos() {
  try {
    return JSON.parse(localStorage.getItem("streamlab_user_favorites")) || [];
  } catch (e) {
    return [];
  }
}

function guardarFavoritos(favs) {
  localStorage.setItem("streamlab_user_favorites", JSON.stringify(favs));
}

function esFavorito(id) {
  const favs = obtenerFavoritos();
  return favs.includes(id);
}

function alternarFavorito(item, event) {
  if (event) event.stopPropagation();

  let favs = obtenerFavoritos();
  const index = favs.indexOf(item.id);

  if (index > -1) {
    favs.splice(index, 1);
  } else {
    favs.push(item.id);
  }

  guardarFavoritos(favs);

  if (currentCategory === "favoritos") {
    aplicarFiltros();
  } else {
    actualizarBotonesFavorito(item.id, esFavorito(item.id));
  }
}

function actualizarBotonesFavorito(itemId, estaEnFavoritos) {
  document.querySelectorAll(`.btn-card-fav[data-id="${itemId}"]`).forEach(btn => {
    btn.classList.toggle("active", estaEnFavoritos);
    btn.innerHTML = estaEnFavoritos ? "★" : "☆";
  });

  const heroFavBtn = document.getElementById(`hero-fav-${itemId}`);
  if (heroFavBtn) {
    heroFavBtn.classList.toggle("active", estaEnFavoritos);
    heroFavBtn.innerHTML = estaEnFavoritos ? "★ En Mi Lista" : "+ Mi Lista";
  }

  const modalFavBtn = document.getElementById(`modal-fav-${itemId}`);
  if (modalFavBtn) {
    modalFavBtn.classList.toggle("active", estaEnFavoritos);
    modalFavBtn.innerHTML = estaEnFavoritos ? "★ En Mi Lista" : "+ Añadir a Mi Lista";
  }
}

let currentHeroIndex = 0;
let heroItems = [];
let heroTimer = null;

// Cargar catálogo desde catalogo.json
async function cargarCatalogo() {
  try {
    const res = await fetch(`catalogo.json?t=${Date.now()}`);
    if (!res.ok) throw new Error("No se pudo cargar catalogo.json");
    mediaData = await res.json();

    if (Array.isArray(mediaData) && mediaData.length > 0 && heroBanner) {
      heroBanner.style.display = "flex";
      heroItems = mediaData.slice(0, 5);
      iniciarHeroSlider(heroItems);
    } else if (heroBanner) {
      heroBanner.style.display = "none";
    }

    renderCards(mediaData);
  } catch (error) {
    if (heroBanner) heroBanner.style.display = "none";
    catalogGrid.innerHTML = `<p class="no-results">Error al cargar el catálogo o catálogo vacío.</p>`;
    console.error(error);
  }
}

// Slider del Hero Banner (TMDB Style con Insignia de Calidad)
function iniciarHeroSlider(items) {
  if (!items || items.length === 0 || !heroBanner) return;

  let slidesHtml = items.map((item, index) => {
    const detailLabel = item.episodes ? `${item.episodes} Capítulos` : (item.duration || "");
    const imagenBackdrop = item.backdrop || item.poster;
    const favoritoActivo = esFavorito(item.id);
    const calidad = item.quality || "HD";
    const esCam = calidad.toUpperCase() === "CAM";

    return `
      <div class="hero-slide ${index === 0 ? "active" : ""}" data-index="${index}">
        <div class="hero-backdrop-bg" style="background-image: url('${imagenBackdrop}');"></div>
        <div class="hero-overlay"></div>
        <div class="hero-container">
          <div class="hero-poster-box">
            <img src="${item.poster}" alt="${item.title}">
          </div>
          <div class="hero-info-box">
            <div class="hero-badges-row">
              <span class="hero-badge">Destacado • ${item.type}</span>
              <span class="hero-badge-quality ${esCam ? 'cam' : ''}">${calidad}</span>
            </div>
            <h1 class="hero-title">${item.title}</h1>
            <div class="hero-meta">
              <span class="rating">★ ${item.rating}</span>
              <span>${item.year}</span>
              <span>${detailLabel}</span>
            </div>
            <p class="hero-synopsis">${item.synopsis}</p>
            <div class="hero-actions">
              <button class="hero-btn-play" onclick="abrirDesdeHero(${item.id})">
                ▶ Reproducir Ahora
              </button>
              <button class="hero-btn-fav ${favoritoActivo ? "active" : ""}" id="hero-fav-${item.id}" onclick="alternarFavoritoPorId(${item.id})">
                ${favoritoActivo ? "★ En Mi Lista" : "+ Mi Lista"}
              </button>
            </div>
          </div>
        </div>
      </div>
    `;
  }).join("");

  let dotsHtml = items.map((_, index) => `
    <div class="hero-dot ${index === 0 ? "active" : ""}" data-index="${index}"></div>
  `).join("");

  heroBanner.innerHTML = `
    ${slidesHtml}
    <button class="hero-arrow prev" id="hero-prev">&#10094;</button>
    <button class="hero-arrow next" id="hero-next">&#10095;</button>
    <div class="hero-dots">${dotsHtml}</div>
  `;

  document.getElementById("hero-prev").addEventListener("click", () => {
    cambiarHeroSlide((currentHeroIndex - 1 + items.length) % items.length);
    reiniciarIntervaloHero();
  });

  document.getElementById("hero-next").addEventListener("click", () => {
    cambiarHeroSlide((currentHeroIndex + 1) % items.length);
    reiniciarIntervaloHero();
  });

  document.querySelectorAll(".hero-dot").forEach(dot => {
    dot.addEventListener("click", (e) => {
      const idx = parseInt(e.target.dataset.index);
      cambiarHeroSlide(idx);
      reiniciarIntervaloHero();
    });
  });

  reiniciarIntervaloHero();
}

function cambiarHeroSlide(nuevoIndice) {
  const slides = document.querySelectorAll(".hero-slide");
  const dots = document.querySelectorAll(".hero-dot");

  if (slides.length === 0) return;

  slides[currentHeroIndex].classList.remove("active");
  dots[currentHeroIndex].classList.remove("active");

  currentHeroIndex = nuevoIndice;

  slides[currentHeroIndex].classList.add("active");
  dots[currentHeroIndex].classList.add("active");
}

function reiniciarIntervaloHero() {
  if (heroTimer) clearInterval(heroTimer);
  heroTimer = setInterval(() => {
    if (heroItems.length > 1) {
      cambiarHeroSlide((currentHeroIndex + 1) % heroItems.length);
    }
  }, 6000);
}

window.abrirDesdeHero = function(itemId) {
  const item = mediaData.find(i => i.id === itemId);
  if (item) openModal(item);
};

window.alternarFavoritoPorId = function(itemId) {
  const item = mediaData.find(i => i.id === itemId);
  if (item) alternarFavorito(item, null);
};

function obtenerUrlFacilitoPlay(item, season = 1, episode = 1) {
  const base = "https://facilitoplay.com/e";
  const { type, tmdb_id } = item;

  if (type === "pelicula") return `${base}/pelicula/${tmdb_id}`;
  if (type === "serie") return `${base}/serie/${tmdb_id}/${season}/${episode}`;
  if (type === "anime") return `${base}/anime/${tmdb_id}/${season}/${episode}`;
  return "";
}

function activarCapaPublicidad(playerContainer) {
  if (!ACTIVAR_PUBLICIDAD || !playerContainer) return;

  const capaPrevia = playerContainer.querySelector(".player-ad-overlay");
  if (capaPrevia) capaPrevia.remove();

  const overlay = document.createElement("div");
  overlay.className = "player-ad-overlay";
  overlay.innerHTML = `
    <span class="ad-badge">Anuncio Patrocinado</span>
    <div class="ad-play-btn">▶</div>
    <div class="ad-text">Haz clic aquí para reproducir en HD</div>
    <div class="ad-subtext">El reproductor se activará inmediatamente</div>
  `;

  overlay.addEventListener("click", () => {
    window.open(LINK_PUBLICIDAD, "_blank");
    overlay.style.opacity = "0";
    setTimeout(() => overlay.remove(), 250);
  });

  playerContainer.prepend(overlay);
}

// Renderizado de tarjetas con Tipo + Calidad en el póster
function renderCards(items) {
  catalogGrid.innerHTML = "";

  if (!items || items.length === 0) {
    const mensajeVacio = (currentCategory === "favoritos")
      ? "No has añadido ningún título a tu lista aún. Haz clic en la estrella de cualquier portada para guardarla aquí."
      : "No hay títulos disponibles.";
    catalogGrid.innerHTML = `<p class="no-results">${mensajeVacio}</p>`;
    return;
  }

  items.forEach(item => {
    const card = document.createElement("article");
    card.className = "card";
    const detailLabel = item.episodes ? `${item.episodes} caps` : (item.duration || "");
    const favoritoActivo = esFavorito(item.id);
    const calidad = item.quality || "HD";
    const esCam = calidad.toUpperCase() === "CAM";

    card.innerHTML = `
      <div class="poster-wrapper">
        <div class="badge-group">
          <span class="badge">${item.type}</span>
          <span class="badge-quality ${esCam ? 'cam' : ''}">${calidad}</span>
        </div>
        <button class="btn-card-fav ${favoritoActivo ? "active" : ""}" data-id="${item.id}" title="Añadir a Mi Lista">
          ${favoritoActivo ? "★" : "☆"}
        </button>
        <img src="${item.poster}" alt="${item.title}" loading="lazy">
      </div>
      <div class="card-info">
        <h3 class="card-title">${item.title}</h3>
        <div class="card-meta">
          <span class="rating">★ ${item.rating}</span>
          <span>${detailLabel}</span>
          <span>${item.year}</span>
        </div>
      </div>
    `;

    card.querySelector(".btn-card-fav").addEventListener("click", (e) => {
      alternarFavorito(item, e);
    });

    card.addEventListener("click", () => openModal(item));
    catalogGrid.appendChild(card);
  });
}

function aplicarFiltros() {
  const query = searchInput.value.toLowerCase().trim();
  const favs = obtenerFavoritos();

  const resultados = mediaData.filter(item => {
    let coincideCategoria = false;

    if (currentCategory === "all") {
      coincideCategoria = true;
    } else if (currentCategory === "favoritos") {
      coincideCategoria = favs.includes(item.id);
    } else {
      coincideCategoria = (item.type === currentCategory);
    }

    const coincideTexto = item.title.toLowerCase().includes(query);
    return coincideCategoria && coincideTexto;
  });

  renderCards(resultados);
}

searchInput.addEventListener("input", aplicarFiltros);

filterButtons.forEach(btn => {
  btn.addEventListener("click", () => {
    filterButtons.forEach(b => b.classList.remove("active"));
    btn.classList.add("active");
    currentCategory = btn.dataset.filter;
    aplicarFiltros();
  });
});

// Modal con la calidad visible
async function openModal(item) {
  const detailLabel = item.episodes ? `${item.episodes} Capítulos` : (item.duration || "");
  const esSerieOAnime = (item.type === "serie" || item.type === "anime");
  const tmdbKey = localStorage.getItem("tmdb_key");
  const favoritoActivo = esFavorito(item.id);
  const calidad = item.quality || "HD";
  const esCam = calidad.toUpperCase() === "CAM";

  let episodesHtml = "";
  let seasonsData = [];

  if (esSerieOAnime) {
    if (item.seasons_detail && Array.isArray(item.seasons_detail) && item.seasons_detail.length > 0) {
      seasonsData = item.seasons_detail;
    } else if (tmdbKey) {
      try {
        const res = await fetch(`https://api.themoviedb.org/3/tv/${item.tmdb_id}?api_key=${tmdbKey}&language=es-MX`);
        if (res.ok) {
          const tvInfo = await res.json();
          seasonsData = (tvInfo.seasons || []).filter(s => s.season_number > 0 && s.episode_count > 0);
        }
      } catch (e) {
        console.error("Error al consultar temporadas:", e);
      }
    }

    if (seasonsData.length === 0) {
      seasonsData = [{
        season_number: 1,
        name: "Temporada 1",
        episode_count: item.episodes || 12
      }];
    }

    let seasonOptions = seasonsData.map(s => `
      <option value="${s.season_number}" data-count="${s.episode_count}">
        ${s.name || `Temporada ${s.season_number}`} (${s.episode_count} eps)
      </option>
    `).join("");

    episodesHtml = `
      <div class="episodes-section">
        <div class="episodes-header">
          <span>Episodios</span>
          <select id="season-selector">${seasonOptions}</select>
        </div>
        <div class="episodes-grid" id="episodes-grid"></div>
      </div>
    `;
  }

  const initialVideoUrl = obtenerUrlFacilitoPlay(item, 1, 1);

  modalBody.innerHTML = `
    <div class="modal-detail-grid">
      <img src="${item.poster}" alt="${item.title}">
      <div class="modal-detail-text">
        <h2>${item.title}</h2>
        <div class="modal-meta-row">
          <span class="modal-meta-data">
            <strong>${item.type.toUpperCase()}</strong>
            <span class="modal-quality-badge ${esCam ? 'cam' : ''}">${calidad}</span>
            • ★ ${item.rating} • ${item.year} ${detailLabel ? `• ${detailLabel}` : ""}
          </span>
          <button class="modal-btn-fav ${favoritoActivo ? "active" : ""}" id="modal-fav-${item.id}">
            ${favoritoActivo ? "★ En Mi Lista" : "+ Añadir a Mi Lista"}
          </button>
        </div>
        <p class="modal-synopsis">${item.synopsis}</p>
      </div>
    </div>

    <div class="player-container" id="player-container">
      <iframe
        id="player-iframe"
        src="${initialVideoUrl}"
        title="Reproductor - ${item.title}"
        allow="autoplay; fullscreen; picture-in-picture"
        allowfullscreen>
      </iframe>
    </div>

    ${episodesHtml}
  `;

  document.getElementById(`modal-fav-${item.id}`).addEventListener("click", () => {
    alternarFavorito(item, null);
  });

  const playerContainer = document.getElementById("player-container");
  activarCapaPublicidad(playerContainer);

  if (esSerieOAnime) {
    const seasonSelector = document.getElementById("season-selector");
    const grid = document.getElementById("episodes-grid");
    const iframe = document.getElementById("player-iframe");

    function renderEpisodesGrid(seasonNum, epCount) {
      grid.innerHTML = "";
      for (let i = 1; i <= epCount; i++) {
        const btn = document.createElement("button");
        btn.className = `ep-btn ${i === 1 ? "active" : ""}`;
        btn.innerText = i;

        btn.addEventListener("click", () => {
          document.querySelectorAll(".ep-btn").forEach(b => b.classList.remove("active"));
          btn.classList.add("active");
          iframe.src = obtenerUrlFacilitoPlay(item, seasonNum, i);
          activarCapaPublicidad(playerContainer);
        });

        grid.appendChild(btn);
      }
    }

    const firstOption = seasonSelector.options[0];
    const initialEpCount = parseInt(firstOption.dataset.count) || 12;
    renderEpisodesGrid(parseInt(firstOption.value), initialEpCount);

    seasonSelector.addEventListener("change", () => {
      const selectedOption = seasonSelector.options[seasonSelector.selectedIndex];
      const sNum = parseInt(selectedOption.value);
      const eCount = parseInt(selectedOption.dataset.count);

      renderEpisodesGrid(sNum, eCount);
      iframe.src = obtenerUrlFacilitoPlay(item, sNum, 1);
      activarCapaPublicidad(playerContainer);
    });
  }

  modalOverlay.style.display = "flex";
  modalOverlay.classList.add("active");
}

function closeModal() {
  modalOverlay.style.display = "none";
  modalOverlay.classList.remove("active");
  modalBody.innerHTML = "";
}

closeModalBtn.addEventListener("click", closeModal);
modalOverlay.addEventListener("click", (e) => {
  if (e.target === modalOverlay) closeModal();
});

cargarCatalogo();
