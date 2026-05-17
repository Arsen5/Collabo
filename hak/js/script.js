document.addEventListener('DOMContentLoaded', () => {

    // --- ПЕРЕМЕННАЯ ДЛЯ DRAG AND DROP ---
    let draggedCard = null;

    // --- 1. КЛИКИ ПО КАРТОЧКАМ И ОТКРЫТИЕ САЙДБАРА (ДЕЛЕГИРОВАНИЕ) ---
    const taskSidebar = document.getElementById('task-sidebar');
    let activeCardForEdit = null;

    document.addEventListener('click', (e) => {
        const card = e.target.closest('.task-card');

        // Удаление карточки при клике на корзину
        if (e.target.classList.contains('delete-icon')) {
            e.stopPropagation();
            const cardToRemove = e.target.closest('.task-card');
            if (cardToRemove) {
                cardToRemove.remove();
                if (activeCardForEdit === cardToRemove && taskSidebar) {
                    taskSidebar.classList.add('hidden');
                }
            }
            return;
        }

        // Клик по самой карточке задачи
        if (card) {
            document.querySelectorAll('.task-card').forEach(c => c.classList.remove('active'));
            card.classList.add('active');
            activeCardForEdit = card;

            if (taskSidebar) {
                const sidebarName = taskSidebar.querySelector('.input-task-name');
                const sidebarDesc = taskSidebar.querySelector('.textarea-task-desc');

                // Элементы управления параметрами в сайдбаре
                const sidebarDeadlineInput = taskSidebar.querySelector('.sidebar-input-deadline');
                const sidebarExecutorSelect = taskSidebar.querySelector('.sidebar-input-executor');
                const sidebarPrioritySelect = taskSidebar.querySelector('.sidebar-input-priority');
                const sidebarStatusSelect = taskSidebar.querySelector('.sidebar-input-status');
                const sidebarTagsInput = taskSidebar.querySelector('.sidebar-input-tags');

                const createdDateEl = document.getElementById('sidebar-created-date');

                // Считываем имя задачи без иконки удаления
                const titleElement = card.querySelector('.task-title');
                let titleText = titleElement ? titleElement.textContent.replace('🗑', '').trim() : '';

                // Считываем внутренние поля карточки
                const fields = card.querySelectorAll('.task-field');
                let deadlineText = '';
                let executorText = 'Не назначен';
                let priorityText = 'Средний';

                fields.forEach(field => {
                    const text = field.textContent;
                    if (text.includes('Срок:')) {
                        deadlineText = text.replace('Срок:', '').trim();
                    } else if (text.includes('Исполнитель:')) {
                        executorText = text.replace('Исполнитель:', '').trim() || 'Не назначен';
                    } else if (text.includes('Важность:')) {
                        priorityText = text.replace('Важность:', '').trim() || 'Средний';
                    }
                });

                // Находим все теги на карточке и собираем их в массив
                const tagElements = card.querySelectorAll('.task-sidebar-tag, .task-tag');
                const tagsArray = [];
                tagElements.forEach(el => tagsArray.push(el.textContent.trim()));

                const savedDesc = card.dataset.description || '';

                // Заполняем текстовые поля сайдбара
                if (sidebarName) sidebarName.value = titleText;
                if (sidebarDesc) sidebarDesc.value = savedDesc;

                // Устанавливаем дату создания
                if (!card.dataset.createdDate) {
                    card.dataset.createdDate = new Date().toLocaleDateString('ru-RU');
                }
                if (createdDateEl) createdDateEl.innerHTML = `Дата создания: <strong>${card.dataset.createdDate}</strong>`;

                // Выставляем текущий статус (название колонки) в селект сайдбара
                const parentColumn = card.closest('.column');
                const colTitle = parentColumn ? parentColumn.querySelector('.column-title').textContent.trim() : 'To-Do';

                if (sidebarStatusSelect) {
                    let optionExists = Array.from(sidebarStatusSelect.options).some(opt => opt.value === colTitle);
                    if (!optionExists) {
                        const newOpt = document.createElement('option');
                        newOpt.value = colTitle;
                        newOpt.textContent = colTitle;
                        sidebarStatusSelect.appendChild(newOpt);
                    }
                    sidebarStatusSelect.value = colTitle;
                }

                // Заполняем инпут дедлайна
                if (sidebarDeadlineInput) {
                    sidebarDeadlineInput.value = (deadlineText === 'Не задан' || !deadlineText) ? '' : deadlineText;
                }

                // Выставляем нужного исполнителя в списке
                if (sidebarExecutorSelect) {
                    let foundOption = false;
                    for (let i = 0; i < sidebarExecutorSelect.options.length; i++) {
                        if (sidebarExecutorSelect.options[i].text === executorText) {
                            sidebarExecutorSelect.selectedIndex = i;
                            foundOption = true;
                            break;
                        }
                    }
                    if (!foundOption) sidebarExecutorSelect.selectedIndex = 0;
                }

                // Выставляем нужный приоритет в списке
                if (sidebarPrioritySelect) {
                    let foundOption = false;
                    for (let i = 0; i < sidebarPrioritySelect.options.length; i++) {
                        if (sidebarPrioritySelect.options[i].text === priorityText) {
                            sidebarPrioritySelect.selectedIndex = i;
                            foundOption = true;
                            break;
                        }
                    }
                    if (!foundOption) sidebarPrioritySelect.selectedIndex = 1;
                }

                // Заполняем инпут тегов строкой через запятую
                if (sidebarTagsInput) {
                    sidebarTagsInput.value = tagsArray.join(', ');
                }

                // Перерисовываем превью тегов в сайдбаре
                const sidebarTagsContainer = document.getElementById('sidebar-tags-container');
                if (sidebarTagsContainer) {
                    sidebarTagsContainer.innerHTML = '';
                    tagsArray.forEach(tag => {
                        if (tag) {
                            const span = document.createElement('span');
                            span.className = 'task-sidebar-tag';
                            span.textContent = tag;
                            sidebarTagsContainer.appendChild(span);
                        }
                    });
                }

                taskSidebar.classList.remove('hidden');
            }
        }
    });

    // Логика кнопки "Закрыть" в сайдбаре
    if (taskSidebar) {
        const closeSidebar = taskSidebar.querySelector('.close-btn');
        if (closeSidebar) {
            closeSidebar.addEventListener('click', () => {
                taskSidebar.classList.add('hidden');
                document.querySelectorAll('.task-card').forEach(c => c.classList.remove('active'));
                activeCardForEdit = null;
            });
        }

        // Кнопка "Применить изменения"
        const applyBtn = taskSidebar.querySelector('.btn-apply-changes');
        if (applyBtn) {
            applyBtn.addEventListener('click', () => {
                if (!activeCardForEdit) return;

                const sidebarName = taskSidebar.querySelector('.input-task-name');
                const sidebarDesc = taskSidebar.querySelector('.textarea-task-desc');
                const sidebarDeadlineInput = taskSidebar.querySelector('.sidebar-input-deadline');
                const sidebarExecutorSelect = taskSidebar.querySelector('.sidebar-input-executor');
                const sidebarPrioritySelect = taskSidebar.querySelector('.sidebar-input-priority');
                const sidebarStatusSelect = taskSidebar.querySelector('.sidebar-input-status');
                const sidebarTagsInput = taskSidebar.querySelector('.sidebar-input-tags');

                if (sidebarName && sidebarName.value.trim() === "") {
                    alert("Название задачи не может быть пустым");
                    return;
                }

                // 1. Обновляем название
                const titleElement = activeCardForEdit.querySelector('.task-title');
                if (titleElement && sidebarName) {
                    titleElement.innerHTML = `${sidebarName.value} <span class="delete-icon">🗑</span>`;
                }

                // 2. Обновляем скрытое описание в dataset
                if (sidebarDesc) {
                    activeCardForEdit.dataset.description = sidebarDesc.value;
                }

                // 3. Обновляем дедлайн на карточке
                if (sidebarDeadlineInput) {
                    const fields = activeCardForEdit.querySelectorAll('.task-field');
                    fields.forEach(field => {
                        if (field.textContent.includes('Срок:')) {
                            field.textContent = `Срок: ${sidebarDeadlineInput.value || 'Не задан'}`;
                        }
                    });
                }

                // 4. Обновляем исполнителя на карточке
                if (sidebarExecutorSelect) {
                    const selectedText = sidebarExecutorSelect.options[sidebarExecutorSelect.selectedIndex].text;
                    const fields = activeCardForEdit.querySelectorAll('.task-field');
                    fields.forEach(field => {
                        if (field.textContent.includes('Исполнитель:')) {
                            field.textContent = `Исполнитель: ${sidebarExecutorSelect.value ? selectedText : 'Не назначен'}`;
                        }
                    });
                }

                // 5. Обновляем приоритет на карточке и перекрашиваем плашку
                if (sidebarPrioritySelect) {
                    const selectedPriorityText = sidebarPrioritySelect.options[sidebarPrioritySelect.selectedIndex].text;
                    const fields = activeCardForEdit.querySelectorAll('.task-field');
                    fields.forEach(field => {
                        if (field.textContent.includes('Важность:')) {
                            let priorityClass = 'priority-medium';
                            if (selectedPriorityText === 'Низкий') priorityClass = 'priority-low';
                            if (selectedPriorityText === 'Высокий') priorityClass = 'priority-high';

                            field.innerHTML = `Важность: <span class="priority-badge ${priorityClass}">${selectedPriorityText}</span>`;
                        }
                    });
                }

                // 6. Обновляем теги на карточке разбиением строки на плашки
                if (sidebarTagsInput) {
                    const oldTags = activeCardForEdit.querySelectorAll('.task-sidebar-tag, .task-tag');
                    oldTags.forEach(el => el.remove());

                    const tagsArray = sidebarTagsInput.value.split(',')
                        .map(tag => tag.trim())
                        .filter(tag => tag.length > 0);

                    tagsArray.forEach(tag => {
                        const tagSpan = document.createElement('span');
                        tagSpan.className = 'task-sidebar-tag';
                        tagSpan.textContent = tag;
                        activeCardForEdit.appendChild(tagSpan);
                    });

                    // Синхронизируем плашки-превью в сайдбаре
                    const sidebarTagsContainer = document.getElementById('sidebar-tags-container');
                    if (sidebarTagsContainer) {
                        sidebarTagsContainer.innerHTML = '';
                        tagsArray.forEach(tag => {
                            const span = document.createElement('span');
                            span.className = 'task-sidebar-tag';
                            span.textContent = tag;
                            sidebarTagsContainer.appendChild(span);
                        });
                    }
                }

                // 7. ЛОГИКА СМЕНЫ СТАТУСА (ТЕПЕРЬ С УЧЕТОМ ОТСУТСТВИЯ КНОПКИ В DONE)
                if (sidebarStatusSelect) {
                    const targetColumnTitle = sidebarStatusSelect.value;
                    const currentColumn = activeCardForEdit.closest('.column');
                    const currentColumnTitle = currentColumn.querySelector('.column-title').textContent.trim();

                    if (targetColumnTitle !== currentColumnTitle) {
                        const allColumns = document.querySelectorAll('.column');
                        let targetColumn = null;

                        allColumns.forEach(col => {
                            if (col.querySelector('.column-title').textContent.trim() === targetColumnTitle) {
                                targetColumn = col;
                            }
                        });

                        if (targetColumn) {
                            const targetBtn = targetColumn.querySelector('.add-task-btn');

                            if (targetColumnTitle === 'Done') {
                                activeCardForEdit.classList.add('done');
                            } else {
                                activeCardForEdit.classList.remove('done');
                            }

                            if (targetBtn) {
                                targetColumn.insertBefore(activeCardForEdit, targetBtn);
                            } else {
                                targetColumn.appendChild(activeCardForEdit);
                            }
                        }
                    }
                }

                alert("Изменения успешно сохранены!");
            });
        }
    }

    // --- ЛОГИКА DRAG AND DROP (ПЕРЕТАСКИВАНИЕ КАРТОЧЕК) ---
    document.addEventListener('dragstart', (e) => {
        const card = e.target.closest('.task-card');
        if (card) {
            draggedCard = card;
            setTimeout(() => card.style.opacity = '0.5', 0);
        }
    });

    document.addEventListener('dragend', (e) => {
        const card = e.target.closest('.task-card');
        if (card) {
            card.style.opacity = '1';
            draggedCard = null;
        }
    });

    const mainBoardArea = document.querySelector('.board-area');
    if (mainBoardArea) {
        mainBoardArea.addEventListener('dragover', (e) => {
            e.preventDefault();
        });

        mainBoardArea.addEventListener('drop', (e) => {
            e.preventDefault();
            const targetColumn = e.target.closest('.column');
            if (targetColumn && draggedCard) {
                const columnTitle = targetColumn.querySelector('.column-title').textContent.trim();

                if (columnTitle === 'Done') {
                    draggedCard.classList.add('done');
                } else {
                    draggedCard.classList.remove('done');
                }

                const targetBtn = targetColumn.querySelector('.add-task-btn');
                if (targetBtn) {
                    targetColumn.insertBefore(draggedCard, targetBtn);
                } else {
                    targetColumn.appendChild(draggedCard);
                }
            }
        });
    }

    // --- 2. ЛОГИКА ДЛЯ ОКНА "ДОБАВИТЬ СТОЛБЕЦ" ---
    const openAddColBtn = document.getElementById('open-add-column-btn');
    const addColModal = document.getElementById('add-column-modal');
    const columnsContainer = document.querySelector('.board-columns-container') || document.querySelector('.board-area');

    if (openAddColBtn && addColModal) {
        openAddColBtn.addEventListener('click', () => addColModal.classList.remove('hidden'));
        addColModal.querySelector('.modal-close').addEventListener('click', () => addColModal.classList.add('hidden'));
        addColModal.addEventListener('click', (e) => { if (e.target === addColModal) addColModal.classList.add('hidden'); });

        const submitColumnBtn = addColModal.querySelector('.modal-submit-btn');
        if (submitColumnBtn) {
            submitColumnBtn.addEventListener('click', () => {
                // Точечно собираем поля формы по порядку их расположения в HTML
                const modalInputs = addColModal.querySelectorAll('.modal-input');
                const columnNameInput = modalInputs[0];  // Инпут названия
                const roleSelect = modalInputs[1];       // Селект роли
                const sendNotifySelect = modalInputs[2]; // 🌟 Селект "Отправлять ли уведомления?"
                const notifyTypeSelect = modalInputs[3]; // Селект типа уведомлений

                if (!columnNameInput || !columnNameInput.value.trim()) {
                    alert('Пожалуйста, введите название столбца');
                    return;
                }

                const titleText = columnNameInput.value.trim();

                // Создаем элемент нового столбца
                const newColumn = document.createElement('div');
                newColumn.className = 'column';
                newColumn.innerHTML = `
                    <div class="column-header">
                        <span class="column-title">${titleText}</span>
                        <span class="column-edit">Изменить</span>
                    </div>
                    <button class="add-task-btn">+ Добавить задачу</button>
                `;

                // Сохраняем выбранные настройки в dataset столбца (для будущей синхронизации)
                newColumn.dataset.allowedRole = roleSelect ? roleSelect.value : 'all';
                newColumn.dataset.sendNotifications = sendNotifySelect ? sendNotifySelect.value : 'yes';
                newColumn.dataset.notificationType = notifyTypeSelect ? notifyTypeSelect.value : 'email';

                // Динамически регистрируем имя нового столбца в селекте статусов правого сайдбара
                const sidebarStatusSelect = taskSidebar ? taskSidebar.querySelector('.sidebar-input-status') : null;
                if (sidebarStatusSelect) {
                    const newOpt = document.createElement('option');
                    newOpt.value = titleText;
                    newOpt.textContent = titleText;
                    sidebarStatusSelect.appendChild(newOpt);
                }

                // Вставляем колонку на доску
                if (columnsContainer) columnsContainer.appendChild(newColumn);

                // Сбрасываем форму модального окна в начальное состояние
                columnNameInput.value = '';
                if (roleSelect) roleSelect.selectedIndex = 0;
                if (sendNotifySelect) sendNotifySelect.selectedIndex = 0; // "Да, отправлять" по дефолту
                if (notifyTypeSelect) notifyTypeSelect.selectedIndex = 0;

                addColModal.classList.add('hidden');
            });
        }
    }

    // --- 3. ЛОГИКА ДЛЯ ОКНА "ПАРАМЕТРЫ ДОСКИ" ---
    const openParamsBtn = document.getElementById('open-board-params-btn');
    const paramsModal = document.getElementById('board-params-modal');

    // Глобальный объект для хранения настроек доски (подготовлен для отправки в ASP.NET Core)
    let globalBoardSettings = {
        adminEmail: '',
        sendNotifications: 'yes',
        notificationPeriod: 'instantly',
        notificationTemplate: ''
    };

    if (openParamsBtn && paramsModal) {
        // Открытие модального окна параметров
        openParamsBtn.addEventListener('click', () => {
            // Перед открытием подставляем ранее сохраненные значения в инпуты
            const inputs = paramsModal.querySelectorAll('.modal-input, textarea.modal-input');
            if (inputs.length >= 4) {
                inputs[0].value = globalBoardSettings.adminEmail;
                inputs[1].value = globalBoardSettings.sendNotifications;
                inputs[2].value = globalBoardSettings.notificationPeriod;
                inputs[3].value = globalBoardSettings.notificationTemplate;
            }
            paramsModal.classList.remove('hidden');
        });

        // Закрытие модального окна
        paramsModal.querySelector('.modal-close').addEventListener('click', () => paramsModal.classList.add('hidden'));
        paramsModal.addEventListener('click', (e) => { if (e.target === paramsModal) paramsModal.classList.add('hidden'); });

        // Обработка кнопки "Сохранить параметры"
        const saveParamsBtn = paramsModal.querySelector('.modal-submit-btn');
        if (saveParamsBtn) {
            saveParamsBtn.addEventListener('click', () => {
                // Находим все элементы формы ввода внутри этой модалки
                const inputs = paramsModal.querySelectorAll('.modal-input, textarea.modal-input');

                const emailValue = inputs[0].value.trim();
                const sendNotifyValue = inputs[1].value;
                const periodValue = inputs[2].value;
                const templateValue = inputs[3].value.trim();

                // Валидация: если email введен, проверяем его формат
                if (emailValue && !emailValue.includes('@')) {
                    alert('Пожалуйста, введите корректный Email администратора');
                    return;
                }

                // Записываем новые данные в наш объект настроек доски
                globalBoardSettings.adminEmail = emailValue;
                globalBoardSettings.sendNotifications = sendNotifyValue;
                globalBoardSettings.notificationPeriod = periodValue;
                globalBoardSettings.notificationTemplate = templateValue;

                // Выводим подтверждение (в будущем здесь будет fetch-запрос к контроллеру ASP.NET)
                console.log('Глобальные настройки доски успешно сохранены:', globalBoardSettings);
                alert('Глобальные параметры доски успешно сохранены!');

                // Закрываем модалку
                paramsModal.classList.add('hidden');
            });
        }
    }

    // --- 4. ЛОГИКА ДЛЯ ОКНА СОЗДАНИЯ И ДОБАВЛЕНИЯ ЗАДАЧИ ---
    const addTaskModal = document.getElementById('add-task-modal');
    let currentColumn = null;

    // 🌟 ИСПРАВЛЕНО: Объявляем boardArea корректно, чтобы делегирование кликов по кнопкам "+ Добавить задачу" работало всегда
    const currentBoardArea = document.querySelector('.board-area');
    if (currentBoardArea) {
        currentBoardArea.addEventListener('click', (e) => {
            if (e.target.classList.contains('add-task-btn')) {
                currentColumn = e.target.closest('.column');
                if (addTaskModal) addTaskModal.classList.remove('hidden');
            }
        });
    }

    const closeBtn = addTaskModal ? addTaskModal.querySelector('.modal-close') : null;
    if (closeBtn) {
        closeBtn.addEventListener('click', () => {
            addTaskModal.classList.add('hidden');
            currentColumn = null;
        });
    }

    if (addTaskModal) {
        addTaskModal.addEventListener('click', (e) => {
            if (e.target === addTaskModal) {
                addTaskModal.classList.add('hidden');
                currentColumn = null;
            }
        });
    }

    const submitTaskBtn = addTaskModal ? addTaskModal.querySelector('.modal-submit-btn') : null;
    if (submitTaskBtn) {
        submitTaskBtn.addEventListener('click', () => {
            if (!currentColumn) return;

            const nameInput = addTaskModal.querySelector('input[type="text"]:not([placeholder*="design"])');
            const descInput = addTaskModal.querySelector('textarea');
            const selects = addTaskModal.querySelectorAll('select');
            const executorSelect = selects[0];
            const prioritySelect = selects[1];
            const dateInput = addTaskModal.querySelector('input[type="date"]');
            const tagsInput = addTaskModal.querySelector('input[placeholder*="design"]');

            if (!nameInput || !nameInput.value.trim()) {
                alert('Пожалуйста, введите название задачи');
                return;
            }

            const executorText = executorSelect && executorSelect.selectedIndex >= 0 ? executorSelect.options[executorSelect.selectedIndex].text : 'Не назначен';
            const priorityText = prioritySelect && prioritySelect.selectedIndex >= 0 ? prioritySelect.options[prioritySelect.selectedIndex].text : 'Средний';

            const initialTags = tagsInput && tagsInput.value
                ? tagsInput.value.split(',').map(t => t.trim()).filter(t => t.length > 0)
                : [];
            const tagsHTML = initialTags.map(tag => `<span class="task-sidebar-tag">${tag}</span>`).join('');

            let initialPriorityClass = 'priority-medium';
            if (priorityText === 'Низкий') initialPriorityClass = 'priority-low';
            if (priorityText === 'Высокий') initialPriorityClass = 'priority-high';

            const newTaskCard = document.createElement('div');
            newTaskCard.className = 'task-card';
            newTaskCard.setAttribute('draggable', 'true');

            const columnTitle = currentColumn.querySelector('.column-title').textContent.trim();
            if (columnTitle === 'Done') {
                newTaskCard.classList.add('done');
            }

            newTaskCard.dataset.description = descInput ? descInput.value : '';
            newTaskCard.dataset.createdDate = new Date().toLocaleDateString('ru-RU');

            newTaskCard.innerHTML = `
                <div class="task-title">${nameInput.value} <span class="delete-icon">🗑</span></div>
                <div class="task-field">Срок: ${dateInput && dateInput.value ? dateInput.value : 'Не задан'}</div>
                <div class="task-field">Исполнитель: ${executorSelect && executorSelect.value ? executorText : 'Не назначен'}</div>
                <div class="task-field">Важность: <span class="priority-badge ${initialPriorityClass}">${priorityText}</span></div>
                ${tagsHTML}
            `;

            const targetBtn = currentColumn.querySelector('.add-task-btn');
            if (targetBtn) {
                currentColumn.insertBefore(newTaskCard, targetBtn);
            } else {
                currentColumn.appendChild(newTaskCard);
            }

            if (nameInput) nameInput.value = '';
            if (descInput) descInput.value = '';
            if (executorSelect) executorSelect.selectedIndex = 0;
            if (dateInput) dateInput.value = '';
            if (prioritySelect) prioritySelect.selectedIndex = 1;
            if (tagsInput) tagsInput.value = '';

            addTaskModal.classList.add('hidden');
            currentColumn = null;
        });
    }
    // --- 5. ЛОГИКА ДЛЯ ОКНА "РЕДАКТИРОВАТЬ СТОЛБЕЦ" (ДЕЛЕГИРОВАНИЕ) ---
    const editColModal = document.getElementById('edit-column-modal');
    let currentColumnToEdit = null; // Храним ссылку на редактируемый столбец

    if (editColModal) {
        // 1. Ловим клики по кнопкам "Изменить" во всей рабочей области доски
        const boardContainer = document.querySelector('.board-area');
        if (boardContainer) {
            boardContainer.addEventListener('click', (e) => {
                if (e.target.classList.contains('column-edit')) {
                    currentColumnToEdit = e.target.closest('.column');
                    if (!currentColumnToEdit) return;

                    // Извлекаем текущие параметры столбца
                    const colTitleElement = currentColumnToEdit.querySelector('.column-title');
                    const colTitleText = colTitleElement ? colTitleElement.textContent.trim() : '';

                    const allowedRole = currentColumnToEdit.dataset.allowedRole || 'all';
                    const hasAddBtn = currentColumnToEdit.querySelector('.add-task-btn') ? 'yes' : 'no';

                    // Заполняем поля модального окна актуальными данными столбца
                    const nameInput = editColModal.querySelector('.id-col-name');
                    const roleSelect = editColModal.querySelector('.id-col-role');
                    const btnToggleSelect = editColModal.querySelector('.id-col-btn-toggle');

                    if (nameInput) nameInput.value = colTitleText;
                    if (roleSelect) roleSelect.value = allowedRole;
                    if (btnToggleSelect) btnToggleSelect.value = hasAddBtn;

                    // Открываем модальное окно
                    editColModal.classList.remove('hidden');
                }
            });
        }

        // 2. Закрытие модального окна
        editColModal.querySelector('.modal-close').addEventListener('click', () => {
            editColModal.classList.add('hidden');
            currentColumnToEdit = null;
        });
        editColModal.addEventListener('click', (e) => {
            if (e.target === editColModal) {
                editColModal.classList.add('hidden');
                currentColumnToEdit = null;
            }
        });

        // 3. Обработка кнопки "Сохранить изменения"
        const saveColBtn = editColModal.querySelector('.id-save-col-btn');
        if (saveColBtn) {
            saveColBtn.addEventListener('click', () => {
                if (!currentColumnToEdit) return;

                const nameInput = editColModal.querySelector('.id-col-name');
                const roleSelect = editColModal.querySelector('.id-col-role');
                const btnToggleSelect = editColModal.querySelector('.id-col-btn-toggle');

                const newName = nameInput ? nameInput.value.trim() : '';

                if (!newName) {
                    alert('Название столбца не может быть пустым');
                    return;
                }

                // Обновляем текст заголовка на доске
                const colTitleElement = currentColumnToEdit.querySelector('.column-title');
                if (colTitleElement) {
                    const oldName = colTitleElement.textContent.trim();
                    colTitleElement.textContent = newName;

                    // Синхронизируем выпадающий список статусов в правом сайдбаре задач
                    if (oldName !== newName) {
                        const sidebarStatusSelect = document.querySelector('.sidebar-input-status');
                        if (sidebarStatusSelect) {
                            Array.from(sidebarStatusSelect.options).forEach(opt => {
                                if (opt.value === oldName) {
                                    opt.value = newName;
                                    opt.textContent = newName;
                                }
                            });
                        }
                    }
                }

                // Сохраняем права доступа в data-атрибут
                if (roleSelect) {
                    currentColumnToEdit.dataset.allowedRole = roleSelect.value;
                }

                // Управляем видимостью кнопки "+ Добавить задачу"
                if (btnToggleSelect) {
                    let taskBtn = currentColumnToEdit.querySelector('.add-task-btn');

                    if (btnToggleSelect.value === 'yes') {
                        // Если кнопки нет — создаем её и крепим в самый низ
                        if (!taskBtn) {
                            taskBtn = document.createElement('button');
                            taskBtn.className = 'add-task-btn';
                            taskBtn.textContent = '+ Добавить задачу';
                            currentColumnToEdit.appendChild(taskBtn);
                        }
                    } else {
                        // Если выбрали скрыть — удаляем её из DOM
                        if (taskBtn) taskBtn.remove();
                    }
                }

                editColModal.classList.add('hidden');
                currentColumnToEdit = null;
                alert('Параметры столбца успешно обновлены!');
            });
        }

        // 4. Обработка кнопки "Удалить столбец"
        const deleteColBtn = editColModal.querySelector('.id-delete-col-btn');
        if (deleteColBtn) {
            deleteColBtn.addEventListener('click', () => {
                if (!currentColumnToEdit) return;

                const colTitleElement = currentColumnToEdit.querySelector('.column-title');
                const colName = colTitleElement ? colTitleElement.textContent.trim() : 'этот';

                if (confirm(`Вы уверены, что хотите полностью удалить столбец "${colName}" вместе со всеми его задачами?`)) {

                    // Удаляем этот статус из выпадающего списка в правом сайдбаре
                    const sidebarStatusSelect = document.querySelector('.sidebar-input-status');
                    if (sidebarStatusSelect) {
                        Array.from(sidebarStatusSelect.options).forEach(opt => {
                            if (opt.value === colName) opt.remove();
                        });
                    }

                    // Если открыт сайдбар удаляемой задачи, закрываем его
                    if (taskSidebar && !taskSidebar.classList.contains('hidden') && activeCardForEdit) {
                        if (activeCardForEdit.closest('.column') === currentColumnToEdit) {
                            taskSidebar.classList.add('hidden');
                        }
                    }

                    // Удаляем саму колонку из DOM-дерева доски
                    currentColumnToEdit.remove();

                    editColModal.classList.add('hidden');
                    currentColumnToEdit = null;
                }
            });
        }
    }
});