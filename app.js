class DoodhDaily {
  constructor() {
    this.currentDate = new Date();
    this.displayDate = new Date();
    this.markedDates = new Set();
    this.selectedMonths = new Set();
    this.currentCalculatorYear = new Date().getFullYear();
    this.holidays = {};
    
    this.months = [
      "January", "February", "March", "April", "May", "June",
      "July", "August", "September", "October", "November", "December"
    ];
    
    this.teluguFestivals = [
      "ugadi", "sankranti", "makar sankranti", "vinayaka chavithi", 
      "dussehra", "dasara", "deepavali", "diwali", "krishna janmashtami",
      "ram navami", "maha shivratri", "holi", "independence day", 
      "republic day", "gandhi jayanti", "ganesh chaturthi"
    ];
    
    // this.apiKey = "0bwbAvyD0tXE4cO1IHzaI0OAle7VK3ai";
    this.currentAction = null;
    this.currentClickedDate = null;
    this.pickerYear = new Date().getFullYear();
    
    this.init();
  }

  async init() {
    this.initToastContainer();
    this.loadData();
    this.restoreTheme();
    this.bindEvents();
    await this.loadHolidays(this.displayDate.getFullYear());
    this.renderCalendar();
    this.updateMonthYearDisplay();
    this.updateCalculatorYear();
    this.renderMonthSelector();
  }

  // Toast notification system
  initToastContainer() {
    if (!document.getElementById('toast-container')) {
      const container = document.createElement('div');
      container.id = 'toast-container';
      container.className = 'toast-container';
      document.body.appendChild(container);
    }
  }

  showToast(message, type = 'info') {
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.innerHTML = `
      <span>${message}</span>
      <button class="toast-close" onclick="this.parentElement.remove()">×</button>
    `;
    
    document.getElementById('toast-container').appendChild(toast);
    
    setTimeout(() => {
      if (toast.parentElement) {
        toast.remove();
      }
    }, 3000);
  }

  // Holiday API integration
  async loadHolidays(year) {
    const cacheKey = `holidays-${year}`;
    const cached = localStorage.getItem(cacheKey);
    
    if (cached) {
      try {
        this.holidays[year] = JSON.parse(cached);
        return;
      } catch (e) {
        console.error('Error parsing cached holidays:', e);
      }
    }

    try {
      this.showToast('Loading holidays...', 'info');
      const response = await fetch(
        `https://calendarific.com/api/v2/holidays?api_key=${this.apiKey}&country=IN&year=${year}`
      );
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      const filteredHolidays = this.filterTeluguHolidays(data.response.holidays);
      
      this.holidays[year] = filteredHolidays;
      localStorage.setItem(cacheKey, JSON.stringify(filteredHolidays));
      
      this.showToast('Holidays loaded successfully', 'success');
    } catch (error) {
      console.error('Error fetching holidays:', error);
      this.showToast('Failed to load holidays', 'error');
      this.holidays[year] = {};
    }
  }

  filterTeluguHolidays(holidays) {
    const filtered = {};
    
    holidays.forEach(holiday => {
      const name = holiday.name.toLowerCase();
      const isTeluguFestival = this.teluguFestivals.some(festival => 
        name.includes(festival) || name.includes(festival.replace(' ', ''))
      );
      
      if (isTeluguFestival) {
        const date = holiday.date.iso;
        const dateKey = date.substring(5); // Get MM-DD format
        filtered[dateKey] = holiday.name;
      }
    });
    
    return filtered;
  }

  getHolidayInfo(year, month, day) {
    if (!this.holidays[year]) return null;
    
    const monthStr = String(month + 1).padStart(2, '0');
    const dayStr = String(day).padStart(2, '0');
    const key = `${monthStr}-${dayStr}`;
    
    return this.holidays[year][key] || null;
  }

  // Data persistence
  loadData() {
    try {
      const savedMarks = localStorage.getItem('doodhdaily-marks');
      if (savedMarks) {
        this.markedDates = new Set(JSON.parse(savedMarks));
      }

      const savedMonths = localStorage.getItem('doodhdaily-selected-months');
      if (savedMonths) {
        this.selectedMonths = new Set(JSON.parse(savedMonths));
      }

      const prices = localStorage.getItem('doodhdaily-prices');
      if (prices) {
        const data = JSON.parse(prices);
        if (data.price1L) document.getElementById('price-1l').value = data.price1L;
        if (data.price05L) document.getElementById('price-05l').value = data.price05L;
        if (data.quantity) document.getElementById('quantity').value = data.quantity;
      }
    } catch (e) {
      console.error('Error loading data:', e);
    }
  }

  saveData() {
    try {
      localStorage.setItem('doodhdaily-marks', JSON.stringify([...this.markedDates]));
      localStorage.setItem('doodhdaily-selected-months', JSON.stringify([...this.selectedMonths]));
      this.saveToIndexedDB();
    } catch (e) {
      console.error('Error saving data:', e);
    }
  }

  async saveToIndexedDB() {
    try {
      const request = indexedDB.open('DoodhDaily', 1);
      request.onupgradeneeded = (e) => {
        const db = e.target.result;
        if (!db.objectStoreNames.contains('data')) {
          db.createObjectStore('data');
        }
      };
      request.onsuccess = (e) => {
        const db = e.target.result;
        const tx = db.transaction(['data'], 'readwrite');
        const store = tx.objectStore('data');
        store.put([...this.markedDates], 'marks');
        store.put([...this.selectedMonths], 'selectedMonths');
      };
    } catch (e) {
      console.log('IndexedDB not available');
    }
  }

  // Theme management
  restoreTheme() {
    const saved = localStorage.getItem('doodhdaily-theme') || 'light';
    document.documentElement.setAttribute('data-theme', saved);
    const btn = document.getElementById('theme-toggle');
    if (btn) btn.textContent = saved === 'light' ? '🌙' : '☀️';
  }

  toggleTheme() {
    const current = document.documentElement.getAttribute('data-theme') || 'light';
    const next = current === 'light' ? 'dark' : 'light';
    document.documentElement.setAttribute('data-theme', next);
    localStorage.setItem('doodhdaily-theme', next);
    document.getElementById('theme-toggle').textContent = next === 'light' ? '🌙' : '☀️';
    this.showToast(`Theme changed to ${next} mode`, 'success');
  }

  // Calendar rendering
  async renderCalendar() {
    const grid = document.getElementById('calendarGrid');
    if (!grid) return;
    grid.innerHTML = '';

    const year = this.displayDate.getFullYear();
    const month = this.displayDate.getMonth();
    
    // Load holidays for current year if not already loaded
    if (!this.holidays[year]) {
      await this.loadHolidays(year);
    }

    const firstDay = new Date(year, month, 1).getDay();
    const lastDate = new Date(year, month + 1, 0).getDate();

    // Previous month trailing dates
    const prevMonth = new Date(year, month, 0);
    const prevLastDate = prevMonth.getDate();
    
    for (let i = firstDay - 1; i >= 0; i--) {
      const day = prevLastDate - i;
      const cell = this.createCalendarCell(day, true);
      grid.appendChild(cell);
    }

    // Current month dates
    for (let day = 1; day <= lastDate; day++) {
      const cell = this.createCalendarCell(day, false, year, month);
      grid.appendChild(cell);
    }

    // Next month leading dates
    const totalCells = grid.children.length;
    const remainingCells = 42 - totalCells;
    
    for (let day = 1; day <= remainingCells; day++) {
      const cell = this.createCalendarCell(day, true);
      grid.appendChild(cell);
    }
  }

  createCalendarCell(day, isOtherMonth, year = null, month = null) {
    const cell = document.createElement('div');
    cell.className = 'calendar-day';
    
    if (isOtherMonth) {
      cell.classList.add('other-month');
      cell.innerHTML = `<span class="day-number">${day}</span>`;
      return cell;
    }

    const dateStr = this.formatDate(year, month, day);
    const isToday = this.isToday(year, month, day);
    const isMarked = this.markedDates.has(dateStr);
    const isSunday = new Date(year, month, day).getDay() === 0;
    const holidayInfo = this.getHolidayInfo(year, month, day);

    if (isToday) cell.classList.add('today');
    if (isSunday) cell.classList.add('sunday');
    if (holidayInfo) {
      cell.classList.add('holiday');
      cell.setAttribute('data-holiday', holidayInfo);
    }

    if (isMarked) {
      cell.classList.add('marked');
      cell.innerHTML = `<span class="day-number">${day}</span><span class="milk-icon">🥛</span>`;
    } else {
      cell.innerHTML = `<span class="day-number">${day}</span>`;
    }

    if (holidayInfo) {
      cell.innerHTML += '<span class="holiday-indicator">★</span>';
    }

    cell.addEventListener('click', () => this.handleDayClick(year, month, day, dateStr, isMarked));
    
    if (holidayInfo) {
      this.addLongPressListener(cell, holidayInfo);
    }

    cell.setAttribute('tabindex', '0');
    cell.setAttribute('role', 'button');

    return cell;
  }

  addLongPressListener(element, holidayInfo) {
    let pressTimer;
    let isPressed = false;
    
    const startPress = (e) => {
      isPressed = true;
      pressTimer = setTimeout(() => {
        if (isPressed) {
          this.showHolidayModal(holidayInfo);
        }
      }, 600);
    };

    const cancelPress = () => {
      isPressed = false;
      clearTimeout(pressTimer);
    };

    element.addEventListener('mousedown', startPress);
    element.addEventListener('touchstart', startPress);
    element.addEventListener('mouseup', cancelPress);
    element.addEventListener('mouseleave', cancelPress);
    element.addEventListener('touchend', cancelPress);
    element.addEventListener('touchcancel', cancelPress);
  }

  showHolidayModal(holidayInfo) {
    const modal = document.getElementById('holidayModal');
    const title = document.getElementById('holidayTitle');
    const description = document.getElementById('holidayDescription');
    
    title.textContent = `🎉 ${holidayInfo}`;
    description.textContent = `Today is ${holidayInfo}. Wishing you joy and prosperity on this auspicious day!`;
    
    modal.classList.remove('hidden');
  }

  // Date utilities
  formatDate(year, month, day) {
    return `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
  }

  isToday(year, month, day) {
    const today = new Date();
    return year === today.getFullYear() && 
           month === today.getMonth() && 
           day === today.getDate();
  }

  updateMonthYearDisplay() {
    const el = document.getElementById('currentMonthYear');
    if (el) {
      el.textContent = `${this.months[this.displayDate.getMonth()]} ${this.displayDate.getFullYear()}`;
    }
  }

  // Day click handling
  handleDayClick(year, month, day, dateStr, isMarked) {
    this.currentClickedDate = { year, month, day, dateStr };
    const monthName = this.months[month];
    
    this.currentAction = isMarked ? 'remove' : 'add';
    const title = isMarked ? 'Remove Milk Purchase' : 'Mark Milk Purchase';
    const message = isMarked 
      ? `Remove milk purchase for ${monthName} ${day}, ${year}?`
      : `Mark ${monthName} ${day}, ${year} as a Milk Purchased day?`;
    
    this.showModal(title, message);
  }

  showModal(title, message) {
    const modal = document.getElementById('confirmationModal');
    const modalTitle = document.getElementById('modalTitle');
    const modalMessage = document.getElementById('modalMessage');

    if (modal && modalTitle && modalMessage) {
      modalTitle.textContent = title;
      modalMessage.textContent = message;
      modal.style.display = 'flex';
    }
  }

  hideModal() {
    const modal = document.getElementById('confirmationModal');
    if (modal) modal.style.display = 'none';
    this.currentAction = null;
    this.currentClickedDate = null;
  }

  handleModalConfirm() {
    if (!this.currentClickedDate) return;

    const { dateStr, month, day } = this.currentClickedDate;

    if (this.currentAction === 'add') {
      this.markedDates.add(dateStr);
      this.showToast(`✅ Marked ${this.months[month]} ${day} as milk purchased`, 'success');
    } else if (this.currentAction === 'remove') {
      this.markedDates.delete(dateStr);
      this.showToast(`❌ Removed milk purchase for ${this.months[month]} ${day}`, 'info');
    }

    this.saveData();
    this.hideModal();
    this.renderCalendar();
  }

  // Navigation
  async goToPreviousMonth() {
    this.displayDate.setMonth(this.displayDate.getMonth() - 1);
    const year = this.displayDate.getFullYear();
    if (!this.holidays[year]) {
      await this.loadHolidays(year);
    }
    this.renderCalendar();
    this.updateMonthYearDisplay();
  }

  async goToNextMonth() {
    this.displayDate.setMonth(this.displayDate.getMonth() + 1);
    const year = this.displayDate.getFullYear();
    if (!this.holidays[year]) {
      await this.loadHolidays(year);
    }
    this.renderCalendar();
    this.updateMonthYearDisplay();
  }

  goToToday() {
    this.displayDate = new Date();
    this.renderCalendar();
    this.updateMonthYearDisplay();
    this.showToast('Jumped to today', 'success');
  }

  // Calculator
  toggleCalculator() {
    const calc = document.getElementById('calculator');
    const calcBtn = document.getElementById('calculator-open');
    
    if (calc.classList.contains('hidden')) {
      calc.classList.remove('hidden');
      calcBtn.classList.add('highlighted');
      
      setTimeout(() => {
        calc.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 100);
      
      this.showToast('Calculator opened', 'info');
    } else {
      calc.classList.add('hidden');
      calcBtn.classList.remove('highlighted');
      this.showToast('Calculator closed', 'info');
    }
  }

  // Multi-year month selector
  updateCalculatorYear() {
    document.getElementById('current-year').textContent = this.currentCalculatorYear;
  }

  renderMonthSelector() {
    const grid = document.getElementById('months-grid');
    if (!grid) return;
    
    grid.innerHTML = '';
    
    for (let i = 0; i < 12; i++) {
      const monthKey = `${this.currentCalculatorYear}-${String(i + 1).padStart(2, '0')}`;
      const isSelected = this.selectedMonths.has(monthKey);
      
      const wrapper = document.createElement('div');
      wrapper.className = `month-checkbox ${isSelected ? 'selected' : ''}`;
      wrapper.innerHTML = `
        <input type="checkbox" id="month-${i}" ${isSelected ? 'checked' : ''} />
        <label for="month-${i}">${this.months[i].substring(0, 3)}</label>
      `;
      
      wrapper.addEventListener('click', () => this.toggleMonth(i));
      grid.appendChild(wrapper);
    }
    
    this.updateSelectedSummary();
  }

  toggleMonth(monthIndex) {
    const monthKey = `${this.currentCalculatorYear}-${String(monthIndex + 1).padStart(2, '0')}`;
    
    if (this.selectedMonths.has(monthKey)) {
      this.selectedMonths.delete(monthKey);
    } else {
      this.selectedMonths.add(monthKey);
    }
    
    this.saveData();
    this.renderMonthSelector();
  }

  selectAllMonths() {
    for (let i = 0; i < 12; i++) {
      const monthKey = `${this.currentCalculatorYear}-${String(i + 1).padStart(2, '0')}`;
      this.selectedMonths.add(monthKey);
    }
    this.saveData();
    this.renderMonthSelector();
    this.showToast(`Selected all months for ${this.currentCalculatorYear}`, 'success');
  }

  clearAllMonths() {
    for (let i = 0; i < 12; i++) {
      const monthKey = `${this.currentCalculatorYear}-${String(i + 1).padStart(2, '0')}`;
      this.selectedMonths.delete(monthKey);
    }
    this.saveData();
    this.renderMonthSelector();
    this.showToast(`Cleared all months for ${this.currentCalculatorYear}`, 'info');
  }

  updateSelectedSummary() {
    const summaryText = document.getElementById('summary-text');
    if (!summaryText) return;
    
    const selected = [...this.selectedMonths].sort();
    
    if (selected.length === 0) {
      summaryText.textContent = 'None';
      return;
    }
    
    const grouped = {};
    selected.forEach(monthKey => {
      const [year, month] = monthKey.split('-');
      if (!grouped[year]) grouped[year] = [];
      grouped[year].push(this.months[parseInt(month) - 1].substring(0, 3));
    });
    
    const summary = Object.entries(grouped).map(([year, months]) => {
      return `${year}: ${months.join(', ')}`;
    }).join(' | ');
    
    summaryText.textContent = summary;
  }

  changeCalculatorYear(direction) {
    this.currentCalculatorYear += direction;
    this.updateCalculatorYear();
    this.renderMonthSelector();
  }

  calculateCosts() {
    const price1L = parseFloat(document.getElementById('price-1l').value) || 0;
    const price05L = parseFloat(document.getElementById('price-05l').value) || 0;
    const quantity = parseFloat(document.getElementById('quantity').value) || 1;

    if (price1L === 0 && price05L === 0) {
      this.showToast('Please enter at least one price', 'warning');
      return;
    }

    if (this.selectedMonths.size === 0) {
      this.showToast('Please select at least one month', 'warning');
      return;
    }

    // Save prices
    localStorage.setItem('doodhdaily-prices', JSON.stringify({
      price1L, price05L, quantity
    }));

    // Calculate based on selected months
    let totalDays = 0;
    
    this.markedDates.forEach(dateStr => {
      const date = new Date(dateStr);
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      
      if (this.selectedMonths.has(monthKey)) {
        totalDays++;
      }
    });

    const totalQuantity = totalDays * quantity;
    const pricePerUnit = quantity === 1 ? price1L : price05L;
    const totalCost = totalDays * pricePerUnit;

    // Display results
    document.getElementById('total-days').textContent = totalDays;
    document.getElementById('total-quantity').textContent = `${totalQuantity} L`;
    document.getElementById('total-cost').textContent = `₹${totalCost.toFixed(2)}`;
    
    const resultsSection = document.getElementById('calc-results');
    resultsSection.classList.remove('hidden');

    this.showToast('Calculation completed successfully!', 'success');
  }

  // Month/Year picker
  openMonthPicker() {
    const overlay = document.getElementById('picker-overlay');
    const yearSpan = document.getElementById('picker-year');
    
    this.pickerYear = this.displayDate.getFullYear();
    if (yearSpan) yearSpan.textContent = this.pickerYear;
    
    this.buildMonthGrid();
    if (overlay) overlay.classList.remove('hidden');
  }

  buildMonthGrid() {
    const grid = document.getElementById('picker-months');
    if (!grid) return;
    
    grid.innerHTML = '';
    
    for (let i = 0; i < 12; i++) {
      const btn = document.createElement('button');
      btn.textContent = this.months[i].substring(0, 3);
      btn.addEventListener('click', async () => {
        this.displayDate.setFullYear(this.pickerYear);
        this.displayDate.setMonth(i);
        this.closeMonthPicker();
        
        const year = this.displayDate.getFullYear();
        if (!this.holidays[year]) {
          await this.loadHolidays(year);
        }
        
        this.renderCalendar();
        this.updateMonthYearDisplay();
      });
      grid.appendChild(btn);
    }
  }

  closeMonthPicker() {
    const overlay = document.getElementById('picker-overlay');
    if (overlay) overlay.classList.add('hidden');
  }

  // Event binding
  bindEvents() {
    // Theme toggle
    const themeBtn = document.getElementById('theme-toggle');
    if (themeBtn) themeBtn.addEventListener('click', () => this.toggleTheme());

    // Navigation
    const prevBtn = document.getElementById('prevMonth');
    if (prevBtn) prevBtn.addEventListener('click', () => this.goToPreviousMonth());

    const nextBtn = document.getElementById('nextMonth');
    if (nextBtn) nextBtn.addEventListener('click', () => this.goToNextMonth());

    const todayBtn = document.getElementById('today-btn');
    if (todayBtn) todayBtn.addEventListener('click', () => this.goToToday());

    // Calculator
    const calcBtn = document.getElementById('calculator-open');
    if (calcBtn) calcBtn.addEventListener('click', () => this.toggleCalculator());

    const calculateBtn = document.getElementById('calculate-btn');
    if (calculateBtn) calculateBtn.addEventListener('click', () => this.calculateCosts());

    // Month selector controls
    const selectAllBtn = document.getElementById('select-all-months');
    if (selectAllBtn) selectAllBtn.addEventListener('click', () => this.selectAllMonths());

    const clearAllBtn = document.getElementById('clear-all-months');
    if (clearAllBtn) clearAllBtn.addEventListener('click', () => this.clearAllMonths());

    // Year navigation
    const yearPrevBtn = document.getElementById('year-prev');
    if (yearPrevBtn) yearPrevBtn.addEventListener('click', () => this.changeCalculatorYear(-1));

    const yearNextBtn = document.getElementById('year-next');
    if (yearNextBtn) yearNextBtn.addEventListener('click', () => this.changeCalculatorYear(1));

    // Month picker
    const monthYear = document.getElementById('currentMonthYear');
    if (monthYear) monthYear.addEventListener('click', () => this.openMonthPicker());

    const pickerClose = document.getElementById('picker-close');
    if (pickerClose) pickerClose.addEventListener('click', () => this.closeMonthPicker());

    const pickerPrev = document.getElementById('picker-prev-year');
    if (pickerPrev) pickerPrev.addEventListener('click', () => {
      this.pickerYear--;
      document.getElementById('picker-year').textContent = this.pickerYear;
      this.buildMonthGrid();
    });

    const pickerNext = document.getElementById('picker-next-year');
    if (pickerNext) pickerNext.addEventListener('click', () => {
      this.pickerYear++;
      document.getElementById('picker-year').textContent = this.pickerYear;
      this.buildMonthGrid();
    });

    // Modal events
    const modalYes = document.getElementById('modalYes');
    if (modalYes) modalYes.addEventListener('click', () => this.handleModalConfirm());

    const modalNo = document.getElementById('modalNo');
    if (modalNo) modalNo.addEventListener('click', () => this.hideModal());

    const modal = document.getElementById('confirmationModal');
    if (modal) modal.addEventListener('click', (e) => {
      if (e.target.id === 'confirmationModal') this.hideModal();
    });

    // Holiday modal
    const holidayClose = document.getElementById('holidayClose');
    if (holidayClose) holidayClose.addEventListener('click', () => {
      document.getElementById('holidayModal').classList.add('hidden');
    });

    // Total cost click to scroll
    const totalCost = document.getElementById('total-cost');
    if (totalCost) totalCost.addEventListener('click', () => {
      document.getElementById('calc-results').scrollIntoView({ behavior: 'smooth' });
      this.showToast('Viewing detailed results', 'info');
    });
  }
}

/* ---------- Print / Save ---------- */
const printBtn = document.getElementById('print-btn');
if (printBtn) {
  printBtn.addEventListener('click', () => {
    /* 1. Ensure results are visible */
    const results = document.getElementById('calc-results');
    if (results && results.classList.contains('hidden')) {
      app.calculateCosts();        // Re-calculate if needed
    }

    /* 2. Let the browser open its native print dialog */
    window.print();
  });
}


// Initialize app
let app;
function initApp() {
  if (document.getElementById('calendarGrid')) {
    app = new DoodhDaily();
    window.doodhApp = app; // For debugging
  } else {
    setTimeout(initApp, 100);
  }
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initApp);
} else {
  initApp();
}
