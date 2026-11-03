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

// Función para mapear la etiqueta a su clase de color CSS
function obtenerClaseCalidad(calidad) {
  if (!calidad) return "";
  const c = calidad.toUpperCase().trim();
  if (c === "CAM") return "cam";
  if (c === "720P" || c === "HD") return "p720";
  if (c === "1080P" || c === "FHD") return "p1080";
  if (c === "4K" || c === "UHD") return "p4k";
  return "";
}

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

// Slider del Hero Banner
function iniciarHeroSlider(items) {
  if (!items || items.length === 0 || !heroBanner) return;

  let slidesHtml = items.map((item, index) => {
    const detailLabel = item.episodes ? `${item.episodes} Capítulos` : (item.duration || "");
    const imagenBackdrop = item.backdrop || item.poster;
    const favoritoActivo = esFavorito(item.id);
    
    const calidad = item.quality;
    const claseColor = obtenerClaseCalidad(calidad);
    const badgeCalidad = calidad 
      ? `<span class="hero-badge-quality ${claseColor}">${calidad}</span>` 
      : "";

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
              ${badgeCalidad}
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
