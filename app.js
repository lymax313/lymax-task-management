const TaskManager = {
  tasks: [],
  filteredTasks: [],
  chart: null,
  workloadChart: null,
  currentUser: 'Rajesh Kumar',
  reminderIntervals: [],
  googleSheetUrl: '',
  lastRefreshTime: null,

  generateUUID() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
      const r = (Math.random() * 16) | 0;
      const v = c === 'x' ? r : (r & 0x3) | 0x8;
      return v.toString(16);
    });
  },

  getToday() {
    const today = new Date();
    return today.toISOString().split('T')[0];
  },

  getTodayStart() {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return today;
  },

  getTodayEnd() {
    const today = new Date();
    today.setHours(23, 59, 59, 999);
    return today;
  },

  addDays(dateString, days) {
    const date = new Date(dateString);
    date.setDate(date.getDate() + days);
    return date.toISOString().split('T')[0];
  },

  generateSampleData() {
    const today = this.getToday();
    const employees = [
      { name: 'Rajesh Kumar', role: 'Counselor' },
      { name: 'Priya Sharma', role: 'Sales' },
      { name: 'Amit Patel', role: 'Sales' },
      { name: 'Sneha Reddy', role: 'Ops' },
      { name: 'Vikram Singh', role: 'Marketing' },
      { name: 'Anita Desai', role: 'Academic' },
      { name: 'Rahul Mehta', role: 'Counselor' },
      { name: 'Kavita Joshi', role: 'Sales' },
    ];

    const taskTypes = ['Call', 'WhatsApp', 'Follow-up', 'Demo', 'Meeting', 'Admin', 'Email'];
    const priorities = ['Critical', 'High', 'Medium', 'Low'];
    const statuses = ['To Do', 'In Progress', 'Follow-up', 'Completed'];
    const outcomes = ['Done', 'Not Reachable', 'Rescheduled', 'Not Interested', 'Converted', 'Pending'];

    const sampleTasks = [];

    for (let i = 0; i < 35; i++) {
      const employee = employees[Math.floor(Math.random() * employees.length)];
      const taskType = taskTypes[Math.floor(Math.random() * taskTypes.length)];
      const priority = priorities[Math.floor(Math.random() * priorities.length)];
      const status = statuses[Math.floor(Math.random() * statuses.length)];
      const outcome = status === 'Completed' ? outcomes[Math.floor(Math.random() * outcomes.length)] : 'Pending';

      const isToday = i < 25;
      const taskDate = isToday ? today : this.addDays(today, Math.floor(Math.random() * 7) - 3);

      const hour = 9 + Math.floor(Math.random() * 9);
      const minute = Math.random() < 0.5 ? '00' : '30';
      const plannedStartTime = `${hour.toString().padStart(2, '0')}:${minute}`;

      const dueHour = hour + 1 + Math.floor(Math.random() * 3);
      const dueDatetime = new Date(taskDate + 'T' + plannedStartTime);
      dueDatetime.setHours(dueDatetime.getHours() + 2);

      let actualStartTime = null;
      let actualEndTime = null;

      if (status === 'In Progress') {
        actualStartTime = new Date(taskDate + 'T' + plannedStartTime).toISOString();
      } else if (status === 'Completed') {
        actualStartTime = new Date(taskDate + 'T' + plannedStartTime).toISOString();
        const completionDelay = Math.random() < 0.7 ? 0 : Math.floor(Math.random() * 120);
        actualEndTime = new Date(dueDatetime.getTime() + completionDelay * 60000).toISOString();
      }

      const descriptions = [
        `Follow up with ${taskType === 'Call' ? 'lead' : 'client'} on pending inquiry`,
        `Schedule ${taskType} for product demonstration`,
        `Complete ${taskType} regarding service update`,
        `Conduct ${taskType} for customer feedback`,
        `Process ${taskType} for enrollment status`,
        `Review ${taskType} for quality assurance`,
      ];

      sampleTasks.push({
        task_id: this.generateUUID(),
        employee_name: employee.name,
        role: employee.role,
        task_type: taskType,
        description: descriptions[Math.floor(Math.random() * descriptions.length)],
        priority: priority,
        status: status,
        planned_date: taskDate,
        planned_start_time: plannedStartTime,
        planned_end_time: null,
        actual_start_time: actualStartTime,
        actual_end_time: actualEndTime,
        due_datetime: dueDatetime.toISOString(),
        outcome: outcome,
        source: Math.random() < 0.5 ? 'Website' : 'Referral',
        notes: '',
      });
    }

    const overdueCount = 5;
    for (let i = 0; i < overdueCount; i++) {
      const employee = employees[Math.floor(Math.random() * employees.length)];
      const yesterday = this.addDays(today, -1);
      const dueDatetime = new Date(yesterday + 'T15:00:00');

      sampleTasks.push({
        task_id: this.generateUUID(),
        employee_name: employee.name,
        role: employee.role,
        task_type: 'Follow-up',
        description: 'Overdue follow-up with client',
        priority: 'High',
        status: 'To Do',
        planned_date: yesterday,
        planned_start_time: '15:00',
        planned_end_time: null,
        actual_start_time: null,
        actual_end_time: null,
        due_datetime: dueDatetime.toISOString(),
        outcome: 'Pending',
        source: 'Direct',
        notes: 'Urgent - client requested callback',
      });
    }

    this.tasks = sampleTasks;
    this.saveToLocalStorage();
    this.applyFilters();
  },

  saveToLocalStorage() {
    localStorage.setItem('lymaxTasks', JSON.stringify(this.tasks));
  },

  loadFromLocalStorage() {
    const stored = localStorage.getItem('lymaxTasks');
    if (stored) {
      this.tasks = JSON.parse(stored);
      return true;
    }
    return false;
  },

  calculateKPIs(taskList = null) {
    const list = taskList || this.tasks;
    const now = new Date();
    const today = this.getToday();
    const todayStart = this.getTodayStart();
    const todayEnd = this.getTodayEnd();

    const tasksToday = list.filter((task) => task.planned_date === today).length;

    const completedToday = list.filter((task) => {
      if (task.status !== 'Completed' || !task.actual_end_time) return false;
      const endTime = new Date(task.actual_end_time);
      return endTime >= todayStart && endTime <= todayEnd;
    }).length;

    const overdueTasks = list.filter((task) => {
      if (task.status === 'Completed') return false;
      const dueDate = new Date(task.due_datetime);
      return dueDate < now;
    }).length;

    const completedTasks = list.filter((task) => task.status === 'Completed' && task.actual_end_time);

    let onTimeCount = 0;
    completedTasks.forEach((task) => {
      const actualEnd = new Date(task.actual_end_time);
      const dueDate = new Date(task.due_datetime);
      if (actualEnd <= dueDate) {
        onTimeCount++;
      }
    });

    const onTimeRate = completedTasks.length > 0 ? (onTimeCount / completedTasks.length) * 100 : 0;

    return {
      tasksToday,
      completedToday,
      overdueTasks,
      onTimeRate: Math.round(onTimeRate),
    };
  },

  applyFilters() {
    const dateStart = document.getElementById('filter-date-start').value;
    const dateEnd = document.getElementById('filter-date-end').value;
    const selectedEmployees = Array.from(document.getElementById('filter-employee').selectedOptions).map(
      (opt) => opt.value
    );
    const role = document.getElementById('filter-role').value;
    const taskType = document.getElementById('filter-task-type').value;
    const status = document.getElementById('filter-status').value;
    const priority = document.getElementById('filter-priority').value;
    const myViewEnabled = document.getElementById('my-view-toggle').checked;

    this.filteredTasks = this.tasks.filter((task) => {
      if (dateStart && task.planned_date < dateStart) return false;
      if (dateEnd && task.planned_date > dateEnd) return false;
      if (selectedEmployees.length > 0 && !selectedEmployees.includes(task.employee_name)) return false;
      if (role && task.role !== role) return false;
      if (taskType && task.task_type !== taskType) return false;
      if (status && task.status !== status) return false;
      if (priority && task.priority !== priority) return false;
      if (myViewEnabled && task.employee_name !== this.currentUser) return false;
      return true;
    });

    this.updateKPIDisplay();
    this.renderKanbanBoard();
    this.renderEmployeeTable();
    this.renderWeeklyChart();
    this.updateLastRefreshTime();
  },

  setupFilterListeners() {
    document.getElementById('filter-date-start').valueAsDate = this.getTodayStart();
    document.getElementById('filter-date-end').valueAsDate = this.getTodayEnd();

    const filterElements = [
      'filter-date-start',
      'filter-date-end',
      'filter-employee',
      'filter-role',
      'filter-task-type',
      'filter-status',
      'filter-priority',
      'my-view-toggle',
    ];

    filterElements.forEach((id) => {
      document.getElementById(id).addEventListener('change', () => this.applyFilters());
    });

    document.getElementById('filter-reset').addEventListener('click', () => {
      document.getElementById('filter-date-start').valueAsDate = this.getTodayStart();
      document.getElementById('filter-date-end').valueAsDate = this.getTodayEnd();
      document.getElementById('filter-employee').selectedIndex = 0;
      document.getElementById('filter-role').value = '';
      document.getElementById('filter-task-type').value = '';
      document.getElementById('filter-status').value = '';
      document.getElementById('filter-priority').value = '';
      document.getElementById('my-view-toggle').checked = false;
      this.applyFilters();
    });

    const quickFilterBtns = document.querySelectorAll('.quick-filter-btn');
    quickFilterBtns.forEach((btn) => {
      btn.addEventListener('click', () => {
        quickFilterBtns.forEach((b) => b.classList.remove('active'));
        btn.classList.add('active');
        this.applyQuickFilter(btn.dataset.filter);
      });
    });

    document.getElementById('refresh-now').addEventListener('click', () => {
      this.applyFilters();
      this.showNotification('Data refreshed');
    });

    this.populateEmployeeFilter();
  },

  populateEmployeeFilter() {
    const uniqueEmployees = [...new Set(this.tasks.map((t) => t.employee_name))];
    const select = document.getElementById('filter-employee');
    uniqueEmployees.forEach((emp) => {
      const option = document.createElement('option');
      option.value = emp;
      option.textContent = emp;
      select.appendChild(option);
    });
  },

  applyQuickFilter(filter) {
    const today = this.getToday();
    const todayStart = this.getTodayStart();
    const todayEnd = this.getTodayEnd();
    const weekStart = this.addDays(today, -7);
    const now = new Date();

    document.getElementById('filter-reset').click();

    switch (filter) {
      case 'today':
        document.getElementById('filter-date-start').value = today;
        document.getElementById('filter-date-end').value = today;
        break;
      case 'week':
        document.getElementById('filter-date-start').value = weekStart;
        document.getElementById('filter-date-end').value = today;
        break;
      case 'overdue':
        document.getElementById('filter-status').value = 'To Do';
        this.filteredTasks = this.tasks.filter(
          (task) => task.status !== 'Completed' && new Date(task.due_datetime) < now
        );
        break;
      case 'high-priority':
        document.getElementById('filter-priority').value = 'High';
        break;
    }

    this.applyFilters();
  },

  updateKPIDisplay() {
    const kpis = this.calculateKPIs(this.filteredTasks);
    document.getElementById('kpi-tasks-today').textContent = kpis.tasksToday;
    document.getElementById('kpi-completed-today').textContent = kpis.completedToday;
    document.getElementById('kpi-overdue').textContent = kpis.overdueTasks;
    document.getElementById('kpi-ontime-rate').textContent = kpis.onTimeRate + '%';
  },

  renderKanbanBoard() {
    const statuses = ['To Do', 'In Progress', 'Follow-up', 'Completed'];

    statuses.forEach((status) => {
      const statusKey = status.toLowerCase().replace(/[- ]/g, '');
      const taskList = document.getElementById(`tasks-${statusKey}`);
      const countElement = document.getElementById(`count-${statusKey}`);

      const tasksInStatus = this.filteredTasks.filter((task) => task.status === status);
      countElement.textContent = tasksInStatus.length;

      taskList.innerHTML = '';

      tasksInStatus.forEach((task) => {
        const card = document.createElement('div');
        card.className = 'task-card';

        const priorityClass = `priority-${task.priority.toLowerCase()}`;
        const taskIcon = this.getTaskIcon(task.task_type);
        const dueTime = new Date(task.due_datetime).toLocaleTimeString('en-US', {
          hour: '2-digit',
          minute: '2-digit',
        });

        card.innerHTML = `
          <div class="task-card-title">${task.description}</div>
          <div class="task-card-meta">
            <span>${taskIcon} ${task.task_type}</span>
            <span class="priority-badge ${priorityClass}">${task.priority}</span>
            <span>${task.employee_name}</span>
            <span>Due: ${dueTime}</span>
          </div>
        `;

        card.addEventListener('click', () => this.openTaskModal(task));
        taskList.appendChild(card);
      });
    });
  },

  getTaskIcon(taskType) {
    const icons = {
      Call: '📞',
      WhatsApp: '💬',
      Email: '📧',
      Meeting: '👥',
      Admin: '📋',
      'Follow-up': '🔄',
      Demo: '🎯',
      Other: '📝',
    };
    return icons[taskType] || '📝';
  },

  renderEmployeeTable() {
    const tableBody = document.getElementById('employee-table-body');
    tableBody.innerHTML = '';

    this.filteredTasks.sort((a, b) => new Date(a.due_datetime) - new Date(b.due_datetime)).forEach((task) => {
      const row = document.createElement('tr');

      const statusClass = `status-${task.status.toLowerCase().replace(/[- ]/g, '')}`;
      const priorityClass = `priority-${task.priority.toLowerCase()}`;
      const dueTime = new Date(task.due_datetime).toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
      });

      row.innerHTML = `
        <td>${task.employee_name}</td>
        <td>${task.description}</td>
        <td><span class="status-badge ${statusClass}">${task.status}</span></td>
        <td><span class="priority-badge ${priorityClass}">${task.priority}</span></td>
        <td>${dueTime}</td>
        <td>${task.outcome}</td>
      `;

      tableBody.appendChild(row);
    });
  },

  getWeeklyData() {
    const days = [];
    const completedCounts = [];
    const onTimePercentages = [];

    for (let i = 6; i >= 0; i--) {
      const date = this.addDays(this.getToday(), -i);
      const dayName = new Date(date).toLocaleDateString('en-US', { weekday: 'short' });
      days.push(dayName);

      const dayStart = new Date(date + 'T00:00:00');
      const dayEnd = new Date(date + 'T23:59:59');

      const completedOnDay = this.filteredTasks.filter((task) => {
        if (task.status !== 'Completed' || !task.actual_end_time) return false;
        const endTime = new Date(task.actual_end_time);
        return endTime >= dayStart && endTime <= dayEnd;
      });

      completedCounts.push(completedOnDay.length);

      let onTimeCount = 0;
      completedOnDay.forEach((task) => {
        const actualEnd = new Date(task.actual_end_time);
        const dueDate = new Date(task.due_datetime);
        if (actualEnd <= dueDate) {
          onTimeCount++;
        }
      });

      const onTimeRate = completedOnDay.length > 0 ? (onTimeCount / completedOnDay.length) * 100 : 0;
      onTimePercentages.push(Math.round(onTimeRate));
    }

    return { days, completedCounts, onTimePercentages };
  },

  renderWeeklyChart() {
    const weeklyData = this.getWeeklyData();
    const ctx = document.getElementById('weekly-chart').getContext('2d');

    if (this.chart) {
      this.chart.destroy();
    }

    this.chart = new Chart(ctx, {
      type: 'line',
      data: {
        labels: weeklyData.days,
        datasets: [
          {
            label: 'Tasks Completed',
            data: weeklyData.completedCounts,
            borderColor: '#667eea',
            backgroundColor: 'rgba(102, 126, 234, 0.1)',
            tension: 0.4,
            yAxisID: 'y',
          },
          {
            label: 'On-time %',
            data: weeklyData.onTimePercentages,
            borderColor: '#22c55e',
            backgroundColor: 'rgba(34, 197, 94, 0.1)',
            tension: 0.4,
            yAxisID: 'y1',
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        interaction: {
          mode: 'index',
          intersect: false,
        },
        plugins: {
          legend: {
            display: true,
            position: 'top',
          },
        },
        scales: {
          y: {
            type: 'linear',
            display: true,
            position: 'left',
            title: {
              display: true,
              text: 'Tasks Completed',
            },
          },
          y1: {
            type: 'linear',
            display: true,
            position: 'right',
            title: {
              display: true,
              text: 'On-time %',
            },
            grid: {
              drawOnChartArea: false,
            },
            min: 0,
            max: 100,
          },
        },
      },
    });
  },

  renderMyDay() {
    const today = this.getToday();
    const myTasks = this.tasks.filter(
      (task) => task.employee_name === this.currentUser && task.planned_date === today
    );
    myTasks.sort((a, b) => new Date(a.due_datetime) - new Date(b.due_datetime));

    const taskList = document.getElementById('my-day-task-list');
    taskList.innerHTML = '';

    const now = new Date();
    const todayStart = this.getTodayStart();
    const todayEnd = this.getTodayEnd();

    const tasksCount = myTasks.length;
    const completedCount = myTasks.filter(
      (t) => t.status === 'Completed' && new Date(t.actual_end_time) >= todayStart && new Date(t.actual_end_time) <= todayEnd
    ).length;
    const overdueCount = myTasks.filter(
      (t) => t.status !== 'Completed' && new Date(t.due_datetime) < now
    ).length;
    const focusCount = myTasks.filter((t) => t.priority === 'High' || t.priority === 'Critical').length;

    document.getElementById('my-day-tasks-today').textContent = tasksCount;
    document.getElementById('my-day-completed-today').textContent = completedCount;
    document.getElementById('my-day-overdue').textContent = overdueCount;
    document.getElementById('my-day-focus').textContent = focusCount;

    myTasks.forEach((task) => {
      const item = document.createElement('div');
      item.className = 'my-day-task-item';

      const priorityClass = `priority-${task.priority.toLowerCase()}`;
      const taskIcon = this.getTaskIcon(task.task_type);
      const dueTime = new Date(task.due_datetime).toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
      });

      item.innerHTML = `
        <div class="my-day-task-left">
          <div class="my-day-task-title">${task.description}</div>
          <div class="my-day-task-meta">
            <span>${taskIcon} ${task.task_type}</span>
            <span class="priority-badge ${priorityClass}">${task.priority}</span>
            <span>${task.status}</span>
            <span>Due: ${dueTime}</span>
          </div>
        </div>
        <div class="my-day-task-actions">
          <button class="action-start" data-task-id="${task.task_id}">Start</button>
          <button class="action-complete" data-task-id="${task.task_id}">Complete</button>
          <button class="action-reschedule" data-task-id="${task.task_id}">Reschedule</button>
        </div>
      `;

      taskList.appendChild(item);
    });

    this.setupMyDayActions();
  },

  setupMyDayActions() {
    const startBtns = document.querySelectorAll('.action-start');
    const completeBtns = document.querySelectorAll('.action-complete');
    const rescheduleBtns = document.querySelectorAll('.action-reschedule');

    startBtns.forEach((btn) => {
      btn.addEventListener('click', (e) => {
        const taskId = e.target.dataset.taskId;
        const task = this.tasks.find((t) => t.task_id === taskId);
        if (task) {
          task.status = 'In Progress';
          task.actual_start_time = new Date().toISOString();
          this.saveToLocalStorage();
          this.renderMyDay();
          this.showNotification('Task started');
        }
      });
    });

    completeBtns.forEach((btn) => {
      btn.addEventListener('click', (e) => {
        const taskId = e.target.dataset.taskId;
        const task = this.tasks.find((t) => t.task_id === taskId);
        if (task) {
          task.status = 'Completed';
          task.actual_end_time = new Date().toISOString();
          this.saveToLocalStorage();
          this.renderMyDay();
          this.showNotification('Task completed');
        }
      });
    });

    rescheduleBtns.forEach((btn) => {
      btn.addEventListener('click', (e) => {
        const taskId = e.target.dataset.taskId;
        const task = this.tasks.find((t) => t.task_id === taskId);
        if (task) {
          task.status = 'Follow-up';
          this.saveToLocalStorage();
          this.renderMyDay();
          this.showNotification('Task rescheduled to Follow-up');
        }
      });
    });
  },

  renderTeamLeader() {
    this.renderTeamSummary();
    this.renderWorkloadChart();
    this.renderTopOverdue();
  },

  renderTeamSummary() {
    const employees = [...new Set(this.tasks.map((t) => t.employee_name))];
    const tbody = document.getElementById('team-summary-body');
    tbody.innerHTML = '';

    const now = new Date();

    employees.forEach((empName) => {
      const empTasks = this.tasks.filter((t) => t.employee_name === empName);
      const assigned = empTasks.length;
      const completed = empTasks.filter((t) => t.status === 'Completed').length;
      const overdue = empTasks.filter((t) => t.status !== 'Completed' && new Date(t.due_datetime) < now).length;

      const completedTasks = empTasks.filter((t) => t.status === 'Completed' && t.actual_end_time);
      let onTimeCount = 0;
      completedTasks.forEach((task) => {
        const actualEnd = new Date(task.actual_end_time);
        const dueDate = new Date(task.due_datetime);
        if (actualEnd <= dueDate) {
          onTimeCount++;
        }
      });

      const onTimeRate = completedTasks.length > 0 ? Math.round((onTimeCount / completedTasks.length) * 100) : 0;

      const row = document.createElement('tr');
      row.innerHTML = `
        <td>${empName}</td>
        <td>${assigned}</td>
        <td>${completed}</td>
        <td>${overdue}</td>
        <td>${onTimeRate}%</td>
        <td><button class="btn-secondary" onclick="TaskManager.reassignTask('${empName}')">Reassign</button></td>
      `;
      tbody.appendChild(row);
    });
  },

  renderWorkloadChart() {
    const employees = [...new Set(this.tasks.map((t) => t.employee_name))];
    const statuses = ['To Do', 'In Progress', 'Follow-up', 'Completed'];

    const datasets = statuses.map((status, index) => {
      const colors = ['#6b7280', '#3b82f6', '#f97316', '#22c55e'];
      return {
        label: status,
        data: employees.map((emp) => this.tasks.filter((t) => t.employee_name === emp && t.status === status).length),
        backgroundColor: colors[index],
      };
    });

    const ctx = document.getElementById('workload-chart').getContext('2d');

    if (this.workloadChart) {
      this.workloadChart.destroy();
    }

    this.workloadChart = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: employees,
        datasets: datasets,
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            display: true,
            position: 'top',
          },
        },
        scales: {
          x: {
            stacked: true,
          },
          y: {
            stacked: true,
          },
        },
      },
    });
  },

  renderTopOverdue() {
    const now = new Date();
    const overdueTasks = this.tasks
      .filter((task) => task.status !== 'Completed' && new Date(task.due_datetime) < now)
      .sort((a, b) => new Date(a.due_datetime) - new Date(b.due_datetime))
      .slice(0, 5);

    const list = document.getElementById('top-overdue-list');
    list.innerHTML = '';

    overdueTasks.forEach((task) => {
      const daysOverdue = Math.floor((now - new Date(task.due_datetime)) / (1000 * 60 * 60 * 24));
      const item = document.createElement('div');
      item.className = 'overdue-item';

      item.innerHTML = `
        <div class="overdue-item-title">${task.description}</div>
        <div class="overdue-item-meta">
          <span><strong>${task.employee_name}</strong></span>
          <span class="overdue-days">${daysOverdue} days overdue</span>
          <span class="priority-badge priority-${task.priority.toLowerCase()}">${task.priority}</span>
        </div>
      `;

      list.appendChild(item);
    });
  },

  openTaskModal(task) {
    const modal = document.getElementById('task-modal');
    document.getElementById('modal-task-title').textContent = task.description;

    const dueDate = new Date(task.due_datetime).toLocaleString();
    const details = `
      <p><strong>Employee:</strong> ${task.employee_name}</p>
      <p><strong>Type:</strong> ${task.task_type}</p>
      <p><strong>Status:</strong> ${task.status}</p>
      <p><strong>Priority:</strong> ${task.priority}</p>
      <p><strong>Due:</strong> ${dueDate}</p>
      <p><strong>Outcome:</strong> ${task.outcome}</p>
      <p><strong>Notes:</strong> ${task.notes || 'No notes'}</p>
    `;

    document.getElementById('modal-task-details').innerHTML = details;
    modal.classList.add('active');

    const closeBtn = document.querySelector('.modal-close');
    const closeActionBtn = document.querySelector('.modal-close-btn');

    const closeModal = () => {
      modal.classList.remove('active');
      closeBtn.removeEventListener('click', closeModal);
      closeActionBtn.removeEventListener('click', closeModal);
    };

    closeBtn.addEventListener('click', closeModal);
    closeActionBtn.addEventListener('click', closeModal);
  },

  reassignTask(empName) {
    this.showNotification(`Reassign tasks for ${empName}`);
  },

  updateLastRefreshTime() {
    const now = new Date();
    const timeString = now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
    document.getElementById('last-refreshed-time').textContent = timeString;
  },

  startAutoRefresh() {
    setInterval(() => {
      this.applyFilters();
    }, 60000);
  },

  startAutomationRules() {
    this.reminderIntervals.push(
      setInterval(() => {
        const now = new Date();
        this.tasks.forEach((task) => {
          if (task.status !== 'Completed') {
            const dueDate = new Date(task.due_datetime);
            const timeUntilDue = dueDate - now;
            const minutesUntilDue = timeUntilDue / (1000 * 60);

            if (minutesUntilDue <= 120 && minutesUntilDue > 0) {
              const lastActivityTime = task.actual_start_time ? new Date(task.actual_start_time) : null;
              if (!lastActivityTime || now - lastActivityTime > 60 * 60 * 1000) {
                console.log(`[REMINDER] Task due soon: ${task.description} by ${task.employee_name}`);
              }
            }
          }
        });
      }, 30 * 60 * 1000)
    );

    this.reminderIntervals.push(
      setInterval(() => {
        const now = new Date();
        this.tasks.forEach((task) => {
          if (task.status !== 'Completed') {
            const dueDate = new Date(task.due_datetime);
            if (now > dueDate && task.status !== 'Follow-up') {
              task.status = 'Follow-up';
            }
          }
        });
        this.saveToLocalStorage();
        this.applyFilters();
      }, 5 * 60 * 1000)
    );
  },

  showNotification(message) {
    const notification = document.createElement('div');
    notification.style.cssText = `
      position: fixed; top: 20px; right: 20px; background: #667eea;
      color: white; padding: 15px 25px; border-radius: 8px;
      box-shadow: 0 4px 12px rgba(0,0,0,0.2); z-index: 2000;
      animation: slideIn 0.5s;
    `;
    notification.textContent = message;
    document.body.appendChild(notification);
    setTimeout(() => {
      notification.style.animation = 'slideOut 0.5s';
      setTimeout(() => notification.remove(), 500);
    }, 3000);
  },

  setupTabNavigation() {
    const tabButtons = document.querySelectorAll('.nav-tab');
    const tabContents = document.querySelectorAll('.tab-content');

    tabButtons.forEach((button) => {
      button.addEventListener('click', () => {
        const targetTab = button.getAttribute('data-tab');

        tabButtons.forEach((btn) => btn.classList.remove('active'));
        tabContents.forEach((content) => content.classList.remove('active'));

        button.classList.add('active');
        document.getElementById(targetTab).classList.add('active');

        if (targetTab === 'my-day') {
          this.renderMyDay();
        } else if (targetTab === 'team-leader') {
          this.renderTeamLeader();
        }
      });
    });
  },

  addAnimationStyles() {
    const style = document.createElement('style');
    style.textContent = `
      @keyframes slideIn {
        from { transform: translateX(400px); opacity: 0; }
        to { transform: translateX(0); opacity: 1; }
      }
      @keyframes slideOut {
        from { transform: translateX(0); opacity: 1; }
        to { transform: translateX(400px); opacity: 0; }
      }
    `;
    document.head.appendChild(style);
  },

  startGoogleSheetsSync() {
    const storedUrl = localStorage.getItem('googleSheetUrl');
    if (storedUrl) {
      this.googleSheetUrl = storedUrl;
      this.syncWithGoogleSheets();
      setInterval(() => this.syncWithGoogleSheets(), 5 * 60 * 1000);
    }
  },

  syncWithGoogleSheets() {
    if (!this.googleSheetUrl) return;

    const csvUrl = this.googleSheetUrl.replace('/edit', '/export?format=csv');

    fetch(csvUrl)
      .then((response) => response.text())
      .then((csv) => {
        const rows = csv.trim().split('\n');
        if (rows.length > 1) {
          const headers = rows[0].split(',');
          const importedTasks = [];

          for (let i = 1; i < rows.length; i++) {
            const values = rows[i].split(',');
            if (values.length >= 5) {
              const task = {
                task_id: this.generateUUID(),
                employee_name: (values[1] || '').trim(),
                role: (values[2] || '').trim(),
                task_type: (values[3] || 'Call').trim(),
                description: (values[4] || '').trim(),
                priority: (values[5] || 'Medium').trim(),
                status: (values[6] || 'To Do').trim(),
                planned_date: (values[7] || this.getToday()).trim(),
                planned_start_time: (values[8] || '09:00').trim(),
                planned_end_time: (values[9] || '').trim(),
                actual_start_time: (values[10] || '').trim(),
                actual_end_time: (values[11] || '').trim(),
                due_datetime: (values[12] || new Date().toISOString()).trim(),
                outcome: (values[13] || 'Pending').trim(),
                source: (values[14] || '').trim(),
                notes: (values[15] || '').trim(),
              };

              importedTasks.push(task);
            }
          }

          if (importedTasks.length > 0) {
            this.tasks = importedTasks;
            this.saveToLocalStorage();
            this.applyFilters();
            this.showNotification(`Imported ${importedTasks.length} tasks from Google Sheets`);
          }
        }
      })
      .catch((error) => {
        console.error('Error syncing with Google Sheets:', error);
      });
  },

  setupGoogleSheetsUI() {
    const sheetUrlInput = document.createElement('input');
    sheetUrlInput.type = 'text';
    sheetUrlInput.id = 'google-sheet-url-input';
    sheetUrlInput.placeholder = 'Paste Google Sheet URL here';
    sheetUrlInput.style.cssText = `
      padding: 10px 15px;
      border: 1px solid #d0d0d0;
      border-radius: 6px;
      font-size: 0.9em;
      width: 300px;
      margin-right: 10px;
    `;

    const storedUrl = localStorage.getItem('googleSheetUrl');
    if (storedUrl) {
      sheetUrlInput.value = storedUrl;
    }

    const saveBtn = document.createElement('button');
    saveBtn.textContent = 'Set Sheet URL';
    saveBtn.className = 'btn-primary';
    saveBtn.style.cssText += 'margin-right: 10px;';

    saveBtn.addEventListener('click', () => {
      const url = sheetUrlInput.value.trim();
      if (url) {
        localStorage.setItem('googleSheetUrl', url);
        this.googleSheetUrl = url;
        this.showNotification('Google Sheet URL saved');
        this.syncWithGoogleSheets();
      }
    });

    const syncBtn = document.createElement('button');
    syncBtn.textContent = 'Sync Now';
    syncBtn.className = 'btn-primary';

    syncBtn.addEventListener('click', () => {
      this.syncWithGoogleSheets();
    });

    const filterSection = document.querySelector('.filter-section');
    if (filterSection) {
      const gsSection = document.createElement('div');
      gsSection.style.cssText = `
        margin-top: 15px;
        padding-top: 15px;
        border-top: 1px solid #d0d0d0;
        display: flex;
        align-items: center;
        flex-wrap: wrap;
        gap: 10px;
      `;

      gsSection.appendChild(sheetUrlInput);
      gsSection.appendChild(saveBtn);
      gsSection.appendChild(syncBtn);

      filterSection.appendChild(gsSection);
    }
  },

  init() {
    this.addAnimationStyles();

    if (!this.loadFromLocalStorage()) {
      this.generateSampleData();
    }

    this.setupTabNavigation();
    this.setupFilterListeners();
    this.setupGoogleSheetsUI();
    this.applyFilters();
    this.startAutoRefresh();
    this.startAutomationRules();
    this.startGoogleSheetsSync();
    this.updateLastRefreshTime();
  },
};

document.addEventListener('DOMContentLoaded', () => {
  TaskManager.init();
});
