document.addEventListener('DOMContentLoaded', () => {
    // DOM Elements
    const habitInput = document.getElementById('habit-input');
    const targetInput = document.getElementById('target-input');
    const addBtn = document.getElementById('add-btn');
    const habitList = document.getElementById('habit-list');
    const sortSelect = document.getElementById('sort-select');
    const resetWeekBtn = document.getElementById('reset-week-btn');
    const clearAllBtn = document.getElementById('clear-all-btn');
    const themeToggle = document.getElementById('theme-toggle');
    const canvas = document.getElementById('progress-chart');
    const ctx = canvas ? canvas.getContext('2d') : null;

    // Modal Elements
    const editModal = document.getElementById('edit-modal');
    const modalCloseBtn = document.getElementById('modal-close-btn');
    const modalSaveBtn = document.getElementById('modal-save-btn');
    const modalCancelBtn = document.getElementById('modal-cancel-btn');
    const modalHabitName = document.getElementById('modal-habit-name');
    const modalHabitTarget = document.getElementById('modal-habit-target');

    let habits = [];
    let currentlyEditingHabit = null;

    // --- Initialization ---
    function initialize() {
        loadHabits();
        setupEventListeners();
        initializeTheme();
        initializeChart();
        renderHabits();
    }

    function loadHabits() {
        try {
            const storedHabits = JSON.parse(localStorage.getItem('habits')) || [];
            habits = storedHabits.map(h => ({
                id: h.id || Date.now() + Math.random(),
                name: h.name || 'Untitled',
                target: (typeof h.target === 'number' && h.target > 0) ? h.target : 3,
                days: h.days && Array.isArray(h.days) && h.days.length === 7 ? h.days : Array(7).fill(false),
                streak: h.streak || 0,
                createdAt: h.createdAt || Date.now()
            }));
        } catch (err) {
            console.error("Failed to load habits from localStorage", err);
            habits = [];
        }
    }

    function setupEventListeners() {
        if (addBtn) addBtn.addEventListener('click', addHabit);
        if (habitInput) habitInput.addEventListener('keydown', (e) => { if (e.key === 'Enter') addHabit(); });
        if (resetWeekBtn) resetWeekBtn.addEventListener('click', handleResetWeek);
        if (clearAllBtn) clearAllBtn.addEventListener('click', handleClearAll);
        if (sortSelect) sortSelect.addEventListener('change', renderHabits);
        if (themeToggle) themeToggle.addEventListener('click', toggleTheme);
        
        // Modal listeners
        if (modalCloseBtn) modalCloseBtn.addEventListener('click', closeModal);
        if (modalCancelBtn) modalCancelBtn.addEventListener('click', closeModal);
        if (modalSaveBtn) modalSaveBtn.addEventListener('click', saveEditedHabit);
        window.addEventListener('click', (e) => { if (e.target === editModal) closeModal(); });
    }

    // --- Theme ---
    function initializeTheme() {
        const currentTheme = localStorage.getItem('theme') || 'light';
        document.body.classList.toggle('dark-theme', currentTheme === 'dark');
        feather.replace();
    }

    function toggleTheme() {
        const isDark = document.body.classList.toggle('dark-theme');
        localStorage.setItem('theme', isDark ? 'dark' : 'light');
        renderHabits();
        feather.replace();
    }

    // --- Chart ---
    let chart = null;
    function initializeChart() {
        if (!ctx || typeof Chart === 'undefined') {
            chart = { update: () => {}, data: { labels: [], datasets: [{ data: [], backgroundColor: [], borderColor: [] }] }, options: {} };
            return;
        }
        chart = new Chart(ctx, {
            type: 'bar',
            data: { labels: [], datasets: [{ label: 'Progress (%)', data: [], backgroundColor: [], borderColor: [], borderWidth: 1, borderRadius: 4 }] },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: { legend: { display: false } },
                scales: { 
                    y: { min: 0, max: 100, grid: {}, ticks: { stepSize: 25 } },
                    x: { grid: { display: false }, ticks: {} }
                }
            }
        });
    }

    // --- Core Logic ---
    function saveHabits() {
        try {
            localStorage.setItem('habits', JSON.stringify(habits));
        } catch (err) {
            console.error("Failed to save habits to localStorage", err);
        }
    }

    function calculateProgress(habit) {
        const done = habit.days.filter(Boolean).length;
        const target = habit.target > 0 ? habit.target : 1;
        return Math.round((done / target) * 100);
    }

    function calculateStreak(habit) {
        let streak = 0;
        const today = (new Date().getDay() + 6) % 7;
        for (let i = 0; i <= today; i++) {
            if (habit.days[i]) streak++; else streak = 0;
        }
        return streak;
    }

    // --- Rendering ---
    function renderHabits() {
        if (!habitList) return;
        habitList.innerHTML = '';
        
        updateChartTheme();
        const sortedHabits = getSortedHabits();

        if (sortedHabits.length === 0) {
            habitList.innerHTML = `<p style="text-align:center; color: #888; padding: 40px 0;">Your habit list is empty. Add one above to start tracking!</p>`;
        }

        sortedHabits.forEach(habit => {
            const li = createHabitElement(habit);
            habitList.appendChild(li);
        });

        updateChartData(sortedHabits);
        feather.replace();
    }

    function createHabitElement(habit) {
        const li = document.createElement('li');
        li.className = 'habit-item';
        li.dataset.id = habit.id;

        const daysHtml = habit.days.map((d, i) => 
            `<button class="day-btn ${d ? 'active' : ''}" data-day="${i}" title="${['Mon','Tue','Wed','Thu','Fri','Sat','Sun'][i]}">${['M','T','W','T','F','S','S'][i]}</button>`
        ).join('');

        li.innerHTML = `
            <div class="habit-item-main">
                <span class="habit-name">${habit.name}</span>
                <div class="habit-meta">
                    <span class="target-badge"><i data-feather="target" class="feather-sm"></i> ${habit.target}/wk</span>
                    <span class="target-badge"><i data-feather="trending-up" class="feather-sm"></i> ${calculateStreak(habit)}</span>
                </div>
            </div>
            <div class="habit-item-details">
                <div class="day-toggle">${daysHtml}</div>
                <div class="habit-buttons">
                    <button class="edit-btn" aria-label="Edit habit"><i data-feather="edit-2"></i></button>
                    <button class="delete-btn" aria-label="Delete habit"><i data-feather="trash-2"></i></button>
                </div>
            </div>
        `;

        li.querySelectorAll('.day-btn').forEach(btn => btn.addEventListener('click', () => toggleDay(habit.id, parseInt(btn.dataset.day))));
        li.querySelector('.edit-btn').addEventListener('click', () => openEditModal(habit));
        li.querySelector('.delete-btn').addEventListener('click', () => deleteHabit(habit.id));
        
        return li;
    }

    function getSortedHabits() {
        const sort = sortSelect ? sortSelect.value : 'added';
        return [...habits].sort((a, b) => {
            switch (sort) {
                case 'progress-desc': return calculateProgress(b) - calculateProgress(a);
                case 'streak-desc': return calculateStreak(b) - calculateStreak(a);
                default: return b.createdAt - a.createdAt;
            }
        });
    }

    // --- Chart Updates ---
    function updateChartTheme() {
        if (!chart || !chart.options.scales) return;
        const isDark = document.body.classList.contains('dark-theme');
        const gridColor = isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)';
        const tickColor = isDark ? '#94a3b8' : '#64748b';
        chart.options.scales.y.grid.color = gridColor;
        chart.options.scales.y.ticks.color = tickColor;
        chart.options.scales.x.ticks.color = tickColor;
    }

    function updateChartData(sortedHabits) {
        const primaryColor = getComputedStyle(document.documentElement).getPropertyValue('--primary').trim();
        const greenColor = getComputedStyle(document.documentElement).getPropertyValue('--green').trim();

        chart.data.labels = sortedHabits.map(h => h.name);
        chart.data.datasets[0].data = sortedHabits.map(h => calculateProgress(h));
        chart.data.datasets[0].backgroundColor = sortedHabits.map(h => (calculateProgress(h) >= 100 ? greenColor : primaryColor) + 'B3'); // 70% opacity
        chart.data.datasets[0].borderColor = sortedHabits.map(h => calculateProgress(h) >= 100 ? greenColor : primaryColor);
        
        chart.update();
    }

    // --- Event Handlers ---
    function addHabit() {
        if (!habitInput || !targetInput) return;
        const name = habitInput.value.trim();
        const target = parseInt(targetInput.value, 10);

        if (!name) {
            alert('Please enter a habit name.');
            return;
        }
        if (isNaN(target) || target < 1 || target > 7) {
            alert('Please enter a valid target between 1 and 7.');
            return;
        }
        habits.push({ id: Date.now(), name, target, days: Array(7).fill(false), streak: 0, createdAt: Date.now() });
        habitInput.value = '';
        targetInput.value = '';
        saveAndRender();
    }

    function toggleDay(habitId, dayIndex) {
        const habit = habits.find(h => h.id === habitId);
        if (habit) {
            habit.days[dayIndex] = !habit.days[dayIndex];
            saveAndRender();
        }
    }

    function deleteHabit(habitId) {
        if (confirm('Are you sure you want to delete this habit?')) {
            habits = habits.filter(h => h.id !== habitId);
            saveAndRender();
        }
    }

    function handleResetWeek() {
        if (confirm('Reset week? This will clear all day completions for every habit.')) {
            habits.forEach(h => h.days.fill(false));
            saveAndRender();
        }
    }

    function handleClearAll() {
        if (confirm('Are you sure you want to clear all habits? This cannot be undone.')) {
            habits = [];
            saveAndRender();
        }
    }

    function saveAndRender() {
        saveHabits();
        renderHabits();
    }

    // --- Modal Logic ---
    function openEditModal(habit) {
        currentlyEditingHabit = habit;
        modalHabitName.value = habit.name;
        modalHabitTarget.value = habit.target;
        editModal.style.display = 'block';
        feather.replace();
    }

    function closeModal() {
        editModal.style.display = 'none';
        currentlyEditingHabit = null;
    }

    function saveEditedHabit() {
        const newName = modalHabitName.value.trim();
        const newTarget = parseInt(modalHabitTarget.value, 10);

        if (!newName) {
            alert('Habit name cannot be empty.');
            return;
        }
        if (isNaN(newTarget) || newTarget < 1 || newTarget > 7) {
            alert('Target must be between 1 and 7.');
            return;
        }

        if (currentlyEditingHabit) {
            currentlyEditingHabit.name = newName;
            currentlyEditingHabit.target = newTarget;
            saveAndRender();
        }
        closeModal();
    }

    // --- Start the app ---
    initialize();
});
