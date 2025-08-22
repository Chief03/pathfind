// Southwest Airlines-style calendar functionality
let selectedStartDate = null;
let selectedEndDate = null;
let currentMonth = new Date();
let isSelectingEndDate = false;

function initializeCalendar() {
    const heroDateInput = document.getElementById('hero-dates');
    const calendarDropdown = document.getElementById('calendar-dropdown');
    const closeBtn = document.querySelector('.close-calendar');
    const clearBtn = document.querySelector('.clear-dates-btn');
    const doneBtn = document.querySelector('.done-btn');
    const prevMonthBtn = document.getElementById('prev-month');
    const nextMonthBtn = document.getElementById('next-month');
    
    // Open calendar
    heroDateInput.addEventListener('click', (e) => {
        e.stopPropagation();
        calendarDropdown.classList.remove('hidden');
        renderCalendar();
    });
    
    // Close calendar - warn if only one date selected
    closeBtn.addEventListener('click', () => {
        if (selectedStartDate && !selectedEndDate) {
            if (confirm('You\'ve only selected a departure date. Close anyway?')) {
                calendarDropdown.classList.add('hidden');
                // Clear the incomplete selection
                selectedStartDate = null;
                selectedEndDate = null;
                document.getElementById('depart-date-display').textContent = 'Select date';
                document.getElementById('return-date-display').textContent = 'Select date';
                heroDateInput.value = '';
                renderCalendar();
            }
        } else {
            calendarDropdown.classList.add('hidden');
        }
    });
    
    // Clear dates
    clearBtn.addEventListener('click', () => {
        selectedStartDate = null;
        selectedEndDate = null;
        isSelectingEndDate = false;
        document.getElementById('depart-date-display').textContent = 'Select date';
        document.getElementById('return-date-display').textContent = 'Select date';
        heroDateInput.value = '';
        renderCalendar();
    });
    
    // Done button - only close if both dates are selected
    doneBtn.addEventListener('click', () => {
        if (selectedStartDate && selectedEndDate) {
            const options = { month: 'short', day: 'numeric' };
            const startStr = selectedStartDate.toLocaleDateString('en-US', options);
            const endStr = selectedEndDate.toLocaleDateString('en-US', options);
            heroDateInput.value = `${startStr} - ${endStr}`;
            calendarDropdown.classList.add('hidden');
        } else if (selectedStartDate && !selectedEndDate) {
            // Don't close if only start date is selected
            alert('Please select a return date');
        }
    });
    
    // Month navigation
    prevMonthBtn.addEventListener('click', () => {
        currentMonth.setMonth(currentMonth.getMonth() - 1);
        renderCalendar();
    });
    
    nextMonthBtn.addEventListener('click', () => {
        currentMonth.setMonth(currentMonth.getMonth() + 1);
        renderCalendar();
    });
    
    // Close on outside click - but only if both dates are selected or no dates are selected
    document.addEventListener('click', (e) => {
        if (!e.target.closest('.dates-field') && !e.target.closest('.calendar-dropdown')) {
            // Only close if we have both dates or no dates
            if ((selectedStartDate && selectedEndDate) || (!selectedStartDate && !selectedEndDate)) {
                calendarDropdown.classList.add('hidden');
            }
            // Keep open if only start date is selected
        }
    });
}

function renderCalendar() {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    // Render two months
    for (let monthOffset = 0; monthOffset < 2; monthOffset++) {
        const displayMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + monthOffset, 1);
        const monthTitle = document.getElementById(`month-title-${monthOffset + 1}`);
        const daysGrid = document.getElementById(`days-grid-${monthOffset + 1}`);
        
        // Set month title
        monthTitle.textContent = displayMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
        
        // Clear existing days
        daysGrid.innerHTML = '';
        
        // Get first day of month and number of days
        const firstDay = new Date(displayMonth.getFullYear(), displayMonth.getMonth(), 1);
        const lastDay = new Date(displayMonth.getFullYear(), displayMonth.getMonth() + 1, 0);
        const prevLastDay = new Date(displayMonth.getFullYear(), displayMonth.getMonth(), 0);
        
        const firstDayOfWeek = firstDay.getDay();
        const daysInMonth = lastDay.getDate();
        const daysInPrevMonth = prevLastDay.getDate();
        
        // Add previous month's trailing days
        for (let i = firstDayOfWeek - 1; i >= 0; i--) {
            const dayDiv = document.createElement('div');
            dayDiv.className = 'calendar-day outside';
            dayDiv.textContent = daysInPrevMonth - i;
            daysGrid.appendChild(dayDiv);
        }
        
        // Add current month's days
        for (let day = 1; day <= daysInMonth; day++) {
            const dayDiv = document.createElement('div');
            const currentDate = new Date(displayMonth.getFullYear(), displayMonth.getMonth(), day);
            currentDate.setHours(0, 0, 0, 0);
            
            dayDiv.className = 'calendar-day';
            dayDiv.textContent = day;
            
            // Check if day is in the past
            if (currentDate < today) {
                dayDiv.classList.add('disabled');
            } else {
                // Check if day is today
                if (currentDate.getTime() === today.getTime()) {
                    dayDiv.classList.add('today');
                }
                
                // Check if day is selected
                if (selectedStartDate && currentDate.getTime() === selectedStartDate.getTime()) {
                    dayDiv.classList.add('start-date', 'selected');
                }
                if (selectedEndDate && currentDate.getTime() === selectedEndDate.getTime()) {
                    dayDiv.classList.add('end-date', 'selected');
                }
                
                // Check if day is in range
                if (selectedStartDate && selectedEndDate) {
                    if (currentDate > selectedStartDate && currentDate < selectedEndDate) {
                        dayDiv.classList.add('in-range');
                    }
                }
                
                // Add click handler
                dayDiv.addEventListener('click', () => selectDate(currentDate));
            }
            
            daysGrid.appendChild(dayDiv);
        }
        
        // Add next month's leading days
        const totalCells = daysGrid.children.length;
        const remainingCells = 42 - totalCells; // 6 weeks * 7 days
        for (let day = 1; day <= remainingCells; day++) {
            const dayDiv = document.createElement('div');
            dayDiv.className = 'calendar-day outside';
            dayDiv.textContent = day;
            daysGrid.appendChild(dayDiv);
        }
    }
    
    // Update navigation buttons
    const prevBtn = document.getElementById('prev-month');
    const currentMonthStart = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1);
    const todayMonthStart = new Date(today.getFullYear(), today.getMonth(), 1);
    prevBtn.disabled = currentMonthStart <= todayMonthStart;
}

function selectDate(date) {
    if (!selectedStartDate || (selectedStartDate && selectedEndDate)) {
        // Selecting start date
        selectedStartDate = date;
        selectedEndDate = null;
        isSelectingEndDate = true;
        
        // Update display
        const options = { weekday: 'short', month: 'short', day: 'numeric' };
        document.getElementById('depart-date-display').textContent = date.toLocaleDateString('en-US', options);
        document.getElementById('return-date-display').textContent = 'Select return date';
        document.getElementById('return-date-display').style.color = '#d4af37'; // Gold color to indicate action needed
        
        // Update the input field immediately with just the departure date
        const heroDateInput = document.getElementById('hero-dates');
        const dateOptions = { month: 'short', day: 'numeric' };
        heroDateInput.value = `${selectedStartDate.toLocaleDateString('en-US', dateOptions)} - Select return`;
    } else if (isSelectingEndDate) {
        // Selecting end date
        if (date > selectedStartDate) {
            selectedEndDate = date;
            isSelectingEndDate = false;
            
            // Update display
            const options = { weekday: 'short', month: 'short', day: 'numeric' };
            document.getElementById('return-date-display').textContent = date.toLocaleDateString('en-US', options);
            document.getElementById('return-date-display').style.color = ''; // Reset color
            
            // Update the input field with both dates
            const heroDateInput = document.getElementById('hero-dates');
            const dateOptions = { month: 'short', day: 'numeric' };
            const startStr = selectedStartDate.toLocaleDateString('en-US', dateOptions);
            const endStr = selectedEndDate.toLocaleDateString('en-US', dateOptions);
            heroDateInput.value = `${startStr} - ${endStr}`;
        } else if (date < selectedStartDate) {
            // If selected date is before start date, make it the new start date
            selectedEndDate = selectedStartDate;
            selectedStartDate = date;
            
            // Update display
            const options = { weekday: 'short', month: 'short', day: 'numeric' };
            document.getElementById('depart-date-display').textContent = date.toLocaleDateString('en-US', options);
            document.getElementById('return-date-display').textContent = selectedEndDate.toLocaleDateString('en-US', options);
            isSelectingEndDate = false;
            
            // Update the input field with both dates
            const heroDateInput = document.getElementById('hero-dates');
            const dateOptions = { month: 'short', day: 'numeric' };
            const startStr = selectedStartDate.toLocaleDateString('en-US', dateOptions);
            const endStr = selectedEndDate.toLocaleDateString('en-US', dateOptions);
            heroDateInput.value = `${startStr} - ${endStr}`;
        }
    }
    
    renderCalendar();
}

// Initialize when DOM is loaded
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeCalendar);
} else {
    initializeCalendar();
}