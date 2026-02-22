// Состояние
let currentFilter = 'new';
let ideasData = {};
let onlineUsers = {};

// Firebase ссылки
const ideasRef = database.ref('ideas');
const onlineRef = database.ref('online_users');

// DOM элементы
const nameInput = document.getElementById('nameInput');
const ideaInput = document.getElementById('ideaInput');
const submitBtn = document.getElementById('submitBtn');
const ideasFeed = document.getElementById('ideasFeed');
const charCount = document.getElementById('charCount');
const onlineCount = document.getElementById('onlineCount');
const totalIdeas = document.getElementById('totalIdeas');
const totalLikes = document.getElementById('totalLikes');
const filterBtns = document.querySelectorAll('.filter-btn');

// Инициализация
document.addEventListener('DOMContentLoaded', () => {
    initCharCounter();
    initFilters();
    loadIdeas();
    initOnlineTracking();
    initEnterSubmit();
});

// Онлайн-трекинг (реальный)
function initOnlineTracking() {
    const userRef = onlineRef.push();
    
    // Добавляем себя
    userRef.set({
        online: true,
        timestamp: firebase.database.ServerValue.TIMESTAMP
    });
    
    // Удаляем при закрытии
    window.addEventListener('beforeunload', () => {
        userRef.remove();
    });
    
    // Слушаем изменения
    onlineRef.on('value', (snapshot) => {
        const count = snapshot.numChildren();
        onlineCount.textContent = count;
    });
    
    // Чистим старые записи (старше 30 секунд)
    setInterval(() => {
        const now = Date.now();
        onlineRef.once('value', (snapshot) => {
            snapshot.forEach((child) => {
                const data = child.val();
                if (now - data.timestamp > 30000) {
                    child.ref.remove();
                }
            });
        });
    }, 10000);
}

// Счетчик символов
function initCharCounter() {
    ideaInput.addEventListener('input', () => {
        charCount.textContent = ideaInput.value.length;
    });
}

// Фильтры
function initFilters() {
    filterBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            filterBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            currentFilter = btn.dataset.filter;
            renderIdeas();
        });
    });
}

// Загрузка идей
function loadIdeas() {
    ideasRef.on('value', (snapshot) => {
        ideasData = snapshot.val() || {};
        updateStats();
        renderIdeas();
    });
}

// Обновление статистики
function updateStats() {
    const count = Object.keys(ideasData).length;
    totalIdeas.textContent = count;
    
    let likes = 0;
    Object.values(ideasData).forEach(idea => {
        likes += idea.likes || 0;
    });
    totalLikes.textContent = likes;
}

// Отправка идеи
async function submitIdea() {
    const name = nameInput.value.trim() || 'Аноним';
    const text = ideaInput.value.trim();
    
    if (!text) {
        alert('Напиши идею!');
        return;
    }
    
    await ideasRef.push({
        name: name.slice(0, 30),
        text: text.slice(0, 300),
        timestamp: firebase.database.ServerValue.TIMESTAMP,
        likes: 0,
        dislikes: 0
    });
    
    ideaInput.value = '';
    nameInput.value = '';
    charCount.textContent = '0';
}

// Обработка лайков
function handleVote(e) {
    const target = e.target.closest('button');
    if (!target) return;
    
    const ideaId = target.dataset.id;
    const type = target.dataset.type;
    
    if (!ideaId || !type) return;
    
    const ideaRef = database.ref(`ideas/${ideaId}/${type}`);
    ideaRef.transaction((current) => (current || 0) + 1);
}

// Форматирование времени
function formatTime(timestamp) {
    if (!timestamp) return 'только что';
    
    const date = new Date(timestamp);
    const now = new Date();
    const diff = Math.floor((now - date) / 1000);
    
    if (diff < 60) return 'только что';
    if (diff < 3600) return `${Math.floor(diff / 60)} мин назад`;
    if (diff < 86400) return `${Math.floor(diff / 3600)} ч назад`;
    return date.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' });
}

// Фильтрация и сортировка
function filterAndSortIdeas() {
    let ideas = Object.entries(ideasData).map(([id, data]) => ({
        id,
        ...data,
        timestamp: data.timestamp || Date.now()
    }));
    
    switch(currentFilter) {
        case 'new':
            ideas.sort((a, b) => b.timestamp - a.timestamp);
            break;
        case 'top':
            ideas.sort((a, b) => (b.likes - b.dislikes) - (a.likes - a.dislikes));
            break;
        case 'day':
            const oneDayAgo = Date.now() - 86400000;
            ideas = ideas.filter(idea => idea.timestamp > oneDayAgo);
            ideas.sort((a, b) => b.likes - a.likes);
            break;
    }
    
    return ideas;
}

// Рендер
function renderIdeas() {
    const ideas = filterAndSortIdeas();
    
    if (ideas.length === 0) {
        ideasFeed.innerHTML = `
            <div class="loading">
                <i class="fas fa-lightbulb" style="font-size: 2rem; opacity: 0.3;"></i>
                <span>Пока нет идей. Будь первым!</span>
            </div>
        `;
        return;
    }
    
    ideasFeed.innerHTML = ideas.map(idea => `
        <div class="idea-card" data-id="${idea.id}">
            <div class="idea-header">
                <div class="idea-author">
                    <div class="author-avatar">${(idea.name || 'А').charAt(0)}</div>
                    <span class="author-name">${idea.name || 'Аноним'}</span>
                </div>
                <span class="idea-time">
                    <i class="far fa-clock"></i> ${formatTime(idea.timestamp)}
                </span>
            </div>
            <div class="idea-text">${idea.text.replace(/\n/g, '<br>')}</div>
            <div class="idea-actions">
                <button class="like-btn" data-id="${idea.id}" data-type="likes">
                    <i class="fas fa-thumbs-up"></i> ${idea.likes || 0}
                </button>
                <button class="dislike-btn" data-id="${idea.id}" data-type="dislikes">
                    <i class="fas fa-thumbs-down"></i> ${idea.dislikes || 0}
                </button>
            </div>
        </div>
    `).join('');
}

// Enter для отправки
function initEnterSubmit() {
    ideaInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            submitIdea();
        }
    });
}

// Обработчики
submitBtn.addEventListener('click', submitIdea);
ideasFeed.addEventListener('click', handleVote);
