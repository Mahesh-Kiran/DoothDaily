class DoodhDaily {
  constructor() {
    // Core properties
    this.currentDate = new Date();
    this.displayDate = new Date();
    this.markedDates = new Set();
    this.dayNotes = new Map();
    this.selectedMonths = new Set();
    this.currentCalculatorYear = new Date().getFullYear();
    this.holidays = {};
    
    // Local notification settings
    this.notificationSettings = {
      enabled: false,
      time: '12:00' // Fixed at 12:00 PM
    };

    // API settings (for holidays only)
    this.apiKey = "0bwbAvyD0tXE4cO1IHzaI0OAle7VK3ai";
    
    this.months = [
      "January", "February", "March", "April", "May", "June",
      "July", "August", "September", "October", "November", "December"
    ];

    this.currentDayData = null;
    this.pickerYear = new Date().getFullYear();
    this.deferredPrompt = null;
    
    this.init();
  }

  async init() {
    try {
      this.initToastContainer();
      this.loadData();
      this.loadNotificationSettings();
      this.restoreTheme();
      
      // Initialize local notifications (no Firebase)
      await this.initLocalNotifications();
      
      this.bindEvents();
      await this.loadAllHolidays(this.displayDate.getFullYear(), this.displayDate.getMonth());
      this.renderCalendar();
      this.updateMonthYearDisplay();
      this.updateCalculatorYear();
      this.renderMonthSelector();
      
      this.setupInstallPrompt();
      
      this.showToast('🥛 DoodhDaily loaded successfully!', 'success');
      
    } catch (error) {
      console.error('Initialization error:', error);
      this.showToast('App initialization failed', 'error');
    }
  }

  // Initialize local notification system
  async initLocalNotifications() {
    try {
      // Request notification permission
      const permission = await Notification.requestPermission();
      
      if (permission === 'granted') {
        this.updateNotificationStatus('granted', '✅ Notifications enabled');
        
        // Register service worker for notifications
        if ('serviceWorker' in navigator) {
          const registration = await navigator.serviceWorker.register('/sw.js');
          console.log('Service Worker registered:', registration);
          
          // Listen for service worker messages
          navigator.serviceWorker.addEventListener('message', (event) => {
            this.handleServiceWorkerMessage(event.data);
          });
          
          // Schedule initial notification if enabled
          if (this.notificationSettings.enabled) {
            this.scheduleNextNotification();
          }
        }
      } else {
        this.updateNotificationStatus('denied', '❌ Notifications permission denied');
      }
    } catch (error) {
      console.error('Local notification setup failed:', error);
      this.updateNotificationStatus('error', '❌ Notifications unavailable');
    }
  }

  // Update notification status in UI
  updateNotificationStatus(status, message) {
    const statusEl = document.getElementById('notification-status');
    const iconEl = document.getElementById('notification-icon');
    const textEl = document.getElementById('notification-text');
    
    if (statusEl && iconEl && textEl) {
      switch (status) {
        case 'granted':
          statusEl.style.background = '#e8f5e8';
          statusEl.style.borderColor = '#4caf50';
          iconEl.textContent = '✅';
          break;
        case 'denied':
          statusEl.style.background = '#ffebee';
          statusEl.style.borderColor = '#f44336';
          iconEl.textContent = '❌';
          break;
        case 'error':
          statusEl.style.background = '#fff3cd';
          statusEl.style.borderColor = '#ff9800';
          iconEl.textContent = '⚠️';
          break;
        default:
          statusEl.style.background = '#e3f2fd';
          statusEl.style.borderColor = '#2196f3';
          iconEl.textContent = '⏳';
      }
      textEl.textContent = message;
    }
  }

  // Schedule next daily notification at 12:00 PM
  scheduleNextNotification() {
    if (!this.notificationSettings.enabled) return;

    const now = new Date();
    const nextNotification = new Date();
    
    // Set to 12:00 PM today
    nextNotification.setHours(12, 0, 0, 0);
    
    // If it's already past 12 PM today, schedule for tomorrow
    if (nextNotification <= now) {
      nextNotification.setDate(nextNotification.getDate() + 1);
    }

    const timeUntilNext = nextNotification.getTime() - now.getTime();
    
    console.log(`Next notification scheduled for: ${nextNotification.toLocaleString()}`);
    console.log(`Time until notification: ${Math.round(timeUntilNext / 1000 / 60)} minutes`);

    // Schedule the notification
    setTimeout(() => {
      this.showDailyNotification();
      // Schedule next day's notification
      this.scheduleNextNotification();
    }, timeUntilNext);

    // Store the scheduled time
    localStorage.setItem('doodhdaily-next-notification', nextNotification.toISOString());
  }

  // Show the daily notification using Service Worker
  async showDailyNotification() {
    try {
      const registration = await navigator.serviceWorker.ready;
      
      registration.showNotification('🥛 Daily Milk Reminder', {
        body: 'Did you buy milk today?',
        icon: '/icon-192.png',
        badge: '/icon-192.png',
        tag: 'daily-milk-reminder',
        requireInteraction: false,
        silent: false,
        timestamp: Date.now(),
        data: {
          type: 'milk-reminder',
          date: new Date().toISOString().split('T')[0],
          url: '/'
        }
      });
      
      console.log('Daily notification sent at:', new Date().toLocaleString());
    } catch (error) {
      console.error('Error showing notification:', error);
    }
  }

  // Handle messages from service worker
  handleServiceWorkerMessage(data) {
    if (data.type === 'notification-clicked') {
      console.log('Notification clicked, app opened');
      this.showToast('📱 Welcome back! Don\'t forget to mark your milk purchase.', 'info');
    }
  }

  // Load ALL holidays (not just Telugu)
  async loadAllHolidays(year, month) {
    const cacheKey = `all-holidays-${year}-${String(month + 1).padStart(2, '0')}`;
    const cached = localStorage.getItem(cacheKey);

    // Check cache (2 months validity)
    if (cached) {
      try {
        const data = JSON.parse(cached);
        if (Date.now() - data.timestamp < 60 * 24 * 60 * 60 * 1000) { // 2 months
          if (!this.holidays[year]) this.holidays[year] = {};
          Object.assign(this.holidays[year], data.holidays);
          return;
        }
      } catch (e) {
        console.error('Error parsing cached holidays:', e);
      }
    }

    try {
      this.showToast('Loading holidays...', 'info');
      const response = await fetch(
        `https://calendarific.com/api/v2/holidays?api_key=${this.apiKey}&country=IN&year=${year}&month=${month + 1}`
      );

      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);

      const data = await response.json();
      const allHolidays = this.mapAllHolidays(data.response.holidays);

      const cacheData = {
        holidays: allHolidays,
        timestamp: Date.now()
      };

      localStorage.setItem(cacheKey, JSON.stringify(cacheData));

      if (!this.holidays[year]) this.holidays[year] = {};
      Object.assign(this.holidays[year], allHolidays);

      this.showToast('All holidays loaded successfully', 'success');
    } catch (error) {
      console.error('Error fetching holidays:', error);
      this.showToast('Could not load holidays', 'warning');
    }
  }

  // Map ALL holidays
  mapAllHolidays(holidays) {
    const mapped = {};
    holidays.forEach(holiday => {
      if (holiday && holiday.date && holiday.date.iso) {
        const dateKey = holiday.date.iso.substring(5); // Get MM-DD format
        mapped[dateKey] = holiday.name;
      }
    });
    return mapped;
  }

  getHolidayInfo(year, month, day) {
    if (!this.holidays[year]) return null;

    const monthStr = String(month + 1).padStart(2, '0');
    const dayStr = String(day).padStart(2, '0');
    const key = `${monthStr}-${dayStr}`;

    return this.holidays[year][key] || null;
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
    }, 4000);
  }

  // Data persistence
  loadData() {
    try {
      const savedMarks = localStorage.getItem('doodhdaily-marks');
      if (savedMarks) {
        this.markedDates = new Set(JSON.parse(savedMarks));
      }

      const savedNotes = localStorage.getItem('doodhdaily-notes');
      if (savedNotes) {
        this.dayNotes = new Map(JSON.parse(savedNotes));
      }

      const savedMonths = localStorage.getItem('doodhdaily-selected-months');
      if (savedMonths) {
        this.selectedMonths = new Set(JSON.parse(savedMonths));
      }

      const prices = localStorage.getItem('doodhdaily-prices');
      if (prices) {
        const data = JSON.parse(prices);
        const price1LEl = document.getElementById('price-1l');
        const price05LEl = document.getElementById('price-05l');
        const quantityEl = document.getElementById('quantity');
        
        if (data.price1L && price1LEl) price1LEl.value = data.price1L;
        if (data.price05L && price05LEl) price05LEl.value = data.price05L;
        if (data.quantity && quantityEl) quantityEl.value = data.quantity;
      }
    } catch (e) {
      console.error('Error loading data:', e);
    }
  }

  saveData() {
    try {
      localStorage.setItem('doodhdaily-marks', JSON.stringify([...this.markedDates]));
      localStorage.setItem('doodhdaily-notes', JSON.stringify([...this.dayNotes]));
      localStorage.setItem('doodhdaily-selected-months', JSON.stringify([...this.selectedMonths]));
    } catch (e) {
      console.error('Error saving data:', e);
    }
  }

  // Theme management
  restoreTheme() {
    const saved = localStorage.getItem('doodhdaily-theme') || 'light';
    document.documentElement.setAttribute('data-theme', saved);
    const btn = document.getElementById('theme-toggle');
    if (btn) {
      const icon = btn.querySelector('.btn-icon');
      if (icon) icon.textContent = saved === 'light' ? '🌙' : '☀️';
    }
  }

  toggleTheme() {
    const current = document.documentElement.getAttribute('data-theme') || 'light';
    const next = current === 'light' ? 'dark' : 'light';
    document.documentElement.setAttribute('data-theme', next);
    localStorage.setItem('doodhdaily-theme', next);
    
    const btn = document.getElementById('theme-toggle');
    if (btn) {
      const icon = btn.querySelector('.btn-icon');
      if (icon) icon.textContent = next === 'light' ? '🌙' : '☀️';
    }
    
    this.showToast(`Theme changed to ${next} mode`, 'success');
  }

  // Enhanced calendar rendering
  async renderCalendar() {
    const grid = document.getElementById('calendarGrid');
    if (!grid) return;
    grid.innerHTML = '';

    const year = this.displayDate.getFullYear();
    const month = this.displayDate.getMonth();

    // Load holidays for current year if not already loaded
    if (!this.holidays[year]) {
      await this.loadAllHolidays(year, month);
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

  // Enhanced calendar cell creation with double-click support
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
    const hasNotes = this.dayNotes.has(dateStr);

    if (isToday) cell.classList.add('today');
    if (isMarked) cell.classList.add('marked');
    if (isSunday) cell.classList.add('sunday');
    if (holidayInfo) {
      cell.classList.add('holiday');
      cell.setAttribute('data-holiday', holidayInfo);
    }

    // Build cell content
    let cellContent = `<span class="day-number">${day}</span>`;
    if (isMarked) {
      cellContent += '<span class="milk-icon">🥛</span>';
    }
    if (hasNotes) {
      cellContent += '<span class="notes-indicator">📝</span>';
    }
    if (holidayInfo) {
      cellContent += '<span class="holiday-indicator">★</span>';
    }
    
    cell.innerHTML = cellContent;

    // Enhanced click handler with double-click detection for elderly users
    let clickCount = 0;
    cell.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      
      clickCount++;
      
      if (clickCount === 1) {
        // Single click - normal day selection
        setTimeout(() => {
          if (clickCount === 1) {
            this.handleDayClick(year, month, day, dateStr, isMarked, holidayInfo);
          }
          clickCount = 0;
        }, 300);
      } else if (clickCount === 2) {
        // Double click - quick mark milk and show notes
        this.handleQuickMilkMark(year, month, day, dateStr, isMarked);
        clickCount = 0;
      }
    });

    // Long press for holidays
    if (holidayInfo) {
      this.addLongPressListener(cell, holidayInfo);
    }

    cell.setAttribute('tabindex', '0');
    cell.setAttribute('role', 'button');
    cell.setAttribute('aria-label', `${day} ${this.months[month]} ${year}${isMarked ? ' - Milk purchased' : ''}${holidayInfo ? ' - Holiday: ' + holidayInfo : ''}${hasNotes ? ' - Has notes' : ''}`);

    return cell;
  }

  // Quick milk mark for elderly users (double-click)
  handleQuickMilkMark(year, month, day, dateStr, isMarked) {
    // Toggle milk status
    if (isMarked) {
      this.markedDates.delete(dateStr);
      this.showToast('❌ Milk purchase removed', 'info');
    } else {
      this.markedDates.add(dateStr);
      this.showToast('✅ Milk marked! Double-tap again to add notes.', 'success');
    }
    
    this.saveData();
    this.renderCalendar();
    
    // Auto-open day modal for notes after marking
    setTimeout(() => {
      this.currentDayData = { year, month, day, dateStr, isMarked: !isMarked, holidayInfo: this.getHolidayInfo(year, month, day) };
      this.showDayModal();
      
      // Focus on notes field
      setTimeout(() => {
        const notesField = document.getElementById('day-notes');
        if (notesField) {
          notesField.focus();
        }
      }, 100);
    }, 500);
  }

  // Enhanced day click handling
  handleDayClick(year, month, day, dateStr, isMarked, holidayInfo = null) {
    this.currentDayData = { year, month, day, dateStr, isMarked, holidayInfo };
    this.showDayModal();
  }

  // Enhanced day modal with double-click support for milk button
  showDayModal() {
    const modal = document.getElementById('day-modal');
    const title = document.getElementById('day-modal-title');
    const milkBtn = document.getElementById('milk-purchase-btn');
    const milkBtnText = document.getElementById('milk-btn-text');
    const notesField = document.getElementById('day-notes');
    const holidayInfo = document.getElementById('holiday-info');
    const holidayName = document.getElementById('holiday-name');

    if (!modal || !this.currentDayData) return;

    const { year, month, day, dateStr, isMarked, holidayInfo: holiday } = this.currentDayData;
    
    title.textContent = `📅 ${day} ${this.months[month]} ${year}`;
    
    // Update milk button
    if (isMarked) {
      milkBtn.classList.add('marked');
      milkBtnText.textContent = '✅ Milk Purchased This Day (Tap to Remove)';
    } else {
      milkBtn.classList.remove('marked');
      milkBtnText.textContent = '🥛 Mark Milk Purchase This Day';
    }
    
    // Load existing notes
    notesField.value = this.dayNotes.get(dateStr) || '';

    // Show holiday info if applicable
    if (holiday) {
      holidayInfo.classList.remove('hidden');
      holidayName.textContent = holiday;
    } else {
      holidayInfo.classList.add('hidden');
    }

    modal.classList.remove('hidden');
  }

  // Enhanced milk button with double-click support
  toggleMilkPurchase() {
    if (!this.currentDayData) return;

    const { dateStr } = this.currentDayData;
    const milkBtn = document.getElementById('milk-purchase-btn');
    const milkBtnText = document.getElementById('milk-btn-text');

    if (this.markedDates.has(dateStr)) {
      this.markedDates.delete(dateStr);
      this.currentDayData.isMarked = false;
      milkBtn.classList.remove('marked');
      milkBtnText.textContent = '🥛 Mark Milk Purchase This Day';
      this.showToast('❌ Milk purchase removed', 'info');
    } else {
      this.markedDates.add(dateStr);
      this.currentDayData.isMarked = true;
      milkBtn.classList.add('marked');
      milkBtnText.textContent = '✅ Milk Purchased This Day (Tap to Remove)';
      this.showToast('✅ Milk purchase marked!', 'success');
    }

    this.saveData();
    this.renderCalendar();
  }

  saveDayData() {
    if (!this.currentDayData) return;

    const { dateStr } = this.currentDayData;
    const notesField = document.getElementById('day-notes');

    // Save notes
    const notes = notesField.value.trim();
    if (notes) {
      this.dayNotes.set(dateStr, notes);
    } else {
      this.dayNotes.delete(dateStr);
    }

    this.saveData();
    this.renderCalendar();
    this.closeDayModal();
    
    this.showToast('✅ Day data saved successfully!', 'success');
  }

  closeDayModal() {
    const modal = document.getElementById('day-modal');
    if (modal) modal.classList.add('hidden');
    this.currentDayData = null;
  }

  // Long press listener for holidays
  addLongPressListener(element, holidayInfo) {
    let pressTimer;
    let isLongPress = false;

    const startPress = (e) => {
      isLongPress = false;
      pressTimer = setTimeout(() => {
        isLongPress = true;
        this.showHolidayModal(holidayInfo);
        if (navigator.vibrate) {
          navigator.vibrate(200);
        }
      }, 800);
    };

    const endPress = () => {
      clearTimeout(pressTimer);
      return !isLongPress;
    };

    element.addEventListener('mousedown', startPress);
    element.addEventListener('touchstart', startPress, { passive: true });
    element.addEventListener('mouseup', endPress);
    element.addEventListener('touchend', endPress);
    element.addEventListener('mouseleave', () => clearTimeout(pressTimer));
    element.addEventListener('touchcancel', () => clearTimeout(pressTimer));
  }

  showHolidayModal(holidayInfo) {
    const modal = document.getElementById('holidayModal');
    const title = document.getElementById('holidayTitle');
    const description = document.getElementById('holidayDescription');

    if (title) title.textContent = `🎉 ${holidayInfo}`;
    if (description) description.textContent = `Today is ${holidayInfo}. Wishing you joy and prosperity on this auspicious day!`;
    if (modal) modal.classList.remove('hidden');
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

  // Navigation
  async goToPreviousMonth() {
    this.displayDate.setMonth(this.displayDate.getMonth() - 1);
    const year = this.displayDate.getFullYear();
    const month = this.displayDate.getMonth();
    
    if (!this.holidays[year]) {
      await this.loadAllHolidays(year, month);
    }
    
    this.renderCalendar();
    this.updateMonthYearDisplay();
  }

  async goToNextMonth() {
    this.displayDate.setMonth(this.displayDate.getMonth() + 1);
    const year = this.displayDate.getFullYear();
    const month = this.displayDate.getMonth();
    
    if (!this.holidays[year]) {
      await this.loadAllHolidays(year, month);
    }
    
    this.renderCalendar();
    this.updateMonthYearDisplay();
  }

  goToToday() {
    const today = new Date();
    this.displayDate = new Date(today);
    this.renderCalendar();
    this.updateMonthYearDisplay();
    
    // Scroll to today's date if visible and highlight it
    setTimeout(() => {
      const todayCell = document.querySelector('.calendar-day.today');
      if (todayCell) {
        todayCell.scrollIntoView({ behavior: 'smooth', block: 'center' });
        todayCell.style.animation = 'pulse 1s ease-in-out';
      }
    }, 100);
    
    this.showToast('📅 Jumped to today', 'success');
  }

  // Calculator functionality
  toggleCalculator() {
    const calc = document.getElementById('calculator');
    const calcBtn = document.getElementById('calculator-open');

    if (!calc || !calcBtn) return;

    if (calc.classList.contains('hidden')) {
      calc.classList.remove('hidden');
      calcBtn.classList.add('highlighted');

      setTimeout(() => {
        calc.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 100);

      this.showToast('🧮 Calculator opened', 'info');
    } else {
      calc.classList.add('hidden');
      calcBtn.classList.remove('highlighted');
      this.showToast('Calculator closed', 'info');
    }
  }

  updateCalculatorYear() {
    const el = document.getElementById('current-year');
    if (el) el.textContent = this.currentCalculatorYear;
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
    this.showToast(`✓ Selected all months for ${this.currentCalculatorYear}`, 'success');
  }

  clearAllMonths() {
    for (let i = 0; i < 12; i++) {
      const monthKey = `${this.currentCalculatorYear}-${String(i + 1).padStart(2, '0')}`;
      this.selectedMonths.delete(monthKey);
    }
    this.saveData();
    this.renderMonthSelector();
    this.showToast(`✗ Cleared all months for ${this.currentCalculatorYear}`, 'info');
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

  // Enhanced calculation with streak
  calculateCosts() {
    const price1L = parseFloat(document.getElementById('price-1l')?.value) || 0;
    const price05L = parseFloat(document.getElementById('price-05l')?.value) || 0;
    const quantity = parseFloat(document.getElementById('quantity')?.value) || 1;

    if (price1L === 0 && price05L === 0) {
      this.showToast('⚠️ Please enter at least one price', 'warning');
      return;
    }

    if (this.selectedMonths.size === 0) {
      this.showToast('⚠️ Please select at least one month', 'warning');
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

    // Calculate current streak
    const currentStreak = this.calculateCurrentStreak();

    // Display results
    const totalDaysEl = document.getElementById('total-days');
    const totalQuantityEl = document.getElementById('total-quantity');
    const totalCostEl = document.getElementById('total-cost');
    const currentStreakEl = document.getElementById('current-streak');

    if (totalDaysEl) totalDaysEl.textContent = totalDays;
    if (totalQuantityEl) totalQuantityEl.textContent = `${totalQuantity} L`;
    if (totalCostEl) totalCostEl.textContent = `₹${totalCost.toFixed(2)}`;
    if (currentStreakEl) currentStreakEl.textContent = `${currentStreak} days`;

    const resultsSection = document.getElementById('calc-results');
    if (resultsSection) {
      resultsSection.classList.remove('hidden');
      
      // Auto-scroll to results
      setTimeout(() => {
        resultsSection.scrollIntoView({ 
          behavior: 'smooth', 
          block: 'start' 
        });
      }, 200);
    }

    this.showToast('🧮 Calculation completed!', 'success');
  }

  // Calculate current streak
  calculateCurrentStreak() {
    const today = new Date();
    let streak = 0;
    let checkDate = new Date(today);

    while (true) {
      const dateStr = this.formatDate(checkDate.getFullYear(), checkDate.getMonth(), checkDate.getDate());
      if (this.markedDates.has(dateStr)) {
        streak++;
        checkDate.setDate(checkDate.getDate() - 1);
      } else {
        break;
      }
    }

    return streak;
  }

  // Month/Year picker
  openMonthPicker() {
    const overlay = document.getElementById('picker-overlay');
    const yearSpan = document.getElementById('picker-year');

    this.pickerYear = this.displayDate.getFullYear();
    if (yearSpan) yearSpan.textContent = this.pickerYear;

    this.buildMonthPickerGrid();
    if (overlay) {
      overlay.classList.remove('hidden');
    }
  }

  buildMonthPickerGrid() {
    const grid = document.getElementById('picker-months');
    if (!grid) return;

    grid.innerHTML = '';

    for (let i = 0; i < 12; i++) {
      const btn = document.createElement('button');
      btn.className = 'month-picker-btn';
      btn.textContent = this.months[i];
      
      // Highlight current month
      if (i === this.displayDate.getMonth() && this.pickerYear === this.displayDate.getFullYear()) {
        btn.classList.add('current');
      }
      
      btn.addEventListener('click', async () => {
        this.displayDate.setFullYear(this.pickerYear);
        this.displayDate.setMonth(i);
        this.closeMonthPicker();

        await this.loadAllHolidays(this.displayDate.getFullYear(), this.displayDate.getMonth());
        this.renderCalendar();
        this.updateMonthYearDisplay();
        
        this.showToast(`📅 Switched to ${this.months[i]} ${this.pickerYear}`, 'success');
      });
      
      grid.appendChild(btn);
    }
  }

  closeMonthPicker() {
    const overlay = document.getElementById('picker-overlay');
    if (overlay) overlay.classList.add('hidden');
  }

  // Notification settings
  loadNotificationSettings() {
    const saved = localStorage.getItem('doodhdaily-notifications');
    if (saved) {
      try {
        this.notificationSettings = JSON.parse(saved);
        this.updateSettingsUI();
      } catch (e) {
        console.error('Error loading notification settings:', e);
      }
    }
  }

  saveNotificationSettings() {
    localStorage.setItem('doodhdaily-notifications', JSON.stringify(this.notificationSettings));
  }

  updateSettingsUI() {
    const enabledEl = document.getElementById('reminder-enabled');
    if (enabledEl) enabledEl.checked = this.notificationSettings.enabled;
  }

  openSettings() {
    const modal = document.getElementById('settings-modal');
    if (modal) modal.classList.remove('hidden');
  }

  closeSettings() {
    const modal = document.getElementById('settings-modal');
    if (modal) modal.classList.add('hidden');
  }

  saveSettings() {
    const enabledEl = document.getElementById('reminder-enabled');

    if (enabledEl) {
      const wasEnabled = this.notificationSettings.enabled;
      this.notificationSettings.enabled = enabledEl.checked;
      
      this.saveNotificationSettings();
      
      if (this.notificationSettings.enabled && !wasEnabled) {
        // Just enabled - schedule next notification
        this.scheduleNextNotification();
        this.showToast('✅ Daily reminders enabled at 12:00 PM!', 'success');
      } else if (!this.notificationSettings.enabled && wasEnabled) {
        // Just disabled - clear scheduled notifications
        localStorage.removeItem('doodhdaily-next-notification');
        this.showToast('❌ Daily reminders disabled', 'info');
      }
    }
    
    this.closeSettings();
  }

  // Print functionality
  printResults() {
    const results = document.getElementById('calc-results');
    if (results && results.classList.contains('hidden')) {
      this.calculateCosts();
      setTimeout(() => this.printResults(), 300);
      return;
    }

    // Add print class for styling
    document.body.classList.add('printing');
    
    // Trigger print
    window.print();
    
    // Remove print class
    setTimeout(() => {
      document.body.classList.remove('printing');
    }, 1000);
  }

  // Install prompt handling
  setupInstallPrompt() {
    window.addEventListener('beforeinstallprompt', (e) => {
      e.preventDefault();
      this.deferredPrompt = e;
      
      const installPrompt = document.getElementById('install-prompt');
      if (installPrompt) {
        installPrompt.classList.remove('hidden');
      }
    });

    window.addEventListener('appinstalled', () => {
      this.deferredPrompt = null;
      const installPrompt = document.getElementById('install-prompt');
      if (installPrompt) {
        installPrompt.classList.add('hidden');
      }
      this.showToast('🎉 DoodhDaily installed successfully!', 'success');
    });
  }

  async handleInstallClick() {
    if (this.deferredPrompt) {
      this.deferredPrompt.prompt();
      const result = await this.deferredPrompt.userChoice;
      
      if (result.outcome === 'accepted') {
        this.showToast('🎉 Installing DoodhDaily...', 'success');
      } else {
        this.showToast('Installation cancelled', 'info');
      }
      
      this.deferredPrompt = null;
      const installPrompt = document.getElementById('install-prompt');
      if (installPrompt) {
        installPrompt.classList.add('hidden');
      }
    } else {
      this.showToast('💡 Use your browser\'s "Add to Home Screen" option', 'info');
    }
  }

  dismissInstallPrompt() {
    const installPrompt = document.getElementById('install-prompt');
    if (installPrompt) {
      installPrompt.classList.add('hidden');
    }
  }

  // Enhanced event binding with double-click support
  bindEvents() {
    // Install buttons
    const installBtn = document.getElementById('install-btn');
    if (installBtn) {
      installBtn.addEventListener('click', (e) => {
        e.preventDefault();
        this.handleInstallClick();
      });
    }

    const dismissBtn = document.getElementById('dismiss-install');
    if (dismissBtn) {
      dismissBtn.addEventListener('click', (e) => {
        e.preventDefault();
        this.dismissInstallPrompt();
      });
    }

    // Settings
    const settingsBtn = document.getElementById('settings-btn');
    if (settingsBtn) {
      settingsBtn.addEventListener('click', (e) => {
        e.preventDefault();
        this.openSettings();
      });
    }

    const saveSettingsBtn = document.getElementById('save-settings');
    if (saveSettingsBtn) saveSettingsBtn.addEventListener('click', () => this.saveSettings());

    const closeSettingsBtn = document.getElementById('close-settings');
    if (closeSettingsBtn) closeSettingsBtn.addEventListener('click', () => this.closeSettings());

    // Enhanced milk purchase button with double-click
    const milkPurchaseBtn = document.getElementById('milk-purchase-btn');
    if (milkPurchaseBtn) {
      let clickCount = 0;
      milkPurchaseBtn.addEventListener('click', (e) => {
        e.preventDefault();
        
        clickCount++;
        
        if (clickCount === 1) {
          // Single click - toggle milk status
          setTimeout(() => {
            if (clickCount === 1) {
              this.toggleMilkPurchase();
            }
            clickCount = 0;
          }, 300);
        } else if (clickCount === 2) {
          // Double click - toggle and focus on notes
          this.toggleMilkPurchase();
          setTimeout(() => {
            const notesField = document.getElementById('day-notes');
            if (notesField) {
              notesField.focus();
              this.showToast('💡 Double-click detected! Notes field focused for easy entry.', 'info');
            }
          }, 100);
          clickCount = 0;
        }
      });
    }

    // Theme toggle
    const themeBtn = document.getElementById('theme-toggle');
    if (themeBtn) {
      themeBtn.addEventListener('click', (e) => {
        e.preventDefault();
        this.toggleTheme();
      });
    }

    // Today button
    const todayBtn = document.getElementById('today-btn');
    if (todayBtn) {
      todayBtn.addEventListener('click', (e) => {
        e.preventDefault();
        this.goToToday();
      });
    }

    // Navigation
    const prevBtn = document.getElementById('prevMonth');
    if (prevBtn) prevBtn.addEventListener('click', () => this.goToPreviousMonth());

    const nextBtn = document.getElementById('nextMonth');
    if (nextBtn) nextBtn.addEventListener('click', () => this.goToNextMonth());

    // Calculator
    const calcBtn = document.getElementById('calculator-open');
    if (calcBtn) calcBtn.addEventListener('click', () => this.toggleCalculator());

    const calculateBtn = document.getElementById('calculate-btn');
    if (calculateBtn) calculateBtn.addEventListener('click', () => this.calculateCosts());

    // Day modal
    const saveDayBtn = document.getElementById('save-day');
    if (saveDayBtn) saveDayBtn.addEventListener('click', () => this.saveDayData());

    const closeDayBtn = document.getElementById('close-day-modal');
    if (closeDayBtn) closeDayBtn.addEventListener('click', () => this.closeDayModal());

    // Print button
    const printBtn = document.getElementById('print-btn');
    if (printBtn) {
      printBtn.addEventListener('click', (e) => {
        e.preventDefault();
        this.printResults();
      });
    }

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
      const yearEl = document.getElementById('picker-year');
      if (yearEl) yearEl.textContent = this.pickerYear;
      this.buildMonthPickerGrid();
    });

    const pickerNext = document.getElementById('picker-next-year');
    if (pickerNext) pickerNext.addEventListener('click', () => {
      this.pickerYear++;
      const yearEl = document.getElementById('picker-year');
      if (yearEl) yearEl.textContent = this.pickerYear;
      this.buildMonthPickerGrid();
    });

    // Holiday modal
    const holidayClose = document.getElementById('holidayClose');
    if (holidayClose) holidayClose.addEventListener('click', () => {
      const modal = document.getElementById('holidayModal');
      if (modal) modal.classList.add('hidden');
    });

    // Close modals on overlay click
    document.addEventListener('click', (e) => {
      if (e.target.classList.contains('modal-overlay')) {
        e.target.classList.add('hidden');
      }
    });

    // Keyboard shortcuts
    document.addEventListener('keydown', (e) => {
      if (e.ctrlKey || e.metaKey) {
        switch (e.key) {
          case 't':
            e.preventDefault();
            this.goToToday();
            break;
          case 'p':
            e.preventDefault();
            this.printResults();
            break;
        }
      }
      
      if (e.key === 'Escape') {
        const visibleModal = document.querySelector('.modal-overlay:not(.hidden)');
        if (visibleModal) {
          visibleModal.classList.add('hidden');
        }
      }
    });
  }
}

// Initialize app
let app;
document.addEventListener('DOMContentLoaded', () => {
  app = new DoodhDaily();
  window.doodhApp = app; // For debugging
});

// Handle app visibility change for notifications
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'visible' && app) {
    // App became visible, refresh if needed
    app.renderCalendar();
  }
});
