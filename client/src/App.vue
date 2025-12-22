<script setup>
import { ref, computed, onMounted, watch } from 'vue';

const viewMode = ref('client');
const movies = ref([]);
const selectedMovieId = ref(null);
const occupiedSeats = ref([]);
const selectedSeats = ref([]);

const bookingForm = ref({ name: '', email: '' });
const adminForm = ref({ title: '', price: '' });
const loading = ref(false);

const totalSeats = 48;
const seats = Array.from({ length: totalSeats }, (_, i) => i);

const selectedMovie = computed(() => movies.value.find(m => m.id === selectedMovieId.value) || {});
const totalPrice = computed(() => selectedSeats.value.length * (selectedMovie.value.price || 0));

const isValidEmail = (email) => {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(email).toLowerCase());
};

const fetchMovies = async () => {
  try {
    const res = await fetch('http://localhost:3000/api/movies');
    movies.value = await res.json();
    if (!selectedMovieId.value && movies.value.length > 0) {
      selectedMovieId.value = movies.value[0].id;
    }
  } catch (err) { console.error("API Error:", err); }
};

const addMovie = async () => {
  if (!adminForm.value.title || !adminForm.value.price) return alert('Заповніть усі поля!');
  loading.value = true;
  try {
    const res = await fetch('http://localhost:3000/api/movies', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(adminForm.value)
    });
    if (res.ok) {
      alert('Фільм успішно додано!');
      adminForm.value = { title: '', price: '' };
      await fetchMovies();
    } else {
      alert('Помилка сервера');
    }
  } catch (err) { alert('Помилка з\'єднання'); }
  finally { loading.value = false; }
};

const fetchOccupiedSeats = async () => {
  if (!selectedMovieId.value) return;
  try {
    const res = await fetch(`http://localhost:3000/api/seats/${selectedMovieId.value}`);
    const data = await res.json();
    occupiedSeats.value = data;
    selectedSeats.value = selectedSeats.value.filter(s => !data.includes(s));
  } catch (err) { console.error(err); }
};

const submitBooking = async () => {
  if (selectedSeats.value.length === 0) return alert('Оберіть місця!');
  if (!bookingForm.value.name || !bookingForm.value.email) return alert('Заповніть ім\'я та email!');
  if (!isValidEmail(bookingForm.value.email)) return alert('Некоректний Email!');

  loading.value = true;
  try {
    const res = await fetch('http://localhost:3000/api/book', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        movieId: selectedMovieId.value,
        seats: selectedSeats.value,
        name: bookingForm.value.name,
        email: bookingForm.value.email
      })
    });
    const result = await res.json();
    
    if (result.status === 'success') {
      alert(`Дякуємо! Квитки відправлено на ${bookingForm.value.email}`);
      bookingForm.value = { name: '', email: '' };
      selectedSeats.value = [];
      await fetchOccupiedSeats();
    } else {
      alert('Помилка: вибрані місця вже зайняті!');
      await fetchOccupiedSeats();
    }
  } catch (err) { alert('Помилка сервера'); }
  finally { loading.value = false; }
};

const toggleSeat = (index) => {
  if (occupiedSeats.value.includes(index)) return;
  if (selectedSeats.value.includes(index)) {
    selectedSeats.value = selectedSeats.value.filter(i => i !== index);
  } else {
    selectedSeats.value.push(index);
  }
};

watch(selectedMovieId, fetchOccupiedSeats);
onMounted(async () => {
  await fetchMovies();
  fetchOccupiedSeats();
});
</script>

<template>
  <div class="main-wrapper text-light">
    
    <nav class="navbar navbar-dark bg-dark shadow-sm mb-4">
      <div class="container d-flex justify-content-between">
        <span class="navbar-brand mb-0 h1">Cinema booking</span>
        
        <div>
          <button 
            class="btn btn-sm me-2" 
            :class="viewMode === 'client' ? 'btn-primary' : 'btn-outline-secondary'" 
            @click="viewMode = 'client'"
          >
            Клієнт
          </button>
          <button 
            class="btn btn-sm" 
            :class="viewMode === 'admin' ? 'btn-danger' : 'btn-outline-secondary'" 
            @click="viewMode = 'admin'"
          >
            Адмін
          </button>
        </div>
      </div>
    </nav>

    <div class="container">
      
      <div v-if="viewMode === 'client'" class="row g-5">
        <div class="col-lg-8">
          <div class="card bg-secondary text-white mb-4 shadow-sm border-0">
            <div class="card-body">
              <label class="form-label fw-bold">Оберіть фільм:</label>
              <select class="form-select form-select-lg" v-model="selectedMovieId">
                <option v-for="movie in movies" :key="movie.id" :value="movie.id">
                  {{ movie.title }} — {{ movie.price }} грн
                </option>
              </select>
            </div>
          </div>

          <div class="d-flex justify-content-center gap-4 mb-4 p-2 rounded bg-dark bg-opacity-50">
            <div class="d-flex align-items-center"><div class="seat-legend free me-2"></div> <small>Вільне</small></div>
            <div class="d-flex align-items-center"><div class="seat-legend selected me-2"></div> <small>Обране</small></div>
            <div class="d-flex align-items-center"><div class="seat-legend occupied me-2"></div> <small>Зайняте</small></div>
          </div>

          <div class="perspective-container d-flex flex-column align-items-center mb-5">
            <div class="screen shadow mb-4"></div>
            <div class="cinema-grid">
              <div 
                v-for="seatIndex in seats" 
                :key="seatIndex"
                class="seat"
                :class="{ 'occupied': occupiedSeats.includes(seatIndex), 'selected': selectedSeats.includes(seatIndex) }"
                @click="toggleSeat(seatIndex)"
              ></div>
            </div>
          </div>
        </div>

        <div class="col-lg-4">
          <div class="card bg-dark text-white border border-secondary shadow sticky-top" style="top: 20px; z-index: 100;">
            <div class="card-header bg-transparent border-secondary">
              <h5 class="mb-0">Ваше замовлення</h5>
            </div>
            <div class="card-body">
              <p class="card-text d-flex justify-content-between">
                <span>Місць:</span> <span class="fw-bold text-info">{{ selectedSeats.length }}</span>
              </p>
              <p class="card-text d-flex justify-content-between">
                <span>До сплати:</span> <span class="fw-bold fs-4 text-info">{{ totalPrice }} грн</span>
              </p>
              
              <div v-if="selectedSeats.length > 0">
                <hr class="border-secondary">
                <div class="mb-3">
                  <input v-model="bookingForm.name" type="text" class="form-control bg-secondary text-white border-0" placeholder="Ваше Ім'я">
                </div>
                <div class="mb-3">
                  <input v-model="bookingForm.email" type="email" class="form-control bg-secondary text-white border-0" placeholder="Email">
                </div>
                <button @click="submitBooking" class="btn btn-info w-100 fw-bold" :disabled="loading">
                  {{ loading ? 'Обробка...' : 'КУПИТИ КВИТКИ' }}
                </button>
              </div>
              <div v-else class="text-center text-muted py-3">Оберіть місця на схемі</div>
            </div>
          </div>
        </div>
      </div>

      <div v-else class="row justify-content-center">
        <div class="col-md-8 col-lg-6"> 
          <div class="card bg-dark text-white border-danger shadow admin-card">
            <div class="card-header bg-danger">Додати новий фільм</div>
            <div class="card-body">
              <div class="mb-3">
                <label>Назва</label>
                <input v-model="adminForm.title" class="form-control" placeholder="Назва фільму">
              </div>
              <div class="mb-3">
                <label>Ціна (грн)</label>
                <input v-model="adminForm.price" type="number" class="form-control" placeholder="150">
              </div>
              <button @click="addMovie" class="btn btn-danger w-100" :disabled="loading">ЗБЕРЕГТИ</button>
            </div>
          </div>
          <h5 class="mt-4">Список фільмів:</h5>
          <ul class="list-group">
            <li v-for="m in movies" :key="m.id" class="list-group-item bg-secondary text-white border-dark d-flex justify-content-between">
              {{ m.title }} <span>{{ m.price }} грн</span>
            </li>
          </ul>
        </div>
      </div>

    </div>
  </div>
</template>

<style>
body {
  background-color: #1b1b25 !important;
}

.main-wrapper {
  min-height: 100vh;
  padding-bottom: 50px;
}

.perspective-container {
  perspective: 1000px;
}

.screen {
  background-color: #fff;
  height: 60px;
  width: 80%;
  transform: rotateX(-45deg);
  border-radius: 5px;
}

.cinema-grid {
  display: grid;
  grid-template-columns: repeat(8, auto);
  gap: 10px;
  justify-content: center;
}

.seat {
  background-color: #fff;
  height: 30px;
  width: 35px;
  border-top-left-radius: 12px;
  border-top-right-radius: 12px;
  cursor: pointer;
}

.seat.selected {
  background-color: #1e7cef;
}

.seat.occupied {
  background-color: #444451;
  cursor: not-allowed;
}

.seat-legend {
  width: 20px;
  height: 20px;
  background-color: #fff;
  border-radius: 4px;
}

.seat-legend.selected {
  background-color: #1e7cef;
}

.seat-legend.occupied {
  background-color: #444451;
}

.admin-card {
  min-width: 500px;
}

.justify-content-center {
  width: 700px !important;
}

@media (max-width: 576px) {
  .cinema-grid {
    gap: 6px;
  }

  .seat {
    height: 24px;
    width: 28px;
  }
}

</style>