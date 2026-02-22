import { database } from './firebase-config.js';
import { ref, push, onValue, update, increment, serverTimestamp } from 'firebase/database';

// DOM элементы
const nameInput = document.getElementById('nameInput');
const ideaInput = document.getElementById('ideaInput');
const submitBtn = document.getElementById('submitBtn');
const ideasFeed = document.getElementById('ideasFeed');

// Ротация мемов в шапке
function initMemeRotator() {
    const memes = document.querySelectorAll('.meme-slide');
    let current = 0;
    
    setInterval(() => {
        memes[current].classList.remove('active');
        current = (current + 1) % memes.length;
        memes[current].classList.add('active');
    }, 3000);
}

// Форматирование времени
function formatTime(timestamp) {
    if (!timestamp) return 'только что';
    
    const date = new Date(timestamp);
    const now = new Date();
    const diff = Math.floor((now - date) / 1000); // разница в секундах
    
    if (diff < 60) return 'только что';
    if (diff < 3600) return `${Math.floor(diff / 60)} мин. назад`;
    if (diff < 86400) return `${Math.floor(diff / 3600)} ч. назад`;
    return date.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' });
}

// Создание карточки идеи
function createIdeaCard(id, data) {
    const card = document.createElement('div');
    card.className = `idea-card ${data.isNew ? 'new' : ''}`;
    card.dataset.id = id;
    
    const timeStr = formatTime(data.timestamp);
    const likes = data.likes || 0;
    const dislikes = data.dislikes || 0;
    
    card.innerHTML = `
        <div class="idea-header">
            <span class="idea-author">👤 ${data.name || 'Аноним'}</span>
            <span class="idea-time">⏱️ ${timeStr}</span>
        </div>
        <div class="idea-text">${data.text.replace(/\n/g, '<br>')}</div>
        <div class="idea-actions">
            <button class="like-btn" data-id="${id}" data-type="likes">
                <i class="fas fa-thumbs-up"></i> ${likes}
            </button>
            <button class="dislike-btn" data-id="${id}" data-type="dislikes">
                <i class="fas fa-thumbs-down"></i> ${dislikes}
            </button>
        </div>
    `;
    
    return card;
}

// Загрузка идей из Firebase
function loadIdeas() {
    const ideasRef = ref(database, 'ideas');
    
    onValue(ideasRef, (snapshot) => {
        const data = snapshot.val();
        ideasFeed.innerHTML = '';
        
        if (!data) {
            ideasFeed.innerHTML = '<div class="loading">🤔 Пока нет идей. Будь первым!</div>';
            return;
        }
        
        // Преобразуем объект в массив и сортируем по времени (новые сверху)
        const ideasArray = Object.entries(data).map(([id, value]) => ({
            id,
            ...value,
            timestamp: value.timestamp || Date.now()
        }));
        
        ideasArray.sort((a, b) => b.timestamp - a.timestamp);
        
        // Добавляем флаг new для идей младше 10 секунд
        const now = Date.now();
        ideasArray.forEach(idea => {
            idea.isNew = (now - (idea.timestamp || 0)) < 10000;
        });
        
        ideasArray.forEach(idea => {
            ideasFeed.appendChild(createIdeaCard(idea.id, idea));
        });
    });
}

// Отправка новой идеи
async function submitIdea() {
    const name = nameInput.value.trim() || 'Аноним';
    const text = ideaInput.value.trim();
    
    if (!text) {
        alert('Напиши хоть что-то!');
        return;
    }
    
    if (text.length > 200) {
        alert('Идея слишком длинная (макс. 200 символов)');
        return;
    }
    
    const ideasRef = ref(database, 'ideas');
    
    await push(ideasRef, {
        name: name.slice(0, 30),
        text: text.slice(0, 200),
        timestamp: Date.now(),
        likes: 0,
        dislikes: 0
    });
    
    // Очищаем поле ввода
    ideaInput.value = '';
    
    // Маленькая анимация на кнопке
    submitBtn.style.transform = 'scale(0.95)';
    setTimeout(() => {
        submitBtn.style.transform = '';
    }, 200);
}

// Обработка лайков/дизлайков
async function handleVote(e) {
    const target = e.target.closest('button');
    if (!target) return;
    
    const ideaId = target.dataset.id;
    const type = target.dataset.type; // 'likes' или 'dislikes'
    
    if (!ideaId || !type) return;
    
    const ideaRef = ref(database, `ideas/${ideaId}/${type}`);
    
    // Используем increment для атомарного увеличения
    await update(ref(database), {
        [`ideas/${ideaId}/${type}`]: increment(1)
    });
    
    // Визуальный эффект
    target.style.transform = 'scale(1.2)';
    setTimeout(() => {
        target.style.transform = '';
    }, 200);
}

// Инициализация
function init() {
    initMemeRotator();
    loadIdeas();
    
    // Обработчики
    submitBtn.addEventListener('click', submitIdea);
    
    ideaInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            submitIdea();
        }
    });
    
    // Делегирование событий для лайков
    ideasFeed.addEventListener('click', handleVote);
    
    // Анимация при фокусе на инпутах
    const inputs = document.querySelectorAll('.glass-input');
    inputs.forEach(input => {
        input.addEventListener('focus', () => {
            input.style.transform = 'scale(1.02)';
        });
        input.addEventListener('blur', () => {
            input.style.transform = '';
        });
    });
}

// Запускаем после загрузки DOM
document.addEventListener('DOMContentLoaded', init);
