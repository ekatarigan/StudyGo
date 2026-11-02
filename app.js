/**
 * ==========================================================================
 * Student Task Manager - JavaScript Logic
 * Mengelola state data, dashboard statistik, modal tugas, filter, dan kalender.
 * ==========================================================================
 */

// Kunci penyimpanan LocalStorage
const STORAGE_KEY = "student_task_manager_data";

// Data awal contoh tugas kuliah (hanya dimuat jika penyimpanan kosong)
const INITIAL_TASKS = [
  {
    id: "task_1",
    name: "Makalah Analisis Algoritma Sorting & Pencarian",
    course: "Kecerdasan Buatan",
    deadline: getFutureDate(1, 23, 59), // Besok
    priority: "High",
    status: "In Progress"
  },
  {
    id: "task_2",
    name: "Desain Prototipe UI/UX Web Kampus",
    course: "Pemrograman Web",
    deadline: getFutureDate(3, 17, 0), // 3 hari lagi
    priority: "Medium",
    status: "To Do"
  },
  {
    id: "task_3",
    name: "Laporan Praktikum Normalisasi Query SQL",
    course: "Basis Data",
    deadline: getFutureDate(-1, 12, 0), // Kemarin (Selesai)
    priority: "Low",
    status: "Completed"
  }
];

// Helper untuk membuat tanggal contoh yang dinamis
function getFutureDate(offsetDays, hours = 23, minutes = 59) {
  const d = new Date();
  d.setDate(d.getDate() + offsetDays);
  d.setHours(hours, minutes, 0, 0);
  return d.toISOString();
}

// State Aplikasi
let tasks = [];
let currentFilterStatus = "all";
let currentFilterPriority = "all";
let searchQuery = "";
let editingTaskId = null; // Menyimpan ID tugas yang sedang diedit (null jika tambah baru)

// State Kalender
const todayDate = new Date();
let calYear = todayDate.getFullYear();
let calMonth = todayDate.getMonth(); // 0-indexed (0 = Januari, 10 = November)
let selectedDateKey = formatLocalDateKey(todayDate); // 'YYYY-MM-DD'
let activeViewMode = "cards"; // 'cards' | 'calendar'

// Nama Bulan Bahasa Indonesia
const MONTH_NAMES_ID = [
  "Januari", "Februari", "Maret", "April", "Mei", "Juni",
  "Juli", "Agustus", "September", "Oktober", "November", "Desember"
];

// DOM Elements
const elements = {
  // Navigation View Toggle
  viewCardsBtn: document.getElementById("viewCardsBtn"),
  viewCalendarBtn: document.getElementById("viewCalendarBtn"),
  controlsSection: document.getElementById("controlsSection"),
  tasksSection: document.getElementById("tasksSection"),

  // Calendar Elements
  calendarSection: document.getElementById("calendarSection"),
  calendarMonthTitle: document.getElementById("calendarMonthTitle"),
  prevMonthBtn: document.getElementById("prevMonthBtn"),
  nextMonthBtn: document.getElementById("nextMonthBtn"),
  todayBtn: document.getElementById("todayBtn"),
  calendarDaysGrid: document.getElementById("calendarDaysGrid"),
  selectedDayCard: document.getElementById("selectedDayCard"),
  selectedDayTitle: document.getElementById("selectedDayTitle"),
  selectedDaySubtitle: document.getElementById("selectedDaySubtitle"),
  selectedDayTasksList: document.getElementById("selectedDayTasksList"),
  addForDateBtn: document.getElementById("addForDateBtn"),

  // Dashboard & Progress
  statTotalTasks: document.getElementById("statTotalTasks"),
  statPendingTasks: document.getElementById("statPendingTasks"),
  statCompletedTasks: document.getElementById("statCompletedTasks"),
  progressPercentage: document.getElementById("progressPercentage"),
  progressBarFill: document.getElementById("progressBarFill"),
  progressDetailText: document.getElementById("progressDetailText"),

  // Tasks Grid & Empty State
  tasksGrid: document.getElementById("tasksGrid"),
  emptyState: document.getElementById("emptyState"),
  emptyStateAddBtn: document.getElementById("emptyStateAddBtn"),

  // Filters & Search
  filterTabs: document.querySelectorAll(".filter-tabs .tab-btn"),
  priorityFilterSelect: document.getElementById("priorityFilterSelect"),
  searchInput: document.getElementById("searchInput"),

  // Modal & Form
  openAddModalBtn: document.getElementById("openAddModalBtn"),
  taskModal: document.getElementById("taskModal"),
  closeModalBtn: document.getElementById("closeModalBtn"),
  cancelModalBtn: document.getElementById("cancelModalBtn"),
  modalHeading: document.getElementById("modalHeading"),
  taskForm: document.getElementById("taskForm"),
  editTaskId: document.getElementById("editTaskId"),
  taskNameInput: document.getElementById("taskNameInput"),
  courseInput: document.getElementById("courseInput"),
  deadlineInput: document.getElementById("deadlineInput"),
  priorityInput: document.getElementById("priorityInput"),
  statusInput: document.getElementById("statusInput"),
  nameError: document.getElementById("nameError"),
  courseError: document.getElementById("courseError"),
  deadlineError: document.getElementById("deadlineError"),

  // Toast
  toast: document.getElementById("toastNotification")
};

// ==========================================
// 1. INISIALISASI & LOCALSTORAGE
// ==========================================

function initApp() {
  loadTasksFromStorage();
  setupEventListeners();
  renderApp();
}

/**
 * Memuat data tugas dari LocalStorage
 */
function loadTasksFromStorage() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      tasks = JSON.parse(saved);
    } else {
      tasks = [...INITIAL_TASKS];
      saveTasksToStorage();
    }
  } catch (error) {
    console.error("Gagal memuat tugas dari localStorage:", error);
    tasks = [...INITIAL_TASKS];
  }
}

/**
 * Menyimpan data tugas ke LocalStorage
 */
function saveTasksToStorage() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks));
  } catch (error) {
    console.error("Gagal menyimpan ke localStorage:", error);
  }
}

// ==========================================
// 2. DASHBOARD & PROGRESS LOGIC
// ==========================================

/**
 * Memperbarui nilai statistik dan progress bar di dashboard
 */
function updateDashboard() {
  const total = tasks.length;
  const completed = tasks.filter(t => t.status === "Completed").length;
  const pending = total - completed;

  // Update angka ringkasan
  elements.statTotalTasks.textContent = total;
  elements.statPendingTasks.textContent = pending;
  elements.statCompletedTasks.textContent = completed;

  // Hitung persentase progress
  const percentage = total > 0 ? Math.round((completed / total) * 100) : 0;

  elements.progressPercentage.textContent = `${percentage}%`;
  elements.progressBarFill.style.width = `${percentage}%`;
  elements.progressDetailText.textContent = `${completed} dari ${total} tugas selesai`;
}

// ==========================================
// 3. FILTER & DAFTAR TUGAS (RENDERING)
// ==========================================

/**
 * Menyaring dan mengurutkan tugas berdasarkan filter yang aktif
 */
function getFilteredTasks() {
  return tasks.filter(task => {
    // Filter status
    const matchStatus = currentFilterStatus === "all" || task.status === currentFilterStatus;

    // Filter prioritas
    const matchPriority = currentFilterPriority === "all" || task.priority === currentFilterPriority;

    // Filter pencarian teks (nama tugas atau mata kuliah)
    const query = searchQuery.trim().toLowerCase();
    const matchSearch = query === "" ||
      task.name.toLowerCase().includes(query) ||
      task.course.toLowerCase().includes(query);

    return matchStatus && matchPriority && matchSearch;
  });
}

/**
 * Merender seluruh antarmuka aplikasi
 */
function renderApp() {
  updateDashboard();

  // Render Card Grid View
  const filteredTasks = getFilteredTasks();

  if (filteredTasks.length === 0) {
    elements.tasksGrid.innerHTML = "";
    elements.emptyState.classList.remove("hidden");
  } else {
    elements.emptyState.classList.add("hidden");
    elements.tasksGrid.innerHTML = filteredTasks.map(createTaskCardHTML).join("");
  }

  // Render Calendar View & Selected Day Panel
  renderCalendar();
  renderSelectedDayTasks();
}

/**
 * Template HTML untuk setiap kartu tugas
 */
function createTaskCardHTML(task) {
  const isCompleted = task.status === "Completed";
  const priorityClass = `priority-${task.priority.toLowerCase()}`;

  // Format deadline yang ramah pengguna
  const deadlineFormatted = formatDeadline(task.deadline);

  // Status badge styling
  let statusBadgeClass = "status-todo";
  if (task.status === "In Progress") statusBadgeClass = "status-progress";
  if (task.status === "Completed") statusBadgeClass = "status-completed";

  // Tombol toggle status
  const toggleBtnTitle = isCompleted ? "Batalkan tanda selesai" : "Tandai tugas sebagai selesai";

  return `
    <article class="task-card ${isCompleted ? 'is-completed' : ''}" data-task-id="${task.id}">
      <div>
        <div class="card-header">
          <span class="course-tag" title="${escapeHtml(task.course)}">${escapeHtml(task.course)}</span>
          <span class="priority-badge ${priorityClass}">
            ${task.priority === 'High' ? '🔥' : task.priority === 'Medium' ? '⚡' : '🌱'} ${task.priority}
          </span>
        </div>

        <h3 class="task-title">${escapeHtml(task.name)}</h3>

        <div class="deadline-info ${deadlineFormatted.isOverdue && !isCompleted ? 'is-overdue' : ''}">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <circle cx="12" cy="12" r="10"/>
            <polyline points="12 6 12 12 16 14"/>
          </svg>
          <span>${deadlineFormatted.text}</span>
        </div>
      </div>

      <div class="card-footer">
        <span class="status-pill ${statusBadgeClass}">
          ${task.status === 'Completed' ? '✓' : '•'} ${task.status}
        </span>

        <div class="card-actions">
          <!-- Tombol Tandai Selesai -->
          <button class="action-btn btn-complete-toggle" data-action="toggle-complete" data-id="${task.id}" title="${toggleBtnTitle}" type="button">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
              <polyline points="20 6 9 17 4 12"/>
            </svg>
          </button>

          <!-- Tombol Edit -->
          <button class="action-btn" data-action="edit" data-id="${task.id}" title="Edit Tugas" type="button">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
              <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
            </svg>
          </button>

          <!-- Tombol Hapus -->
          <button class="action-btn btn-delete" data-action="delete" data-id="${task.id}" title="Hapus Tugas" type="button">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <polyline points="3 6 5 6 21 6"/>
              <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
            </svg>
          </button>
        </div>
      </div>
    </article>
  `;
}

// ==========================================
// 4. FORMAT TANGGAL & WAKTU
// ==========================================

function formatLocalDateKey(date) {
  const d = new Date(date);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function getDateKeyFromISO(isoString) {
  if (!isoString) return "";
  return formatLocalDateKey(new Date(isoString));
}

function formatDeadline(isoString) {
  if (!isoString) return { text: "-", isOverdue: false };

  const deadlineDate = new Date(isoString);
  if (isNaN(deadlineDate.getTime())) return { text: "-", isOverdue: false };

  const now = new Date();
  const diffMs = deadlineDate.getTime() - now.getTime();
  const diffHours = diffMs / (1000 * 60 * 60);

  const options = {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit"
  };
  const dateFormatted = deadlineDate.toLocaleDateString("id-ID", options);

  if (diffMs < 0) {
    return { text: `Terlewat (${dateFormatted})`, isOverdue: true };
  } else if (diffHours <= 24) {
    return { text: `Hari ini, ${dateFormatted}`, isOverdue: false };
  } else {
    return { text: dateFormatted, isOverdue: false };
  }
}

// ==========================================
// 5. FITUR KALENDER JADWAL (CALENDAR VIEW)
// ==========================================

/**
 * Merender kalender bulanan dan memetakan tugas ke setiap tanggal
 */
function renderCalendar() {
  if (!elements.calendarMonthTitle || !elements.calendarDaysGrid) return;

  // Set judul bulan & tahun (misal: November 2026)
  elements.calendarMonthTitle.textContent = `${MONTH_NAMES_ID[calMonth]} ${calYear}`;

  // Hari pertama di bulan (Senin = 0, Minggu = 6)
  const firstDayOfMonth = new Date(calYear, calMonth, 1);
  const startDayIndex = (firstDayOfMonth.getDay() + 6) % 7;

  // Jumlah hari di bulan berjalan dan bulan sebelumnya
  const daysInCurrentMonth = new Date(calYear, calMonth + 1, 0).getDate();
  const daysInPrevMonth = new Date(calYear, calMonth, 0).getDate();

  const todayKey = formatLocalDateKey(new Date());
  const cells = [];

  // 1. Hari-hari sisa dari bulan sebelumnya
  for (let i = startDayIndex - 1; i >= 0; i--) {
    const dayNum = daysInPrevMonth - i;
    const prevDate = new Date(calYear, calMonth - 1, dayNum);
    const dateKey = formatLocalDateKey(prevDate);
    cells.push({
      dayNum,
      dateKey,
      isCurrentMonth: false,
      isToday: dateKey === todayKey,
      isSelected: dateKey === selectedDateKey
    });
  }

  // 2. Hari-hari di bulan berjalan
  for (let dayNum = 1; dayNum <= daysInCurrentMonth; dayNum++) {
    const curDate = new Date(calYear, calMonth, dayNum);
    const dateKey = formatLocalDateKey(curDate);
    cells.push({
      dayNum,
      dateKey,
      isCurrentMonth: true,
      isToday: dateKey === todayKey,
      isSelected: dateKey === selectedDateKey
    });
  }

  // 3. Hari-hari awal bulan berikutnya untuk melengkapi baris grid (35 atau 42 sel)
  const remainingCells = (cells.length <= 35 ? 35 : 42) - cells.length;
  for (let dayNum = 1; dayNum <= remainingCells; dayNum++) {
    const nextDate = new Date(calYear, calMonth + 1, dayNum);
    const dateKey = formatLocalDateKey(nextDate);
    cells.push({
      dayNum,
      dateKey,
      isCurrentMonth: false,
      isToday: dateKey === todayKey,
      isSelected: dateKey === selectedDateKey
    });
  }

  // Render sel ke DOM
  elements.calendarDaysGrid.innerHTML = cells.map(cell => {
    // Cari tugas yang deadline-nya jatuh pada tanggal ini
    const dayTasks = tasks.filter(t => getDateKeyFromISO(t.deadline) === cell.dateKey);
    const taskCount = dayTasks.length;

    // Pratinjau maksimal 2 pill tugas untuk tampilan desktop
    const previewPills = dayTasks.slice(0, 2).map(t => `
      <div class="cal-task-pill priority-${t.priority.toLowerCase()} ${t.status === 'Completed' ? 'is-completed' : ''}" title="${escapeHtml(t.name)}">
        <span>${escapeHtml(t.course || t.name)}</span>
      </div>
    `).join("");

    const moreText = taskCount > 2 ? `<div class="cal-more-text">+${taskCount - 2} lagi</div>` : "";

    // Indikator titik berwarna untuk tampilan mobile
    const dotsRow = dayTasks.map(t => `
      <span class="legend-dot dot-${t.priority.toLowerCase()}"></span>
    `).join("");

    return `
      <div class="calendar-day-cell ${!cell.isCurrentMonth ? 'is-other-month' : ''} ${cell.isToday ? 'is-today' : ''} ${cell.isSelected ? 'is-selected' : ''}" data-date-key="${cell.dateKey}">
        <div class="day-header-row">
          <span class="day-number">${cell.dayNum}</span>
          ${taskCount > 0 ? `<span class="cal-task-count">${taskCount}</span>` : ''}
        </div>
        <div class="cal-tasks-container">
          ${previewPills}
          ${moreText}
        </div>
        <div class="cal-dots-row">
          ${dotsRow}
        </div>
      </div>
    `;
  }).join("");

  // Event listener klik pada setiap sel tanggal di kalender
  elements.calendarDaysGrid.querySelectorAll(".calendar-day-cell").forEach(cell => {
    cell.addEventListener("click", () => {
      const clickedDate = cell.getAttribute("data-date-key");
      if (clickedDate) {
        selectedDateKey = clickedDate;
        renderCalendar();
        renderSelectedDayTasks();
      }
    });
  });
}

/**
 * Merender daftar tugas untuk tanggal yang dipilih pada panel detail kalender
 */
function renderSelectedDayTasks() {
  if (!elements.selectedDayCard || !elements.selectedDayTitle || !elements.selectedDayTasksList) return;

  // Format tanggal terpilih (misal: "Senin, 2 November 2026")
  const dateObj = new Date(selectedDateKey + "T00:00:00");
  const options = { weekday: "long", day: "numeric", month: "long", year: "numeric" };
  const formattedSelectedDate = dateObj.toLocaleDateString("id-ID", options);

  elements.selectedDayTitle.textContent = `Jadwal Tugas: ${formattedSelectedDate}`;

  // Ambil semua tugas pada tanggal ini
  const dayTasks = tasks.filter(t => getDateKeyFromISO(t.deadline) === selectedDateKey);

  elements.selectedDaySubtitle.textContent = dayTasks.length > 0
    ? `${dayTasks.length} tugas terjadwal pada tanggal ini`
    : "Tidak ada jadwal pengumpulan tugas pada tanggal ini.";

  if (dayTasks.length === 0) {
    elements.selectedDayTasksList.innerHTML = `
      <div class="selected-empty-notice">
        Belum ada tugas pada tanggal ini. Klik tombol <strong>"+ Tambah di Tanggal Ini"</strong> di atas untuk membuat jadwal tugas baru.
      </div>
    `;
    return;
  }

  elements.selectedDayTasksList.innerHTML = dayTasks.map(task => {
    const isCompleted = task.status === "Completed";
    const deadlineTime = new Date(task.deadline).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" });

    let statusBadgeClass = "status-todo";
    if (task.status === "In Progress") statusBadgeClass = "status-progress";
    if (task.status === "Completed") statusBadgeClass = "status-completed";

    return `
      <div class="selected-task-row ${isCompleted ? 'is-completed' : ''}">
        <div class="selected-task-left">
          <span class="course-tag">${escapeHtml(task.course)}</span>
          <div>
            <div class="selected-task-title">${escapeHtml(task.name)}</div>
            <div class="selected-task-time">⏰ Jam: ${deadlineTime} WIB</div>
          </div>
        </div>

        <div class="selected-task-right">
          <span class="priority-badge priority-${task.priority.toLowerCase()}">
            ${task.priority}
          </span>

          <span class="status-pill ${statusBadgeClass}">
            ${task.status}
          </span>

          <div class="card-actions">
            <button class="action-btn btn-complete-toggle" data-action="toggle-complete" data-id="${task.id}" title="${isCompleted ? 'Batalkan tanda selesai' : 'Tandai selesai'}" type="button">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                <polyline points="20 6 9 17 4 12"/>
              </svg>
            </button>
            <button class="action-btn" data-action="edit" data-id="${task.id}" title="Edit Tugas" type="button">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
              </svg>
            </button>
            <button class="action-btn btn-delete" data-action="delete" data-id="${task.id}" title="Hapus Tugas" type="button">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <polyline points="3 6 5 6 21 6"/>
                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
              </svg>
            </button>
          </div>
        </div>
      </div>
    `;
  }).join("");
}

/**
 * Berpindah tampilan antara 'cards' (Daftar Kartu) dan 'calendar' (Kalender Jadwal)
 */
function switchView(viewMode) {
  activeViewMode = viewMode;

  if (viewMode === "calendar") {
    elements.viewCardsBtn.classList.remove("active");
    elements.viewCardsBtn.setAttribute("aria-selected", "false");
    elements.viewCalendarBtn.classList.add("active");
    elements.viewCalendarBtn.setAttribute("aria-selected", "true");

    elements.controlsSection.classList.add("hidden");
    elements.tasksSection.classList.add("hidden");
    elements.calendarSection.classList.remove("hidden");

    renderCalendar();
    renderSelectedDayTasks();
  } else {
    elements.viewCalendarBtn.classList.remove("active");
    elements.viewCalendarBtn.setAttribute("aria-selected", "false");
    elements.viewCardsBtn.classList.add("active");
    elements.viewCardsBtn.setAttribute("aria-selected", "true");

    elements.controlsSection.classList.remove("hidden");
    elements.tasksSection.classList.remove("hidden");
    elements.calendarSection.classList.add("hidden");

    renderApp();
  }
}

// Navigasi Bulan Kalender
function prevMonth() {
  calMonth--;
  if (calMonth < 0) {
    calMonth = 11;
    calYear--;
  }
  renderCalendar();
}

function nextMonth() {
  calMonth++;
  if (calMonth > 11) {
    calMonth = 0;
    calYear++;
  }
  renderCalendar();
}

function goToToday() {
  const now = new Date();
  calYear = now.getFullYear();
  calMonth = now.getMonth();
  selectedDateKey = formatLocalDateKey(now);
  renderCalendar();
  renderSelectedDayTasks();
}

// ==========================================
// 6. OPERASI TUGAS (ADD, EDIT, DELETE, TOGGLE)
// ==========================================

/**
 * Menandai tugas sebagai selesai atau mengembalikannya ke status sebelumnya
 */
function toggleTaskCompleted(taskId) {
  const task = tasks.find(t => t.id === taskId);
  if (!task) return;

  if (task.status === "Completed") {
    task.status = "In Progress";
    showToast(`Status tugas "${task.name}" diubah ke In Progress`);
  } else {
    task.status = "Completed";
    showToast(`Tugas "${task.name}" selesai! 🎉`);
  }

  saveTasksToStorage();
  renderApp();
}

/**
 * Menghapus tugas dengan konfirmasi dialog sederhana
 */
function deleteTask(taskId) {
  const task = tasks.find(t => t.id === taskId);
  if (!task) return;

  const isConfirmed = confirm(`Apakah Anda yakin ingin menghapus tugas "${task.name}"?`);
  if (!isConfirmed) return;

  tasks = tasks.filter(t => t.id !== taskId);
  saveTasksToStorage();
  renderApp();
  showToast("Tugas berhasil dihapus.");
}

/**
 * Membuka modal tambah tugas baru (opsional: dengan tanggal tertentu terisi otomatis)
 */
function openAddModal(datePreset = null) {
  editingTaskId = null;
  elements.modalHeading.textContent = "Tambah Tugas Baru";
  elements.taskForm.reset();
  elements.editTaskId.value = "";

  if (datePreset && typeof datePreset === "string") {
    // Gunakan tanggal yang dipilih dari kalender (jam default 23:59)
    elements.deadlineInput.value = `${datePreset}T23:59`;
  } else {
    // Set default deadline ke besok jam 23:59
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(23, 59, 0, 0);
    elements.deadlineInput.value = formatToLocalDateTime(tomorrow);
  }

  clearErrors();
  elements.taskModal.classList.remove("hidden");
  setTimeout(() => elements.taskNameInput.focus(), 50);
}

/**
 * Membuka modal untuk mengedit tugas yang ada
 */
function openEditModal(taskId) {
  const task = tasks.find(t => t.id === taskId);
  if (!task) return;

  editingTaskId = taskId;
  elements.modalHeading.textContent = "Edit Tugas Kuliah";
  elements.editTaskId.value = task.id;

  elements.taskNameInput.value = task.name;
  elements.courseInput.value = task.course;
  elements.deadlineInput.value = formatToLocalDateTime(new Date(task.deadline));
  elements.priorityInput.value = task.priority;
  elements.statusInput.value = task.status;

  clearErrors();
  elements.taskModal.classList.remove("hidden");
  setTimeout(() => elements.taskNameInput.focus(), 50);
}

/**
 * Menutup modal tambah/edit
 */
function closeModal() {
  elements.taskModal.classList.add("hidden");
  editingTaskId = null;
}

/**
 * Menyimpan data tugas (tambah baru atau pembaruan edit)
 */
function handleTaskFormSubmit(e) {
  e.preventDefault();

  const name = elements.taskNameInput.value.trim();
  const course = elements.courseInput.value.trim();
  const deadlineValue = elements.deadlineInput.value;
  const priority = elements.priorityInput.value;
  const status = elements.statusInput.value;

  // Validasi form
  let isValid = true;

  if (!name) {
    elements.nameError.classList.add("visible");
    isValid = false;
  } else {
    elements.nameError.classList.remove("visible");
  }

  if (!course) {
    elements.courseError.classList.add("visible");
    isValid = false;
  } else {
    elements.courseError.classList.remove("visible");
  }

  if (!deadlineValue) {
    elements.deadlineError.classList.add("visible");
    isValid = false;
  } else {
    elements.deadlineError.classList.remove("visible");
  }

  if (!isValid) return;

  const deadlineISO = new Date(deadlineValue).toISOString();

  if (editingTaskId) {
    // Mode Edit: Perbarui tugas yang ada
    const index = tasks.findIndex(t => t.id === editingTaskId);
    if (index !== -1) {
      tasks[index] = {
        ...tasks[index],
        name,
        course,
        deadline: deadlineISO,
        priority,
        status
      };
      showToast("Tugas berhasil diperbarui.");
    }
  } else {
    // Mode Tambah Baru: Buat tugas baru
    const newTask = {
      id: "task_" + Date.now(),
      name,
      course,
      deadline: deadlineISO,
      priority,
      status
    };
    tasks.unshift(newTask);
    showToast("Tugas baru berhasil ditambahkan! 🚀");
  }

  saveTasksToStorage();
  closeModal();
  renderApp();
}

function clearErrors() {
  elements.nameError.classList.remove("visible");
  elements.courseError.classList.remove("visible");
  elements.deadlineError.classList.remove("visible");
}

// ==========================================
// 7. EVENT LISTENERS
// ==========================================

function setupEventListeners() {
  // Toggle Mode Tampilan (Daftar Kartu vs Kalender)
  elements.viewCardsBtn.addEventListener("click", () => switchView("cards"));
  elements.viewCalendarBtn.addEventListener("click", () => switchView("calendar"));

  // Navigasi Kalender
  elements.prevMonthBtn.addEventListener("click", prevMonth);
  elements.nextMonthBtn.addEventListener("click", nextMonth);
  elements.todayBtn.addEventListener("click", goToToday);

  // Tombol "+ Tambah di Tanggal Ini" dari panel kalender
  elements.addForDateBtn.addEventListener("click", () => openAddModal(selectedDateKey));

  // Buka Modal Tambah dari Header & Empty State
  elements.openAddModalBtn.addEventListener("click", () => openAddModal());
  elements.emptyStateAddBtn.addEventListener("click", () => openAddModal());

  // Tutup Modal
  elements.closeModalBtn.addEventListener("click", closeModal);
  elements.cancelModalBtn.addEventListener("click", closeModal);

  // Klik di luar dialog untuk menutup
  elements.taskModal.addEventListener("click", (e) => {
    if (e.target === elements.taskModal) closeModal();
  });

  // Tombol Escape keyboard untuk menutup modal
  window.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && !elements.taskModal.classList.contains("hidden")) {
      closeModal();
    }
  });

  // Submit Form
  elements.taskForm.addEventListener("submit", handleTaskFormSubmit);

  // Event Delegation pada Kartu Tugas (Edit, Delete, Toggle Complete)
  elements.tasksGrid.addEventListener("click", handleTaskCardAction);

  // Event Delegation pada Panel Kalender Tugas
  elements.selectedDayTasksList.addEventListener("click", handleTaskCardAction);

  // Filter Status (Tabs)
  elements.filterTabs.forEach(tab => {
    tab.addEventListener("click", () => {
      elements.filterTabs.forEach(t => {
        t.classList.remove("active");
        t.setAttribute("aria-selected", "false");
      });
      tab.classList.add("active");
      tab.setAttribute("aria-selected", "true");

      currentFilterStatus = tab.getAttribute("data-status");
      renderApp();
    });
  });

  // Filter Prioritas
  elements.priorityFilterSelect.addEventListener("change", (e) => {
    currentFilterPriority = e.target.value;
    renderApp();
  });

  // Pencarian
  elements.searchInput.addEventListener("input", (e) => {
    searchQuery = e.target.value;
    renderApp();
  });
}

function handleTaskCardAction(e) {
  const button = e.target.closest("[data-action]");
  if (!button) return;

  const action = button.getAttribute("data-action");
  const taskId = button.getAttribute("data-id");
  if (!taskId) return;

  if (action === "toggle-complete") {
    toggleTaskCompleted(taskId);
  } else if (action === "edit") {
    openEditModal(taskId);
  } else if (action === "delete") {
    deleteTask(taskId);
  }
}

// ==========================================
// 8. HELPER UTILITIES
// ==========================================

let toastTimeout = null;
function showToast(message) {
  if (!elements.toast) return;

  elements.toast.textContent = message;
  elements.toast.classList.remove("hidden");
  elements.toast.style.opacity = "1";

  if (toastTimeout) clearTimeout(toastTimeout);

  toastTimeout = setTimeout(() => {
    elements.toast.style.opacity = "0";
    setTimeout(() => {
      elements.toast.classList.add("hidden");
    }, 250);
  }, 2800);
}

function escapeHtml(str) {
  if (!str) return "";
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function formatToLocalDateTime(date) {
  const pad = (n) => n.toString().padStart(2, "0");
  const year = date.getFullYear();
  const month = pad(date.getMonth() + 1);
  const day = date.getDate();
  const hours = pad(date.getHours());
  const minutes = pad(date.getMinutes());
  return `${year}-${month}-${day}T${hours}:${minutes}`;
}

// Inisialisasi saat DOM siap
document.addEventListener("DOMContentLoaded", initApp);
