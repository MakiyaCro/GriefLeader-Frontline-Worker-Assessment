document.addEventListener('DOMContentLoaded', function() {
    const businessSelect = document.getElementById('business-select');
    const newBusinessBtn = document.getElementById('new-business-btn');
    const tabButtons = document.querySelectorAll('.nav-link');
    const contentArea = document.querySelector('.card-body');

    businessSelect.addEventListener('change', function() {
        // Handle business selection
        const businessId = this.value;
        // Make an AJAX request to load business-specific data
    });

    newBusinessBtn.addEventListener('click', function() {
        // Show new business modal
        document.getElementById('new-business-modal').style.display = 'block';
    });

    tabButtons.forEach(button => {
        button.addEventListener('click', function() {
            // Handle tab switching
            tabButtons.forEach(btn => btn.classList.remove('active'));
            this.classList.add('active');
            loadTabContent(this.dataset.tab);
        });
    });

    function loadTabContent(tab) {
        // Make an AJAX request to load tab-specific content
        fetch(`/api/${tab}/`)
            .then(response => response.text())
            .then(html => {
                contentArea.innerHTML = html;
            })
            .catch(error => console.error('Error:', error));
    }

    // Initial load
    loadTabContent('businesses');
});