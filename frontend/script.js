let tasks = [];
let selectedEffort = 'quick';

window.addEventListener('DOMContentLoaded', () => {
    const saved = localStorage.getItem('taskflow_tasks');
    if (saved) {
        tasks = JSON.parse(saved);
        renderTasks();
    }
});

function save() {
    localStorage.setItem('taskflow_tasks', JSON.stringify(tasks));
}

function setEffort(level) {
    selectedEffort = level;
    document.querySelectorAll('.effort-btn').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.effort === level);
    });
}

function addTask() {
    const nameInput = document.getElementById('taskName');
    const deadlineInput = document.getElementById('taskDeadline');
    const name = nameInput.value.trim();
    const deadline = deadlineInput.value;

    if (!name || !deadline) {
        alert('Please fill in both fields');
        return;
    }

    tasks.push({ name, deadline, effort: selectedEffort });
    save();
    nameInput.value = '';
    deadlineInput.value = '';
    setEffort('quick');
    renderTasks();
}

function removeTask(index) {
    tasks.splice(index, 1);
    save();
    renderTasks();
}

function completeTask(taskName, cardEl) {
    cardEl.classList.add('completing');
    setTimeout(() => {
        tasks = tasks.filter(t => t.name !== taskName);
        save();
        renderTasks();
        const results = document.getElementById('results');
        const remaining = results.querySelectorAll('.priority-card:not(.completing)');
        if (remaining.length === 0) {
            results.innerHTML = `
                <div class="empty-results">
                    <div class="empty-icon">✦</div>
                    <p>All tasks completed</p>
                </div>`;
        }
    }, 400);
}

function renderTasks() {
    const list = document.getElementById('tasks');
    const counter = document.getElementById('taskCount');
    counter.textContent = `${tasks.length} task${tasks.length !== 1 ? 's' : ''}`;

    if (tasks.length === 0) {
        list.innerHTML = '<li class="empty-state">No tasks yet. Add one above.</li>';
        return;
    }

    const effortLabel = { quick: '⚡ Quick Win', medium: '🧩 Medium', deep: '🧠 Deep Focus' };

    list.innerHTML = tasks.map((task, i) => `
        <li>
            <div class="task-info">
                <span class="task-name-text">
                    ${task.name}
                    <span class="effort-tag effort-${task.effort}">${effortLabel[task.effort]}</span>
                </span>
                <span class="task-deadline-text">${new Date(task.deadline).toLocaleString()}</span>
            </div>
            <button class="btn-remove" onclick="removeTask(${i})" title="Remove">✕</button>
        </li>
    `).join('');
}

async function prioritizeTasks() {
    if (tasks.length === 0) {
        alert('Add at least one task first');
        return;
    }

    const results = document.getElementById('results');
    const btn = document.getElementById('prioritizeBtn');

    results.innerHTML = `
        <div class="loading-state">
            <div class="spinner"></div>
            <span>Analyzing your tasks...</span>
        </div>`;
    btn.disabled = true;

    try {
        const response = await fetch('https://taskflow-i5j6.onrender.com', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ tasks })
        });

        const data = await response.json();

        if (data.error) {
            results.innerHTML = `<div class="error-msg">${data.error}</div>`;
            btn.disabled = false;
            return;
        }

        renderResults(data.prioritized_tasks);
    } catch (err) {
        results.innerHTML = `<div class="error-msg">Could not reach backend: ${err.message}</div>`;
    }

    btn.disabled = false;
}

function renderResults(prioritized) {
    const results = document.getElementById('results');
    const effortLabel = { quick: '⚡ Quick Win', medium: '🧩 Medium', deep: '🧠 Deep Focus' };

    results.innerHTML = prioritized.map(task => {
        const rankClass = task.rank <= 3 ? `r${task.rank}` : 'r-other';
        const original = tasks.find(t => t.name === task.name);
        const deadline = original ? new Date(original.deadline).toLocaleString() : task.deadline;
        const effort = original?.effort || 'quick';

        return `
            <div class="priority-card ${rankClass}" style="animation-delay: ${(task.rank - 1) * 0.07}s" id="card-${task.rank}">
                <div class="rank-num">#${task.rank}</div>
                <div class="card-body">
                    <div class="card-title">
                        ${task.name}
                        <span class="effort-tag effort-${effort}">${effortLabel[effort]}</span>
                    </div>
                    <div class="card-deadline">Due ${deadline}</div>
                    <div class="card-reason">${task.reasoning}</div>
                    <button class="complete-btn" onclick="completeTask('${task.name}', document.getElementById('card-${task.rank}'))">
                        ✓ Mark complete
                    </button>
                </div>
            </div>`;
    }).join('');
}

document.getElementById('taskName').addEventListener('keydown', e => {
    if (e.key === 'Enter') document.getElementById('taskDeadline').focus();
});

document.getElementById('taskDeadline').addEventListener('keydown', e => {
    if (e.key === 'Enter') addTask();
});