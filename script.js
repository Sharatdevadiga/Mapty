'use strict';

// ELEMENTS
const form = document.querySelector('.form');
const containerWorkouts = document.querySelector('.workouts');
const inputType = document.querySelector('.form__input--type');
const inputDistance = document.querySelector('.form__input--distance');
const inputDuration = document.querySelector('.form__input--duration');
const inputCadence = document.querySelector('.form__input--cadence');
const inputElevation = document.querySelector('.form__input--elevation');
const resetBtn = document.querySelector('.btn--reset');

class Workout {
  // private fields;
  date = new Date();
  id = Date.now();
  clicks = 0;

  constructor(coords, distance, duration) {
    this.coords = coords;
    this.distance = distance;
    this.duration = duration;
  }

  _setDescription() {
    // prettier-ignore
    const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

    this.description = `${this.type[0].toUpperCase()}${this.type.slice(1)} on ${
      months[this.date.getMonth()]
    }${this.date.getDate()}`;
  }

  click() {
    this.clicks++;
  }
}

class Running extends Workout {
  type = 'running';
  constructor(coords, distance, duration, cadence) {
    super(coords, distance, duration);
    this.cadence = cadence;
    this.calcPace();
    this._setDescription();
  }

  calcPace() {
    this.pace = this.duration / this.distance;
    return this.pace;
  }
}

class Cycling extends Workout {
  type = 'cycling';
  constructor(coords, distance, duration, elevationGain) {
    super(coords, distance, duration);
    this.elevationGain = elevationGain;
    this.calcSpeed();
    this._setDescription();
  }

  calcSpeed() {
    this.speed = this.distance / (this.duration / 60);
    return this.speed;
  }
}

// const run1 = new Running([30, 20], 34, 54, 234);
// const cycling1 = new Cycling([30, 12], 23, 34, 123);
// console.log(run1, cycling1);

//1.  APP ARCHITECTURE;
class App {
  // PRIVATE FIELDS
  #map;
  #mapEvent;
  // public fields
  #workouts = [];

  // CONSTRUCTOR FUNCTION
  constructor() {
    this._getPosition();

    // on submiting form creating new workout
    form.addEventListener('submit', this._newWorkout.bind(this));

    // on changing input type -> toggle the div
    inputType.addEventListener(
      'change',
      this._toggleElevationFields.bind(this)
    );

    // moving to the clicked location
    containerWorkouts.addEventListener('click', this._moveToPopup.bind(this));

    // resetting local storage
    resetBtn.addEventListener('click', this._resetlocalStorage);
  }

  //* FUNCTIONS
  _getPosition() {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        this._loadMap.bind(this),
        function () {
          alert('could not get your location');
        }
      );
    }
  }

  _loadMap(position) {
    const latitude = position.coords.latitude;
    const longitude = position.coords.longitude;
    const coordinates = [latitude, longitude];

    // displaying leaflet map
    this.#map = L.map('map').setView(coordinates, 13);

    L.tileLayer('https://tile.openstreetmap.fr/hot/{z}/{x}/{y}.png', {
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    }).addTo(this.#map);

    // adding current location marker to map
    L.marker(coordinates)
      .addTo(this.#map)
      .bindPopup('current position')
      .openPopup();

    this.#map.on('click', this._showForm.bind(this));

    // get data from local storage
    this._getLocalStorage();

    // resetting local storage
    // resetBtn.addEventListener('click', this._resetlocalStorage);
  }

  _showForm(e) {
    //making form visible
    this.#mapEvent = e;
    form.classList.remove('hidden');
    inputDistance.focus(); //initial focus
  }

  _hideForm() {
    inputDistance.value =
      inputDuration.value =
      inputCadence.value =
      inputElevation.value =
        '';

    form.style.display = 'none';
    form.classList.add('hidden');
    setTimeout(() => {
      form.style.display = 'grid';
    }, 1000);
  }

  _toggleElevationFields() {
    inputCadence.closest('.form__row').classList.toggle('form__row--hidden');
    inputElevation.closest('.form__row').classList.toggle('form__row--hidden');
  }

  _newWorkout(e) {
    e.preventDefault();
    const { lat, lng } = this.#mapEvent.latlng;
    let workout;

    // helper methods
    const validInputs = (...inputs) => {
      return inputs.every(inp => Number.isFinite(inp));
    };

    const allPositive = (...inputs) => {
      return inputs.every(inp => inp > 0);
    };

    //get data from the form
    const type = inputType.value;
    const distance = +inputDistance.value;
    const duration = +inputDuration.value;

    // if workout is running create running object
    if (type === 'running') {
      const cadence = +inputCadence.value;

      // check if data is valid
      if (
        !validInputs(distance, duration, cadence) ||
        !allPositive(distance, duration, cadence)
      )
        return alert('Inputs have to be positive numbers');

      workout = new Running([lat, lng], distance, duration, cadence);
    }

    // if workout is cycling create cycling object
    if (type === 'cycling') {
      const elevation = +inputElevation.value;

      // check if data is valid
      if (
        !validInputs(distance, duration, elevation) ||
        !allPositive(distance, duration)
      )
        return alert('Inputs have to be positive numbers');

      workout = new Cycling([lat, lng], distance, duration, elevation);
    }

    // add new workout to workout array
    this.#workouts.push(workout);

    // render workout on map as marker
    this._renderWorkoutMarker(workout);

    //  render workout on list
    this._renderWorkout(workout);

    //  hide form and clear input fields;
    this._hideForm();

    // set local storage to all workouts
    this._setLocalStorage();
  }

  _renderWorkoutMarker(workout) {
    L.marker(workout.coords)
      .addTo(this.#map)
      .bindPopup(
        L.popup({
          maxWidth: 250,
          minWidth: 100,
          autoClose: false,
          closeOnClick: false,
          className: `${workout.type}-popup`,
        })
      )
      .setPopupContent(
        `${workout.type === 'running' ? '🏃‍♂️' : '🚴‍♂️'} ${workout.description}`
      )
      .openPopup();

    if (this.#workouts.length >= 2) {
      this._createPolyLine();
    }
  }

  _renderWorkout(workout) {
    let html = `
        <li class="workout workout--${workout.type}" data-id="${workout.id}">
          <h2 class="workout__title">${workout.description}</h2>
          <div class="workout__details">
            <span class="workout__icon">
              ${workout.type === 'running' ? '🏃‍♂️' : '🚴‍♂️'}
            </span>
            <span class="workout__value">${workout.distance}</span>
            <span class="workout__unit">km</span>
          </div>
          <div class="workout__details">
            <span class="workout__icon">⏱</span>
            <span class="workout__value">${workout.duration}</span>
            <span class="workout__unit">min</span>
          </div>`;

    if (workout.type === 'running') {
      html += `
          <div class="workout__details">
            <span class="workout__icon">⚡️</span>
            <span class="workout__value">${workout.pace.toFixed(1)}</span>
            <span class="workout__unit">min/km</span>
          </div>
          <div class="workout__details">
            <span class="workout__icon">🦶🏼</span>
            <span class="workout__value">${workout.cadence}</span>
            <span class="workout__unit">spm</span>
          </div>
        </li>`;
    }

    if (workout.type === 'cycling') {
      html += `
        <div class="workout__details">
            <span class="workout__icon">⚡️</span>
            <span class="workout__value">${workout.speed.toFixed(1)}</span>
            <span class="workout__unit">km/h</span>
          </div>
          <div class="workout__details">
            <span class="workout__icon">⛰</span>
            <span class="workout__value">${workout.elevationGain}</span>
            <span class="workout__unit">m</span>
          </div>
        </li> -->
      `;
    }

    form.insertAdjacentHTML('afterend', html);
  }

  _moveToPopup(e) {
    const workoutEl = e.target.closest('.workout');

    if (!workoutEl) return;

    let workout;
    for (let work of this.#workouts) {
      if (work.id == workoutEl.dataset.id) {
        workout = work;
        break;
      }
    }

    this.#map.setView(workout.coords, 13, {
      animate: true,
      duration: 1,
    });

    // workout.click();
  }

  _setLocalStorage() {
    localStorage.setItem('workouts', JSON.stringify(this.#workouts));
  }

  _getLocalStorage() {
    const data = JSON.parse(localStorage.getItem('workouts'));

    if (!data) return;

    this.#workouts = data;

    this.#workouts.forEach(work => {
      this._renderWorkoutMarker(work);
      this._renderWorkout(work);
    });
  }

  _resetlocalStorage() {
    localStorage.removeItem('workouts');
    location.reload();
  }

  _createPolyLine() {
    const latLng = [];
    for (let workout of this.#workouts) {
      latLng.push(workout.coords);
    }

    const firstPolyline = new L.Polyline(latLng, {
      color: 'red',
      weight: 3,
      opacity: 0.5,
      smoothFactor: 1,
    });
    firstPolyline.addTo(this.#map);
  }
}

// -------------------------
const app = new App();
