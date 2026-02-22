// Глобальные переменные
let currentFilter = 'new';
let ideasData = {};

// DOM элементы
const nameInput = document.getElementById('nameInput');
const ideaInput = document.getElementById('ideaInput');
const submitBtn = document.getElementById('submitBtn');
const ideasFeed = document.getElementById('ideasFeed');
const charCount = document.getElementById('charCount');
const onlineCount = document.getElementById('onlineCount');
const totalIdeas = document.getElementById('totalIdeas');
const filterBtns = document.querySelectorAll('.filter-btn');

// Инициализация
document.addEventListener('DOMContentLoaded', () => {
    initCharCounter();
    initFilters();
    loadIdeas();
    initOnlineCounter();
    initEnterSubmit();
});

// Счетчик символов
function initCharCounter() {
    ideaInput.addEventListener('input', () => {
        const length = ideaInput.value.length;
        charCount.textContent = length;
        
        if (length > 280) {
            charCount.style.color = '#f87171';
        } else if (length > 250) {
            charCount.style.color = '#fbbf24';
        } else {
            charCount.style.color = 'rgba(255, 255, 255, 0.4)';
        }
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

// Загрузка идей из Firebase
function loadIdeas() {
    const ideasRef = database.ref('ideas');
    
    ideasRef.on('value', (snapshot) => {
        ideasData = snapshot.val() || {};
        updateTotalCount();
        renderIdeas();
    });
}

// Обновление счетчика всего идей
function updateTotalCount() {
    const count = Object.keys(ideasData).length;
    totalIdeas.textContent = count;
}

// Онлайн-счетчик (имитация)
function initOnlineCounter() {
    // Простая имитация: рандом +1/-1 каждые 10 секунд
    setInterval(() => {
        const current = parseInt(onlineCount.textContent) || 3;
        const change = Math.floor(Math.random() * 3) - 1; // -1, 0, или 1
        const newValue = Math.max(1, current + change);
        onlineCount.textContent = newValue;
    }, 10000);
    
    // Стартовое значение
    onlineCount.textContent = Math.floor(Math.random() * 10) + 5;
}

// Отправка идеи
async function submitIdea() {
    const name = nameInput.value.trim() || 'Аноним';
    const text = ideaInput.value.trim();
    
    if (!text) {
        showNotification('Напиши идею!', 'error');
        return;
    }
    
    if (text.length > 300) {
        showNotification('Идея слишком длинная (макс. 300)', 'error');
        return;
    }
    
    const ideasRef = database.ref('ideas');
    const newIdeaRef = ideasRef.push();
    
    await newIdeaRef.set({
        name: name.slice(0, 30),
        text: text.slice(0, 300),
        timestamp: firebase.database.ServerValue.TIMESTAMP,
        likes: 0,
        dislikes: 0
    });
    
    // Очистка и анимация
    ideaInput.value = '';
    nameInput.value = '';
    charCount.textContent = '0';
    
    showNotification('Идея отправлена!', 'success');
    
    // Анимация кнопки
    submitBtn.style.transform = 'scale(0.95)';
    setTimeout(() => {
        submitBtn.style.transform = '';
    }, 200);
}

// Обработка лайков
function handleVote(e) {
    const target = e.target.closest('button');
    if (!target) return;
    
    const ideaId = target.dataset.id;
    const type = target.dataset.type;
    
    if (!ideaId || !type) return;
    
    const ideaRef = database.ref(`ideas/${ideaId}/${type}`);
    
    ideaRef.transaction((current) => {
        return (current || 0) + 1;
    });
    
    // Анимация
    target.style.transform = 'scale(1.2)';
    setTimeout(() => {
        target.style.transform = '';
    }, 200);
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
    if (diff < 604800) return `${Math.floor(diff / 86400)} д назад`;
    
    return date.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' });
}

// Сортировка и фильтрация идей
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

// Рендер идей
function renderIdeas() {
    const ideas = filterAndSortIdeas();
    
    if (ideas.length === 0) {
        ideasFeed.innerHTML = `
            <div class="loading">
                <i class="fas fa-lightbulb" style="font-size: 3rem; opacity: 0.3;"></i>
                <span>Пока нет идей. Будь первым!</span>
            </div>
        `;
        return;
    }
    
    ideasFeed.innerHTML = ideas.map(idea => createIdeaCard(idea)).join('');
    
    // Добавляем класс new для свежих идей
    const now = Date.now();
    document.querySelectorAll('.idea-card').forEach(card => {
        const timestamp = parseInt(card.dataset.timestamp);
        if (now - timestamp < 10000) {
            card.classList.add('new');
        }
    });
}

// Создание HTML карточки
function createIdeaCard(idea) {
    const timeStr = formatTime(idea.timestamp);
    const authorInitial = (idea.name || 'А').charAt(0).toUpperCase();
    const isNew = Date.now() - (idea.timestamp || 0) < 10000;
    
    return `
        <div class="idea-card ${isNew ? 'new' : ''}" data-id="${idea.id}" data-timestamp="${idea.timestamp || 0}">
            <div class="idea-header">
                <div class="idea-author">
                    <div class="author-avatar">${authorInitial}</div>
                    <span class="author-name">${idea.name || 'Аноним'}</span>
                </div>
                <span class="idea-time">
                    <i class="far fa-clock"></i> ${timeStr}
                </span>
            </div>
            <div class="idea-text">
                ${idea.text.replace(/\n/g, '<br>')}
            </div>
            <div class="idea-actions">
                <button class="like-btn" data-id="${idea.id}" data-type="likes">
                    <i class="fas fa-thumbs-up"></i> ${idea.likes || 0}
                </button>
                <button class="dislike-btn" data-id="${idea.id}" data-type="dislikes">
                    <i class="fas fa-thumbs-down"></i> ${idea.dislikes || 0}
                </button>
            </div>
        </div>
    `;
}

// Уведомления
function showNotification(message, type) {
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.innerHTML = `
        <i class="fas ${type === 'success' ? 'fa-check-circle' : 'fa-exclamation-circle'}"></i>
        <span>${message}</span>
    `;
    
    document.body.appendChild(notification);
    
    setTimeout(() => {
        notification.classList.add('show');
    }, 10);
    
    setTimeout(() => {
        notification.classList.remove('show');
        setTimeout(() => {
            notification.remove();
        }, 300);
    }, 3000);
}

// Добавляем стили для уведомлений
const style = document.createElement('style');
style.textContent = `
    .notification {
        position: fixed;
        bottom: 20px;
        left: 50%;
        transform: translateX(-50%) translateY(100px);
        background: rgba(0, 0, 0, 0.8);
        backdrop-filter: blur(10px);
        border: 1px solid rgba(255, 255, 255, 0.1);
        border-radius: 50px;
        padding: 12px 24px;
        color: white;
        display: flex;
        align-items: center;
        gap: 10px;
        z-index: 9999;
        transition: transform 0.3s ease;
        box-shadow: 0 10px 30px rgba(0, 0, 0, 0.3);
    }
    
    .notification.show {
        transform: translateX(-50%) translateY(0);
    }
    
    .notification.success i {
        color: #4ade80;
    }
    
    .notification.error i {
        color: #f87171;
    }
`;
document.head.appendChild(style);

// Enter для отправки
function initEnterSubmit() {
    ideaInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            submitIdea();
        }
    });
}

// Обработчики событий
submitBtn.addEventListener('click', submitIdea);
ideasFeed.addEventListener('click', handleVote);
